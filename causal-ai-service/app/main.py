"""
CausalExplorer AI Service
FastAPI sidecar that wraps Ollama (LLM) and Qdrant (vector search) to provide
event extraction, causal link generation, chain expansion, semantic search,
and on-demand knowledge-graph generation from Wikipedia.
"""
from __future__ import annotations

import json
import logging
import os
import re
import time
import uuid
from typing import Any

import httpx
import structlog
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from qdrant_client import QdrantClient
from qdrant_client.http.exceptions import UnexpectedResponse
from qdrant_client.models import Distance, VectorParams
from tenacity import retry, stop_after_attempt, wait_exponential

# ── Configuration ──────────────────────────────────────────────────────────────

OLLAMA_URL   = os.getenv("OLLAMA_URL",   "http://localhost:11434")
QDRANT_URL   = os.getenv("QDRANT_URL",   "http://localhost:6333")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "mistral")
EMBED_MODEL  = os.getenv("EMBED_MODEL",  "nomic-embed-text")
AI_API_KEY   = os.getenv("AI_SERVICE_API_KEY", "")
LOG_LEVEL    = os.getenv("LOG_LEVEL",    "INFO")
COLLECTION   = "causal_events"
VECTOR_DIM   = 768          # nomic-embed-text output dimension

# Knowledge-graph generation cache: normalised_query → (payload, timestamp)
_KG_CACHE: dict[str, tuple[dict, float]] = {}
KG_CACHE_TTL_SECONDS = 3600   # 1 hour

structlog.configure(wrapper_class=structlog.make_filtering_bound_logger(
    getattr(logging, LOG_LEVEL.upper(), logging.INFO)
))
log = structlog.get_logger()

# ── FastAPI app ────────────────────────────────────────────────────────────────

