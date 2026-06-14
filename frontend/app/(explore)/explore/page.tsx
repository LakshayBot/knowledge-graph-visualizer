"use client";

import { useState, useCallback, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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

function ExploreContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
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
        if (root) { setQuery(data?.chainMetadata?.title ?? root.title ?? ""); setRootNodeId(root.id); }
      })
      .catch(() => setError("Failed to load saved chain."))
      .finally(() => setLoading(false));
  }, [searchParams]);

  function getToken() { return localStorage.getItem("accessToken") ?? ""; }
  function headers(): Record<string, string> {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    const t = getToken(); if (t) h["Authorization"] = `Bearer ${t}`;
    return h;
  }
  async function autoSave(cid: string) {
    try { await fetch(`${API}/causalchains/${cid}/save`, { method: "POST", headers: headers(), body: JSON.stringify({ notes: "" }) }); setSaved(true); } catch {}
  }

  async function handleSearch() {
    if (!query.trim() || loading) return;
    setLoading(true); setError(""); setNodes([]); setEdges([]); setSelectedNode(null); setChainId(null); setRootNodeId(null); setSaved(false);
    try {
      const rootEventId = crypto.randomUUID();
      const chainRes = await fetch(`${API}/causalchains`, { method: "POST", headers: headers(), body: JSON.stringify({ title: query.trim(), rootEventId, domain: "Economics" }) });
      if (!chainRes.ok) { const errBody = await chainRes.json().catch(() => ({})); throw new Error(errBody.title || errBody.detail || "Failed"); }
      const chainData = await chainRes.json(); const cid = chainData.id as string;
      setChainId(cid); setRootNodeId(rootEventId); autoSave(cid);
      const initRes = await fetch(`${API}/causalchains/${cid}/scoped?perspective=Mainstream`, { headers: headers() });
      if (initRes.ok) { const gd = await initRes.json(); setNodes(gd.nodes ?? []); setEdges(gd.edges ?? []); }
      const expandRes = await fetch(`${API}/causalchains/${cid}/expand/${rootEventId}?perspective=Mainstream`, { method: "POST", headers: headers() });
      if (expandRes.ok) {
        const expData = await expandRes.json();
        if (expData.nodes && expData.edges) {
          setNodes((prev) => { const seen = new Set(prev.map((n) => n.id)); return [...prev, ...(expData.nodes as GraphNode[]).filter((n) => !seen.has(n.id))]; });
          setEdges((prev) => { const seen = new Set(prev.map((e) => e.id)); return [...prev, ...(expData.edges as GraphEdge[]).filter((e) => !seen.has(e.id))]; });
        }
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Something went wrong"); } finally { setLoading(false); }
  }

  const handleNodeClick = useCallback((nodeId: string) => { setSelectedNode(nodes.find((n) => n.id === nodeId) ?? null); }, [nodes]);

  async function handleExpand(nodeId: string) {
    if (!chainId || expanding) return; setExpanding(true);
    try {
      const res = await fetch(`${API}/causalchains/${chainId}/expand/${nodeId}?perspective=Mainstream`, { method: "POST", headers: headers() });
      if (res.ok) {
        const graphData = await res.json();
        setNodes((prev) => { const seen = new Set(prev.map((n) => n.id)); return [...prev, ...((graphData.nodes ?? []) as GraphNode[]).filter((n) => !seen.has(n.id))]; });
        setEdges((prev) => { const seen = new Set(prev.map((e) => e.id)); return [...prev, ...((graphData.edges ?? []) as GraphEdge[]).filter((e) => !seen.has(e.id))]; });
      }
    } catch {} finally { setExpanding(false); }
  }

  const S = (c: string) => ({ borderRight: `1px solid ${c}`, background: "#fff", flexShrink: 0 });

  if (isNarrow) {
    return (
      <div style={{ height: "calc(100svh - 90px)", display: "flex", flexDirection: "column", background: "#f9f9f9" }}>
        <div style={{ padding: "12px 16px", background: "#fff", borderBottom: "1px solid #e4e4e7" }}>
          <div style={{ display: "flex", gap: 0, background: "#fff", border: "1px solid #e4e4e7", borderRadius: 12, padding: "4px 4px 4px 14px", alignItems: "center" }}>
            <span style={{ color: "#000", fontSize: 16, fontWeight: 700 }}>&gt;_</span>
            <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()} placeholder="Query graph..." disabled={loading}
              style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 13, fontFamily: "'JetBrains Mono', monospace", fontWeight: 500, color: "#1a1c1c", padding: "8px 4px" }} />
            <button onClick={handleSearch} disabled={loading || !query.trim()}
              style={{ background: loading ? "#e4e4e7" : "#000", color: loading ? "#71717a" : "#fff", border: "none", padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, fontFamily: "inherit", cursor: loading ? "not-allowed" : "pointer" }}>
              {loading ? "..." : "Run"}
            </button>
          </div>
        </div>
        <div style={{ flex: 1, minHeight: 0 }}>
          <GraphCanvas nodes={nodes} edges={edges} rootId={rootNodeId} onNodeClick={handleNodeClick} loading={loading} />
        </div>
        {selectedNode && (
          <div style={{ maxHeight: "45vh", overflowY: "auto", borderTop: "1px solid #e4e4e7" }}>
            <NodeDetailPanel node={selectedNode} edges={edges} saved={saved} onExpand={chainId ? handleExpand : undefined} expanding={expanding} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ height: "calc(100svh - 90px)", display: "flex", flexDirection: "column", background: "#f9f9f9", overflow: "hidden" }}>
      {/* Headbar */}
      <header style={{ height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", background: "#fff", borderBottom: "1px solid #e4e4e7", flexShrink: 0 }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: "#000", letterSpacing: "-0.02em" }}>GraphEngine</span>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* User avatar with initials */}
          <a href="/profile" style={{
            width: 32, height: 32, borderRadius: "50%", background: "#000", color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 600, fontSize: 12, textDecoration: "none", cursor: "pointer",
            border: "1px solid #000", flexShrink: 0,
          }}>
            <span style={{ lineHeight: 1 }}>A</span>
          </a>
        </div>
      </header>

      {/* Main workspace: Sidebar | Canvas | Inspector */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>
        {/* Sidebar */}
        <aside style={{ ...S("#e4e4e7"), width: 256, display: "flex", flexDirection: "column", padding: "16px 12px" }}>
          <div style={{ marginBottom: 24, marginTop: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 4, background: "#000", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 16, marginBottom: 14 }}>G</div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "#000", margin: 0, letterSpacing: "-0.01em", lineHeight: 1 }}>GraphEngine</h1>
            <p style={{ fontSize: 11, fontWeight: 500, color: "#71717a", letterSpacing: "0.04em", textTransform: "uppercase", margin: "4px 0 0 0" }}>Enterprise v2.4</p>
          </div>
          <button style={{ width: "100%", background: "#f3f3f3", border: "1px solid #e4e4e7", color: "#1a1c1c", padding: "10px 0", borderRadius: 6, fontSize: 12, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 20 }}>
            <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> New Project
          </button>
          <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            {[
              { label: "Dashboard", href: "/dashboard", active: false },
              { label: "Explore", href: "/explore", active: true },
              { label: "History", href: "/history", active: false },
            ].map((link) => (
              <a key={link.label} href={link.href} onClick={(e) => { e.preventDefault(); router.push(link.href); }}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 8,
                  background: link.active ? "#e3e1ec" : "transparent",
                  color: link.active ? "#63646c" : "#4c4546",
                  fontWeight: link.active ? 600 : 500, fontSize: 13,
                  textDecoration: "none", transition: "background 0.15s",
                }}
                onMouseEnter={(e) => { if (!link.active) e.currentTarget.style.background = "#f3f3f3"; }}
                onMouseLeave={(e) => { if (!link.active) e.currentTarget.style.background = "transparent"; }}
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div style={{ borderTop: "1px solid #e4e4e7", paddingTop: 12, display: "flex", flexDirection: "column", gap: 2 }}>
            {["Settings", "Support"].map((l) => (
              <a key={l} href="#" style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 8, color: "#4c4546", fontSize: 13, fontWeight: 500, textDecoration: "none", transition: "background 0.15s" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#f3f3f3")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                {l}
              </a>
            ))}
          </div>
        </aside>

        {/* Center canvas */}
        <main style={{ flex: 1, position: "relative", overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {/* Grid background canvas */}
          <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
            {/* Dot grid style background */}
            <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle, #e4e4e7 1px, transparent 1px)", backgroundSize: "40px 40px", pointerEvents: "none", opacity: 0.6 }} />
            <div style={{ position: "relative", zIndex: 1, width: "100%", height: "100%" }}>
              <GraphCanvas nodes={nodes} edges={edges} rootId={rootNodeId} onNodeClick={handleNodeClick} loading={loading} />
            </div>

            {/* Zoom controls */}
            <div style={{ position: "absolute", bottom: 20, right: 20, zIndex: 20 }}>
              <div style={{ background: "#fff", border: "1px solid #e4e4e7", borderRadius: 8, display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                {["+", "\u2212", "\u25A1"].map((c) => (
                  <button key={c} style={{ padding: "8px 12px", border: "none", borderBottom: c === "\u25A1" ? "none" : "1px solid #e4e4e7", background: "#fff", color: "#4c4546", cursor: "pointer", fontSize: 16, lineHeight: 1, fontFamily: "inherit", transition: "background 0.15s, color 0.15s" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "#f3f3f3"; e.currentTarget.style.color = "#000"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = "#4c4546"; }}>{c}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Command bar */}
          <div style={{ padding: "10px 24px 12px", display: "flex", justifyContent: "center" }}>
            <div style={{ background: "#fff", border: "1px solid #e4e4e7", borderRadius: 12, padding: "5px 5px 5px 14px", display: "flex", alignItems: "center", gap: 8, width: "100%", maxWidth: 640, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#71717a" strokeWidth="2" strokeLinecap="round">
                <polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>
              </svg>
              <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Query graph (e.g. 'What caused the Euro to weaken?')" disabled={loading}
                style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 13, fontFamily: "'JetBrains Mono', monospace", fontWeight: 500, color: "#1a1c1c" }} />
              <button onClick={handleSearch} disabled={loading || !query.trim()}
                style={{ background: loading || !query.trim() ? "#e4e4e7" : "#000", color: loading || !query.trim() ? "#71717a" : "#fff", border: "none", padding: "7px 14px", borderRadius: 8, fontSize: 11, fontWeight: 600, fontFamily: "inherit", cursor: loading ? "not-allowed" : "pointer" }}>
                {loading ? "Running..." : "Run"}
              </button>
            </div>
          </div>
        </main>

        {/* Right Inspector */}
        <aside style={{ ...S("#e4e4e7"), width: 320, display: "flex", flexDirection: "column" }}>
          <div style={{ height: 48, display: "flex", alignItems: "center", padding: "0 16px", borderBottom: "1px solid #e4e4e7" }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: "#000", margin: 0, letterSpacing: "-0.01em" }}>Inspector</h2>
          </div>
          {selectedNode ? (
            <NodeDetailPanel node={selectedNode} edges={edges} saved={saved} onExpand={chainId ? handleExpand : undefined} expanding={expanding} />
          ) : (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40, color: "#71717a" }}>
              <span style={{ fontSize: 32, opacity: 0.25, marginBottom: 12, color: "#000" }}>&#x261B;</span>
              <p style={{ fontSize: 13, fontWeight: 500, textAlign: "center", maxWidth: 200, margin: 0 }}>Select a node or edge on the canvas to view its properties.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
