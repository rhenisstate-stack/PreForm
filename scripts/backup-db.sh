#!/usr/bin/env bash
# ==============================================================================
# PrepFord NCLEX — Production PostgreSQL Backup Automation Script
# Format: PostgreSQL Custom Compressed Archive (.dump) with SHA-256 Checksum
# ==============================================================================
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups/postgres}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"
DB_USER="${POSTGRES_USER:-postgres}"
DB_NAME="${POSTGRES_DB:-prepford}"
BACKUP_FILENAME="prepford_backup_${TIMESTAMP}.dump"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILENAME}"

mkdir -p "${BACKUP_DIR}"

echo "=================================================================="
echo "Starting PostgreSQL Backup for database: ${DB_NAME}"
echo "Target host: ${DB_HOST}:${DB_PORT} | Output: ${BACKUP_PATH}"
echo "Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo "=================================================================="

# Execute pg_dump with custom format (-Fc), level 9 compression, and verbose progress
pg_dump \
  -h "${DB_HOST}" \
  -p "${DB_PORT}" \
  -U "${DB_USER}" \
  -d "${DB_NAME}" \
  -Fc \
  -Z 9 \
  --verbose \
  --file="${BACKUP_PATH}"

# Generate SHA-256 Checksum for integrity validation
if command -v sha256sum >/dev/null 2>&1; then
  sha256sum "${BACKUP_PATH}" > "${BACKUP_PATH}.sha256"
elif command -v shasum >/dev/null 2>&1; then
  shasum -a 256 "${BACKUP_PATH}" > "${BACKUP_PATH}.sha256"
fi

# Optional GPG encryption if BACKUP_PASSPHRASE is configured
if [ -n "${BACKUP_PASSPHRASE:-}" ]; then
  echo "Encrypting backup with AES-256 via GPG..."
  gpg --batch --yes --symmetric --cipher-algo AES256 --passphrase "${BACKUP_PASSPHRASE}" "${BACKUP_PATH}"
  rm -f "${BACKUP_PATH}"
  echo "Encrypted archive created: ${BACKUP_PATH}.gpg"
fi

echo "Backup completed successfully at $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo "Backup file: ${BACKUP_PATH}"
