// ─── Use Cases ────────────────────────────────────────────────────────────────

const useCases = [
  {
    domain: "Finance",
    title: "Why is the rupee falling against USD?",
    query: "why is rupee falling this much against the usd",
    mode: "minimal",
    count: 8,
    description:
      "CausalExplorer maps the macro chain: Fed rate hikes → USD strengthening → capital flight from emerging markets → INR depreciation → RBI intervention. Each node carries a confidence score and source URL so you can verify the claim.",
    outcome: "8 causal nodes · 8 directed edges · sources from Reuters, Wikipedia",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    domain: "Geopolitics",
    title: "What caused the US-China trade war?",
    query: "us china trade war causes",
    mode: "balanced",
    count: 10,
    description:
      "From WTO accession and manufacturing displacement to Section 301 tariffs and Huawei sanctions — the graph traces a decade of decisions, their contested interpretations (Mainstream vs. Geopolitical perspectives), and the downstream effects on global supply chains.",
    outcome: "10 causal nodes · cross-domain (Economics + Geopolitics) · contested edges flagged",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" />
      </svg>
    ),
  },
  {
    domain: "Technology",
    title: "What caused the AI investment boom?",
    query: "what caused the ai investment boom 2023",
    mode: "quality",
    count: 15,
    description:
      "From ImageNet and transformer architectures through GPT-3 and ChatGPT's viral moment to the flood of VC capital into foundation model startups — a quality-mode graph with 15 nodes reveals the full causal chain with richly-sourced, detailed summaries.",
    outcome: "15 causal nodes · Technology domain · deep sourcing with Wikipedia + news",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M9.5 2A2.5 2.5 0 017 4.5v0A2.5 2.5 0 019.5 7h5A2.5 2.5 0 0117 4.5v0A2.5 2.5 0 0114.5 2h-5z" />
        <path d="M7 10H4a2 2 0 00-2 2v8a2 2 0 002 2h16a2 2 0 002-2v-8a2 2 0 00-2-2h-3" />
        <path d="M12 12v6M9 15l3-3 3 3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    domain: "Research",
    title: "What triggered the 2008 financial crisis?",
    query: "causes of the 2008 financial crisis",
    mode: "quality",
    count: 15,
    description:
      "For researchers and journalists, CausalExplorer delivers structured, citable event timelines. The 2008 crisis graph links subprime mortgage expansion → CDO proliferation → rating agency failures → Lehman collapse → global credit freeze, each node with a source URL and confidence score.",
    outcome: "15 causal nodes · confidence scores 0.4–0.95 · per-event source URLs",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
        <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
      </svg>
    ),
  },
];

const modeColors: Record<string, string> = {
  minimal: "bg-gray-50 text-gray-500",
  balanced: "bg-gray-100 text-gray-700",
  quality: "bg-black text-white",
};

export default function UseCases() {
  return (
    <section id="use-cases" className="bg-[#e8e8e8] py-6 px-6">
      <div className="mx-auto" style={{ maxWidth: 1100 }}>
        {/* Header */}
        <div className="bg-white rounded-3xl p-10 mb-4 shadow-sm">
          <div className="inline-flex items-center gap-2 border border-gray-200 rounded-full px-3 py-1 mb-5">
            <span className="w-2 h-2 bg-black rounded-none inline-block" />
            <span className="text-[11px] font-semibold tracking-widest text-black uppercase">
              Use Cases
            </span>
          </div>
          <div className="flex items-end justify-between">
            <h2
              className="text-[42px] font-black leading-none tracking-tight text-black"
              style={{ fontFamily: "'Arial Black', sans-serif" }}
            >
              Any domain.
              <br />
              Any question.
            </h2>
            <p className="text-[13.5px] text-gray-400 max-w-[280px] text-right leading-relaxed">
              From macro-economics to geopolitics to tech history — if there is
              a causal chain, CausalExplorer will find or build it.
            </p>
          </div>
        </div>

        {/* Use case cards */}
        <div className="grid grid-cols-2 gap-4">
          {useCases.map((uc) => (
            <div key={uc.title} className="bg-white rounded-3xl p-8 shadow-sm flex flex-col gap-5">
              {/* Top row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-gray-400">{uc.icon}</span>
                  <span className="text-[12px] font-semibold text-gray-500 tracking-wide">
                    {uc.domain}
                  </span>
                </div>
                <span
                  className={`text-[10px] font-semibold tracking-widest uppercase font-mono px-2.5 py-1 rounded-full ${modeColors[uc.mode]}`}
                >
                  {uc.mode}
                </span>
              </div>

              {/* Query pill */}
              <div className="bg-gray-50 rounded-xl px-4 py-2.5 font-mono text-[12px] text-gray-600">
                <span className="text-gray-300 select-none">? </span>
                {uc.query}
              </div>

              {/* Title + description */}
              <div>
                <h3 className="text-[18px] font-black tracking-tight text-black mb-2">
                  {uc.title}
                </h3>
                <p className="text-[13px] text-gray-400 leading-relaxed">
                  {uc.description}
                </p>
              </div>

              {/* Outcome */}
              <div className="flex items-center gap-2 mt-auto">
                <span className="w-1.5 h-1.5 bg-black rounded-none flex-shrink-0" />
                <span className="text-[12px] text-gray-500 font-medium">
                  {uc.outcome}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
