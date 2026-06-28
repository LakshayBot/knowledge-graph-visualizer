"use client";

import { useCallback, useRef } from "react";

/* ── Inline SVG icons ──────────────────────────────── */

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  );
}

function SkipBackIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="19 20 9 12 19 4 19 20" />
      <line x1="5" y1="19" x2="5" y2="5" />
    </svg>
  );
}

function SkipForwardIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 4 15 12 5 20 5 4" />
      <line x1="19" y1="5" x2="19" y2="19" />
    </svg>
  );
}

/* ── Types ─────────────────────────────────────────── */

interface TimelineBarProps {
  currentYear: number;
  isPlaying: boolean;
  playbackSpeed: number;
  yearRange: { min: number; max: number };
  visibleCount: number;
  totalWithYears: number;
  hasTimeline: boolean;
  onTogglePlay: () => void;
  onSpeedChange: (speed: number) => void;
  onSeek: (year: number) => void;
  onJumpToStart: () => void;
  onJumpToEnd: () => void;
}

const SPEEDS = [0.5, 1, 2] as const;

const BASE_STYLE: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "8px 14px",
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  userSelect: "none",
  width: "100%",
  maxWidth: 680,
  margin: "0 auto",
};

const iconBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 32,
  height: 32,
  border: "none",
  borderRadius: 8,
  background: "transparent",
  color: "var(--text-2)",
  cursor: "pointer",
  flexShrink: 0,
  transition: "background 0.12s, color 0.12s",
};

export default function TimelineBar({
  currentYear,
  isPlaying,
  playbackSpeed,
  yearRange,
  visibleCount,
  totalWithYears,
  hasTimeline,
  onTogglePlay,
  onSpeedChange,
  onSeek,
  onJumpToStart,
  onJumpToEnd,
}: TimelineBarProps) {
  const sliderRef = useRef<HTMLInputElement>(null);

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onSeek(parseInt(e.target.value, 10));
    },
    [onSeek]
  );

  const progress = yearRange.max > yearRange.min
    ? ((currentYear - yearRange.min) / (yearRange.max - yearRange.min)) * 100
    : 100;

  if (!hasTimeline) return null;

  return (
    <div style={BASE_STYLE}>
      {/* ── Playback controls ──────────────────────────── */}
      <button
        onClick={onJumpToStart}
        aria-label="Jump to start"
        style={iconBtnStyle}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--bg-subtle)";
          e.currentTarget.style.color = "var(--text-1)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "var(--text-2)";
        }}
      >
        <SkipBackIcon />
      </button>

      <button
        onClick={onTogglePlay}
        aria-label={isPlaying ? "Pause" : "Play"}
        style={{
          ...iconBtnStyle,
          background: isPlaying ? "var(--bg-subtle)" : "transparent",
          color: isPlaying ? "var(--text-1)" : "var(--text-2)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--bg-subtle)";
          e.currentTarget.style.color = "var(--text-1)";
        }}
        onMouseLeave={(e) => {
          if (!isPlaying) {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--text-2)";
          }
        }}
      >
        {isPlaying ? <PauseIcon /> : <PlayIcon />}
      </button>

      <button
        onClick={onJumpToEnd}
        aria-label="Jump to end"
        style={iconBtnStyle}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--bg-subtle)";
          e.currentTarget.style.color = "var(--text-1)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "var(--text-2)";
        }}
      >
        <SkipForwardIcon />
      </button>

      {/* ── Year label ─────────────────────────────────── */}
      <span
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: "var(--text-1)",
          minWidth: 44,
          textAlign: "center",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {currentYear}
      </span>

      {/* ── Range slider ───────────────────────────────── */}
      <div style={{ flex: 1, position: "relative", minWidth: 80 }}>
        <input
          ref={sliderRef}
          type="range"
          min={yearRange.min}
          max={yearRange.max}
          value={currentYear}
          onChange={handleSliderChange}
          aria-label="Timeline year"
          style={{
            width: "100%",
            height: 6,
            appearance: "none",
            background: `linear-gradient(to right, var(--text-2) 0%, var(--text-2) ${progress}%, var(--border) ${progress}%, var(--border) 100%)`,
            borderRadius: 3,
            outline: "none",
            cursor: "pointer",
            margin: 0,
          }}
        />
        {/* Custom thumb via inline style cannot be done on input[type=range] directly.
            We use a wrapper pseudo-element approach via a global style injection instead. */}
        <style jsx>{`
          input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: var(--text-1);
            border: 2px solid var(--surface);
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
            cursor: pointer;
            transition: transform 0.1s ease;
          }
          input[type="range"]::-webkit-slider-thumb:hover {
            transform: scale(1.15);
          }
          input[type="range"]::-moz-range-thumb {
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: var(--text-1);
            border: 2px solid var(--surface);
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
            cursor: pointer;
          }
        `}</style>
      </div>

      {/* ── Speed selector ─────────────────────────────── */}
      <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
        {SPEEDS.map((speed) => (
          <button
            key={speed}
            onClick={() => onSpeedChange(speed)}
            aria-label={`${speed}× speed`}
            aria-pressed={playbackSpeed === speed}
            style={{
              padding: "4px 7px",
              fontSize: 12,
              fontWeight: playbackSpeed === speed ? 600 : 400,
              color: playbackSpeed === speed ? "var(--text-1)" : "var(--text-3)",
              background: playbackSpeed === speed ? "var(--bg-subtle)" : "transparent",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              transition: "background 0.12s, color 0.12s",
              lineHeight: 1.3,
            }}
          >
            {speed}×
          </button>
        ))}
      </div>

      {/* ── Event count ─────────────────────────────────── */}
      <span
        style={{
          fontSize: 12,
          color: "var(--text-3)",
          whiteSpace: "nowrap",
          flexShrink: 0,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {visibleCount}/{totalWithYears}
      </span>
    </div>
  );
}
