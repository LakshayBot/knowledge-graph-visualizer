"use client";

import type { ModelHeatmap } from "./metrics-data";

interface Props {
  data: ModelHeatmap[];
}

/* ── Heat levels ─────────────────────────────────── */
function heatLevel(score: number): number {
  if (score <= 0) return 0;
  if (score <= 15) return 1;
  if (score <= 40) return 2;
  if (score <= 70) return 3;
  return 4;
}

const BG: Record<number, string> = {
  0: "var(--dash-surface-high)",
  1: "var(--dash-primary-fixed)",
  2: "var(--dash-primary)",
  3: "var(--dash-primary)",
  4: "var(--dash-primary)",
};

const OP: Record<number, number> = { 0: 1, 1: 0.25, 2: 0.5, 3: 0.75, 4: 1 };

const BR: Record<number, string> = {
  0: "1px solid var(--dash-border-light)",
  1: "1px solid transparent",
  2: "1px solid transparent",
  3: "1px solid transparent",
  4: "1px solid transparent",
};

const WEEKDAYS = ["", "Mon", "", "Wed", "", "Fri", ""];

/* ── Build column-major cell matrix ──────────────── */
type Cell = { date: Date; label: string; score: number } | null;

function buildGrid(scores: { day: string; score: number }[]) {
  const DAYS = 182;
  const now = new Date();

  // Lookup: YYYY-MM-DD → score (covers last 30 days of real data)
  const scoreMap = new Map<string, number>();
  for (let i = 0; i < 30; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const key = d.toISOString().slice(0, 10);
    const label = String(d.getDate()).padStart(2, "0");
    const match = scores.find((s) => s.day === label);
    if (match) scoreMap.set(key, match.score);
  }

  const days: Cell[] = [];
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const key = d.toISOString().slice(0, 10);
    days.push({ date: d, label: String(d.getDate()).padStart(2, "0"), score: scoreMap.get(key) ?? 0 });
  }

  const startDow = days[0]!.date.getDay();
  const padStart = startDow;
  const total = padStart + DAYS;
  const weeks = Math.ceil(total / 7);
  const padEnd = weeks * 7 - total;

  const cells: Cell[] = [];
  for (let i = 0; i < padStart; i++) cells.push(null);
  for (const d of days) cells.push(d);
  for (let i = 0; i < padEnd; i++) cells.push(null);

  // Month labels
  const months: { col: number; label: string }[] = [];
  let last = "";
  for (let col = 0; col < weeks; col++) {
    let m = "";
    for (let row = 0; row < 7; row++) {
      const c = cells[col * 7 + row];
      if (c) { m = c.date.toLocaleString("en-US", { month: "short" }); break; }
    }
    if (m && m !== last) { months.push({ col, label: m }); last = m; }
  }

  return { cells, weeks, months };
}

