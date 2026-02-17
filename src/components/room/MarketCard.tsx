"use client";

import { useState } from "react";
import type { MarketView } from "@/types/shared";
import { BetPanel } from "./BetPanel";
import { PriceChart } from "./PriceChart";
import { ReactionBar } from "./ReactionBar";
import { formatCloutCompact } from "@/lib/format";

interface MarketCardProps {
  market: MarketView;
  isHost: boolean;
  myBalance: number;
  onBet: (marketId: string, side: "yes" | "no", amount: number) => void;
  onResolve: (marketId: string, resolution: "yes" | "no") => void;
  onReact: (marketId: string, emoji: string) => void;
}

export function MarketCard({
  market,
  isHost,
  myBalance,
  onBet,
  onResolve,
  onReact,
}: MarketCardProps) {
  const [showBet, setShowBet] = useState(false);
  const [showResolve, setShowResolve] = useState(false);

  const yesPercent = Math.round(market.yesPrice * 100);
  const noPercent = 100 - yesPercent;
  const isResolved = market.status === "resolved";

  return (
    <div
      className={`bg-zoo-surface border rounded-xl overflow-hidden animate-slide-up ${
        isResolved
          ? market.resolution === "yes"
            ? "border-neon-green/30"
            : "border-neon-red/30"
          : "border-zoo-border"
      }`}
    >
      {/* Question + Status */}
      <div className="p-3 sm:p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-sm sm:text-base font-semibold text-text-primary leading-snug">
            {market.question}
          </h3>
          {isResolved && (
            <span
              className={`shrink-0 text-xs font-bold px-2 py-1 rounded-full ${
                market.resolution === "yes"
                  ? "bg-neon-green/20 text-neon-green"
                  : "bg-neon-red/20 text-neon-red"
              }`}
            >
              {market.resolution === "yes" ? "YES" : "NO"}
            </span>
          )}
        </div>

        {/* Price Bar */}
        <div className="mt-3 flex rounded-full overflow-hidden h-10 sm:h-8 bg-zoo-bg">
          <div
            className="price-bar-yes flex items-center justify-center text-xs font-bold bg-neon-green/20 text-neon-green"
            style={{ width: `${Math.max(yesPercent, 8)}%` }}
          >
            {yesPercent > 15 && `YES ${yesPercent}%`}
          </div>
          <div
            className="price-bar-no flex items-center justify-center text-xs font-bold bg-neon-red/20 text-neon-red"
            style={{ width: `${Math.max(noPercent, 8)}%` }}
          >
            {noPercent > 15 && `NO ${noPercent}%`}
          </div>
        </div>

        {/* Prices + Volume */}
        <div className="mt-2 flex items-center justify-between text-xs">
          <div className="flex gap-4">
            <span className="font-mono">
              <span className="text-text-muted">YES </span>
              <span className="text-neon-green">
                {market.yesPrice.toFixed(2)}
              </span>
            </span>
            <span className="font-mono">
              <span className="text-text-muted">NO </span>
              <span className="text-neon-red">
                {market.noPrice.toFixed(2)}
              </span>
            </span>
          </div>
          <span className="text-text-muted font-mono">
            Vol: {formatCloutCompact(market.totalVolume)}
          </span>
        </div>

        {/* Sparkline */}
        {market.priceHistory.length > 1 && (
          <div className="mt-2">
            <PriceChart data={market.priceHistory} />
          </div>
        )}

        {/* My Position */}
        {market.myPosition && (
          <div className="mt-3 p-2 rounded-lg bg-zoo-bg text-xs">
            <span className="text-text-muted">Your position: </span>
            {market.myPosition.yesShares > 0 && (
              <span className="text-neon-green font-mono">
                {market.myPosition.yesShares.toFixed(1)} YES
              </span>
            )}
            {market.myPosition.yesShares > 0 &&
              market.myPosition.noShares > 0 && (
                <span className="text-text-muted"> / </span>
              )}
            {market.myPosition.noShares > 0 && (
              <span className="text-neon-red font-mono">
                {market.myPosition.noShares.toFixed(1)} NO
              </span>
            )}
            <span className="text-text-muted ml-2">
              (invested: {formatCloutCompact(market.myPosition.totalInvested)})
            </span>
          </div>
        )}

        {/* Reactions */}
        <ReactionBar
          reactions={market.reactions ?? {}}
          myReactions={market.myReactions ?? []}
          onReact={(emoji) => onReact(market.id, emoji)}
        />
      </div>

      {/* Actions */}
      {!isResolved && (
        <div className="px-3 sm:px-4 pb-3 sm:pb-4">
          {!showBet ? (
            <div className="flex gap-2">
              <button
                onClick={() => setShowBet(true)}
                className="flex-1 py-2.5 rounded-lg bg-neon-blue/10 border border-neon-blue/30 text-neon-blue text-sm font-medium hover:bg-neon-blue/20 transition-colors min-h-[44px]"
              >
                Place Bet
              </button>
              {isHost && (
                <button
                  onClick={() => setShowResolve(true)}
                  className="py-2.5 px-4 rounded-lg bg-neon-purple/10 border border-neon-purple/30 text-neon-purple text-sm font-medium hover:bg-neon-purple/20 transition-colors min-h-[44px]"
                >
                  Resolve
                </button>
              )}
            </div>
          ) : (
            <BetPanel
              marketId={market.id}
              yesPrice={market.yesPrice}
              noPrice={market.noPrice}
              maxBet={myBalance}
              onBet={onBet}
              onCancel={() => setShowBet(false)}
            />
          )}

          {showResolve && (
            <div className="mt-3 p-3 rounded-lg bg-zoo-bg border border-zoo-border animate-slide-up">
              <p className="text-sm text-text-secondary mb-3">
                Resolve this market:
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    onResolve(market.id, "yes");
                    setShowResolve(false);
                  }}
                  className="flex-1 py-2.5 rounded-lg bg-neon-green/20 border border-neon-green/40 text-neon-green font-bold hover:bg-neon-green/30 transition-colors min-h-[44px]"
                >
                  YES
                </button>
                <button
                  onClick={() => {
                    onResolve(market.id, "no");
                    setShowResolve(false);
                  }}
                  className="flex-1 py-2.5 rounded-lg bg-neon-red/20 border border-neon-red/40 text-neon-red font-bold hover:bg-neon-red/30 transition-colors min-h-[44px]"
                >
                  NO
                </button>
                <button
                  onClick={() => setShowResolve(false)}
                  className="py-2.5 px-3 rounded-lg text-text-muted text-sm hover:bg-zoo-surface transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
