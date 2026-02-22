"use client";

import { formatClout } from "@/lib/format";

interface MobileBottomBarProps {
  myRank: number;
  myBalance: number;
  playerCount: number;
  onTap: () => void;
}

export function MobileBottomBar({
  myRank,
  myBalance,
  playerCount,
  onTap,
}: MobileBottomBarProps) {
  return (
    <button
      onClick={onTap}
      className="fixed bottom-0 left-0 right-0 lg:hidden z-30 bg-zoo-surface border-t border-zoo-border px-4 py-3 flex items-center justify-between active:bg-zoo-surface-light transition-colors"
    >
      <div className="flex items-center gap-3">
        <span className="text-sm font-mono bg-neon-blue/10 border border-neon-blue/30 text-neon-blue px-2 py-0.5 rounded-full">
          #{myRank}
        </span>
        <span className="text-sm font-mono font-bold text-neon-gold">
          {formatClout(myBalance)}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-text-muted">
          {playerCount} player{playerCount !== 1 ? "s" : ""}
        </span>
        <svg
          className="w-4 h-4 text-text-muted"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      </div>
    </button>
  );
}
