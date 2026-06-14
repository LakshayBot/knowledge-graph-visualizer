"use client";

import { useState, useCallback, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import AuthGuard from "@/components/auth/AuthGuard";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import GraphCanvas from "@/components/explore/GraphCanvas";
import GraphBackground from "@/components/explore/GraphBackground";
import NodeDetailPanel from "@/components/explore/NodeDetailPanel";
import ModeSelector from "@/components/explore/ModeSelector";
import type { GraphNode, GraphEdge } from "@/types/graph";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5001/api/v1";

/* ── Tiny inline icons ──────────────────────────────── */
function TerminalIcon() { return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>); }
function ZoomInIcon() { return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/><path d="m21 21-4.35-4.35"/></svg>); }
function ZoomOutIcon() { return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="8" y1="11" x2="14" y2="11"/><path d="m21 21-4.35-4.35"/></svg>); }
function FitIcon() { return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 00-2 2v3M18 3h3a2 2 0 012 2v3M21 16v3a2 2 0 01-2 2h-3M3 16v3a2 2 0 002 2h3"/></svg>); }

export default function ExplorePage() {
  return (<AuthGuard><ExploreContent /></AuthGuard>);
}

function ExploreContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const bp = useBreakpoint();
  const isNarrow = bp === "mobile" || bp === "tablet";

  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"minimal"|"balanced"|"quality">("balanced");
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
    setChainId(cid); setSaved(true); setLoading(true);
    fetch(`${API}/causalchains/${cid}/scoped?perspective=Mainstream`, { headers: authHeaders() })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        const n = (data?.nodes ?? []) as GraphNode[]; const e = (data?.edges ?? []) as GraphEdge[];
        setNodes(n); setEdges(e);
        if (n[0]) { setQuery(data?.chainMetadata?.title ?? n[0].title ?? ""); setRootNodeId(n[0].id); }
      })
      .catch(() => setError("Failed to load saved chain."))
      .finally(() => setLoading(false));
  }, [searchParams]);

  function getToken() { return localStorage.getItem("accessToken") ?? ""; }
  function authHeaders(): Record<string, string> {
    const t = getToken(); return { "Content-Type": "application/json", ...(t ? { Authorization: `Bearer ${t}` } : {}) };
  }
  async function autoSave(cid: string) {
    try { await fetch(`${API}/causalchains/${cid}/save`, { method:"POST", headers:authHeaders(), body:'{"notes":""}' }); setSaved(true); } catch {}
  }

  async function handleSearch() {
    if (!query.trim() || loading) return;
    setLoading(true); setError(""); setNodes([]); setEdges([]); setSelectedNode(null); setChainId(null); setRootNodeId(null); setSaved(false);
    try {
      const rootEventId = crypto.randomUUID();
      const r1 = await fetch(`${API}/causalchains`, { method:"POST", headers:authHeaders(), body: JSON.stringify({ title:query.trim(), rootEventId, domain:"Economics" }) });
      if (!r1.ok) { const eb = await r1.json().catch(()=>({})); throw new Error(eb.title||eb.detail||"Failed"); }
      const cd = await r1.json(); const cid = cd.id as string;
      setChainId(cid); setRootNodeId(rootEventId); autoSave(cid);
      const r2 = await fetch(`${API}/causalchains/${cid}/scoped?perspective=Mainstream`, { headers:authHeaders() });
      if (r2.ok) { const gd = await r2.json(); setNodes(gd.nodes??[]); setEdges(gd.edges??[]); }
      const r3 = await fetch(`${API}/causalchains/${cid}/expand/${rootEventId}?perspective=Mainstream`, { method:"POST", headers:authHeaders() });
      if (r3.ok) {
        const ed = await r3.json();
        if (ed.nodes) setNodes((p) => { const s=new Set(p.map((n:G)=>n.id)); return [...p, ...(ed.nodes as GraphNode[]).filter((n)=>!s.has(n.id))]; });
        if (ed.edges) setEdges((p) => { const s=new Set(p.map((e:G)=>e.id)); return [...p, ...(ed.edges as GraphEdge[]).filter((e)=>!s.has(e.id))]; });
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Something went wrong"); } finally { setLoading(false); }
  }

  const handleNodeClick = useCallback((nodeId: string) => { setSelectedNode(nodes.find((n) => n.id === nodeId) ?? null); }, [nodes]);

  async function handleExpand(nodeId: string) {
    if (!chainId || expanding) return; setExpanding(true);
    try {
      const r = await fetch(`${API}/causalchains/${chainId}/expand/${nodeId}?perspective=Mainstream`, { method:"POST", headers:authHeaders() });
      if (r.ok) { const d = await r.json();
        setNodes((p) => { const s=new Set(p.map((n:G)=>n.id)); return [...p, ...((d.nodes??[]) as GraphNode[]).filter((n)=>!s.has(n.id))]; });
        setEdges((p) => { const s=new Set(p.map((e:G)=>e.id)); return [...p, ...((d.edges??[]) as GraphEdge[]).filter((e)=>!s.has(e.id))]; });
      }
    } catch {} finally { setExpanding(false); }
  }

  type G = { id: string };

  /* ── Narrow / mobile layout ──────────────────────────── */
  if (isNarrow) {
    return (
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <div style={{ padding:"12px 16px", background:"var(--surface)", borderBottom:"1px solid var(--border)" }}>
          <div style={{ display:"flex", gap:0, background:"var(--surface)", border:"1px solid var(--border)", borderRadius:12, padding:"4px 4px 4px 14px", alignItems:"center" }}>
            <span style={{ fontSize:16, fontWeight:700, fontFamily:"monospace" }}>&gt;_</span>
            <input type="text" value={query} onChange={(e)=>setQuery(e.target.value)} onKeyDown={(e)=>e.key==="Enter"&&handleSearch()} placeholder="Query graph..." disabled={loading}
              style={{ flex:1, background:"transparent", border:"none", outline:"none", fontSize:13, fontFamily:"'JetBrains Mono',monospace", fontWeight:500, color:"var(--text-1)", padding:"8px 4px" }} />
            <button onClick={handleSearch} disabled={loading||!query.trim()}
              style={{ background:loading?"var(--bg-subtle)":"var(--text-1)", color:loading?"var(--text-4)":"var(--bg)", border:"none", padding:"8px 14px", borderRadius:8, fontSize:12, fontWeight:600, fontFamily:"inherit", cursor:loading?"not-allowed":"pointer" }}>Run</button>
          </div>
        </div>
        <div style={{ flex:1, minHeight:0, position:"relative" }}>
          <GraphBackground><GraphCanvas nodes={nodes} edges={edges} rootId={rootNodeId} onNodeClick={handleNodeClick} loading={loading} /></GraphBackground>
        </div>
        {selectedNode && (
          <div style={{ maxHeight:"45vh", overflowY:"auto", borderTop:"1px solid var(--border)" }}>
            <NodeDetailPanel node={selectedNode} edges={edges} saved={saved} onExpand={chainId?handleExpand:undefined} expanding={expanding} />
          </div>
        )}
      </div>
    );
  }

  /* ── Desktop layout (canvas + inspector, no sidebar) ── */
  const BR = "1px solid var(--border)";

  return (
    <div style={{ flex:1, display:"flex", overflow:"hidden" }}>
      {/* Canvas area */}
      <main style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <div style={{ flex:1, position:"relative", overflow:"hidden" }}>
          <GraphBackground>
            <GraphCanvas nodes={nodes} edges={edges} rootId={rootNodeId} onNodeClick={handleNodeClick} loading={loading} />
          </GraphBackground>
          {/* Zoom controls */}
          <div style={{ position:"absolute", bottom:20, right:24, zIndex:20 }}>
            <div style={{ background:"var(--surface)", border:BR, borderRadius:8, display:"flex", flexDirection:"column", overflow:"hidden", boxShadow:"0 1px 3px rgba(0,0,0,0.06)" }}>
              {[{icon:<ZoomInIcon />, last:false}, {icon:<ZoomOutIcon />, last:false}, {icon:<FitIcon />, last:true}].map(({icon, last}, i) => (
                <button key={i} style={{ padding:"8px 10px", border:"none", borderBottom:last?"none":BR, background:"var(--surface)", color:"var(--text-3)", cursor:"pointer", display:"flex", fontFamily:"inherit", transition:"background 0.15s, color 0.15s" }}
                  onMouseEnter={(e)=>{e.currentTarget.style.background="var(--bg-subtle)";e.currentTarget.style.color="var(--text-1)"}}
                  onMouseLeave={(e)=>{e.currentTarget.style.background="var(--surface)";e.currentTarget.style.color="var(--text-3)"}}>{icon}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Command bar */}
        <div style={{ padding:"10px 24px 14px", display:"flex", justifyContent:"center", flexDirection:"column", alignItems:"center", gap:8 }}>
          <div style={{ width:"100%", maxWidth:640 }}>
            <ModeSelector value={mode} onChange={setMode} disabled={loading} />
          </div>
          <div style={{ background:"var(--surface)", border:BR, borderRadius:12, padding:"6px 6px 6px 16px", display:"flex", alignItems:"center", gap:8, width:"100%", maxWidth:640, boxShadow:"0 1px 3px rgba(0,0,0,0.04)" }}>
            <span style={{ display:"flex" }}><TerminalIcon /></span>
            <input type="text" value={query} onChange={(e)=>setQuery(e.target.value)} onKeyDown={(e)=>e.key==="Enter"&&handleSearch()}
              placeholder='Query graph (e.g. "Show paths between Subsystem A and Admin")...' disabled={loading}
              style={{ flex:1, background:"transparent", border:"none", outline:"none", fontSize:13, fontFamily:"'JetBrains Mono',monospace", fontWeight:500, color:"var(--text-1)" }} />
            <button onClick={handleSearch} disabled={loading||!query.trim()}
              style={{ background:loading?"var(--bg-subtle)":"var(--bg-subtle)", color:loading?"var(--text-4)":"var(--text-1)", border:"1px solid var(--border)", padding:"7px 12px", borderRadius:8, fontSize:11, fontWeight:600, fontFamily:"inherit", cursor:loading?"not-allowed":"pointer", display:"flex", alignItems:"center", gap:4 }}>
              Run <span style={{ fontSize:10 }}>&#x23CE;</span>
            </button>
          </div>
        </div>
      </main>

      {/* Right Inspector */}
      <aside style={{ width:320, borderLeft:BR, background:"var(--surface)", display:"flex", flexDirection:"column", flexShrink:0 }}>
        <div style={{ height:48, display:"flex", alignItems:"center", padding:"0 16px", borderBottom:BR, background:"var(--surface)" }}>
          <h2 style={{ fontSize:15, fontWeight:600, color:"var(--text-1)", margin:0, letterSpacing:"-0.01em" }}>Inspector</h2>
        </div>
        {selectedNode
          ? <NodeDetailPanel node={selectedNode} edges={edges} saved={saved} onExpand={chainId?handleExpand:undefined} expanding={expanding} />
          : (
            <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:40, color:"var(--text-3)" }}>
              <span style={{ fontSize:36, opacity:0.2, marginBottom:12 }}>&#x261B;</span>
              <p style={{ fontSize:13, fontWeight:500, textAlign:"center", maxWidth:200, margin:0 }}>Select a node or edge on the canvas to view its properties.</p>
            </div>
          )
        }
      </aside>
    </div>
  );
}
