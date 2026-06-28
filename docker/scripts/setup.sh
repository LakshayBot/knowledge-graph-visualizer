#!/usr/bin/env bash
# setup.sh
# Full first-run orchestration for CasualExplorer.
# Copies .env, builds images, starts infrastructure, applies migrations,
# seeds Neo4j, and starts all application services.
#
# Usage: ./setup.sh [--dev]
#
# Flags:
#   --dev   Use docker-compose.dev.yml overlay (hot-reload, pgAdmin, Redis Insight)
#
# Run from the repository root (CasualExplorer/).

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCRIPTS_DIR="${REPO_ROOT}/docker/scripts"
NEO4J_INIT_CYPHER="${REPO_ROOT}/docker/neo4j/init.cypher"

DEV_MODE=false
COMPOSE_CMD="docker compose"
COMPOSE_FILES="-f docker-compose.yml"

# ── Parse arguments ───────────────────────────────────────────────────────────
for arg in "$@"; do
  case "${arg}" in
    --dev)
      DEV_MODE=true
      COMPOSE_FILES="-f docker-compose.yml -f docker-compose.dev.yml"
      ;;
    *)
      echo "Unknown argument: ${arg}"
      echo "Usage: $0 [--dev]"
      exit 1
      ;;
  esac
done

cd "${REPO_ROOT}"

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║           CasualExplorer – First-Run Setup               ║"
if [ "${DEV_MODE}" = true ]; then
echo "║                    [ DEV MODE ]                          ║"
fi
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# ── Step 1: .env ──────────────────────────────────────────────────────────────
echo "▶ Step 1/7: Checking environment configuration..."

if [ ! -f ".env" ]; then
  if [ -f ".env.example" ]; then
    cp .env.example .env
    echo "  Copied .env.example → .env"
    echo ""
    echo "  ACTION REQUIRED: Edit .env and set the following secrets before continuing:"
    echo "    POSTGRES_PASSWORD"
    echo "    NEO4J_PASSWORD"
    echo "    REDIS_PASSWORD"
    echo "    JWT_SECRET  (min 32 characters)"
    echo "    AI_SERVICE_API_KEY"
    echo ""
    read -r -p "  Press Enter once you have updated .env to continue, or Ctrl+C to abort..."
  else
    echo "  ERROR: .env.example not found. Cannot create .env. Aborting."
    exit 1
  fi
else
  echo "  .env already exists — skipping copy."
fi

# ── Step 2: Build images ──────────────────────────────────────────────────────
echo ""
echo "▶ Step 2/7: Building Docker images..."
${COMPOSE_CMD} ${COMPOSE_FILES} build --pull

# ── Step 3: Start infrastructure services ────────────────────────────────────
echo ""
echo "▶ Step 3/7: Starting infrastructure services (postgres, neo4j, redis, qdrant)..."
${COMPOSE_CMD} ${COMPOSE_FILES} up -d postgres neo4j redis qdrant

echo "  Waiting for all infrastructure health checks to pass..."

# Poll using 'docker inspect' — works regardless of compose output format version.
MAX_WAIT=180
elapsed=0
INFRA_CONTAINERS=("casual-postgres" "casual-neo4j" "casual-redis" "casual-qdrant")

while true; do
  all_healthy=true
  unhealthy_list=()
  for container in "${INFRA_CONTAINERS[@]}"; do
    status=$(docker inspect --format '{{.State.Health.Status}}' "${container}" 2>/dev/null || echo "missing")
    if [ "${status}" != "healthy" ]; then
      all_healthy=false
      unhealthy_list+=("${container}:${status}")
    fi
  done
  if [ "${all_healthy}" = true ]; then
    echo "  All infrastructure services are healthy."
    break
  fi
  if [ "${elapsed}" -ge "${MAX_WAIT}" ]; then
    echo "  ERROR: Infrastructure services did not become healthy within ${MAX_WAIT}s."
    echo "  Unhealthy: ${unhealthy_list[*]}"
    echo "  Run: docker compose ps  —or—  docker logs <container-name>"
    exit 1
  fi
  sleep 5
  elapsed=$((elapsed + 5))
  echo "  Still waiting... (${elapsed}s) — ${unhealthy_list[*]}"
done

# ── Step 4: Apply Neo4j seed data ─────────────────────────────────────────────
echo ""
echo "▶ Step 4/7: Applying Neo4j constraints, indexes, and seed data..."

# Load env vars for Neo4j auth
set -a
# shellcheck disable=SC1091
source .env
set +a

NEO4J_USER="${NEO4J_USERNAME:-neo4j}"
NEO4J_PASS="${NEO4J_PASSWORD:-ChangeMe123!}"

docker exec casual-neo4j cypher-shell \
  -u "${NEO4J_USER}" \
  -p "${NEO4J_PASS}" \
  --file /var/lib/neo4j/import/init.cypher \
  && echo "  Neo4j seed data applied." \
  || echo "  WARNING: Neo4j seed data may have already been applied (MERGE is idempotent)."

# ── Step 5: Apply EF Core migrations ─────────────────────────────────────────
echo ""
echo "▶ Step 5/7: Applying EF Core database migrations..."

POSTGRES_HOST_LOCAL="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT_LOCAL="${POSTGRES_PORT:-5432}"

