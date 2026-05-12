"use client";

import { useEffect, useRef } from "react";

// ─── Particle Grid Canvas ───────────────────────────────────────────────────

function ParticleGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const COLS = 14;
    const ROWS = 11;
    const GRID_PADDING = 24;

    type Particle = {
      col: number;
      row: number;
      x: number;
      y: number;
      size: number;
      opacity: number;
      targetOpacity: number;
      speed: number;
    };

    let particles: Particle[] = [];
    let animId: number;
    let cellW = 0;
    let cellH = 0;

    // Rough shape mask (brain/cloud-like scatter) – 1 = particle present
    const mask: number[][] = [
      [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
      [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
      [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
      [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
      [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
      [0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
    ];

    function buildParticles() {
      particles = [];
      const W = canvas!.width;
      const H = canvas!.height;
      cellW = (W - GRID_PADDING * 2) / COLS;
      cellH = (H - GRID_PADDING * 2) / ROWS;

      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (!mask[r]?.[c]) continue;
          const cx = GRID_PADDING + c * cellW + cellW / 2;
          const cy = GRID_PADDING + r * cellH + cellH / 2;

          const count = Math.random() < 0.3 ? 2 : 1;
          for (let k = 0; k < count; k++) {
            const jx = (Math.random() - 0.5) * cellW * 0.7;
            const jy = (Math.random() - 0.5) * cellH * 0.7;
            const size = Math.random() * 5 + 2;
            const op = Math.random() * 0.7 + 0.15;
            particles.push({
              col: c,
              row: r,
              x: cx + jx,
              y: cy + jy,
              size,
              opacity: op,
              targetOpacity: op,
              speed: Math.random() * 0.008 + 0.003,
            });
          }
        }
      }
    }

    function drawGrid() {
      const W = canvas!.width;
      const H = canvas!.height;
      ctx!.strokeStyle = "rgba(0,0,0,0.07)";
      ctx!.lineWidth = 0.5;
      for (let c = 0; c <= COLS; c++) {
        const x = GRID_PADDING + c * cellW;
        ctx!.beginPath();
        ctx!.moveTo(x, GRID_PADDING);
        ctx!.lineTo(x, H - GRID_PADDING);
        ctx!.stroke();
      }
      for (let r = 0; r <= ROWS; r++) {
        const y = GRID_PADDING + r * cellH;
        ctx!.beginPath();
        ctx!.moveTo(GRID_PADDING, y);
        ctx!.lineTo(canvas!.width - GRID_PADDING, y);
        ctx!.stroke();
      }
    }

    function animate() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      drawGrid();

      for (const p of particles) {
        p.opacity += (p.targetOpacity - p.opacity) * 0.05;
        if (Math.abs(p.opacity - p.targetOpacity) < 0.01) {
          p.targetOpacity = Math.random() * 0.75 + 0.1;
        }
        ctx!.fillStyle = `rgba(0,0,0,${p.opacity})`;
        ctx!.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }

      animId = requestAnimationFrame(animate);
    }

    function resize() {
      canvas!.width = canvas!.offsetWidth * window.devicePixelRatio;
      canvas!.height = canvas!.offsetHeight * window.devicePixelRatio;
      ctx!.scale(window.devicePixelRatio, window.devicePixelRatio);
      buildParticles();
    }

    resize();
    animate();
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ display: "block" }}
    />
  );
}

// ─── Nav Item ────────────────────────────────────────────────────────────────

type NavItemProps = {
  icon: React.ReactNode;
  label: string;
  href: string;
  active?: boolean;
};

