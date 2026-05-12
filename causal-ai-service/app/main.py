"""
CausalExplorer AI Service
FastAPI sidecar that:
  - Uses Grok (xAI API) for on-demand causal knowledge-graph generation.
  - Uses Ollama (local) ONLY for dense vector embeddings (nomic-embed-text → Qdrant).

Generation modes (GENERATION_MODE env var):
  minimal  → grok-3-mini, 1500 max_tokens, temp 0.2  [default — lowest token cost]
  balanced → grok-3,      3000 max_tokens, temp 0.3
  quality  → grok-3,      6000 max_tokens, temp 0.4
"""
from __future__ import annotations

import json
import asyncio
import logging
import os
import re
import time
import uuid
from typing import Any

import httpx
import structlog
from fastapi import BackgroundTasks, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from qdrant_client import QdrantClient
from qdrant_client.http.exceptions import UnexpectedResponse
from qdrant_client.models import Distance, VectorParams
from tenacity import retry, stop_after_attempt, wait_exponential

# ── Configuration ──────────────────────────────────────────────────────────────

OLLAMA_URL      = os.getenv("OLLAMA_URL",      "http://localhost:11434")
QDRANT_URL      = os.getenv("QDRANT_URL",      "http://localhost:6333")
EMBED_MODEL     = os.getenv("EMBED_MODEL",     "nomic-embed-text")
LOG_LEVEL       = os.getenv("LOG_LEVEL",       "INFO")

# Grok / xAI
GROK_API_KEY    = os.getenv("GROK_API_KEY",    "")
GROK_API_URL    = "https://api.x.ai/v1/chat/completions"
GENERATION_MODE = os.getenv("GENERATION_MODE", "minimal").lower()

# Profile table: mode → (model, max_tokens, temperature)
_GROK_PROFILES: dict[str, dict] = {
    "minimal":  {"model": "grok-3-mini", "max_tokens": 3000, "temperature": 0.2},
    "balanced": {"model": "grok-3",      "max_tokens": 4000, "temperature": 0.3},
    "quality":  {"model": "grok-3",      "max_tokens": 6000, "temperature": 0.4},
}
# Fall back to minimal if an unknown mode is set
_GROK_PROFILE = _GROK_PROFILES.get(GENERATION_MODE, _GROK_PROFILES["minimal"])

COLLECTION  = "causal_events"
VECTOR_DIM  = 768   # nomic-embed-text output dimension

# In-memory caches
_KG_CACHE: dict[str, tuple[dict, float]] = {}
KG_CACHE_TTL_SECONDS = 3600   # 1 hour

_JOB_STORE: dict[str, dict] = {}

structlog.configure(wrapper_class=structlog.make_filtering_bound_logger(
    getattr(logging, LOG_LEVEL.upper(), logging.INFO)
))
log = structlog.get_logger()

# ── FastAPI app ────────────────────────────────────────────────────────────────

