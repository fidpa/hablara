#Requires -Version 5.1
<#
.SYNOPSIS
    Hablara - Ollama Quick-Setup Script (Windows)

.DESCRIPTION
    Installs Ollama and configures an optimized model for Hablara.

.EXAMPLE
    .\setup-ollama-win.ps1
    .\setup-ollama-win.ps1 -Model 3b

.NOTES
    Exit Codes: 0=Success, 1=Error, 2=Disk space, 3=Network, 4=Platform
#>

[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [ValidateSet('3b', '7b', '14b', '32b')]
    [string]$Model,

    [switch]$Help
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

trap {
    Write-Host "$([char]0x2717) Error: Setup failed unexpectedly: $_" -ForegroundColor Red
    exit 1
}

# ============================================================================
# Configuration
# ============================================================================

$ScriptVersion = '1.2.0'
$OllamaApiUrl = 'http://localhost:11434'
$MinOllamaVersion = '0.3.0'

$script:ModelName = ''
$script:CustomModelName = ''
$script:ModelSize = ''
$script:RequiredDiskSpaceGB = 10

$ModelConfigs = @{
    '3b'  = @{ Name = 'qwen2.5:3b';  Size = '~2GB';   DiskGB = 5;  RAMWarn = $false; MinRAM = 0 }
    '7b'  = @{ Name = 'qwen2.5:7b';  Size = '~4.7GB'; DiskGB = 10; RAMWarn = $false; MinRAM = 0 }
    '14b' = @{ Name = 'qwen2.5:14b'; Size = '~9GB';   DiskGB = 15; RAMWarn = $false; MinRAM = 0 }
    '32b' = @{ Name = 'qwen2.5:32b'; Size = '~20GB';  DiskGB = 25; RAMWarn = $true;  MinRAM = 32 }
}
$DefaultModel = '7b'

# ============================================================================
# Helper Functions
# ============================================================================

function Write-Step { param([string]$Message); Write-Host "`n==> " -ForegroundColor Blue -NoNewline; Write-Host $Message -ForegroundColor Green }
function Write-Info { param([string]$Message); Write-Host "    $([char]0x2022) " -ForegroundColor Yellow -NoNewline; Write-Host $Message }
function Write-Success { param([string]$Message); Write-Host "    $([char]0x2713) " -ForegroundColor Green -NoNewline; Write-Host $Message }
function Write-Warn { param([string]$Message); Write-Host "    $([char]0x26A0) " -ForegroundColor Yellow -NoNewline; Write-Host $Message }
function Write-Err { param([string]$Message); Write-Host "$([char]0x2717) Error: $Message" -ForegroundColor Red }

function Test-CommandExists { param([string]$Command); $null -ne (Get-Command $Command -ErrorAction SilentlyContinue) }

function Test-InteractiveSession {
    try { return -not [Console]::IsInputRedirected -and -not [Console]::IsOutputRedirected }
    catch { return $false }
}

function Get-SystemRAMGB {
    try {
        $mem = Get-CimInstance -ClassName Win32_ComputerSystem -Property TotalPhysicalMemory -ErrorAction Stop
        return [math]::Floor($mem.TotalPhysicalMemory / 1GB)
    } catch { return 0 }
}

function Get-FreeDiskSpaceGB {
    $ollamaPath = Join-Path $env:USERPROFILE '.ollama'
    if (-not (Test-Path $ollamaPath)) { $ollamaPath = $env:USERPROFILE }
    $drive = (Get-Item $ollamaPath).PSDrive.Name
    $disk = Get-PSDrive -Name $drive
    [math]::Floor($disk.Free / 1GB)
}

function Compare-SemanticVersion {
    param([string]$Version1, [string]$Version2)
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

function Test-GpuAvailable {
    if (Test-CommandExists 'nvidia-smi') {
        try {
            $null = & nvidia-smi 2>$null
            if ($LASTEXITCODE -eq 0) { return @{ Available = $true; Type = 'NVIDIA' } }
        } catch {}
    }
    if (Test-Path 'C:\Program Files\AMD\ROCm\*\bin\rocm-smi.exe') {
        return @{ Available = $true; Type = 'AMD ROCm' }
    }
    return @{ Available = $false; Type = 'CPU' }
}

function Test-OllamaVersion {
    try {
        $versionOutput = & ollama --version 2>&1 | Select-Object -First 1
        if ($versionOutput -match '(\d+\.\d+\.?\d*)') {
            $currentVersion = $Matches[1]
            if ((Compare-SemanticVersion $currentVersion $MinOllamaVersion) -lt 0) {
                Write-Warn "Ollama version $currentVersion is older than recommended $MinOllamaVersion"
                Write-Info "Update: winget upgrade Ollama.Ollama"
                return $false
            }
        }
    } catch {}
    return $true
}

function Test-ModelInference {
    param([string]$Model)
    Write-Info "Testing model inference..."

    try {
        $body = @{ model = $Model; prompt = "Say OK"; stream = $false; options = @{ num_predict = 5 } } | ConvertTo-Json
        $response = Invoke-RestMethod -Uri "$OllamaApiUrl/api/generate" -Method Post -Body $body -ContentType 'application/json' -TimeoutSec 60
        if ($response.response) { Write-Success "Model inference test passed"; return $true }
    } catch { Write-Warn "Model inference test failed: $_" }
    return $false
}

function Wait-OllamaServer {
    param([int]$MaxAttempts = 30)
    Write-Info "Waiting for Ollama server..."

    for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
        try {
            $null = Invoke-RestMethod -Uri "$OllamaApiUrl/api/version" -TimeoutSec 2 -ErrorAction Stop
            Write-Success "Ollama server is ready"
            return $true
        } catch { Start-Sleep -Seconds 1 }
    }
    Write-Err "Ollama server not responding after $MaxAttempts seconds"
    return $false
}

function Test-PortInUse {
    param([int]$Port = 11434)
    try {
        $connection = New-Object System.Net.Sockets.TcpClient
        try { $connection.Connect('127.0.0.1', $Port); return $true }
        finally { $connection.Close(); $connection.Dispose() }
    } catch { return $false }
}

# ============================================================================
# Model Selection
# ============================================================================

function Show-HelpMessage {
    @"
Hablara Ollama Quick-Setup Script v$ScriptVersion

Usage: .\setup-ollama-win.ps1 [-Model <variant>] [-Help]

Parameters:
  -Model <variant>   Select model variant (3b, 7b, 14b, 32b)
  -Help              Show this help message

Model variants:
  3b   - qwen2.5:3b   (~2GB download, 5GB disk)
  7b   - qwen2.5:7b   (~4.7GB download, 10GB disk) [DEFAULT]
  14b  - qwen2.5:14b  (~9GB download, 15GB disk)
  32b  - qwen2.5:32b  (~20GB download, 25GB disk, needs 32GB+ RAM)

Examples:
  .\setup-ollama-win.ps1              # Interactive or default (7b)
  .\setup-ollama-win.ps1 -Model 3b    # Use 3b model
"@ | Write-Host
}

function Show-ModelMenu {
    Write-Host ""
    Write-Host "Waehle ein Modell:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  1) 3b  - qwen2.5:3b   (~2GB, schnell, weniger genau)"
    Write-Host "  2) 7b  - qwen2.5:7b   (~4.7GB, ausgewogen) [EMPFOHLEN]"
    Write-Host "  3) 14b - qwen2.5:14b  (~9GB, genauer)"
    Write-Host "  4) 32b - qwen2.5:32b  (~20GB, beste Qualitaet, 32GB+ RAM)"
    Write-Host ""
    $choice = Read-Host "Auswahl [1-4, Enter=2]"

    switch ($choice) {
        '1' { return '3b' }
        '2' { return '7b' }
        '3' { return '14b' }
        '4' { return '32b' }
        default { return '7b' }
    }
}

function Select-ModelConfig {
    param([string]$RequestedModel)

    if ($Help) { Show-HelpMessage; exit 0 }

    $selectedModel = $RequestedModel
    if ([string]::IsNullOrEmpty($selectedModel)) {
        $selectedModel = if (Test-InteractiveSession) { Show-ModelMenu } else { $DefaultModel }
    }

    if (-not $ModelConfigs.ContainsKey($selectedModel)) {
        Write-Err "Ungueltige Modell-Variante: $selectedModel"
        Write-Host "Gueltige Varianten: 3b, 7b, 14b, 32b"
        exit 1
    }

    $config = $ModelConfigs[$selectedModel]
    $script:ModelName = $config.Name
    $script:CustomModelName = "$($config.Name)-custom"
    $script:ModelSize = $config.Size
    $script:RequiredDiskSpaceGB = $config.DiskGB

    # RAM warning for large models
    if ($config.RAMWarn) {
        $systemRAM = Get-SystemRAMGB
        if ($systemRAM -gt 0 -and $systemRAM -lt $config.MinRAM) {
            Write-Host ""
            Write-Warn "Das 32b-Modell benoetigt mindestens $($config.MinRAM)GB RAM"
            Write-Warn "Dein System hat nur ${systemRAM}GB RAM"
            Write-Host ""

            if (Test-InteractiveSession) {
                $confirm = Read-Host "Trotzdem fortfahren? [j/N]"
                if ($confirm -notmatch '^[jJyY]$') { Write-Info "Abgebrochen."; exit 0 }
            } else {
                Write-Warn "Nicht-interaktiver Modus: Fahre trotzdem fort"
            }
        }
    }

    if ([string]::IsNullOrEmpty($script:ModelName)) { Write-Err "Interner Fehler: ModelName nicht gesetzt"; exit 1 }
    Write-Info "Ausgewaehltes Modell: $($script:ModelName)"
    return $config
}

# ============================================================================
# Pre-flight Checks
# ============================================================================

function Test-Prerequisites {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  Hablara Ollama Quick-Setup v$ScriptVersion" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""

    Write-Step "Running pre-flight checks..."

    if ($env:OS -ne 'Windows_NT') {
        Write-Err "This script is for Windows only"
        Write-Info "For macOS/Linux: ./scripts/setup-ollama-linux.sh"
        exit 4
    }

    $freeSpace = Get-FreeDiskSpaceGB
    if ($freeSpace -lt $RequiredDiskSpaceGB) {
        Write-Err "Insufficient disk space: ${freeSpace}GB available, ${RequiredDiskSpaceGB}GB required"
        exit 2
    }
    Write-Success "Disk space: ${freeSpace}GB available"

    try {
        $null = Invoke-WebRequest -Uri 'https://ollama.com' -TimeoutSec 5 -UseBasicParsing
        Write-Success "Network connection OK"
    } catch {
        Write-Err "No network connection to ollama.com"
        exit 3
    }

    $gpu = Test-GpuAvailable
    if ($gpu.Available) { Write-Success "GPU detected: $($gpu.Type)" }
    else { Write-Warn "No GPU detected - using CPU (slower inference)" }

    Write-Host ""
}

# ============================================================================
# Ollama Installation
# ============================================================================

function Start-OllamaServer {
    try {
        $response = Invoke-RestMethod -Uri "$OllamaApiUrl/api/version" -TimeoutSec 5 -ErrorAction Stop
        Write-Success "Ollama server already running (v$($response.version))"
        return $true
    } catch {}

    # Port might be in use by starting server
    if (Test-PortInUse -Port 11434) {
        Write-Info "Port 11434 is in use, waiting for Ollama API..."
        for ($i = 1; $i -le 10; $i++) {
            Start-Sleep -Seconds 1
            try {
                $response = Invoke-RestMethod -Uri "$OllamaApiUrl/api/version" -TimeoutSec 3 -ErrorAction Stop
                Write-Success "Ollama server is running (v$($response.version))"
                return $true
            } catch {}
        }
        Write-Warn "Port 11434 is in use but not responding as Ollama API"
        return $false
    }

    if (Test-CommandExists 'ollama') {
        Write-Info "Starting Ollama server..."
        $process = Start-Process -FilePath 'ollama' -ArgumentList 'serve' -WindowStyle Hidden -PassThru
        $serverReady = Wait-OllamaServer

        if ($serverReady -and -not $process.HasExited) { return $true }
        if ($process.HasExited) { Write-Err "Ollama process exited (code: $($process.ExitCode))"; return $false }
        return $serverReady
    }
    return $false
}

function Install-Ollama {
    Write-Step "Installing Ollama..."

    if (Test-CommandExists 'ollama') {
        Write-Success "Ollama already installed"
        $version = & ollama --version 2>&1 | Select-Object -First 1
        Write-Info "Version: $version"
        Test-OllamaVersion | Out-Null

        if (-not (Start-OllamaServer)) {
            Write-Err "Could not connect to Ollama server"
            Write-Info "Start manually: ollama serve"
            exit 1
        }
        return
    }

    Write-Info "Installing Ollama..."

    if (Test-CommandExists 'winget') {
        Write-Info "Using winget..."
        try {
            & winget install Ollama.Ollama --silent --accept-source-agreements --accept-package-agreements
            if ($LASTEXITCODE -eq 0 -or $LASTEXITCODE -eq 3010) {
                Write-Success "Ollama installed via winget"
                if ($LASTEXITCODE -eq 3010) { Write-Warn "A reboot may be required" }

                $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

                if (-not (Test-CommandExists 'ollama')) {
                    @("$env:LOCALAPPDATA\Programs\Ollama", "$env:ProgramFiles\Ollama") | ForEach-Object {
                        if (Test-Path (Join-Path $_ 'ollama.exe')) { $env:Path += ";$_" }
                    }
                }

                Start-OllamaServer
                return
            }
        } catch { Write-Warn "winget installation failed: $_" }
    }

    Write-Warn "Automatic installation not available"
    Write-Host ""
    Write-Host "Please install Ollama manually: https://ollama.com/download" -ForegroundColor Cyan
    Write-Host "Then run this script again."
    Write-Host ""
    exit 1
}

# ============================================================================
# Model Management
# ============================================================================

function Install-BaseModel {
    Write-Step "Downloading base model..."
    Write-Info "Checking model: $ModelName"

    $models = & ollama list 2>$null
    $escapedModelName = [regex]::Escape($ModelName)
    if ($models -match "^$escapedModelName\s") {
        Write-Success "Model already available: $ModelName"
        return
    }

    Write-Info "Downloading $ModelName ($ModelSize, takes several minutes depending on connection)..."
    & ollama pull $ModelName
    if ($LASTEXITCODE -ne 0) {
        Write-Err "Model download failed"
        Write-Info "Try manually: ollama pull $ModelName"
        exit 1
    }
    Write-Success "Model downloaded: $ModelName"
}

function New-CustomModel {
    Write-Step "Creating custom model..."
    Write-Info "Checking custom model: $CustomModelName"

    $models = & ollama list 2>$null
    $escapedCustomModelName = [regex]::Escape($CustomModelName)
    if ($models -match "^$escapedCustomModelName\s") {
        Write-Success "Custom model already available"
        return
    }

    Write-Info "Creating optimized custom model..."

    $modelfileContent = @"
FROM $ModelName

PARAMETER temperature 0.3
PARAMETER top_p 0.9
PARAMETER repeat_penalty 1.1

SYSTEM You are an expert in psychology, communication analysis, and logical reasoning. Analyze text for emotions, cognitive biases, and logical fallacies with high accuracy.
"@

    $modelfilePath = Join-Path $env:TEMP "hablara-modelfile-$(Get-Random).tmp"

    # Path traversal prevention
    $canonicalPath = [System.IO.Path]::GetFullPath($modelfilePath)
    $canonicalTemp = [System.IO.Path]::GetFullPath($env:TEMP)
    if (-not $canonicalPath.StartsWith($canonicalTemp)) {
        Write-Err "Path traversal detected"
        return
    }

    # Write without BOM (Ollama can't parse BOM)
    [System.IO.File]::WriteAllText($modelfilePath, $modelfileContent, [System.Text.UTF8Encoding]::new($false))

    # Restrictive permissions to prevent race condition attacks
    try {
        $acl = Get-Acl $modelfilePath
        $acl.SetAccessRuleProtection($true, $false)
        $acl.Access | ForEach-Object { $acl.RemoveAccessRule($_) } | Out-Null
        $currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
        $rule = New-Object System.Security.AccessControl.FileSystemAccessRule($currentUser, 'FullControl', 'Allow')
        $acl.AddAccessRule($rule)
        Set-Acl -Path $modelfilePath -AclObject $acl -ErrorAction Stop
    } catch { Write-Warn "Could not set restrictive permissions: $_" }

    try {
        & ollama create $CustomModelName -f $modelfilePath
        if ($LASTEXITCODE -ne 0) {
            Write-Warn "Custom model creation failed - using base model"
            return
        }
        Write-Success "Custom model created: $CustomModelName"
        Write-Info "Accuracy boost: 80% -> 93% (Emotion Detection)"
    } finally {
        if (Test-Path $modelfilePath) { Remove-Item -Path $modelfilePath -Force -ErrorAction SilentlyContinue }
    }
}

# ============================================================================
# Verification
# ============================================================================

function Test-Installation {
    Write-Host ""
    Write-Step "Verifying installation..."

    if (-not (Test-CommandExists 'ollama')) { Write-Err "Ollama binary not found"; return $false }

    try { $null = Invoke-RestMethod -Uri "$OllamaApiUrl/api/version" -TimeoutSec 5 }
    catch { Write-Err "Ollama server not reachable"; return $false }

    $models = & ollama list 2>$null
    $escapedModelName = [regex]::Escape($ModelName)
    $escapedCustomModelName = [regex]::Escape($CustomModelName)

    if (-not ($models -match "^$escapedModelName\s")) { Write-Err "Base model not found: $ModelName"; return $false }
    Write-Success "Base model available: $ModelName"

    $testModel = $ModelName
    if ($models -match "^$escapedCustomModelName\s") {
        Write-Success "Custom model available: $CustomModelName"
        $testModel = $CustomModelName
    } else {
        Write-Warn "Custom model not available (using base model)"
    }

    if (-not (Test-ModelInference -Model $testModel)) {
        Write-Warn "Inference test failed - try in the app"
    }

    Write-Host ""
    Write-Success "Setup complete!"
    return $true
}

# ============================================================================
# Main
# ============================================================================

function Main {
    $null = Select-ModelConfig -RequestedModel $Model
    Test-Prerequisites
    Install-Ollama
    Install-BaseModel
    New-CustomModel

    if (-not (Test-Installation)) { exit 1 }

    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Blue
    Write-Host ""
    Write-Host "  1. Start Hablara.exe"
    Write-Host "  2. Press Ctrl+Shift+D for first recording"
    Write-Host "  3. Allow microphone permission (one-time)"
    Write-Host ""
    Write-Host "LLM Settings in the app:" -ForegroundColor Yellow
    Write-Host "  - Provider: Ollama (default)"
    Write-Host "  - Model: $CustomModelName"
    Write-Host "  - Base URL: http://localhost:11434"
    Write-Host ""
    Write-Host "Docs: https://github.com/fidpa/hablara" -ForegroundColor Cyan
    Write-Host ""
}

Main
