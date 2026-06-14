"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AuthGuard from "@/components/auth/AuthGuard";
import { useAuth } from "@/hooks/useAuth";
import { useApi } from "@/hooks/useApi";
import Button from "@/components/shared/Button";
import SavedChainCard from "@/components/dashboard/SavedChainCard";
import type { SavedChain } from "@/types/graph";

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}

function DashboardContent() {
  const { user } = useAuth();
  const { fetchApi, loading } = useApi<SavedChain[]>();
  const [chains, setChains] = useState<SavedChain[]>([]);
  const [fetched, setFetched] = useState(false);

  useEffect(() => {
    if (fetched) return;
    fetchApi("/users/me/chains").then((r) => {
      if (r.data) setChains(r.data);
      setFetched(true);
    });
  }, [fetchApi, fetched]);

  return (
    <div
      style={{
        padding: "40px 24px 80px",
        background: "var(--bg)",
        minHeight: "calc(100svh - 56px)",
      }}
    >
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 24,
            marginBottom: 36,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "clamp(24px, 3vw, 36px)",
                fontWeight: 900,
                letterSpacing: "-0.04em",
                color: "var(--text-1)",
                marginBottom: 4,
              }}
            >
              Welcome back, {user?.username ?? "Explorer"}
            </h1>
            <p style={{ fontSize: 13, color: "var(--text-3)" }}>
              Explore your saved causal graphs or start a new one.
            </p>
          </div>
        </div>

        {/* Quick action */}
        <Link
          href="/explore"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            padding: "18px 24px",
            marginBottom: 36,
            textDecoration: "none",
            color: "var(--text-3)",
            fontSize: 14,
            fontWeight: 500,
            transition: "border-color 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--text-1)")}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          Ask a question to generate a new causal graph...
        </Link>

        {/* Saved chains */}
        <div>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 16, gap: 16 }}>
            <span className="eyebrow" style={{ marginBottom: 0 }}>Saved Graphs</span>
            <Link
              href="/history"
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "var(--text-4)",
                textDecoration: "none",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                transition: "color 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-1)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-4)")}
            >
              View All →
            </Link>
          </div>

          {loading && !fetched ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "40px 0", color: "var(--text-4)", fontSize: 13 }}>
              <div style={{ width: 18, height: 18, border: "2px solid var(--border-med)", borderTopColor: "var(--text-1)", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
              Loading saved graphs...
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : chains.length === 0 ? (
            <div
              style={{
                padding: "48px 24px",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
              }}
            >
              <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text-3)", margin: 0 }}>
                No saved graphs yet
              </p>
              <p style={{ fontSize: 12, color: "var(--text-4)", margin: 0 }}>
                Generate your first causal graph and save it to see it here.
              </p>
              <Link href="/explore" style={{ marginTop: 8 }}>
                <Button variant="primary">Start Exploring</Button>
              </Link>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: 12,
              }}
            >
              {chains.map((c) => (
                <SavedChainCard key={c.chainId} chain={c} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
