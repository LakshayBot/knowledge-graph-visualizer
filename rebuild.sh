#!/usr/bin/env bash
set -euo pipefail

# ── CausalExplorer — Full Rebuild ───────────────────────────
# Usage: ./rebuild.sh [--frontend] [--no-cache]
# Builds backend containers + optionally the frontend.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

NO_CACHE=""
BUILD_FRONTEND=false

for arg in "$@"; do
  case "$arg" in
    --no-cache) NO_CACHE="--no-cache" ;;
    --frontend) BUILD_FRONTEND=true ;;
  esac
done

echo "========================================"
echo " CausalExplorer — Full Rebuild"
echo "========================================"

# ── 1. Rebuild backend Docker containers ────────────────────
echo ""
echo "[1/3] Rebuilding backend containers..."
docker compose build $NO_CACHE causal-api causal-ai-service

# ── 2. Restart services ─────────────────────────────────────
echo ""
echo "[2/3] Restarting services..."
docker compose up -d --remove-orphans

echo ""
echo "  Waiting for API health check..."
for i in $(seq 1 30); do
  if curl -sf http://localhost:5001/health/live > /dev/null 2>&1; then
    echo "  ✓ API is healthy"
    break
  fi
  sleep 2
done

# ── 3. Frontend (optional) ──────────────────────────────────
if $BUILD_FRONTEND; then
  echo ""
  echo "[3/3] Building frontend..."
  cd "$SCRIPT_DIR/frontend"
  npm run build
  echo "  ✓ Frontend built"
else
  echo ""
  echo "[3/3] Skipping frontend (use --frontend to include)"
fi

echo ""
echo "========================================"
echo "  Rebuild complete"
echo "========================================"
echo ""
echo "  Services:"
echo "    API:       http://localhost:5001"
echo "    Swagger:   http://localhost:5001/swagger"
echo "    Neo4j:     http://localhost:7474  (neo4j / postgres)"
echo "    pgAdmin:   http://localhost:5050  (pgadmin4@pgadmin.org / admin)"
echo "    Redis:     localhost:6379"
echo "    Qdrant:    http://localhost:6333"
echo ""
echo "  Frontend:   cd frontend && npm run dev"
echo ""
