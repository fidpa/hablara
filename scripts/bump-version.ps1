#Requires -Version 5.1
<#
.SYNOPSIS
    Hablara Version Bump Script for Windows
.DESCRIPTION
    Synchronisiert Versionen in package.json, Cargo.toml und tauri.conf.json
    nach SemVer (Semantic Versioning).
.PARAMETER BumpType
    Type of version bump: patch, minor, major, prerelease
    Default: patch
.PARAMETER DryRun
    Show what would happen without making changes
.EXAMPLE
    .\bump-version.ps1
    .\bump-version.ps1 -BumpType minor
    .\bump-version.ps1 -BumpType patch -DryRun
.NOTES
    Author: Hablara Team
    Created: 2026-02-04
    Ported from: scripts/bump-version.sh

    Exit Codes:
      0 - Success
      1 - Invalid arguments or missing dependencies
      2 - Git working directory not clean
      3 - Tests failed
      4 - Version sync failed
      5 - User aborted
#>

[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [ValidateSet("patch", "minor", "major", "prerelease")]
    [string]$BumpType = "patch",

    [switch]$DryRun,
    [switch]$Help
)

# Strict Mode
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# -----------------------------------------------------------------------------
# Constants
# -----------------------------------------------------------------------------

$ScriptName = $MyInvocation.MyCommand.Name
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir

$SrcTauriDir = Join-Path $ProjectRoot "src-tauri"
$SrcLibDir = Join-Path (Join-Path $ProjectRoot "src") "lib"
$CargoToml = Join-Path $SrcTauriDir "Cargo.toml"
$TauriConf = Join-Path $SrcTauriDir "tauri.conf.json"
$PackageJson = Join-Path $ProjectRoot "package.json"
$PackageLockJson = Join-Path $ProjectRoot "package-lock.json"
$TypesTs = Join-Path $SrcLibDir "types.ts"
$ReadmeMd = Join-Path $ProjectRoot "README.md"
$ClaudeMd = Join-Path $ProjectRoot "CLAUDE.md"

# -----------------------------------------------------------------------------
# Helper Functions
# -----------------------------------------------------------------------------

function Write-Step {
    param([string]$Message)
    Write-Host "`n==> " -ForegroundColor Blue -NoNewline
    Write-Host $Message -ForegroundColor Green
}

function Write-Info {
    param([string]$Message)
    Write-Host "    $Message"
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
    Write-Host "!" -ForegroundColor Yellow -NoNewline
    Write-Host " $Message"
}

function Write-Err {
    param([string]$Message)
    Write-Host ([char]0x2717) -ForegroundColor Red -NoNewline
    Write-Host " Error: $Message" -ForegroundColor Red
}

function Test-Command {
    param([string]$Command)
    return $null -ne (Get-Command $Command -ErrorAction SilentlyContinue)
}

function Get-VersionFromJson {
    param([string]$FilePath)
    $Content = Get-Content $FilePath -Raw | ConvertFrom-Json
    return $Content.version
}

function Get-VersionFromToml {
    param([string]$FilePath)
    $Content = Get-Content $FilePath
    foreach ($Line in $Content) {
        if ($Line -match '^version\s*=\s*"([^"]+)"') {
            return $Matches[1]
        }
    }
    return $null
}

function Set-VersionInJson {
    param(
        [string]$FilePath,
        [string]$Version
    )
    # Use regex-based replacement to preserve JSON formatting (avoid ConvertTo-Json reformatting)
    $Content = Get-Content $FilePath -Raw
    $Content = $Content -replace '"version"\s*:\s*"[^"]+"', "`"version`": `"$Version`""
    $Content | Set-Content $FilePath -Encoding UTF8 -NoNewline
}

function Set-VersionInToml {
    param(
        [string]$FilePath,
        [string]$Version
    )
    $Content = Get-Content $FilePath -Raw
    # (?m) enables multiline mode so ^ matches start of each line, not just start of string
    $Content = $Content -replace '(?m)^version\s*=\s*"[^"]+"', "version = `"$Version`""
    $Content | Set-Content $FilePath -Encoding UTF8 -NoNewline
}

function Set-VersionInTypesTs {
    param(
        [string]$FilePath,
        [string]$Version
    )
    $Content = Get-Content $FilePath -Raw
    $Content = $Content -replace 'APP_VERSION\s*=\s*"[^"]+"', "APP_VERSION = `"$Version`""
    $Content | Set-Content $FilePath -Encoding UTF8 -NoNewline
}

function Set-VersionInReadmeBadge {
    param(
        [string]$FilePath,
        [string]$Version
    )
    $Content = Get-Content $FilePath -Raw
    $Content = $Content -replace 'version-[\d.]+(-[a-z.0-9]+)?-blue', "version-$Version-blue"
    $Content | Set-Content $FilePath -Encoding UTF8 -NoNewline
}

