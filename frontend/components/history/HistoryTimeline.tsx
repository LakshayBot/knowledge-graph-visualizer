"use client";

import type { SavedChain } from "@/types/graph";
import HistoryCard from "./HistoryCard";

interface Props {
  chains: SavedChain[];
  onOpen: (chainId: string) => void;
  onDelete: (chainId: string) => Promise<void>;
}

function getGroup(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return "Last 7 Days";
  if (diffDays < 30) return "This Month";
  return "Earlier";
}

export default function HistoryTimeline({ chains, onOpen, onDelete }: Props) {
  const groups = new Map<string, SavedChain[]>();
  chains.forEach((c) => {
    const g = getGroup(c.savedAt);
    const arr = groups.get(g) ?? [];
    arr.push(c);
    groups.set(g, arr);
  });

  const order = ["Today", "Yesterday", "Last 7 Days", "This Month", "Earlier"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      {order.map((groupName) => {
        const items = groups.get(groupName);
        if (!items || items.length === 0) return null;
        return (
          <div key={groupName}>
            <span
              className="eyebrow"
              style={{ display: "block", marginBottom: 12 }}
            >
              {groupName}
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {items.map((chain) => (
                <HistoryCard
                  key={chain.chainId}
                  chain={chain}
                  onOpen={onOpen}
                  onDelete={onDelete}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
