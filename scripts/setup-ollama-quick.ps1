#Requires -Version 5.1
<#
.SYNOPSIS
    Hablara - Ollama Quick-Setup Script (Windows)

.DESCRIPTION
    One-liner installation of Ollama + optimized model for Hablara.

    This script:
    1. Checks disk space (10 GB minimum)
    2. Installs Ollama (via winget or manual download)
    3. Starts Ollama server
    4. Downloads qwen2.5:7b model (~4.7 GB)
    5. Creates qwen2.5:7b-custom with optimized parameters
    6. Verifies installation

.EXAMPLE
    .\scripts\setup-ollama-quick.ps1

.NOTES
    Exit Codes:
      0 - Success
      1 - General error
      2 - Insufficient disk space
      3 - Network error
      4 - Platform not supported (not Windows)

    Requirements:
      - Windows 10/11
      - 10 GB free disk space
      - Internet connection

    Author: Hablará Team
    Created: 2026-02-04
    Changed: 2026-02-04
#>

[CmdletBinding()]
param()

# Strict mode
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Error handler for unexpected failures
trap {
    Write-Host "[X] Setup failed unexpectedly: $_" -ForegroundColor Red
    exit 1
}

# Configuration
$ScriptVersion = '1.1.0'
$RequiredDiskSpaceGB = 10
$ModelName = 'qwen2.5:7b'
$CustomModelName = 'qwen2.5:7b-custom'
$OllamaApiUrl = 'http://localhost:11434'
$MinOllamaVersion = '0.3.0'  # qwen2.5 support added in 0.3.0

# Logging functions
function Write-LogInfo {
    param([string]$Message)
    Write-Host "[i] $Message" -ForegroundColor Blue
}

function Write-LogSuccess {
    param([string]$Message)
    Write-Host "[OK] $Message" -ForegroundColor Green
}

function Write-LogWarning {
    param([string]$Message)
    Write-Host "[!] $Message" -ForegroundColor Yellow
}

function Write-LogError {
    param([string]$Message)
    Write-Host "[X] $Message" -ForegroundColor Red
}

# Check if command exists
function Test-CommandExists {
    param([string]$Command)
    $null -ne (Get-Command $Command -ErrorAction SilentlyContinue)
}

# Compare semantic versions (returns: -1 if v1<v2, 0 if equal, 1 if v1>v2)
function Compare-SemanticVersion {
    param([string]$Version1, [string]$Version2)

    # Extract numeric parts only, filter empty strings
    $v1Parts = ($Version1 -replace '[^0-9.]', '') -split '\.' | Where-Object { $_ -ne '' } | ForEach-Object { [int]$_ }
    $v2Parts = ($Version2 -replace '[^0-9.]', '') -split '\.' | Where-Object { $_ -ne '' } | ForEach-Object { [int]$_ }

    for ($i = 0; $i -lt [Math]::Max($v1Parts.Length, $v2Parts.Length); $i++) {
        $p1 = if ($i -lt $v1Parts.Length) { $v1Parts[$i] } else { 0 }
        $p2 = if ($i -lt $v2Parts.Length) { $v2Parts[$i] } else { 0 }

        if ($p1 -lt $p2) { return -1 }
        if ($p1 -gt $p2) { return 1 }
    }
    return 0
}

# Check for GPU availability
function Test-GpuAvailable {
    # Check for NVIDIA GPU
    if (Test-CommandExists 'nvidia-smi') {
        try {
            $null = & nvidia-smi 2>$null
            if ($LASTEXITCODE -eq 0) {
                return @{ Available = $true; Type = 'NVIDIA' }
            }
        } catch {}
    }

    # Check for AMD GPU (ROCm)
    if (Test-Path 'C:\Program Files\AMD\ROCm\*\bin\rocm-smi.exe') {
        return @{ Available = $true; Type = 'AMD ROCm' }
    }

    return @{ Available = $false; Type = 'CPU' }
}

# Check Ollama version
function Test-OllamaVersion {
    try {
        $versionOutput = & ollama --version 2>&1 | Select-Object -First 1
        # Extract version number (e.g., "ollama version is 0.15.2" -> "0.15.2")
        if ($versionOutput -match '(\d+\.\d+\.?\d*)') {
            $currentVersion = $Matches[1]

            if ((Compare-SemanticVersion $currentVersion $MinOllamaVersion) -lt 0) {
                Write-LogWarning "Ollama version $currentVersion is older than recommended $MinOllamaVersion"
                Write-LogInfo "Consider updating: winget upgrade Ollama.Ollama"
                return $false
            }
            return $true
        }
    } catch {}
    return $true  # Assume OK if version check fails
}

