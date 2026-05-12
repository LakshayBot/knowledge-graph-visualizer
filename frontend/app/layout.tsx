import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "CausalExplorer — Understand Why Events Happen",
  description:
    "AI-powered causal knowledge graph system. Ask a question, get a structured cause-and-effect graph built by Grok AI and stored in Neo4j. Understand why complex world events happen.",
  keywords: [
    "causal AI",
    "knowledge graph",
    "Grok AI",
    "Neo4j",
    "causal reasoning",
    "event graph",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
