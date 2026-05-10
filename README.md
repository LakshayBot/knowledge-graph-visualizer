# CausalExplorer

**AI-powered causal event graph system** — understand *why* complex world events happen through interactive cause-and-effect chains.

## Overview

CausalExplorer ingests historical and current events, links them via directed causal edges, and exposes a graph API. A local AI sidecar (Ollama + Qdrant) generates causal chain suggestions and event summaries — no external API keys required.

## Architecture

```
CausalExplorer/
├── src/
│   ├── CausalExplorer.Domain/          # Entities, Value Objects, Domain Events
│   ├── CausalExplorer.Application/     # Commands, Queries, MediatR, Validators
│   ├── CausalExplorer.Infrastructure/  # EF Core + PostgreSQL, Neo4j, Redis
│   └── CausalExplorer.API/             # ASP.NET Core 8 REST API
├── causal-ai-service/                  # Python FastAPI + Ollama + Qdrant
├── tests/
│   ├── CausalExplorer.Domain.Tests/
│   ├── CausalExplorer.Application.Tests/
│   └── CausalExplorer.API.Tests/
├── docker/
│   ├── neo4j/init.cypher               # Constraints, indexes, seed data
│   └── scripts/
│       ├── setup.sh                    # First-run orchestration
│       └── apply-migrations.sh         # EF Core migration runner
├── docker-compose.yml                  # Production (7 services)
├── docker-compose.dev.yml              # Dev overlay (hot-reload, pgAdmin, Redis Insight)
└── .env.example
```

### Service Topology

```
┌──────────────────────────────────────────────────────────────┐
│                        causal-net                            │
│                                                              │
│  ┌─────────────┐     ┌──────────────────┐                   │
│  │  causal-api │────▶│ causal-ai-service│                   │
│  │ (ASP.NET 8) │     │   (FastAPI)      │                   │
│  └──────┬──────┘     └────────┬─────────┘                   │
│         │                     │                              │
│    ┌────▼────┐           ┌────▼────┐  ┌──────────┐          │
│    │postgres │           │ qdrant  │  │  ollama  │          │
│    │  (EF)   │           │(vector) │  │  (LLM)   │          │
│    └─────────┘           └─────────┘  └──────────┘          │
│    ┌─────────┐  ┌─────────┐                                  │
│    │  neo4j  │  │  redis  │                                  │
│    │ (graph) │  │ (cache) │                                  │
│    └─────────┘  └─────────┘                                  │
└──────────────────────────────────────────────────────────────┘
```

| Store | Purpose |
|-------|---------|
| PostgreSQL 16 | Users, RefreshTokens, CausalChains (EF Core) |
| Neo4j 5.18 | EventNodes, CausalEdges (graph traversal via APOC) |
| Redis 7.2 | Response cache, refresh-token store |
| Qdrant | Vector embeddings for RAG (nomic-embed-text) |
| Ollama | Local LLM inference (mixtral:8x7b prod / mistral dev) |

## Technology Stack

| Component | Technology |
|-----------|-----------|
| .NET API | ASP.NET Core 8, MediatR, FluentValidation, Clean Architecture |
| ORM | Entity Framework Core 8 + Npgsql (PostgreSQL) |
| Graph DB | Neo4j 5 + APOC, Neo4j.Driver |
| AI Sidecar | Python 3.12, FastAPI, Ollama (local LLM), Qdrant |
| Auth | JWT Bearer + Refresh Tokens |
| Rate Limiting | `Microsoft.AspNetCore.RateLimiting` (fixed window) |
| Testing | xUnit, FluentAssertions, Moq (24 tests passing) |
| Observability | Serilog (structured JSON), ASP.NET Health Checks |
| Containers | Docker, Docker Compose |

## Hardware Requirements

| Mode | RAM | GPU |
|------|-----|-----|
| Dev (mistral 7B) | 16 GB | Optional |
| Production (mixtral:8x7b) | 32 GB | Recommended (NVIDIA) |

> On CPU-only machines set `OLLAMA_MODEL=mistral` in `.env`.

## Quick Start

### Prerequisites

