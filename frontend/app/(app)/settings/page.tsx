"use client";

import { useState } from "react";
import AuthGuard from "@/components/auth/AuthGuard";
import ApiKeysSection from "@/components/settings/ApiKeysSection";

type Tab = "keys" | "usage";

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("keys");

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: "8px 16px",
    fontSize: 13,
    fontWeight: active ? 600 : 500,
    color: active ? "var(--text-1)" : "var(--text-3)",
    background: active ? "var(--bg-subtle)" : "transparent",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "all 0.15s",
  });

  return (
    <AuthGuard>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 24px" }}>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: "-0.03em",
            color: "var(--text-1)",
            marginBottom: 8,
          }}
        >
          Settings
        </h1>
        <p
          style={{
            fontSize: 14,
            color: "var(--text-3)",
            marginBottom: 32,
            lineHeight: 1.6,
          }}
        >
          Manage your AI provider API keys. Your keys are encrypted at rest and
          never shared.
        </p>

        <div
          style={{
            display: "flex",
            gap: 4,
            marginBottom: 24,
            borderBottom: "1px solid var(--border)",
            paddingBottom: 8,
          }}
        >
          <button style={tabStyle(tab === "keys")} onClick={() => setTab("keys")}>
            API Keys
          </button>
          <button style={tabStyle(tab === "usage")} onClick={() => setTab("usage")}>
            Usage
          </button>
        </div>

        {tab === "keys" && <ApiKeysSection />}
        {tab === "usage" && <UsageSection />}
      </div>
    </AuthGuard>
  );
}

function UsageSection() {
  return (
    <div
      style={{
        padding: 40,
        textAlign: "center",
        color: "var(--text-3)",
        fontSize: 14,
      }}
    >
      <p>Usage tracking is logged to your AI provider dashboards.</p>
      <p style={{ marginTop: 8 }}>
        Check your{" "}
        <a href="https://console.x.ai/" target="_blank" rel="noopener" style={{ color: "var(--brand)" }}>
          xAI Console
        </a>
        ,{" "}
        <a href="https://platform.openai.com/usage" target="_blank" rel="noopener" style={{ color: "var(--brand)" }}>
          OpenAI Usage
        </a>
        , or other provider dashboards for detailed metrics.
      </p>
    </div>
  );
}
