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

const R = 28;
const R_ROOT = 36;
const VW = 900;
const VH = 620;
const DEFAULT_VIEW_BOX = { x: 0, y: 0, w: VW, h: VH };
const BOUNDS_PAD_X = 220;
const BOUNDS_PAD_Y = 130;

/* ── Lumina node colors (mapped to palette) ────────────────── */
const NODE_COLORS = [
  "#d2e4fb", // secondary-container (navy tint)
  "#ffdbcd", // primary-fixed (peach)
  "#c8e8d4", // soft teal
  "#f6ded4", // surface-variant (warm)
  "#e0c0b3", // outline-variant
  "#ffe9e1", // surface-container
];

function trimEdge(x1: number, y1: number, x2: number, y2: number, r: number) {
  const dx = x2 - x1,
    dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const trim = r + 8;
  return {
    sx: x1 + (dx / len) * trim,
    sy: y1 + (dy / len) * trim,
    ex: x2 - (dx / len) * trim,
    ey: y2 - (dy / len) * trim,
  };
}

function quadPath(x1: number, y1: number, x2: number, y2: number) {
  const bow = 0.18;
  const mx = (x1 + x2) / 2,
    my = (y1 + y2) / 2;
  const dx = x2 - x1,
    dy = y2 - y1;
  const qx = mx + -dy * bow,
    qy = my + dx * bow;
  return `M${x1},${y1} Q${qx},${qy} ${x2},${y2}`;
}

function edgeMidpoint(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): { mx: number; my: number } {
  const bow = 0.18;
  const midX = (x1 + x2) / 2,
    midY = (y1 + y2) / 2;
  const dx = x2 - x1,
    dy = y2 - y1;
  return { mx: midX + -dy * bow, my: midY + dx * bow };
}

