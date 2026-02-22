"use client";

import { useState } from "react";
import { formatClout } from "@/lib/format";

interface RoomHeaderProps {
  code: string;
  roomName?: string;
  playerCount: number;
  myBalance: number;
  isHost: boolean;
  muted: boolean;
  onLeave: () => void;
  onToggleMute: () => void;
}

export function RoomHeader({
  code,
  roomName,
  playerCount,
  myBalance,
  muted,
  onLeave,
  onToggleMute,
}: RoomHeaderProps) {
  const [copied, setCopied] = useState(false);

  function copyLink() {
    const url = `${window.location.origin}/room/${code}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <header className="flex items-center justify-between p-3 sm:p-4 bg-zoo-surface border-b border-zoo-border">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <h1 className="text-lg sm:text-xl font-bold shrink-0">
          <span className="text-neon-green">Zoo</span>
          <span className="text-neon-blue">Markets</span>
        </h1>
        <div className="min-w-0">
          {roomName && (
            <div className="text-sm font-semibold text-text-primary truncate leading-tight">
              {roomName}
            </div>
          )}
          <button
            onClick={copyLink}
            className="flex items-center gap-1 text-xs text-text-muted hover:text-neon-blue transition-colors"
          >
            <span className="font-mono tracking-widest">{code}</span>
            <span className="hidden sm:inline">{copied ? "Copied!" : "Share link"}</span>
            {!copied && (
              <svg className="w-3 h-3 sm:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            )}
            {copied && <span className="sm:hidden text-neon-blue">Copied!</span>}
          </button>
        </div>
        <span className="hidden sm:inline text-xs text-text-muted shrink-0">
          {playerCount} player{playerCount !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <span className="font-mono text-sm sm:text-base font-bold text-neon-gold">
          {formatClout(myBalance)}
        </span>
        <button
          onClick={onToggleMute}
          className="p-1 rounded text-text-muted hover:text-text-primary text-sm transition-colors"
          title={muted ? "Unmute sounds" : "Mute sounds"}
        >
          {muted ? "\u{1F507}" : "\u{1F50A}"}
        </button>
        <button
          onClick={onLeave}
          className="px-2 py-1.5 rounded-lg text-xs text-text-muted hover:text-neon-red hover:bg-neon-red/10 border border-transparent hover:border-neon-red/30 transition-colors"
        >
          Leave
        </button>
      </div>
    </header>
  );
}