function NavItem({ icon, label, href, active }: NavItemProps) {
  return (
    <a
      href={href}
      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl w-full text-left transition-colors ${
        active
          ? "bg-gray-100 font-medium text-black"
          : "text-gray-500 hover:bg-gray-50 hover:text-black"
      }`}
    >
      {active && (
        <span className="w-1.5 h-1.5 rounded-none bg-black flex-shrink-0" />
      )}
      <span className="w-5 h-5 flex items-center justify-center text-gray-600">
        {icon}
      </span>
      <span className="text-[15px] tracking-tight">{label}</span>
    </a>
  );
}

// ─── Icons ───────────────────────────────────────────────────────────────────

const HomeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
    <path d="M9 21V12h6v9" />
  </svg>
);

const TechIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);

const UseCasesIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <circle cx="9" cy="7" r="4" />
    <path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" />
    <path d="M16 3.13a4 4 0 010 7.75" />
    <path d="M21 21v-2a4 4 0 00-3-3.87" />
  </svg>
);

const AboutIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
  </svg>
);

const LogoIcon = () => (
  <svg width="36" height="36" viewBox="0 0 36 36">
    {[...Array(12)].map((_, i) => {
      const angle = (i / 12) * Math.PI * 2;
      const len = i % 3 === 0 ? 14 : i % 2 === 0 ? 10 : 7;
      const x2 = 18 + Math.cos(angle) * len;
      const y2 = 18 + Math.sin(angle) * len;
      return (
        <line key={i} x1="18" y1="18" x2={x2} y2={y2}
          stroke="black" strokeWidth="1.5" strokeLinecap="round" />
      );
    })}
    <circle cx="18" cy="18" r="2" fill="black" />
  </svg>
);

const GraphIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <circle cx="5" cy="12" r="2" />
    <circle cx="19" cy="5" r="2" />
    <circle cx="19" cy="19" r="2" />
    <path d="M7 12h5m2-5.3L12 12m2 1.3L12 12" strokeLinecap="round" />
  </svg>
);

// ─── Main Hero ────────────────────────────────────────────────────────────────

export default function HeroSection() {
  return (
    <div id="overview" className="min-h-screen bg-[#e8e8e8] flex items-center justify-center p-6 font-sans">
      <div
        className="bg-white rounded-3xl overflow-hidden shadow-sm"
        style={{ width: "100%", maxWidth: 1100, minHeight: 560 }}
      >
        <div className="flex h-full" style={{ minHeight: 560 }}>

          {/* ── Left Sidebar ── */}
          <div className="flex flex-col justify-between py-8 px-5 flex-shrink-0" style={{ width: 200 }}>
            <div>
              <div className="mb-10 pl-1">
                <LogoIcon />
              </div>
              <nav className="flex flex-col gap-1">
                <NavItem icon={<HomeIcon />} label="Overview" href="#overview" active />
                <NavItem icon={<TechIcon />} label="Technology" href="#tech" />
                <NavItem icon={<UseCasesIcon />} label="Use Cases" href="#use-cases" />
                <NavItem icon={<AboutIcon />} label="About" href="#about" />
              </nav>
            </div>

            <div className="bg-gray-50 rounded-2xl p-4">
              <GraphIcon />
              <p className="text-[13px] font-semibold text-black mt-3 leading-snug">
                Turning Questions
                <br />
                Into Graphs
              </p>
              <p className="text-[12px] text-gray-400 mt-1.5 leading-snug">
                Causal chains.
                <br />
                Not just answers.
              </p>
            </div>
          </div>

          {/* ── Center Canvas ── */}
          <div className="flex-1 border-x border-gray-100 relative">
            <ParticleGrid />
          </div>

          {/* ── Right Panel ── */}
          <div
            className="flex flex-col justify-between py-10 px-8 flex-shrink-0"
            style={{ width: 280 }}
          >
            <div>
              {/* Badge */}
              <div className="inline-flex items-center gap-2 border border-gray-200 rounded-full px-3 py-1 mb-6">
                <span className="w-2 h-2 bg-black rounded-none inline-block" />
                <span className="text-[11px] font-semibold tracking-widest text-black uppercase">
                  Causal AI
                </span>
              </div>

              <h1
                className="text-[52px] font-black leading-none tracking-tight text-black"
                style={{ fontFamily: "'Arial Black', sans-serif" }}
              >
                Why.
                <br />
                Not What.
              </h1>

              <p className="text-[13.5px] text-gray-400 mt-5 leading-relaxed">
                Ask any question. Get a structured cause-and-effect graph built
                by Grok AI — stored in Neo4j, searched by meaning, explained
                with confidence.
              </p>

              {/* CTA */}
              <a
                href="#how-it-works"
                className="mt-7 inline-flex items-center gap-3 bg-black text-white text-[14px] font-medium pl-6 pr-2 py-2 rounded-full hover:bg-gray-900 transition-colors"
              >
                See How
                <span className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center flex-shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </a>
            </div>

            {/* Stats */}
            <div className="bg-gray-50 rounded-2xl px-6 py-5 flex gap-6">
              <div>
                <p className="text-[28px] font-black text-black tracking-tight leading-none">
                  36/36
                </p>
                <p className="text-[11.5px] text-gray-400 mt-2 leading-snug">
                  Tests
                  <br />
                  Passing
                </p>
              </div>
              <div className="w-px bg-gray-200 self-stretch" />
              <div>
                <p className="text-[28px] font-black text-black tracking-tight leading-none">
                  &lt;100ms
                </p>
                <p className="text-[11.5px] text-gray-400 mt-2 leading-snug">
                  Cache
                  <br />
                  Response
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
