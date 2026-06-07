"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import AuthGuard from "@/components/auth/AuthGuard";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import GraphCanvas from "@/components/explore/GraphCanvas";
import NodeDetailPanel from "@/components/explore/NodeDetailPanel";
import Button from "@/components/shared/Button";
import type { GraphNode, GraphEdge } from "@/types/graph";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5001/api/v1";
interface ChainMeta {
  chainId?: string; title?: string; domain?: string; nodeCount?: number;
}

interface ChainGraphResponse {
  nodes?: GraphNode[];
  edges?: GraphEdge[];
  chainMetadata?: {
    title?: string;
    domain?: string;
    nodeCount?: number;
  };
}

function chooseSavedGraph(initialData: ChainGraphResponse | null, fullData: ChainGraphResponse | null) {
  const initialNodes = initialData?.nodes ?? [];
  const initialEdges = initialData?.edges ?? [];
  const fullNodes = fullData?.nodes ?? [];
  const fullEdges = fullData?.edges ?? [];

  if (fullNodes.length > initialNodes.length || fullEdges.length > initialEdges.length) {
    return { nodes: fullNodes, edges: fullEdges };
  }

  return { nodes: initialNodes, edges: initialEdges };
}

export default function ChainPage() {
  return (
    <AuthGuard>
      <ChainContent />
    </AuthGuard>
  );
}

function ChainContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const bp = useBreakpoint();
  const isNarrow = bp === "mobile" || bp === "tablet";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [meta, setMeta] = useState<ChainMeta>({});
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [rootNodeId, setRootNodeId] = useState<string | null>(null);
  const [expanding, setExpanding] = useState(false);

  function getToken() {
    return localStorage.getItem("accessToken") ?? "";
  }

  function headers(): Record<string, string> {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    const t = getToken();
    if (t) h["Authorization"] = `Bearer ${t}`;
    return h;
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [initialData, fullData] = await Promise.all([
          fetch(`${API}/causalchains/${id}/initial?perspective=Mainstream`, { headers: headers() }).then(async (res) => {
            if (!res.ok) {
              const body = await res.json().catch(() => ({}));
              throw new Error(body.title || body.detail || "Chain not found");
            }
            return res.json() as Promise<ChainGraphResponse>;
          }),
          fetch(`${API}/causalchains/${id}?depth=6`, { headers: headers() }).then((res) =>
            res.ok ? res.json() as Promise<ChainGraphResponse> : null,
          ),
        ]);
        const { nodes: chainNodes, edges: chainEdges } = chooseSavedGraph(initialData, fullData);
        const metadata = fullData?.chainMetadata ?? initialData.chainMetadata;
        setNodes(chainNodes);
        setEdges(chainEdges);
        setRootNodeId(chainNodes[0]?.id ?? null);
        setMeta({
          title: metadata?.title ?? "Untitled",
          domain: metadata?.domain ?? "",
          nodeCount: Math.max(metadata?.nodeCount ?? 0, chainNodes.length),
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  async function handleExpand(nodeId: string) {
    if (expanding) return;
    setExpanding(true);
    try {
      const res = await fetch(`${API}/causalchains/${id}/expand/${nodeId}?perspective=Mainstream`, {
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
    } catch { /* ignore expand failures in saved view */ }
    finally { setExpanding(false); }
  }

  const handleNodeClick = useCallback((nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId) ?? null;
    setSelectedNode(node);
  }, [nodes]);

  if (loading) {
    return (
      <div style={{ minHeight: "calc(100svh - 90px)", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
        <div style={{ width: 28, height: 28, border: "3px solid var(--border-med)", borderTopColor: "var(--text-1)", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: "calc(100svh - 90px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, background: "var(--bg)", padding: 40 }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: "var(--text-3)", margin: 0 }}>{error}</p>
        <Button variant="outline" onClick={() => router.push("/dashboard")}>Back to Dashboard</Button>
      </div>
    );
  }

  return (
    <div style={{ height: "calc(100svh - var(--chrome-h))", minHeight: 0, display: "flex", flexDirection: "column", background: "var(--bg)", overflow: "hidden" }}>
      {/* Header */}
      <div
        style={{
          padding: isNarrow ? "20px" : "20px 32px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          flexShrink: 0,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={() => router.push("/dashboard")}
              style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-4)", padding: 0, display: "flex" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: "var(--text-1)", letterSpacing: "-0.03em", margin: 0 }}>
              {meta.title}
            </h2>
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 4, marginLeft: 26 }}>
            {meta.domain && <span className="chip" style={{ fontSize: 7 }}>{meta.domain}</span>}
            <span style={{ fontSize: 10, color: "var(--text-4)" }}>{meta.nodeCount ?? nodes.length} nodes</span>
          </div>
        </div>
      </div>

      {/* Main area */}
      {isNarrow ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
          <div style={{ flex: 1, minHeight: 220, overflow: "hidden" }}>
            <GraphCanvas nodes={nodes} edges={edges} rootId={rootNodeId} onNodeClick={handleNodeClick} />
          </div>
          <div style={{ borderTop: "1px solid var(--border)", flexShrink: 0, height: "min(320px, 48svh)", minHeight: 220 }}>
            <NodeDetailPanel node={selectedNode} edges={edges} saved onExpand={handleExpand} expanding={expanding} />
          </div>
        </div>
      ) : (
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
              <GraphCanvas nodes={nodes} edges={edges} rootId={rootNodeId} onNodeClick={handleNodeClick} />
            </div>
          </div>
          <NodeDetailPanel node={selectedNode} edges={edges} saved onExpand={handleExpand} expanding={expanding} />
        </div>
      )}
    </div>
  );
}
