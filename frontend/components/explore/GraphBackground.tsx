"use client";

import { type ReactNode } from "react";

interface Props {
  children?: ReactNode;
  className?: string;
}

export default function GraphBackground({ children, className }: Props) {
  return (
    <div
      className={className}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        background: "var(--bg)",
      }}
    >
      {/* Lumina dot-pattern grid */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          backgroundImage:
            "radial-gradient(rgba(140, 113, 102, 0.18) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          opacity: 0.6,
        }}
      />

      {/* Warm ambient cream gradients */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          background: `
            radial-gradient(ellipse 600px at 20% 30%, rgba(159, 61, 0, 0.04) 0%, transparent 60%),
            radial-gradient(ellipse 500px at 80% 70%, rgba(0, 105, 74, 0.03) 0%, transparent 60%),
            radial-gradient(ellipse 700px at 50% 50%, rgba(255, 248, 246, 0.6) 0%, transparent 70%)
          `,
        }}
      />

      {/* Content */}
      <div style={{ position: "relative", zIndex: 2, width: "100%", height: "100%" }}>
        {children}
      </div>
    </div>
  );
}
