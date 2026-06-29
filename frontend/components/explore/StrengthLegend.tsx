"use client";

interface Props {
  hasEdges: boolean;
}

export default function StrengthLegend({ hasEdges }: Props) {
  if (!hasEdges) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: 12,
        left: 12,
        zIndex: 10,
        background: "rgba(255,255,255,0.88)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        borderRadius: 8,
        border: "1px solid var(--border)",
        padding: "8px 10px",
        fontSize: 9,
        fontFamily: "'JetBrains Mono', monospace",
        color: "var(--text-3)",
        lineHeight: 1.5,
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        pointerEvents: "auto",
      }}
    >
      <div style={{ fontWeight: 700, color: "var(--text-1)", marginBottom: 4, fontSize: 10 }}>
        Edge Strength
      </div>
      {[
        { label: "0–25%", color: "var(--text-4)", w: 0.8 },
        { label: "25–50%", color: "#f0a060", w: 1.2 },
        { label: "50–75%", color: "#e88040", w: 1.8 },
        { label: "75–100%", color: "#d06020", w: 2.4 },
      ].map((tier) => (
        <div key={tier.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <svg width={20} height={8}>
            <line x1={0} y1={4} x2={20} y2={4} stroke={tier.color} strokeWidth={tier.w} />
          </svg>
          <span>{tier.label}</span>
        </div>
      ))}
    </div>
  );
}
