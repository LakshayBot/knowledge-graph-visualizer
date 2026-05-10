# Architecture — CausalExplorer

## Overview

CausalExplorer follows **Clean Architecture** (Uncle Bob), ensuring the domain model
has no outward dependencies and all cross-cutting concerns are pushed to the outer rings.

```
┌──────────────────────────────────────────────────────────┐
│  Presentation  │  CausalExplorer.API  (ASP.NET Core 8)   │
├──────────────────────────────────────────────────────────┤
│  Application   │  CausalExplorer.Application              │
│                │  (MediatR, CQRS, FluentValidation)       │
├──────────────────────────────────────────────────────────┤
│  Domain        │  CausalExplorer.Domain                   │
│                │  (Entities, Value Objects, Domain Events) │
├──────────────────────────────────────────────────────────┤
│  Infrastructure│  CausalExplorer.Infrastructure           │
│                │  (EF Core / PostgreSQL, Repositories)    │
└──────────────────────────────────────────────────────────┘
        ↕  HTTP / gRPC (future)
┌──────────────────────────────────────────────────────────┐
│  AI Service    │  CausalExplorer.AI  (Python FastAPI)     │
│                │  (OpenAI integration, causal analysis)   │
└──────────────────────────────────────────────────────────┘
```

## Dependency Rule

Dependencies only point **inward**:

```
API → Application → Domain ← Infrastructure
```

The Domain project has **zero** external package dependencies.

## Project Responsibilities

| Project | Layer | Responsibility |
|---------|-------|----------------|
| `CausalExplorer.Domain` | Domain | Entities, Value Objects, Domain Events, Repository Interfaces |
| `CausalExplorer.Application` | Application | Commands, Queries, Handlers, Validators, Pipeline Behaviours |
| `CausalExplorer.Infrastructure` | Infrastructure | EF Core DbContext, Repository implementations, Unit of Work |
| `CausalExplorer.API` | Presentation | ASP.NET Core controllers, middleware, DI wiring, Swagger |
| `CausalExplorer.AI` | External Service | FastAPI, OpenAI integration, causal graph generation |

## Domain Model

### Entities

- **EventNode** — a single historical event in the knowledge graph.
- **CausalEdge** — a directed causal relationship between two EventNodes.
- **CausalChain** — a curated, named path through the graph rooted at one event.
- **User** — a registered platform user with role-based access.
- **UserSavedChain** — join table recording a user's saved chains.

### Value Objects

- **Source** — URL + metadata for a supporting document. Structurally compared.
- **ConfidenceLevel** — wraps a `decimal` score and derives a `ConfidenceLevelKind` enum.

### Enums

| Enum | Values |
|------|--------|
| `EventDomain` | Geopolitics, Economics, Technology, Social, Environmental, Military, Cultural |
| `CausalRelationshipType` | DirectlyCaused, EnabledConditionsFor, ContributedTo, Contested, Correlated |
| `Perspective` | Mainstream, Geopolitical, Structural, Economic, Revisionist |
| `UserRole` | Guest, User, Contributor, Moderator, Admin |
| `SourceType` | News, Academic, Government, ThinkTank |

### Domain Events

| Event | Trigger |
|-------|---------|
| `EventNodeCreatedDomainEvent` | `EventNode.Create(...)` |
| `EventNodeVerifiedDomainEvent` | `EventNode.Verify(...)` |
| `CausalEdgeAddedDomainEvent` | `CausalEdge.Create(...)` |
| `ChainUpdatedDomainEvent` | `CausalChain.IncrementNodeCount()` / `DecrementNodeCount()` |

## CQRS Pattern

All application use-cases are modelled as MediatR `IRequest<TResponse>`:

- **Commands** mutate state and return `Result` or `Result<T>`.
- **Queries** are read-only and return `Result<T>`.

Pipeline behaviours run in order:
1. `LoggingBehavior` — logs execution time, warns on slow requests (> 500 ms).
2. `ValidationBehavior` — runs FluentValidation; short-circuits with failure result on errors.

## Data Storage

| Concern | Technology |
|---------|-----------|
| Relational data | PostgreSQL 16 via Npgsql EF Core provider |
| Migrations | EF Core Code-First migrations |
| JSON columns | EF Core owned-entity JSON mapping (Sources collections) |

## AI Service

The Python FastAPI service is a sidecar that communicates with OpenAI:

- `POST /api/v1/causal-analysis/` — generates a causal graph from an event description.
- `POST /api/v1/events/summarise` — summarises raw event text.

It is deployed independently and called by the .NET API or directly from the frontend.
