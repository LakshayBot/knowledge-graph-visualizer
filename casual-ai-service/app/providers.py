"""
Multi-provider LLM abstraction for CasualExplorer.

Supports:
  - Grok (xAI)
  - OpenAI (ChatGPT)
  - Anthropic Claude
  - Google Gemini
  - GitHub Copilot
  - Ollama (local)

All providers use the OpenAI-compatible /v1/chat/completions format,
with minimal per-provider quirks (auth headers, base URLs).
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Any

import httpx
import structlog

log = structlog.get_logger()


# ── Data structures ──────────────────────────────────────────────────────────

@dataclass
class ModelSpec:
    """Describes a single model available from a provider."""
    display_name: str
    max_tokens: int = 4096
    input_price_per_mtok: float = 0.0   # USD per million input tokens
    output_price_per_mtok: float = 0.0  # USD per million output tokens
    supports_vision: bool = False


@dataclass
class ProviderConfig:
    """Describes an LLM provider and its available models."""
    name: str                          # machine key: "grok", "openai", etc.
    display_name: str                  # human label: "Grok (xAI)"
    base_url: str                      # chat completions endpoint base
    models: dict[str, ModelSpec] = field(default_factory=dict)
    env_key_name: str = ""             # env var for server-wide fallback key
    extra_headers: dict[str, str] = field(default_factory=dict)  # provider-specific headers
    requires_key: bool = True
    description: str = ""


# ── Provider registry ────────────────────────────────────────────────────────

PROVIDERS: dict[str, ProviderConfig] = {
    "grok": ProviderConfig(
        name="grok",
        display_name="Grok (xAI)",
        base_url="https://api.x.ai/v1",
        env_key_name="GROK_API_KEY",
        description="xAI's Grok models — fast, cost-efficient casual reasoning.",
        models={
            "grok-3-mini": ModelSpec(
                display_name="Grok 3 Mini",
                max_tokens=4000,
                input_price_per_mtok=0.30,
                output_price_per_mtok=1.50,
            ),
            "grok-3": ModelSpec(
                display_name="Grok 3",
                max_tokens=8000,
                input_price_per_mtok=3.00,
                output_price_per_mtok=15.00,
            ),
        },
    ),
    "openai": ProviderConfig(
        name="openai",
        display_name="OpenAI",
        base_url="https://api.openai.com/v1",
        env_key_name="OPENAI_API_KEY",
        description="GPT-4o, GPT-4o-mini, o3-mini — industry-leading reasoning.",
        models={
            "gpt-4o": ModelSpec(
                display_name="GPT-4o",
                max_tokens=4096,
                input_price_per_mtok=2.50,
                output_price_per_mtok=10.00,
            ),
            "gpt-4o-mini": ModelSpec(
                display_name="GPT-4o Mini",
                max_tokens=4096,
                input_price_per_mtok=0.15,
                output_price_per_mtok=0.60,
            ),
            "gpt-4-turbo": ModelSpec(
                display_name="GPT-4 Turbo",
                max_tokens=4096,
                input_price_per_mtok=10.00,
                output_price_per_mtok=30.00,
            ),
            "o3-mini": ModelSpec(
                display_name="o3 Mini",
                max_tokens=4096,
                input_price_per_mtok=1.10,
                output_price_per_mtok=4.40,
            ),
        },
    ),
    "claude": ProviderConfig(
        name="claude",
        display_name="Anthropic Claude",
        base_url="https://api.anthropic.com/v1",
        env_key_name="ANTHROPIC_API_KEY",
        description="Claude models — nuanced, long-context reasoning.",
        extra_headers={
            "anthropic-version": "2023-06-01",
        },
        models={
            "claude-opus-4-8": ModelSpec(
                display_name="Claude Opus 4.8",
                max_tokens=4096,
                input_price_per_mtok=15.00,
                output_price_per_mtok=75.00,
            ),
            "claude-sonnet-4-6": ModelSpec(
                display_name="Claude Sonnet 4.6",
                max_tokens=4096,
                input_price_per_mtok=3.00,
                output_price_per_mtok=15.00,
            ),
            "claude-haiku-4-5": ModelSpec(
                display_name="Claude Haiku 4.5",
                max_tokens=4096,
                input_price_per_mtok=0.80,
                output_price_per_mtok=4.00,
            ),
        },
    ),
    "gemini": ProviderConfig(
        name="gemini",
        display_name="Google Gemini",
        base_url="https://generativelanguage.googleapis.com/v1beta/openai",
        env_key_name="GEMINI_API_KEY",
        description="Google's Gemini models — multimodal, strong reasoning.",
        models={
            "gemini-2.5-pro": ModelSpec(
                display_name="Gemini 2.5 Pro",
                max_tokens=4096,
                input_price_per_mtok=1.25,
                output_price_per_mtok=10.00,
            ),
            "gemini-2.5-flash": ModelSpec(
                display_name="Gemini 2.5 Flash",
                max_tokens=4096,
                input_price_per_mtok=0.15,
                output_price_per_mtok=0.60,
            ),
        },
    ),
    "copilot": ProviderConfig(
        name="copilot",
        display_name="GitHub Copilot",
        base_url="https://api.githubcopilot.com",
        env_key_name="COPILOT_API_KEY",
        description="GitHub Copilot — code-aware reasoning (requires Copilot subscription).",
        models={
            "copilot-gpt-5": ModelSpec(
                display_name="Copilot GPT-5",
                max_tokens=4096,
                input_price_per_mtok=0.0,   # included in Copilot subscription
                output_price_per_mtok=0.0,
            ),
        },
    ),
    "ollama": ProviderConfig(
        name="ollama",
        display_name="Ollama (Local)",
        base_url="http://localhost:11434/v1",
        env_key_name="",
        description="Run models locally — free, private, no API key needed.",
        requires_key=False,
        models={
            "llama3.2": ModelSpec(
                display_name="Llama 3.2",
                max_tokens=4096,
                input_price_per_mtok=0.0,
                output_price_per_mtok=0.0,
            ),
            "mistral": ModelSpec(
                display_name="Mistral",
                max_tokens=4096,
                input_price_per_mtok=0.0,
                output_price_per_mtok=0.0,
            ),
            "qwen2.5": ModelSpec(
                display_name="Qwen 2.5",
                max_tokens=4096,
                input_price_per_mtok=0.0,
                output_price_per_mtok=0.0,
            ),
        },
    ),
}


def get_provider(name: str) -> ProviderConfig | None:
    """Look up a provider by its machine name."""
    return PROVIDERS.get(name.lower())


def list_providers() -> list[dict]:
    """Return a serialisable list of all providers and their models (no secrets)."""
    result = []
    for p in PROVIDERS.values():
        result.append({
            "name": p.name,
            "display_name": p.display_name,
            "description": p.description,
            "requires_key": p.requires_key,
            "models": [
                {
                    "name": mname,
                    "display_name": mspec.display_name,
                    "max_tokens": mspec.max_tokens,
                }
                for mname, mspec in p.models.items()
            ],
        })
    return result


# ── Generate helper ──────────────────────────────────────────────────────────

async def generate_with_provider(
    prompt: str,
    *,
    provider_name: str,
    model: str,
    temperature: float = 0.3,
    max_tokens: int = 4000,
    api_key: str = "",
    endpoint: str = "unknown",
    log_prompt_cb=None,  # async callback for audit logging
) -> dict:
    """
    Call any LLM provider with a single user prompt.

    Parameters
    ----------
    prompt : str
        The full text prompt (system + user combined as a single user message).
    provider_name : str
        Machine key of the provider ("grok", "openai", "claude", "gemini", "copilot", "ollama").
    model : str
        Specific model name (e.g. "gpt-4o-mini", "claude-sonnet-4-6").
    temperature : float
        Sampling temperature.
    max_tokens : int
        Maximum completion tokens.
    api_key : str
        The user's API key for this provider. Required unless provider is Ollama.
    endpoint : str
        Logical endpoint name for logging (e.g. "graph_generation").
    log_prompt_cb : callable | None
        Async callback with signature (endpoint, prompt, response, model, max_tokens,
        temperature, duration_ms, error, input_tokens, output_tokens, cost_usd, provider).

    Returns
    -------
    dict with keys: text, model, input_tokens, output_tokens, cost_usd, provider
    """
    provider = get_provider(provider_name)
    if provider is None:
        raise ValueError(f"Unknown provider: {provider_name}")

    if provider.requires_key and not api_key:
        raise ValueError(
            f"No API key available for {provider.display_name}. "
            f"Add your {provider.display_name} API key in Settings → API Keys, "
            f"or set the {provider.env_key_name} environment variable on the server."
        )

    # Validate model exists for this provider
    model_spec = provider.models.get(model)
    if model_spec is None:
        # Allow unknown models (e.g. user-specified Ollama models) but warn
        log.warning("provider.unknown_model", provider=provider_name, model=model)
        model_spec = ModelSpec(display_name=model, max_tokens=max_tokens)

    effective_max_tokens = min(max_tokens, model_spec.max_tokens)
    api_timeout = max(90, int(effective_max_tokens * 0.04))

    # Build request — all providers use OpenAI-compatible format
    headers: dict[str, str] = {
        "Content-Type": "application/json",
    }

    if provider.requires_key and api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    # Add any provider-specific headers
    headers.update(provider.extra_headers)

    # Gemini uses x-goog-api-key pattern when accessed via the OpenAI-compatible endpoint
    # but also supports Bearer auth. We use Bearer which works for the /v1beta/openai path.

    body: dict[str, Any] = {
        "model": model,
        "max_tokens": effective_max_tokens,
        "temperature": temperature,
        "messages": [
            {"role": "user", "content": prompt},
        ],
    }

    chat_url = f"{provider.base_url}/chat/completions"

    t0 = time.monotonic()
    try:
        async with httpx.AsyncClient(timeout=api_timeout) as client:
            resp = await client.post(chat_url, headers=headers, json=body)
            resp.raise_for_status()
            data = resp.json()
            raw_text = data["choices"][0]["message"]["content"]

            # Parse usage for cost tracking
            usage = data.get("usage", {})
            input_tokens = usage.get("prompt_tokens")
            output_tokens = usage.get("completion_tokens")

            cost = None
            if input_tokens is not None and output_tokens is not None:
                cost = (
                    input_tokens / 1_000_000 * model_spec.input_price_per_mtok
                    + output_tokens / 1_000_000 * model_spec.output_price_per_mtok
                )

        duration_ms = int((time.monotonic() - t0) * 1000)

        if log_prompt_cb:
            try:
                await log_prompt_cb(
                    endpoint=endpoint,
                    prompt=prompt,
                    response=raw_text,
                    model=model,
                    max_tokens=effective_max_tokens,
                    temperature=temperature,
                    duration_ms=duration_ms,
                    error=None,
                    input_tokens=input_tokens,
                    output_tokens=output_tokens,
                    cost_usd=round(cost, 6) if cost is not None else None,
                    provider=provider_name,
                )
            except Exception:
                log.exception("log_prompt.callback_failed", endpoint=endpoint)

        return {
            "text": raw_text,
            "model": model,
            "provider": provider_name,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "cost_usd": round(cost, 6) if cost is not None else None,
        }

    except httpx.HTTPStatusError as exc:
        duration_ms = int((time.monotonic() - t0) * 1000)
        error_msg = f"HTTP {exc.response.status_code}: {exc.response.text[:500]}"

        if log_prompt_cb:
            try:
                await log_prompt_cb(
                    endpoint=endpoint,
                    prompt=prompt,
                    response=None,
                    model=model,
                    max_tokens=effective_max_tokens,
                    temperature=temperature,
                    duration_ms=duration_ms,
                    error=error_msg,
                    input_tokens=None,
                    output_tokens=None,
                    cost_usd=None,
                    provider=provider_name,
                )
            except Exception:
                log.exception("log_prompt.callback_failed", endpoint=endpoint)

        # Provide helpful messages for common errors
        if exc.response.status_code == 401:
            raise RuntimeError(
                f"Invalid API key for {provider.display_name}. "
                f"Please check your key in Settings and try again."
            ) from exc
        elif exc.response.status_code == 429:
            raise RuntimeError(
                f"Rate limit exceeded for {provider.display_name}. "
                f"Please wait a moment and try again, or switch to a different provider."
            ) from exc
        raise RuntimeError(f"{provider.display_name} API error: {error_msg}") from exc

    except httpx.TimeoutException as exc:
        duration_ms = int((time.monotonic() - t0) * 1000)
        error_msg = f"Request timed out after {api_timeout}s"
        if log_prompt_cb:
            try:
                await log_prompt_cb(
                    endpoint=endpoint,
                    prompt=prompt,
                    response=None,
                    model=model,
                    max_tokens=effective_max_tokens,
                    temperature=temperature,
                    duration_ms=duration_ms,
                    error=error_msg,
                    input_tokens=None,
                    output_tokens=None,
                    cost_usd=None,
                    provider=provider_name,
                )
            except Exception:
                pass
        raise RuntimeError(
            f"{provider.display_name} request timed out. "
            f"Try a smaller model or reduce the scope of your query."
        ) from exc

    except Exception as exc:
        duration_ms = int((time.monotonic() - t0) * 1000)
        if log_prompt_cb:
            try:
                await log_prompt_cb(
                    endpoint=endpoint,
                    prompt=prompt,
                    response=None,
                    model=model,
                    max_tokens=effective_max_tokens,
                    temperature=temperature,
                    duration_ms=duration_ms,
                    error=str(exc),
                    input_tokens=None,
                    output_tokens=None,
                    cost_usd=None,
                    provider=provider_name,
                )
            except Exception:
                pass
        raise
