"use client";

import { useState, type ReactNode } from "react";

interface Props {
  children?: ReactNode;
  className?: string;
}

export default function GraphBackground({ children, className }: Props) {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <div
      className={className}
      style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Base dot grid pattern */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          backgroundImage: "radial-gradient(circle, rgba(0,0,0,0.08) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* Greenish hover glow — follows the cursor */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          pointerEvents: "none",
          opacity: isHovering && (mousePos.x !== 0 || mousePos.y !== 0) ? 1 : 0,
          transition: "opacity 0.4s ease",
          background: `radial-gradient(circle 500px at ${mousePos.x}px ${mousePos.y}px,
            rgba(74, 222, 128, 0.15) 0%,
            rgba(34, 197, 94, 0.08) 30%,
            rgba(22, 163, 74, 0.03) 60%,
            transparent 100%)`,
        }}
      />

      {/* Subtle ambient green corner tints */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          mixBlendMode: "soft-light",
          pointerEvents: "none",
          backgroundImage: `
            radial-gradient(ellipse 600px at 20% 30%, rgba(74, 222, 128, 0.07) 0%, transparent 60%),
            radial-gradient(ellipse 500px at 80% 70%, rgba(34, 197, 94, 0.05) 0%, transparent 60%)
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
