#Requires -Version 5.1
<#
.SYNOPSIS
    Hablara Version Bump Script for Windows
.DESCRIPTION
    Synchronizes versions in package.json, Cargo.toml, and tauri.conf.json.
.PARAMETER BumpType
    patch (default), minor, major, prerelease
.PARAMETER DryRun
    Show what would happen without making changes
.EXAMPLE
    .\bump-version.ps1 -BumpType minor -DryRun
.NOTES
    Exit codes: 0=Success, 1=Args, 2=Git, 3=Tests, 4=Sync, 5=Aborted
#>

[CmdletBinding()]
param(
    [ValidateSet("patch", "minor", "major", "prerelease")]
    [string]$BumpType = "patch",
    [switch]$DryRun,
    [switch]$Help
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# ============================================================================
# Configuration
# ============================================================================

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir

$CargoToml = Join-Path (Join-Path $ProjectRoot "src-tauri") "Cargo.toml"
$TauriConf = Join-Path (Join-Path $ProjectRoot "src-tauri") "tauri.conf.json"
$PackageJson = Join-Path $ProjectRoot "package.json"
$PackageLockJson = Join-Path $ProjectRoot "package-lock.json"
$TypesTs = Join-Path (Join-Path (Join-Path $ProjectRoot "src") "lib") "types.ts"
$ReadmeMd = Join-Path $ProjectRoot "README.md"
$ClaudeMd = Join-Path $ProjectRoot "CLAUDE.md"

# ============================================================================
# Helper Functions
# ============================================================================

function Write-Step { param([string]$Message); Write-Host "`n==> " -ForegroundColor Blue -NoNewline; Write-Host $Message -ForegroundColor Green }
function Write-Info { param([string]$Message); Write-Host "    $Message" }
function Write-Success { param([string]$Message); Write-Host "    $([char]0x2713) " -ForegroundColor Green -NoNewline; Write-Host $Message }
function Write-Warn { param([string]$Message); Write-Host "    ! " -ForegroundColor Yellow -NoNewline; Write-Host $Message }
function Write-Err { param([string]$Message); Write-Host "$([char]0x2717) Error: $Message" -ForegroundColor Red }

function Test-Command { param([string]$Command); $null -ne (Get-Command $Command -ErrorAction SilentlyContinue) }

function Get-VersionFromJson {
    param([string]$FilePath)
    (Get-Content $FilePath -Raw | ConvertFrom-Json).version
}

function Get-VersionFromToml {
    param([string]$FilePath)
    foreach ($Line in Get-Content $FilePath) {
        if ($Line -match '^version\s*=\s*"([^"]+)"') { return $Matches[1] }
    }
    return $null
}

function Set-VersionInJson {
    param([string]$FilePath, [string]$Version)
    # Regex replacement preserves JSON formatting
    $Content = Get-Content $FilePath -Raw
    $Content = $Content -replace '"version"\s*:\s*"[^"]+"', "`"version`": `"$Version`""
    $Content | Set-Content $FilePath -Encoding UTF8 -NoNewline
}

function Set-VersionInToml {
    param([string]$FilePath, [string]$Version)
    $Content = Get-Content $FilePath -Raw
    # (?m) enables multiline mode so ^ matches line start
    $Content = $Content -replace '(?m)^version\s*=\s*"[^"]+"', "version = `"$Version`""
    $Content | Set-Content $FilePath -Encoding UTF8 -NoNewline
}

function Set-VersionInTypesTs {
    param([string]$FilePath, [string]$Version)
    $Content = Get-Content $FilePath -Raw
    $Content = $Content -replace 'APP_VERSION\s*=\s*"[^"]+"', "APP_VERSION = `"$Version`""
    $Content | Set-Content $FilePath -Encoding UTF8 -NoNewline
}

function Set-VersionInReadmeBadge {
    param([string]$FilePath, [string]$Version)
    $Content = Get-Content $FilePath -Raw
    $Content = $Content -replace 'version-[\d.]+(-[a-z.0-9]+)?-blue', "version-$Version-blue"
    $Content | Set-Content $FilePath -Encoding UTF8 -NoNewline
}

function Set-VersionInClaudeMd {
    param([string]$FilePath, [string]$Version)
    $Content = Get-Content $FilePath -Raw
    $Content = $Content -replace '\*\*Version:\*\*\s*[\d.]+', "**Version:** $Version"
    $Content = $Content -replace 'Hablara v[\d.]+', "Hablara v$Version"
    $Content | Set-Content $FilePath -Encoding UTF8 -NoNewline
}

function Get-NextVersion {
    param([string]$CurrentVersion, [string]$BumpType)

    if ($CurrentVersion -match '^(\d+)\.(\d+)\.(\d+)(-(.+))?$') {
        $Major = [int]$Matches[1]; $Minor = [int]$Matches[2]; $Patch = [int]$Matches[3]
        $Prerelease = $Matches[5]
    } else { throw "Invalid version: $CurrentVersion" }

    switch ($BumpType) {
        "patch" { return "$Major.$Minor.$($Patch + 1)" }
        "minor" { return "$Major.$($Minor + 1).0" }
        "major" { return "$($Major + 1).0.0" }
        "prerelease" {
            if ($Prerelease -and $Prerelease -match '^(.+)\.(\d+)$') {
                return "$Major.$Minor.$Patch-$($Matches[1]).$([int]$Matches[2] + 1)"
            }
            return "$Major.$Minor.$($Patch + 1)-alpha.0"
        }
    }
}

# ============================================================================
# Main
# ============================================================================

if ($Help) { Get-Help $MyInvocation.MyCommand.Path -Detailed; exit 0 }

Write-Step "Pre-flight checks"

if (-not (Test-Path $PackageJson) -or -not (Test-Path $CargoToml)) {
    Write-Err "Must be run from Hablara project root"; exit 1
}
Write-Success "Working directory: $ProjectRoot"

$DepsOk = $true
foreach ($Dep in @("node", "pnpm", "cargo", "git")) {
    if (Test-Command $Dep) { Write-Success "$Dep found" }
    else { Write-Err "$Dep required"; $DepsOk = $false }
}
if (-not $DepsOk) { exit 1 }

$UncommittedChanges = $null; $CurrentBranch = $null
Push-Location $ProjectRoot
try {
    $UncommittedChanges = git status --porcelain
    if ($UncommittedChanges) {
        Write-Warn "Uncommitted changes - will be included in commit"
        $UncommittedChanges | Select-Object -First 10 | ForEach-Object { Write-Info "  $_" }
    } else { Write-Success "Git working directory clean" }

    $CurrentBranch = git branch --show-current
    if ($CurrentBranch -notin @("main", "master")) {
        Write-Warn "Not on main branch (current: $CurrentBranch)"
        if (-not $DryRun) {
            $Response = Read-Host "    Continue? (y/N)"
            if ($Response -notmatch '^[Yy]$') { Write-Info "Aborted"; exit 5 }
        }
    } else { Write-Success "On branch: $CurrentBranch" }
} finally { Pop-Location }

Write-Step "Analyzing current versions"

$CurrentNpm = Get-VersionFromJson $PackageJson
$CurrentCargo = Get-VersionFromToml $CargoToml
$CurrentTauri = Get-VersionFromJson $TauriConf

Write-Info "package.json:      $CurrentNpm"
Write-Info "Cargo.toml:        $CurrentCargo"
Write-Info "tauri.conf.json:   $CurrentTauri"

if ($CurrentNpm -ne $CurrentCargo -or $CurrentCargo -ne $CurrentTauri) {
    Write-Err "Versions not synchronized!"; exit 4
}
Write-Success "All versions synchronized: $CurrentNpm"

Write-Step "Calculating new version ($BumpType)"

$NewVersion = Get-NextVersion -CurrentVersion $CurrentNpm -BumpType $BumpType
Write-Info "Current: $CurrentNpm"
Write-Info "New:     $NewVersion"

if ($DryRun) {
    Write-Host "`nDRY RUN - No changes made" -ForegroundColor Yellow
    Write-Host "`nWould bump: $CurrentNpm -> $NewVersion"
    Write-Host "`nFiles: package.json, Cargo.toml, tauri.conf.json, types.ts, README.md, CLAUDE.md"
    Write-Host "`nRun without -DryRun to apply."
    exit 0
}

Write-Step "Running tests"

Write-Info "Frontend tests..."
Push-Location $ProjectRoot
try {
    pnpm test -- --run 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) { Write-Success "Frontend tests passed" }
    else { Write-Err "Frontend tests failed"; exit 3 }
} finally { Pop-Location }

