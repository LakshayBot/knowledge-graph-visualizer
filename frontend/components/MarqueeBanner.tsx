export default function MarqueeBanner() {
  const items = [
    "Causal Knowledge Graphs",
    "Powered by Grok AI",
    "Three-Phase Retrieval",
    "Neo4j · Qdrant · Redis",
    "36/36 Tests Passing",
    "Clean Architecture",
  ];
  const repeated = [...items, ...items, ...items, ...items];
  return (
    <div
      style={{
        background: "#111",
        color: "#f5f2ec",
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        overflow: "hidden",
        whiteSpace: "nowrap",
        padding: "9px 0",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <div
        style={{
          display: "inline-block",
          animation: "marquee 28s linear infinite",
        }}
      >
        {repeated.map((t, i) => (
          <span key={i} style={{ marginRight: 0 }}>
            {t}
            <span style={{ margin: "0 20px", opacity: 0.3 }}>·</span>
          </span>
        ))}
      </div>
    </div>
  );
}
