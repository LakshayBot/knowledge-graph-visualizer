"use client";

import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ZoomIn, ZoomOut, Maximize, Terminal, Check } from "lucide-react";
import AuthGuard from "@/components/auth/AuthGuard";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { apiFetch } from "@/lib/api-client";
import GraphCanvas from "@/components/explore/GraphCanvas";
import GraphBackground from "@/components/explore/GraphBackground";
import NodeDetailPanel from "@/components/explore/NodeDetailPanel";
import ProviderModelSelector from "@/components/explore/ProviderModelSelector";
import TimelineBar from "@/components/explore/TimelineBar";
import { useTimeline } from "@/hooks/useTimeline";
import type { GraphNode, GraphEdge } from "@/types/graph";

/* ── Animations ──────────────────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

const fadeScale = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.45, ease: "easeOut" as const },
  },
};

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

  const [query, setQuery] = useState("");
  const [provider, setProvider] = useState("grok");
  const [model, setModel] = useState("grok-3-mini");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [rootNodeId, setRootNodeId] = useState<string | null>(null);
  const [expanding, setExpanding] = useState(false);
  const [saved, setSaved] = useState(false);

  // ── Timeline ────────────────────────────────────────────────────────
  const timeline = useTimeline({ nodes, edges });

  useEffect(() => {
    const cid = searchParams.get("chainId");
    if (!cid) return;
    setChainId(cid);
    setSaved(true);
    setLoading(true);
    apiFetch<{
      nodes?: GraphNode[];
      edges?: GraphEdge[];
      chainMetadata?: { title?: string };
    }>(`/casualchains/${cid}/scoped?perspective=Mainstream`)
      .then((data) => {
        const n = data?.nodes ?? [];
        const e = data?.edges ?? [];
        setNodes(n);
        setEdges(e);
        if (n[0]) {
          setQuery(data?.chainMetadata?.title ?? n[0].title ?? "");
          setRootNodeId(n[0].id);
        }
      })
      .catch(() => setError("Failed to load saved chain."))
      .finally(() => setLoading(false));
  }, [searchParams]);

  async function autoSave(cid: string) {
    try {
      await apiFetch(`/casualchains/${cid}/save`, {
        method: "POST",
        body: '{"notes":""}',
      });
      setSaved(true);
    } catch {}
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
      const cd = await apiFetch<{ id: string }>("/casualchains", {
        method: "POST",
        provider,
        model,
        body: JSON.stringify({
          title: query.trim(),
          rootEventId,
          domain: "Economics",
          provider,
          model,
        }),
      });
      const cid = cd.id;
      setChainId(cid);
      setRootNodeId(rootEventId);
      autoSave(cid);
      const gd = await apiFetch<{ nodes?: GraphNode[]; edges?: GraphEdge[] }>(
        `/casualchains/${cid}/scoped?perspective=Mainstream`,
        { provider, model }
      );
      setNodes(gd.nodes ?? []);
      setEdges(gd.edges ?? []);
      const ed = await apiFetch<{ nodes?: GraphNode[]; edges?: GraphEdge[] }>(
        `/casualchains/${cid}/expand/${rootEventId}?perspective=Mainstream`,
        { method: "POST", provider, model, body: JSON.stringify({ provider, model }) }
      );
      if (ed.nodes)
        setNodes((p) => {
          const s = new Set(p.map((n: G) => n.id));
          return [
            ...p,
            ...(ed.nodes as GraphNode[]).filter((n) => !s.has(n.id)),
          ];
        });
      if (ed.edges)
        setEdges((p) => {
          const s = new Set(p.map((e: G) => e.id));
          return [
            ...p,
            ...(ed.edges as GraphEdge[]).filter((e) => !s.has(e.id)),
          ];
        });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const handleNodeClick = useCallback(
    (nodeId: string) => {
      setSelectedNode(nodes.find((n) => n.id === nodeId) ?? null);
    },
    [nodes]
  );

  async function handleExpand(nodeId: string) {
    if (!chainId || expanding) return;
    setExpanding(true);
    try {
      const d = await apiFetch<{ nodes?: GraphNode[]; edges?: GraphEdge[] }>(
        `/casualchains/${chainId}/expand/${nodeId}?perspective=Mainstream`,
        { method: "POST", provider, model, body: JSON.stringify({ provider, model }) }
      );
      setNodes((p) => {
        const s = new Set(p.map((n: G) => n.id));
        return [
          ...p,
          ...((d.nodes ?? []) as GraphNode[]).filter((n) => !s.has(n.id)),
        ];
      });
      setEdges((p) => {
        const s = new Set(p.map((e: G) => e.id));
        return [
          ...p,
          ...((d.edges ?? []) as GraphEdge[]).filter((e) => !s.has(e.id)),
        ];
      });
    } catch {} finally {
      setExpanding(false);
    }
  }

  type G = { id: string };

  const hasEmptyCanvas = nodes.length === 0 && !loading;
  const BR = "1px solid var(--border)";

  /* ── Narrow layout ────────────────────────────────────── */
  if (isNarrow) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Search bar */}
        <div
          style={{
            padding: "10px 14px",
            background: "var(--surface)",
            borderBottom: BR,
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 0,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "0.5rem",
              padding: "4px 4px 4px 12px",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: 14,
                fontWeight: 700,
                fontFamily: "'JetBrains Mono', monospace",
                color: "var(--brand)",
              }}
            >
              &gt;_
            </span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Query graph..."
              disabled={loading}
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                fontSize: 13,
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 500,
                color: "var(--text-1)",
                padding: "8px 4px",
              }}
            />
            <button
              onClick={handleSearch}
              disabled={loading || !query.trim()}
              style={{
                background: loading ? "var(--bg-subtle)" : "var(--brand)",
                color: loading ? "var(--text-4)" : "var(--brand-fg)",
                border: "none",
                padding: "8px 14px",
                borderRadius: "0.375rem",
                fontSize: 12,
                fontWeight: 600,
                fontFamily: "'Manrope', system-ui, sans-serif",
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              Run
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
          <GraphBackground>
            <GraphCanvas
              nodes={nodes}
              edges={edges}
              rootId={rootNodeId}
              onNodeClick={handleNodeClick}
              loading={loading}
              visibleNodeIds={timeline.visibleNodeIds}
              visibleEdgeIds={timeline.visibleEdgeIds}
              timelineActive={timeline.hasTimeline}
            />
          </GraphBackground>
        </div>

        {/* Selected node panel */}
        {selectedNode && (
          <div
            style={{
              maxHeight: "45vh",
              overflowY: "auto",
              borderTop: BR,
            }}
          >
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

  /* ── Desktop layout ───────────────────────────────────── */
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Canvas area */}
      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          <GraphBackground>
            <GraphCanvas
              nodes={nodes}
              edges={edges}
              rootId={rootNodeId}
              onNodeClick={handleNodeClick}
              loading={loading}
              visibleNodeIds={timeline.visibleNodeIds}
              visibleEdgeIds={timeline.visibleEdgeIds}
              timelineActive={timeline.hasTimeline}
            />
          </GraphBackground>

          {/* ── Empty state overlay ── */}
          <AnimatePresence>
            {hasEmptyCanvas && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: "clamp(110px, 16vh, 150px)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  pointerEvents: "none",
                }}
              >
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--text-4)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  style={{ pointerEvents: "auto" }}
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    fontFamily: "'Manrope', system-ui, sans-serif",
                    color: "var(--text-3)",
                    textAlign: "center",
                    maxWidth: 300,
                    margin: 0,
                    pointerEvents: "auto",
                  }}
                >
                  Type a question to generate a casual graph
                </p>
                <p
                  style={{
                    fontSize: 12,
                    color: "var(--text-4)",
                    textAlign: "center",
                    margin: 0,
                    pointerEvents: "auto",
                  }}
                >
                  Grok AI will analyze causes and effects
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Zoom controls (bottom-right) ── */}
          <motion.div
            variants={fadeScale}
            initial="hidden"
            animate="visible"
            style={{
              position: "absolute",
              bottom: 24,
              right: 24,
              zIndex: 20,
            }}
          >
            <div
              style={{
                background: "rgba(255, 248, 246, 0.85)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                border: "1px solid rgba(0,0,0,0.06)",
                borderRadius: "0.5rem",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
              }}
            >
              {[
                { icon: <ZoomIn size={16} />, last: false },
                { icon: <ZoomOut size={16} />, last: false },
                { icon: <Maximize size={16} />, last: true },
              ].map(({ icon, last }, i) => (
                <button
                  key={i}
                  style={{
                    padding: "8px 10px",
                    border: "none",
                    borderBottom: last ? "none" : "1px solid rgba(0,0,0,0.05)",
                    background: "transparent",
                    color: "var(--text-3)",
                    cursor: "pointer",
                    display: "flex",
                    fontFamily: "inherit",
                    transition: "background 0.15s, color 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--surface)";
                    e.currentTarget.style.color = "var(--brand)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "var(--text-3)";
                  }}
                >
                  {icon}
                </button>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Spacer for command bar */}
        <div style={{ height: "clamp(100px, 14vh, 140px)", flexShrink: 0 }} />
      </main>

      {/* ── Right Inspector ── */}
      <AnimatePresence>
        {selectedNode && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: "clamp(280px, 26vw, 360px)", opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            style={{
              borderLeft: BR,
              background:
                "rgba(255, 248, 246, 0.95)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              display: "flex",
              flexDirection: "column",
              flexShrink: 0,
              overflow: "hidden",
              boxShadow: "-8px 0 24px rgba(0,0,0,0.03)",
            }}
          >
            {/* Inspector header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "20px 24px",
                borderBottom: BR,
              }}
            >
              <h3
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  fontFamily: "'Manrope', system-ui, sans-serif",
                  color: "var(--text-1)",
                  margin: 0,
                }}
              >
                Inspector
              </h3>
              <button
                onClick={() => setSelectedNode(null)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-3)",
                  padding: 4,
                  borderRadius: 4,
                  display: "flex",
                  transition: "color 0.15s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.color = "var(--brand)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = "var(--text-3)")
                }
                aria-label="Close inspector"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <NodeDetailPanel
              node={selectedNode}
              edges={edges}
              saved={saved}
              onExpand={chainId ? handleExpand : undefined}
              expanding={expanding}
            />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── Command bar (bottom center) ── */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.15 }}
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "12px 24px 20px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "clamp(480px, 55vw, 680px)",
            pointerEvents: "auto",
            background: "rgba(255, 248, 246, 0.85)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: "1px solid rgba(0, 0, 0, 0.06)",
            borderRadius: "0.75rem",
            padding: "8px",
            boxShadow:
              "0 8px 32px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0,0,0,0.04)",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {/* Timeline bar */}
          <TimelineBar
            currentYear={timeline.currentYear}
            isPlaying={timeline.isPlaying}
            playbackSpeed={timeline.playbackSpeed}
            yearRange={timeline.yearRange}
            visibleCount={timeline.visibleCount}
            totalWithYears={timeline.totalWithYears}
            hasTimeline={timeline.hasTimeline}
            onTogglePlay={timeline.togglePlay}
            onSpeedChange={timeline.setSpeed}
            onSeek={timeline.seek}
            onJumpToStart={timeline.jumpToStart}
            onJumpToEnd={timeline.jumpToEnd}
          />

          {/* Mode selector */}
          <ProviderModelSelector
            provider={provider}
            model={model}
            onProviderChange={(p, m) => { setProvider(p); setModel(m); }}
            disabled={loading}
          />

          {/* Input row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "0.5rem",
              padding: "4px 4px 4px 14px",
              transition: "border-color 0.15s, box-shadow 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--brand)";
              e.currentTarget.style.boxShadow =
                "0 0 0 1px rgba(159, 61, 0, 0.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <Terminal
              size={14}
              style={{
                color: "var(--brand)",
                flexShrink: 0,
              }}
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder='Query graph (e.g. "Show paths between Subsystem A and Admin")...'
              disabled={loading}
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                fontSize: 13,
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 500,
                color: "var(--text-1)",
                padding: "6px 0",
              }}
            />
            <button
              onClick={handleSearch}
              disabled={loading || !query.trim()}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background:
                  loading || !query.trim()
                    ? "var(--bg-subtle)"
                    : "var(--brand)",
                color:
                  loading || !query.trim()
                    ? "var(--text-4)"
                    : "var(--brand-fg)",
                border: "none",
                padding: "8px 16px",
                borderRadius: "0.375rem",
                fontSize: 12,
                fontWeight: 700,
                fontFamily: "'JetBrains Mono', monospace",
                cursor: loading || !query.trim() ? "not-allowed" : "pointer",
                letterSpacing: "0.02em",
                transition: "background 0.15s, color 0.15s",
              }}
            >
              Run
              <span style={{ fontSize: 10 }}>&#x23CE;</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── Error toast ── */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            style={{
              position: "absolute",
              top: 16,
              left: "50%",
              transform: "translateX(-50%)",
              background: "var(--destructive)",
              color: "#fff",
              padding: "10px 20px",
              borderRadius: "0.5rem",
              fontSize: 12,
              fontWeight: 600,
              fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
              zIndex: 30,
              boxShadow: "0 4px 16px rgba(186, 26, 26, 0.25)",
            }}
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