Write-Info "Rust tests..."
cargo test --manifest-path $CargoToml --quiet 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) { Write-Success "Rust tests passed" }
else { Write-Err "Rust tests failed"; exit 3 }

Write-Step "Applying version bump"

Set-VersionInJson -FilePath $PackageJson -Version $NewVersion
Write-Success "package.json: $NewVersion"

if (Test-Path $PackageLockJson) {
    Set-VersionInJson -FilePath $PackageLockJson -Version $NewVersion
    Write-Success "package-lock.json: $NewVersion"
}

Set-VersionInToml -FilePath $CargoToml -Version $NewVersion
Write-Success "Cargo.toml: $NewVersion"

Set-VersionInJson -FilePath $TauriConf -Version $NewVersion
Write-Success "tauri.conf.json: $NewVersion"

if ((Test-Path $TypesTs) -and ((Get-Content $TypesTs -Raw) -match 'APP_VERSION')) {
    Set-VersionInTypesTs -FilePath $TypesTs -Version $NewVersion
    Write-Success "types.ts: $NewVersion"
}

if ((Test-Path $ReadmeMd) -and ((Get-Content $ReadmeMd -Raw) -match 'version-[\d.]+-blue')) {
    Set-VersionInReadmeBadge -FilePath $ReadmeMd -Version $NewVersion
    Write-Success "README.md: badge updated"
}

