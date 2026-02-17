"use client";

import { useState } from "react";
import { formatCloutCompact } from "@/lib/format";

interface BetPanelProps {
  marketId: string;
  yesPrice: number;
  noPrice: number;
  maxBet: number;
  onBet: (marketId: string, side: "yes" | "no", amount: number) => void;
  onCancel: () => void;
}

const QUICK_AMOUNTS = [10, 25, 50, 100];

export function BetPanel({
  marketId,
  yesPrice,
  noPrice,
  maxBet,
  onBet,
  onCancel,
}: BetPanelProps) {
  const [side, setSide] = useState<"yes" | "no">("yes");
  const [amount, setAmount] = useState(25);
  const [showCustom, setShowCustom] = useState(false);
  const [customAmount, setCustomAmount] = useState("");

  const effectiveAmount = showCustom
    ? Math.min(parseInt(customAmount) || 0, maxBet)
    : Math.min(amount, maxBet);

  function handleBet() {
    const betAmount = Math.floor(effectiveAmount);
    if (betAmount < 1) return;
    onBet(marketId, side, betAmount);
    onCancel();
  }

  return (
    <div className="p-3 rounded-lg bg-zoo-bg border border-zoo-border animate-slide-up">
      {/* Side Toggle */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setSide("yes")}
          className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all min-h-[48px] ${
            side === "yes"
              ? "bg-neon-green/20 border border-neon-green/50 text-neon-green glow-green"
              : "bg-zoo-surface border border-zoo-border text-text-muted hover:text-text-secondary"
          }`}
        >
          YES {yesPrice.toFixed(2)}
        </button>
        <button
          onClick={() => setSide("no")}
          className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all min-h-[48px] ${
            side === "no"
              ? "bg-neon-red/20 border border-neon-red/50 text-neon-red glow-red"
              : "bg-zoo-surface border border-zoo-border text-text-muted hover:text-text-secondary"
          }`}
        >
          NO {noPrice.toFixed(2)}
        </button>
      </div>

      {/* Quick Amounts */}
      <div className="flex gap-2 mb-3">
        {QUICK_AMOUNTS.map((q) => (
          <button
            key={q}
            onClick={() => {
              setAmount(q);
              setShowCustom(false);
            }}
            disabled={q > maxBet}
            className={`flex-1 py-2 rounded text-xs font-mono transition-colors min-h-[36px] ${
              !showCustom && amount === q
                ? "bg-neon-blue/20 border border-neon-blue/50 text-neon-blue"
                : "bg-zoo-surface border border-zoo-border text-text-muted hover:text-text-secondary disabled:opacity-30"
            }`}
          >
            {formatCloutCompact(q)}
          </button>
        ))}
        <button
          onClick={() => {
            setAmount(Math.floor(maxBet));
            setShowCustom(false);
          }}
          disabled={maxBet < 1}
          className={`flex-1 py-2 rounded text-xs font-mono font-bold transition-colors min-h-[36px] ${
            !showCustom && amount === Math.floor(maxBet)
              ? "bg-neon-purple/20 border border-neon-purple/50 text-neon-purple"
              : "bg-zoo-surface border border-zoo-border text-neon-purple/60 hover:text-neon-purple disabled:opacity-30"
          }`}
        >
          MAX
        </button>
      </div>

      {/* Custom amount toggle */}
      {!showCustom ? (
        <button
          onClick={() => setShowCustom(true)}
          className="w-full mb-3 text-xs text-text-muted hover:text-text-secondary transition-colors"
        >
          Custom amount...
        </button>
      ) : (
        <div className="mb-3">
          <input
            type="number"
            min={1}
            max={Math.floor(maxBet)}
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            placeholder={`1 - ${Math.floor(maxBet)}`}
            autoFocus
            className="w-full p-2 rounded-lg bg-zoo-surface border border-zoo-border focus:border-neon-blue/50 focus:outline-none text-text-primary placeholder:text-text-muted font-mono text-sm text-center"
          />
        </div>
      )}

      {/* Confirm + Cancel */}
      <div className="flex gap-2">
        <button
          onClick={handleBet}
          disabled={effectiveAmount < 1}
          className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all disabled:opacity-30 min-h-[48px] ${
            side === "yes"
              ? "bg-neon-green/20 border border-neon-green/40 text-neon-green hover:bg-neon-green/30"
              : "bg-neon-red/20 border border-neon-red/40 text-neon-red hover:bg-neon-red/30"
          }`}
        >
          Bet {formatCloutCompact(effectiveAmount)} on {side.toUpperCase()}
        </button>
        <button
          onClick={onCancel}
          className="py-3 px-4 rounded-lg text-text-muted text-sm hover:bg-zoo-surface transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
