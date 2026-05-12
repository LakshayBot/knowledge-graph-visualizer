// ─── How It Works ─────────────────────────────────────────────────────────────

const steps = [
  {
    number: "01",
    title: "Ask a Question",
    description:
      "Type any natural-language question — geopolitical, economic, scientific, or social. CausalExplorer strips it down to a causal topic and validates your preferred generation mode and event count.",
    detail: "e.g. \u201cWhy is the rupee falling against USD?\u201d",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    number: "02",
    title: "Three-Phase Retrieval",
    description:
      "First Neo4j is searched by keyword. If nothing relevant is found, Qdrant runs a semantic similarity search (score ≥ 0.70). Only if both return empty does Grok AI generate a brand-new causal graph.",
    detail: "Neo4j → Qdrant → Grok AI (auto-fallback)",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M4 6h16M4 12h10M4 18h7" strokeLinecap="round" />
        <circle cx="18" cy="17" r="3" />
        <path d="M20.5 19.5l1.5 1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    number: "03",
    title: "Grok Builds the Graph",
    description:
      "A structured prompt is sent to Grok AI (grok-3-mini or grok-3 depending on mode). It returns a validated JSON graph: event nodes with dates, domains, confidence scores, source URLs, and directed causal edges.",
    detail: "minimal · balanced · quality",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="5" cy="12" r="2.5" />
        <circle cx="19" cy="5" r="2.5" />
        <circle cx="19" cy="19" r="2.5" />
        <path d="M7.4 11.1L16.6 6M7.4 12.9L16.6 18" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    number: "04",
    title: "Persisted & Cached",
    description:
      "New nodes are bulk-written to Neo4j (MERGE — idempotent), embedded by Ollama and stored in Qdrant for future semantic hits. Redis caches the full response keyed by topic, mode, and count for sub-100ms repeats.",
    detail: "Neo4j + Qdrant + Redis — all in one pipeline",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <ellipse cx="12" cy="5" rx="9" ry="3" />
        <path d="M3 5v6c0 1.66 4 3 9 3s9-1.34 9-3V5" />
        <path d="M3 11v6c0 1.66 4 3 9 3s9-1.34 9-3v-6" />
      </svg>
    ),
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-[#e8e8e8] py-6 px-6">
      <div className="mx-auto" style={{ maxWidth: 1100 }}>
        {/* Section header */}
        <div className="bg-white rounded-3xl p-10 mb-4 shadow-sm">
          <div className="inline-flex items-center gap-2 border border-gray-200 rounded-full px-3 py-1 mb-5">
            <span className="w-2 h-2 bg-black rounded-none inline-block" />
            <span className="text-[11px] font-semibold tracking-widest text-black uppercase">
              How It Works
            </span>
          </div>
          <div className="flex items-end justify-between">
            <h2
              className="text-[42px] font-black leading-none tracking-tight text-black"
              style={{ fontFamily: "'Arial Black', sans-serif" }}
            >
              Four steps from
              <br />
              question to graph.
            </h2>
            <p className="text-[13.5px] text-gray-400 max-w-[280px] text-right leading-relaxed">
              Every query follows the same deterministic pipeline — fast when
              data exists, generative only when it doesn&apos;t.
            </p>
          </div>
        </div>

        {/* Steps grid */}
        <div className="grid grid-cols-2 gap-4">
          {steps.map((step) => (
            <div key={step.number} className="bg-white rounded-3xl p-8 shadow-sm">
              <div className="flex items-start justify-between mb-6">
                <span
                  className="text-[11px] font-semibold tracking-widest text-gray-300 uppercase"
                  style={{ fontFamily: "monospace" }}
                >
                  {step.number}
                </span>
                <span className="text-gray-400">{step.icon}</span>
              </div>
              <h3 className="text-[20px] font-black tracking-tight text-black mb-3">
                {step.title}
              </h3>
              <p className="text-[13.5px] text-gray-400 leading-relaxed mb-5">
                {step.description}
              </p>
              <div className="inline-flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-2">
                <span className="w-1.5 h-1.5 bg-black rounded-none flex-shrink-0" />
                <span className="text-[12px] font-medium text-gray-600 font-mono">
                  {step.detail}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
