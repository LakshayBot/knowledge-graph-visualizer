# Architecture — CasualExplorer

## Overview

CasualExplorer follows **Clean Architecture** (Uncle Bob), ensuring the domain model
has no outward dependencies and all cross-cutting concerns are pushed to the outer rings.

```
┌──────────────────────────────────────────────────────────┐
│  Presentation  │  CasualExplorer.API  (ASP.NET Core 8)   │
├──────────────────────────────────────────────────────────┤
│  Application   │  CasualExplorer.Application              │
│                │  (MediatR, CQRS, FluentValidation)       │
├──────────────────────────────────────────────────────────┤
│  Domain        │  CasualExplorer.Domain                   │
│                │  (Entities, Value Objects, Domain Events) │
├──────────────────────────────────────────────────────────┤
│  Infrastructure│  CasualExplorer.Infrastructure           │
│                │  (EF Core / PostgreSQL, Repositories)    │
└──────────────────────────────────────────────────────────┘
        ↕  HTTP / gRPC (future)
┌──────────────────────────────────────────────────────────┐
│  AI Service    │  CasualExplorer.AI  (Python FastAPI)     │
│                │  (OpenAI integration, casual analysis)   │
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
| `CasualExplorer.Domain` | Domain | Entities, Value Objects, Domain Events, Repository Interfaces |
| `CasualExplorer.Application` | Application | Commands, Queries, Handlers, Validators, Pipeline Behaviours |
| `CasualExplorer.Infrastructure` | Infrastructure | EF Core DbContext, Repository implementations, Unit of Work |
| `CasualExplorer.API` | Presentation | ASP.NET Core controllers, middleware, DI wiring, Swagger |
| `CasualExplorer.AI` | External Service | FastAPI, OpenAI integration, casual graph generation |

## Domain Model

### Entities

- **EventNode** — a single historical event in the knowledge graph.
- **CasualEdge** — a directed casual relationship between two EventNodes.
- **CasualChain** — a curated, named path through the graph rooted at one event.
- **User** — a registered platform user with role-based access.
- **UserSavedChain** — join table recording a user's saved chains.

### Value Objects

- **Source** — URL + metadata for a supporting document. Structurally compared.
- **ConfidenceLevel** — wraps a `decimal` score and derives a `ConfidenceLevelKind` enum.

### Enums

| Enum | Values |
|------|--------|
| `EventDomain` | Geopolitics, Economics, Technology, Social, Environmental, Military, Cultural |
| `CasualRelationshipType` | DirectlyCaused, EnabledConditionsFor, ContributedTo, Contested, Correlated |
| `Perspective` | Mainstream, Geopolitical, Structural, Economic, Revisionist |
| `UserRole` | Guest, User, Contributor, Moderator, Admin |
| `SourceType` | News, Academic, Government, ThinkTank |

### Domain Events

| Event | Trigger |
|-------|---------|
| `EventNodeCreatedDomainEvent` | `EventNode.Create(...)` |
| `EventNodeVerifiedDomainEvent` | `EventNode.Verify(...)` |
| `CasualEdgeAddedDomainEvent` | `CasualEdge.Create(...)` |
| `ChainUpdatedDomainEvent` | `CasualChain.IncrementNodeCount()` / `DecrementNodeCount()` |

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

- `POST /api/v1/casual-analysis/` — generates a casual graph from an event description.
- `POST /api/v1/events/summarise` — summarises raw event text.

It is deployed independently and called by the .NET API or directly from the frontend.