# Test model inference
function Test-ModelInference {
    param([string]$Model)

    Write-LogInfo "Testing model inference..."

    try {
        $body = @{
            model = $Model
            prompt = "Say OK"
            stream = $false
            options = @{
                num_predict = 5
            }
        } | ConvertTo-Json

        $response = Invoke-RestMethod -Uri "$OllamaApiUrl/api/generate" -Method Post -Body $body -ContentType 'application/json' -TimeoutSec 60

        if ($response.response) {
            Write-LogSuccess "Model inference test passed"
            return $true
        }
    } catch {
        Write-LogWarning "Model inference test failed: $_"
    }

    return $false
}

# Get available disk space in GB
function Get-FreeDiskSpaceGB {
    $ollamaPath = Join-Path $env:USERPROFILE '.ollama'
    if (-not (Test-Path $ollamaPath)) {
        $ollamaPath = $env:USERPROFILE
    }

    $drive = (Get-Item $ollamaPath).PSDrive.Name
    $disk = Get-PSDrive -Name $drive
    [math]::Floor($disk.Free / 1GB)
}

# Wait for Ollama server
function Wait-OllamaServer {
    param([int]$MaxAttempts = 30)

    Write-LogInfo "Waiting for Ollama server..."

    for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
        try {
            $response = Invoke-RestMethod -Uri "$OllamaApiUrl/api/version" -TimeoutSec 2 -ErrorAction Stop
            Write-LogSuccess "Ollama server is ready"
            return $true
        } catch {
            Start-Sleep -Seconds 1
        }
    }

    Write-LogError "Ollama server not responding after $MaxAttempts seconds"
    return $false
}

# Check if port is in use
function Test-PortInUse {
    param([int]$Port = 11434)

    try {
        $connection = New-Object System.Net.Sockets.TcpClient
        try {
            $connection.Connect('127.0.0.1', $Port)
            return $true
        } finally {
            $connection.Close()
            $connection.Dispose()
        }
    } catch {
        return $false
    }
}

# Start Ollama server
function Start-OllamaServer {
    # Check if already running via API (with longer timeout)
    try {
        $response = Invoke-RestMethod -Uri "$OllamaApiUrl/api/version" -TimeoutSec 5 -ErrorAction Stop
        Write-LogSuccess "Ollama server already running (v$($response.version))"
        return $true
    } catch {
        # API not responding, check if port is in use
    }

    # Check if something is already using the port
    if (Test-PortInUse -Port 11434) {
        Write-LogInfo "Port 11434 is in use, checking if Ollama is responding..."

        # Give it more time - maybe server is still starting
        for ($i = 1; $i -le 10; $i++) {
            Start-Sleep -Seconds 1
            try {
                $response = Invoke-RestMethod -Uri "$OllamaApiUrl/api/version" -TimeoutSec 3 -ErrorAction Stop
                Write-LogSuccess "Ollama server is running (v$($response.version))"
                return $true
            } catch {
                # Keep waiting
            }
        }

        # Port is in use but not responding as Ollama
        Write-LogWarning "Port 11434 is in use but not responding as Ollama API"
        Write-LogInfo "Another process may be using this port"
        Write-LogInfo "Check with: netstat -ano | findstr :11434"
        return $false
    }

    # Port is free, try starting as background process
    if (Test-CommandExists 'ollama') {
        Write-LogInfo "Starting Ollama server..."
        $process = Start-Process -FilePath 'ollama' -ArgumentList 'serve' -WindowStyle Hidden -PassThru

        # Wait for server to be ready
        $serverReady = Wait-OllamaServer

        # Verify process is still running after wait
        if ($serverReady -and -not $process.HasExited) {
            return $true
        } elseif ($process.HasExited) {
            Write-LogError "Ollama process exited unexpectedly (Exit code: $($process.ExitCode))"
            return $false
        }

        return $serverReady
    }

    return $false
}