function Set-VersionInClaudeMd {
    param(
        [string]$FilePath,
        [string]$Version
    )
    $Content = Get-Content $FilePath -Raw
    $Content = $Content -replace '\*\*Version:\*\*\s*[\d.]+', "**Version:** $Version"
    $Content = $Content -replace 'Hablara v[\d.]+', "Hablara v$Version"
    $Content | Set-Content $FilePath -Encoding UTF8 -NoNewline
}

function Get-NextVersion {
    param(
        [string]$CurrentVersion,
        [string]$BumpType
    )

    # Parse version: MAJOR.MINOR.PATCH[-PRERELEASE]
    if ($CurrentVersion -match '^(\d+)\.(\d+)\.(\d+)(-(.+))?$') {
        $Major = [int]$Matches[1]
        $Minor = [int]$Matches[2]
        $Patch = [int]$Matches[3]
        $Prerelease = $Matches[5]
    } else {
        throw "Invalid version format: $CurrentVersion"
    }

    switch ($BumpType) {
        "patch" {
            return "$Major.$Minor.$($Patch + 1)"
        }
        "minor" {
            return "$Major.$($Minor + 1).0"
        }
        "major" {
            return "$($Major + 1).0.0"
        }
        "prerelease" {
            if ($Prerelease) {
                # Increment prerelease number
                if ($Prerelease -match '^(.+)\.(\d+)$') {
                    $PreTag = $Matches[1]
                    $PreNum = [int]$Matches[2]
                    return "$Major.$Minor.$Patch-$PreTag.$($PreNum + 1)"
                } else {
                    return "$Major.$Minor.$Patch-$Prerelease.1"
                }
            } else {
                return "$Major.$Minor.$($Patch + 1)-alpha.0"
            }
        }
    }
}

# -----------------------------------------------------------------------------
# Show Help
# -----------------------------------------------------------------------------

if ($Help) {
    Get-Help $MyInvocation.MyCommand.Path -Detailed
    exit 0
}

# -----------------------------------------------------------------------------
# Pre-flight Checks
# -----------------------------------------------------------------------------

Write-Step "Pre-flight checks"

# Check working directory
if (-not (Test-Path $PackageJson) -or -not (Test-Path $CargoToml)) {
    Write-Err "Must be run from Hablara project root"
    Write-Info "Expected: package.json and src-tauri/Cargo.toml"
    exit 1
}
Write-Success "Working directory: $ProjectRoot"

# Check dependencies
$DepsOk = $true
foreach ($Dep in @("node", "pnpm", "cargo", "git")) {
    if (Test-Command $Dep) {
        Write-Success "$Dep found"
    } else {
        Write-Err "$Dep is required but not installed"
        $DepsOk = $false
    }
}

if (-not $DepsOk) {
    exit 1
}

# Check git status (initialize variables before try block for proper scope)
$UncommittedChanges = $null
$CurrentBranch = $null

Push-Location $ProjectRoot
try {
    $UncommittedChanges = git status --porcelain
    if ($UncommittedChanges) {
        Write-Warn "Uncommitted changes detected - will be included in version bump commit"
        Write-Info "Changed files:"
        $UncommittedChanges | Select-Object -First 10 | ForEach-Object {
            Write-Info "  $_"
        }
        $ChangeCount = ($UncommittedChanges | Measure-Object).Count
        if ($ChangeCount -gt 10) {
            Write-Info "  ... and $($ChangeCount - 10) more files"
        }
    } else {
        Write-Success "Git working directory clean"
    }

    # Check branch
    $CurrentBranch = git branch --show-current
    if ($CurrentBranch -notin @("main", "master")) {
        Write-Warn "Not on main branch (current: $CurrentBranch)"
        if (-not $DryRun) {
            $Response = Read-Host "    Continue anyway? (y/N)"
            if ($Response -notmatch '^[Yy]$') {
                Write-Info "Aborted by user"
                exit 5
            }
        }
    } else {
        Write-Success "On branch: $CurrentBranch"
    }
} finally {
    Pop-Location
}

# -----------------------------------------------------------------------------
# Version Analysis
# -----------------------------------------------------------------------------

Write-Step "Analyzing current versions"

$CurrentNpm = Get-VersionFromJson $PackageJson
$CurrentCargo = Get-VersionFromToml $CargoToml
$CurrentTauri = Get-VersionFromJson $TauriConf

Write-Info "package.json:      $CurrentNpm"
Write-Info "Cargo.toml:        $CurrentCargo"
Write-Info "tauri.conf.json:   $CurrentTauri"

