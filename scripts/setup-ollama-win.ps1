#Requires -Version 5.1
<#
.SYNOPSIS
    Hablara - Ollama Setup Script (Windows)

.DESCRIPTION
    Installs Ollama and configures an optimized model for Hablara.

.EXAMPLE
    .\setup-ollama-win.ps1
    .\setup-ollama-win.ps1 -Model 3b
    .\setup-ollama-win.ps1 -Update
    .\setup-ollama-win.ps1 -Status
    .\setup-ollama-win.ps1 -Cleanup

.NOTES
    Exit Codes: 0=Success, 1=Error, 2=Disk space, 3=Network, 4=Platform
#>

[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [ValidateSet('3b', '7b', '14b', '32b')]
    [string]$Model,

    [switch]$Update,

    [switch]$Status,

    [switch]$Cleanup,

    [switch]$Help
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

trap {
    Write-Host "$([char]0x2717) Fehler: Setup fehlgeschlagen: $_" -ForegroundColor Red
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
$script:RequiredDiskSpaceGB = 0

$ModelConfigs = @{
    '3b'  = @{ Name = 'qwen2.5:3b';  Size = '~2GB';   DiskGB = 5;  RAMWarn = $false; MinRAM = 0 }
    '7b'  = @{ Name = 'qwen2.5:7b';  Size = '~4.7GB'; DiskGB = 10; RAMWarn = $false; MinRAM = 0 }
    '14b' = @{ Name = 'qwen2.5:14b'; Size = '~9GB';   DiskGB = 15; RAMWarn = $false; MinRAM = 0 }
    '32b' = @{ Name = 'qwen2.5:32b'; Size = '~20GB';  DiskGB = 25; RAMWarn = $true;  MinRAM = 48 }
}
$DefaultModel = '7b'

# ============================================================================
# Helper Functions
# ============================================================================

function Write-Step { param([string]$Message); Write-Host "`n==> " -ForegroundColor Blue -NoNewline; Write-Host $Message -ForegroundColor Green }
function Write-Info { param([string]$Message); Write-Host "    $([char]0x2022) " -ForegroundColor Yellow -NoNewline; Write-Host $Message }
function Write-Success { param([string]$Message); Write-Host "    $([char]0x2713) " -ForegroundColor Green -NoNewline; Write-Host $Message }
function Write-Warn { param([string]$Message); Write-Host "    $([char]0x26A0) " -ForegroundColor Yellow -NoNewline; Write-Host $Message }
function Write-Err { param([string]$Message); Write-Host "$([char]0x2717) Fehler: $Message" -ForegroundColor Red }

# Status-Check helpers (2-space indent, matching Bash status output format)
function Write-StatusOk { param([string]$Message); Write-Host "  $([char]0x2713) " -ForegroundColor Green -NoNewline; Write-Host $Message }
function Write-StatusFail { param([string]$Message); Write-Host "  $([char]0x2717) " -ForegroundColor Red -NoNewline; Write-Host $Message }
function Write-StatusNote { param([string]$Message); Write-Host "  $([char]0x2022) " -ForegroundColor Yellow -NoNewline; Write-Host $Message }

function Test-CommandExists { param([string]$Command); $null -ne (Get-Command $Command -ErrorAction SilentlyContinue) }

function Test-OllamaModelExists {
    param([string]$Model)
    if (-not (Test-CommandExists 'ollama')) { return $false }
    $lines = & ollama list 2>$null
    foreach ($line in $lines) {
        $name = ($line -split '\s+')[0]
        if ($name -eq $Model) { return $true }
    }
    return $false
}

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
    try {
        $ollamaPath = Join-Path $env:USERPROFILE '.ollama'
        if (-not (Test-Path $ollamaPath)) { $ollamaPath = $env:USERPROFILE }
        $drive = (Get-Item $ollamaPath).PSDrive.Name
        $disk = Get-PSDrive -Name $drive
        [math]::Floor($disk.Free / 1GB)
    } catch { return 0 }
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

# Returns version string (e.g. "0.6.2") or "unbekannt"
function Get-OllamaVersionString {
    try {
        $versionOutput = & ollama --version 2>&1 | Select-Object -First 1
        if ($versionOutput -match '(\d+\.\d+\.?\d*)') { return $Matches[1] }
    } catch {}
    return 'unbekannt'
}

function Test-OllamaVersion {
    $currentVersion = Get-OllamaVersionString
    if ($currentVersion -ne 'unbekannt') {
        if ((Compare-SemanticVersion $currentVersion $MinOllamaVersion) -lt 0) {
            Write-Warn "Ollama Version $currentVersion ist älter als empfohlen ($MinOllamaVersion)"
            Write-Info "Update: winget upgrade Ollama.Ollama"
            return $false
        }
    }
    return $true
}

# Silent inference check: returns $true if model responds, $false otherwise (no log output)
function Test-ModelResponds {
    param([string]$Model)
    try {
        $body = @{ model = $Model; prompt = "Sage OK"; stream = $false; options = @{ num_predict = 5 } } | ConvertTo-Json
        $response = Invoke-RestMethod -Uri "$OllamaApiUrl/api/generate" -Method Post -Body $body -ContentType 'application/json' -TimeoutSec 60
        if ($response.response) { return $true }
    } catch {}
    return $false
}

function Test-ModelInference {
    param([string]$Model)
    Write-Info "Teste Modell..."

    if (Test-ModelResponds -Model $Model) { Write-Success "Modell-Test erfolgreich"; return $true }
    Write-Warn "Modell-Test fehlgeschlagen"
    return $false
}

function Wait-OllamaServer {
    param([int]$TimeoutSeconds = 30)
    Write-Info "Warte auf Ollama Server..."

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        try {
            $null = Invoke-RestMethod -Uri "$OllamaApiUrl/api/version" -TimeoutSec 2 -ErrorAction Stop
            Write-Success "Ollama Server ist bereit"
            return $true
        } catch { Start-Sleep -Seconds 1 }
    }
    Write-Err "Ollama Server antwortet nicht nach ${TimeoutSeconds}s"
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
# Status Check
# ============================================================================

function Invoke-StatusCheck {
    $errors = 0

    Write-Host ""
    Write-Host "=== Hablará Ollama Status ==="
    Write-Host ""

    # 1. Ollama installed?
    if (Test-CommandExists 'ollama') {
        $currentVersion = Get-OllamaVersionString
        Write-StatusOk "Ollama installiert (v$currentVersion)"
        if ($currentVersion -ne 'unbekannt' -and (Compare-SemanticVersion $currentVersion $MinOllamaVersion) -lt 0) {
            Write-Host "    " -NoNewline; Write-Host "$([char]0x21B3) Update empfohlen (mindestens v${MinOllamaVersion}): winget upgrade Ollama.Ollama" -ForegroundColor Yellow
        }
    } else {
        Write-StatusFail "Ollama nicht gefunden"
        $errors++
    }

    # 2. Server reachable?
    $serverReachable = $false
    try {
        $null = Invoke-RestMethod -Uri "$OllamaApiUrl/api/version" -TimeoutSec 5 -ErrorAction Stop
        $serverReachable = $true
        Write-StatusOk "Server läuft"
    } catch {
        Write-StatusFail "Server nicht erreichbar"
        $errors++
    }

    # 3. GPU detected?
    $gpu = Test-GpuAvailable
    if ($gpu.Available) {
        $gpuLabel = switch ($gpu.Type) {
            'NVIDIA'   { 'NVIDIA (CUDA-Beschleunigung)' }
            'AMD ROCm' { 'AMD (ROCm-Beschleunigung, experimentell)' }
            default     { $gpu.Type }
        }
        Write-StatusOk "GPU: $gpuLabel"
    } else {
        Write-StatusNote "Keine GPU — Verarbeitung ohne GPU-Beschleunigung"
    }

    # 4. Base models present? (scan all variants, largest first)
    $baseModelsFound = @()
    foreach ($variant in @('32b', '14b', '7b', '3b')) {
        $modelName = $ModelConfigs[$variant].Name
        if (Test-OllamaModelExists $modelName) { $baseModelsFound += $modelName }
    }

    if ($baseModelsFound.Count -eq 1) {
        Write-StatusOk "Basis-Modell: $($baseModelsFound[0])"
    } elseif ($baseModelsFound.Count -gt 1) {
        Write-StatusOk "Basis-Modelle:"
        foreach ($m in $baseModelsFound) {
            Write-Host "    " -NoNewline; Write-Host "$([char]0x2713) $m" -ForegroundColor Green
        }
    } else {
        Write-StatusFail "Kein Basis-Modell gefunden"
        $errors++
    }

    # 5. Custom models present? (scan all variants, largest first)
    $customModelsFound = @()
    foreach ($variant in @('32b', '14b', '7b', '3b')) {
        $modelName = "$($ModelConfigs[$variant].Name)-custom"
        if (Test-OllamaModelExists $modelName) { $customModelsFound += $modelName }
    }

    if ($customModelsFound.Count -eq 1) {
        Write-StatusOk "Hablará-Modell: $($customModelsFound[0])"
        if ($baseModelsFound.Count -eq 0) {
            Write-Host "    " -NoNewline; Write-Host "$([char]0x21B3) Basis-Modell fehlt — Hablará-Modell benötigt es als Grundlage" -ForegroundColor Yellow
        }
    } elseif ($customModelsFound.Count -gt 1) {
        Write-StatusOk "Hablará-Modelle:"
        foreach ($m in $customModelsFound) {
            Write-Host "    " -NoNewline; Write-Host "$([char]0x2713) $m" -ForegroundColor Green
        }
        if ($baseModelsFound.Count -eq 0) {
            Write-Host "    " -NoNewline; Write-Host "$([char]0x21B3) Basis-Modell fehlt — Hablará-Modell benötigt es als Grundlage" -ForegroundColor Yellow
        }
    } else {
        Write-StatusFail "Kein Hablará-Modell gefunden"
        $errors++
    }

    # 6. Model inference works? (use smallest model for fastest check)
    $testModel = if ($customModelsFound.Count -gt 0) { $customModelsFound[-1] } elseif ($baseModelsFound.Count -gt 0) { $baseModelsFound[-1] } else { $null }
    if (-not $serverReachable) {
        Write-StatusNote "Modell-Test übersprungen (Server nicht erreichbar)"
    } elseif ($testModel) {
        if (Test-ModelResponds -Model $testModel) {
            Write-StatusOk "Modell antwortet"
        } else {
            Write-StatusFail "Modell antwortet nicht"
            $errors++
        }
    } else {
        Write-StatusFail "Modell antwortet nicht"
        $errors++
    }

    # 7. Storage usage (only Hablará-relevant qwen2.5 models, parsed from ollama list)
    $allModels = @($baseModelsFound) + @($customModelsFound)
    if ($allModels.Count -gt 0 -and (Test-CommandExists 'ollama')) {
        try {
            $ollamaList = & ollama list 2>$null
            $totalGB = 0.0
            foreach ($m in $allModels) {
                $line = $ollamaList | Where-Object { $_ -match "^$([regex]::Escape($m))\s" } | Select-Object -First 1
                if ($line -and $line -match '(\d+\.?\d*)\s*(KB|MB|GB|TB)') {
                    $val = [double]$Matches[1]
                    switch ($Matches[2]) {
                        'TB' { $totalGB += $val * 1024 }
                        'GB' { $totalGB += $val }
                        'MB' { $totalGB += $val / 1024 }
                        'KB' { $totalGB += $val / 1048576 }
                    }
                }
            }
            $totalGB = [math]::Round($totalGB, 1)
            Write-StatusNote "Speicherverbrauch (Hablará): ~${totalGB} GB"
        } catch {
            Write-StatusNote "Speicherverbrauch: nicht ermittelbar"
        }
    } else {
        Write-StatusNote "Speicherverbrauch: nicht ermittelbar"
    }

    Write-Host ""
    if ($errors -eq 0) {
        Write-Host "Alles in Ordnung." -ForegroundColor Green
    } else {
        Write-Host "Probleme gefunden. Starte das Setup erneut oder prüfe die Ollama-Installation." -ForegroundColor Red
    }
    Write-Host ""

    return [math]::Min($errors, 1)
}

# ============================================================================
# Cleanup
# ============================================================================

function Invoke-Cleanup {
    if (-not (Test-InteractiveSession)) {
        Write-Err "-Cleanup erfordert eine interaktive Sitzung"
        exit 1
    }

    if (-not (Test-CommandExists 'ollama')) {
        Write-Err "Ollama nicht gefunden"
        exit 1
    }

    try {
        $null = & ollama list 2>$null
        if ($LASTEXITCODE -ne 0) { throw "exit code $LASTEXITCODE" }
    } catch {
        Write-Err "Ollama Server nicht erreichbar"
        Write-Info "Starte Ollama und versuche es erneut"
        exit 1
    }

    # Discover installed Hablará variants
    $variants = @()
    foreach ($variant in @('3b', '7b', '14b', '32b')) {
        $modelName = $ModelConfigs[$variant].Name
        $customName = "${modelName}-custom"
        $hasBase = Test-OllamaModelExists $modelName
        $hasCustom = Test-OllamaModelExists $customName

        if ($hasBase -and $hasCustom) {
            $variants += @{ Variant = $variant; Base = $modelName; Custom = $customName; Label = "${variant}  (${modelName} + ${customName})" }
        } elseif ($hasBase) {
            $variants += @{ Variant = $variant; Base = $modelName; Custom = $null; Label = "${variant}  (${modelName})" }
        } elseif ($hasCustom) {
            $variants += @{ Variant = $variant; Base = $null; Custom = $customName; Label = "${variant}  (${customName})" }
        }
    }

    if ($variants.Count -eq 0) {
        Write-Host ""
        Write-Info "Keine Hablará-Modelle gefunden."
        Write-Host ""
        return
    }

    Write-Host ""
    Write-Host "Installierte Hablará-Varianten:" -ForegroundColor Cyan
    Write-Host ""
    for ($i = 0; $i -lt $variants.Count; $i++) {
        Write-Host "  $($i + 1)) $($variants[$i].Label)"
    }
    Write-Host ""
    $choice = Read-Host "Welche Variante löschen? (Nummer, Enter=abbrechen)"

    # Empty = abort
    if ([string]::IsNullOrEmpty($choice)) {
        return
    }

    # Validate choice
    $choiceNum = 0
    if (-not [int]::TryParse($choice, [ref]$choiceNum) -or $choiceNum -lt 1 -or $choiceNum -gt $variants.Count) {
        Write-Err "Ungültige Auswahl"
        return 1
    }

    $selected = $variants[$choiceNum - 1]

    Write-Host ""

    # Delete custom first (depends on base)
    if ($selected.Custom) {
        try {
            $rmErr = & ollama rm $selected.Custom 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Success "$($selected.Custom) gelöscht"
            } else {
                $reason = if ($rmErr) { $rmErr } else { 'unbekannter Fehler' }
                Write-Warn "$($selected.Custom) konnte nicht gelöscht werden: $reason"
            }
        } catch {
            Write-Warn "$($selected.Custom) konnte nicht gelöscht werden: $_"
        }
    }

    if ($selected.Base) {
        try {
            $rmErr = & ollama rm $selected.Base 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Success "$($selected.Base) gelöscht"
            } else {
                $reason = if ($rmErr) { $rmErr } else { 'unbekannter Fehler' }
                Write-Warn "$($selected.Base) konnte nicht gelöscht werden: $reason"
            }
        } catch {
            Write-Warn "$($selected.Base) konnte nicht gelöscht werden: $_"
        }
    }

    # Check if any Hablará models remain
    $remaining = $false
    foreach ($variant in @('3b', '7b', '14b', '32b')) {
        $modelName = $ModelConfigs[$variant].Name
        if ((Test-OllamaModelExists $modelName) -or (Test-OllamaModelExists "${modelName}-custom")) {
            $remaining = $true
            break
        }
    }

    if (-not $remaining) {
        Write-Host ""
        Write-Warn "Keine Hablará-Modelle mehr installiert. Führe das Setup erneut aus, um ein Modell zu installieren."
    }

    Write-Host ""
    return 0
}

