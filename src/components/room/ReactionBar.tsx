"use client";

import { motion } from "framer-motion";

const REACTION_EMOJIS = ["\u{1F525}", "\u{1F602}", "\u{1F480}", "\u{1F914}"];

interface ReactionBarProps {
  reactions: Record<string, number>;
  myReactions: string[];
  onReact: (emoji: string) => void;
}

export function ReactionBar({ reactions, myReactions, onReact }: ReactionBarProps) {
  return (
    <div className="flex gap-1.5 mt-2">
      {REACTION_EMOJIS.map((emoji) => {
        const count = reactions[emoji] || 0;
        const isActive = myReactions.includes(emoji);
        return (
          <motion.button
            key={emoji}
            whileTap={{ scale: 1.3 }}
            onClick={() => onReact(emoji)}
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors ${
              isActive
                ? "bg-neon-blue/20 border border-neon-blue/40"
                : "bg-zoo-bg border border-zoo-border hover:border-zoo-surface-light"
            }`}
          >
            <span className="text-sm">{emoji}</span>
            {count > 0 && (
              <span className={`font-mono text-[10px] ${isActive ? "text-neon-blue" : "text-text-muted"}`}>
                {count}
              </span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
