"""
CasualExplorer AI Service
FastAPI sidecar that:
  - Uses multiple LLM providers (Grok, OpenAI, Claude, Gemini, Copilot, Ollama)
    for on-demand casual knowledge-graph generation.
  - Uses Ollama (local) ONLY for dense vector embeddings (nomic-embed-text → Qdrant).

BYOK (Bring Your Own Key): clients send X-User-Api-Key, X-Provider, X-Model headers.
If no per-user key is provided for a key-requiring provider, the request is
automatically redirected to the LOCAL Ollama provider (free, private).
Server-wide cloud API keys (GROK_API_KEY etc.) are NEVER used for generation.

Generation modes (preserved for backward compat):
  minimal  → grok-3-mini, 4000 max_tokens, temp 0.2  [fast, cost-efficient]
  balanced → grok-3,      6000 max_tokens, temp 0.3  [detailed, well-rounded]
  quality  → grok-3,      8000 max_tokens, temp 0.4  [comprehensive, in-depth]
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

import asyncpg
import httpx
import structlog
from fastapi import BackgroundTasks, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from qdrant_client import QdrantClient
from qdrant_client.http.exceptions import UnexpectedResponse
from qdrant_client.models import Distance, VectorParams
from tenacity import retry, stop_after_attempt, wait_exponential

from app.providers import (
    PROVIDERS,
    get_provider,
    list_providers,
    generate_with_provider,
)

# ── Configuration ──────────────────────────────────────────────────────────────

OLLAMA_URL      = os.getenv("OLLAMA_URL",      "http://localhost:11434")
QDRANT_URL      = os.getenv("QDRANT_URL",      "http://localhost:6333")
EMBED_MODEL     = os.getenv("EMBED_MODEL",     "nomic-embed-text")
LOG_LEVEL       = os.getenv("LOG_LEVEL",       "INFO")

# Server-wide fallback API keys (used when no per-user key is provided)
GROK_API_KEY       = os.getenv("GROK_API_KEY",       "")
OPENAI_API_KEY     = os.getenv("OPENAI_API_KEY",     "")
ANTHROPIC_API_KEY  = os.getenv("ANTHROPIC_API_KEY",  "")
GEMINI_API_KEY     = os.getenv("GEMINI_API_KEY",     "")
COPILOT_API_KEY    = os.getenv("COPILOT_API_KEY",    "")
GENERATION_MODE    = os.getenv("GENERATION_MODE",    "minimal").lower()

# Legacy profile table — kept for backward compat
_GROK_PROFILES: dict[str, dict] = {
    "minimal":  {"model": "grok-3-mini", "max_tokens": 4000, "temperature": 0.2},
    "balanced": {"model": "grok-3",      "max_tokens": 6000, "temperature": 0.3},
    "quality":  {"model": "grok-3",      "max_tokens": 8000, "temperature": 0.4},
}
_GROK_PROFILE = _GROK_PROFILES.get(GENERATION_MODE, _GROK_PROFILES["minimal"])

# BYOK-only fallback: when a user has no API key configured, requests to
# key-requiring providers are redirected to the local Ollama provider.
LOCAL_FALLBACK_PROVIDER = "ollama"
LOCAL_FALLBACK_MODEL    = os.getenv("OLLAMA_MODEL", "llama3.2")

# PostgreSQL (for AI prompt/response audit logging)
POSTGRES_URL    = os.getenv("POSTGRES_URL", "postgresql://causal:postgres@localhost:5432/CausalExplorerDb")

COLLECTION  = "casual_events"
VECTOR_DIM  = 768   # nomic-embed-text output dimension

# In-memory caches
_KG_CACHE: dict[str, tuple[dict, float]] = {}
KG_CACHE_TTL_SECONDS = 3600   # 1 hour

# PostgreSQL connection pool (lazy init)
_DB_POOL: asyncpg.Pool | None = None

_JOB_STORE: dict[str, dict] = {}

structlog.configure(wrapper_class=structlog.make_filtering_bound_logger(
    getattr(logging, LOG_LEVEL.upper(), logging.INFO)
))
log = structlog.get_logger()


# ── Resolve AI parameters from request ─────────────────────────────────────────

def _resolve_ai_params(request: Request, body_provider: str | None = None, body_model: str | None = None) -> dict:
    """
    Resolve provider, model, and API key from request headers + body.
    Priority: request headers (BYOK) > body fields > local Ollama fallback.

    When the resolved provider requires an API key and the user supplied none,
    the request is redirected to the local Ollama provider (never server-wide keys).
    """
    # 1. Determine provider
    provider = (
        request.headers.get("X-Provider")
        or body_provider
        or "grok"
    ).lower().strip()

    # 2. Determine model
    model = (
        request.headers.get("X-Model")
        or body_model
        or ""
    ).strip()
    if not model and provider in PROVIDERS:
        # Pick first available model for this provider
        first = next(iter(PROVIDERS[provider].models), None)
        if first:
            model = first
    if not model:
        model = "grok-3-mini"  # ultimate fallback

    # 3. Determine API key (BYOK only — server-wide keys are never used)
    api_key = (request.headers.get("X-User-Api-Key") or "").strip()
    has_user_context = bool((request.headers.get("X-User-Id") or "").strip())

    provider_config = get_provider(provider)
    if provider_config and provider_config.requires_key and not api_key:
        # BYOK-only: no user key for a paid provider → redirect to local Ollama.
        log.info(
            "llm.byok.fallback_to_local",
            provider=provider,
            requested_model=model,
            local_model=LOCAL_FALLBACK_MODEL,
            user_context=has_user_context,
        )
        provider = LOCAL_FALLBACK_PROVIDER
        provider_config = get_provider(provider)
        model = model if model in (provider_config.models if provider_config else {}) else LOCAL_FALLBACK_MODEL

    # 4. Validate: if provider requires a key and we still don't have one, fail early
    if provider_config and provider_config.requires_key and not api_key:
        if has_user_context:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"API key required for {provider_config.display_name}. "
                    f"Please add your {provider_config.display_name} API key in "
                    f"Settings → API Keys, or ask your administrator to configure "
                    f"a server-wide key."
                ),
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"No API key available for {provider_config.display_name}. "
                    f"The server-wide {provider_config.env_key_name} environment variable "
                    f"is not configured. Please add your own API key in Settings → API Keys."
                ),
            )

    user_id = (request.headers.get("X-User-Id") or "").strip() or None
    return {"provider": provider, "model": model, "api_key": api_key, "user_id": user_id}


# ── PostgreSQL helpers ──────────────────────────────────────────────────────────

async def _ensure_pool() -> asyncpg.Pool:
    global _DB_POOL
    if _DB_POOL is None:
        _DB_POOL = await asyncpg.create_pool(dsn=POSTGRES_URL, min_size=1, max_size=4)
    return _DB_POOL


async def _log_prompt(
    endpoint: str,
    prompt: str,
    response: str | None,
    model: str,
    max_tokens: int,
    temperature: float,
    duration_ms: int,
    error: str | None,
    input_tokens: int | None = None,
    output_tokens: int | None = None,
    cost_usd: float | None = None,
    provider: str = "grok",
    user_id: str | None = None,
    domain: str | None = None,
) -> None:
    """Log prompt/response to PostgreSQL for audit and cost tracking."""
    try:
        pool = await _ensure_pool()
        async with pool.acquire() as conn:
            # Try inserting with all columns (provider, user_id, domain)
            try:
                await conn.execute(
                    """INSERT INTO ai_prompt_logs (endpoint, prompt, response, model, max_tokens, temperature, duration_ms, error, input_tokens, output_tokens, cost_usd, provider, user_id, domain)
                       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)""",
                    endpoint, prompt, response, model, max_tokens, temperature, duration_ms, error,
                    input_tokens, output_tokens, cost_usd, provider, user_id, domain,
                )
            except Exception:
                # Fall back to provider + user_id without domain
                try:
                    await conn.execute(
                        """INSERT INTO ai_prompt_logs (endpoint, prompt, response, model, max_tokens, temperature, duration_ms, error, input_tokens, output_tokens, cost_usd, provider, user_id)
                           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)""",
                        endpoint, prompt, response, model, max_tokens, temperature, duration_ms, error,
                        input_tokens, output_tokens, cost_usd, provider, user_id,
                    )
                except Exception:
                    # Fall back to original columns if migration hasn't run yet
                    await conn.execute(
                        """INSERT INTO ai_prompt_logs (endpoint, prompt, response, model, max_tokens, temperature, duration_ms, error, input_tokens, output_tokens, cost_usd)
                           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)""",
                        endpoint, prompt, response, model, max_tokens, temperature, duration_ms, error,
                        input_tokens, output_tokens, cost_usd,
                    )
    except Exception:
        log.exception("ai_prompt_log.write_failed", endpoint=endpoint)


# ── FastAPI app ────────────────────────────────────────────────────────────────

app = FastAPI(
    title="CasualExplorer AI Service",
    version="3.0.0",
    description=(
        "Multi-provider casual knowledge-graph generation. "
        "Supports Grok, OpenAI, Claude, Gemini, Copilot, and local Ollama. "
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

async def _run_migrations() -> None:
    """Ensure ai_prompt_logs has the latest columns (provider, user_id, domain)."""
    try:
        pool = await _ensure_pool()
        async with pool.acquire() as conn:
            # Add provider column (v3 migration — tracks which LLM provider was used)
            await conn.execute("""
                DO $$ BEGIN
                    ALTER TABLE ai_prompt_logs ADD COLUMN IF NOT EXISTS provider VARCHAR(50);
                EXCEPTION WHEN duplicate_column THEN NULL;
                END $$;
            """)
            # Add user_id column (tracks which authenticated user made the request)
            await conn.execute("""
                DO $$ BEGIN
                    ALTER TABLE ai_prompt_logs ADD COLUMN IF NOT EXISTS user_id VARCHAR(100);
                EXCEPTION WHEN duplicate_column THEN NULL;
                END $$;
            """)
            # Add domain column (tracks the actual topic domain of the prompt)
            await conn.execute("""
                DO $$ BEGIN
                    ALTER TABLE ai_prompt_logs ADD COLUMN IF NOT EXISTS domain VARCHAR(50);
                EXCEPTION WHEN duplicate_column THEN NULL;
                END $$;
            """)
            log.info("db.migrations.complete", table="ai_prompt_logs")
    except Exception:
        log.exception("db.migrations.failed", table="ai_prompt_logs")


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

    # Ensure database schema is up-to-date
    await _run_migrations()

    log.info(
        "ai_service.startup",
        generation_mode=GENERATION_MODE,
        grok_model=_GROK_PROFILE["model"],
        grok_key_set=bool(GROK_API_KEY),
        providers_available=list(PROVIDERS.keys()),
    )


# ── Pydantic models ────────────────────────────────────────────────────────────

class ExtractEventsRequest(BaseModel):
    text: str
    provider: str | None = None   # e.g. "openai", "grok"
    model: str | None = None      # e.g. "gpt-4o-mini"


class ExtractedEventItem(BaseModel):
    title:      str
    summary:    str
    event_date: str
    domain:     str


class ExtractEventsResponse(BaseModel):
    events: list[ExtractedEventItem]


class GenerateCasualLinkRequest(BaseModel):
    from_event_id: uuid.UUID
    to_event_id:   uuid.UUID
    provider: str | None = None
    model: str | None = None


class CasualLinkResponse(BaseModel):
    explanation:  str
    strength:     float = Field(ge=0.0, le=1.0)
    is_contested: bool


class ExpandChainRequest(BaseModel):
    node_id:            uuid.UUID
    node_title:         str = ""
    node_summary:       str = ""
    perspective:        str = "Economic"
    already_loaded_ids: list[uuid.UUID] = Field(default_factory=list)
    provider: str | None = None
    model: str | None = None


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


class EmbeddingRequest(BaseModel):
    text: str


class EmbeddingResponse(BaseModel):
    embedding: list[float]


class GenerateGraphRequest(BaseModel):
    topic:        str = Field(..., min_length=3, max_length=300)
    mode:         str = Field(default="minimal")   # minimal | balanced | quality
    event_count:  int = Field(default=8, ge=3, le=20)
    max_articles: int = Field(default=3, ge=1, le=5)   # kept for API compat
    provider: str | None = None
    model: str | None = None


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


def _extract_domain_from_prompt(prompt: str) -> str | None:
    """Extract the most likely domain category from prompt text using keyword matching.
    Returns None when no keywords match (caller should leave domain as NULL)."""
    if not prompt:
        return None

    lower = prompt.lower()
    categories: dict[str, tuple[list[str], int]] = {
        "Economics":      (["economy", "economic", "trade", "finance", "financial", "market", "gdp", "recession", "inflation", "tariff", "sanction", "currency", "banking", "fiscal", "monetary"], 1),
        "Geopolitics":    (["geopolitic", "diplomacy", "diplomatic", "treaty", "alliance", "nato", "united nations", "cold war", "foreign policy", "international relation", "sovereignty", "brexit", "regime", "coup", "embassy"], 2),
        "Military":       (["war", "military", "battle", "invasion", "conflict", "troop", "navy", "army", "air force", "nuclear weapon", "missile", "airstrike", "ceasefire", "surrender", "insurgency", "guerrilla"], 3),
        "Technology":     (["technology", "tech", "ai", "artificial intelligence", "software", "computer", "internet", "digital", "cyber", "algorithm", "data", "automation", "robot", "blockchain", "quantum", "semiconductor", "silicon"], 4),
        "Healthcare":     (["health", "healthcare", "medical", "disease", "pandemic", "vaccine", "covid", "virus", "hospital", "drug", "pharma", "epidemic", "public health", "cancer", "treatment", "clinical"], 5),
        "Climate":        (["climate", "environment", "global warming", "carbon", "emission", "pollution", "renewable energy", "fossil fuel", "sustainability", "biodiversity", "ecosystem", "deforestation", "drought", "flood", "hurricane"], 6),
        "Social":         (["society", "social", "civil rights", "protest", "movement", "demographic", "inequality", "poverty", "education", "welfare", "immigration", "refugee", "human rights", "feminism", "lgbt", "discrimination"], 7),
        "Cultural":       (["culture", "cultural", "art", "music", "film", "literature", "religion", "religious", "philosophy", "heritage", "tradition", "language", "media", "entertainment", "sport"], 8),
        "Environmental":  (["environmental", "ecology", "ecological", "conservation", "wildlife", "species", "habitat", "ocean", "marine", "forest", "arctic", "antarctic", "natural resource", "extinction"], 9),
    }

    best: str | None = None
    best_score = 0
    best_priority = 999

    for cat, (keywords, priority) in categories.items():
        score = sum(1 for kw in keywords if kw in lower)
        if score > best_score or (score == best_score and priority < best_priority):
            best_score = score
            best_priority = priority
            best = cat

    return best if best_score > 0 else None


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
        "correlated_with": "Correlated",
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
        if array:
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


# ── Multi-provider LLM generation ──────────────────────────────────────────────

async def _llm_generate(
    prompt: str,
    *,
    provider: str = "grok",
    model: str = "",
    temperature: float = 0.3,
    max_tokens: int = 4000,
    api_key: str = "",
    endpoint: str = "unknown",
    user_id: str | None = None,
) -> str:
    """
    Call any LLM provider and return the raw text response.
    BYOK-only: if the provider requires a key and none is supplied,
    falls back to the local Ollama provider (never server-wide keys).
    """
    # Resolve model if not specified
    if not model and provider in PROVIDERS:
        first = next(iter(PROVIDERS[provider].models), None)
        model = first or LOCAL_FALLBACK_MODEL
    if not model:
        model = LOCAL_FALLBACK_MODEL

    # BYOK-only: no user key for a paid provider → redirect to local Ollama
    provider_cfg = get_provider(provider)
    if provider_cfg and provider_cfg.requires_key and not api_key:
        log.info(
            "llm.byok.fallback_to_local",
            provider=provider,
            model=model,
            local_model=LOCAL_FALLBACK_MODEL,
        )
        provider = LOCAL_FALLBACK_PROVIDER
        provider_cfg = get_provider(provider)
        model = model if model in (provider_cfg.models if provider_cfg else {}) else LOCAL_FALLBACK_MODEL

    # Auto-extract domain from the prompt for analytics categorization
    domain = _extract_domain_from_prompt(prompt)

    # Build log callback — inject user_id and domain from request context
    async def _log_cb(**kwargs) -> None:
        await _log_prompt(user_id=user_id, domain=domain, **kwargs)

    try:
        result = await generate_with_provider(
            prompt=prompt,
            provider_name=provider,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
            api_key=api_key,
            endpoint=endpoint,
            log_prompt_cb=_log_cb,
        )
    except ValueError as exc:
        # Missing or invalid configuration (e.g. unknown provider, missing key)
        raise HTTPException(status_code=400, detail=str(exc))
    except RuntimeError as exc:
        # Provider API error (e.g. invalid/incorrect key, rate limit, timeout)
        msg = str(exc)
        if "Incorrect API key" in msg or "Invalid API key" in msg or "401" in msg:
            raise HTTPException(status_code=401, detail=msg)
        elif "Rate limit" in msg or "429" in msg:
            raise HTTPException(status_code=429, detail=msg)
        elif "timed out" in msg.lower() or "timeout" in msg.lower():
            raise HTTPException(status_code=504, detail=msg)
        else:
            raise HTTPException(status_code=502, detail=msg)
    return result["text"]


def _build_graph_prompt(topic: str, mode: str = "minimal", event_count: int = 8) -> str:
    """Build a comprehensive casual knowledge graph prompt."""
    edge_min = max(3, event_count - 2)
    edge_max = min(event_count * 2, 30)

    if mode == "minimal":
        summary_len = "250-400 chars"
        expl_len    = "150-250 chars"
    elif mode == "balanced":
        summary_len = "400-600 chars"
        expl_len    = "250-400 chars"
    else:  # quality
        summary_len = "600-800 chars"
        expl_len    = "400-600 chars"

    return f"""You are an expert casual analyst and historian. Your job is to build a structured casual knowledge graph that helps users deeply understand why events happen and how they interconnect.

