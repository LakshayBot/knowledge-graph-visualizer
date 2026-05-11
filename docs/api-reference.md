# API Reference — CausalExplorer

Base URL: `http://localhost:5001/api/v1`

Interactive docs: `http://localhost:5001/swagger`

---

## Authentication

All write endpoints require a Bearer JWT in the `Authorization` header:

```
Authorization: Bearer <token>
```

Roles: `Guest` · `User` · `Contributor` · `Moderator` · `Admin`

---

## Event Nodes

### `GET /event-nodes`

Returns a paged list of event nodes.

**Query parameters**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `domain` | string (enum) | — | Filter by `EventDomain` |
| `page` | int | 1 | Page number |
| `pageSize` | int | 20 | Items per page (max 100) |

**Response `200`**

```json
{
  "items": [
    {
      "id": "uuid",
      "title": "Fall of the Berlin Wall",
      "summary": "...",
      "eventDate": "1989-11-09T00:00:00Z",
      "domain": "Geopolitics",
      "confidenceScore": 0.95,
      "confidenceLevel": "Established",
      "freshnessScore": 0.80,
      "perspectives": ["Mainstream"],
      "sources": [],
      "isVerified": true,
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "pageNumber": 1,
  "pageSize": 20,
  "totalCount": 1,
  "totalPages": 1,
  "hasPreviousPage": false,
  "hasNextPage": false
}
```

---

### `GET /event-nodes/{id}`

Returns a single event node.

**Response `200`** — EventNodeDto  
**Response `404`** — `{ "errors": ["EventNode '...' was not found."] }`

---

### `POST /event-nodes`

Creates a new event node. Requires role `Contributor` or higher.

**Request body**

```json
{
  "title": "string",
  "summary": "string",
  "eventDate": "2024-01-01T00:00:00Z",
  "domain": "Geopolitics",
  "confidenceScore": 0.75,
  "freshnessScore": 0.90
}
```

**Response `201`** — EventNodeDto  
**Response `400`** — Validation errors

---

### `POST /event-nodes/{id}/verify`

Marks an event node as verified. Requires role `Moderator` or `Admin`.

**Response `204`** — Success  
**Response `400`** — Already verified  
**Response `404`** — Not found

---

## Causal Edges

### `POST /causal-edges`

Adds a directed causal edge. Requires role `Contributor` or higher.

**Request body**

```json
{
  "fromEventId": "uuid",
  "toEventId": "uuid",
  "relationshipType": "DirectlyCaused",
  "strength": 0.85,
  "perspective": "Mainstream",
  "explanation": "string",
  "isContested": false
}
```

**Response `201`** — CausalEdgeDto  
**Response `400`** — Validation error

---

## Health

### `GET /ping`

Liveness probe.

**Response `200`** — `{ "status": "ok", "timestamp": "..." }`

---

## AI Service (`http://localhost:8000/api/v1`)

### `POST /causal-analysis/`

Generates a causal graph using OpenAI.

**Request body**

```json
{
  "event_description": "string",
  "domain": "Geopolitics",
  "perspective": "Mainstream",
  "depth": 3
}
```

**Response `200`** — CausalAnalysisResponse with `root_event`, `related_nodes`, `suggested_edges`.

---

### `POST /events/summarise`

Generates a concise summary from raw event text.

**Request body**

```json
{
  "title": "string",
  "raw_text": "string",
  "domain": "Economics"
}
```

**Response `200`** — `{ "summary": "...", "confidence_score": 0.9, "key_actors": [...] }`
