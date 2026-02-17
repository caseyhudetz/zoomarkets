"use client";

import { useState } from "react";
import { formatClout } from "@/lib/format";

interface RoomHeaderProps {
  code: string;
  playerCount: number;
  myBalance: number;
  isHost: boolean;
  muted: boolean;
  onLeave: () => void;
  onToggleMute: () => void;
}

export function RoomHeader({
  code,
  playerCount,
  myBalance,
  isHost,
  muted,
  onLeave,
  onToggleMute,
}: RoomHeaderProps) {
  const [copied, setCopied] = useState(false);

  function copyCode() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <header className="flex items-center justify-between p-3 sm:p-4 bg-zoo-surface border-b border-zoo-border">
      <div className="flex items-center gap-2 sm:gap-4">
        <h1 className="text-lg sm:text-xl font-bold">
          <span className="text-neon-green">Zoo</span>
          <span className="text-neon-blue">Markets</span>
        </h1>
        <button
          onClick={copyCode}
          className="flex items-center gap-1.5 px-2 sm:px-3 py-1 rounded-lg bg-zoo-bg border border-zoo-border hover:border-neon-blue/50 transition-colors"
        >
          <span className="font-mono text-xs sm:text-sm tracking-widest text-neon-blue">
            {code}
          </span>
          <span className="text-[10px] sm:text-xs text-text-muted">
            {copied ? "Copied!" : "Copy"}
          </span>
        </button>
        <span className="hidden sm:inline text-sm text-text-muted">
          {playerCount} player{playerCount !== 1 ? "s" : ""}
        </span>
        {isHost && (
          <span className="hidden sm:inline text-xs px-2 py-0.5 rounded-full bg-neon-yellow/20 text-neon-yellow border border-neon-yellow/30">
            Host
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <button
          onClick={onToggleMute}
          className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-zoo-bg transition-colors text-sm"
          title={muted ? "Unmute sounds" : "Mute sounds"}
        >
          {muted ? "\u{1F507}" : "\u{1F50A}"}
        </button>
        <div className="text-right">
          <div className="text-[10px] sm:text-xs text-text-muted">Clout</div>
          <div className="font-mono text-base sm:text-lg font-bold text-neon-gold">
            {formatClout(myBalance)}
          </div>
        </div>
        <button
          onClick={onLeave}
          className="px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm text-text-muted hover:text-neon-red hover:bg-neon-red/10 border border-transparent hover:border-neon-red/30 transition-colors"
        >
          Leave
        </button>
      </div>
    </header>
  );
}