Topic: "{topic}"

Think carefully about the key events, their causes and effects, the actors involved, and the broader significance. Then return ONLY a raw JSON object (no markdown, no prose, no ```json fences) with exactly two keys:

"events": array of EXACTLY {event_count} objects, each with these fields:
  "title"            : Concise descriptive title (≤120 chars), use widely recognized event names
  "summary"          : What happened, why it happened at that time, who was involved, and why it matters ({summary_len}). Include specific names, places, numbers, and mechanisms. Avoid vague statements.
  "event_date"       : Best known date YYYY-MM-DD (use YYYY-01-01 if only year is known, YYYY-MM-01 if only month is known)
  "domain"           : one of Geopolitics|Economics|Technology|Social|Environmental|Military|Cultural
  "confidence_score" : float 0.4-0.95 indicating how well-established this event is in historical/scholarly consensus (use 0.9+ for widely documented events, 0.6-0.8 for interpretations, 0.4-0.6 for speculative connections)
  "key_actors"       : comma-separated list of key people, organizations, or countries involved (e.g. "Federal Reserve, Jerome Powell, US Treasury")
  "source_url"       : A SPECIFIC, real URL to a reputable source (Wikipedia article, major news outlet, academic paper, government report). Do NOT use placeholder URLs like example.com. Use actual Wikipedia URLs like https://en.wikipedia.org/wiki/... or real news articles.

"edges": array of {edge_min} to {edge_max} objects, each with these fields:
  "from_index"        : 0-based index into events array (the cause / upstream event)
  "to_index"          : 0-based index into events array (the effect / downstream event)
  "relationship_type" : one of DirectlyCaused|EnabledConditionsFor|ContributedTo|Correlated|Contested
  "strength"          : float 0.0-1.0 (1.0 = direct unambiguous causation, 0.5 = contributes significantly, 0.2 = weak correlation)
  "perspective"       : one of Mainstream|Geopolitical|Structural|Economic|Revisionist
  "explanation"       : Detailed casual mechanism: HOW and WHY the cause led to the effect ({expl_len}). Include specific mechanisms, transmission channels, and key turning points. Avoid generic phrases like "led to" without explaining HOW.
  "is_contested"      : true or false — is there significant scholarly or expert disagreement about this casual link?
  "opposing_view"     : If is_contested is true, briefly describe the opposing argument in one sentence

Critical rules:
- from_index must NOT equal to_index
- All indexes must be valid (0 to len(events)-1)
- Every event should have at least one incoming or outgoing edge
- Events should form a coherent casual narrative, not be randomly related
- Prioritize direct casual chains over loose correlations
- Include at least 2-3 edges with is_contested: true to show disputed relationships
- Use SPECIFIC real source URLs, never placeholder or example URLs
- Raw JSON only with no markdown fences, no explanatory text"""


async def _run_graph_generation(
    topic: str,
    mode: str = "minimal",
    event_count: int = 8,
    *,
    provider: str = "grok",
    model: str = "",
    api_key: str = "",
    user_id: str | None = None,
) -> GenerateGraphResponse:
    """Core pipeline: LLM call → parse events + edges → cache → return."""
    cached = _cache_get(topic)
    if cached:
        return GenerateGraphResponse(**cached, from_cache=True)

    profile = _GROK_PROFILES.get(mode, _GROK_PROFILES["minimal"])
    prompt  = _build_graph_prompt(topic, mode=mode, event_count=event_count)

    resolved_model = model or profile["model"]
    log.info(
        "llm.generate.start",
        topic=topic, mode=mode, provider=provider, model=resolved_model,
        event_count=event_count,
    )

    try:
        raw = await _llm_generate(
            prompt,
            provider=provider,
            model=resolved_model,
            temperature=profile["temperature"],
            max_tokens=profile["max_tokens"],
            api_key=api_key,
            endpoint="graph_generation",
            user_id=user_id,
        )
    except Exception as exc:
        raise HTTPException(502, f"LLM API call failed ({provider}/{resolved_model}): {exc}") from exc

    log.info("llm.generate.response_received", chars=len(raw))

    # Parse the top-level JSON object
    try:
        data = _parse_json_from_llm(raw, array=False)
    except Exception as exc:
        raise HTTPException(502, f"Failed to parse LLM JSON response: {exc}\nRaw: {raw[:300]}") from exc

    raw_events: list[dict] = data.get("events", [])
    raw_edges:  list[dict] = data.get("edges",  [])

    if not raw_events:
        raise HTTPException(502, f"LLM ({provider}/{resolved_model}) returned no events for the given topic.")

    # Build validated EventNode list
    events: list[GeneratedEventNode] = []
    for e in raw_events:
        src_url = str(e.get("source_url", "")).strip() or f"https://en.wikipedia.org/wiki/{topic.replace(' ', '_')}"
        actors = str(e.get("key_actors", "")).strip()
        summary = str(e.get("summary", ""))[:4000]
        if actors:
            summary += f" Key actors: {actors}"
        events.append(GeneratedEventNode(
            id               = str(uuid.uuid4()),
            title            = str(e.get("title", "Untitled Event"))[:200],
            summary          = summary,
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
                explanation       = (str(re_dict.get("explanation", "Casual link inferred by LLM."))[:2000]
                                 + (f" Opposing: {str(re_dict.get('opposing_view', ''))}"
                                    if re_dict.get("is_contested") and re_dict.get("opposing_view")
                                    else "")),
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

    log.info("llm.generate.done", provider=provider, model=resolved_model, events=len(events), edges=len(edges))

    payload = {
        "topic":       topic,
        "events":      [e.model_dump() for e in events],
        "edges":       [ed.model_dump() for ed in edges],
        "source_urls": source_urls,
    }
    _cache_set(topic, payload)
    return GenerateGraphResponse(**payload, from_cache=False)


# ── Async job runner ───────────────────────────────────────────────────────────

async def _job_worker(
    job_id: str,
    topic: str,
    mode: str,
    event_count: int,
    provider: str = "grok",
    model: str = "",
    api_key: str = "",
    user_id: str | None = None,
) -> None:
    _JOB_STORE[job_id]["status"] = "running"
    try:
        result = await _run_graph_generation(
            topic, mode=mode, event_count=event_count,
            provider=provider, model=model, api_key=api_key, user_id=user_id,
        )
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
        "providers":       list(PROVIDERS.keys()),
    }


@app.get("/api/providers", tags=["ops"])
async def get_providers_list() -> list[dict]:
    """Return the list of available LLM providers and their models."""
    return list_providers()


@app.post("/api/embeddings", response_model=EmbeddingResponse, tags=["embeddings"])
async def get_embedding(body: EmbeddingRequest, request: Request) -> EmbeddingResponse:
    """Generate a dense vector embedding via local Ollama (nomic-embed-text)."""
    vector = await _ollama_embed(body.text)
    return EmbeddingResponse(embedding=vector)


@app.post("/api/events/extract", response_model=ExtractEventsResponse, tags=["events"])
async def extract_events(body: ExtractEventsRequest, request: Request) -> ExtractEventsResponse:
    """Extract structured events from free text using any LLM provider."""
    ai = _resolve_ai_params(request, body.provider, body.model)

    prompt = (
        f'You are an expert casual analyst. Extract all significant casual events from the text below.\n\n'
        f'For each event, identify: what happened, when it happened, who was involved, and why it matters.\n\n'
        f'Return ONLY a JSON array of objects with fields:\n'
        f'  title       : concise event name (≤150 chars)\n'
        f'  summary     : detailed description (200-500 chars) covering what happened, context, and significance\n'
        f'  event_date  : YYYY-MM-DD (use YYYY-01-01 if only year known)\n'
        f'  domain      : one of Geopolitics|Economics|Technology|Social|Environmental|Military|Cultural\n\n'
        f'No markdown. Raw JSON array only.\n\nText:\n{body.text}\n\nJSON:'
    )
    raw    = await _llm_generate(
        prompt,
        provider=ai["provider"], model=ai["model"], api_key=ai["api_key"],
        endpoint="extract_events", user_id=ai["user_id"],
    )
    events = _parse_json_from_llm(raw, array=True)
    return ExtractEventsResponse(events=[ExtractedEventItem(**e) for e in events])


@app.post("/api/casual/generate", response_model=CasualLinkResponse, tags=["casual"])
async def generate_casual_link(body: GenerateCasualLinkRequest, request: Request) -> CasualLinkResponse:
    """Analyse the casual relationship between two events using any LLM provider."""
    ai = _resolve_ai_params(request, body.provider, body.model)

    prompt = (
        f'You are an expert casual analyst. Analyse the casual relationship from event '
        f'{body.from_event_id} to event {body.to_event_id}.\n\n'
        f'Consider: what specific mechanisms connect these events? Is the causation direct or indirect? '
        f'What evidence supports or challenges this connection? Are there alternative explanations?\n\n'
        f'Return ONLY a JSON object:\n'
        f'  {{"explanation": "detailed casual mechanism (200-500 chars)", '
        f'"strength": 0.0-1.0, "is_contested": true|false}}\n\n'
        f'No markdown. Raw JSON only.'
    )
    raw  = await _llm_generate(
        prompt,
        provider=ai["provider"], model=ai["model"], api_key=ai["api_key"],
        endpoint="generate_casual_link", user_id=ai["user_id"],
    )
    data = _parse_json_from_llm(raw, array=False)
    return CasualLinkResponse(**data)


@app.post("/api/chain/expand", response_model=ExpandChainResponse, tags=["chain"])
async def expand_chain_node(body: ExpandChainRequest, request: Request) -> ExpandChainResponse:
    """Suggest connected casual events for chain expansion using any LLM provider."""
    ai = _resolve_ai_params(request, body.provider, body.model)

    is_question = "?" in body.node_title or len(body.node_title) > 80
    context = (
        f'ANSWER THIS QUESTION: "{body.node_title}"'
        if is_question
        else f'"{body.node_title}: {body.node_summary}"'
    )
    prompt = (
        f'You are an expert casual analyst. {context}\n\n'
        f'From a {body.perspective} perspective, suggest 5-7 significant casual events directly relevant to this.\n'
        f'For each event, consider: what caused it, what effects it had, who was involved, '
        f'and why it matters in the bigger picture.\n\n'
        f'Exclude these already-loaded IDs: {", ".join(str(i) for i in body.already_loaded_ids)}.\n\n'
        f'Return ONLY a JSON array of objects, each with:\n'
        f'  "title"             : concise descriptive title\n'
        f'  "summary"           : detailed explanation (200-400 chars) covering what happened, how it connects, and its significance\n'
        f'  "relationship_type" : one of CAUSES|CONTRIBUTES_TO|ENABLES|PREVENTS|CORRELATED_WITH\n'
        f'  "direction"         : either "outgoing" (this event causes/suggests the new event) or "incoming" (the new event causes/leads to this event)\n\n'
        f'No markdown. Raw JSON array only.'
    )
    raw   = await _llm_generate(
        prompt,
        provider=ai["provider"], model=ai["model"], api_key=ai["api_key"],
        endpoint="expand_chain", user_id=ai["user_id"],
    )
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
    Submit an async knowledge-graph generation job (multi-provider LLM-powered).
    Returns job_id immediately (HTTP 202). Poll GET /api/graph/jobs/{job_id}.
    Cache hits resolve synchronously.
    """
    ai = _resolve_ai_params(request, body.provider, body.model)
    user_id = (request.headers.get("X-User-Id") or "").strip() or None

    log.info(
        "graph.generate.submit",
        topic=body.topic, mode=body.mode, event_count=body.event_count,
        provider=ai["provider"], model=ai["model"],
    )

    # Use cache key that includes provider for multi-provider cache isolation
    cache_topic = f"{ai['provider']}:{body.topic}"
    cached = _cache_get(cache_topic) or _cache_get(body.topic)  # fall back to provider-agnostic cache
    if cached:
        job_id = str(uuid.uuid4())
        result = GenerateGraphResponse(**cached, from_cache=True)
        _JOB_STORE[job_id] = {"status": "done", "result": result, "error": None}
        log.info("graph.generate.cache_hit", topic=body.topic, job_id=job_id)
        return GraphJobSubmittedResponse(job_id=job_id, status="done")

    job_id = str(uuid.uuid4())
    _JOB_STORE[job_id] = {"status": "pending", "result": None, "error": None}
    background_tasks.add_task(
        _job_worker,
        job_id, body.topic, body.mode, body.event_count,
        provider=ai["provider"], model=ai["model"], api_key=ai["api_key"],
        user_id=user_id,
    )
    log.info("graph.generate.job_queued", topic=body.topic, job_id=job_id, provider=ai["provider"])
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


# ── Prompt Logs (audit / debugging) ─────────────────────────────────────────────

class PromptLogEntry(BaseModel):
    id: str
    endpoint: str
    prompt: str
    response: str | None
    model: str | None
    max_tokens: int | None
    temperature: float | None
    duration_ms: int | None
    error: str | None
    input_tokens: int | None = None
    output_tokens: int | None = None
    cost_usd: float | None = None
    provider: str | None = None
    user_id: str | None = None
    domain: str | None = None
    created_at: str


@app.get("/api/prompt-logs", response_model=list[PromptLogEntry], tags=["ops"])
async def get_prompt_logs(
    limit: int = 50,
    endpoint: str | None = None,
) -> list[PromptLogEntry]:
    """Return recent AI prompt/response logs for debugging."""
    pool = await _ensure_pool()
    async with pool.acquire() as conn:
        # Check which columns exist (added in migrations)
        has_provider = await _column_exists(conn, "ai_prompt_logs", "provider")
        has_user_id  = await _column_exists(conn, "ai_prompt_logs", "user_id")
        has_domain   = await _column_exists(conn, "ai_prompt_logs", "domain")

        cols = "id::text, endpoint, prompt, response, model, max_tokens, temperature, duration_ms, error, input_tokens, output_tokens, cost_usd"
        cols += ", COALESCE(provider, 'unknown') as provider" if has_provider else ", 'unknown' as provider"
        cols += ", user_id" if has_user_id else ", NULL as user_id"
        cols += ", domain" if has_domain else ", NULL as domain"
        cols += ", created_at::text"

        if endpoint:
            rows = await conn.fetch(
                f"SELECT {cols} FROM ai_prompt_logs WHERE endpoint = $1 ORDER BY created_at DESC LIMIT $2",
                endpoint, limit,
            )
        else:
            rows = await conn.fetch(
                f"SELECT {cols} FROM ai_prompt_logs ORDER BY created_at DESC LIMIT $1",
                limit,
            )
    return [PromptLogEntry(**dict(r)) for r in rows]


async def _column_exists(conn: asyncpg.Connection, table: str, column: str) -> bool:
    """Check whether a column exists in a table."""
    row = await conn.fetchrow(
        "SELECT 1 FROM information_schema.columns WHERE table_name=$1 AND column_name=$2",
        table, column,
    )
    return row is not None


# ── Lifecycle ───────────────────────────────────────────────────────────────────

@app.on_event("shutdown")
async def _shutdown_db_pool() -> None:
    global _DB_POOL
    if _DB_POOL:
        await _DB_POOL.close()
        _DB_POOL = None
