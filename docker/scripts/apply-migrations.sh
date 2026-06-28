#!/usr/bin/env bash
# apply-migrations.sh
# Waits for PostgreSQL to be ready, then applies EF Core migrations.
# Usage: ./docker/scripts/apply-migrations.sh
#
# Requires:
#   - POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB set (or defaults used)
#   - dotnet SDK available on PATH
#   - Run from the repository root (CasualExplorer/)

set -euo pipefail

# ── Configuration ─────────────────────────────────────────────────────────────
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_USER="${POSTGRES_USER:-casual}"
POSTGRES_DB="${POSTGRES_DB:-CasualExplorerDb}"
MAX_RETRIES=30
RETRY_INTERVAL=2

MIGRATIONS_PROJECT="src/CasualExplorer.Infrastructure/CasualExplorer.Infrastructure.csproj"
STARTUP_PROJECT="src/CasualExplorer.API/CasualExplorer.API.csproj"

# ── Wait for PostgreSQL ───────────────────────────────────────────────────────
echo "[apply-migrations] Waiting for PostgreSQL at ${POSTGRES_HOST}:${POSTGRES_PORT}..."

retries=0
until pg_isready -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" > /dev/null 2>&1; do
  retries=$((retries + 1))
  if [ "${retries}" -ge "${MAX_RETRIES}" ]; then
    echo "[apply-migrations] ERROR: PostgreSQL did not become ready after $((MAX_RETRIES * RETRY_INTERVAL))s. Aborting."
    exit 1
  fi
  echo "[apply-migrations] Not ready yet (attempt ${retries}/${MAX_RETRIES}). Retrying in ${RETRY_INTERVAL}s..."
  sleep "${RETRY_INTERVAL}"
done

echo "[apply-migrations] PostgreSQL is ready."

# ── Apply EF Core Migrations ──────────────────────────────────────────────────
echo "[apply-migrations] Applying EF Core migrations..."

dotnet ef database update \
  --project "${MIGRATIONS_PROJECT}" \
  --startup-project "${STARTUP_PROJECT}" \
  --no-build \
  --verbose

echo "[apply-migrations] Migrations applied successfully."