if ((Test-Path $ClaudeMd) -and ((Get-Content $ClaudeMd -Raw) -match 'Version:')) {
    Set-VersionInClaudeMd -FilePath $ClaudeMd -Version $NewVersion
    Write-Success "CLAUDE.md: updated"
}

try { cargo generate-lockfile --manifest-path $CargoToml 2>&1 | Out-Null; Write-Success "Cargo.lock updated" }
catch { Write-Warn "Cargo.lock update skipped" }

Write-Step "Verifying version sync"

$FinalNpm = Get-VersionFromJson $PackageJson
$FinalCargo = Get-VersionFromToml $CargoToml
$FinalTauri = Get-VersionFromJson $TauriConf

if ($FinalNpm -ne $NewVersion -or $FinalCargo -ne $NewVersion -or $FinalTauri -ne $NewVersion) {
    Write-Err "Version sync verification failed!"
    Push-Location $ProjectRoot; git checkout -- .; Pop-Location
    exit 4
}
Write-Success "All versions synchronized"

Write-Step "Creating git commit and tag"

Push-Location $ProjectRoot
try {
    git add -A
    if ($UncommittedChanges) {
        git commit -m "chore: release v$NewVersion"
        Write-Success "Commit created (includes all changes)"
    } else {
        git commit -m "chore: bump version to v$NewVersion"
        Write-Success "Commit created"
    }
    git tag "v$NewVersion"
    Write-Success "Tag created: v$NewVersion"
} finally { Pop-Location }

Write-Host "`nVersion Bump Complete!" -ForegroundColor Green
Write-Host "`n  Version: $CurrentNpm -> $NewVersion"
Write-Host "  Tag:     v$NewVersion"
Write-Host "`nNext: git push origin $CurrentBranch --tags" -ForegroundColor Yellow
Write-Host "Rollback: git reset --hard HEAD~1; git tag -d v$NewVersion" -ForegroundColor Blue
Write-Host ""
