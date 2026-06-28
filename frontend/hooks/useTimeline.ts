"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import type { GraphNode, GraphEdge, TimelineState } from "@/types/graph";

function extractYear(dateStr?: string): number | null {
  if (!dateStr) return null;
  // Handle ISO 8601: "2008-09-15T00:00:00" or "2008-09-15"
  const match = dateStr.match(/^(-?\d{1,4})/);
  if (!match) return null;
  const year = parseInt(match[1], 10);
  if (isNaN(year)) return null;
  return year;
}

interface UseTimelineOptions {
  nodes: GraphNode[];
  edges: GraphEdge[];
  initialState?: Partial<TimelineState>;
  /** Disable all animations (respects prefers-reduced-motion) */
  reducedMotion?: boolean;
}

interface UseTimelineReturn {
  /** Current timeline year */
  currentYear: number;
  /** Whether autoplay is active */
  isPlaying: boolean;
  /** Current playback speed multiplier */
  playbackSpeed: number;
  /** Min and max years in the dataset */
  yearRange: { min: number; max: number };
  /** Number of nodes visible at the current year */
  visibleCount: number;
  /** Total number of nodes with year data */
  totalWithYears: number;
  /** Set of node IDs visible at current year */
  visibleNodeIds: Set<string>;
  /** Set of edge IDs visible at current year */
  visibleEdgeIds: Set<string>;
  /** Whether the timeline has usable data */
  hasTimeline: boolean;
  /** Jump to a specific year */
  seek: (year: number) => void;
  /** Start autoplay */
  play: () => void;
  /** Pause autoplay */
  pause: () => void;
  /** Toggle play/pause */
  togglePlay: () => void;
  /** Set playback speed */
  setSpeed: (speed: number) => void;
  /** Jump to the earliest year */
  jumpToStart: () => void;
  /** Jump to the latest year */
  jumpToEnd: () => void;
  /** Current timeline state snapshot (for persistence) */
  snapshot: TimelineState;
}

/** Base tick interval in milliseconds at 1× speed */
const BASE_TICK_MS = 800;

export function useTimeline({
  nodes,
  edges,
  initialState,
  reducedMotion = false,
}: UseTimelineOptions): UseTimelineReturn {
  // ── Derive year data from nodes ────────────────────────────────────────
  const nodeYearMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const node of nodes) {
      const year = extractYear(node.eventDate);
      if (year !== null) {
        map.set(node.id, year);
      }
    }
    return map;
  }, [nodes]);

  const yearRange = useMemo(() => {
    const years = Array.from(nodeYearMap.values());
    if (years.length === 0) return { min: new Date().getFullYear(), max: new Date().getFullYear() };
    return {
      min: Math.min(...years),
      max: Math.max(...years),
    };
  }, [nodeYearMap]);

  const hasTimeline = nodeYearMap.size >= 2;

  // ── Edge year resolution ───────────────────────────────────────────────
  const edgeYearMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const edge of edges) {
      const fromYear = nodeYearMap.get(edge.fromId);
      const toYear = nodeYearMap.get(edge.toId);
      // Edge is tied to the later of its two endpoint years
      const edgeYear = fromYear != null && toYear != null
        ? Math.max(fromYear, toYear)
        : fromYear ?? toYear ?? null;
      if (edgeYear !== null) {
        map.set(edge.id, edgeYear);
      }
    }
    return map;
  }, [edges, nodeYearMap]);

  // ── State ──────────────────────────────────────────────────────────────
  const [currentYear, setCurrentYear] = useState<number>(
    initialState?.currentYear ?? yearRange.max
  );
  const [isPlaying, setIsPlaying] = useState(initialState?.isPlaying ?? false);
  const [playbackSpeed, setPlaybackSpeed] = useState(initialState?.playbackSpeed ?? 1);

  // Reset year when data changes
  useEffect(() => {
    if (hasTimeline) {
      setCurrentYear(yearRange.max);
      setIsPlaying(false);
    }
  }, [yearRange.min, yearRange.max, hasTimeline]);

  // ── Visibility derivation ──────────────────────────────────────────────
  const { visibleNodeIds, visibleEdgeIds } = useMemo(() => {
    const vNodes = new Set<string>();
    const vEdges = new Set<string>();

    for (const [nodeId, year] of nodeYearMap) {
      if (year <= currentYear) {
        vNodes.add(nodeId);
      }
    }

    for (const [edgeId, year] of edgeYearMap) {
      if (year <= currentYear) {
        vEdges.add(edgeId);
      }
    }

    return { visibleNodeIds: vNodes, visibleEdgeIds: vEdges };
  }, [nodeYearMap, edgeYearMap, currentYear]);

  const visibleCount = visibleNodeIds.size;
  const totalWithYears = nodeYearMap.size;

  // ── Autoplay timer ─────────────────────────────────────────────────────
  const animFrameRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);

  useEffect(() => {
    if (!isPlaying || !hasTimeline) return;

    const tickMs = BASE_TICK_MS / playbackSpeed;

    function loop(timestamp: number) {
      if (timestamp - lastTickRef.current >= tickMs) {
        lastTickRef.current = timestamp;
        setCurrentYear((prev) => {
          if (prev >= yearRange.max) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }
      animFrameRef.current = requestAnimationFrame(loop);
    }

    lastTickRef.current = performance.now();
    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, hasTimeline, yearRange.max]);

  // ── Actions ────────────────────────────────────────────────────────────
  const seek = useCallback((year: number) => {
    const clamped = Math.max(yearRange.min, Math.min(yearRange.max, year));
    setCurrentYear(clamped);
  }, [yearRange.min, yearRange.max]);

  const play = useCallback(() => {
    if (currentYear >= yearRange.max) {
      setCurrentYear(yearRange.min);
    }
    setIsPlaying(true);
  }, [currentYear, yearRange.min, yearRange.max]);

  const pause = useCallback(() => setIsPlaying(false), []);

  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  const setSpeed = useCallback((speed: number) => {
    setPlaybackSpeed(speed);
  }, []);

  const jumpToStart = useCallback(() => {
    setIsPlaying(false);
    setCurrentYear(yearRange.min);
  }, [yearRange.min]);

  const jumpToEnd = useCallback(() => {
    setIsPlaying(false);
    setCurrentYear(yearRange.max);
  }, [yearRange.max]);

  // ── Snapshot for persistence ───────────────────────────────────────────
  const snapshot: TimelineState = {
    currentYear,
    isPlaying,
    playbackSpeed,
    yearRange,
  };

  return {
    currentYear,
    isPlaying,
    playbackSpeed,
    yearRange,
    visibleCount,
    totalWithYears,
    visibleNodeIds,
    visibleEdgeIds,
    hasTimeline,
    seek,
    play,
    pause,
    togglePlay,
    setSpeed,
    jumpToStart,
    jumpToEnd,
    snapshot,
  };
}
