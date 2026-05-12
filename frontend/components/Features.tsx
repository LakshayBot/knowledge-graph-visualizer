// ─── Features ─────────────────────────────────────────────────────────────────

const features = [
  {
    title: "Grok AI Graph Generation",
    description:
      "A single structured prompt to xAI's Grok model produces a complete causal knowledge graph — event nodes with dates, domains, confidence scores, source URLs, and directed causal edges. No Wikipedia scraping, no multi-step pipelines.",
    tag: "Core Engine",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    ),
  },
  {
    title: "Three Generation Modes",
    description:
      "Choose how deep you want to go. Minimal uses grok-3-mini (fast, low cost, 3000 tokens). Balanced uses grok-3 (4000 tokens). Quality uses grok-3 with 6000 tokens for dense, richly-sourced graphs. All controllable per request.",
    tag: "Flexibility",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M4 6h16M7 12h10M10 18h4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Semantic + Keyword Search",
    description:
      "Before generating anything, CausalExplorer searches Neo4j by keyword and Qdrant by vector similarity (threshold ≥ 0.70). Only a true cache miss triggers Grok — making the system fast on familiar topics and generative only when needed.",
    tag: "Three-Phase Retrieval",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Causal Perspectives",
    description:
      "Every edge in the graph carries a perspective label: Mainstream, Geopolitical, Structural, Economic, or Revisionist. Combined with an is_contested flag, this lets you see not just what caused what — but who says so and how disputed it is.",
    tag: "Rich Metadata",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
  {
    title: "Redis Response Cache",
    description:
      "Responses are cached in Redis keyed by topic + mode + count. Cache hits skip Neo4j, Qdrant, and Grok entirely — returning the full graph in under 100ms. Different mode/count combos on the same topic produce distinct cache entries.",
    tag: "Performance",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "Clean Architecture API",
    description:
      "Built on .NET 8 with CQRS via MediatR, FluentValidation on all commands, EF Core + PostgreSQL for relational persistence, and a typed Python FastAPI sidecar for all AI calls. Domain entities have no data annotations — pure DDD.",
    tag: "Engineering",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M9 9l2 2-2 2M13 15h2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export default function Features() {
  return (
    <section id="features" className="bg-[#e8e8e8] py-6 px-6">
      <div className="mx-auto" style={{ maxWidth: 1100 }}>
        {/* Header card */}
        <div className="bg-white rounded-3xl p-10 mb-4 shadow-sm">
          <div className="inline-flex items-center gap-2 border border-gray-200 rounded-full px-3 py-1 mb-5">
            <span className="w-2 h-2 bg-black rounded-none inline-block" />
            <span className="text-[11px] font-semibold tracking-widest text-black uppercase">
              Features
            </span>
          </div>
          <div className="flex items-end justify-between">
            <h2
              className="text-[42px] font-black leading-none tracking-tight text-black"
              style={{ fontFamily: "'Arial Black', sans-serif" }}
            >
              Everything needed
              <br />
              to map causality.
            </h2>
            <p className="text-[13.5px] text-gray-400 max-w-[280px] text-right leading-relaxed">
              Six capabilities working together — from AI generation to
              persistent graph storage to millisecond cache hits.
            </p>
          </div>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-3 gap-4">
          {features.map((f) => (
            <div key={f.title} className="bg-white rounded-3xl p-7 shadow-sm flex flex-col">
              <div className="flex items-start justify-between mb-5">
                <span className="text-gray-400">{f.icon}</span>
                <span className="text-[10px] font-semibold tracking-widest text-gray-300 uppercase font-mono">
                  {f.tag}
                </span>
              </div>
              <h3 className="text-[17px] font-black tracking-tight text-black mb-3">
                {f.title}
              </h3>
              <p className="text-[13px] text-gray-400 leading-relaxed flex-1">
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
