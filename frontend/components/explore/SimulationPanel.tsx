"use client";

import { motion, AnimatePresence } from "framer-motion";

/* ── Inline icons ─────────────────────────────────── */

function UndoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    </svg>
  );
}

function RedoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

/* ── Types ────────────────────────────────────────── */

interface SimulationPanelProps {
  active: boolean;
  removedNodeId: string | null;
  impact: {
    edgesRemoved: number;
    orphanedNodes: string[];
    edgeImpactPercent: number;
  } | null;
  canUndo: boolean;
  canRedo: boolean;
  onToggleActive: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onReset: () => void;
}

export default function SimulationPanel({
  active,
  removedNodeId,
  impact,
  canUndo,
  canRedo,
  onToggleActive,
  onUndo,
  onRedo,
  onReset,
}: SimulationPanelProps) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.2 }}
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            zIndex: 20,
            background: "rgba(255, 248, 246, 0.95)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(0,0,0,0.08)",
            borderRadius: 12,
            padding: "12px 16px",
            minWidth: 240,
            maxWidth: 300,
            boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
            fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1)" }}>
              What If?
            </span>
            <button
              onClick={onToggleActive}
              aria-label="Close simulation"
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: "var(--text-3)", padding: 2, borderRadius: 4,
                display: "flex", transition: "color 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--brand)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-3)")}
            >
              <CloseIcon />
            </button>
          </div>

          {/* Instructions */}
          <p style={{ fontSize: 11, color: "var(--text-3)", margin: 0, marginBottom: 8, lineHeight: 1.4 }}>
            Click a node to see what happens if it never occurred. The graph recalculates in real-time.
          </p>

          {/* Impact analysis */}
          {impact && (
            <div
              style={{
                background: "var(--bg-subtle)",
                borderRadius: 8,
                padding: "8px 10px",
                marginBottom: 8,
                fontSize: 11,
                lineHeight: 1.5,
                color: "var(--text-2)",
              }}
            >
              <div style={{ fontWeight: 700, color: "var(--text-1)", marginBottom: 4 }}>
                Impact Analysis
              </div>
              <div>• {impact.edgesRemoved} edge{impact.edgesRemoved !== 1 ? "s" : ""} removed</div>
              <div>• {impact.edgeImpactPercent}% of all edges affected</div>
              {impact.orphanedNodes.length > 0 && (
                <div>• {impact.orphanedNodes.length} node{impact.orphanedNodes.length !== 1 ? "s" : ""} disconnected</div>
              )}
            </div>
          )}

          {!impact && (
            <p style={{ fontSize: 11, color: "var(--text-4)", margin: 0, marginBottom: 8, fontStyle: "italic" }}>
              Click any event node to simulate its removal.
            </p>
          )}

          {/* Undo / Redo / Reset */}
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={onUndo}
              disabled={!canUndo}
              style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                padding: "6px 10px", borderRadius: 6, border: "1px solid var(--border)",
                background: canUndo ? "var(--surface)" : "var(--bg-subtle)",
                color: canUndo ? "var(--text-1)" : "var(--text-4)",
                cursor: canUndo ? "pointer" : "not-allowed",
                fontSize: 11, fontWeight: 600, transition: "background 0.12s",
              }}
            >
              <UndoIcon /> Undo
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                padding: "6px 10px", borderRadius: 6, border: "1px solid var(--border)",
                background: canRedo ? "var(--surface)" : "var(--bg-subtle)",
                color: canRedo ? "var(--text-1)" : "var(--text-4)",
                cursor: canRedo ? "pointer" : "not-allowed",
                fontSize: 11, fontWeight: 600, transition: "background 0.12s",
              }}
            >
              <RedoIcon /> Redo
            </button>
            <button
              onClick={onReset}
              style={{
                padding: "6px 10px", borderRadius: 6, border: "1px solid var(--border)",
                background: "var(--surface)", color: "var(--text-2)",
                cursor: "pointer", fontSize: 11, fontWeight: 600,
              }}
            >
              Reset
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
