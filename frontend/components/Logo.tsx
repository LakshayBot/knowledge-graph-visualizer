/**
 * Graph Sight — brand logo.
 *
 * The mark is a causal knowledge-graph motif: a hub node connected to four
 * satellite nodes — "understand why things happen".
 *
 * Usage:
 *   <LogoMark size={20} />          bare SVG mark (uses currentColor)
 *   <LogoBadge size={28} />         brand-colored circular badge with the mark
 *   <Logo />                        badge + "Graph Sight" wordmark
 */

interface LogoMarkProps {
  size?: number;
  className?: string;
}

export function LogoMark({ size = 24, className }: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* edges from hub to satellites */}
      <path d="M12 12 6 6" />
      <path d="M12 12 18 6" />
      <path d="M12 12 18 18" />
      <path d="M12 12 6 18" />
      {/* satellite nodes */}
      <circle cx="6" cy="6" r="2.1" fill="currentColor" stroke="none" />
      <circle cx="18" cy="6" r="2.1" fill="currentColor" stroke="none" />
      <circle cx="18" cy="18" r="2.1" fill="currentColor" stroke="none" />
      <circle cx="6" cy="18" r="2.1" fill="currentColor" stroke="none" />
      {/* hub node */}
      <circle cx="12" cy="12" r="2.7" />
    </svg>
  );
}

interface LogoBadgeProps {
  size?: number;
}

export function LogoBadge({ size = 28 }: LogoBadgeProps) {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "linear-gradient(135deg, var(--brand), var(--brand-hover))",
        color: "var(--brand-fg)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
      }}
    >
      <LogoMark size={Math.round(size * 0.62)} />
    </span>
  );
}

interface LogoProps {
  size?: number;
  textSize?: number;
  showText?: boolean;
}

export default function Logo({ size = 28, textSize = 16, showText = true }: LogoProps) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <LogoBadge size={size} />
      {showText && (
        <span
          style={{
            fontSize: textSize,
            fontWeight: 900,
            letterSpacing: "-0.03em",
            color: "var(--text-1)",
            lineHeight: 1,
            whiteSpace: "nowrap",
          }}
        >
          Graph Sight
        </span>
      )}
    </span>
  );
}
