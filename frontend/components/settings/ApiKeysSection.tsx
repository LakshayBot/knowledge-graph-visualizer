"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api-client";
import { Key, Trash2, Eye, EyeOff, Check, X, Loader2 } from "lucide-react";

/* ── Types ─────────────────────────────────────────────────── */

interface ApiKeyStatus {
  provider: string;
  providerDisplayName: string;
  hasKey: boolean;
  keyPrefix: string | null;
  isActive: boolean;
  lastVerifiedAt: string | null;
}

/* ── Helpers ────────────────────────────────────────────────── */

const PROVIDER_ICONS: Record<string, string> = {
  grok: "⚡",
  openai: "🧠",
  claude: "🎭",
  gemini: "💎",
  copilot: "🤖",
  ollama: "🏠",
};

/* ── Component ──────────────────────────────────────────────── */

export default function ApiKeysSection() {
  const [keys, setKeys] = useState<ApiKeyStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const [keyInput, setKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fetchKeys = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch<{ keys: ApiKeyStatus[] }>("/apikeys/me");
      setKeys(data.keys);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load API keys";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleSave = async (provider: string) => {
    if (!keyInput.trim()) return;
    try {
      setSaving(true);
      setSaveError(null);
      await apiFetch("/apikeys/me", {
        method: "PUT",
        body: JSON.stringify({ provider, apiKey: keyInput.trim() }),
      });
      setEditingProvider(null);
      setKeyInput("");
      await fetchKeys();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save key";
      setSaveError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (provider: string) => {
    if (!confirm(`Remove your ${provider} API key?`)) return;
    try {
      await apiFetch(`/apikeys/me/${provider}`, { method: "DELETE" });
      await fetchKeys();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to remove key";
      setError(message);
    }
  };

  /* ── Render states ────────────────────────────────────────── */

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              height: 64,
              borderRadius: 8,
              background: "var(--bg-subtle)",
              animation: "pulse 1.5s infinite",
            }}
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          padding: 24,
          borderRadius: 8,
          border: "1px solid var(--destructive)",
          background: "rgba(var(--destructive-rgb, 239,68,68), 0.05)",
          color: "var(--destructive)",
          fontSize: 14,
        }}
      >
        <p style={{ margin: 0, fontWeight: 600 }}>Failed to load API keys</p>
        <p style={{ margin: "4px 0 0", opacity: 0.8, fontSize: 13 }}>{error}</p>
        <button
          onClick={fetchKeys}
          style={{
            marginTop: 12,
            padding: "6px 16px",
            fontSize: 13,
            fontWeight: 500,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            cursor: "pointer",
            color: "var(--text-1)",
            fontFamily: "inherit",
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {keys.map((k) => {
        const isEditing = editingProvider === k.provider;
        const icon = PROVIDER_ICONS[k.provider] || "🔑";

        return (
          <div
            key={k.provider}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "16px 20px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--surface)",
              transition: "border-color 0.15s",
            }}
          >
            {/* Provider icon + name */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 20 }}>{icon}</span>
                <div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 14,
                      fontWeight: 600,
                      color: "var(--text-1)",
                    }}
                  >
                    {k.providerDisplayName}
                  </p>
                  {!k.hasKey && (
                    <p
                      style={{
                        margin: "2px 0 0",
                        fontSize: 12,
                        color: "var(--text-4)",
                      }}
                    >
                      No key configured
                    </p>
                  )}
                  {k.hasKey && k.isActive && (
                    <p
                      style={{
                        margin: "2px 0 0",
                        fontSize: 12,
                        color: "var(--text-3)",
                        fontFamily: "'JetBrains Mono', monospace",
                      }}
                    >
                      {k.keyPrefix}
                      {k.lastVerifiedAt &&
                        ` · Verified ${new Date(k.lastVerifiedAt).toLocaleDateString()}`}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Status badge */}
            <div style={{ flexShrink: 0 }}>
              {k.hasKey && k.isActive ? (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "4px 10px",
                    borderRadius: 20,
                    fontSize: 11,
                    fontWeight: 600,
                    background: "rgba(34,197,94,0.1)",
                    color: "var(--chart-2)",
                  }}
                >
                  <Check size={12} /> Active
                </span>
              ) : (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "4px 10px",
                    borderRadius: 20,
                    fontSize: 11,
                    fontWeight: 600,
                    background: "rgba(156,163,175,0.1)",
                    color: "var(--text-4)",
                  }}
                >
                  <X size={12} /> None
                </span>
              )}
            </div>

            {/* Actions */}
            <div style={{ flexShrink: 0, display: "flex", gap: 6 }}>
              {k.hasKey ? (
                <button
                  onClick={() => handleRemove(k.provider)}
                  title="Remove key"
                  style={{
                    padding: "6px 10px",
                    background: "transparent",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    cursor: "pointer",
                    color: "var(--text-3)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 12,
                    fontFamily: "inherit",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "var(--destructive)";
                    e.currentTarget.style.borderColor = "var(--destructive)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "var(--text-3)";
                    e.currentTarget.style.borderColor = "var(--border)";
                  }}
                >
                  <Trash2 size={14} /> Remove
                </button>
              ) : (
                <button
                  onClick={() => {
                    setEditingProvider(k.provider);
                    setKeyInput("");
                    setSaveError(null);
                  }}
                  style={{
                    padding: "6px 14px",
                    background: "var(--brand)",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                    color: "#fff",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 12,
                    fontWeight: 600,
                    fontFamily: "inherit",
                    transition: "opacity 0.15s",
                  }}
                >
                  <Key size={14} /> Add Key
                </button>
              )}
            </div>
          </div>
        );
      })}

      {/* Inline edit modal */}
      {editingProvider && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.4)",
          }}
          onClick={() => {
            if (!saving) {
              setEditingProvider(null);
              setKeyInput("");
              setSaveError(null);
            }
          }}
        >
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: 24,
              width: 420,
              maxWidth: "90vw",
              boxShadow: "0 8px 40px rgba(0,0,0,0.15)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              style={{
                margin: "0 0 4px",
                fontSize: 16,
                fontWeight: 700,
                color: "var(--text-1)",
              }}
            >
              Add API Key —{" "}
              {keys.find((k) => k.provider === editingProvider)?.providerDisplayName ||
                editingProvider}
            </h3>
            <p
              style={{
                margin: "0 0 16px",
                fontSize: 12,
                color: "var(--text-3)",
                lineHeight: 1.5,
              }}
            >
              Your key is encrypted at rest and never shared. Get your key from
              the provider&apos;s developer console.
            </p>

            <div style={{ position: "relative", marginBottom: 12 }}>
              <input
                type={showKey ? "text" : "password"}
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="sk-... or xai-..."
                autoFocus
                style={{
                  width: "100%",
                  padding: "10px 40px 10px 12px",
                  fontSize: 13,
                  fontFamily: "'JetBrains Mono', monospace",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  background: "var(--bg)",
                  color: "var(--text-1)",
                  outline: "none",
                  boxSizing: "border-box",
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && keyInput.trim()) {
                    handleSave(editingProvider);
                  }
                }}
              />
              <button
                onClick={() => setShowKey(!showKey)}
                style={{
                  position: "absolute",
                  right: 8,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-3)",
                  padding: 4,
                }}
              >
                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {saveError && (
              <p
                style={{
                  margin: "0 0 12px",
                  fontSize: 12,
                  color: "var(--destructive)",
                }}
              >
                {saveError}
              </p>
            )}

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                onClick={() => {
                  setEditingProvider(null);
                  setKeyInput("");
                  setSaveError(null);
                }}
                disabled={saving}
                style={{
                  padding: "8px 16px",
                  fontSize: 13,
                  fontWeight: 500,
                  background: "transparent",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  cursor: saving ? "not-allowed" : "pointer",
                  color: "var(--text-2)",
                  fontFamily: "inherit",
                  opacity: saving ? 0.5 : 1,
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleSave(editingProvider)}
                disabled={!keyInput.trim() || saving}
                style={{
                  padding: "8px 20px",
                  fontSize: 13,
                  fontWeight: 600,
                  background: "var(--brand)",
                  border: "none",
                  borderRadius: 6,
                  cursor: !keyInput.trim() || saving ? "not-allowed" : "pointer",
                  color: "#fff",
                  fontFamily: "inherit",
                  opacity: !keyInput.trim() || saving ? 0.5 : 1,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {saving && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
                {saving ? "Verifying..." : "Save Key"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
