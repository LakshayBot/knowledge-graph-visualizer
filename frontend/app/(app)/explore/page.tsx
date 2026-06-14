"use client";

import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import AuthGuard from "@/components/auth/AuthGuard";
import { useBreakpoint } from "@/hooks/useBreakpoint";
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

const DOMAINS = ["Geopolitics", "Economics", "Technology", "Social", "Environmental", "Military", "Cultural"];

function ExploreContent() {
  const searchParams = useSearchParams();
  const bp = useBreakpoint();
  const isNarrow = bp === "mobile" || bp === "tablet";

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [rootNodeId, setRootNodeId] = useState<string | null>(null);
  const [expanding, setExpanding] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const cid = searchParams.get("chainId");
    if (!cid) return;
    setChainId(cid);
    setSaved(true);
    setLoading(true);
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

  function getToken() { return localStorage.getItem("accessToken") ?? ""; }

  function headers(): Record<string, string> {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    const t = getToken();
    if (t) h["Authorization"] = `Bearer ${t}`;
    return h;
  }

  async function autoSave(cid: string) {
    try {
      await fetch(`${API}/causalchains/${cid}/save`, { method: "POST", headers: headers(), body: JSON.stringify({ notes: "" }) });
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
      const rootEventId = crypto.randomUUID();
      const chainRes = await fetch(`${API}/causalchains`, {
        method: "POST", headers: headers(),
        body: JSON.stringify({ title: query.trim(), rootEventId, domain: "Economics" }),
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

      const initRes = await fetch(`${API}/causalchains/${cid}/scoped?perspective=Mainstream`, { headers: headers() });
      if (initRes.ok) {
        const graphData = await initRes.json();
        setNodes(graphData.nodes ?? []);
        setEdges(graphData.edges ?? []);
      }

      const expandRes = await fetch(`${API}/causalchains/${cid}/expand/${rootEventId}?perspective=Mainstream`, {
        method: "POST", headers: headers(),
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
      setError(msg);
    } finally { setLoading(false); }
  }

  const handleNodeClick = useCallback((nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId) ?? null;
    setSelectedNode(node);
  }, [nodes]);

  async function handleExpand(nodeId: string) {
    if (!chainId || expanding) return;
    setExpanding(true);
    try {
      const res = await fetch(`${API}/causalchains/${chainId}/expand/${nodeId}?perspective=Mainstream`, {
        method: "POST", headers: headers(),
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

  if (isNarrow) {
    return (
      <div style={{ height: "calc(100svh - 90px)", display: "flex", flexDirection: "column", minHeight: 0, background: "#f9f9f9" }}>
        {/* Command Bar on mobile */}
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #e4e4e7", background: "#fff" }}>
          <div style={{ display: "flex", gap: 0 }}>
            <input
              type="text" value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Query graph..."
              disabled={loading}
              style={{
                flex: 1, background: "transparent", border: "none", outline: "none",
                fontSize: 14, fontFamily: "JetBrains Mono, monospace", fontWeight: 500,
                color: "#1a1c1c", padding: "10px 0",
              }}
            />
            <button
              onClick={handleSearch}
              disabled={loading || !query.trim()}
              style={{
                background: loading ? "#e4e4e7" : "#000", color: loading ? "#71717a" : "#fff",
                border: "none", padding: "8px 16px", borderRadius: 8,
                fontSize: 13, fontWeight: 600, fontFamily: "inherit",
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "..." : "Run"}
            </button>
          </div>
        </div>
        {/* Canvas */}
        <div style={{ flex: 1, minHeight: 0 }}>
          <GraphCanvas nodes={nodes} edges={edges} rootId={rootNodeId} onNodeClick={handleNodeClick} loading={loading} />
        </div>
        {/* Detail Panel */}
        {selectedNode && (
          <div style={{ maxHeight: "45vh", overflowY: "auto", borderTop: "1px solid #e4e4e7" }}>
            <NodeDetailPanel node={selectedNode} edges={edges} saved={saved} onExpand={chainId ? handleExpand : undefined} expanding={expanding} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ height: "calc(100svh - 90px)", display: "flex", flexDirection: "column", minHeight: 0, background: "#f9f9f9" }}>
      {/* Main Workspace: Sidebar | Canvas | Inspector */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>
        {/* Left Sidebar */}
        <aside style={{ width: 256, display: "flex", flexDirection: "column", borderRight: "1px solid #e4e4e7", background: "#fff", flexShrink: 0 }}>
          {/* Header */}
          <div style={{ padding: "20px 20px 12px" }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "#000", margin: 0, letterSpacing: "-0.01em" }}>GraphEngine</h1>
            <p style={{ fontSize: 11, fontWeight: 500, color: "#71717a", letterSpacing: "0.04em", textTransform: "uppercase", margin: "4px 0 0 0" }}>
              Causal Explorer
            </p>
          </div>

          {/* Domain Filter */}
          <div style={{ padding: "0 20px 20px", flex: 1, overflowY: "auto" }}>
            <h3 style={{ fontSize: 11, fontWeight: 600, color: "#000", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 12px 0" }}>
              Domains
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {DOMAINS.map((domain) => (
                <label
                  key={domain}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "8px 10px",
                    borderRadius: 4, cursor: "pointer", fontSize: 13, fontWeight: 500,
                    color: "#4c4546", transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f3f3f3")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#000", flexShrink: 0 }} />
                  {domain}
                </label>
              ))}
            </div>
          </div>

          {/* Saved indicator */}
          {saved && (
            <div style={{ padding: "12px 20px", borderTop: "1px solid #e4e4e7", fontSize: 11, fontWeight: 500, color: "#71717a", display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ color: "#22c55e" }}>&#x2713;</span> Saved to History
            </div>
          )}
        </aside>

        {/* Center Canvas */}
        <main style={{ flex: 1, position: "relative", overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {/* Grid canvas */}
          <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
            <GraphCanvas nodes={nodes} edges={edges} rootId={rootNodeId} onNodeClick={handleNodeClick} loading={loading} />

            {/* Zoom Controls (bottom right) */}
            <div style={{ position: "absolute", bottom: 24, right: 24, display: "flex", flexDirection: "column", gap: 0, zIndex: 20 }}>
              <div style={{ background: "#fff", border: "1px solid #e4e4e7", borderRadius: 8, display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                <button
                  style={{ padding: "8px 12px", border: "none", borderBottom: "1px solid #e4e4e7", background: "#fff", color: "#4c4546", cursor: "pointer", fontSize: 16, lineHeight: 1, transition: "background 0.15s", fontFamily: "inherit" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#f3f3f3"; e.currentTarget.style.color = "#000"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = "#4c4546"; }}
                >
                  +
                </button>
                <button
                  style={{ padding: "8px 12px", border: "none", borderBottom: "1px solid #e4e4e7", background: "#fff", color: "#4c4546", cursor: "pointer", fontSize: 16, lineHeight: 1, transition: "background 0.15s", fontFamily: "inherit" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#f3f3f3"; e.currentTarget.style.color = "#000"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = "#4c4546"; }}
                >
                  -
                </button>
                <button
                  style={{ padding: "8px 12px", border: "none", background: "#fff", color: "#4c4546", cursor: "pointer", fontSize: 16, lineHeight: 1, transition: "background 0.15s", fontFamily: "inherit" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#f3f3f3"; e.currentTarget.style.color = "#000"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = "#4c4546"; }}
                >
                  &#x25A1;
                </button>
              </div>
            </div>
          </div>

          {/* Command Bar (bottom center) */}
          <div style={{ padding: "12px 24px 16px", display: "flex", justifyContent: "center" }}>
            <div style={{
              background: "#fff", border: "1px solid #e4e4e7", borderRadius: 12,
              padding: "6px 6px 6px 16px", display: "flex", alignItems: "center", gap: 8,
              width: "100%", maxWidth: 680, boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
            }}>
              <span style={{ color: "#000", fontSize: 18 }}>&gt;_</span>
              <input
                type="text" value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Query graph (e.g. 'What caused the Euro to weaken against USD in 2022?')..."
                disabled={loading}
                style={{
                  flex: 1, background: "transparent", border: "none", outline: "none",
                  fontSize: 13, fontFamily: "JetBrains Mono, monospace", fontWeight: 500,
                  color: "#1a1c1c",
                }}
              />
              <button
                onClick={handleSearch}
                disabled={loading || !query.trim()}
                style={{
                  background: loading || !query.trim() ? "#e4e4e7" : "#000",
                  color: loading || !query.trim() ? "#71717a" : "#fff",
                  border: "none", padding: "8px 16px", borderRadius: 8,
                  fontSize: 13, fontWeight: 600, fontFamily: "inherit",
                  cursor: loading || !query.trim() ? "not-allowed" : "pointer",
                }}
              >
                {loading ? "Running..." : <>Run <span style={{ fontSize: 10, color: loading ? "#71717a" : "rgba(255,255,255,0.5)" }}>&#x23CE;</span></>}
              </button>
            </div>
          </div>
        </main>

        {/* Right Inspector Panel */}
        <aside style={{ width: 320, borderLeft: "1px solid #e4e4e7", background: "#fff", display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <div style={{ height: 48, borderBottom: "1px solid #e4e4e7", display: "flex", alignItems: "center", padding: "0 16px" }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: "#000", margin: 0 }}>Inspector</h2>
          </div>
          {selectedNode ? (
            <NodeDetailPanel node={selectedNode} edges={edges} saved={saved} onExpand={chainId ? handleExpand : undefined} expanding={expanding} />
          ) : (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40, color: "#71717a" }}>
              <span style={{ fontSize: 36, opacity: 0.3, marginBottom: 12 }}>&#x261B;</span>
              <p style={{ fontSize: 13, fontWeight: 500, textAlign: "center", maxWidth: 200, margin: 0 }}>
                Select a node or edge on the canvas to view its properties.
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