# ============================================================================
# Model Selection
# ============================================================================

function Show-HelpMessage {
    @"
Hablará Ollama Setup für Windows v$ScriptVersion

Verwendung: .\setup-ollama-win.ps1 [-Model <Variante>] [-Update] [-Status] [-Cleanup] [-Help]

Parameter:
  -Model <Variante>  Modell-Variante wählen (3b, 7b, 14b, 32b)
  -Update            Hablará-Modell aktualisieren
  -Status            Ollama-Installation prüfen (Health-Check)
  -Cleanup           Hablará-Modelle aufräumen (nur interaktiv)
  -Help              Diese Hilfe anzeigen

Modell-Varianten:
  3b   - qwen2.5:3b   Schnelle Ergebnisse, läuft auf jedem modernen Gerät
  7b   - qwen2.5:7b   Gute Qualität, benötigt leistungsfähige Hardware [STANDARD]
  14b  - qwen2.5:14b  Hohe Qualität, benötigt starke Hardware
  32b  - qwen2.5:32b  Beste Qualität, benötigt sehr starke Hardware

Beispiele:
  .\setup-ollama-win.ps1              # Interaktiv oder Standard (7b)
  .\setup-ollama-win.ps1 -Model 3b    # 3b-Modell verwenden
  .\setup-ollama-win.ps1 -Update      # Hablará-Modell aktualisieren
  .\setup-ollama-win.ps1 -Status      # Installation prüfen
  .\setup-ollama-win.ps1 -Cleanup     # Hablará-Modelle aufräumen
"@ | Write-Host
}

