#Requires -Version 5.1
<#
.SYNOPSIS
    Whisper.cpp Setup Script for Hablara - Windows

.PARAMETER Model
    Whisper model: tiny, tiny.en, base, base.en, small, small.en, medium, medium.en

.PARAMETER UseCuda
    Enable CUDA acceleration (requires NVIDIA GPU + CUDA toolkit)

.EXAMPLE
    .\setup-whisper.ps1 -Model small -UseCuda

.NOTES
    Exit Codes: 0=Success, 1=Dependencies, 2=Build, 3=Model
#>

[CmdletBinding()]
param(
    [ValidateSet('tiny', 'tiny.en', 'base', 'base.en', 'small', 'small.en', 'medium', 'medium.en')]
    [string]$Model = 'base',

    [switch]$UseCuda
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$ModelBaseUrl = 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main'
$TauriDir = Join-Path $ProjectRoot 'src-tauri'
$BinariesDir = Join-Path $TauriDir 'binaries'
$ModelsDir = Join-Path $TauriDir 'models'
$BuildDir = Join-Path $ProjectRoot '.whisper-build'
$BinaryName = 'whisper-x86_64-pc-windows-msvc.exe'

# ============================================================================
# Helper Functions
# ============================================================================

function Write-Step { param([string]$Message); Write-Host "`n==> " -ForegroundColor Blue -NoNewline; Write-Host $Message -ForegroundColor Green }
function Write-Info { param([string]$Message); Write-Host "    $([char]0x2022) " -ForegroundColor Yellow -NoNewline; Write-Host $Message }
function Write-Success { param([string]$Message); Write-Host "    $([char]0x2713) " -ForegroundColor Green -NoNewline; Write-Host $Message }
function Write-Warn { param([string]$Message); Write-Host "    $([char]0x26A0) " -ForegroundColor Yellow -NoNewline; Write-Host $Message }
function Write-Err { param([string]$Message); Write-Host "$([char]0x2717) Error: $Message" -ForegroundColor Red }

function Test-CommandExists { param([string]$Command); $null -ne (Get-Command $Command -ErrorAction SilentlyContinue) }

trap {
    Write-Err "Build failed - cleaning up"
    $lockFile = Join-Path $BuildDir '.cleanup.lock'
    try {
        $null = New-Item -ItemType Directory -Path $lockFile -ErrorAction Stop
        $buildPath = Join-Path $BuildDir 'build'
        if (Test-Path $buildPath) { Remove-Item -Recurse -Force $buildPath -ErrorAction SilentlyContinue }
        Remove-Item $lockFile -ErrorAction SilentlyContinue
    } catch {}
    exit 2
}

# ============================================================================
# Pre-flight Checks
# ============================================================================

Write-Step "Checking dependencies..."

if (-not (Test-CommandExists 'git')) {
    Write-Err "Git required: https://git-scm.com/download/win"
    exit 1
}
Write-Success "Git found"

if (-not (Test-CommandExists 'cmake')) {
    Write-Err "CMake required: winget install Kitware.CMake"
    exit 1
}
Write-Success "CMake found"

$vsWhere = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
if (-not (Test-Path $vsWhere)) {
    Write-Err "Visual Studio Build Tools required"
    Write-Host "Install 'Desktop development with C++' from: https://visualstudio.microsoft.com/downloads/" -ForegroundColor Cyan
    exit 1
}

$vsPath = & $vsWhere -latest -property installationPath 2>$null
if (-not $vsPath) { Write-Err "No Visual Studio installation found"; exit 1 }
Write-Success "Visual Studio: $vsPath"

if ($UseCuda) {
    if (-not (Test-CommandExists 'nvcc')) {
        Write-Err "CUDA toolkit not found"
        Write-Host "Install from: https://developer.nvidia.com/cuda-downloads" -ForegroundColor Cyan
        exit 1
    }
    Write-Success "CUDA toolkit found"
}

Write-Success "All dependencies found"

$Arch = try { [System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture } catch { $env:PROCESSOR_ARCHITECTURE }
Write-Info "Architecture: $Arch"

# ============================================================================
# Clone whisper.cpp
# ============================================================================

Write-Step "Setting up whisper.cpp..."

if (Test-Path $BuildDir) {
    Write-Info "Updating existing repository..."
    Push-Location $BuildDir
    try {
        # Supply chain attack prevention
        $expectedRemote = "https://github.com/ggml-org/whisper.cpp.git"
        $currentRemote = & git remote get-url origin 2>$null
        if ($currentRemote -ne $expectedRemote) {
            Write-Err "Unexpected git remote: $currentRemote"
            exit 2
        }
        & git -c http.sslVerify=true pull --quiet
    } finally { Pop-Location }
} else {
    Write-Info "Cloning whisper.cpp..."
    & git -c http.sslVerify=true clone --depth 1 https://github.com/ggml-org/whisper.cpp.git $BuildDir
}

# ============================================================================
# Build whisper.cpp
# ============================================================================

Write-Step "Building whisper.cpp with MSVC..."

Push-Location $BuildDir
try {
    if (Test-Path 'build') { Remove-Item -Recurse -Force 'build' }

    $cmakeArgs = @('-B', 'build', '-DCMAKE_BUILD_TYPE=Release')
    if ($UseCuda) {
        Write-Info "Enabling CUDA..."
        $cmakeArgs += '-DGGML_CUDA=ON'
    }

    Write-Info "Running cmake configure..."
    & cmake $cmakeArgs
    if ($LASTEXITCODE -ne 0) { Write-Err "CMake configure failed"; exit 2 }

    $cpuCount = (Get-CimInstance -ClassName Win32_Processor).NumberOfLogicalProcessors
    Write-Info "Building with $cpuCount parallel jobs..."
    & cmake --build build --config Release -j $cpuCount
    if ($LASTEXITCODE -ne 0) { Write-Err "Build failed"; exit 2 }

    $Script:WhisperBin = $null
    foreach ($path in @('build\bin\Release\whisper-cli.exe', 'build\bin\Release\main.exe', 'build\Release\whisper-cli.exe')) {
        if (Test-Path $path) { $Script:WhisperBin = $path; break }
    }

    if (-not $Script:WhisperBin) {
        Write-Err "Binary not found after build"
        if (Test-Path 'build\bin\Release') { Get-ChildItem 'build\bin\Release' | ForEach-Object { Write-Host "  $($_.Name)" } }
        exit 2
    }

    Write-Success "Build successful: $Script:WhisperBin"
} finally { Pop-Location }

# ============================================================================
# Download Model
# ============================================================================

Write-Step "Downloading model: $Model..."

Push-Location $BuildDir
try {
    $modelUrl = "$ModelBaseUrl/ggml-$Model.bin"
    $modelFile = "models\ggml-$Model.bin"

    # Path traversal prevention
    $canonicalModelPath = [System.IO.Path]::GetFullPath($modelFile)
    $canonicalModelsDir = [System.IO.Path]::GetFullPath((Join-Path $BuildDir "models"))
    if (-not $canonicalModelPath.StartsWith($canonicalModelsDir)) {
        Write-Err "Path traversal detected"
        exit 3
    }

    if (-not (Test-Path 'models')) { New-Item -ItemType Directory -Path 'models' | Out-Null }

    if (Test-Path $modelFile) {
        Write-Success "Model already downloaded"
    } else {
        Write-Info "Downloading from Hugging Face..."
        $savedProgress = $ProgressPreference
        try {
            $ProgressPreference = 'Continue'
            Invoke-WebRequest -Uri $modelUrl -OutFile $modelFile -UseBasicParsing
        } catch {
            Write-Err "Model download failed: $_"
            exit 3
        } finally {
            $ProgressPreference = $savedProgress
        }
    }

    $modelSize = (Get-Item $modelFile).Length / 1MB
    Write-Success "Model downloaded: $([math]::Round($modelSize, 1)) MB"
} finally { Pop-Location }

# ============================================================================
# Install to Tauri
# ============================================================================

Write-Step "Installing to Tauri..."

if (-not (Test-Path $BinariesDir)) { New-Item -ItemType Directory -Path $BinariesDir | Out-Null }
if (-not (Test-Path $ModelsDir)) { New-Item -ItemType Directory -Path $ModelsDir | Out-Null }

$sourceBinary = Join-Path $BuildDir $Script:WhisperBin
$destBinary = Join-Path $BinariesDir $BinaryName
Copy-Item -Path $sourceBinary -Destination $destBinary -Force
Write-Success "Binary: $destBinary"

$sourceModel = Join-Path $BuildDir "models\ggml-$Model.bin"
$destModel = Join-Path $ModelsDir "ggml-$Model.bin"
Copy-Item -Path $sourceModel -Destination $destModel -Force
Write-Success "Model: $destModel"

# ============================================================================
# Verification
# ============================================================================

Write-Step "Verifying installation..."

try {
    $output = & $destBinary --help 2>&1
    if ($LASTEXITCODE -eq 0 -or $output -match 'usage') { Write-Success "Binary: OK" }
    else { Write-Err "Binary verification failed"; exit 2 }
} catch { Write-Err "Binary verification failed: $_"; exit 2 }

if (Test-Path $destModel) { Write-Success "Model: OK" }
else { Write-Err "Model not found"; exit 3 }

# ============================================================================
# Summary
# ============================================================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Whisper Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Installed:"
Write-Host "  Binary: $destBinary"
Write-Host "  Model:  $destModel"
Write-Host ""
Write-Host "Models: tiny(75MB) base(142MB) small(466MB) medium(1.5GB)"
Write-Host ""
Write-Host "Additional models: .\scripts\setup-whisper.ps1 -Model <name>" -ForegroundColor Yellow
Write-Host ""
Write-Host "Next: pnpm run tauri dev" -ForegroundColor Blue
Write-Host ""

exit 0
