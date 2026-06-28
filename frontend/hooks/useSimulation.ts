"use client";

import { useState, useCallback, useMemo } from "react";
import type { GraphNode, GraphEdge } from "@/types/graph";

interface SimulationState {
  /** Node currently being simulated as removed */
  removedNodeId: string | null;
  /** All previously removed node IDs in the current session */
  history: string[];
  /** Index in history for undo/redo */
  historyIndex: number;
}

interface UseSimulationOptions {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

interface SimulationImpact {
  /** How many edges would be lost */
  edgesRemoved: number;
  /** Nodes that would become disconnected */
  orphanedNodes: string[];
  /** Percentage of total edges affected */
  edgeImpactPercent: number;
}

interface UseSimulationReturn {
  /** Whether simulation mode is active */
  active: boolean;
  /** Currently removed node ID */
  removedNodeId: string | null;
  /** Filtered nodes (with removed node excluded) */
  simulatedNodes: GraphNode[];
  /** Filtered edges (edges involving the removed node excluded) */
  simulatedEdges: GraphEdge[];
  /** Impact analysis of the current removal */
  impact: SimulationImpact | null;
  /** Can undo */
  canUndo: boolean;
  /** Can redo */
  canRedo: boolean;
  /** Toggle simulation mode on/off */
  toggleActive: () => void;
  /** Remove a specific node */
  removeNode: (nodeId: string) => void;
  /** Restore the last removed node (undo) */
  undo: () => void;
  /** Re-remove (redo) */
  redo: () => void;
  /** Reset simulation entirely */
  reset: () => void;
}

export function useSimulation({ nodes, edges }: UseSimulationOptions): UseSimulationReturn {
  const [active, setActive] = useState(false);
  const [removedNodeId, setRemovedNodeId] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // ── Derived: filtered nodes and edges ─────────────────────────────
  const { simulatedNodes, simulatedEdges, impact } = useMemo(() => {
    if (!removedNodeId) {
      return { simulatedNodes: nodes, simulatedEdges: edges, impact: null };
    }

    const filteredNodes = nodes.filter((n) => n.id !== removedNodeId);
    const removedEdgeIds = new Set<string>();
    const orphanedNodes = new Set<string>();

    for (const edge of edges) {
      if (edge.fromId === removedNodeId || edge.toId === removedNodeId) {
        removedEdgeIds.add(edge.id);
        // The OTHER endpoint might become orphaned
        const otherId = edge.fromId === removedNodeId ? edge.toId : edge.fromId;
        // Check if this node has ANY other edges
        const hasOtherEdges = edges.some(
          (e) =>
            e.id !== edge.id &&
            (e.fromId === otherId || e.toId === otherId) &&
            e.fromId !== removedNodeId &&
            e.toId !== removedNodeId
        );
        if (!hasOtherEdges) {
          orphanedNodes.add(otherId);
        }
      }
    }

    const filteredEdges = edges.filter((e) => !removedEdgeIds.has(e.id));

    const impactData: SimulationImpact = {
      edgesRemoved: removedEdgeIds.size,
      orphanedNodes: Array.from(orphanedNodes),
      edgeImpactPercent: edges.length > 0
        ? Math.round((removedEdgeIds.size / edges.length) * 100)
        : 0,
    };

    return {
      simulatedNodes: filteredNodes,
      simulatedEdges: filteredEdges,
      impact: impactData,
    };
  }, [nodes, edges, removedNodeId]);

  // ── Actions ────────────────────────────────────────────────────────
  const toggleActive = useCallback(() => {
    setActive((prev) => {
      if (prev) {
        // Turning off — reset
        setRemovedNodeId(null);
        setHistory([]);
        setHistoryIndex(-1);
      }
      return !prev;
    });
  }, []);

  const removeNode = useCallback(
    (nodeId: string) => {
      if (removedNodeId) {
        // Push current to history before replacing
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(removedNodeId);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
      }
      setRemovedNodeId(nodeId);
    },
    [removedNodeId, history, historyIndex]
  );

  const undo = useCallback(() => {
    if (historyIndex >= 0) {
      setRemovedNodeId(history[historyIndex]);
      setHistoryIndex((i) => i - 1);
    } else if (removedNodeId) {
      setRemovedNodeId(null);
      setHistoryIndex(-1);
    }
  }, [history, historyIndex, removedNodeId]);

  const redo = useCallback(() => {
    if (historyIndex + 1 < history.length) {
      const nextIdx = historyIndex + 1;
      setRemovedNodeId(history[nextIdx]);
      setHistoryIndex(nextIdx);
    }
  }, [history, historyIndex]);

  const reset = useCallback(() => {
    setRemovedNodeId(null);
    setHistory([]);
    setHistoryIndex(-1);
    setActive(false);
  }, []);

  const canUndo = removedNodeId !== null || historyIndex >= 0;
  const canRedo = historyIndex + 1 < history.length;

  return {
    active,
    removedNodeId,
    simulatedNodes,
    simulatedEdges,
    impact,
    canUndo,
    canRedo,
    toggleActive,
    removeNode,
    undo,
    redo,
    reset,
  };
}
