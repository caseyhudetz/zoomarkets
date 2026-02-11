"use client";

import { useState } from "react";
import { MARKET_TEMPLATES } from "@/lib/templates";

interface CreateMarketModalProps {
  onClose: () => void;
  onCreate: (question: string) => void;
}

export function CreateMarketModal({
  onClose,
  onCreate,
}: CreateMarketModalProps) {
  const [question, setQuestion] = useState("");

  function handleSubmit() {
    if (!question.trim()) return;
    onCreate(question.trim());
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-lg bg-zoo-surface border border-zoo-border rounded-xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-zoo-border flex items-center justify-between">
          <h2 className="text-lg font-semibold">Create a Market</h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary transition-colors text-xl leading-none"
          >
            x
          </button>
        </div>

        <div className="p-4">
          <input
            type="text"
            placeholder='e.g. "Will Dave be late?"'
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            maxLength={120}
            autoFocus
            className="w-full p-3 rounded-lg bg-zoo-bg border border-zoo-border focus:border-neon-blue/50 focus:outline-none text-text-primary placeholder:text-text-muted transition-colors"
          />

          <button
            onClick={handleSubmit}
            disabled={!question.trim()}
            className="w-full mt-3 p-3 rounded-lg bg-neon-blue/20 border border-neon-blue/40 text-neon-blue font-semibold hover:bg-neon-blue/30 transition-colors disabled:opacity-40"
          >
            Create Market
          </button>

          <div className="mt-5">
            <h4 className="text-xs text-text-muted uppercase tracking-wider mb-3">
              Quick Templates
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {MARKET_TEMPLATES.map((t) => (
                <button
                  key={t.label}
                  onClick={() => {
                    onCreate(t.question);
                    onClose();
                  }}
                  className="p-2.5 rounded-lg bg-zoo-bg border border-zoo-border hover:border-neon-purple/40 text-left transition-colors group"
                >
                  <div className="text-xs font-semibold text-neon-purple group-hover:text-neon-purple">
                    {t.label}
                  </div>
                  <div className="text-xs text-text-muted mt-0.5 leading-snug">
                    {t.question}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