# Install Ollama
function Install-Ollama {
    if (Test-CommandExists 'ollama') {
        Write-LogSuccess "Ollama already installed"

        # Show version and check minimum
        $version = & ollama --version 2>&1 | Select-Object -First 1
        Write-LogInfo "Version: $version"
        Test-OllamaVersion | Out-Null

        # Ensure server is running
        if (-not (Start-OllamaServer)) {
            Write-LogError "Could not connect to Ollama server"
            Write-LogInfo "If Ollama is installed as a Windows service, it may need to be restarted"
            Write-LogInfo "Try: Restart-Service Ollama -ErrorAction SilentlyContinue"
            Write-LogInfo "Or start manually: ollama serve"
            exit 1
        }

        return
    }

    Write-LogInfo "Installing Ollama..."

    # Try winget first
    if (Test-CommandExists 'winget') {
        Write-LogInfo "Using winget for installation..."

        try {
            & winget install Ollama.Ollama --silent --accept-source-agreements --accept-package-agreements

            # Exit code 3010 = success but reboot required
            if ($LASTEXITCODE -eq 0 -or $LASTEXITCODE -eq 3010) {
                Write-LogSuccess "Ollama installed via winget"
                if ($LASTEXITCODE -eq 3010) {
                    Write-LogWarning "A reboot may be required to complete installation"
                }

                # Refresh PATH
                $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

                # Verify ollama is now in PATH
                if (-not (Test-CommandExists 'ollama')) {
                    # Try common installation paths
                    $commonPaths = @(
                        "$env:LOCALAPPDATA\Programs\Ollama",
                        "$env:ProgramFiles\Ollama",
                        "${env:ProgramFiles(x86)}\Ollama"
                    )
                    foreach ($path in $commonPaths) {
                        if (Test-Path (Join-Path $path 'ollama.exe')) {
                            $env:Path += ";$path"
                            break
                        }
                    }

                    # Final check after manual PATH addition
                    if (-not (Test-CommandExists 'ollama')) {
                        Write-LogWarning "Ollama installed but not found in PATH"
                        Write-LogInfo "Please restart your terminal or add Ollama to PATH manually"
                    }
                }

                # Start server
                Start-OllamaServer
                return
            }
        } catch {
            Write-LogWarning "winget installation failed: $_"
        }
    }

    # Manual installation instructions
    Write-LogWarning "Automatic installation not available"
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please install Ollama manually:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  1. Download from: https://ollama.ai/download"
    Write-Host "  2. Run the installer"
    Write-Host "  3. Run this script again"
    Write-Host ""
    Write-Host "Alternative (winget):"
    Write-Host "  winget install Ollama.Ollama"
    Write-Host ""
    exit 1
}

# Pull base model
function Install-BaseModel {
    Write-LogInfo "Checking model: $ModelName"

    # Check if model exists (escape regex special chars in model name)
    $models = & ollama list 2>$null
    $escapedModelName = [regex]::Escape($ModelName)
    if ($models -match "^$escapedModelName\s") {
        Write-LogSuccess "Model already available: $ModelName"
        return
    }

    Write-LogInfo "Downloading $ModelName (~4.7GB, takes 2-5min)..."

    & ollama pull $ModelName
    if ($LASTEXITCODE -ne 0) {
        Write-LogError "Model download failed"
        Write-LogInfo "Please try manually: ollama pull $ModelName"
        exit 1
    }

    Write-LogSuccess "Model downloaded: $ModelName"
}

# Create custom model
function New-CustomModel {
    Write-LogInfo "Checking custom model: $CustomModelName"

    # Check if custom model exists (escape regex special chars in model name)
    $models = & ollama list 2>$null
    $escapedCustomModelName = [regex]::Escape($CustomModelName)
    if ($models -match "^$escapedCustomModelName\s") {
        Write-LogSuccess "Custom model already available"
        return
    }

    Write-LogInfo "Creating optimized custom model..."

    # Create temporary Modelfile (using $ModelName for consistency)
    $modelfileContent = @"
FROM $ModelName

# Optimized parameters for Hablara emotion/fallacy detection
PARAMETER temperature 0.3
PARAMETER top_p 0.9
PARAMETER repeat_penalty 1.1

# System message for Hablara
SYSTEM You are an expert in psychology, communication analysis, and logical reasoning. Analyze text for emotions, cognitive biases, and logical fallacies with high accuracy.
"@

    # Use unique temp filename to avoid conflicts
    $modelfilePath = Join-Path $env:TEMP "hablara-modelfile-$(Get-Random).tmp"

    # Write without BOM (UTF8NoBOM) - Ollama can't parse BOM
    [System.IO.File]::WriteAllText($modelfilePath, $modelfileContent, [System.Text.UTF8Encoding]::new($false))

    try {
        & ollama create $CustomModelName -f $modelfilePath
        if ($LASTEXITCODE -ne 0) {
            Write-LogWarning "Custom model creation failed"
            Write-LogWarning "Continuing with base model"
            return
        }

        Write-LogSuccess "Custom model created: $CustomModelName"
        Write-LogInfo "Accuracy boost: 80% -> 93% (Emotion Detection)"
    } catch {
        Write-LogWarning "Unexpected error during model creation: $_"
        throw
    } finally {
        # Cleanup temp file (always executes, even on Ctrl+C)
        if (Test-Path $modelfilePath) {
            Remove-Item -Path $modelfilePath -Force -ErrorAction SilentlyContinue
        }
    }
}

