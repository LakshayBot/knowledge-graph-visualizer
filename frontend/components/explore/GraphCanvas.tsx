"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useForceLayout } from "@/hooks/useForceLayout";
import type { GraphNode, GraphEdge } from "@/types/graph";

interface Props {
  nodes: GraphNode[];
  edges: GraphEdge[];
  rootId?: string | null;
  onNodeClick?: (nodeId: string) => void;
  loading?: boolean;
}

const R = 24;
const VW = 900;
const VH = 620;
const COLORS = ["#d0d4da", "#ccd6cb", "#d7cec8", "#cbd0d8", "#cad7ce", "#d8cac9"];
const DEFAULT_VIEW_BOX = { x: 0, y: 0, w: VW, h: VH };
const BOUNDS_PAD_X = 190;
const BOUNDS_PAD_Y = 110;

function trimEdge(x1: number, y1: number, x2: number, y2: number, r: number) {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const trim = r + 6;
  return {
    sx: x1 + (dx / len) * trim,
    sy: y1 + (dy / len) * trim,
    ex: x2 - (dx / len) * trim,
    ey: y2 - (dy / len) * trim,
  };
}

function quadPath(x1: number, y1: number, x2: number, y2: number) {
  const bow = 0.2;
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const dx = x2 - x1, dy = y2 - y1;
  const qx = mx + -dy * bow, qy = my + dx * bow;
  return `M${x1},${y1} Q${qx},${qy} ${x2},${y2}`;
}

