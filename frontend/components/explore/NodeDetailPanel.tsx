"use client";

import Button from "@/components/shared/Button";
import type { GraphNode, GraphEdge } from "@/types/graph";

interface Props {
  node: GraphNode | null;
  edges?: GraphEdge[];
  saved?: boolean;
  onExpand?: (nodeId: string) => void;
  expanding?: boolean;
}

export default function NodeDetailPanel({ node, edges, saved, onExpand, expanding }: Props) {
  if (!node) {
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 24px",
          gap: 8,
          borderLeft: "1px solid var(--border)",
          background: "var(--surface)",
        }}
      >
        <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-4)", textAlign: "center", margin: 0 }}>
          Click a node to view details
        </p>
        <p style={{ fontSize: 11, color: "var(--text-4)", textAlign: "center", margin: 0 }}>
          Select any event node to see its properties and expand the graph
        </p>
      </div>
    );
  }

  const confPct = Math.round((node.confidenceScore ?? 0.7) * 100);

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderLeft: "1px solid var(--border)",
        background: "var(--surface)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "24px 20px 16px",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          {node.domain && <span className="chip" style={{ fontSize: 7 }}>{node.domain}</span>}
          {node.isVerified && (
            <span style={{ fontSize: 9, fontWeight: 700, color: "#27ae60", letterSpacing: "0.04em", textTransform: "uppercase" }}>
              ✓ Verified
            </span>
          )}
        </div>
        <h3
          style={{
            fontSize: 16,
            fontWeight: 900,
            letterSpacing: "-0.03em",
            color: "var(--text-1)",
            margin: "0 0 6px 0",
            lineHeight: 1.15,
          }}
        >
          {node.title}
        </h3>
        {node.eventDate && (
          <span style={{ fontSize: 11, color: "var(--text-4)", letterSpacing: "0.03em" }}>
            {new Date(node.eventDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </span>
        )}
      </div>

      {/* Body — scrollable content */}
      <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14, flex: 1, overflowY: "auto", minHeight: 0 }}>
        {/* Confidence */}
        <div>
          <span style={{ fontSize: 9, fontWeight: 700, color: "var(--text-4)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
            Confidence
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                flex: 1,
                height: 4,
                background: "var(--border)",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${confPct}%`,
                  background: confPct >= 70 ? "#27ae60" : confPct >= 40 ? "#f39c12" : "#e74c3c",
                  transition: "width 0.3s",
                }}
              />
            </div>
            <span style={{ fontSize: 11, fontWeight: 800, color: "var(--text-1)", fontFamily: "monospace" }}>
              {confPct}%
            </span>
          </div>
        </div>

        {/* Summary */}
        {node.summary && (
          <div>
            <span style={{ fontSize: 9, fontWeight: 700, color: "var(--text-4)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 4 }}>
              Summary
            </span>
            <p style={{ fontSize: 12, lineHeight: 1.65, color: "var(--text-3)", margin: 0 }}>
              {node.summary}
            </p>
          </div>
        )}

        {/* Perspectives */}
        {node.perspectives && node.perspectives.length > 0 && (
          <div>
            <span style={{ fontSize: 9, fontWeight: 700, color: "var(--text-4)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
              Perspectives
            </span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {node.perspectives.map((p) => (
                <span key={p} className="chip" style={{ fontSize: 7 }}>
                  {p}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        {(node.incomingEdgeCount !== undefined || node.outgoingEdgeCount !== undefined) && (
          <div style={{ display: "flex", gap: 24 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-1)", letterSpacing: "-0.03em" }}>
                {node.incomingEdgeCount ?? 0}
              </div>
              <div style={{ fontSize: 8, color: "var(--text-4)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Incoming
              </div>
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-1)", letterSpacing: "-0.03em" }}>
                {node.outgoingEdgeCount ?? 0}
              </div>
              <div style={{ fontSize: 8, color: "var(--text-4)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Outgoing
              </div>
            </div>
          </div>
        )}

        {/* Sources */}
        {node.sources && node.sources.length > 0 && (
          <div>
            <span style={{ fontSize: 9, fontWeight: 700, color: "var(--text-4)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
              Sources
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {node.sources.map((s, i) => (
                <a
                  key={i}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: 11,
                    color: "var(--text-3)",
                    textDecoration: "none",
                    borderBottom: "1px solid var(--border)",
                    paddingBottom: 4,
                    display: "block",
                    transition: "color 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-1)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-3)")}
                >
                  {s.title || s.url}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions — always visible */}
      <div
        style={{
          padding: "16px 20px",
          borderTop: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          flexShrink: 0,
        }}
      >
        {onExpand && (
          <Button
            variant="outline"
            onClick={() => onExpand(node.id)}
            loading={expanding}
            style={{ width: "100%" }}
          >
            Expand Node
          </Button>
        )}
        {saved && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: "8px 0",
              fontSize: 10,
              fontWeight: 700,
              color: "var(--text-4)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Saved to History
          </div>
        )}
      </div>
    </div>
  );
}
