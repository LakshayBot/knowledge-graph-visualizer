# CasualExplorer — Database Plan

## Phase 1: Interactive Timeline Engine

### Database Impact: NONE

Phase 1 requires **no database schema changes**. The `EventNode` entity already has:
- `EventDate` (DateTime / timestamptz) — used for timeline positioning
- `CreatedAt` (DateTime / timestamptz) — system timestamp

The timeline operates entirely on the frontend by filtering nodes/edges based on the `eventDate` field already present in the data. The graph snapshot JSONB stored in `causal_chains.graph_snapshot` already includes `eventDate` for every node.

### Data Already Available
```json
// Graph Snapshot JSONB (existing structure)
{
  "nodes": [
    {
      "id": "uuid",
      "title": "Financial Crisis",
      "eventDate": "2008-09-15T00:00:00.0000000",
      "domain": "Economics",
      "confidenceScore": 0.85,
      ...
    }
  ],
  "edges": [...]
}
```

No migration needed. No API changes needed. The frontend receives `eventDate` in the `GraphNodeDto` and can extract the year client-side.

---

## Phase 2: Causal Strength System

### Database Impact: MINIMAL

**PostgreSQL `causal_edges`:**
- `strength` column already exists (numeric(5,4), 0-1)
- `relationship_type` column already exists (varchar(50))

No schema changes required. May add:
- Index on `strength` if filtering/sorting by strength is needed

---

## Phase 3: Counterfactual Simulation Engine

### Database Impact: MODERATE

**New PostgreSQL tables:**
```sql
CREATE TABLE simulations (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    chain_id UUID REFERENCES causal_chains(id),
    removed_node_ids UUID[] NOT NULL,
    original_snapshot JSONB NOT NULL,
    simulated_snapshot JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE simulation_comparisons (
    id UUID PRIMARY KEY,
    simulation_id UUID REFERENCES simulations(id),
    metric_name VARCHAR(100) NOT NULL,
    original_value DECIMAL,
    simulated_value DECIMAL,
    delta DECIMAL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## Phase 4: Multiple Theory System

### Database Impact: MODERATE

**New PostgreSQL tables:**
```sql
CREATE TABLE theories (
    id UUID PRIMARY KEY,
    chain_id UUID REFERENCES causal_chains(id),
    title VARCHAR(300) NOT NULL,
    confidence DECIMAL(5,4) NOT NULL DEFAULT 0,
    nodes UUID[] NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## Phases 5-11

Refer to `GRAPH_EVOLUTION_PLAN.md` for the full list of suggested tables. Detailed schema design will be done when each phase is reached.

### Suggested Tables (from GRAPH_EVOLUTION_PLAN.md)
- `graphs` — graph metadata
- `nodes` — (already exists as `event_nodes`)
- `edges` — (already exists as `causal_edges`)
- `timelines` — timeline configurations
- `theories` — competing theories
- `simulations` — counterfactual simulations
- `insights` — discovered hidden insights
- `saved_graphs` — (already exists as `user_saved_chains`)
- `graph_relationships` — connections between graphs
- `user_graphs` — user-specific graph data

---

## Migration Strategy

1. **Always use EF Core migrations** for PostgreSQL changes
2. **Never modify existing migration files** — always create new ones
3. **Migrations must be reversible** (implement both `Up()` and `Down()`)
4. **Test migrations against a copy of production data** before deploying
5. **Neo4j changes** are handled via Cypher scripts in `docker/neo4j/init.cypher`

## Current Table Reference

### PostgreSQL (production database: `CausalExplorerDb`, user: `causal`)

| Table | Primary Key | Foreign Keys | Key Columns |
|-------|-------------|--------------|-------------|
| `event_nodes` | `id` (uuid) | — | `title`, `event_date`, `domain`, `confidence_score`, `is_verified` |
| `causal_edges` | `id` (uuid) | `from_event_id`, `to_event_id` → `event_nodes` | `strength`, `relationship_type`, `perspective`, `is_contested` |
| `causal_chains` | `id` (uuid) | `root_event_id` | `title`, `domain`, `node_count`, `graph_snapshot` (JSONB) |
| `chain_nodes` | `(chain_id, node_id)` | `chain_id` → `causal_chains`, `node_id` → `event_nodes` | — |
| `users` | `id` (uuid) | — | `email`, `username`, `password_hash`, `role` |
| `user_saved_chains` | `id` (uuid) | `user_id` → `users`, `chain_id` → `causal_chains` | `saved_at`, `notes` |
| `user_api_keys` | `id` (uuid) | `user_id` → `users` | `provider`, `encrypted_key`, `is_active` |
| `refresh_tokens` | `id` (uuid) | `user_id` → `users` | `token_hash`, `expires_at`, `is_revoked` |
| `ai_prompt_logs` | `id` (uuid) | — | `provider`, `model`, `prompt`, `response`, `tokens_used`, `cost` |

### Neo4j (graph database)

| Element | Type | Properties |
|---------|------|------------|
| `EventNode` | Node label | `id` (unique), `title`, `summary`, `eventDate`, `domain`, `confidenceScore`, `freshnessScore`, `perspectives`, `isVerified`, `createdAt`, `updatedAt` |
| `CAUSED` | Relationship | `id` (unique), `strength`, `relationshipType`, `perspective`, `explanation`, `isContested`, `createdAt`, `updatedAt` |
| `CausalChain` | Node label (seed data) | `id` (unique), `name`, `description`, `rootEventId` |
