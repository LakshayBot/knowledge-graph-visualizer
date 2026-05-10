from __future__ import annotations

import json
from datetime import datetime, timezone

from openai import AsyncOpenAI

from core.config import settings
from core.logging import logger
from models.schemas import (
    CausalAnalysisRequest,
    CausalAnalysisResponse,
    CausalEdgeSuggestion,
    CausalNodeSuggestion,
    EventSummaryRequest,
    EventSummaryResponse,
    Perspective,
)

_client = AsyncOpenAI(api_key=settings.openai_api_key)


async def analyse_causal_chain(request: CausalAnalysisRequest) -> CausalAnalysisResponse:
    """
    Calls the OpenAI chat completion API to generate a suggested causal graph
    for the supplied event description.
    """
    system_prompt = (
        "You are an expert geopolitical and historical analyst specialising in causal reasoning. "
        "Your task is to construct a causal event graph showing why complex world events happen. "
        "Always respond with valid JSON matching the schema provided."
    )

    user_prompt = f"""
Analyse the following event and construct a causal chain with up to {request.depth} hops.

Event: {request.event_description}
Domain: {request.domain.value}
Perspective: {request.perspective.value}

Return a JSON object with this exact structure:
{{
  "root_event": {{
    "title": "...",
    "summary": "...",
    "event_date_estimate": "YYYY or YYYY-MM",
    "domain": "{request.domain.value}",
    "confidence_score": 0.0
  }},
  "related_nodes": [
    {{
      "title": "...",
      "summary": "...",
      "event_date_estimate": "...",
      "domain": "...",
      "confidence_score": 0.0
    }}
  ],
  "suggested_edges": [
    {{
      "from_event_title": "...",
      "to_event_title": "...",
      "relationship_type": "DirectlyCaused|EnabledConditionsFor|ContributedTo|Contested|Correlated",
      "strength": 0.0,
      "perspective": "{request.perspective.value}",
      "explanation": "...",
      "is_contested": false
    }}
  ]
}}
""".strip()

    log = logger.bind(event="causal_analysis", domain=request.domain.value)
    log.info("Sending causal analysis request to OpenAI")

    response = await _client.chat.completions.create(
        model=settings.openai_model,
        temperature=settings.openai_temperature,
        max_tokens=settings.openai_max_tokens,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    )

    raw = response.choices[0].message.content or "{}"
    data = json.loads(raw)

    log.info("Received causal analysis response", tokens_used=response.usage.total_tokens if response.usage else None)

    return CausalAnalysisResponse(
        root_event=CausalNodeSuggestion(**data["root_event"]),
        related_nodes=[CausalNodeSuggestion(**n) for n in data.get("related_nodes", [])],
        suggested_edges=[CausalEdgeSuggestion(**e) for e in data.get("suggested_edges", [])],
        analysis_perspective=request.perspective,
        model_used=settings.openai_model,
        generated_at=datetime.now(timezone.utc),
    )


async def generate_event_summary(request: EventSummaryRequest) -> EventSummaryResponse:
    """
    Calls the OpenAI chat completion API to generate a concise event summary
    with confidence scoring and key actor extraction.
    """
    system_prompt = (
        "You are a research analyst. Summarise the provided event text concisely (3–5 sentences), "
        "identify key actors, and assign a confidence score (0–1) reflecting how clearly "
        "the text supports the summary. Respond with valid JSON."
    )

    user_prompt = f"""
Title: {request.title}
Domain: {request.domain.value}

Raw text:
{request.raw_text}

Return JSON:
{{
  "summary": "...",
  "confidence_score": 0.0,
  "key_actors": ["Actor1", "Actor2"]
}}
""".strip()

    response = await _client.chat.completions.create(
        model=settings.openai_model,
        temperature=0.1,
        max_tokens=512,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    )

    raw = response.choices[0].message.content or "{}"
    data = json.loads(raw)

    return EventSummaryResponse(
        summary=data["summary"],
        confidence_score=float(data.get("confidence_score", 0.5)),
        key_actors=data.get("key_actors", []),
        model_used=settings.openai_model,
        generated_at=datetime.now(timezone.utc),
    )