function Show-ModelMenu {
    Write-Host ""
    Write-Host "Wähle ein Modell:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  1) 3b  - Schnelle Ergebnisse, läuft auf jedem modernen Gerät"
    Write-Host "  2) 7b  - Gute Qualität, benötigt leistungsfähige Hardware [EMPFOHLEN]"
    Write-Host "  3) 14b - Hohe Qualität, benötigt starke Hardware"
    Write-Host "  4) 32b - Beste Qualität, benötigt sehr starke Hardware"
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

function Show-MainMenu {
    Write-Host ""
    Write-Host "Wähle eine Aktion:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  1) Ollama einrichten oder aktualisieren"
    Write-Host "  2) Status prüfen"
    Write-Host "  3) Modelle aufräumen"
    Write-Host ""
    $choice = Read-Host "Auswahl [1-3, Enter=1]"

    switch ($choice) {
        '2' { return 'status' }
        '3' { return 'cleanup' }
        default { return 'setup' }
    }
}

function Select-ModelConfig {
    param([string]$RequestedModel)

    if ($Help) { Show-HelpMessage; exit 0 }
    if ($Status) { $exitCode = Invoke-StatusCheck; exit $exitCode }
    if ($Cleanup) { $exitCode = Invoke-Cleanup; exit ($exitCode -as [int]) }

    $hasExplicitFlags = $Update -or (-not [string]::IsNullOrEmpty($RequestedModel))

    # Interactive main menu (only when no explicit flags and interactive session)
    if (-not $hasExplicitFlags -and (Test-InteractiveSession)) {
        $action = Show-MainMenu
        if ($action -eq 'status') {
            $exitCode = Invoke-StatusCheck
            exit $exitCode
        } elseif ($action -eq 'cleanup') {
            $exitCode = Invoke-Cleanup
            exit ($exitCode -as [int])
        }
    }

    $selectedModel = $RequestedModel
    if ([string]::IsNullOrEmpty($selectedModel)) {
        $selectedModel = if (Test-InteractiveSession) { Show-ModelMenu } else { $DefaultModel }
    }

    if (-not $ModelConfigs.ContainsKey($selectedModel)) {
        Write-Err "Ungültige Modell-Variante: $selectedModel"
        Write-Host "Gültige Varianten: 3b, 7b, 14b, 32b"
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
            Write-Warn "Das 32b-Modell empfiehlt mindestens $($config.MinRAM)GB RAM"
            Write-Warn "Dein System hat ${systemRAM}GB RAM"
            Write-Host ""

            if (Test-InteractiveSession) {
                $confirm = Read-Host "Trotzdem fortfahren? [j/N]"
                if ($confirm -notmatch '^[jJyY]$') { Write-Info "Abgebrochen."; exit 0 }
            } else {
                Write-Warn "Fahre fort..."
            }
        }
    }

    if ([string]::IsNullOrEmpty($script:ModelName)) { Write-Err "Interner Fehler: ModelName nicht gesetzt"; exit 1 }
    Write-Info "Ausgewähltes Modell: $($script:ModelName)"
    return $config
}