app = FastAPI(
    title="CausalExplorer AI Service",
    version="2.0.0",
    description=(
        "Grok-powered causal knowledge-graph generation. "
        "Ollama used exclusively for local vector embeddings."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Qdrant collection bootstrap ────────────────────────────────────────────────

@app.on_event("startup")
async def startup_event() -> None:
    qdrant = QdrantClient(url=QDRANT_URL)
    try:
        qdrant.create_collection(
            collection_name=COLLECTION,
            vectors_config=VectorParams(size=VECTOR_DIM, distance=Distance.COSINE),
        )
        log.info("qdrant.collection.created", name=COLLECTION)
    except UnexpectedResponse as exc:
        if exc.status_code == 409:
            log.info("qdrant.collection.exists", name=COLLECTION)
        else:
            raise
    log.info(
        "ai_service.startup",
        generation_mode=GENERATION_MODE,
        grok_model=_GROK_PROFILE["model"],
        max_tokens=_GROK_PROFILE["max_tokens"],
        grok_key_set=bool(GROK_API_KEY),
    )

# ── Pydantic models ────────────────────────────────────────────────────────────

class ExtractEventsRequest(BaseModel):
    text: str

class ExtractedEventItem(BaseModel):
    title:      str
    summary:    str
    event_date: str
    domain:     str

class ExtractEventsResponse(BaseModel):
    events: list[ExtractedEventItem]

class GenerateCausalLinkRequest(BaseModel):
    from_event_id: uuid.UUID
    to_event_id:   uuid.UUID

class CausalLinkResponse(BaseModel):
    explanation:  str
    strength:     float = Field(ge=0.0, le=1.0)
    is_contested: bool

class ExpandChainRequest(BaseModel):
    node_id:            uuid.UUID
    perspective:        str = "Economic"
    already_loaded_ids: list[uuid.UUID] = Field(default_factory=list)

class SuggestedNode(BaseModel):
    title:             str
    summary:           str
    relationship_type: str
    direction:         str

class ExpandChainResponse(BaseModel):
    suggested_nodes: list[SuggestedNode]

class SearchSimilarRequest(BaseModel):
    query: str
    top_k: int = 10

class SimilarEventResult(BaseModel):
    event_id:               uuid.UUID
    title:                  str
    summary:                str
    domain:                 str
    confidence_score:       float
    confidence_level_label: str
    is_verified:            bool
    event_date:             str
    created_at:             str

class SearchSimilarResponse(BaseModel):
    results: list[SimilarEventResult]

class EmbeddingRequest(BaseModel):
    text: str

class EmbeddingResponse(BaseModel):
    embedding: list[float]

class GenerateGraphRequest(BaseModel):
    topic:        str = Field(..., min_length=3, max_length=300)
    mode:         str = Field(default="minimal")   # minimal | balanced | quality
    event_count:  int = Field(default=8, ge=3, le=20)
    max_articles: int = Field(default=3, ge=1, le=5)   # kept for API compat; ignored by Grok path

class GeneratedEventNode(BaseModel):
    id:               str
    title:            str
    summary:          str
    event_date:       str
    domain:           str
    confidence_score: float = Field(ge=0.0, le=1.0)
    freshness_score:  float = Field(ge=0.0, le=1.0)
    source_url:       str
    source_title:     str

class GeneratedEdge(BaseModel):
    from_event_id:     str
    to_event_id:       str
    relationship_type: str
    strength:          float = Field(ge=0.0, le=1.0)
    perspective:       str
    explanation:       str
    is_contested:      bool = False

class GenerateGraphResponse(BaseModel):
    topic:       str
    events:      list[GeneratedEventNode]
    edges:       list[GeneratedEdge]
    source_urls: list[str]
    from_cache:  bool = False

class GraphJobSubmittedResponse(BaseModel):
    job_id: str
    status: str = "pending"

class GraphJobStatusResponse(BaseModel):
    job_id: str
    status: str
    result: GenerateGraphResponse | None = None
    error:  str | None                   = None

# ── Validation helpers ─────────────────────────────────────────────────────────

_VALID_DOMAINS = {
    "Geopolitics", "Economics", "Technology",
    "Social", "Environmental", "Military", "Cultural",
}
_VALID_RELATIONSHIP_TYPES = {
    "DirectlyCaused", "EnabledConditionsFor", "ContributedTo", "Correlated", "Contested",
}
_VALID_PERSPECTIVES = {
    "Mainstream", "Geopolitical", "Structural", "Economic", "Revisionist",
}


def _coerce_domain(raw: str) -> str:
    mapping = {
        "economic": "Economics", "trade": "Economics", "finance": "Economics",
        "geopolitical": "Geopolitics", "political": "Geopolitics", "politics": "Geopolitics",
        "technological": "Technology", "tech": "Technology",
        "societal": "Social", "society": "Social", "humanitarian": "Social",
        "environmental": "Environmental", "climate": "Environmental", "ecology": "Environmental",
        "military": "Military", "defence": "Military", "defense": "Military", "conflict": "Military",
        "cultural": "Cultural", "culture": "Cultural",
    }
    if raw.strip() in _VALID_DOMAINS:
        return raw.strip()
    return mapping.get(raw.strip().lower(), "Geopolitics")


def _coerce_relationship_type(raw: str) -> str:
    mapping = {
        "causes": "DirectlyCaused", "caused": "DirectlyCaused", "directly caused": "DirectlyCaused",
        "enables": "EnabledConditionsFor", "enabled": "EnabledConditionsFor",
        "contributes": "ContributedTo", "contributed": "ContributedTo",
        "correlated": "Correlated", "correlation": "Correlated",
        "contested": "Contested",
    }
    if raw.strip() in _VALID_RELATIONSHIP_TYPES:
        return raw.strip()
    return mapping.get(raw.strip().lower(), "ContributedTo")


def _coerce_perspective(raw: str) -> str:
    mapping = {
        "mainstream": "Mainstream", "consensus": "Mainstream",
        "geopolitical": "Geopolitical",
        "structural": "Structural", "systemic": "Structural",
        "economic": "Economic", "financial": "Economic",
        "revisionist": "Revisionist", "alternative": "Revisionist",
    }
    if raw.strip() in _VALID_PERSPECTIVES:
        return raw.strip()
    return mapping.get(raw.strip().lower(), "Mainstream")


def _safe_date(raw: str) -> str:
    raw = raw.strip()
    match = re.search(r'\d{4}-\d{2}-\d{2}', raw)
    if match:
        return match.group()
    match = re.search(r'\d{4}', raw)
    if match:
        return f"{match.group()}-01-01"
    return "2000-01-01"


def _parse_json_from_llm(raw: str, array: bool = True) -> Any:
    raw = re.sub(r"```(?:json)?", "", raw).strip()
    pattern = r'\[.*\]' if array else r'\{.*\}'
    match = re.search(pattern, raw, re.DOTALL)
    if not match:
        raise ValueError(f"No JSON {'array' if array else 'object'} found in LLM output.")
    text = match.group()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Grok truncated the response mid-token (max_tokens hit).
        # Attempt to salvage complete objects by truncating at the last valid
        # complete JSON object boundary.
        if array:
            # Find the last complete object: trim after last '}' then close the array.
            last_brace = text.rfind('}')
            if last_brace == -1:
                raise ValueError("Truncated JSON array with no complete objects.")
            salvaged = text[:last_brace + 1] + "]"
            try:
                result = json.loads(salvaged)
                log.warning("json.salvaged_truncated_array", original_len=len(text), salvaged_len=len(salvaged))
                return result
            except json.JSONDecodeError as inner:
                raise ValueError(f"Could not salvage truncated JSON array: {inner}") from inner
        else:
            # For objects, find last complete key-value pair boundary.
            # Try to close the object after the last complete value.
            last_comma = text.rfind(',')
            if last_comma != -1:
                salvaged = text[:last_comma] + "}"
                try:
                    result = json.loads(salvaged)
                    log.warning("json.salvaged_truncated_object", original_len=len(text), salvaged_len=len(salvaged))
                    return result
                except json.JSONDecodeError:
                    pass
            raise ValueError(f"Could not salvage truncated JSON object.")

# ── Cache helpers ──────────────────────────────────────────────────────────────

def _cache_key(topic: str) -> str:
    return re.sub(r'\s+', ' ', topic.lower().strip())


def _cache_get(topic: str) -> dict | None:
    key = _cache_key(topic)
    entry = _KG_CACHE.get(key)
    if entry and (time.time() - entry[1]) < KG_CACHE_TTL_SECONDS:
        return entry[0]
    return None


def _cache_set(topic: str, payload: dict) -> None:
    _KG_CACHE[_cache_key(topic)] = (payload, time.time())

# ── Ollama — embeddings only ───────────────────────────────────────────────────

@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
async def _ollama_embed(text: str) -> list[float]:
    """Generate a dense embedding vector via local Ollama (nomic-embed-text)."""
    async with httpx.AsyncClient(base_url=OLLAMA_URL, timeout=60) as client:
        resp = await client.post("/api/embeddings", json={
            "model":  EMBED_MODEL,
            "prompt": text,
        })
        resp.raise_for_status()
        return resp.json()["embedding"]

# ── Grok — graph generation ────────────────────────────────────────────────────

@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=30))
async def _grok_generate(prompt: str, profile: dict | None = None) -> str:
    """
    Call the xAI Grok chat-completions API.
    If profile is provided it overrides the global GENERATION_MODE profile,
    allowing per-request model/token selection.

    Timeout scales with max_tokens: ~0.04 s/token, minimum 90 s.
    """
    if not GROK_API_KEY:
        raise RuntimeError(
            "GROK_API_KEY is not set. Add it to your .env file and restart the service."
        )
    p = profile or _GROK_PROFILE
    api_timeout = max(90, int(p.get("max_tokens", 3000) * 0.04))
    headers = {
        "Authorization": f"Bearer {GROK_API_KEY}",
        "Content-Type":  "application/json",
    }
    body = {
        "model":       p["model"],
        "max_tokens":  p["max_tokens"],
        "temperature": p["temperature"],
        "messages": [
            {"role": "user", "content": prompt},
        ],
    }
    async with httpx.AsyncClient(timeout=api_timeout) as client:
        resp = await client.post(GROK_API_URL, headers=headers, json=body)
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]


