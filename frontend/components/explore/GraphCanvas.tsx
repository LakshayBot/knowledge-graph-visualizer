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
  /** Timeline visibility filter — only these node IDs are rendered (if set) */
  visibleNodeIds?: Set<string>;
  /** Timeline visibility filter — only these edge IDs are rendered (if set) */
  visibleEdgeIds?: Set<string>;
  /** Whether timeline playback is active (enables enter/exit animations) */
  timelineActive?: boolean;
  /** Enable heatmap coloring for nodes and edges */
  heatmap?: boolean;
  /** Incremented on graph structure changes (expansion/search) to clear UI state */
  graphVersion?: number;
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
  visibleNodeIds,
  visibleEdgeIds,
  timelineActive,
  heatmap,
  graphVersion,
}: Props) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  // User-controlled viewBox (set by pan/zoom). null = auto-fit to layoutBounds.
  const [userViewBox, setUserViewBox] = useState<typeof DEFAULT_VIEW_BOX | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  const prevGraphSig = useRef("");

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

  // ── Synchronous viewBox reset on graph change (not deferred to effect) ──
  // When the graph structure changes, immediately snap to layoutBounds on THIS render
  // so that tooltips and foreignObjects are positioned using the correct coordinate
  // transform. The useEffect-based approach fires AFTER the DOM commit, causing
  // a stale-frame where new node positions render through the old viewBox.
  const graphChanged = prevGraphSig.current !== "" && prevGraphSig.current !== graphSignature;
  if (graphChanged) {
    // Reset during render — userViewBox is state, but we force the display value
    // via the derived computation below. We'll sync state in the effect.
    prevGraphSig.current = graphSignature;
  } else if (prevGraphSig.current === "") {
    prevGraphSig.current = graphSignature;
  }

  // Derived viewBox: auto-fit on graph change, user-controlled otherwise
  const viewBox = graphChanged ? layoutBounds : (userViewBox ?? layoutBounds);

  // Sync graph change to state (side-effect only — display is handled above)
  useEffect(() => {
    if (graphChanged) {
      if (process.env.NODE_ENV === "development") {
        console.debug(
          "[GraphCanvas] graph changed — resetting viewBox to layoutBounds",
          { prevSig: prevGraphSig.current, graphSignature, layoutBounds }
        );
      }
      setUserViewBox(null);        // reset to auto-fit
      setHovered(null);
      setHoveredEdge(null);
      setSelected(null);
    }
  });

  // Clear hover/selection state when graph structure changes (expansion)
  useEffect(() => {
    setHovered(null);
    setHoveredEdge(null);
    setSelected(null);
  }, [graphVersion]);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const mx = e.clientX - rect.left,
        my = e.clientY - rect.top;
      const scale = e.deltaY > 0 ? 1.15 : 1 / 1.15;
      setUserViewBox((vb) => {
        const current = vb ?? layoutBounds;
        const sx = current.w / rect.width,
          sy = current.h / rect.height;
        const cx = current.x + mx * sx,
          cy = current.y + my * sy;
        const maxW = Math.max(VW * 5, layoutBounds.w * 3);
        const maxH = Math.max(VH * 5, layoutBounds.h * 3);
        const nw = Math.max(180, Math.min(maxW, current.w * scale));
        const nh = Math.max(120, Math.min(maxH, current.h * scale));
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
    setUserViewBox((vb) => {
      const svg = svgRef.current;
      const current = vb ?? layoutBounds;
      if (!svg) return current;
      const rect = svg.getBoundingClientRect();
      return {
        ...current,
        x: current.x - dx * (current.w / rect.width),
        y: current.y - dy * (current.h / rect.height),
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

        // Timeline visibility filter
        const edgeHidden = timelineActive && visibleEdgeIds && !visibleEdgeIds.has(edge.id);
        const edgeAnimStyle: React.CSSProperties | undefined = timelineActive
          ? {
              opacity: edgeHidden ? 0 : 1,
              pointerEvents: (edgeHidden ? "none" : "auto") as React.CSSProperties["pointerEvents"],
              transition: "opacity 0.3s ease",
            }
          : undefined;

        // ── Strength-based visual encoding ─────────────────────────
        const strength = edge.strength ?? 0.5;
        const strengthPct = Math.round(strength * 100);
        const isEdgeHovered = hoveredEdge === edge.id;
        const isActive =
          isEdgeHovered ||
          hovered === edge.fromId ||
          hovered === edge.toId ||
          selected === edge.fromId ||
          selected === edge.toId;

        // Strength tiers → stroke width + color
        let strengthStroke: string;
        let strengthWidth: number;
        if (strength < 0.25) {
          strengthStroke = "var(--text-4)"; strengthWidth = 0.8;
        } else if (strength < 0.5) {
          strengthStroke = "#f0a060"; strengthWidth = 1.2;
        } else if (strength < 0.75) {
          strengthStroke = "#e88040"; strengthWidth = 1.8;
        } else {
          strengthStroke = "#d06020"; strengthWidth = 2.4;
        }
        const strengthOpacity = 0.35 + strength * 0.5;

        const rFrom = nodeRadius(
          nodes.find((n) => n.id === edge.fromId)!
        );
        const rTo = nodeRadius(nodes.find((n) => n.id === edge.toId)!);
        const { sx, sy, ex, ey } = trimEdge(from.x, from.y, to.x, to.y, Math.max(rFrom, rTo));
        const d = quadPath(sx, sy, ex, ey);
        const isWeak = strength < 0.3;
        const markerEnd = isActive
          ? "url(#ge-arr-active)"
          : isWeak
            ? "url(#ge-arr-dashed)"
            : "url(#ge-arr-solid)";
        // Edge label: relationship type or perspective, with strength %
        const edgeLabelText = edge.explanation || edge.perspective || "";
        const { mx: qx, my: qy } = edgeMidpoint(sx, sy, ex, ey);

        return (
          <g
            key={edge.id}
            style={edgeAnimStyle}
            onMouseEnter={() => setHoveredEdge(edge.id)}
            onMouseLeave={() => setHoveredEdge(null)}
          >
            {/* Edge path — strength-encoded. pointer-events: stroke allows
                hovering the edge without blocking node hover/click events. */}
            <path
              d={d}
              fill="none"
              stroke={
                isActive
                  ? "url(#edgeGradActive)"
                  : edge.isContested
                    ? "var(--destructive)"
                    : strengthStroke
              }
              strokeWidth={isActive ? 2.2 : strengthWidth}
              strokeDasharray={
                isWeak && !isActive ? "5,4" : undefined
              }
              strokeOpacity={isActive ? 1 : edge.isContested ? 0.5 : strengthOpacity}
              markerEnd={markerEnd}
              style={{ transition: "stroke 0.2s, stroke-width 0.2s, stroke-opacity 0.2s", pointerEvents: "stroke" }}
            />
            {/* Strength badge */}
            <text
              x={qx}
              y={qy - 5}
              textAnchor="middle"
              style={{
                fontSize: 6.5,
                fontWeight: 700,
                fill: isActive ? "var(--text-1)" : "var(--text-4)",
                fontFamily: "'JetBrains Mono', monospace",
                pointerEvents: "none",
                transition: "fill 0.2s",
              }}
            >
              {strengthPct}%
            </text>
            {edgeLabelText && (
              <text
                x={qx}
                y={qy + 8}
                textAnchor="middle"
                style={{
                  fontSize: 6.5,
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  fill: isActive ? "var(--text-1)" : "var(--text-4)",
                  fontFamily: "'JetBrains Mono', monospace",
                  pointerEvents: "none",
                  transition: "fill 0.2s",
                  opacity: isActive ? 1 : 0.65,
                }}
              >
                {edgeLabelText.length > 16 ? edgeLabelText.slice(0, 16) + "…" : edgeLabelText}
              </text>
            )}
            {/* Edge tooltip — only on direct edge hover (not node selection) */}
            {isEdgeHovered && edge.explanation && (
              <foreignObject
                x={qx - 140}
                y={qy + 12}
                width={280}
                height={40}
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
                    borderRadius: 6,
                    whiteSpace: "normal",
                    wordBreak: "break-word",
                    opacity: 0.95,
                    boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
                    textAlign: "center",
                  }}
                >
                  {edge.explanation.length > 150 ? edge.explanation.slice(0, 150) + "…" : edge.explanation}
                </div>
              </foreignObject>
            )}
          </g>
        );
      })}

      {/* ── Nodes ───────────────────────────────────────── */}
      {nodes.map((node, i) => {
        const pos = positions.get(node.id);
        if (!pos) return null;

        // Timeline visibility filter
        const nodeHidden = timelineActive && visibleNodeIds && !visibleNodeIds.has(node.id);
        const nodeAnimStyle: React.CSSProperties = timelineActive
          ? {
              opacity: nodeHidden ? 0 : 1,
              transform: nodeHidden ? "scale(0.8)" : "scale(1)",
              pointerEvents: nodeHidden ? "none" : undefined,
              transition: "opacity 0.3s ease, transform 0.3s ease",
            }
          : {};

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
            style={{ cursor: "pointer", ...nodeAnimStyle }}
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
                  : heatmap
                    ? (() => {
                        const incidentEdges = edges.filter((e) => e.fromId === node.id || e.toId === node.id);
                        const impact = incidentEdges.length === 0 ? 0
                          : incidentEdges.reduce((sum, e) => sum + (e.strength ?? 0), 0) / incidentEdges.length * 0.6
                            + Math.min(1, incidentEdges.length / 10) * 0.4;
                        if (impact < 0.25) return "#4caf50";
                        if (impact < 0.5) return "#ffc107";
                        if (impact < 0.75) return "#ff9800";
                        return "#f44336";
                      })()
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

            {/* Tooltip — only on hover, not selection (sidebar shows full details) */}
            {isHovered && node.summary && (
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

      {/* Float animation keyframes + reduced-motion support */}
      <style>{`
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
          100% { transform: translateY(0px); }
        }
        @media (prefers-reduced-motion: reduce) {
          g[style*="transition"] {
            transition: none !important;
          }
          .no-motion * {
            animation: none !important;
          }
        }
      `}</style>
    </svg>
  );
}