# ============================================================================
# Pre-flight Checks
# ============================================================================

function Test-Prerequisites {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  Hablará Ollama Setup v$ScriptVersion (Windows)" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""

    Write-Step "Führe Vorab-Prüfungen durch..."

    if ([Environment]::OSVersion.Platform -ne [System.PlatformID]::Win32NT) {
        Write-Err "Dieses Script ist nur für Windows"
        Write-Info "Für macOS: scripts/setup-ollama-mac.sh"
        Write-Info "Für Linux: scripts/setup-ollama-linux.sh"
        exit 4
    }

    $freeSpace = Get-FreeDiskSpaceGB
    if ($freeSpace -lt $script:RequiredDiskSpaceGB) {
        Write-Err "Nicht genügend Speicher: ${freeSpace}GB verfügbar, $($script:RequiredDiskSpaceGB)GB benötigt"
        exit 2
    }
    Write-Success "Speicherplatz: ${freeSpace}GB verfügbar"

    try {
        $null = Invoke-WebRequest -Uri 'https://ollama.com' -TimeoutSec 5 -UseBasicParsing
        Write-Success "Netzwerkverbindung OK"
    } catch {
        Write-Err "Keine Netzwerkverbindung zu ollama.com"
        exit 3
    }

    $gpu = Test-GpuAvailable
    if ($gpu.Available) { Write-Success "GPU erkannt: $($gpu.Type)" }
    else { Write-Warn "Keine GPU erkannt - Verarbeitung ohne GPU-Beschleunigung" }

    Write-Host ""
}