export default function GraphCanvas({
  nodes,
  edges,
  rootId,
  onNodeClick,
  loading,
}: Props) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const [viewBox, setViewBox] = useState(DEFAULT_VIEW_BOX);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });

  const positions = useForceLayout(nodes, edges, rootId);
  const graphSignature = useMemo(
    () =>
      `${rootId ?? ""}|${nodes.map((n) => n.id).join(",")}|${edges.map((e) => e.id).join(",")}`,
    [rootId, nodes, edges]
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

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const mx = e.clientX - rect.left,
        my = e.clientY - rect.top;
      const scale = e.deltaY > 0 ? 1.15 : 1 / 1.15;
      setViewBox((vb) => {
        const sx = vb.w / rect.width,
          sy = vb.h / rect.height;
        const cx = vb.x + mx * sx,
          cy = vb.y + my * sy;
        const maxW = Math.max(VW * 5, layoutBounds.w * 3);
        const maxH = Math.max(VH * 5, layoutBounds.h * 3);
        const nw = Math.max(180, Math.min(maxW, vb.w * scale));
        const nh = Math.max(120, Math.min(maxH, vb.h * scale));
        return {
          x: cx - (mx / rect.width) * nw,
          y: cy - (my / rect.height) * nh,
          w: nw,
          h: nh,
        };
      });
    },
    [layoutBounds]
  );

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (
      e.target === svgRef.current ||
      (e.target as Element).tagName === "svg"
    ) {
      dragging.current = true;
      last.current = { x: e.clientX, y: e.clientY };
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - last.current.x,
      dy = e.clientY - last.current.y;
    last.current = { x: e.clientX, y: e.clientY };
    setViewBox((vb) => {
      const svg = svgRef.current;
      if (!svg) return vb;
      const rect = svg.getBoundingClientRect();
      return {
        ...vb,
        x: vb.x - dx * (vb.w / rect.width),
        y: vb.y - dy * (vb.h / rect.height),
      };
    });
  }, []);

  const handleMouseUp = useCallback(() => {
    dragging.current = false;
  }, []);

  /* ── Is a node the root? ──────────────────────────────── */
  function isRootNode(id: string) {
    return id === rootId;
  }

  /* ── Get node radius ──────────────────────────────────── */
  function nodeRadius(node: GraphNode) {
    if (isRootNode(node.id)) return R_ROOT;
    return R;
  }

  /* ── Loading ──────────────────────────────────────────── */
  if (loading) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          minHeight: 300,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 14,
          background: "var(--bg)",
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            border: "3px solid var(--border-med)",
            borderTopColor: "var(--brand)",
            borderRadius: "50%",
            animation: "spin 0.7s linear infinite",
          }}
        />
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            fontFamily: "'JetBrains Mono', monospace",
            color: "var(--text-4)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          Grok is thinking...
        </span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  /* ── Empty ────────────────────────────────────────────── */
  if (nodes.length === 0) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          minHeight: 300,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          background: "var(--bg)",
          padding: 40,
        }}
      >
        <svg
          width="36"
          height="36"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--text-4)"
          strokeWidth="1.5"
          strokeLinecap="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <p
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "var(--text-3)",
            textAlign: "center",
            maxWidth: 260,
          }}
        >
          Type a question to generate a casual graph
        </p>
        <p
          style={{
            fontSize: 11,
            color: "var(--text-4)",
            textAlign: "center",
          }}
        >
          Grok AI will analyze causes and effects
        </p>
      </div>
    );
  }

  /* ── Render graph ─────────────────────────────────────── */
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
      style={{
        width: "100%",
        height: "100%",
        display: "block",
        overflow: "hidden",
        cursor: dragging.current ? "grabbing" : "grab",
        touchAction: "none",
      }}
    >
      <defs>
        {/* Edge gradient: orange → outline */}
        <linearGradient
          id="edgeGrad"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.7" />
          <stop offset="100%" stopColor="var(--text-4)" stopOpacity="0.2" />
        </linearGradient>

        <linearGradient
          id="edgeGradActive"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" stopColor="var(--brand)" stopOpacity="1" />
          <stop offset="100%" stopColor="var(--brand)" stopOpacity="0.3" />
        </linearGradient>

        {/* Arrowhead markers */}
        <marker
          id="ge-arr-solid"
          markerWidth="5"
          markerHeight="5"
          refX="4.5"
          refY="2.5"
          orient="auto"
        >
          <path d="M0,0.5 L0,4.5 L5,2.5 z" fill="var(--text-3)" />
        </marker>
        <marker
          id="ge-arr-active"
          markerWidth="5"
          markerHeight="5"
          refX="4.5"
          refY="2.5"
          orient="auto"
        >
          <path d="M0,0.5 L0,4.5 L5,2.5 z" fill="var(--brand)" />
        </marker>
        <marker
          id="ge-arr-dashed"
          markerWidth="5"
          markerHeight="5"
          refX="4.5"
          refY="2.5"
          orient="auto"
        >
          <path d="M0,0.5 L0,4.5 L5,2.5 z" fill="var(--text-4)" />
        </marker>

        {/* Root node glow filter */}
        <filter id="rootGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* ── Edges ───────────────────────────────────────── */}
      {edges.map((edge) => {
        const from = positions.get(edge.fromId),
          to = positions.get(edge.toId);
        if (!from || !to) return null;

        const rFrom = nodeRadius(
          nodes.find((n) => n.id === edge.fromId)!
        );
        const rTo = nodeRadius(nodes.find((n) => n.id === edge.toId)!);
        const { sx, sy, ex, ey } = trimEdge(from.x, from.y, to.x, to.y, Math.max(rFrom, rTo));
        const d = quadPath(sx, sy, ex, ey);
        const isActive =
          hovered === edge.fromId ||
          hovered === edge.toId ||
          selected === edge.fromId ||
          selected === edge.toId;
        const isWeak = edge.strength && edge.strength < 0.3;
        const markerEnd = isActive
          ? "url(#ge-arr-active)"
          : isWeak
            ? "url(#ge-arr-dashed)"
            : "url(#ge-arr-solid)";
        const label = edge.explanation || edge.perspective || "";
        const { mx: qx, my: qy } = edgeMidpoint(sx, sy, ex, ey);

        return (
          <g key={edge.id}>
            <path
              d={d}
              fill="none"
              stroke={
                isActive
                  ? "url(#edgeGradActive)"
                  : edge.isContested
                    ? "var(--destructive)"
                    : "var(--text-3)"
              }
              strokeWidth={isActive ? 2 : isWeak ? 1 : 1.3}
              strokeDasharray={
                isWeak ? "5,4" : isActive ? undefined : "2,0"
              }
              strokeOpacity={isActive ? 1 : isWeak ? 0.4 : 0.55}
              markerEnd={markerEnd}
              style={{ transition: "stroke 0.2s, stroke-width 0.2s, stroke-opacity 0.2s" }}
            />
            {label && (
              <text
                x={qx}
                y={qy - 6}
                textAnchor="middle"
                style={{
                  fontSize: 7,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  fill: isActive ? "var(--text-1)" : "var(--text-4)",
                  fontFamily: "'JetBrains Mono', monospace",
                  pointerEvents: "none",
                  transition: "fill 0.2s",
                }}
              >
                {label.length > 14 ? label.slice(0, 14) + "…" : label}
              </text>
            )}
          </g>
        );
      })}

      {/* ── Nodes ───────────────────────────────────────── */}
      {nodes.map((node, i) => {
        const pos = positions.get(node.id);
        if (!pos) return null;

        const isHovered = hovered === node.id;
        const isSelected = selected === node.id;
        const isRoot = isRootNode(node.id);
        const r = nodeRadius(node);
        const conf = node.confidenceScore ?? 0.7;
        const confPct = Math.round(conf * 100);
        const label =
          node.title.length > 20
            ? node.title.slice(0, 20) + "…"
            : node.title;

        return (
          <g
            key={node.id}
            style={{ cursor: "pointer" }}
            onMouseEnter={() => setHovered(node.id)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => {
              setSelected(node.id);
              onNodeClick?.(node.id);
            }}
          >
            {/* Root: outer ripple ring */}
            {isRoot && (
              <circle
                cx={pos.x}
                cy={pos.y}
                r={r + 12}
                fill="none"
                stroke="var(--brand)"
                strokeWidth="1"
                opacity="0.15"
              >
                <animate
                  attributeName="r"
                  from={r + 8}
                  to={r + 24}
                  dur="3s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  from="0.25"
                  to="0"
                  dur="3s"
                  repeatCount="indefinite"
                />
              </circle>
            )}

            {/* Halo on hover/select */}
            {(isHovered || isSelected) && (
              <circle
                cx={pos.x}
                cy={pos.y}
                r={r + 8}
                fill="none"
                stroke={isRoot ? "var(--brand)" : "var(--text-1)"}
                strokeWidth={isSelected ? 1.5 : 0.8}
                opacity={isSelected ? 0.22 : 0.12}
                style={{ transition: "opacity 0.2s" }}
              />
            )}

            {/* Main circle */}
            <circle
              cx={pos.x}
              cy={pos.y}
              r={r}
              fill={
                isRoot
                  ? "rgba(255, 233, 225, 0.95)"
                  : NODE_COLORS[i % NODE_COLORS.length]
              }
              stroke={
                isRoot
                  ? "var(--brand)"
                  : isHovered || isSelected
                    ? "var(--brand)"
                    : "var(--border-med)"
              }
              strokeWidth={isRoot ? 2.5 : isHovered || isSelected ? 1.8 : 0.8}
              filter={isRoot ? "url(#rootGlow)" : undefined}
              style={{ transition: "stroke 0.2s, stroke-width 0.2s" }}
            />

            {/* Confidence arc ring */}
            <circle
              cx={pos.x}
              cy={pos.y}
              r={r - 4}
              fill="none"
              stroke={
                isRoot
                  ? "var(--brand)"
                  : "rgba(0,0,0,0.06)"
              }
              strokeWidth={isRoot ? 3 : 2.5}
              strokeDasharray={`${confPct} 100`}
              transform={`rotate(-90, ${pos.x}, ${pos.y})`}
              strokeOpacity={isRoot ? 0.5 : 1}
              style={{ pointerEvents: "none" }}
            />

            {/* Domain badge inside circle */}
            {node.domain && (
              <text
                x={pos.x}
                y={pos.y + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                style={{
                  fontSize: isRoot ? 7.5 : 6.5,
                  fontWeight: 800,
                  fill: isRoot
                    ? "var(--brand)"
                    : "rgba(0,0,0,0.2)",
                  fontFamily: "'JetBrains Mono', monospace",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  pointerEvents: "none",
                }}
              >
                {node.domain.length > 9
                  ? node.domain.slice(0, 9)
                  : node.domain}
              </text>
            )}

            {/* Title below */}
            <text
              x={pos.x}
              y={pos.y + r + 14}
              textAnchor="middle"
              dominantBaseline="hanging"
              style={{
                fontSize: isRoot ? 9.5 : 8,
                fontWeight: isRoot ? 800 : 700,
                letterSpacing: "0.03em",
                textTransform: "uppercase",
                fill:
                  isHovered || isSelected
                    ? "var(--brand)"
                    : "var(--text-1)",
                fontFamily: "'Manrope', system-ui, sans-serif",
                pointerEvents: "none",
                transition: "fill 0.2s",
              }}
            >
              {label}
            </text>

            {/* Confidence % */}
            <text
              x={pos.x}
              y={pos.y + r + 26}
              textAnchor="middle"
              dominantBaseline="hanging"
              style={{
                fontSize: 7,
                fontWeight: 600,
                fill: isRoot ? "var(--brand)" : "var(--text-4)",
                fontFamily: "'JetBrains Mono', monospace",
                pointerEvents: "none",
                letterSpacing: "0.04em",
              }}
            >
              {confPct}%
            </text>

            {/* Tooltip on hover */}
            {(isHovered || isSelected) && node.summary && (
              <foreignObject
                x={pos.x - 110}
                y={pos.y - r - 56}
                width={220}
                height={42}
                style={{ pointerEvents: "none", overflow: "visible" }}
              >
                <div
                  style={{
                    background: "var(--text-1)",
                    color: "var(--bg)",
                    fontSize: 9,
                    fontWeight: 500,
                    fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
                    lineHeight: 1.4,
                    padding: "6px 10px",
                    borderRadius: 4,
                    whiteSpace: "normal",
                    wordBreak: "break-word",
                    opacity: 0.95,
                    boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
                  }}
                >
                  {node.summary.length > 100
                    ? node.summary.slice(0, 100) + "…"
                    : node.summary}
                </div>
              </foreignObject>
            )}
          </g>
        );
      })}

      {/* Float animation keyframes */}
      <style>{`
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
          100% { transform: translateY(0px); }
        }
      `}</style>
    </svg>
  );
}