def _build_graph_prompt(topic: str, mode: str = "minimal", event_count: int = 8) -> str:
    """
    Build the single-shot prompt sent to Grok.
    Uses per-request mode and event_count for tight/rich output budgets.
    """
    edge_min = max(3, event_count - 2)
    edge_max = min(event_count * 2, 30)

    if mode == "minimal":
        summary_len = "≤150 chars"
        expl_len    = "≤100 chars"
    elif mode == "balanced":
        summary_len = "≤250 chars"
        expl_len    = "≤200 chars"
    else:  # quality
        summary_len = "≤400 chars"
        expl_len    = "≤300 chars"

    return f"""You are a causal analyst building a knowledge graph. Topic: "{topic}"

Return ONLY a raw JSON object (no markdown, no explanation) with exactly two keys:

"events": array of EXACTLY {event_count} objects, each with:
  "title"            : short descriptive title (≤120 chars)
  "summary"          : what happened and why it matters ({summary_len})
  "event_date"       : best known date YYYY-MM-DD (use YYYY-01-01 if only year is known)
  "domain"           : one of Geopolitics|Economics|Technology|Social|Environmental|Military|Cultural
  "confidence_score" : float 0.4–0.95 (how well-established)
  "source_url"       : URL of a reputable source (Wikipedia, major news outlet, or https://x.com/... post)

"edges": array of {edge_min} to {edge_max} objects, each with:
  "from_index"        : 0-based index into events array (cause)
  "to_index"          : 0-based index into events array (effect)
  "relationship_type" : one of DirectlyCaused|EnabledConditionsFor|ContributedTo|Correlated|Contested
  "strength"          : float 0.0–1.0
  "perspective"       : one of Mainstream|Geopolitical|Structural|Economic|Revisionist
  "explanation"       : causal mechanism ({expl_len})
  "is_contested"      : true or false

Rules:
- from_index must NOT equal to_index
- All indexes must be valid (0 to len(events)-1)
- Raw JSON only — no ```json fences, no prose before or after"""