# ============================================================================
# Ollama Installation
# ============================================================================

function Start-OllamaServer {
    try {
        $response = Invoke-RestMethod -Uri "$OllamaApiUrl/api/version" -TimeoutSec 5 -ErrorAction Stop
        Write-Success "Ollama Server läuft bereits"
        return $true
    } catch {}

    # Port might be in use by starting server - delegate to Wait-OllamaServer (30s)
    if (Test-PortInUse -Port 11434) {
        Write-Info "Port 11434 ist belegt, warte auf Ollama API..."
        if (Wait-OllamaServer) { return $true }
        Write-Warn "Port 11434 belegt, aber Ollama API antwortet nicht"
        return $false
    }

    # Try Ollama app (winget/installer installs "ollama app.exe" in LOCALAPPDATA)
    $ollamaApp = Join-Path $env:LOCALAPPDATA 'Ollama\ollama app.exe'
    if (Test-Path $ollamaApp) {
        Write-Info "Starte Ollama App..."
        Start-Process -FilePath $ollamaApp -WindowStyle Hidden
        $serverReady = Wait-OllamaServer
        if ($serverReady) { return $true }
    }

    # Fallback: ollama serve
    if (Test-CommandExists 'ollama') {
        Write-Info "Starte Ollama Server (ollama serve)..."
        $process = Start-Process -FilePath 'ollama' -ArgumentList 'serve' -WindowStyle Hidden -PassThru
        $serverReady = Wait-OllamaServer

        if ($serverReady -and -not $process.HasExited) { return $true }
        if ($process.HasExited) { Write-Err "Ollama Prozess beendet (Code: $($process.ExitCode))"; return $false }
        return $serverReady
    }
    return $false
}

