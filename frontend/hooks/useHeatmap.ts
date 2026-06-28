"use client";

import type { GraphNode, GraphEdge } from "@/types/graph";

interface HeatmapConfig {
  /** Color a node based on its impact score */
  getNodeColor: (node: GraphNode, edges: GraphEdge[]) => string;
  /** Color an edge based on its strength */
  getEdgeColor: (edge: GraphEdge) => string;
}

/** Compute a heatmap color from a 0-1 value */
export function heatColor(value: number): string {
  // Green (0) → Yellow (0.5) → Orange (0.75) → Red (1.0)
  if (value < 0.25) return "#4caf50";
  if (value < 0.5) return "#ffc107";
  if (value < 0.75) return "#ff9800";
  return "#f44336";
}

/** Compute node impact score based on edge count and strength */
export function nodeImpactScore(nodeId: string, edges: GraphEdge[]): number {
  const incidentEdges = edges.filter((e) => e.fromId === nodeId || e.toId === nodeId);
  if (incidentEdges.length === 0) return 0;
  const avgStrength = incidentEdges.reduce((sum, e) => sum + (e.strength ?? 0), 0) / incidentEdges.length;
  const edgeFactor = Math.min(1, incidentEdges.length / 10);
  return avgStrength * 0.6 + edgeFactor * 0.4;
}

export const heatmapConfig: HeatmapConfig = {
  getNodeColor: (node: GraphNode, edges: GraphEdge[]) => {
    const impact = nodeImpactScore(node.id, edges);
    return heatColor(impact);
  },
  getEdgeColor: (edge: GraphEdge) => {
    return heatColor(edge.strength ?? 0.5);
  },
};
