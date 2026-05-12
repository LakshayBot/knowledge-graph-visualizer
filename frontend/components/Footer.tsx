// ─── Footer ───────────────────────────────────────────────────────────────────

const LogoIcon = () => (
  <svg width="28" height="28" viewBox="0 0 36 36">
    {[...Array(12)].map((_, i) => {
      const angle = (i / 12) * Math.PI * 2;
      const len = i % 3 === 0 ? 14 : i % 2 === 0 ? 10 : 7;
      const x2 = 18 + Math.cos(angle) * len;
      const y2 = 18 + Math.sin(angle) * len;
      return (
        <line key={i} x1="18" y1="18" x2={x2} y2={y2}
          stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      );
    })}
    <circle cx="18" cy="18" r="2" fill="currentColor" />
  </svg>
);

const navLinks = [
  { label: "Overview", href: "#overview" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Features", href: "#features" },
  { label: "Tech Stack", href: "#tech" },
  { label: "Use Cases", href: "#use-cases" },
  { label: "API Preview", href: "#demo" },
  { label: "About", href: "#about" },
];

export default function Footer() {
  return (
    <footer className="bg-[#e8e8e8] px-6 pb-8 pt-4">
      <div className="mx-auto" style={{ maxWidth: 1100 }}>
        <div className="bg-white rounded-3xl px-10 py-8 shadow-sm">
          <div className="flex items-start justify-between mb-8">
            {/* Brand */}
            <div className="flex items-center gap-3">
              <LogoIcon />
              <div>
                <p className="text-[15px] font-black tracking-tight text-black">
                  CausalExplorer
                </p>
                <p className="text-[12px] text-gray-400">
                  Understand why events happen.
                </p>
              </div>
            </div>

            {/* GitHub */}
            <a
              href="https://github.com/LakshayBot/knowledge-graph-visualizer"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 border border-gray-200 rounded-full px-4 py-2 text-[13px] font-medium text-gray-600 hover:text-black hover:border-gray-400 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844a9.59 9.59 0 012.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              LakshayBot / knowledge-graph-visualizer
            </a>
          </div>

          {/* Nav links */}
          <div className="flex flex-wrap gap-x-6 gap-y-2 mb-8">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-[13px] text-gray-400 hover:text-black transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Divider */}
          <div className="border-t border-gray-100 pt-6 flex items-center justify-between">
            <p className="text-[12px] text-gray-400">
              © {new Date().getFullYear()} CausalExplorer. Open source.
            </p>
            <p className="text-[12px] text-gray-400">
              Built with{" "}
              <span className="text-black font-medium">Grok (xAI)</span>
              {" · "}
              <span className="text-black font-medium">Neo4j</span>
              {" · "}
              <span className="text-black font-medium">.NET 8</span>
              {" · "}
              <span className="text-black font-medium">Next.js 14</span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