function Install-Ollama {
    Write-Step "Installiere Ollama..."

    if (Test-CommandExists 'ollama') {
        Write-Success "Ollama bereits installiert"
        $version = & ollama --version 2>&1 | Select-Object -First 1
        Write-Info "Version: $version"
        Test-OllamaVersion | Out-Null

        if (-not (Start-OllamaServer)) {
            Write-Err "Konnte Ollama Server nicht starten"
            Write-Info "Manuell starten: ollama serve"
            exit 1
        }
        return
    }

    if (Test-CommandExists 'winget') {
        Write-Info "Verwende winget..."
        try {
            & winget install Ollama.Ollama --silent --accept-source-agreements --accept-package-agreements
            if ($LASTEXITCODE -eq 0 -or $LASTEXITCODE -eq 3010) {
                Write-Success "Ollama via winget installiert"
                if ($LASTEXITCODE -eq 3010) { Write-Warn "Ein Neustart des Computers kann erforderlich sein" }

                $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

                if (-not (Test-CommandExists 'ollama')) {
                    @("$env:LOCALAPPDATA\Programs\Ollama", "$env:ProgramFiles\Ollama") | ForEach-Object {
                        if (Test-Path (Join-Path $_ 'ollama.exe')) { $env:Path += ";$_" }
                    }
                }

                if (-not (Start-OllamaServer)) {
                    Write-Warn "Server-Start fehlgeschlagen - manuell starten: ollama serve"
                }
                if (-not (Wait-OllamaServer)) { exit 1 }
                return
            }
        } catch { Write-Warn "winget Installation fehlgeschlagen: $_" }
    }

    Write-Warn "Ollama konnte nicht automatisch installiert werden"
    Write-Host ""
    Write-Host "Bitte Ollama manuell installieren: https://ollama.com/download" -ForegroundColor Cyan
    Write-Host "Danach dieses Script erneut ausführen."
    Write-Host ""
    exit 1
}

