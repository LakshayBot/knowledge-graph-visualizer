"use client";

import { useState, useEffect } from "react";
import { Sparkles, ChevronDown, Circle } from "lucide-react";
import { apiFetch } from "@/lib/api-client";

/* ── Types ─────────────────────────────────────────────────── */

interface ModelInfo {
  name: string;
  displayName: string;
  maxTokens: number;
}

interface ProviderInfo {
  name: string;
  displayName: string;
  description: string;
  requiresKey: boolean;
  isComingSoon: boolean;
  models: ModelInfo[];
}

interface ApiKeyStatus {
  provider: string;
  hasKey: boolean;
  keyPrefix: string | null;
  isActive: boolean;
}

interface Props {
  provider: string;
  model: string;
  onProviderChange: (provider: string, model: string) => void;
  disabled?: boolean;
}

/* ── Component ──────────────────────────────────────────────── */

export default function ProviderModelSelector({
  provider,
  model,
  onProviderChange,
  disabled,
}: Props) {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [keyStatuses, setKeyStatuses] = useState<ApiKeyStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [provData, keyData] = await Promise.all([
          apiFetch<ProviderInfo[]>("/providers"),
          apiFetch<{ keys: ApiKeyStatus[] }>("/apikeys/me").catch(() => ({
            keys: [],
          })),
        ]);
        setProviders(provData);
        setKeyStatuses(keyData.keys || []);
      } catch {
        // Use built-in defaults if API fails
        setProviders(getDefaultProviders());
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const selectedProvider = providers.find((p) => p.name === provider);
  const selectedKeyStatus = keyStatuses.find((k) => k.provider === provider);
  const hasKey = selectedKeyStatus?.hasKey || !selectedProvider?.requiresKey;

  const providerHasKey = (provName: string) => {
    const p = providers.find((pr) => pr.name === provName);
    if (!p || !p.requiresKey) return true; // local providers never need a key
    return !!keyStatuses.find((k) => k.provider === provName)?.hasKey;
  };

  // BYOK: if the currently selected provider requires a key and none is
  // configured, fall back to the local provider so the user can always generate.
  useEffect(() => {
    if (loading) return;
    const p = providers.find((pr) => pr.name === provider);
    if (p && p.requiresKey && !providerHasKey(provider)) {
      const local = providers.find((pr) => pr.name === "ollama");
      if (local) onProviderChange("ollama", local.models[0]?.name || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, providers, keyStatuses]);

  const handleProviderSelect = (provName: string) => {
    const p = providers.find((pr) => pr.name === provName);
    if (p?.isComingSoon) return; // prevent switching to coming-soon providers
    if (p?.requiresKey && !providerHasKey(provName)) return; // prevent switching to keyless-but-no-key providers
    const defaultModel = p?.models[0]?.name || "";
    onProviderChange(provName, defaultModel);
  };

  const selectStyle: React.CSSProperties = {
    padding: "6px 10px",
    fontSize: 11,
    fontFamily: "'JetBrains Mono', monospace",
    fontWeight: 500,
    color: "var(--text-2)",
    background: "var(--bg)",
    border: "1px solid var(--border)",
    borderRadius: 6,
    cursor: disabled ? "not-allowed" : "pointer",
    outline: "none",
    opacity: disabled ? 0.5 : 1,
    minWidth: 120,
  };

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "4px 8px",
        }}
      >
        <div
          style={{
            height: 28,
            width: 100,
            background: "var(--bg-subtle)",
            borderRadius: 6,
            animation: "pulse 1.5s infinite",
          }}
        />
        <div
          style={{
            height: 28,
            width: 80,
            background: "var(--bg-subtle)",
            borderRadius: 6,
            animation: "pulse 1.5s infinite",
          }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "4px",
        background: "var(--bg-subtle)",
        borderRadius: 8,
        border: "1px solid var(--border)",
      }}
    >
      {/* Key status indicator */}
      <span
        title={
          !selectedProvider?.requiresKey
            ? "Local model — no key needed"
            : hasKey
              ? "Key configured"
              : "No key — add one in Settings"
        }
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "0 4px",
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <Circle
          size={8}
          fill={hasKey ? "var(--chart-2)" : "var(--destructive)"}
          stroke={hasKey ? "var(--chart-2)" : "var(--destructive)"}
        />
      </span>

      {/* Provider select */}
      <select
        value={provider}
        onChange={(e) => handleProviderSelect(e.target.value)}
        disabled={disabled}
        style={selectStyle}
      >
        {providers.map((p) => {
          const optionLocked = p.isComingSoon || (p.requiresKey && !providerHasKey(p.name));
          return (
            <option key={p.name} value={p.name} disabled={optionLocked}>
              {p.displayName}
              {p.isComingSoon ? " (Coming Soon)" : ""}
              {p.requiresKey && !p.isComingSoon && !providerHasKey(p.name) ? " — no key" : ""}
            </option>
          );
        })}
      </select>

      {/* Model select */}
      <select
        value={model}
        onChange={(e) => onProviderChange(provider, e.target.value)}
        disabled={disabled || !selectedProvider}
        style={selectStyle}
      >
        {(selectedProvider?.models || []).map((m) => (
          <option key={m.name} value={m.name}>
            {m.displayName}
          </option>
        ))}
      </select>

      {/* Token limit info */}
      {selectedProvider?.models.find((m) => m.name === model) && (
        <span
          style={{
            fontSize: 10,
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 500,
            color: "var(--text-4)",
            paddingRight: 8,
            whiteSpace: "nowrap",
          }}
        >
          {model === "grok-3-mini"
            ? "4k"
            : model.includes("mini") || model.includes("flash") || model.includes("haiku")
              ? "4k"
              : "8k"}{" "}
          tokens
        </span>
      )}
    </div>
  );
}

/* ── Fallback providers (when API is unavailable) ──────────── */

function getDefaultProviders(): ProviderInfo[] {
  return [
    {
      name: "grok",
      displayName: "Grok (xAI)",
      description: "",
      requiresKey: true,
      isComingSoon: false,
      models: [
        { name: "grok-3-mini", displayName: "Grok 3 Mini", maxTokens: 4000 },
        { name: "grok-3", displayName: "Grok 3", maxTokens: 8000 },
      ],
    },
    {
      name: "openai",
      displayName: "OpenAI",
      description: "",
      requiresKey: true,
      isComingSoon: true,
      models: [
        { name: "gpt-4o", displayName: "GPT-4o", maxTokens: 4096 },
        { name: "gpt-4o-mini", displayName: "GPT-4o Mini", maxTokens: 4096 },
      ],
    },
    {
      name: "claude",
      displayName: "Anthropic Claude",
      description: "",
      requiresKey: true,
      isComingSoon: true,
      models: [
        { name: "claude-sonnet-4-6", displayName: "Claude Sonnet 4.6", maxTokens: 4096 },
        { name: "claude-haiku-4-5", displayName: "Claude Haiku 4.5", maxTokens: 4096 },
      ],
    },
    {
      name: "ollama",
      displayName: "Ollama (Local)",
      description: "",
      requiresKey: false,
      isComingSoon: false,
      models: [
        { name: "llama3.2", displayName: "Llama 3.2", maxTokens: 4096 },
        { name: "mistral", displayName: "Mistral", maxTokens: 4096 },
      ],
    },
  ];
}