# Check version sync
if ($CurrentNpm -ne $CurrentCargo -or $CurrentCargo -ne $CurrentTauri) {
    Write-Err "Versions are not synchronized!"
    Write-Info "Synchronize manually before bumping."
    exit 4
}
Write-Success "All versions synchronized: $CurrentNpm"

# -----------------------------------------------------------------------------
# Calculate New Version
# -----------------------------------------------------------------------------

Write-Step "Calculating new version ($BumpType)"

$NewVersion = Get-NextVersion -CurrentVersion $CurrentNpm -BumpType $BumpType

Write-Info "Current: $CurrentNpm"
Write-Info "New:     $NewVersion"
Write-Success "Bump type: $BumpType"

# -----------------------------------------------------------------------------
# Dry Run Check
# -----------------------------------------------------------------------------

if ($DryRun) {
    Write-Host ""
    Write-Host ("-" * 50) -ForegroundColor Blue
    Write-Host "DRY RUN - No changes made" -ForegroundColor Yellow
    Write-Host ("-" * 50) -ForegroundColor Blue
    Write-Host ""
    Write-Host "Would bump: $CurrentNpm -> $NewVersion"
    Write-Host ""
    Write-Host "Version files that would be modified:"
    Write-Host "  - package.json"
    Write-Host "  - package-lock.json (if exists)"
    Write-Host "  - src-tauri/Cargo.toml"
    Write-Host "  - src-tauri/Cargo.lock"
    Write-Host "  - src-tauri/tauri.conf.json"
    Write-Host "  - src/lib/types.ts (APP_VERSION)"
    Write-Host "  - README.md (badge)"
    Write-Host "  - CLAUDE.md (version references)"
    if ($UncommittedChanges) {
        Write-Host ""
        Write-Host "Uncommitted changes that would be included:" -ForegroundColor Yellow
        $UncommittedChanges | ForEach-Object { Write-Host "  $_" }
    }
    Write-Host ""
    Write-Host "Git operations that would be performed:"
    Write-Host "  - git add -A"
    if ($UncommittedChanges) {
        Write-Host "  - git commit -m `"chore: release v$NewVersion`""
    } else {
        Write-Host "  - git commit -m `"chore: bump version to v$NewVersion`""
    }
    Write-Host "  - git tag `"v$NewVersion`""
    Write-Host ""
    Write-Host "Run without -DryRun to apply changes."
    exit 0
}

# -----------------------------------------------------------------------------
# Run Tests
# -----------------------------------------------------------------------------

Write-Step "Running tests"

Write-Info "Frontend tests..."
Push-Location $ProjectRoot
try {
    # Use pnpm (Hablará project standard)
    $TestResult = pnpm test -- --run 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Frontend tests passed"
    } else {
        Write-Err "Frontend tests failed"
        Write-Info "Fix tests before version bump"
        exit 3
    }
} catch {
    Write-Err "Frontend tests failed: $_"
    exit 3
} finally {
    Pop-Location
}

Write-Info "Rust tests..."
try {
    cargo test --manifest-path $CargoToml --quiet 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Rust tests passed"
    } else {
        Write-Err "Rust tests failed"
        Write-Info "Fix tests before version bump"
        exit 3
    }
} catch {
    Write-Err "Rust tests failed: $_"
    exit 3
}

# -----------------------------------------------------------------------------
# Apply Version Bump
# -----------------------------------------------------------------------------

Write-Step "Applying version bump"

# 1. Update package.json
Write-Info "Updating package.json..."
Set-VersionInJson -FilePath $PackageJson -Version $NewVersion
Write-Success "package.json: $NewVersion"

# 1b. Update package-lock.json (if exists)
if (Test-Path $PackageLockJson) {
    Write-Info "Updating package-lock.json..."
    Set-VersionInJson -FilePath $PackageLockJson -Version $NewVersion
    Write-Success "package-lock.json: $NewVersion"
}

# 2. Update Cargo.toml
Write-Info "Updating Cargo.toml..."
Set-VersionInToml -FilePath $CargoToml -Version $NewVersion
Write-Success "Cargo.toml: $NewVersion"

# 3. Update tauri.conf.json
Write-Info "Updating tauri.conf.json..."
Set-VersionInJson -FilePath $TauriConf -Version $NewVersion
Write-Success "tauri.conf.json: $NewVersion"

# 4. Update types.ts
Write-Info "Updating types.ts..."
if (Test-Path $TypesTs) {
    $TypesContent = Get-Content $TypesTs -Raw
    if ($TypesContent -match 'APP_VERSION\s*=') {
        Set-VersionInTypesTs -FilePath $TypesTs -Version $NewVersion
        Write-Success "types.ts: APP_VERSION = `"$NewVersion`""
    } else {
        Write-Warn "types.ts: no APP_VERSION constant found (skipped)"
    }
} else {
    Write-Warn "types.ts not found (skipped)"
}

