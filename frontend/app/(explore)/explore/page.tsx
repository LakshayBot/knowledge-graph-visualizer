"use client";

import { useState, useCallback, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import AuthGuard from "@/components/auth/AuthGuard";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import GraphCanvas from "@/components/explore/GraphCanvas";
import NodeDetailPanel from "@/components/explore/NodeDetailPanel";
import type { GraphNode, GraphEdge } from "@/types/graph";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5001/api/v1";

/* ── Tiny SVG icons ──────────────────────────────────── */
function DashboardIcon() { return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>); }
function ExploreIcon() { return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/></svg>); }
function HistoryIcon() { return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>); }
function SettingsIcon() { return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>); }
function SupportIcon() { return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>); }
function BellIcon() { return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>); }
function SearchIcon() { return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>); }
function TerminalIcon() { return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>); }
function PlusIcon() { return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>); }
function ZoomInIcon() { return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/><path d="m21 21-4.35-4.35"/></svg>); }
function ZoomOutIcon() { return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="8" y1="11" x2="14" y2="11"/><path d="m21 21-4.35-4.35"/></svg>); }
function FitIcon() { return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 00-2 2v3M18 3h3a2 2 0 012 2v3M21 16v3a2 2 0 01-2 2h-3M3 16v3a2 2 0 002 2h3"/></svg>); }

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", Icon: DashboardIcon },
  { label: "Explore",   href: "/explore",   Icon: ExploreIcon },
  { label: "History",   href: "/history",   Icon: HistoryIcon },
];

const BOTTOM_ITEMS = [
  { label: "Settings", Icon: SettingsIcon },
  { label: "Support",  Icon: SupportIcon },
];

