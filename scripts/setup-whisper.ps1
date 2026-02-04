#Requires -Version 5.1
<#
.SYNOPSIS
    Whisper.cpp Setup Script for Hablara (Voice Intelligence Pipeline) - Windows

.DESCRIPTION
    This script:
    1. Clones whisper.cpp
    2. Compiles with CMake/MSVC (optional CUDA support)
    3. Downloads the specified model
    4. Copies binary and model to src-tauri/

.PARAMETER Model
    Whisper model to download. Default: base
    Valid: tiny, tiny.en, base, base.en, small, small.en, medium, medium.en

.PARAMETER UseCuda
    Enable CUDA acceleration (requires NVIDIA GPU + CUDA toolkit)

.EXAMPLE
    .\scripts\setup-whisper.ps1
    # Installs with base model

.EXAMPLE
    .\scripts\setup-whisper.ps1 -Model small
    # Installs with small model

.EXAMPLE
    .\scripts\setup-whisper.ps1 -Model medium -UseCuda
    # Installs with CUDA acceleration

.NOTES
    Exit Codes:
      0 - Success
      1 - Missing dependencies
      2 - Build failed
      3 - Model download failed

    Author: Hablará Team
    Created: 2026-02-04
    Changed: 2026-02-04
#>

[CmdletBinding()]
param(
    [ValidateSet('tiny', 'tiny.en', 'base', 'base.en', 'small', 'small.en', 'medium', 'medium.en')]
    [string]$Model = 'base',

    [switch]$UseCuda
)

# Strict mode
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Configuration
$ScriptVersion = '1.0.0'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$ModelBaseUrl = 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main'
$TauriDir = Join-Path $ProjectRoot 'src-tauri'
$BinariesDir = Join-Path $TauriDir 'binaries'
$ModelsDir = Join-Path $TauriDir 'models'
$BuildDir = Join-Path $ProjectRoot '.whisper-build'

# Binary name for Windows x64
$BinaryName = 'whisper-x86_64-pc-windows-msvc.exe'

# Colors for output (PowerShell supports ANSI if enabled)
function Write-Step {
    param([string]$Message)
    Write-Host "`n==> " -ForegroundColor Blue -NoNewline
    Write-Host $Message -ForegroundColor Green
}

function Write-Info {
    param([string]$Message)
    Write-Host "    " -NoNewline
    Write-Host ([char]0x2022) -ForegroundColor Yellow -NoNewline
    Write-Host " $Message"
}

function Write-Success {
    param([string]$Message)
    Write-Host "    " -NoNewline
    Write-Host ([char]0x2713) -ForegroundColor Green -NoNewline
    Write-Host " $Message"
}

function Write-Warn {
    param([string]$Message)
    Write-Host "    " -NoNewline
    Write-Host ([char]0x26A0) -ForegroundColor Yellow -NoNewline
    Write-Host " $Message"
}

function Write-Err {
    param([string]$Message)
    Write-Host ([char]0x2717) -ForegroundColor Red -NoNewline
    Write-Host " Error: $Message" -ForegroundColor Red
}

# Check if command exists
function Test-CommandExists {
    param([string]$Command)
    $null -ne (Get-Command $Command -ErrorAction SilentlyContinue)
}

# Cleanup on error
trap {
    Write-Err "Build failed - cleaning up partial artifacts"
    if (Test-Path (Join-Path $BuildDir 'build')) {
        Remove-Item -Recurse -Force (Join-Path $BuildDir 'build') -ErrorAction SilentlyContinue
    }
    exit 2
}

# -----------------------------------------------------------------------------
# Pre-flight Checks
# -----------------------------------------------------------------------------

Write-Step "Checking dependencies..."

# Check Git
if (-not (Test-CommandExists 'git')) {
    Write-Err "Git is required but not installed."
    Write-Host "Install from: https://git-scm.com/download/win" -ForegroundColor Cyan
    exit 1
}
Write-Success "Git found"

# Check CMake
if (-not (Test-CommandExists 'cmake')) {
    Write-Err "CMake is required but not installed."
    Write-Host "Install via: winget install Kitware.CMake" -ForegroundColor Cyan
    Write-Host "Or download from: https://cmake.org/download/" -ForegroundColor Cyan
    exit 1
}
Write-Success "CMake found"