# ============================================================================
# Model Management
# ============================================================================

function Install-BaseModel {
    Write-Step "Lade Basis-Modell herunter..."

    if (Test-OllamaModelExists $script:ModelName) {
        Write-Success "Modell bereits vorhanden: $script:ModelName"
        return
    }

    Write-Info "Lade $script:ModelName ($script:ModelSize, dauert mehrere Minuten je nach Verbindung)..."
    Write-Info "Tipp: Bei Abbruch (Ctrl+C) setzt ein erneuter Start den Download fort"

    $pullSuccess = $false
    for ($attempt = 1; $attempt -le 3; $attempt++) {
        & ollama pull $script:ModelName
        if ($LASTEXITCODE -eq 0) { $pullSuccess = $true; break }
        if ($attempt -lt 3) {
            Write-Warn "Download fehlgeschlagen, Versuch $($attempt + 1)/3..."
            Start-Sleep -Seconds 3
        }
    }

    if (-not $pullSuccess) {
        Write-Err "Modell-Download fehlgeschlagen nach 3 Versuchen"
        Write-Info "Manuell versuchen: ollama pull $script:ModelName"
        exit 1
    }
    Write-Success "Modell heruntergeladen: $script:ModelName"
}

function New-CustomModel {
    Write-Step "Erstelle Hablará-Modell..."

    $actionVerb = "erstellt"

    if (Test-OllamaModelExists $script:CustomModelName) {
        if ($Update) {
            Write-Info "Aktualisiere bestehendes Hablará-Modell..."
            $actionVerb = "aktualisiert"
        } elseif (Test-InteractiveSession) {
            # Interaktiv: Menü anzeigen
            Write-Host ""
            Write-Info "Hablará-Modell $script:CustomModelName bereits vorhanden."
            Write-Host ""
            Write-Host "  1) Überspringen (keine Änderung)"
            Write-Host "  2) Hablará-Modell aktualisieren"
            Write-Host ""
            $updateChoice = Read-Host "Auswahl [1-2, Enter=1]"
            if ($updateChoice -ne '2') {
                Write-Success "Hablará-Modell beibehalten"
                return
            }
            Write-Info "Aktualisiere bestehendes Hablará-Modell..."
            $actionVerb = "aktualisiert"
        } else {
            # Nicht-interaktiv ohne -Update: überspringen (bisheriges Verhalten)
            Write-Success "Hablará-Modell bereits vorhanden"
            return
        }
    }

    # Dynamic modelfile path based on selected model variant (e.g. qwen2.5:7b → qwen2.5-7b-custom.modelfile)
    $modelfileName = ($script:ModelName -replace ':', '-') + "-custom.modelfile"
    $scriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { "" }
    $externalModelfile = if ($scriptDir) { Join-Path $scriptDir "ollama\$modelfileName" } else { "" }

    $modelfileContent = ""
    if ($externalModelfile -and (Test-Path $externalModelfile)) {
        try {
            $modelfileContent = [System.IO.File]::ReadAllText($externalModelfile)
            Write-Info "Verwende Hablará-Konfiguration"
        } catch {
            Write-Warn "Konnte Konfiguration nicht lesen: $_"
            $externalModelfile = ""
        }
    }
    if (-not $modelfileContent) {
        Write-Info "Verwende Standard-Konfiguration"
        $modelfileContent = @"
FROM $script:ModelName

PARAMETER num_ctx 8192
PARAMETER temperature 0.3
PARAMETER top_p 0.9
PARAMETER repeat_penalty 1.1

SYSTEM """Du bist ein KI-Assistent für die Hablará Voice Intelligence Platform.

Deine Aufgaben:
1. Textanalyse: Emotionen, Argumente, Tonalität und psychologische Muster erkennen
2. Wissensassistenz: Fragen zu Hablará-Features beantworten

Wichtig:
- Sei präzise und objektiv
- Berücksichtige deutschen Sprachgebrauch und Kultur
- Folge dem im Prompt angegebenen Antwortformat (JSON oder natürliche Sprache)
- Keine Halluzinationen oder erfundene Details
"""
"@
    }

    $modelfilePath = Join-Path $env:TEMP "hablara-modelfile-$([System.IO.Path]::GetRandomFileName()).tmp"

    # Path traversal prevention (case-insensitive, trailing backslash prevents C:\Temp vs C:\Temp2)
    $canonicalPath = [System.IO.Path]::GetFullPath($modelfilePath)
    $canonicalTemp = [System.IO.Path]::GetFullPath($env:TEMP).TrimEnd('\') + '\'
    if (-not $canonicalPath.StartsWith($canonicalTemp, [StringComparison]::OrdinalIgnoreCase)) {
        Write-Err "Konfigurationsfehler"
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
    } catch { Write-Warn "Konnte restriktive Berechtigungen nicht setzen: $_" }

    try {
        & ollama create $script:CustomModelName -f $modelfilePath
        if ($LASTEXITCODE -ne 0) {
            Write-Warn "Hablará-Modell konnte nicht ${actionVerb} werden - verwende Basis-Modell"
            return
        }
        Write-Success "Hablará-Modell ${actionVerb}: $script:CustomModelName"
    } finally {
        if (Test-Path $modelfilePath) { Remove-Item -Path $modelfilePath -Force -ErrorAction SilentlyContinue }
    }
}

# ============================================================================
# Verification
# ============================================================================

function Test-Installation {
    Write-Host ""
    Write-Step "Überprüfe Installation..."

    if (-not (Test-CommandExists 'ollama')) { Write-Err "Ollama nicht gefunden"; return $false }

    try { $null = Invoke-RestMethod -Uri "$OllamaApiUrl/api/version" -TimeoutSec 5 }
    catch { Write-Err "Ollama Server nicht erreichbar"; return $false }

    if (-not (Test-OllamaModelExists $script:ModelName)) { Write-Err "Basis-Modell nicht gefunden: $script:ModelName"; return $false }
    Write-Success "Basis-Modell verfügbar: $script:ModelName"

    $testModel = $script:ModelName
    if (Test-OllamaModelExists $script:CustomModelName) {
        Write-Success "Hablará-Modell verfügbar: $script:CustomModelName"
        $testModel = $script:CustomModelName
    } else {
        Write-Warn "Hablará-Modell nicht verfügbar (verwende Basis-Modell)"
    }

    if (-not (Test-ModelInference -Model $testModel)) {
        Write-Warn "Modell-Test fehlgeschlagen, teste in der App"
    }

    Write-Host ""
    Write-Success "Setup abgeschlossen!"
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
    Write-Host "Nächste Schritte:" -ForegroundColor Blue
    Write-Host ""
    Write-Host "  1. Starte Hablará"
    Write-Host "  2. Drücke Ctrl+Shift+D für erste Aufnahme"
    Write-Host "  3. Mikrofon-Berechtigung erlauben (einmalig)"
    Write-Host ""
    $finalModel = if (Test-OllamaModelExists $script:CustomModelName) { $script:CustomModelName } else { $script:ModelName }

    Write-Host "LLM-Einstellungen in der App:"
    Write-Host "   - Provider: Ollama (Standard)"
    Write-Host "   - Modell: $finalModel"
    Write-Host "   - Base URL: http://localhost:11434"
    Write-Host ""
    Write-Host "Dokumentation: https://github.com/fidpa/hablara" -ForegroundColor Cyan
    Write-Host ""
}

Main