- Docker Engine 24+ with Docker Compose v2
- (Optional) .NET 8 SDK — for running tests locally
- (Optional) NVIDIA GPU + nvidia-container-toolkit

### 1. Clone

```bash
git clone https://github.com/your-org/causal-explorer.git
cd causal-explorer/CausalExplorer
```

### 2. First-run setup (recommended)

```bash
# Production
./docker/scripts/setup.sh

# Development (hot-reload, pgAdmin, Redis Insight)
./docker/scripts/setup.sh --dev
```

The script will:
1. Copy `.env.example` → `.env` and prompt you to fill in secrets
2. Build Docker images
3. Start infrastructure services and wait for health checks
4. Apply Neo4j constraints, indexes, and seed data
5. Apply EF Core database migrations
6. Pull Ollama models (`mixtral:8x7b` + `nomic-embed-text`)
7. Start all application services

### 3. Manual setup (alternative)

```bash
cp .env.example .env
# Edit .env — set POSTGRES_PASSWORD, NEO4J_PASSWORD, REDIS_PASSWORD, JWT_SECRET

docker compose up -d
```

### 4. Service endpoints

| Service | URL |
|---------|-----|
| .NET API | http://localhost:5001 |
| Swagger UI | http://localhost:5001/swagger |
| Health (detailed) | http://localhost:5001/health |
| AI Sidecar | http://localhost:8000 |
| AI Docs | http://localhost:8000/docs |
| Neo4j Browser | http://localhost:7474 |
| Qdrant Dashboard | http://localhost:6333/dashboard |
| pgAdmin (dev) | http://localhost:5050 |
| Redis Insight (dev) | http://localhost:8001 |

## How to Use the API — End-to-End Flow

This section walks through the complete journey: from registering an account to asking a causal question and drilling into the AI-generated answer.

---

### Step 1 — Register and authenticate

All write operations and AI expansion require a JWT token.

```
POST /api/v1/auth/register
{
  "email": "you@example.com",
  "password": "YourPassword1!",
  "displayName": "Your Name"
}
```

Returns `accessToken` (short-lived) and `refreshToken` (long-lived).  
Use the `accessToken` as `Authorization: Bearer <token>` on subsequent requests.

> Already registered? Use `POST /api/v1/auth/login` with the same body shape.

---

### Step 2 — Find an event to start from (your "question")

Search the knowledge graph for the event you want to investigate:

```
GET /api/v1/event-nodes/search?q=financial+crisis
```

Returns a paged list of matching `EventNode` summaries with IDs, titles, domains, and confidence scores.  
Pick the node that best represents the root cause you want to explore — note its `id`.

> Alternatively browse by domain/date: `GET /api/v1/event-nodes?domain=Economics&dateFrom=2007-01-01`

---

### Step 3 — Create a causal chain rooted at that event

A **CausalChain** is your named investigation — it anchors the graph traversal to a specific starting event.

```
POST /api/v1/causal-chains
Authorization: Bearer <token>
{
  "title": "Why did the 2008 financial crisis happen?",
  "rootEventId": "<id from step 2>",
  "domain": "Economics"
}
```

Returns a `CausalChainSummaryDto` including the new chain's `id`.

---

### Step 4 — Load the initial graph (fast first render)

Fetch the 3–5 most relevant nodes around the root for a quick overview:

```
GET /api/v1/causal-chains/{chainId}/initial
```

Returns `CausalGraphDto` — a list of nodes and directed edges showing the immediate causes and effects.  
Each node has a `confidenceScore`, `freshnessScore`, and one or more `perspectives`  
(Mainstream / Geopolitical / Structural / Economic / Revisionist).

> Filter by a specific lens: `?perspective=Structural`

---

### Step 5 — Explore the full graph

Load the complete chain up to a configurable traversal depth:

```
GET /api/v1/causal-chains/{chainId}?depth=4
```

Each edge has a `relationshipType`:

| Type | Meaning |
|------|---------|
| `DirectlyCaused` | A is the direct cause of B |
| `ContributedTo` | A was a contributing factor to B |
| `Enabled` | A created conditions for B |
| `Contested` | The causal link between A and B is disputed |
| `Prevented` | A stopped B from occurring |

