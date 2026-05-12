// ─── Tech Stack ───────────────────────────────────────────────────────────────

const layers = [
  {
    label: "API Layer",
    items: [".NET 8", "MediatR / CQRS", "FluentValidation", "JWT Auth"],
  },
  {
    label: "AI Sidecar",
    items: ["FastAPI (Python)", "Grok (xAI)", "Ollama Embeddings"],
  },
  {
    label: "Data Layer",
    items: ["Neo4j", "PostgreSQL + EF Core", "Qdrant", "Redis"],
  },
];

const technologies = [
  {
    name: "Grok (xAI)",
    role: "Graph generation",
    description:
      "grok-3-mini and grok-3 power all causal graph construction. A single structured prompt returns JSON with events, edges, confidence scores, and source URLs.",
    badge: "AI",
  },
  {
    name: "Neo4j",
    role: "Graph database",
    description:
      "Stores EventNodes and CausalEdges as a native property graph. MERGE-based bulk writes ensure idempotency. Keyword search runs Cypher ANY CONTAINS queries.",
    badge: "DB",
  },
  {
    name: "Qdrant",
    role: "Vector search",
    description:
      "768-dimensional embeddings from Ollama are stored here. Semantic search runs before Grok generation — a score ≥ 0.70 is enough to skip the AI call entirely.",
    badge: "Search",
  },
  {
    name: "Ollama",
    role: "Local embeddings",
    description:
      "Runs nomic-embed-text locally inside Docker. Used exclusively for generating vectors — all generative AI is handled by Grok so Ollama never leaves the local network.",
    badge: "Embed",
  },
  {
    name: "Redis",
    role: "Response cache",
    description:
      "Full search responses cached by topic|mode|count. Hits return in under 100ms and bypass Neo4j, Qdrant, and Grok entirely. Each mode+count combo is a distinct entry.",
    badge: "Cache",
  },
  {
    name: ".NET 8 + EF Core",
    role: "Clean Architecture API",
    description:
      "Domain layer with private setters and factory methods. Application layer uses MediatR CQRS with typed IOptions — IConfiguration is banned from Application. 36 passing tests.",
    badge: "API",
  },
];

export default function TechStack() {
  return (
    <section id="tech" className="bg-[#e8e8e8] py-6 px-6">
      <div className="mx-auto" style={{ maxWidth: 1100 }}>
        {/* Two-column layout */}
        <div className="grid grid-cols-5 gap-4">

          {/* Left — stack diagram */}
          <div className="col-span-2 bg-white rounded-3xl p-8 shadow-sm flex flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-2 border border-gray-200 rounded-full px-3 py-1 mb-6">
                <span className="w-2 h-2 bg-black rounded-none inline-block" />
                <span className="text-[11px] font-semibold tracking-widest text-black uppercase">
                  Tech Stack
                </span>
              </div>
              <h2
                className="text-[36px] font-black leading-none tracking-tight text-black mb-4"
                style={{ fontFamily: "'Arial Black', sans-serif" }}
              >
                Eight services.
                <br />
                One pipeline.
              </h2>
              <p className="text-[13px] text-gray-400 leading-relaxed">
                Every component runs in Docker. The .NET API, Python FastAPI sidecar, Neo4j, Qdrant, Ollama, Redis, and PostgreSQL are all orchestrated via a single{" "}
                <span className="font-mono text-[12px] bg-gray-50 px-1.5 py-0.5 rounded">
                  docker compose up
                </span>
                .
              </p>
            </div>

            {/* Layer diagram */}
            <div className="flex flex-col gap-2 mt-8">
              {layers.map((layer, i) => (
                <div key={layer.label} className="rounded-xl bg-gray-50 px-5 py-4">
                  <p className="text-[10px] font-semibold tracking-widest text-gray-300 uppercase font-mono mb-2">
                    Layer {i + 1}
                  </p>
                  <p className="text-[13px] font-semibold text-black mb-1.5">
                    {layer.label}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {layer.items.map((item) => (
                      <span
                        key={item}
                        className="text-[11px] font-medium text-gray-500 bg-white border border-gray-200 rounded-full px-2.5 py-0.5"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — tech list */}
          <div className="col-span-3 flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4 flex-1">
              {technologies.map((tech) => (
                <div key={tech.name} className="bg-white rounded-3xl p-6 shadow-sm flex flex-col">
                  <div className="flex items-start justify-between mb-4">
                    <span className="text-[10px] font-semibold tracking-widest text-gray-300 uppercase font-mono">
                      {tech.badge}
                    </span>
                    <span className="w-1.5 h-1.5 bg-black rounded-none flex-shrink-0 mt-1" />
                  </div>
                  <h3 className="text-[16px] font-black tracking-tight text-black">
                    {tech.name}
                  </h3>
                  <p className="text-[12px] text-gray-400 font-medium mb-2">
                    {tech.role}
                  </p>
                  <p className="text-[12.5px] text-gray-400 leading-relaxed flex-1">
                    {tech.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
