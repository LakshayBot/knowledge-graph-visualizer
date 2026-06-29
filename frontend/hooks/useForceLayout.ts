"use client";

import { useMemo } from "react";
import type { GraphNode, GraphEdge } from "@/types/graph";

interface Position {
  x: number;
  y: number;
}

const COLUMN_GAP = 260;
const ROW_GAP = 148;
const MIN_GAP = 140;

function compareByTitle(nodesById: Map<string, GraphNode>) {
  return (a: string, b: string) => {
    const at = nodesById.get(a)?.title ?? a;
    const bt = nodesById.get(b)?.title ?? b;
    return at.localeCompare(bt);
  };
}

export function useForceLayout(nodes: GraphNode[], edges: GraphEdge[], rootId?: string | null) {
  return useMemo(() => {
    if (nodes.length === 0) return new Map<string, Position>();

    const positions = new Map<string, Position>();
    const nodesById = new Map(nodes.map((n) => [n.id, n]));
    const nodeIds = new Set(nodes.map((n) => n.id));
    const start = rootId && nodeIds.has(rootId) ? rootId : nodes[0].id;

    // Directed adjacency keeps casual direction readable as the graph expands.
    const incoming = new Map<string, string[]>();
    const outgoing = new Map<string, string[]>();
    nodes.forEach((n) => {
      incoming.set(n.id, []);
      outgoing.set(n.id, []);
    });
    edges.forEach((e) => {
      if (!nodeIds.has(e.fromId) || !nodeIds.has(e.toId)) return;
      outgoing.get(e.fromId)?.push(e.toId);
      incoming.get(e.toId)?.push(e.fromId);
    });

    // ── Directed BFS from root: incoming causes to the left, effects to the right.
    const levels = new Map<string, number>();
    const queue = [start];
    levels.set(start, 0);

    while (queue.length > 0) {
      const cur = queue.shift()!;
      const lvl = levels.get(cur)!;

      for (const nb of incoming.get(cur) ?? []) {
        if (!levels.has(nb)) {
          levels.set(nb, lvl - 1);
          queue.push(nb);
        }
      }

      for (const nb of outgoing.get(cur) ?? []) {
        if (!levels.has(nb)) {
          levels.set(nb, lvl + 1);
          queue.push(nb);
        }
      }
    }

    // Keep disconnected results visible without letting them collapse onto root.
    let orphanIndex = 0;
    nodes.forEach((n) => {
      if (!levels.has(n.id)) {
        const side = orphanIndex % 2 === 0 ? -1 : 1;
        const distance = 1 + Math.floor(orphanIndex / 2);
        levels.set(n.id, side * distance);
        orphanIndex += 1;
      }
    });

    const byLevel = new Map<number, string[]>();
    levels.forEach((lvl, id) => {
      const arr = byLevel.get(lvl) ?? [];
      arr.push(id);
      byLevel.set(lvl, arr);
    });

    // ── Order each column by neighboring columns to reduce edge crossings.
    const levelsSorted = Array.from(byLevel.keys()).sort((a, b) => a - b);
    levelsSorted.forEach((level) => byLevel.get(level)?.sort(compareByTitle(nodesById)));

    for (const level of levelsSorted) {
      const ids = byLevel.get(level) ?? [];
      const neighborScore = (id: string) => {
        const neighbors = [...(incoming.get(id) ?? []), ...(outgoing.get(id) ?? [])];
        const ranked = neighbors
          .map((nb) => {
            const nbLevel = levels.get(nb);
            if (nbLevel === undefined || nbLevel === level) return null;
            const group = byLevel.get(nbLevel) ?? [];
            const idx = group.indexOf(nb);
            return idx >= 0 ? idx : null;
          })
          .filter((idx): idx is number => idx !== null);

        if (ranked.length === 0) return Number.MAX_SAFE_INTEGER;
        return ranked.reduce((sum, idx) => sum + idx, 0) / ranked.length;
      };

      ids.sort((a, b) => {
        const scoreDelta = neighborScore(a) - neighborScore(b);
        return scoreDelta || compareByTitle(nodesById)(a, b);
      });
    }

    // ── Place nodes in expandable columns instead of clamping into one viewport.
    levelsSorted.forEach((level) => {
      const ids = byLevel.get(level) ?? [];
      const yStart = -((ids.length - 1) * ROW_GAP) / 2;
      ids.forEach((id, i) => {
        positions.set(id, {
          x: level * COLUMN_GAP,
          y: yStart + i * ROW_GAP,
        });
      });
    });

    // ── Local collision avoidance for same-column and cross-column collisions.
    const allPos = Array.from(positions.entries());
    for (let pass = 0; pass < 10; pass++) {
      for (let i = 0; i < allPos.length; i++) {
        for (let j = i + 1; j < allPos.length; j++) {
          const a = allPos[i][1];
          const b = allPos[j][1];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          if (dist < MIN_GAP) {
            const push = (MIN_GAP - dist) / 2;
            const nx = dx / dist;
            const ny = dy / dist;
            a.x += nx * push;
            a.y += ny * push;
            b.x -= nx * push;
            b.y -= ny * push;
          }
        }
      }
    }

    return positions;
  }, [nodes, edges, rootId]);
}