export default function ExplorePage() {
  return (<AuthGuard><ExploreContent /></AuthGuard>);
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

  if (isNarrow) {
    return (
      <div style={{ height:"calc(100svh - 90px)", display:"flex", flexDirection:"column", background:"#f9f9f9" }}>
        <div style={{ padding:"12px 16px", background:"#fff", borderBottom:"1px solid #e4e4e7" }}>
          <div style={{ display:"flex", gap:0, background:"#fff", border:"1px solid #e4e4e7", borderRadius:12, padding:"4px 4px 4px 14px", alignItems:"center" }}>
            <span style={{ color:"#000", fontSize:16, fontWeight:700, fontFamily:"monospace" }}>&gt;_</span>
            <input type="text" value={query} onChange={(e)=>setQuery(e.target.value)} onKeyDown={(e)=>e.key==="Enter"&&handleSearch()} placeholder="Query graph..." disabled={loading}
              style={{ flex:1, background:"transparent", border:"none", outline:"none", fontSize:13, fontFamily:"'JetBrains Mono',monospace", fontWeight:500, color:"#1a1c1c", padding:"8px 4px" }} />
            <button onClick={handleSearch} disabled={loading||!query.trim()}
              style={{ background:loading?"#e4e4e7":"#000", color:loading?"#71717a":"#fff", border:"none", padding:"8px 14px", borderRadius:8, fontSize:12, fontWeight:600, fontFamily:"inherit", cursor:loading?"not-allowed":"pointer" }}>Run</button>
          </div>
        </div>
        <div style={{ flex:1, minHeight:0 }}><GraphCanvas nodes={nodes} edges={edges} rootId={rootNodeId} onNodeClick={handleNodeClick} loading={loading} /></div>
        {selectedNode && <div style={{ maxHeight:"45vh", overflowY:"auto", borderTop:"1px solid #e4e4e7" }}><NodeDetailPanel node={selectedNode} edges={edges} saved={saved} onExpand={chainId?handleExpand:undefined} expanding={expanding} /></div>}
      </div>
    );
  }

  const BR = "1px solid #e4e4e7";

  return (
    <div style={{ height:"100svh", display:"flex", flexDirection:"column", background:"#f9f9f9", overflow:"hidden" }}>
      {/* ── TopNavBar ───────────────────────────────── */}
      <header style={{ height:56, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 24px", background:"#fff", borderBottom:BR, flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:28 }}>
          <span style={{ fontSize:16, fontWeight:700, color:"#000", letterSpacing:"-0.02em" }}>GraphEngine</span>
          <div style={{ display:"flex", gap:24 }}>
            {["Analytics","Network","Schema"].map((t,i) => (
              <span key={t} style={{ fontSize:13, fontWeight:500, color:i===1?"#000":"#71717a", padding:"8px 0", cursor:"pointer", borderBottom:i===1?"2px solid #000":"2px solid transparent" }}>{t}</span>
            ))}
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:16 }}>
          <div style={{ position:"relative" }}>
            <div style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:"#71717a", display:"flex" }}><SearchIcon /></div>
            <input type="text" placeholder="Search nodes..." style={{ width:240, height:36, padding:"0 52px 0 32px", background:"#f3f3f3", border:"1px solid #e4e4e7", borderRadius:6, fontSize:12, fontWeight:500, fontFamily:"'JetBrains Mono',monospace", color:"#1a1c1c", outline:"none" }} />
            <span style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", fontSize:10, fontWeight:600, color:"#71717a", background:"#f9f9f9", border:"1px solid #e4e4e7", borderRadius:4, padding:"1px 6px", fontFamily:"monospace" }}>&#x2318;K</span>
          </div>
          <button style={{ background:"#000", color:"#fff", border:"none", padding:"8px 16px", borderRadius:6, fontSize:12, fontWeight:600, fontFamily:"inherit", cursor:"pointer" }}>Share</button>
          <button style={{ background:"transparent", border:"none", color:"#71717a", cursor:"pointer", padding:6, borderRadius:4, display:"flex" }}><BellIcon /></button>
          <button style={{ background:"transparent", border:"none", color:"#71717a", cursor:"pointer", padding:6, borderRadius:4, display:"flex" }}><SettingsIcon /></button>
          <div style={{ width:32, height:32, borderRadius:"50%", background:"#000", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:600, fontSize:12, border:"1px solid #000", flexShrink:0, cursor:"pointer" }}>A</div>
        </div>
      </header>

      {/* ── Main workspace ───────────────────────────── */}
      <div style={{ flex:1, display:"flex", overflow:"hidden", minHeight:0 }}>
        {/* SideNavBar */}
        <aside style={{ width:256, display:"flex", flexDirection:"column", borderRight:BR, background:"#fff", padding:"16px 12px", flexShrink:0 }}>
          <div style={{ marginBottom:24, marginTop:8 }}>
            <div style={{ width:32, height:32, borderRadius:4, background:"#000", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:16, marginBottom:14, letterSpacing:"-0.02em" }}>G</div>
            <h1 style={{ fontSize:20, fontWeight:700, color:"#000", margin:0, letterSpacing:"-0.01em", lineHeight:1 }}>GraphEngine</h1>
            <p style={{ fontSize:11, fontWeight:500, color:"#71717a", letterSpacing:"0.04em", textTransform:"uppercase", margin:"4px 0 0 0" }}>Enterprise v2.4</p>
          </div>
          <button style={{ width:"100%", background:"#f3f3f3", border:"1px solid #e4e4e7", color:"#1a1c1c", padding:"10px 0", borderRadius:6, fontSize:12, fontWeight:600, fontFamily:"inherit", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6, marginBottom:20 }}>
            <PlusIcon /> New Project
          </button>
          <nav style={{ flex:1, display:"flex", flexDirection:"column", gap:2 }}>
            {NAV_ITEMS.map(({label, href, Icon}) => {
              const active = label === "Explore";
              return (
                <a key={label} href={href} onClick={(e)=>{e.preventDefault();router.push(href);}}
                  style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px", borderRadius:8, background:active?"#e3e1ec":"transparent", color:active?"#63646c":"#4c4546", fontWeight:active?600:500, fontSize:13, textDecoration:"none", transition:"background 0.15s" }}
                  onMouseEnter={(e)=>{if(!active)e.currentTarget.style.background="#f3f3f3"}}
                  onMouseLeave={(e)=>{if(!active)e.currentTarget.style.background="transparent"}}
                ><span style={{ display:"flex", color:active?"#63646c":"#4c4546" }}><Icon /></span>{label}</a>
              );
            })}
          </nav>
          <div style={{ borderTop:BR, paddingTop:12, display:"flex", flexDirection:"column", gap:2 }}>
            {BOTTOM_ITEMS.map(({label, Icon}) => (
              <a key={label} href="#" style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px", borderRadius:8, color:"#4c4546", fontSize:13, fontWeight:500, textDecoration:"none", transition:"background 0.15s" }}
                onMouseEnter={(e)=>(e.currentTarget.style.background="#f3f3f3")} onMouseLeave={(e)=>(e.currentTarget.style.background="transparent")}
              ><span style={{ display:"flex" }}><Icon /></span>{label}</a>
            ))}
          </div>
        </aside>

        {/* Left Tools Panel */}
        <aside style={{ width:288, display:"flex", flexDirection:"column", borderRight:BR, background:"#fff", flexShrink:0 }}>
          <div style={{ display:"flex", borderBottom:BR, background:"#f9f9f9", padding:8, gap:4 }}>
            {["Strategic","Technical"].map((t,i) => (
              <button key={t} style={{
                flex:1, padding:"6px 10px", borderRadius:6,
                background: i===0?"#fff":"transparent", border: i===0?BR:"1px solid transparent",
                color: i===0?"#000":"#71717a",
                fontSize:12, fontWeight:600, fontFamily:"inherit", cursor:"pointer",
                boxShadow: i===0?"0 1px 2px rgba(0,0,0,0.04)":"none",
              }}>{t}</button>
            ))}
          </div>
          <div style={{ padding:"16px", overflowY:"auto", flex:1, display:"flex", flexDirection:"column", gap:20 }}>
            <section>
              <h3 style={{ fontSize:11, fontWeight:600, color:"#000", textTransform:"uppercase", letterSpacing:"0.06em", margin:"0 0 12px 0" }}>Entity Types</h3>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {[
                  { label:"Organizations", count:"1.2k", active:true,  color:"#000" },
                  { label:"Individuals",   count:"842",  active:true,  color:"#5d5e66" },
                  { label:"Events",        count:"45k",  active:false, color:"#1b1b1b" },
                ].map((e) => (
                  <label key={e.label} style={{ display:"flex", alignItems:"center", gap:10, padding:"6px 8px", borderRadius:4, cursor:"pointer", fontSize:13, fontWeight:500, color:"#4c4546", transition:"background 0.15s", border:"1px solid transparent" }}
                    onMouseEnter={(ev)=>(ev.currentTarget.style.background="#f3f3f3")}
                    onMouseLeave={(ev)=>(ev.currentTarget.style.background="transparent")}
                  >
                    <span style={{ width:12, height:12, borderRadius:3, background: e.active?e.color:"transparent", border:`1.5px solid ${e.active?e.color:"#cfc4c5"}`, flexShrink:0, display:"block" }} />
                    {e.label}
                    <span style={{ marginLeft:"auto", fontSize:11, fontWeight:500, color:"#71717a", fontFamily:"'JetBrains Mono',monospace" }}>{e.count}</span>
                  </label>
                ))}
              </div>
            </section>
          </div>
        </aside>

        {/* Center canvas */}
        <main style={{ flex:1, position:"relative", overflow:"hidden", display:"flex", flexDirection:"column" }}>
          <div style={{ flex:1, position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", inset:0, backgroundImage:"radial-gradient(circle, #e4e4e7 1px, transparent 1px)", backgroundSize:"40px 40px", pointerEvents:"none", opacity:0.6 }} />
            <div style={{ position:"relative", zIndex:1, width:"100%", height:"100%" }}>
              <GraphCanvas nodes={nodes} edges={edges} rootId={rootNodeId} onNodeClick={handleNodeClick} loading={loading} />
            </div>
            {/* Zoom controls */}
            <div style={{ position:"absolute", bottom:20, right:24, zIndex:20 }}>
              <div style={{ background:"#fff", border:BR, borderRadius:8, display:"flex", flexDirection:"column", overflow:"hidden", boxShadow:"0 1px 3px rgba(0,0,0,0.06)" }}>
                {[{icon:<ZoomInIcon />, last:false}, {icon:<ZoomOutIcon />, last:false}, {icon:<FitIcon />, last:true}].map(({icon, last}, i) => (
                  <button key={i} style={{ padding:"8px 10px", border:"none", borderBottom:last?"none":BR, background:"#fff", color:"#4c4546", cursor:"pointer", display:"flex", fontFamily:"inherit", transition:"background 0.15s, color 0.15s" }}
                    onMouseEnter={(e)=>{e.currentTarget.style.background="#f3f3f3";e.currentTarget.style.color="#000"}}
                    onMouseLeave={(e)=>{e.currentTarget.style.background="#fff";e.currentTarget.style.color="#4c4546"}}>{icon}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Command bar */}
          <div style={{ padding:"10px 24px 14px", display:"flex", justifyContent:"center" }}>
            <div style={{ background:"#fff", border:BR, borderRadius:12, padding:"6px 6px 6px 16px", display:"flex", alignItems:"center", gap:8, width:"100%", maxWidth:640, boxShadow:"0 1px 3px rgba(0,0,0,0.04)" }}>
              <span style={{ color:"#000", display:"flex" }}><TerminalIcon /></span>
              <input type="text" value={query} onChange={(e)=>setQuery(e.target.value)} onKeyDown={(e)=>e.key==="Enter"&&handleSearch()}
                placeholder='Query graph (e.g. "Show paths between Subsystem A and Admin")...' disabled={loading}
                style={{ flex:1, background:"transparent", border:"none", outline:"none", fontSize:13, fontFamily:"'JetBrains Mono',monospace", fontWeight:500, color:"#1a1c1c" }} />
              <button onClick={handleSearch} disabled={loading||!query.trim()}
                style={{ background:loading?"#e4e4e7":"#f3f3f3", color:loading?"#71717a":"#1a1c1c", border:"1px solid #e4e4e7", padding:"7px 12px", borderRadius:8, fontSize:11, fontWeight:600, fontFamily:"inherit", cursor:loading?"not-allowed":"pointer", display:"flex", alignItems:"center", gap:4 }}>
                Run <span style={{ fontSize:10, color:"#71717a" }}>&#x23CE;</span>
              </button>
            </div>
          </div>
        </main>

        {/* Right Inspector */}
        <aside style={{ width:320, borderLeft:BR, background:"#fff", display:"flex", flexDirection:"column", flexShrink:0 }}>
          <div style={{ height:48, display:"flex", alignItems:"center", padding:"0 16px", borderBottom:BR, background:"#fff" }}>
            <h2 style={{ fontSize:15, fontWeight:600, color:"#000", margin:0, letterSpacing:"-0.01em" }}>Inspector</h2>
          </div>
          {selectedNode
            ? <NodeDetailPanel node={selectedNode} edges={edges} saved={saved} onExpand={chainId?handleExpand:undefined} expanding={expanding} />
            : (
              <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:40, color:"#71717a" }}>
                <span style={{ fontSize:36, opacity:0.2, marginBottom:12 }}>&#x261B;</span>
                <p style={{ fontSize:13, fontWeight:500, textAlign:"center", maxWidth:200, margin:0 }}>Select a node or edge on the canvas to view its properties.</p>
              </div>
            )
          }
        </aside>
      </div>
    </div>
  );
}
