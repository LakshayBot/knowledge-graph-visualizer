"use client";

import { Check } from "lucide-react";
import Button from "@/components/shared/Button";
import type { GraphNode, GraphEdge } from "@/types/graph";

interface Props {
  node: GraphNode | null;
  edges?: GraphEdge[];
  saved?: boolean;
  onExpand?: (nodeId: string) => void;
  expanding?: boolean;
  isExpanded?: boolean;
  provider?: string;
  model?: string;
}

const PROVIDER_DISPLAY: Record<string, string> = {
  grok: "Grok (xAI)",
  openai: "OpenAI",
  claude: "Anthropic Claude",
  gemini: "Google Gemini",
  copilot: "GitHub Copilot",
  ollama: "Ollama (Local)",
};

export default function NodeDetailPanel({ node, edges, saved, onExpand, expanding, isExpanded, provider, model }: Props) {

  const providerLabel = provider
    ? PROVIDER_DISPLAY[provider] ?? provider
    : null;
  const modelLabel = model ?? null;
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
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--text-4)" strokeWidth="1.5" strokeLinecap="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
        </svg>
        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-3)", textAlign: "center", margin: 0 }}>
          Click a node to inspect
        </p>
        <p style={{ fontSize: 11, color: "var(--text-4)", textAlign: "center", margin: 0, maxWidth: 200 }}>
          Select any event node to view its properties and expand the casual graph
        </p>
      </div>
    );
  }

  const confPct = Math.round((node.confidenceScore ?? 0.7) * 100);
  const confidenceColor =
    confPct >= 80 ? "var(--chart-2)" : confPct >= 50 ? "var(--chart-3)" : "var(--destructive)";
  const impactLabel = confPct >= 80 ? "High" : confPct >= 50 ? "Medium" : "Low";
  const impactScore = (node.confidenceScore ?? 0.7) * 10;

  const linkedCount =
    (node.incomingEdgeCount ?? 0) + (node.outgoingEdgeCount ?? 0);

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderLeft: "1px solid var(--border)",
        background: "rgba(255, 248, 246, 0.95)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        overflow: "hidden",
      }}
    >
      {/* Scrollable content */}
      <div
        className="custom-scrollbar"
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "24px 24px 20px",
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        {/* Domain badge */}
        {node.domain && (
          <span
            style={{
              display: "inline-block",
              alignSelf: "flex-start",
              padding: "4px 10px",
              borderRadius: 4,
              fontSize: 10,
              fontWeight: 700,
              fontFamily: "'JetBrains Mono', monospace",
              background: "rgba(159, 61, 0, 0.1)",
              color: "var(--brand)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            {node.domain}
          </span>
        )}

        {/* Title */}
        <h3
          style={{
            fontSize: 20,
            fontWeight: 700,
            fontFamily: "'Manrope', system-ui, sans-serif",
            color: "var(--text-1)",
            margin: 0,
            lineHeight: 1.25,
            letterSpacing: "-0.02em",
          }}
        >
          {node.title}
        </h3>

        {/* Confidence */}
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              marginBottom: 8,
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                fontFamily: "'JetBrains Mono', monospace",
                color: "var(--text-4)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Casual Confidence
            </span>
            <span
              style={{
                fontSize: 18,
                fontWeight: 700,
                fontFamily: "'Manrope', sans-serif",
                color: "var(--text-1)",
              }}
            >
              {confPct}%
            </span>
          </div>
          <div
            style={{
              height: 6,
              width: "100%",
              background: "var(--bg-subtle)",
              borderRadius: 999,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${confPct}%`,
                background: confidenceColor,
                borderRadius: 999,
                transition: "width 0.5s ease",
              }}
            />
          </div>
        </div>

        {/* Summary */}
        {node.summary && (
          <div>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                fontFamily: "'JetBrains Mono', monospace",
                color: "var(--text-4)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                display: "block",
                marginBottom: 8,
              }}
            >
              Summary
            </span>
            <p
              style={{
                fontSize: 13,
                lineHeight: 1.65,
                color: "var(--text-3)",
                margin: 0,
              }}
            >
              {node.summary}
            </p>
          </div>
        )}

        {/* Perspectives */}
        {node.perspectives && node.perspectives.length > 0 && (
          <div>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                fontFamily: "'JetBrains Mono', monospace",
                color: "var(--text-4)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                display: "block",
                marginBottom: 8,
              }}
            >
              Perspectives
            </span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {node.perspectives.map((p) => (
                <span
                  key={p}
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    fontFamily: "'JetBrains Mono', monospace",
                    padding: "3px 8px",
                    borderRadius: 4,
                    background: "var(--bg-subtle)",
                    border: "1px solid var(--border)",
                    color: "var(--text-2)",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Metadata */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            paddingTop: 20,
            borderTop: "1px solid var(--border)",
          }}
        >
          {node.eventDate && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontFamily: "'JetBrains Mono', monospace",
                  color: "var(--text-4)",
                  fontWeight: 500,
                }}
              >
                Date Range
              </span>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--text-2)",
                }}
              >
                {new Date(node.eventDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontFamily: "'JetBrains Mono', monospace",
                color: "var(--text-4)",
                fontWeight: 500,
              }}
            >
              Impact Score
            </span>
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "var(--brand)",
              }}
            >
              {impactLabel} ({impactScore.toFixed(1)})
            </span>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontFamily: "'JetBrains Mono', monospace",
                color: "var(--text-4)",
                fontWeight: 500,
              }}
            >
              Linked Events
            </span>
            <span
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "var(--text-2)",
              }}
            >
              {linkedCount} Nodes
            </span>
          </div>
        </div>

        {/* Sources */}
        {node.sources && node.sources.length > 0 && (
          <div>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                fontFamily: "'JetBrains Mono', monospace",
                color: "var(--text-4)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                display: "block",
                marginBottom: 8,
              }}
            >
              Sources
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {node.sources.map((s, i) => (
                <a
                  key={i}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: 12,
                    color: "var(--text-3)",
                    textDecoration: "none",
                    padding: "6px 10px",
                    borderRadius: 6,
                    background: "var(--bg-subtle)",
                    border: "1px solid var(--border)",
                    transition: "color 0.15s, border-color 0.15s",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "var(--brand)";
                    e.currentTarget.style.borderColor = "var(--brand)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "var(--text-3)";
                    e.currentTarget.style.borderColor = "var(--border)";
                  }}
                >
                  {s.title || s.url}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div
        style={{
          padding: "20px 24px",
          borderTop: "1px solid var(--border)",
          background: "var(--surface)",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          flexShrink: 0,
        }}
      >
        {onExpand && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Button
              variant={isExpanded ? "primary" : "outline"}
              onClick={() => onExpand(node.id)}
              loading={expanding}
              disabled={isExpanded}
              style={{ width: "100%" }}
            >
              {isExpanded ? "Expanded" : expanding ? "Expanding…" : "Expand Node Network"}
            </Button>
            {providerLabel && (
              <p
                style={{
                  margin: 0,
                  fontSize: 10,
                  fontFamily: "'JetBrains Mono', monospace",
                  color: "var(--text-4)",
                  textAlign: "center",
                  letterSpacing: "0.04em",
                }}
              >
                via {providerLabel}{modelLabel ? ` / ${modelLabel}` : ""}
              </p>
            )}
          </div>
        )}
        {saved && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              color: "var(--chart-2)",
              fontSize: 10,
              fontWeight: 700,
              fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            <Check size={12} />
            Saved to History
          </div>
        )}
      </div>

      {/* Custom scrollbar */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e0c0b3; border-radius: 4px; }
      `}</style>
    </div>
  );
}
