"use client";

import { AnimatePresence, motion } from "framer-motion";
import { formatCloutCompact } from "@/lib/format";

export interface BetFeedEntry {
  id: string;
  playerName: string;
  side: "yes" | "no";
  amount: number;
  marketQuestion: string;
  timestamp: number;
}

interface BetFeedToastProps {
  entries: BetFeedEntry[];
}

export function BetFeedToast({ entries }: BetFeedToastProps) {
  return (
    <div className="fixed bottom-20 lg:bottom-6 left-4 lg:left-6 z-40 flex flex-col gap-2 max-w-xs">
      <AnimatePresence mode="popLayout">
        {entries.map((entry) => {
          const question =
            entry.marketQuestion.length > 40
              ? entry.marketQuestion.slice(0, 37) + "..."
              : entry.marketQuestion;
          return (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className="px-3 py-2 rounded-lg bg-zoo-surface/95 backdrop-blur border border-zoo-border text-xs"
            >
              <span className="text-text-primary font-semibold">{entry.playerName}</span>
              <span className="text-text-muted"> bet </span>
              <span className="text-neon-gold font-mono font-bold">
                {formatCloutCompact(entry.amount)}
              </span>
              <span className="text-text-muted"> on </span>
              <span className={entry.side === "yes" ? "text-neon-green font-bold" : "text-neon-red font-bold"}>
                {entry.side.toUpperCase()}
              </span>
              <div className="text-text-muted mt-0.5 truncate">{question}</div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