if command -v dotnet &> /dev/null && command -v pg_isready &> /dev/null; then
  POSTGRES_HOST="${POSTGRES_HOST_LOCAL}" \
  POSTGRES_PORT="${POSTGRES_PORT_LOCAL}" \
  bash "${SCRIPTS_DIR}/apply-migrations.sh"
else
  echo "  dotnet SDK or pg_isready not found on host — running migrations inside a temporary SDK container..."

  MIGRATIONS_IMAGE="casual-explorer-api-migrations:local"
  ${COMPOSE_CMD} ${COMPOSE_FILES} build casual-api
  docker build \
    --target build \
    --tag "${MIGRATIONS_IMAGE}" \
    --file src/CasualExplorer.API/Dockerfile \
    .

  if [ "${DEV_MODE}" = true ]; then
    MIGRATIONS_ENVIRONMENT="Development"
    MIGRATIONS_DB="CasualExplorerDb_Dev"
    MIGRATIONS_USER="casual_dev"
    MIGRATIONS_PASSWORD="dev_password"
    MIGRATIONS_REDIS="redis:6379,abortConnect=false"
    MIGRATIONS_NEO4J_PASSWORD="devpassword123"
    MIGRATIONS_JWT_SECRET="dev-jwt-secret-min-32-characters-long!!"
    MIGRATIONS_JWT_ISSUER="CasualExplorer-Dev"
    MIGRATIONS_JWT_AUDIENCE="CasualExplorerClient-Dev"
  else
    MIGRATIONS_ENVIRONMENT="Production"
    MIGRATIONS_DB="${POSTGRES_DB:-CasualExplorerDb}"
    MIGRATIONS_USER="${POSTGRES_USER:-casual}"
    MIGRATIONS_PASSWORD="${POSTGRES_PASSWORD}"
    MIGRATIONS_REDIS="redis:6379,password=${REDIS_PASSWORD:-redis_secret},abortConnect=false"
    MIGRATIONS_NEO4J_PASSWORD="${NEO4J_PASSWORD:-ChangeMe123!}"
    MIGRATIONS_JWT_SECRET="${JWT_SECRET}"
    MIGRATIONS_JWT_ISSUER="${JWT_ISSUER:-CasualExplorer}"
    MIGRATIONS_JWT_AUDIENCE="${JWT_AUDIENCE:-CasualExplorerClient}"
  fi

  docker run --rm \
    --network casual-explorer_casual-net \
    --env-file .env \
    -e ASPNETCORE_ENVIRONMENT="${MIGRATIONS_ENVIRONMENT}" \
    -e "ConnectionStrings__DefaultConnection=Host=postgres;Port=5432;Database=${MIGRATIONS_DB};Username=${MIGRATIONS_USER};Password=${MIGRATIONS_PASSWORD}" \
    -e "ConnectionStrings__Redis=${MIGRATIONS_REDIS}" \
    -e Neo4j__Uri=bolt://neo4j:7687 \
    -e Neo4j__Username=neo4j \
    -e "Neo4j__Password=${MIGRATIONS_NEO4J_PASSWORD}" \
    -e AIService__BaseUrl=http://casual-ai-service:8000 \
    -e VectorSearch__QdrantUrl=http://qdrant:6333 \
    -e "Jwt__Secret=${MIGRATIONS_JWT_SECRET}" \
    -e "Jwt__Issuer=${MIGRATIONS_JWT_ISSUER}" \
    -e "Jwt__Audience=${MIGRATIONS_JWT_AUDIENCE}" \
    -w /repo \
    "${MIGRATIONS_IMAGE}" \
    dotnet ef database update \
      --project src/CasualExplorer.Infrastructure/CasualExplorer.Infrastructure.csproj \
      --startup-project src/CasualExplorer.API/CasualExplorer.API.csproj \
      --configuration Release \
      --no-build
fi

# ── Step 6: Pull Ollama models ────────────────────────────────────────────────
echo ""
echo "▶ Step 6/7: Starting Ollama and pulling models (this may take several minutes)..."
${COMPOSE_CMD} ${COMPOSE_FILES} up -d ollama
echo "  Waiting for Ollama to be healthy..."
sleep 10
${COMPOSE_CMD} ${COMPOSE_FILES} up ollama-pull
echo "  Ollama models ready."

# ── Step 7: Start all application services ────────────────────────────────────
echo ""
echo "▶ Step 7/7: Starting all remaining services..."
stale_api_containers="$(docker ps -aq --filter "name=casual-explorer-casual-api-run-" || true)"
if [ -n "${stale_api_containers}" ]; then
  echo "  Removing stale one-off API containers from older setup runs..."
  # shellcheck disable=SC2086
  docker rm -f ${stale_api_containers} >/dev/null
fi
${COMPOSE_CMD} ${COMPOSE_FILES} up -d --remove-orphans

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║              Setup complete!                             ║"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║  .NET API      → http://localhost:5001                   ║"
echo "║  Swagger UI    → http://localhost:5001/swagger           ║"
echo "║  AI Sidecar    → http://localhost:8000                   ║"
echo "║  Neo4j Browser → http://localhost:7474                   ║"
echo "║  Qdrant UI     → http://localhost:6333/dashboard         ║"
if [ "${DEV_MODE}" = true ]; then
echo "║  pgAdmin       → http://localhost:5050                   ║"
echo "║  Redis Insight → http://localhost:5540                   ║"
fi
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "  Tail logs:  docker compose logs -f casual-api casual-ai-service"
echo "  Stop all:   docker compose ${COMPOSE_FILES} down"
echo ""