async def _run_graph_generation(topic: str, mode: str = "minimal", event_count: int = 8) -> GenerateGraphResponse:
    """
    Core pipeline: single Grok API call → parse events + edges → cache → return.
    Uses per-request mode and event_count instead of the server-wide default.
    """
    cached = _cache_get(topic)
    if cached:
        return GenerateGraphResponse(**cached, from_cache=True)

    profile = _GROK_PROFILES.get(mode, _GROK_PROFILES["minimal"])
    prompt  = _build_graph_prompt(topic, mode=mode, event_count=event_count)
    log.info("grok.generate.start", topic=topic, mode=mode, model=profile["model"], event_count=event_count)

    try:
        raw = await _grok_generate(prompt, profile=profile)
    except Exception as exc:
        raise HTTPException(502, f"Grok API call failed: {exc}") from exc

    log.info("grok.generate.response_received", chars=len(raw))

    # Parse the top-level JSON object
    try:
        data = _parse_json_from_llm(raw, array=False)
    except Exception as exc:
        raise HTTPException(502, f"Failed to parse Grok JSON response: {exc}\nRaw: {raw[:300]}") from exc

    raw_events: list[dict] = data.get("events", [])
    raw_edges:  list[dict] = data.get("edges",  [])

    if not raw_events:
        raise HTTPException(502, "Grok returned no events for the given topic.")

    # Build validated EventNode list
    events: list[GeneratedEventNode] = []
    for e in raw_events:
        src_url = str(e.get("source_url", "")).strip() or f"https://en.wikipedia.org/wiki/{topic.replace(' ', '_')}"
        events.append(GeneratedEventNode(
            id               = str(uuid.uuid4()),
            title            = str(e.get("title", "Untitled Event"))[:200],
            summary          = str(e.get("summary", ""))[:2000],
            event_date       = _safe_date(str(e.get("event_date", "2000-01-01"))),
            domain           = _coerce_domain(str(e.get("domain", "Geopolitics"))),
            confidence_score = float(max(0.0, min(0.95, e.get("confidence_score", 0.5)))),
            freshness_score  = 0.5,
            source_url       = src_url,
            source_title     = str(e.get("title", ""))[:200],
        ))

    # Build validated edge list
    edges: list[GeneratedEdge] = []
    for re_dict in raw_edges:
        try:
            fi = int(re_dict.get("from_index", -1))
            ti = int(re_dict.get("to_index",   -1))
            if fi < 0 or ti < 0 or fi >= len(events) or ti >= len(events) or fi == ti:
                continue
            edges.append(GeneratedEdge(
                from_event_id     = events[fi].id,
                to_event_id       = events[ti].id,
                relationship_type = _coerce_relationship_type(str(re_dict.get("relationship_type", "ContributedTo"))),
                strength          = float(max(0.0, min(1.0, re_dict.get("strength", 0.5)))),
                perspective       = _coerce_perspective(str(re_dict.get("perspective", "Mainstream"))),
                explanation       = str(re_dict.get("explanation", "Causal link inferred by Grok."))[:1000],
                is_contested      = bool(re_dict.get("is_contested", False)),
            ))
        except Exception as exc:
            log.warning("graph.edge_skipped", error=str(exc))

    # Deduplicate source URLs from events
    seen: set[str] = set()
    source_urls: list[str] = []
    for ev in events:
        if ev.source_url and ev.source_url not in seen:
            seen.add(ev.source_url)
            source_urls.append(ev.source_url)

    log.info("grok.generate.done", events=len(events), edges=len(edges), sources=len(source_urls))

    payload = {
        "topic":       topic,
        "events":      [e.model_dump() for e in events],
        "edges":       [ed.model_dump() for ed in edges],
        "source_urls": source_urls,
    }
    _cache_set(topic, payload)
    return GenerateGraphResponse(**payload, from_cache=False)

