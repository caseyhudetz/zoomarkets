"use client";

import { useState } from "react";

interface RoomHeaderProps {
  code: string;
  playerCount: number;
  myBalance: number;
  isHost: boolean;
  onLeave: () => void;
}

export function RoomHeader({
  code,
  playerCount,
  myBalance,
  isHost,
  onLeave,
}: RoomHeaderProps) {
  const [copied, setCopied] = useState(false);

  function copyCode() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <header className="flex items-center justify-between p-4 bg-zoo-surface border-b border-zoo-border">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold">
          <span className="text-neon-green">Zoo</span>
          <span className="text-neon-blue">Markets</span>
        </h1>
        <button
          onClick={copyCode}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zoo-bg border border-zoo-border hover:border-neon-blue/50 transition-colors"
        >
          <span className="font-mono text-sm tracking-widest text-neon-blue">
            {code}
          </span>
          <span className="text-xs text-text-muted">
            {copied ? "Copied!" : "Copy"}
          </span>
        </button>
        <span className="text-sm text-text-muted">
          {playerCount} player{playerCount !== 1 ? "s" : ""}
        </span>
        {isHost && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-neon-yellow/20 text-neon-yellow border border-neon-yellow/30">
            Host
          </span>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <div className="text-xs text-text-muted">Balance</div>
          <div className="font-mono text-lg font-bold text-neon-green">
            ${Math.round(myBalance).toLocaleString()}
          </div>
        </div>
        <button
          onClick={onLeave}
          className="px-3 py-1.5 rounded-lg text-sm text-text-muted hover:text-neon-red hover:bg-neon-red/10 border border-transparent hover:border-neon-red/30 transition-colors"
        >
          Leave
        </button>
      </div>
    </header>
  );
}
