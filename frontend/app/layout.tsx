import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Graph Sight — Understand Why Events Happen",
  description:
    "AI-powered causal knowledge graph system. Ask a question, get a structured cause-and-effect graph built by Grok AI. Causal graphs. Not just answers.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className="font-sans">
      <head>
        {/* Lumina Analytics fonts: Manrope (headlines), Hanken Grotesk (body), JetBrains Mono (data) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700&family=Hanken+Grotesk:wght@400;600&family=JetBrains+Mono:wght@500&display=swap"
          rel="stylesheet"
        />
        {/* Anti-FOUC: apply dark class before first paint */}
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");if(t==="dark")document.documentElement.classList.add("dark")}catch(e){}})()`,
          }}
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
