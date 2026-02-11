"use client";

import { useState, useMemo } from "react";

// Client-side LMSR preview (mirrors server logic)
function previewShares(
  qYes: number,
  qNo: number,
  b: number,
  side: "yes" | "no",
  amount: number
): number {
  function tradeCostCalc(shares: number): number {
    const maxBefore = Math.max(qYes, qNo);
    const costBefore =
      maxBefore +
      b * Math.log(Math.exp((qYes - maxBefore) / b) + Math.exp((qNo - maxBefore) / b));
    const newYes = side === "yes" ? qYes + shares : qYes;
    const newNo = side === "no" ? qNo + shares : qNo;
    const maxAfter = Math.max(newYes, newNo);
    const costAfter =
      maxAfter +
      b * Math.log(Math.exp((newYes - maxAfter) / b) + Math.exp((newNo - maxAfter) / b));
    return costAfter - costBefore;
  }

  let lo = 0;
  let hi = amount * 10;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (tradeCostCalc(mid) < amount) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

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

  const effectiveAmount = Math.min(amount, maxBet);

  const estimatedShares = useMemo(() => {
    if (effectiveAmount <= 0) return 0;
    // Use 0/0 as starting q values since we don't have them client-side
    // The server's actual calculation uses the real q values
    // This is a rough preview based on current price
    const price = side === "yes" ? yesPrice : noPrice;
    if (price <= 0 || price >= 1) return effectiveAmount;
    // Simple approximation: shares ≈ amount / averagePrice
    // where averagePrice is slightly higher than current price
    return effectiveAmount / (price + (1 - price) * 0.15);
  }, [side, effectiveAmount, yesPrice, noPrice]);

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
          className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
            side === "yes"
              ? "bg-neon-green/20 border border-neon-green/50 text-neon-green glow-green"
              : "bg-zoo-surface border border-zoo-border text-text-muted hover:text-text-secondary"
          }`}
        >
          YES ${yesPrice.toFixed(2)}
        </button>
        <button
          onClick={() => setSide("no")}
          className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
            side === "no"
              ? "bg-neon-red/20 border border-neon-red/50 text-neon-red glow-red"
              : "bg-zoo-surface border border-zoo-border text-text-muted hover:text-text-secondary"
          }`}
        >
          NO ${noPrice.toFixed(2)}
        </button>
      </div>

      {/* Quick Amounts */}
      <div className="flex gap-2 mb-3">
        {QUICK_AMOUNTS.map((q) => (
          <button
            key={q}
            onClick={() => setAmount(q)}
            disabled={q > maxBet}
            className={`flex-1 py-1.5 rounded text-xs font-mono transition-colors ${
              amount === q
                ? "bg-neon-blue/20 border border-neon-blue/50 text-neon-blue"
                : "bg-zoo-surface border border-zoo-border text-text-muted hover:text-text-secondary disabled:opacity-30"
            }`}
          >
            ${q}
          </button>
        ))}
      </div>

      {/* Slider */}
      <div className="mb-3">
        <input
          type="range"
          min={1}
          max={Math.max(maxBet, 1)}
          value={effectiveAmount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="w-full accent-neon-blue"
        />
        <div className="flex justify-between text-xs text-text-muted font-mono">
          <span>$1</span>
          <span className="text-neon-blue font-bold">${effectiveAmount}</span>
          <span>${Math.round(maxBet)}</span>
        </div>
      </div>

      {/* Preview */}
      <div className="mb-3 text-xs text-text-secondary text-center">
        Est. {estimatedShares.toFixed(1)} {side.toUpperCase()} shares
      </div>

      {/* Confirm + Cancel */}
      <div className="flex gap-2">
        <button
          onClick={handleBet}
          disabled={effectiveAmount < 1}
          className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-30 ${
            side === "yes"
              ? "bg-neon-green/20 border border-neon-green/40 text-neon-green hover:bg-neon-green/30"
              : "bg-neon-red/20 border border-neon-red/40 text-neon-red hover:bg-neon-red/30"
          }`}
        >
          Bet ${effectiveAmount} on {side.toUpperCase()}
        </button>
        <button
          onClick={onCancel}
          className="py-2 px-3 rounded-lg text-text-muted text-sm hover:bg-zoo-surface transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