# ── Async job runner ───────────────────────────────────────────────────────────

async def _job_worker(job_id: str, topic: str, mode: str, event_count: int) -> None:
    _JOB_STORE[job_id]["status"] = "running"
    try:
        result = await _run_graph_generation(topic, mode=mode, event_count=event_count)
        _JOB_STORE[job_id]["status"] = "done"
        _JOB_STORE[job_id]["result"] = result
    except Exception as exc:
        log.error("graph.job.failed", job_id=job_id, error=str(exc))
        _JOB_STORE[job_id]["status"] = "error"
        _JOB_STORE[job_id]["error"]  = str(exc)

# ── Endpoints ──────────────────────────────────────────────────────────────────

@app.get("/health", tags=["ops"])
async def health() -> dict:
    return {
        "status":          "ok",
        "generation_mode": GENERATION_MODE,
        "grok_model":      _GROK_PROFILE["model"],
        "grok_key_set":    bool(GROK_API_KEY),
        "embed_model":     EMBED_MODEL,
    }


@app.post("/api/embeddings", response_model=EmbeddingResponse, tags=["embeddings"])
async def get_embedding(body: EmbeddingRequest, request: Request) -> EmbeddingResponse:
    """Generate a dense vector embedding via local Ollama (nomic-embed-text)."""
    vector = await _ollama_embed(body.text)
    return EmbeddingResponse(embedding=vector)


@app.post("/api/events/extract", response_model=ExtractEventsResponse, tags=["events"])
async def extract_events(body: ExtractEventsRequest, request: Request) -> ExtractEventsResponse:
    """Extract structured events from free text using Grok."""
    prompt = (
        f'Extract causal events from the text below about this context.\n'
        f'Return ONLY a JSON array of objects with fields: '
        f'title, summary, event_date (YYYY-MM-DD), '
        f'domain (Geopolitics|Economics|Technology|Social|Environmental|Military|Cultural).\n'
        f'No markdown. Raw JSON array only.\n\nText:\n{body.text}\n\nJSON:'
    )
    raw    = await _grok_generate(prompt)
    events = _parse_json_from_llm(raw, array=True)
    return ExtractEventsResponse(events=[ExtractedEventItem(**e) for e in events])


@app.post("/api/causal/generate", response_model=CausalLinkResponse, tags=["causal"])
async def generate_causal_link(body: GenerateCausalLinkRequest, request: Request) -> CausalLinkResponse:
    """Analyse the causal relationship between two events using Grok."""
    prompt = (
        f'Analyse the causal relationship from event {body.from_event_id} to event {body.to_event_id}.\n'
        f'Return ONLY a JSON object: {{"explanation": "...", "strength": 0.0-1.0, "is_contested": true|false}}\n'
        f'No markdown. Raw JSON only.'
    )
    raw  = await _grok_generate(prompt)
    data = _parse_json_from_llm(raw, array=False)
    return CausalLinkResponse(**data)


