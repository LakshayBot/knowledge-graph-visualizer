"use client";

import { type ReactNode } from "react";

interface Props {
  children: ReactNode;
  style?: React.CSSProperties;
}

export default function Card({ children, style }: Props) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        padding: "24px 24px 28px",
        transition: "border-color 0.2s ease, box-shadow 0.2s ease",
        ...style,
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.borderColor = "var(--border-med)";
        el.style.boxShadow = "0 4px 24px rgba(0, 0, 0, 0.06)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.borderColor = "var(--border)";
        el.style.boxShadow = "none";
      }}
    >
      {children}
    </div>
  );
}
