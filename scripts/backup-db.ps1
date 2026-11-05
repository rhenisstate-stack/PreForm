# ==============================================================================
# PrepFord NCLEX — Windows PowerShell PostgreSQL Backup Automation Script
# Format: PostgreSQL Custom Compressed Archive (.dump) with SHA-256 Checksum
# ==============================================================================
[CmdletBinding()]
param(
    [string]$DbHost = $(if ($env:POSTGRES_HOST) { $env:POSTGRES_HOST } else { "localhost" }),
    [int]$DbPort = $(if ($env:POSTGRES_PORT) { [int]$env:POSTGRES_PORT } else { 5432 }),
    [string]$DbUser = $(if ($env:POSTGRES_USER) { $env:POSTGRES_USER } else { "postgres" }),
    [string]$DbName = $(if ($env:POSTGRES_DB) { $env:POSTGRES_DB } else { "prepford" }),
    [string]$BackupDir = "backups\postgres"
)

$ErrorActionPreference = "Stop"

if (!(Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFilename = "prepford_backup_${timestamp}.dump"
$backupPath = Join-Path $BackupDir $backupFilename

Write-Host "=================================================================="
Write-Host "Starting PostgreSQL Backup for database: $DbName"
Write-Host "Target: ${DbHost}:${DbPort} | Output: $backupPath"
Write-Host "Timestamp: $((Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ'))"
Write-Host "=================================================================="

# Locate pg_dump
$pgDump = (Get-Command pg_dump -ErrorAction SilentlyContinue).Source
if (-not $pgDump) {
    if (Test-Path "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe") {
        $pgDump = "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe"
    } elseif (Test-Path "C:\Program Files\PostgreSQL\16\bin\pg_dump.exe") {
        $pgDump = "C:\Program Files\PostgreSQL\16\bin\pg_dump.exe"
    } else {
        throw "pg_dump executable not found in PATH or standard installation directories."
    }
}

# Execute pg_dump with custom format (-Fc), level 9 compression
& $pgDump -h $DbHost -p $DbPort -U $DbUser -d $DbName -Fc -Z 9 --verbose -f $backupPath

if ($LASTEXITCODE -ne 0) {
    throw "pg_dump failed with exit code $LASTEXITCODE"
}

# Generate SHA-256 hash
$hash = (Get-FileHash -Path $backupPath -Algorithm SHA256).Hash
Set-Content -Path "${backupPath}.sha256" -Value "$hash *$backupFilename"

Write-Host "Backup completed successfully."
Write-Host "Archive: $backupPath"
Write-Host "SHA-256: $hash"
Write-Host "Size: $((Get-Item $backupPath).Length) bytes"