---

### Step 6 — Drill deeper with AI expansion

Pick any node in the graph that you want the AI to investigate further.  
This calls the Ollama LLM sidecar and returns newly suggested connected nodes:

```
POST /api/v1/causal-chains/{chainId}/expand/{nodeId}?perspective=Geopolitical
Authorization: Bearer <token>
```

Returns additional nodes and edges to merge into the existing graph.  
Rate-limited to **10 requests/minute** per user (this is an expensive LLM operation).

> The AI sidecar also exposes its own docs at http://localhost:8000/docs if you want to call it directly.

---

### Step 7 — Inspect individual nodes and their edges

Get the full detail of any node (sources, confidence, all perspectives):

```
GET /api/v1/event-nodes/{nodeId}
```

Inspect all causal edges connected to a node:

```
GET /api/v1/causal-edges/node/{nodeId}
```

Check whether a direct causal link exists between two specific nodes:

```
GET /api/v1/causal-edges/between/{fromNodeId}/{toNodeId}
```

---

### Step 8 — Save your investigation

Bookmark the chain to your personal library with optional notes:

```
POST /api/v1/causal-chains/{chainId}/save
Authorization: Bearer <token>
{ "notes": "Focus on the deregulation angle" }
```

Retrieve all your saved chains later:

```
GET /api/v1/users/me/chains
Authorization: Bearer <token>
```

---

### Full flow at a glance

```
register / login
      │
      ▼
search event-nodes          ← "What event am I investigating?"
      │
      ▼
POST causal-chains          ← "Create my investigation"
      │
      ▼
GET  causal-chains/{id}/initial   ← quick first render
      │
      ▼
GET  causal-chains/{id}?depth=N   ← full graph
      │
      ▼
POST causal-chains/{id}/expand/{nodeId}   ← AI deepens a node  ⟵ repeat as needed
      │
      ▼
GET  causal-edges/node/{nodeId}   ← inspect individual connections
      │
      ▼
POST causal-chains/{id}/save      ← bookmark investigation
```

---

### Role permissions summary

| Action | Min role required |
|--------|-----------------|
| Browse & search events, view chains | Anonymous |
| Create chains, save chains | User (authenticated) |
| Create / edit event nodes | Contributor |
| Verify / delete event nodes, manage edges | Moderator or Admin |
| Token refresh / revoke | Any authenticated user |

---

## Key Features

- **Causal Graph Model** — directed EventNodes connected by typed CausalEdges (`DirectlyCaused`, `ContributedTo`, `Contested`, `Enabled`, `Prevented`)
- **Multi-Perspective Analysis** — Mainstream, Geopolitical, Structural, Economic, Revisionist lenses
- **Confidence Scoring** — Established / WidelyAccepted / Debated / Speculative classification
- **Local AI** — Ollama LLM generates causal suggestions; Qdrant vector search enables semantic retrieval — no external API dependency
- **Role-Based Access** — Guest → User → Contributor → Moderator → Admin
- **CQRS + Domain Events** — full event-driven audit trail via MediatR

## Running Tests

```bash
dotnet test
# Expected: 24 passed, 0 failed
```

## Environment Variables

See `.env.example` for all variables with descriptions. Key secrets:

| Variable | Description |
|----------|-------------|
| `POSTGRES_PASSWORD` | PostgreSQL password |
| `NEO4J_PASSWORD` | Neo4j password |
| `REDIS_PASSWORD` | Redis password |
| `JWT_SECRET` | JWT signing key (min 32 characters) |
| `AI_SERVICE_API_KEY` | Shared secret between .NET API and AI sidecar |
| `OLLAMA_MODEL` | LLM model name (default: `mixtral:8x7b`) |

## Useful Commands

```bash
# Tail application logs
docker compose logs -f causal-api causal-ai-service

# Rebuild a single service
docker compose build causal-api

# Apply migrations manually (host machine, dotnet SDK required)
./docker/scripts/apply-migrations.sh

# Stop all services
docker compose down

# Stop and remove volumes (full reset)
docker compose down -v
```

## License

MIT