export default function GraphCanvas({ nodes, edges, rootId, onNodeClick, loading }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  // Zoom / pan
  const [viewBox, setViewBox] = useState(DEFAULT_VIEW_BOX);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });

  const positions = useForceLayout(nodes, edges, rootId);
  const graphSignature = useMemo(
    () => `${rootId ?? ""}|${nodes.map((n) => n.id).join(",")}|${edges.map((e) => e.id).join(",")}`,
    [rootId, nodes, edges],
  );
  const layoutBounds = useMemo(() => {
    const points = Array.from(positions.values());
    if (points.length === 0) return DEFAULT_VIEW_BOX;

    const minX = Math.min(...points.map((p) => p.x)) - BOUNDS_PAD_X;
    const maxX = Math.max(...points.map((p) => p.x)) + BOUNDS_PAD_X;
    const minY = Math.min(...points.map((p) => p.y)) - BOUNDS_PAD_Y;
    const maxY = Math.max(...points.map((p) => p.y)) + BOUNDS_PAD_Y;

    return {
      x: minX,
      y: minY,
      w: Math.max(VW, maxX - minX),
      h: Math.max(VH, maxY - minY),
    };
  }, [positions]);

  useEffect(() => {
    setViewBox(layoutBounds);
    setHovered(null);
  }, [graphSignature, layoutBounds]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const scale = e.deltaY > 0 ? 1.15 : 1 / 1.15;
    setViewBox((vb) => {
      const sx = vb.w / rect.width, sy = vb.h / rect.height;
      const cx = vb.x + mx * sx, cy = vb.y + my * sy;
      const maxW = Math.max(VW * 5, layoutBounds.w * 3);
      const maxH = Math.max(VH * 5, layoutBounds.h * 3);
      const nw = Math.max(180, Math.min(maxW, vb.w * scale));
      const nh = Math.max(120, Math.min(maxH, vb.h * scale));
      return { x: cx - (mx / rect.width) * nw, y: cy - (my / rect.height) * nh, w: nw, h: nh };
    });
  }, [layoutBounds]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === svgRef.current || (e.target as Element).tagName === "svg") {
      dragging.current = true;
      last.current = { x: e.clientX, y: e.clientY };
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - last.current.x, dy = e.clientY - last.current.y;
    last.current = { x: e.clientX, y: e.clientY };
    setViewBox((vb) => {
      const svg = svgRef.current;
      if (!svg) return vb;
      const rect = svg.getBoundingClientRect();
      return { ...vb, x: vb.x - dx * (vb.w / rect.width), y: vb.y - dy * (vb.h / rect.height) };
    });
  }, []);

  const handleMouseUp = useCallback(() => { dragging.current = false; }, []);

  // ── Loading ──
  if (loading) {
    return (
      <div style={{ width: "100%", height: "100%", minHeight: 300, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, background: "var(--bg-subtle)" }}>
        <div style={{ width: 28, height: 28, border: "2.5px solid var(--border-med)", borderTopColor: "var(--text-1)", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-4)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Grok is thinking...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Empty ──
  if (nodes.length === 0) {
    return (
      <div style={{ width: "100%", height: "100%", minHeight: 300, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, background: "var(--bg-subtle)", padding: 40 }}>
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--text-4)" strokeWidth="1.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-3)", textAlign: "center", maxWidth: 260 }}>Type a question to generate a causal graph</p>
        <p style={{ fontSize: 11, color: "var(--text-4)", textAlign: "center" }}>Grok AI will analyze causes and effects</p>
      </div>
    );
  }

  // ── Render ──
  return (
    <svg
      ref={svgRef}
      viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
      preserveAspectRatio="xMidYMid meet"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ width: "100%", height: "100%", display: "block", overflow: "hidden", cursor: dragging.current ? "grabbing" : "grab", touchAction: "none" }}
    >
      <defs>
        {(["solid", "dashed"] as const).map((t) => (
          <marker key={t} id={`ge-arr-${t}`} markerWidth="5" markerHeight="5" refX="4.5" refY="2.5" orient="auto">
            <path d="M0,0.5 L0,4.5 L5,2.5 z" fill={t === "dashed" ? "var(--text-4)" : "var(--text-3)"} />
          </marker>
        ))}
      </defs>

      {/* ── Edges ── */}
      {edges.map((edge) => {
        const from = positions.get(edge.fromId), to = positions.get(edge.toId);
        if (!from || !to) return null;
        const { sx, sy, ex, ey } = trimEdge(from.x, from.y, to.x, to.y, R);
        const d = quadPath(sx, sy, ex, ey);
        const isActive = hovered === edge.fromId || hovered === edge.toId || selected === edge.fromId || selected === edge.toId;
        const stroke = isActive ? "var(--text-1)" : edge.isContested ? "#e74c3c" : "var(--text-3)";
        const sw = isActive ? 1.6 : 1;
        const type = edge.strength && edge.strength < 0.3 ? "dashed" : "solid";
        const label = edge.explanation || edge.perspective || "";
        const qx = (sx + ex) / 2 + -(ey - sy) * 0.2, qy = (sy + ey) / 2 + (ex - sx) * 0.2;

        return (
          <g key={edge.id}>
            <path d={d} fill="none" stroke={stroke} strokeWidth={sw}
              strokeDasharray={edge.strength && edge.strength < 0.3 ? "5,3" : undefined}
              markerEnd={`url(#ge-arr-${type})`}
              style={{ transition: "stroke 0.2s, stroke-width 0.2s" }}
            />
            {label && (
              <text x={qx} y={qy - 6} textAnchor="middle"
                style={{ fontSize: 6.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
                  fill: isActive ? "var(--text-2)" : "var(--text-4)", fontFamily: "inherit",
                  pointerEvents: "none", transition: "fill 0.2s" }}>
                {label.length > 12 ? label.slice(0, 12) + "…" : label}
              </text>
            )}
          </g>
        );
      })}

      {/* ── Nodes ── */}
      {nodes.map((node, i) => {
        const pos = positions.get(node.id);
        if (!pos) return null;
        const isHovered = hovered === node.id;
        const isSelected = selected === node.id;
        const conf = node.confidenceScore ?? 0.7;
        const confPct = Math.round(conf * 100);
        const label = node.title.length > 22 ? node.title.slice(0, 22) + "…" : node.title;

        return (
          <g key={node.id} style={{ cursor: "pointer" }}
            onMouseEnter={() => setHovered(node.id)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => { setSelected(node.id); onNodeClick?.(node.id); }}
          >
            {/* Halo */}
            {(isHovered || isSelected) && (
              <circle cx={pos.x} cy={pos.y} r={R + 6} fill="none" stroke="var(--text-1)"
                strokeWidth={isSelected ? 1.2 : 0.6} opacity={isSelected ? 0.2 : 0.1} />
            )}

            {/* Base circle */}
            <circle cx={pos.x} cy={pos.y} r={R} fill={COLORS[i % COLORS.length]}
              stroke={isHovered || isSelected ? "var(--text-1)" : "var(--border-med)"}
              strokeWidth={isHovered || isSelected ? 1.4 : 0.7}
              style={{ transition: "stroke 0.15s" }}
            />

            {/* Confidence ring */}
            <circle cx={pos.x} cy={pos.y} r={R - 4} fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth={3.5}
              strokeDasharray={`${confPct} 100`} transform={`rotate(-90, ${pos.x}, ${pos.y})`}
              style={{ pointerEvents: "none" }}
            />

            {/* Domain tag inside circle */}
            {node.domain && (
              <text x={pos.x} y={pos.y + 2} textAnchor="middle" dominantBaseline="middle"
                style={{ fontSize: 6, fontWeight: 800, fill: "rgba(0,0,0,0.22)", fontFamily: "inherit",
                  textTransform: "uppercase", letterSpacing: "0.06em", pointerEvents: "none" }}>
                {node.domain.length > 10 ? node.domain.slice(0, 10) : node.domain}
              </text>
            )}

            {/* Title below circle */}
            <text x={pos.x} y={pos.y + R + 13} textAnchor="middle" dominantBaseline="hanging"
              style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase",
                fill: isHovered || isSelected ? "var(--text-1)" : "var(--text-2)", fontFamily: "inherit",
                pointerEvents: "none", transition: "fill 0.15s" }}>
              {label}
            </text>

            {/* Confidence % */}
            <text x={pos.x} y={pos.y + R + 25} textAnchor="middle" dominantBaseline="hanging"
              style={{ fontSize: 7, fontWeight: 600, fill: "var(--text-4)", fontFamily: "monospace",
                pointerEvents: "none", letterSpacing: "0.04em" }}>
              {confPct}%
            </text>

            {/* Tooltip */}
            {(isHovered || isSelected) && node.summary && (
              <foreignObject
                x={pos.x - 105}
                y={pos.y - R - 52}
                width={210} height={38}
                style={{ pointerEvents: "none", overflow: "visible" }}
              >
                <div style={{
                  background: "var(--text-1)", color: "var(--bg)", fontSize: 8.5, fontWeight: 500,
                  fontFamily: "inherit", lineHeight: 1.35, padding: "5px 9px", borderRadius: 3,
                  whiteSpace: "normal", wordBreak: "break-word", opacity: 0.95,
                }}>
                  {node.summary.length > 90 ? node.summary.slice(0, 90) + "…" : node.summary}
                </div>
              </foreignObject>
            )}
          </g>
        );
      })}
    </svg>
  );
}
