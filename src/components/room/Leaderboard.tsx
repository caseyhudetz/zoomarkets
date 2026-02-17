"use client";

import type { Player } from "@/types/shared";
import { formatClout } from "@/lib/format";

interface LeaderboardProps {
  players: Player[];
  myId: string | null;
}

const MEDALS = ["\u{1F947}", "\u{1F948}", "\u{1F949}"];

export function Leaderboard({ players, myId }: LeaderboardProps) {
  const sorted = [...players].sort((a, b) => b.balance - a.balance);

  return (
    <div className="bg-zoo-surface border border-zoo-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-zoo-border">
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
          Leaderboard
        </h3>
      </div>
      <div className="divide-y divide-zoo-border">
        {sorted.map((player, i) => (
          <div
            key={player.id}
            className={`flex items-center justify-between px-4 py-2.5 ${
              player.id === myId ? "bg-neon-blue/5" : ""
            } ${player.disconnected ? "opacity-50" : ""}`}
          >
            <div className="flex items-center gap-2">
              <span className="w-6 text-center text-sm">
                {i < 3 ? MEDALS[i] : (
                  <span className="text-text-muted font-mono text-xs">
                    {i + 1}
                  </span>
                )}
              </span>
              <span
                className={`text-sm ${
                  player.id === myId
                    ? "text-neon-blue font-semibold"
                    : "text-text-primary"
                }`}
              >
                {player.name}
              </span>
              {player.isHost && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-neon-yellow/20 text-neon-yellow">
                  HOST
                </span>
              )}
              {player.streak >= 2 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-neon-gold/20 text-neon-gold font-bold">
                  {"\u{1F525}"}&times;{player.streak}
                </span>
              )}
              {player.disconnected && (
                <span className="text-[10px] text-text-muted">offline</span>
              )}
            </div>
            <span
              className={`font-mono text-sm font-bold ${
                player.balance >= 1000 ? "text-neon-gold" : "text-neon-red"
              }`}
            >
              {formatClout(player.balance)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
