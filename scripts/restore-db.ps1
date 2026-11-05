# ==============================================================================
# PrepFord NCLEX — Windows PowerShell PostgreSQL Restore Automation Script
# Safety Guard: Forbids restoring over live production without explicit flag
# ==============================================================================
[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)]
    [string]$BackupFile,

    [string]$TargetDb = "prepford_recovery",
    [string]$DbHost = $(if ($env:POSTGRES_HOST) { $env:POSTGRES_HOST } else { "localhost" }),
    [int]$DbPort = $(if ($env:POSTGRES_PORT) { [int]$env:POSTGRES_PORT } else { 5432 }),
    [string]$DbUser = $(if ($env:POSTGRES_USER) { $env:POSTGRES_USER } else { "postgres" }),
    [switch]$AllowProductionOverwrite
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $BackupFile)) {
    throw "Backup file not found at: $BackupFile"
}

if ($TargetDb -eq "prepford" -and -not $AllowProductionOverwrite) {
    throw "Target database is 'prepford'. Destructive restore over production is blocked without -AllowProductionOverwrite."
}

Write-Host "=================================================================="
Write-Host "Starting PostgreSQL Restore into database: $TargetDb"
Write-Host "Source Archive: $BackupFile"
Write-Host "Target Host: ${DbHost}:${DbPort} as user: $DbUser"
Write-Host "Timestamp: $((Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ'))"
Write-Host "=================================================================="

# Check for SHA-256 integrity file
$checksumFile = "${BackupFile}.sha256"
if (Test-Path $checksumFile) {
    $recordedHash = (Get-Content $checksumFile).Split(" ")[0].Trim()
    $actualHash = (Get-FileHash -Path $BackupFile -Algorithm SHA256).Hash
    if ($recordedHash -ieq $actualHash) {
        Write-Host "SHA-256 integrity check: PASSED ($actualHash)"
    } else {
        throw "SHA-256 checksum mismatch! Recorded: $recordedHash, Computed: $actualHash"
    }
}

# Locate psql and pg_restore
$psql = (Get-Command psql -ErrorAction SilentlyContinue).Source
if (-not $psql) {
    if (Test-Path "C:\Program Files\PostgreSQL\18\bin\psql.exe") {
        $psql = "C:\Program Files\PostgreSQL\18\bin\psql.exe"
    } elseif (Test-Path "C:\Program Files\PostgreSQL\16\bin\psql.exe") {
        $psql = "C:\Program Files\PostgreSQL\16\bin\psql.exe"
    }
}

$pgRestore = (Get-Command pg_restore -ErrorAction SilentlyContinue).Source
if (-not $pgRestore) {
    if (Test-Path "C:\Program Files\PostgreSQL\18\bin\pg_restore.exe") {
        $pgRestore = "C:\Program Files\PostgreSQL\18\bin\pg_restore.exe"
    } elseif (Test-Path "C:\Program Files\PostgreSQL\16\bin\pg_restore.exe") {
        $pgRestore = "C:\Program Files\PostgreSQL\16\bin\pg_restore.exe"
    }
}

# Ensure target database exists
Write-Host "Ensuring target database $TargetDb exists..."
$checkQuery = "SELECT 1 FROM pg_database WHERE datname = '$TargetDb';"
$checkResult = & $psql -h $DbHost -p $DbPort -U $DbUser -d postgres -t -c $checkQuery
if ($checkResult -notmatch "1") {
    Write-Host "Creating database $TargetDb..."
    & $psql -h $DbHost -p $DbPort -U $DbUser -d postgres -c "CREATE DATABASE `"$TargetDb`";"
}

# Execute pg_restore
Write-Host "Restoring database schema and data..."
& $pgRestore -h $DbHost -p $DbPort -U $DbUser -d $TargetDb --clean --if-exists --no-owner --no-privileges --verbose $BackupFile

Write-Host "Restoration command completed."