# Check for Visual Studio / MSVC
$vsWhere = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
if (-not (Test-Path $vsWhere)) {
    Write-Err "Visual Studio Build Tools not found."
    Write-Host "Install from: https://visualstudio.microsoft.com/downloads/" -ForegroundColor Cyan
    Write-Host "Select 'Desktop development with C++' workload" -ForegroundColor Cyan
    exit 1
}

$vsPath = & $vsWhere -latest -property installationPath 2>$null
if (-not $vsPath) {
    Write-Err "No Visual Studio installation found."
    exit 1
}
Write-Success "Visual Studio found: $vsPath"

# Check CUDA if requested
if ($UseCuda) {
    if (-not (Test-CommandExists 'nvcc')) {
        Write-Err "CUDA toolkit not found (nvcc not in PATH)."
        Write-Host "Install from: https://developer.nvidia.com/cuda-downloads" -ForegroundColor Cyan
        Write-Host "Or run without -UseCuda flag" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "NOTE: CUDA is optional. Whisper will work without GPU acceleration." -ForegroundColor Cyan
        exit 1
    }
    Write-Success "CUDA toolkit found"
}

Write-Success "All dependencies found"

# Detect architecture (with fallback for older systems)
$Arch = try {
    [System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture
} catch {
    # Fallback for systems without RuntimeInformation
    $env:PROCESSOR_ARCHITECTURE
}
Write-Info "Architecture: $Arch"

# -----------------------------------------------------------------------------
# Clone whisper.cpp
# -----------------------------------------------------------------------------

Write-Step "Setting up whisper.cpp..."

if (Test-Path $BuildDir) {
    Write-Info "Build directory exists, updating..."
    Push-Location $BuildDir
    try {
        git pull --quiet
    } finally {
        Pop-Location
    }
} else {
    Write-Info "Cloning whisper.cpp..."
    git clone --depth 1 https://github.com/ggml-org/whisper.cpp.git $BuildDir
}

# -----------------------------------------------------------------------------
# Build whisper.cpp
# -----------------------------------------------------------------------------

Write-Step "Building whisper.cpp with MSVC..."

Push-Location $BuildDir
try {
    # Clean previous build
    if (Test-Path 'build') {
        Remove-Item -Recurse -Force 'build'
    }

    # Configure CMake
    $cmakeArgs = @('-B', 'build', '-DCMAKE_BUILD_TYPE=Release')

    if ($UseCuda) {
        Write-Info "Enabling CUDA acceleration..."
        $cmakeArgs += '-DGGML_CUDA=ON'
    }

    Write-Info "Running cmake configure..."
    & cmake $cmakeArgs
    if ($LASTEXITCODE -ne 0) {
        Write-Err "CMake configure failed"
        exit 2
    }

    # Build
    $cpuCount = (Get-CimInstance -ClassName Win32_Processor).NumberOfLogicalProcessors
    Write-Info "Building with $cpuCount parallel jobs..."
    & cmake --build build --config Release -j $cpuCount
    if ($LASTEXITCODE -ne 0) {
        Write-Err "Build failed"
        exit 2
    }

    # Find built binary
    $Script:WhisperBin = $null
    $possiblePaths = @(
        'build\bin\Release\whisper-cli.exe',
        'build\bin\Release\main.exe',
        'build\Release\whisper-cli.exe',
        'build\Release\main.exe'
    )

    foreach ($path in $possiblePaths) {
        if (Test-Path $path) {
            $Script:WhisperBin = $path
            break
        }
    }

    if (-not $Script:WhisperBin) {
        Write-Err "Build failed - whisper binary not found"
        Write-Host "Searched in:" -ForegroundColor Yellow
        $possiblePaths | ForEach-Object { Write-Host "  $_" }

        # List what's actually there
        Write-Host "`nActual build contents:" -ForegroundColor Yellow
        if (Test-Path 'build\bin\Release') {
            Get-ChildItem 'build\bin\Release' | ForEach-Object { Write-Host "  $($_.Name)" }
        } elseif (Test-Path 'build\Release') {
            Get-ChildItem 'build\Release' | ForEach-Object { Write-Host "  $($_.Name)" }
        }

        exit 2
    }

    Write-Success "Build successful: $Script:WhisperBin"
} finally {
    Pop-Location
}

# -----------------------------------------------------------------------------
# Download Model
# -----------------------------------------------------------------------------

Write-Step "Downloading Whisper model: $Model..."

Push-Location $BuildDir
try {
    # Model URL from configuration
    $modelUrl = "$ModelBaseUrl/ggml-$Model.bin"
    $modelFile = "models\ggml-$Model.bin"

    # Create models directory
    if (-not (Test-Path 'models')) {
        New-Item -ItemType Directory -Path 'models' | Out-Null
    }

    if (Test-Path $modelFile) {
        Write-Success "Model already downloaded"
    } else {
        Write-Info "Downloading from Hugging Face..."
        # Use Invoke-WebRequest with progress (restore preference after)
        $savedProgressPreference = $ProgressPreference
        try {
            $ProgressPreference = 'Continue'
            Invoke-WebRequest -Uri $modelUrl -OutFile $modelFile -UseBasicParsing
        } catch {
            Write-Err "Model download failed: $_"
            exit 3
        } finally {
            $ProgressPreference = $savedProgressPreference
        }
    }

    $modelSize = (Get-Item $modelFile).Length / 1MB
    Write-Success "Model downloaded: $([math]::Round($modelSize, 1)) MB"
} finally {
    Pop-Location
}

# -----------------------------------------------------------------------------
# Install to Tauri
# -----------------------------------------------------------------------------

Write-Step "Installing to Tauri..."

# Create directories
if (-not (Test-Path $BinariesDir)) {
    New-Item -ItemType Directory -Path $BinariesDir | Out-Null
}
if (-not (Test-Path $ModelsDir)) {
    New-Item -ItemType Directory -Path $ModelsDir | Out-Null
}

# Copy binary with Tauri sidecar naming convention
$sourceBinary = Join-Path $BuildDir $Script:WhisperBin
$destBinary = Join-Path $BinariesDir $BinaryName

Copy-Item -Path $sourceBinary -Destination $destBinary -Force
Write-Success "Binary installed: $destBinary"

# Copy model
$sourceModel = Join-Path $BuildDir "models\ggml-$Model.bin"
$destModel = Join-Path $ModelsDir "ggml-$Model.bin"

Copy-Item -Path $sourceModel -Destination $destModel -Force
Write-Success "Model installed: $destModel"

# -----------------------------------------------------------------------------
# Verify Installation
# -----------------------------------------------------------------------------

Write-Step "Verifying installation..."

# Test the binary
try {
    $output = & $destBinary --help 2>&1
    if ($LASTEXITCODE -eq 0 -or $output -match 'usage') {
        Write-Success "Binary verification: OK"
    } else {
        Write-Err "Binary verification failed"
        exit 2
    }
} catch {
    Write-Err "Binary verification failed: $_"
    exit 2
}

# Check model file
if (Test-Path $destModel) {
    Write-Success "Model verification: OK"
} else {
    Write-Err "Model file not found"
    exit 3
}

# -----------------------------------------------------------------------------
# Summary
# -----------------------------------------------------------------------------

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  $([char]0x2713) Whisper Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Installed components:"
Write-Host "  Binary: $destBinary"
Write-Host "  Model:  $destModel"
Write-Host ""
Write-Host "Model sizes reference:"
Write-Host "  tiny   ~75 MB   (fastest, lowest quality)"
Write-Host "  base   ~142 MB  (good balance)"
Write-Host "  small  ~466 MB  (better quality)"
Write-Host "  medium ~1.5 GB  (high quality, max recommended for live)"
Write-Host ""
Write-Host "To download additional models, run:" -ForegroundColor Cyan
Write-Host "  .\scripts\setup-whisper.ps1 -Model <model-name>"
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Blue
Write-Host "  1. Run 'pnpm run tauri dev' to test"
Write-Host "  2. The transcribe_audio command should now work"
Write-Host ""

exit 0
