// ─── About ────────────────────────────────────────────────────────────────────

const principles = [
  {
    title: "Why, not just what",
    description:
      "Most search returns facts. CausalExplorer returns causal chains — structured graphs that answer *why* an event happened, not just *that* it happened.",
  },
  {
    title: "Generation as last resort",
    description:
      "AI generation is expensive and slow. That is why three search phases run first — only a genuine cache miss triggers Grok. The system gets smarter with every query.",
  },
  {
    title: "Confidence over certainty",
    description:
      "Every node carries a confidence score (0.4–0.95) and every edge can be marked contested. CausalExplorer acknowledges what is disputed rather than flattening it.",
  },
];

export default function About() {
  return (
    <section id="about" className="bg-[#e8e8e8] py-6 px-6">
      <div className="mx-auto" style={{ maxWidth: 1100 }}>
        <div className="grid grid-cols-5 gap-4">

          {/* Left — main about card */}
          <div className="col-span-3 bg-white rounded-3xl p-10 shadow-sm flex flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-2 border border-gray-200 rounded-full px-3 py-1 mb-6">
                <span className="w-2 h-2 bg-black rounded-none inline-block" />
                <span className="text-[11px] font-semibold tracking-widest text-black uppercase">
                  About
                </span>
              </div>
              <h2
                className="text-[38px] font-black leading-tight tracking-tight text-black mb-6"
                style={{ fontFamily: "'Arial Black', sans-serif" }}
              >
                Built to understand
                <br />
                the world causally.
              </h2>
              <p className="text-[14px] text-gray-400 leading-relaxed mb-4">
                CausalExplorer is a production-grade API system that turns natural-language
                questions into structured causal knowledge graphs. It combines a{" "}
                <span className="text-black font-medium">.NET 8 Clean Architecture backend</span>,
                a{" "}
                <span className="text-black font-medium">Python FastAPI AI sidecar</span>, and
                five backing services — Neo4j, Qdrant, Ollama, Redis, and PostgreSQL — all
                orchestrated in Docker.
              </p>
              <p className="text-[14px] text-gray-400 leading-relaxed">
                The motivation is simple: most information systems tell you <em>what</em>{" "}
                happened. CausalExplorer tells you <em>why</em>. Every event node has a
                date, domain, confidence score, and source URL. Every edge has a
                relationship type, perspective, strength, and contested flag. The graph
                is honest about what it knows and what it doesn&apos;t.
              </p>
            </div>

            {/* CTA buttons */}
            <div className="flex items-center gap-3 mt-8">
              <a
                href="https://github.com/LakshayBot/knowledge-graph-visualizer"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 bg-black text-white text-[14px] font-medium pl-6 pr-2 py-2 rounded-full hover:bg-gray-900 transition-colors"
              >
                View on GitHub
                <span className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center flex-shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844a9.59 9.59 0 012.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                  </svg>
                </span>
              </a>
              <a
                href="#demo"
                className="text-[14px] font-medium text-gray-500 hover:text-black transition-colors px-4 py-2.5"
              >
                See the API →
              </a>
            </div>
          </div>

          {/* Right — principles */}
          <div className="col-span-2 flex flex-col gap-4">
            {principles.map((p) => (
              <div key={p.title} className="bg-white rounded-3xl p-7 shadow-sm flex-1 flex flex-col">
                <span className="w-1.5 h-1.5 bg-black rounded-none flex-shrink-0 mb-4" />
                <h3 className="text-[16px] font-black tracking-tight text-black mb-2">
                  {p.title}
                </h3>
                <p className="text-[13px] text-gray-400 leading-relaxed flex-1">
                  {p.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
