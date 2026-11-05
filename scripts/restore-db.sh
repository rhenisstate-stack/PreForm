#!/usr/bin/env bash
# ==============================================================================
# PrepFord NCLEX — Production PostgreSQL Restore Automation Script
# Safety Guard: Forbids restoring over live production without confirmation
# ==============================================================================
set -euo pipefail

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 <backup-file-path> [target-database-name]"
  exit 1
fi

BACKUP_PATH="$1"
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"
DB_USER="${POSTGRES_USER:-postgres}"
TARGET_DB="${2:-${POSTGRES_DB:-prepford_recovery}}"

# Safety check: Prevent accidental overwrite of production
if [ "${TARGET_DB}" = "prepford" ] && [ "${ALLOW_PRODUCTION_OVERWRITE:-false}" != "true" ]; then
  echo "ERROR: Target database is 'prepford'. Destructive restore over production is blocked."
  echo "Set ALLOW_PRODUCTION_OVERWRITE=true only during declared disaster recovery."
  exit 1
fi

echo "=================================================================="
echo "Starting PostgreSQL Restore into database: ${TARGET_DB}"
echo "Source archive: ${BACKUP_PATH}"
echo "Target host: ${DB_HOST}:${DB_PORT} as user: ${DB_USER}"
echo "Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo "=================================================================="

# Check for GPG encryption and decrypt if necessary
RESTORE_FILE="${BACKUP_PATH}"
if [[ "${BACKUP_PATH}" == *.gpg ]]; then
  if [ -z "${BACKUP_PASSPHRASE:-}" ]; then
    echo "ERROR: Backup file is encrypted (.gpg) but BACKUP_PASSPHRASE is not set."
    exit 1
  fi
  RESTORE_FILE="${BACKUP_PATH%.gpg}"
  echo "Decrypting backup archive..."
  gpg --batch --yes --decrypt --passphrase "${BACKUP_PASSPHRASE}" --output "${RESTORE_FILE}" "${BACKUP_PATH}"
fi

# Verify checksum if present
if [ -f "${RESTORE_FILE}.sha256" ]; then
  echo "Verifying SHA-256 checksum..."
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum -c "${RESTORE_FILE}.sha256"
  elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 -c "${RESTORE_FILE}.sha256"
  fi
fi

# Ensure target database exists
echo "Preparing target database ${TARGET_DB}..."
psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d postgres -tc "SELECT 1 FROM pg_database WHERE datname = '${TARGET_DB}'" | grep -q 1 || \
  psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d postgres -c "CREATE DATABASE \"${TARGET_DB}\";"

# Execute pg_restore
echo "Executing pg_restore into ${TARGET_DB}..."
pg_restore \
  -h "${DB_HOST}" \
  -p "${DB_PORT}" \
  -U "${DB_USER}" \
  -d "${TARGET_DB}" \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --verbose \
  "${RESTORE_FILE}"

echo "Restoration completed successfully at $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