@app.post("/api/chain/expand", response_model=ExpandChainResponse, tags=["chain"])
async def expand_chain_node(body: ExpandChainRequest, request: Request) -> ExpandChainResponse:
    """Suggest connected causal events for chain expansion using Grok."""
    prompt = (
        f'From a {body.perspective} perspective, suggest 3-5 causal events connected to node {body.node_id}.\n'
        f'Exclude IDs: {", ".join(str(i) for i in body.already_loaded_ids)}.\n'
        f'Return ONLY a JSON array: [{{"title": "...", "summary": "...", '
        f'"relationship_type": "CAUSES|CONTRIBUTES_TO|ENABLES|PREVENTS", '
        f'"direction": "outgoing|incoming"}}]\n'
        f'No markdown. Raw JSON array only.'
    )
    raw   = await _grok_generate(prompt)
    nodes = _parse_json_from_llm(raw, array=True)
    return ExpandChainResponse(suggested_nodes=[SuggestedNode(**n) for n in nodes])


@app.post("/api/search/similar", response_model=list[SimilarEventResult], tags=["search"])
async def search_similar(body: SearchSimilarRequest, request: Request) -> list[SimilarEventResult]:
    """Semantic similarity search via Ollama embeddings + Qdrant."""
    embedding = await _ollama_embed(body.query)
    qdrant    = QdrantClient(url=QDRANT_URL)
    hits      = qdrant.search(
        collection_name=COLLECTION,
        query_vector=embedding,
        limit=body.top_k,
        with_payload=True,
    )
    results = []
    for hit in hits:
        p = hit.payload or {}
        results.append(SimilarEventResult(
            event_id               = uuid.UUID(p.get("event_id", str(uuid.uuid4()))),
            title                  = p.get("title", ""),
            summary                = p.get("summary", ""),
            domain                 = p.get("domain", ""),
            confidence_score       = float(p.get("confidence_score", 0.5)),
            confidence_level_label = p.get("confidence_level_label", "Medium"),
            is_verified            = bool(p.get("is_verified", False)),
            event_date             = p.get("event_date", "1970-01-01"),
            created_at             = p.get("created_at", "1970-01-01T00:00:00Z"),
        ))
    return results


@app.post(
    "/api/graph/generate",
    response_model=GraphJobSubmittedResponse,
    status_code=202,
    tags=["graph"],
)
async def generate_knowledge_graph(
    body: GenerateGraphRequest,
    request: Request,
    background_tasks: BackgroundTasks,
) -> GraphJobSubmittedResponse:
    """
    Submit an async knowledge-graph generation job (Grok-powered).
    Returns job_id immediately (HTTP 202). Poll GET /api/graph/jobs/{job_id}.
    Cache hits resolve synchronously.
    """
    log.info("graph.generate.submit", topic=body.topic, mode=body.mode, event_count=body.event_count)

    cached = _cache_get(body.topic)
    if cached:
        job_id = str(uuid.uuid4())
        result = GenerateGraphResponse(**cached, from_cache=True)
        _JOB_STORE[job_id] = {"status": "done", "result": result, "error": None}
        log.info("graph.generate.cache_hit", topic=body.topic, job_id=job_id)
        return GraphJobSubmittedResponse(job_id=job_id, status="done")

    job_id = str(uuid.uuid4())
    _JOB_STORE[job_id] = {"status": "pending", "result": None, "error": None}
    background_tasks.add_task(_job_worker, job_id, body.topic, body.mode, body.event_count)
    log.info("graph.generate.job_queued", topic=body.topic, job_id=job_id)
    return GraphJobSubmittedResponse(job_id=job_id, status="pending")


@app.get("/api/graph/jobs/{job_id}", response_model=GraphJobStatusResponse, tags=["graph"])
async def get_graph_job_status(job_id: str) -> GraphJobStatusResponse:
    """Poll the status of a knowledge-graph generation job."""
    job = _JOB_STORE.get(job_id)
    if job is None:
        raise HTTPException(404, f"Job '{job_id}' not found.")
    return GraphJobStatusResponse(
        job_id=job_id,
        status=job["status"],
        result=job.get("result"),
        error=job.get("error"),
    )