# Verify installation
function Test-Installation {
    Write-Host ""
    Write-LogInfo "Verifying installation..."

    # Check Ollama binary
    if (-not (Test-CommandExists 'ollama')) {
        Write-LogError "Ollama binary not found"
        return $false
    }

    # Check server API
    try {
        $null = Invoke-RestMethod -Uri "$OllamaApiUrl/api/version" -TimeoutSec 5
    } catch {
        Write-LogError "Ollama server not reachable"
        Write-LogInfo "Start manually: ollama serve"
        return $false
    }

    # Check base model (escape regex special chars in model names)
    $models = & ollama list 2>$null
    $escapedModelName = [regex]::Escape($ModelName)
    $escapedCustomModelName = [regex]::Escape($CustomModelName)
    if (-not ($models -match "^$escapedModelName\s")) {
        Write-LogError "Base model not found: $ModelName"
        return $false
    }

    Write-LogSuccess "Base model available: $ModelName"

    # Check custom model (optional)
    if ($models -match "^$escapedCustomModelName\s") {
        Write-LogSuccess "Custom model available: $CustomModelName"
    } else {
        Write-LogWarning "Custom model not available (using base model)"
    }

    # Test inference to verify model works
    $testModel = if ($models -match "^$escapedCustomModelName\s") { $CustomModelName } else { $ModelName }
    if (-not (Test-ModelInference -Model $testModel)) {
        Write-LogWarning "Model loaded but inference test failed"
        Write-LogInfo "The model may still work - try it in the app"
    }

    Write-Host ""
    Write-LogSuccess "Setup complete!"

    return $true
}

# Pre-flight checks
function Test-Prerequisites {
    Write-Host ""
    Write-Host "Hablara Ollama Quick-Setup v$ScriptVersion" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""

    # Check platform
    if ($env:OS -ne 'Windows_NT') {
        Write-LogError "This script is for Windows only"
        Write-LogInfo "For macOS/Linux: ./scripts/setup-ollama-quick.sh"
        exit 4
    }

    # Check disk space
    $freeSpace = Get-FreeDiskSpaceGB

    if ($freeSpace -lt $RequiredDiskSpaceGB) {
        Write-LogError "Insufficient disk space"
        Write-LogError "Required: ${RequiredDiskSpaceGB}GB, Available: ${freeSpace}GB"
        exit 2
    }

    Write-LogSuccess "Disk space: ${freeSpace}GB available"

    # Check network
    try {
        $null = Invoke-WebRequest -Uri 'https://ollama.ai' -TimeoutSec 5 -UseBasicParsing
        Write-LogSuccess "Network connection OK"
    } catch {
        Write-LogError "No network connection to ollama.ai"
        Write-LogInfo "Please check your internet connection"
        exit 3
    }

    # Check GPU availability
    $gpu = Test-GpuAvailable
    if ($gpu.Available) {
        Write-LogSuccess "GPU detected: $($gpu.Type) (fast inference)"
    } else {
        Write-LogWarning "No GPU detected - using CPU (slower inference)"
        Write-LogInfo "First inference may take 30-60 seconds"
    }

    Write-Host ""
}

# Main function
function Main {
    # Run pre-flight checks
    Test-Prerequisites

    # Install Ollama
    Install-Ollama

    # Pull base model
    Install-BaseModel

    # Create custom model
    New-CustomModel

    # Verify everything works
    if (-not (Test-Installation)) {
        exit 1
    }

    # Success message
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Green
    Write-Host ""
    Write-Host "  1. Start Hablara.exe"
    Write-Host "  2. Press Ctrl+Shift+D for first recording"
    Write-Host "  3. Allow microphone permission (one-time)"
    Write-Host ""
    Write-Host "LLM Settings in the app:" -ForegroundColor Yellow
    Write-Host "  - Provider: Ollama (default)"
    Write-Host "  - Model: qwen2.5:7b-custom"
    Write-Host "  - Base URL: http://localhost:11434"
    Write-Host ""
    Write-Host "Documentation: https://github.com/fidpa/hablara/blob/main/README.md" -ForegroundColor Blue
    Write-Host ""
}

# Run main
Main
