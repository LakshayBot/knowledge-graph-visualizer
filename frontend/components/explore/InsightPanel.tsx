"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { GraphNode, GraphEdge } from "@/types/graph";

interface InsightPanelProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/** Detect non-obvious connections across the graph */
function detectInsights(nodes: GraphNode[], edges: GraphEdge[]): Insight[] {
  const insights: Insight[] = [];

  if (nodes.length < 4 || edges.length < 3) return insights;

  // 1. Find long-distance causal chains (3+ hops between weakly connected nodes)
  const adjacency = new Map<string, Set<string>>();
  for (const edge of edges) {
    if (!adjacency.has(edge.fromId)) adjacency.set(edge.fromId, new Set());
    if (!adjacency.has(edge.toId)) adjacency.set(edge.toId, new Set());
    adjacency.get(edge.fromId)!.add(edge.toId);
    adjacency.get(edge.toId)!.add(edge.fromId);
  }

  // 2. Find high-impact nodes (many edges + high strength)
  const impactScores = nodes.map((n) => {
    const incident = edges.filter((e) => e.fromId === n.id || e.toId === n.id);
    const totalStrength = incident.reduce((s, e) => s + (e.strength ?? 0.5), 0);
    return { node: n, count: incident.length, totalStrength };
  });
  impactScores.sort((a, b) => b.count - a.count);
  const topImpact = impactScores[0];
  if (topImpact && topImpact.count >= 4) {
    insights.push({
      type: "hub",
      title: "Central Driver",
      description: `${topImpact.node.title} is a central driver with ${topImpact.count} connections — removing it would reshape the entire graph.`,
      nodeIds: [topImpact.node.id],
    });
  }

  // 3. Find unexpected bridges (weak edges connecting distant clusters)
  const weakBridges = edges.filter((e) => (e.strength ?? 0.5) < 0.3);
  if (weakBridges.length > 0) {
    const e = weakBridges[0];
    const from = nodes.find((n) => n.id === e.fromId);
    const to = nodes.find((n) => n.id === e.toId);
    if (from && to) {
      insights.push({
        type: "bridge",
        title: "Fragile Connection",
        description: `"${from.title}" → "${to.title}" is a weak bridge (${Math.round((e.strength ?? 0) * 100)}% confidence). Investigating this further could reveal missing context.`,
        nodeIds: [e.fromId, e.toId],
      });
    }
  }

  // 4. Find contested edges
  const contested = edges.filter((e) => e.isContested);
  if (contested.length > 0) {
    insights.push({
      type: "debate",
      title: "Scholarly Disagreement",
      description: `${contested.length} causal link${contested.length > 1 ? "s are" : " is"} contested by experts — alternative theories may exist.`,
      nodeIds: contested.map((e) => e.fromId),
    });
  }

  return insights.slice(0, 3);
}

interface Insight {
  type: "hub" | "bridge" | "debate";
  title: string;
  description: string;
  nodeIds: string[];
}

const typeColors: Record<string, string> = {
  hub: "#e88040",
  bridge: "#7c6ff7",
  debate: "#e04040",
};

export default function InsightPanel({ nodes, edges }: InsightPanelProps) {
  const insights = useMemo(() => detectInsights(nodes, edges), [nodes, edges]);

  if (insights.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          position: "absolute",
          bottom: 80,
          left: 12,
          zIndex: 15,
          display: "flex",
          flexDirection: "column",
          gap: 6,
          maxWidth: 280,
          pointerEvents: "auto",
        }}
      >
        {insights.map((insight, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            style={{
              background: "rgba(255,255,255,0.92)",
              backdropFilter: "blur(12px)",
              border: "1px solid var(--border)",
              borderLeft: `3px solid ${typeColors[insight.type]}`,
              borderRadius: 8,
              padding: "8px 12px",
              fontSize: 11,
              lineHeight: 1.45,
              color: "var(--text-2)",
              fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}
          >
            <div style={{ fontWeight: 700, color: "var(--text-1)", marginBottom: 2, fontSize: 12 }}>
              {insight.title}
            </div>
            {insight.description}
          </motion.div>
        ))}
      </motion.div>
    </AnimatePresence>
  );
}
