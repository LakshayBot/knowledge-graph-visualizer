"use client";

import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import AuthGuard from "@/components/auth/AuthGuard";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import SearchBar from "@/components/explore/SearchBar";
import ModeSelector from "@/components/explore/ModeSelector";
import GraphCanvas from "@/components/explore/GraphCanvas";
import NodeDetailPanel from "@/components/explore/NodeDetailPanel";
import type { GraphNode, GraphEdge } from "@/types/graph";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5001/api/v1";

export default function ExplorePage() {
  return (
    <AuthGuard>
      <ExploreContent />
    </AuthGuard>
  );
}

function ExploreContent() {
  const searchParams = useSearchParams();
  const bp = useBreakpoint();
  const isNarrow = bp === "mobile" || bp === "tablet";
  const px = isNarrow ? "20px" : "32px";

  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"minimal" | "balanced" | "quality">("balanced");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [rootNodeId, setRootNodeId] = useState<string | null>(null);

  const [expanding, setExpanding] = useState(false);
  const [saved, setSaved] = useState(false);

  // ── Load existing chain from ?chainId= query param ────────────
  useEffect(() => {
    const cid = searchParams.get("chainId");
    if (!cid) return;
    setChainId(cid);
    setSaved(true);
    setLoading(true);
    // Use chain-scoped endpoint — only loads nodes/edges belonging to this chain
    fetch(`${API}/causalchains/${cid}/scoped?perspective=Mainstream`, { headers: headers() })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        const n = (data?.nodes ?? []) as GraphNode[];
        const e = (data?.edges ?? []) as GraphEdge[];
        setNodes(n);
        setEdges(e);
        const root = n.length > 0 ? n[0] : null;
        if (root) {
          setQuery(data?.chainMetadata?.title ?? root.title ?? "");
          setRootNodeId(root.id);
        }
      })
      .catch(() => setError("Failed to load saved chain."))
      .finally(() => setLoading(false));
  }, [searchParams]);

  function getToken() {
    return localStorage.getItem("accessToken") ?? "";
  }

  function headers(): Record<string, string> {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    const t = getToken();
    if (t) h["Authorization"] = `Bearer ${t}`;
    return h;
  }

  async function autoSave(cid: string) {
    try {
      await fetch(`${API}/causalchains/${cid}/save`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ notes: "" }),
      });
      setSaved(true);
    } catch { /* non-critical */ }
  }

  async function handleSearch() {
    if (!query.trim() || loading) return;
    setLoading(true);
    setError("");
    setNodes([]);
    setEdges([]);
    setSelectedNode(null);
    setChainId(null);
    setRootNodeId(null);
    setSaved(false);

    try {
      // Generate a fresh root node ID — the backend creates the event node automatically
      const rootEventId = crypto.randomUUID();

      // Phase 1 — create a chain rooted at a fresh node
      const chainRes = await fetch(`${API}/causalchains`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          title: query.trim(),
          rootEventId,
          domain: "Economics",
        }),
      });

      if (!chainRes.ok) {
        const errBody = await chainRes.json().catch(() => ({}));
        throw new Error(errBody.title || errBody.detail || `Failed to create chain (${chainRes.status})`);
      }

      const chainData = await chainRes.json();
      const cid = chainData.id as string;
      setChainId(cid);
      setRootNodeId(rootEventId);
      autoSave(cid);

      // Phase 2 — load chain-scoped graph
      const initRes = await fetch(`${API}/causalchains/${cid}/scoped?perspective=Mainstream`, {
        headers: headers(),
      });

      if (initRes.ok) {
        const graphData = await initRes.json();
        setNodes(graphData.nodes ?? []);
        setEdges(graphData.edges ?? []);
      }

      // Always expand via AI — even if Neo4j has edges, get fresh Grok context
      const expandRes = await fetch(`${API}/causalchains/${cid}/expand/${rootEventId}?perspective=Mainstream`, {
        method: "POST",
        headers: headers(),
      });
      if (expandRes.ok) {
        const expData = await expandRes.json();
        if (expData.nodes && expData.edges) {
          setNodes((prev) => {
            const seen = new Set(prev.map((n) => n.id));
            return [...prev, ...(expData.nodes as GraphNode[]).filter((n) => !seen.has(n.id))];
          });
          setEdges((prev) => {
            const seen = new Set(prev.map((e) => e.id));
            return [...prev, ...(expData.edges as GraphEdge[]).filter((e) => !seen.has(e.id))];
          });
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      if (msg.includes("API error (401)") || msg.includes("API error (403)")) {
        setError("Session expired. Please sign in again.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleExpand(nodeId: string) {
    if (!chainId || expanding) return;
    setExpanding(true);
    try {
      const res = await fetch(`${API}/causalchains/${chainId}/expand/${nodeId}?perspective=Mainstream`, {
        method: "POST",
        headers: headers(),
      });
      if (res.ok) {
        const graphData = await res.json();
        const newNodes: GraphNode[] = graphData.nodes ?? [];
        const newEdges: GraphEdge[] = graphData.edges ?? [];
        setNodes((prev) => {
          const seen = new Set(prev.map((n) => n.id));
          return [...prev, ...newNodes.filter((n) => !seen.has(n.id))];
        });
        setEdges((prev) => {
          const seen = new Set(prev.map((e) => e.id));
          return [...prev, ...newEdges.filter((e) => !seen.has(e.id))];
        });
      }
    } catch { /* silently fail on expand */ }
    finally { setExpanding(false); }
  }

  const handleNodeClick = useCallback((nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId) ?? null;
    setSelectedNode(node);
  }, [nodes]);

  return (
    <div style={{ height: "calc(100svh - var(--chrome-h))", minHeight: 0, display: "flex", flexDirection: "column", background: "var(--bg)", overflow: "hidden" }}>
      {/* Top bar */}
      <div
        style={{
          padding: `20px ${px}`,
          borderBottom: "1px solid var(--border)",
          display: "flex",
          flexDirection: isNarrow ? "column" : "row",
          gap: isNarrow ? 12 : 16,
          alignItems: isNarrow ? "stretch" : "center",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <span className="eyebrow">Explore</span>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
          <SearchBar
            value={query}
            onChange={setQuery}
            onSubmit={handleSearch}
            loading={loading}
          />
          <div style={{ maxWidth: 540 }}>
            <ModeSelector value={mode} onChange={setMode} disabled={loading} />
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            margin: isNarrow ? "12px 20px" : "12px 32px",
            padding: "12px 16px",
            background: "rgba(231,76,60,0.08)",
            border: "1px solid rgba(231,76,60,0.2)",
            fontSize: 12,
            color: "#e74c3c",
            fontWeight: 600,
            letterSpacing: "0.03em",
            flexShrink: 0,
          }}
        >
          {error}
        </div>
      )}

      {/* Main area */}
      {isNarrow ? (
        /* Mobile: stacked — graph on top, detail panel pinned at bottom */
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
          <div style={{ flex: 1, minHeight: 220, overflow: "hidden" }}>
            <GraphCanvas
              nodes={nodes}
              edges={edges}
              rootId={rootNodeId}
              onNodeClick={handleNodeClick}
              loading={loading}
            />
          </div>
          <div style={{ borderTop: "1px solid var(--border)", flexShrink: 0, height: "min(320px, 48svh)", minHeight: 220 }}>
            <NodeDetailPanel
              node={selectedNode}
              edges={edges}
              saved={saved}
              onExpand={chainId ? handleExpand : undefined}
              expanding={expanding}
            />
          </div>
        </div>
      ) : (
        /* Desktop: split */
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "minmax(0, 1fr) 340px", minHeight: 0, overflow: "hidden" }}>
          <div style={{ position: "relative", overflow: "hidden", background: "var(--bg-subtle)", minWidth: 0, minHeight: 0 }}>
            <div
              style={{
                position: "absolute", inset: 0,
                backgroundImage: "radial-gradient(var(--border-med) 1px, transparent 1px)",
                backgroundSize: "28px 28px",
                opacity: 0.6,
                pointerEvents: "none",
              }}
            />
            <div style={{ position: "relative", width: "100%", height: "100%", minHeight: 0 }}>
              <GraphCanvas
                nodes={nodes}
                edges={edges}
                rootId={rootNodeId}
                onNodeClick={handleNodeClick}
                loading={loading}
              />
            </div>
          </div>
          <NodeDetailPanel
            node={selectedNode}
            edges={edges}
            saved={saved}
            onExpand={chainId ? handleExpand : undefined}
            expanding={expanding}
          />
        </div>
      )}
    </div>
  );
}
