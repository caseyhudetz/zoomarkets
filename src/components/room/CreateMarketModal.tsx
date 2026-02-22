"use client";

import { useState } from "react";
import { TEMPLATE_CATEGORIES } from "@/lib/templates";

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
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg bg-zoo-surface border border-zoo-border rounded-t-2xl sm:rounded-xl max-h-[85vh] flex flex-col animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-zoo-border flex items-center justify-between shrink-0">
          <h2 className="text-lg font-semibold">Create a Market</h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary transition-colors text-xl leading-none p-1"
          >
            &times;
          </button>
        </div>

        {/* Scrollable content */}
        <div className="p-4 overflow-y-auto flex-1">
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
            className="w-full mt-3 p-3 rounded-lg bg-neon-blue/20 border border-neon-blue/40 text-neon-blue font-semibold hover:bg-neon-blue/30 transition-colors disabled:opacity-40 min-h-[48px]"
          >
            Create Market
          </button>

          {/* Categorized Templates */}
          <div className="mt-5 space-y-4">
            {TEMPLATE_CATEGORIES.map((cat) => (
              <div key={cat.name}>
                <h4 className="text-xs text-text-muted uppercase tracking-wider mb-2">
                  {cat.emoji} {cat.name}
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {cat.templates.map((t) => (
                    <button
                      key={t.label}
                      onClick={() => {
                        onCreate(t.question);
                        onClose();
                      }}
                      className="p-2.5 rounded-lg bg-zoo-bg border border-zoo-border hover:border-neon-purple/40 text-left transition-colors group min-h-[48px]"
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
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