app = FastAPI(
    title="CausalExplorer AI Service",
    version="1.1.0",
    description=(
        "LLM-powered event extraction, causal reasoning, semantic search, "
        "and on-demand Wikipedia-sourced knowledge graph generation."
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

# ── Shared request/response models ────────────────────────────────────────────

class ExtractEventsRequest(BaseModel):
    text: str

class ExtractedEventItem(BaseModel):
    title:       str
    summary:     str
    event_date:  str
    domain:      str

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
    node_id:             uuid.UUID
    perspective:         str = "Economic"
    already_loaded_ids:  list[uuid.UUID] = Field(default_factory=list)

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

# ── Knowledge-graph generation models ─────────────────────────────────────────

class GenerateGraphRequest(BaseModel):
    topic: str = Field(..., min_length=3, max_length=300,
                       description="Natural-language topic or question to build a causal graph for.")
    max_articles: int = Field(default=3, ge=1, le=5)

class GeneratedEventNode(BaseModel):
    id:               str   # UUID string assigned here
    title:            str
    summary:          str
    event_date:       str   # ISO 8601 date e.g. "2023-06-01"
    domain:           str   # One of: Geopolitics, Economics, Technology, Social, Environmental, Military, Cultural
    confidence_score: float = Field(ge=0.0, le=1.0)
    freshness_score:  float = Field(ge=0.0, le=1.0)
    source_url:       str
    source_title:     str

class GeneratedEdge(BaseModel):
    from_event_id:     str
    to_event_id:       str
    relationship_type: str   # DirectlyCaused | EnabledConditionsFor | ContributedTo | Correlated | Contested
    strength:          float = Field(ge=0.0, le=1.0)
    perspective:       str   # Mainstream | Geopolitical | Structural | Economic | Revisionist
    explanation:       str
    is_contested:      bool  = False

class GenerateGraphResponse(BaseModel):
    topic:           str
    events:          list[GeneratedEventNode]
    edges:           list[GeneratedEdge]
    source_urls:     list[str]
    from_cache:      bool = False

# ── Ollama helpers ─────────────────────────────────────────────────────────────

def _correlation_id(request: Request) -> str:
    return request.headers.get("X-Correlation-ID", str(uuid.uuid4()))


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
async def _ollama_generate(prompt: str, timeout: int = 180) -> str:
    async with httpx.AsyncClient(base_url=OLLAMA_URL, timeout=timeout) as client:
        resp = await client.post("/api/generate", json={
            "model":  OLLAMA_MODEL,
            "prompt": prompt,
            "stream": False,
        })
        resp.raise_for_status()
        return resp.json()["response"]


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
async def _ollama_embed(text: str) -> list[float]:
    async with httpx.AsyncClient(base_url=OLLAMA_URL, timeout=60) as client:
        resp = await client.post("/api/embeddings", json={
            "model":  EMBED_MODEL,
            "prompt": text,
        })
        resp.raise_for_status()
        return resp.json()["embedding"]


def _parse_json_from_llm(raw: str, array: bool = True) -> Any:
    """
    Extract the first JSON array or object from raw LLM output,
    handling markdown code fences and leading/trailing noise.
    """
    # Strip markdown fences
    raw = re.sub(r"```(?:json)?", "", raw).strip()
    pattern = r'\[.*\]' if array else r'\{.*\}'
    match = re.search(pattern, raw, re.DOTALL)
    if not match:
        raise ValueError(f"No JSON {'array' if array else 'object'} found in LLM output.")
    return json.loads(match.group())


# ── Wikipedia helpers ──────────────────────────────────────────────────────────

WIKI_SEARCH_URL  = "https://en.wikipedia.org/w/api.php"
WIKI_SUMMARY_URL = "https://en.wikipedia.org/api/rest_v1/page/summary"
WIKI_CONTENT_URL = "https://en.wikipedia.org/w/api.php"

# Wikipedia requires a descriptive User-Agent to avoid 403s (per API policy).
WIKI_HEADERS = {
    "User-Agent": "CausalExplorer/1.0 (https://github.com/causal-explorer; causal-explorer@example.com) httpx/0.27"
}


async def _wikipedia_search(query: str, max_results: int = 5) -> list[str]:
    """Return up to max_results Wikipedia page titles matching query."""
    async with httpx.AsyncClient(timeout=15, headers=WIKI_HEADERS) as client:
        resp = await client.get(WIKI_SEARCH_URL, params={
            "action":   "query",
            "list":     "search",
            "srsearch": query,
            "srlimit":  max_results,
            "format":   "json",
        })
        resp.raise_for_status()
        data = resp.json()
        return [item["title"] for item in data.get("query", {}).get("search", [])]


async def _wikipedia_article_text(title: str, max_chars: int = 6000) -> tuple[str, str]:
    """
    Fetch the plain-text extract of a Wikipedia article.
    Returns (text, url).
    """
    async with httpx.AsyncClient(timeout=15, headers=WIKI_HEADERS) as client:
        # First try the REST summary endpoint (clean, concise)
        try:
            resp = await client.get(
                f"{WIKI_SUMMARY_URL}/{httpx.URL(title).path}",
                follow_redirects=True,
            )
            if resp.status_code == 200:
                d = resp.json()
                text = d.get("extract", "")
                url  = d.get("content_urls", {}).get("desktop", {}).get("page", f"https://en.wikipedia.org/wiki/{title.replace(' ', '_')}")
                if text:
                    return text[:max_chars], url
        except Exception:
            pass

        # Fall back to action=query&prop=extracts
        resp = await client.get(WIKI_CONTENT_URL, params={
            "action":        "query",
            "titles":        title,
            "prop":          "extracts",
            "exintro":       True,
            "explaintext":   True,
            "redirects":     True,
            "format":        "json",
        })
        resp.raise_for_status()
        pages = resp.json().get("query", {}).get("pages", {})
        page  = next(iter(pages.values()), {})
        text  = page.get("extract", "")
        url   = f"https://en.wikipedia.org/wiki/{title.replace(' ', '_')}"
        return text[:max_chars], url


async def _fetch_wikipedia_corpus(topic: str, max_articles: int) -> list[tuple[str, str, str]]:
    """
    Search Wikipedia for `topic`, fetch up to `max_articles` articles.
    Returns list of (title, text, url).
    """
    titles = await _wikipedia_search(topic, max_results=max_articles + 2)
    corpus: list[tuple[str, str, str]] = []
    for title in titles[:max_articles]:
        try:
            text, url = await _wikipedia_article_text(title)
            if text.strip():
                corpus.append((title, text, url))
                log.info("wikipedia.fetched", title=title, chars=len(text))
        except Exception as exc:
            log.warning("wikipedia.fetch_failed", title=title, error=str(exc))
    return corpus


# ── LLM extraction helpers ─────────────────────────────────────────────────────

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
    normalised = raw.strip().lower()
    if raw.strip() in _VALID_DOMAINS:
        return raw.strip()
    return mapping.get(normalised, "Geopolitics")


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
    """Return a valid ISO date or a fallback."""
    raw = raw.strip()
    match = re.search(r'\d{4}-\d{2}-\d{2}', raw)
    if match:
        return match.group()
    match = re.search(r'\d{4}', raw)
    if match:
        return f"{match.group()}-01-01"
    return "2000-01-01"


async def _extract_events_from_corpus(
    corpus: list[tuple[str, str, str]],
    topic: str,
) -> list[dict]:
    """
    Ask the LLM to extract structured causal EventNodes from the corpus text.
    Returns a list of raw dicts.
    """
    combined = "\n\n---\n\n".join(
        f"Article: {title}\n\n{text}" for title, text, _ in corpus
    )[:12000]  # token budget

    prompt = f"""You are a historian and analyst building a causal knowledge graph about: "{topic}".

Read the following Wikipedia articles and extract 4 to 8 distinct causal events that are relevant to the topic.

For each event return a JSON object with EXACTLY these fields:
- "title": short descriptive title (max 120 chars)
- "summary": 2-4 sentence explanation of what happened and why it matters (max 500 chars)
- "event_date": best known date in ISO 8601 format (YYYY-MM-DD). Use YYYY-01-01 if only year is known.
- "domain": ONE of: Geopolitics, Economics, Technology, Social, Environmental, Military, Cultural
- "confidence_score": float between 0.4 and 0.95 reflecting how well-established this event is

Return ONLY a valid JSON array of objects, no markdown, no explanation.

Articles:
{combined}

JSON array:"""

    raw = await _ollama_generate(prompt, timeout=240)
    events = _parse_json_from_llm(raw, array=True)
    return events if isinstance(events, list) else []


async def _infer_causal_edges(events: list[dict]) -> list[dict]:
    """
    Ask the LLM to infer CAUSES relationships between the extracted events.
    Returns a list of raw edge dicts with from_index / to_index.
    """
    numbered = "\n".join(
        f"{i}. [{e.get('event_date', '?')}] {e.get('title', '?')}: {e.get('summary', '')[:120]}"
        for i, e in enumerate(events)
    )

    prompt = f"""You are a causal analyst. Below are {len(events)} historical events.

{numbered}

Identify the most significant causal relationships between these events.
For each causal link return a JSON object with EXACTLY these fields:
- "from_index": integer index of the cause event (0-based)
- "to_index": integer index of the effect event (0-based)
- "relationship_type": ONE of: DirectlyCaused, EnabledConditionsFor, ContributedTo, Correlated, Contested
- "strength": float 0.0-1.0 (how strong is the causal link)
- "perspective": ONE of: Mainstream, Geopolitical, Structural, Economic, Revisionist
- "explanation": 1-2 sentence explanation of the causal mechanism
- "is_contested": true or false

Rules:
- from_index must NOT equal to_index
- All indexes must be between 0 and {len(events) - 1}
- Return 3 to {min(8, len(events) * 2)} edges maximum
- Return ONLY a valid JSON array, no markdown, no explanation.

JSON array:"""

    raw = await _ollama_generate(prompt, timeout=180)
    edges = _parse_json_from_llm(raw, array=True)
    return edges if isinstance(edges, list) else []


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


# ── Health ─────────────────────────────────────────────────────────────────────

@app.get("/health", tags=["ops"])
async def health() -> dict:
    return {"status": "ok", "model": OLLAMA_MODEL}


# ── Embeddings ─────────────────────────────────────────────────────────────────

@app.post("/api/embeddings", response_model=EmbeddingResponse, tags=["embeddings"])
async def get_embedding(body: EmbeddingRequest, request: Request) -> EmbeddingResponse:
    """Generate a dense vector embedding for the provided text using the Ollama embed model."""
    cid = _correlation_id(request)
    log.info("embedding.start", correlation_id=cid, text_length=len(body.text))
    vector = await _ollama_embed(body.text)
    return EmbeddingResponse(embedding=vector)


# ── Event extraction ───────────────────────────────────────────────────────────

@app.post("/api/events/extract", response_model=ExtractEventsResponse, tags=["events"])
async def extract_events(body: ExtractEventsRequest, request: Request) -> ExtractEventsResponse:
    cid = _correlation_id(request)
    log.info("extract_events.start", correlation_id=cid, text_length=len(body.text))

    prompt = (
        "You are a historian and economist. Extract structured causal events from the text below.\n"
        "Return a JSON array of objects with fields: title, summary, event_date (ISO 8601), domain "
        "(one of: Economic, Political, Military, Social, Technological, Environmental).\n"
        "Text:\n" + body.text + "\n\nJSON:"
    )
    raw = await _ollama_generate(prompt)
    events = _parse_json_from_llm(raw, array=True)
    return ExtractEventsResponse(events=[ExtractedEventItem(**e) for e in events])


# ── Causal link generation ─────────────────────────────────────────────────────

@app.post("/api/causal/generate", response_model=CausalLinkResponse, tags=["causal"])
async def generate_causal_link(body: GenerateCausalLinkRequest, request: Request) -> CausalLinkResponse:
    cid = _correlation_id(request)
    log.info("generate_causal_link.start", correlation_id=cid)

    prompt = (
        f"Analyse the causal relationship from event {body.from_event_id} to event {body.to_event_id}.\n"
        "Return JSON: {\"explanation\": \"...\", \"strength\": 0.0-1.0, \"is_contested\": true|false}\n"
        "JSON:"
    )
    raw = await _ollama_generate(prompt)
    data = _parse_json_from_llm(raw, array=False)
    return CausalLinkResponse(**data)


# ── Chain expansion ────────────────────────────────────────────────────────────

@app.post("/api/chain/expand", response_model=ExpandChainResponse, tags=["chain"])
async def expand_chain_node(body: ExpandChainRequest, request: Request) -> ExpandChainResponse:
    cid = _correlation_id(request)
    log.info("expand_chain_node.start", correlation_id=cid, node_id=str(body.node_id))

    prompt = (
        f"From a {body.perspective} perspective, suggest 3-5 causal events connected to node {body.node_id}.\n"
        "Exclude events with IDs: " + ", ".join(str(i) for i in body.already_loaded_ids) + ".\n"
        "Return JSON array: [{\"title\": \"...\", \"summary\": \"...\", "
        "\"relationship_type\": \"CAUSES|CONTRIBUTES_TO|ENABLES|PREVENTS\", "
        "\"direction\": \"outgoing|incoming\"}]\n"
        "JSON:"
    )
    raw = await _ollama_generate(prompt)
    nodes = _parse_json_from_llm(raw, array=True)
    return ExpandChainResponse(suggested_nodes=[SuggestedNode(**n) for n in nodes])


# ── Semantic search ────────────────────────────────────────────────────────────

@app.post("/api/search/similar", response_model=list[SimilarEventResult], tags=["search"])
async def search_similar(body: SearchSimilarRequest, request: Request) -> list[SimilarEventResult]:
    cid = _correlation_id(request)
    log.info("search_similar.start", correlation_id=cid, query=body.query)

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


# ── Knowledge-graph generation ─────────────────────────────────────────────────

@app.post("/api/graph/generate", response_model=GenerateGraphResponse, tags=["graph"])
async def generate_knowledge_graph(
    body: GenerateGraphRequest,
    request: Request,
) -> GenerateGraphResponse:
    """
    On-demand knowledge-graph generation pipeline:
    1. Search Wikipedia for the topic.
    2. Fetch article text (up to max_articles).
    3. Ask the LLM to extract structured EventNodes.
    4. Ask the LLM to infer CAUSES edges between the nodes.
    5. Return the structured graph payload (cached for 1 hour).
    """
    cid = _correlation_id(request)
    log.info("graph.generate.start", correlation_id=cid, topic=body.topic)

    # ── Cache check ────────────────────────────────────────────────────────────
    cached = _cache_get(body.topic)
    if cached:
        log.info("graph.generate.cache_hit", correlation_id=cid, topic=body.topic)
        return GenerateGraphResponse(**cached, from_cache=True)

    # ── 1. Fetch Wikipedia corpus ──────────────────────────────────────────────
    try:
        corpus = await _fetch_wikipedia_corpus(body.topic, body.max_articles)
    except Exception as exc:
        log.error("graph.generate.wikipedia_failed", error=str(exc))
        raise HTTPException(502, f"Wikipedia fetch failed: {exc}") from exc

    if not corpus:
        raise HTTPException(404, f"No Wikipedia articles found for topic: '{body.topic}'")

    source_urls = [url for _, _, url in corpus]
    log.info("graph.generate.corpus_ready", articles=len(corpus))

    # ── 2. Extract EventNodes from corpus ─────────────────────────────────────
    try:
        raw_events = await _extract_events_from_corpus(corpus, body.topic)
    except Exception as exc:
        log.error("graph.generate.extract_failed", error=str(exc))
        raise HTTPException(502, f"LLM event extraction failed: {exc}") from exc

    if not raw_events:
        raise HTTPException(502, "LLM returned no events from the corpus.")

    log.info("graph.generate.events_extracted", count=len(raw_events))

    # Assign stable UUIDs and normalise fields
    events: list[GeneratedEventNode] = []
    for i, e in enumerate(raw_events):
        # Pick the corresponding source URL (cycle if fewer articles than events)
        source_idx = i % len(corpus)
        src_title, _, src_url = corpus[source_idx]

        events.append(GeneratedEventNode(
            id               = str(uuid.uuid4()),
            title            = str(e.get("title", "Untitled Event"))[:200],
            summary          = str(e.get("summary", ""))[:2000],
            event_date       = _safe_date(str(e.get("event_date", "2000-01-01"))),
            domain           = _coerce_domain(str(e.get("domain", "Geopolitics"))),
            confidence_score = float(max(0.0, min(0.95, e.get("confidence_score", 0.5)))),
            freshness_score  = 0.5,   # auto-generated nodes start neutral
            source_url       = src_url,
            source_title     = src_title,
        ))

    # ── 3. Infer causal edges ──────────────────────────────────────────────────
    raw_edges: list[dict] = []
    if len(events) >= 2:
        try:
            raw_edges = await _infer_causal_edges([e.model_dump() for e in events])
        except Exception as exc:
            log.warning("graph.generate.edge_inference_failed", error=str(exc))
            # Edges are optional — continue without them

    log.info("graph.generate.edges_inferred", count=len(raw_edges))

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
                explanation       = str(re_dict.get("explanation", "Causal link inferred by AI."))[:1000],
                is_contested      = bool(re_dict.get("is_contested", False)),
            ))
        except Exception as exc:
            log.warning("graph.generate.edge_skipped", error=str(exc))

    # ── 4. Build response and cache ────────────────────────────────────────────
    payload = {
        "topic":       body.topic,
        "events":      [e.model_dump() for e in events],
        "edges":       [ed.model_dump() for ed in edges],
        "source_urls": source_urls,
    }
    _cache_set(body.topic, payload)

    log.info("graph.generate.done",
             correlation_id=cid,
             events=len(events),
             edges=len(edges),
             sources=len(source_urls))

    return GenerateGraphResponse(**payload, from_cache=False)
