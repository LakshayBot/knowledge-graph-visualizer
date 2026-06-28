# CasualExplorer Architecture

## Overview

CasualExplorer is an AI-powered causal knowledge graph exploration platform. Users ask questions, and the system generates interactive knowledge graphs showing causal relationships between events, with the ability to expand nodes, explore chains, and discover hidden connections.

## Architecture Style

**Clean Architecture (DDD)** with four layers:

```
┌──────────────────────────────────────────────────┐
│  CasualExplorer.API (ASP.NET Core 8 Web API)     │
│  Controllers, Middleware, Filters, Rate Limiting │
├──────────────────────────────────────────────────┤
│  CasualExplorer.Application (CQRS + MediatR)     │
│  Commands, Queries, Handlers, Validators, DTOs   │
├──────────────────────────────────────────────────┤
│  CasualExplorer.Domain (DDD)                     │
│  Entities, Value Objects, Enums, Domain Events   │
├──────────────────────────────────────────────────┤
│  CasualExplorer.Infrastructure                   │
│  EF Core (PostgreSQL), Neo4j, Redis, Qdrant      │
│  AI Service Clients, Encryption, Identity        │
└──────────────────────────────────────────────────┘

Sidecar: casual-ai-service (Python FastAPI + LLM providers)
Frontend: Next.js 16 (Turbopack) + React 19
```

## Data Stores

| Store | Purpose | Schema |
|-------|---------|--------|
| **PostgreSQL** | Users, API Keys, Refresh Tokens, Event Nodes, Causal Edges, Causal Chains, Chain-Node mappings, Graph Snapshots (JSONB) | Tables: `event_nodes`, `causal_edges`, `causal_chains`, `chain_nodes`, `users`, `refresh_tokens`, `user_api_keys`, `user_saved_chains`, `ai_prompt_logs` |
| **Neo4j** | Graph traversal, BFS queries, expansion queries | Nodes: `EventNode`, Relationships: `CAUSED` |
| **Redis** | Caching, refresh token store | Key-value |
| **Qdrant** | Vector embeddings for semantic search | Collection: `causal_events` (768-dim) |

## Key Data Flow

### Graph Generation (topic-based)
```
User → Frontend → .NET API (POST /casual-chains)
  → KnowledgeGraphGeneratorClient → Python AI Service (POST /api/graph/generate)
  → Async job polling (5s interval, 15min max)
  → Dual-write: Neo4j (graph) + PostgreSQL (relational + JSONB snapshot)
  → Returns CasualGraphDto to frontend
```

### Node Expansion
```
User clicks "Expand" → Frontend → .NET API (POST /casual-chains/{id}/expand/{nodeId})
  → AIServiceClient → Python AI Service (POST /api/chain/expand)
  → Dual-write: Neo4j + PostgreSQL
  → Returns CasualGraphDto with new nodes/edges
```

### Scoped Graph Loading
```
Frontend load → .NET API (GET /casual-chains/{id}/scoped)
  → Reads from PostgreSQL JSONB snapshot (causal_chains.graph_snapshot)
  → No Neo4j traversal needed
  → Returns CasualGraphDto
```

## Frontend Architecture

### Rendering
- **Pure SVG** — no D3, vis.js, or cytoscape
- **Custom BFS-based layout** — deterministic, directed (causes left, effects right)
- **Framer Motion** for sidebar/overlay animations
- **All state is local React state** (no Redux, Zustand, etc.)

### Component Tree
```
ExplorePage (page.tsx)
├── AuthGuard
│   └── ExploreContent
│       ├── GraphBackground (dot pattern + ambient gradients)
│       ├── GraphCanvas (SVG graph)
│       ├── NodeDetailPanel (sidebar / bottom-sheet)
│       ├── ProviderModelSelector
│       ├── Command Bar (search input + run button)
│       └── Zoom Controls
```

### Key Frontend Files
| File | Purpose |
|------|---------|
| `frontend/app/(explore)/explore/page.tsx` | Main explore page, state management |
| `frontend/components/explore/GraphCanvas.tsx` | SVG graph renderer |
| `frontend/components/explore/NodeDetailPanel.tsx` | Node inspector sidebar |
| `frontend/components/explore/SearchBar.tsx` | Search input (not currently used inline) |
| `frontend/hooks/useForceLayout.ts` | BFS deterministic layout engine |
| `frontend/lib/api-client.ts` | HTTP client with auth, token refresh |
| `frontend/types/graph.ts` | GraphNode, GraphEdge, SavedChain types |

## Current Feature Status

### Implemented
- Topic-based graph generation (Wikipedia + LLM → graph)
- Node expansion (chain-of-events exploration)
- Node inspection (sidebar with confidence, sources, perspectives)
- Graph zoom/pan (SVG viewBox manipulation)
- Chain save/load (history page)
- BYOK multi-provider AI (Grok, OpenAI, Claude, Gemini, Ollama)
- Dark/light theme

### NOT Yet Implemented (Graph Evolution Plan)
- Timeline visualization and playback
- Causal strength visualization (edge thickness/color by strength)
- Counterfactual simulation ("what if X didn't happen")
- Multiple competing theories
- Infinite node expansion (lazy loading)
- Documentary/cinematic mode
- Heatmap mode
- Discovery/recommendation engine
- Knowledge Galaxy (global graph)
- Hidden insight detection

## Technical Principles

1. Features must be additive — don't break existing functionality
2. All new functionality should support lazy loading
3. Animations must be optional (respect `prefers-reduced-motion`)
4. State must remain serializable (JSONB persistence)
5. Every feature should support persistence (save/load chains)

## Constraints

- BYOK model only — no server-side API keys
- No payment/subscription integration
- All AI calls go through the Python sidecar
- Graph data is dual-written (Neo4j + PostgreSQL JSONB)
- Frontend runs Next.js Turbopack build