/* ── Component ───────────────────────────────────── */
export default function ModelPerformanceCard({ data }: Props) {
  if (data.length === 0) {
    return (
      <div style={{ background: "var(--dash-surface)", borderRadius: "0.75rem", border: "1px solid var(--dash-card-border)", boxShadow: "var(--dash-card-shadow)", padding: 24, height: "100%", transition: "background 0.3s ease" }}>
        <h3 style={{ fontFamily: "Manrope, sans-serif", fontSize: 18, fontWeight: 600, color: "var(--dash-text)", margin: 0 }}>Model Activity</h3>
        <p style={{ fontSize: 13, color: "var(--dash-text-secondary)", textAlign: "center", padding: "60px 0" }}>No model data recorded yet.</p>
      </div>
    );
  }

  return (
    <div
      style={{
        background: "var(--dash-surface)",
        borderRadius: "0.75rem",
        border: "1px solid var(--dash-card-border)",
        boxShadow: "var(--dash-card-shadow)",
        padding: 24,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        transition: "box-shadow 0.3s ease, border-color 0.3s ease, background 0.3s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "var(--dash-card-shadow-hover)";
        e.currentTarget.style.borderColor = "var(--dash-card-border-hover)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "var(--dash-card-shadow)";
        e.currentTarget.style.borderColor = "var(--dash-card-border)";
      }}
    >
      <h3 style={{ fontFamily: "Manrope, sans-serif", fontSize: 18, fontWeight: 600, color: "var(--dash-text)", margin: "0 0 2px" }}>Model Activity</h3>
      <p style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 14, color: "var(--dash-text-secondary)", margin: "0 0 20px" }}>Daily token volume per model</p>

      {/* Heatmap — fills card width */}
      <div style={{ flex: 1, minHeight: 0 }}>
        {data.map((model) => {
          const { cells, weeks, months } = buildGrid(model.dailyScores);

          return (
            <div key={model.model} style={{ marginBottom: data.length > 1 ? 24 : 0, width: "100%" }}>
              {/* Model name */}
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--dash-text-secondary)", fontFamily: "'JetBrains Mono', monospace", marginBottom: 8 }}>
                {model.model}
              </div>

              {/* Grid row: weekday labels + cells */}
              <div style={{ display: "flex", gap: 6, width: "100%" }}>
                {/* Weekday labels */}
                <div style={{ display: "grid", gridTemplateRows: "repeat(7, 1fr)", gap: 3, flexShrink: 0 }}>
                  {WEEKDAYS.map((l, i) => (
                    <div key={i} style={{ width: 28, display: "flex", alignItems: "center", justifyContent: "flex-end", fontSize: 10, fontWeight: 500, color: "var(--dash-text-secondary)", fontFamily: "'JetBrains Mono', monospace" }}>
                      {l}
                    </div>
                  ))}
                </div>

                {/* Responsive cell grid — 1fr columns fill available width */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    display: "grid",
                    gridAutoFlow: "column",
                    gridTemplateRows: "repeat(7, 1fr)",
                    gridTemplateColumns: `repeat(${weeks}, minmax(10px, 1fr))`,
                    gap: 3,
                    width: "100%",
                  }}>
                    {cells.map((cell, idx) => {
                      if (!cell) return <div key={`e-${idx}`} style={{ aspectRatio: "1 / 1", borderRadius: 3, background: "transparent" }} />;
                      const lv = heatLevel(cell.score);
                      return (
                        <div
                          key={`${cell.label}-${idx}`}
                          title={`${cell.date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}${cell.score > 0 ? ` · ${cell.score}% activity` : " · No activity"}`}
                          style={{
                            aspectRatio: "1 / 1",
                            borderRadius: 3,
                            background: BG[lv],
                            opacity: OP[lv],
                            border: BR[lv],
                            cursor: cell.score > 0 ? "pointer" : "default",
                            transition: "transform 0.12s ease, opacity 0.12s ease",
                            position: "relative",
                            minWidth: 0,
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "scale(1.3)"; e.currentTarget.style.zIndex = "1"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.opacity = String(OP[lv]); e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.zIndex = ""; }}
                        />
                      );
                    })}
                  </div>

                  {/* Month labels — same column grid */}
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: `repeat(${weeks}, minmax(10px, 1fr))`,
                    gap: 3,
                    marginTop: 6,
                    width: "100%",
                  }}>
                    {Array.from({ length: weeks }).map((_, col) => {
                      const m = months.find((x) => x.col === col);
                      return <div key={col} style={{ fontSize: 10, fontWeight: 500, color: "var(--dash-text-secondary)", fontFamily: "'JetBrains Mono', monospace", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m?.label ?? ""}</div>;
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 4, paddingTop: 16, marginTop: "auto", borderTop: "1px solid var(--dash-border-light)", fontSize: 10 }}>
        <span style={{ color: "var(--dash-text-secondary)", fontFamily: "'Hanken Grotesk', sans-serif", marginRight: 6 }}>Less</span>
        {[0, 1, 2, 3, 4].map((lv) => (
          <span key={lv} style={{ width: 13, height: 13, borderRadius: 3, background: BG[lv], opacity: OP[lv], border: BR[lv], display: "inline-block" }} />
        ))}
        <span style={{ color: "var(--dash-text-secondary)", fontFamily: "'Hanken Grotesk', sans-serif", marginLeft: 6 }}>More</span>
      </div>
    </div>
  );
}