# 5. Update README.md badge
Write-Info "Updating README.md badge..."
if (Test-Path $ReadmeMd) {
    $ReadmeContent = Get-Content $ReadmeMd -Raw
    if ($ReadmeContent -match 'version-[\d.]+-blue') {
        Set-VersionInReadmeBadge -FilePath $ReadmeMd -Version $NewVersion
        Write-Success "README.md: badge updated"
    } else {
        Write-Warn "README.md: no version badge found (skipped)"
    }
} else {
    Write-Warn "README.md not found (skipped)"
}

# 6. Update CLAUDE.md
Write-Info "Updating CLAUDE.md..."
if (Test-Path $ClaudeMd) {
    $ClaudeContent = Get-Content $ClaudeMd -Raw
    if ($ClaudeContent -match 'Version:') {
        Set-VersionInClaudeMd -FilePath $ClaudeMd -Version $NewVersion
        Write-Success "CLAUDE.md: version references updated"
    } else {
        Write-Warn "CLAUDE.md: no version references found (skipped)"
    }
} else {
    Write-Warn "CLAUDE.md not found (skipped)"
}

# 7. Update Cargo.lock
Write-Info "Updating Cargo.lock..."
try {
    cargo generate-lockfile --manifest-path $CargoToml 2>&1 | Out-Null
    Write-Success "Cargo.lock updated"
} catch {
    Write-Warn "Could not update Cargo.lock (non-critical)"
}

# -----------------------------------------------------------------------------
# Verify Sync
# -----------------------------------------------------------------------------

Write-Step "Verifying version sync"

$FinalNpm = Get-VersionFromJson $PackageJson
$FinalCargo = Get-VersionFromToml $CargoToml
$FinalTauri = Get-VersionFromJson $TauriConf

Write-Info "package.json:      $FinalNpm"
Write-Info "Cargo.toml:        $FinalCargo"
Write-Info "tauri.conf.json:   $FinalTauri"

if ($FinalNpm -ne $NewVersion -or $FinalCargo -ne $NewVersion -or $FinalTauri -ne $NewVersion) {
    Write-Err "Version sync verification failed!"
    Write-Info "Expected all to be: $NewVersion"
    Write-Info "Reverting version file changes..."
    Push-Location $ProjectRoot
    # Only revert version files, not all local changes
    $versionFiles = @($PackageJson, $CargoToml, $TauriConf, $TypesTs, $ReadmeMd, $ClaudeMd) | Where-Object { Test-Path $_ }
    if ($versionFiles.Count -gt 0) {
        git checkout -- $versionFiles
    }
    Pop-Location
    exit 4
}
Write-Success "All versions synchronized"

# -----------------------------------------------------------------------------
# Git Commit & Tag
# -----------------------------------------------------------------------------

Write-Step "Creating git commit and tag"

Push-Location $ProjectRoot
try {
    # Stage all changes
    Write-Info "Staging all changes..."
    git add -A

    # Commit
    Write-Info "Creating commit..."
    if ($UncommittedChanges) {
        git commit -m "chore: release v$NewVersion"
        Write-Success "Commit created (includes all changes)"
    } else {
        git commit -m "chore: bump version to v$NewVersion"
        Write-Success "Commit created"
    }

    # Tag
    Write-Info "Creating tag..."
    git tag "v$NewVersion"
    Write-Success "Tag created: v$NewVersion"

} finally {
    Pop-Location
}

# -----------------------------------------------------------------------------
# Summary
# -----------------------------------------------------------------------------

Write-Host ""
Write-Host ("-" * 50) -ForegroundColor Green
Write-Host "  Version Bump Complete!" -ForegroundColor Green
Write-Host ("-" * 50) -ForegroundColor Green
Write-Host ""
Write-Host "  Version:  " -NoNewline
Write-Host $CurrentNpm -ForegroundColor Blue -NoNewline
Write-Host " -> " -NoNewline
Write-Host $NewVersion -ForegroundColor Green
Write-Host "  Type:     $BumpType"
Write-Host "  Tag:      v$NewVersion"
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Review changes:     git show"
Write-Host "  2. Push to remote:     git push origin $CurrentBranch --tags"
Write-Host "  3. Create release:     gh release create v$NewVersion"
Write-Host ""
Write-Host "Rollback (if needed):" -ForegroundColor Blue
Write-Host "  git reset --hard HEAD~1; git tag -d v$NewVersion"
Write-Host ""
