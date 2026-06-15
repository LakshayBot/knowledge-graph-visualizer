"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import AuthGuard from "@/components/auth/AuthGuard";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { apiFetch } from "@/lib/api-client";
import Button from "@/components/shared/Button";
import SavedChainCard from "@/components/dashboard/SavedChainCard";
import type { SavedChain } from "@/types/graph";

export default function HistoryPage() {
  return (
    <AuthGuard>
      <HistoryContent />
    </AuthGuard>
  );
}

function HistoryContent() {
  const bp = useBreakpoint();
  const isNarrow = bp === "mobile" || bp === "tablet";
  const px = isNarrow ? "20px" : "32px";

  const [chains, setChains] = useState<SavedChain[]>([]);
  const [loading, setLoading] = useState(true);

  const loadChains = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<SavedChain[]>("/users/me/chains");
      setChains([...(data ?? [])].sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()));
    } catch { /* ignore — apiFetch handles 401 */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadChains(); }, [loadChains]);

  return (
    <div
      style={{
        padding: `40px ${px} 80px`,
        background: "var(--bg)",
        minHeight: "100%",
      }}
    >
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            marginBottom: 32,
            gap: 16,
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
                margin: "0 0 4px 0",
              }}
            >
              History
            </h1>
            <p style={{ fontSize: 13, color: "var(--text-3)", margin: 0 }}>
              All your saved causal graphs
            </p>
          </div>
          <Link href="/explore">
            <Button variant="primary">New Graph</Button>
          </Link>
        </div>

        {loading ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "60px 0",
              gap: 10,
              color: "var(--text-4)",
              fontSize: 13,
            }}
          >
            <div
              style={{
                width: 18,
                height: 18,
                border: "2px solid var(--border-med)",
                borderTopColor: "var(--text-1)",
                borderRadius: "50%",
                animation: "spin 0.6s linear infinite",
              }}
            />
            Loading history...
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : chains.length === 0 ? (
          <div
            style={{
              padding: "60px 24px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
            }}
          >
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--text-4)" strokeWidth="1.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text-3)", margin: 0 }}>
              No saved graphs yet
            </p>
            <p style={{ fontSize: 12, color: "var(--text-4)", margin: 0, maxWidth: 300 }}>
              Your search results and expanded graphs are automatically saved here.
              Start exploring to build your history.
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
            {chains.map((chain) => (
              <SavedChainCard key={chain.chainId} chain={chain} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
