/**
 * LMSR (Logarithmic Market Scoring Rule) pricing engine.
 *
 * Cost function: C(qYes, qNo) = b * ln(exp(qYes/b) + exp(qNo/b))
 * Uses log-sum-exp trick for numerical stability.
 */

export const DEFAULT_B = 100;

export function cost(qYes: number, qNo: number, b: number): number {
  const maxQ = Math.max(qYes, qNo);
  return maxQ + b * Math.log(
    Math.exp((qYes - maxQ) / b) + Math.exp((qNo - maxQ) / b)
  );
}

export function priceYes(qYes: number, qNo: number, b: number): number {
  return 1 / (1 + Math.exp((qNo - qYes) / b));
}

export function priceNo(qYes: number, qNo: number, b: number): number {
  return 1 - priceYes(qYes, qNo, b);
}

export function tradeCost(
  qYes: number,
  qNo: number,
  b: number,
  side: "yes" | "no",
  shares: number
): number {
  const costBefore = cost(qYes, qNo, b);
  const costAfter =
    side === "yes"
      ? cost(qYes + shares, qNo, b)
      : cost(qYes, qNo + shares, b);
  return costAfter - costBefore;
}

/**
 * Binary search: given Meeting Bucks to spend, how many shares do you get?
 */
export function sharesToBuy(
  qYes: number,
  qNo: number,
  b: number,
  side: "yes" | "no",
  amountToSpend: number
): number {
  let lo = 0;
  let hi = amountToSpend * 10;
  const EPSILON = 0.001;

  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    const c = tradeCost(qYes, qNo, b, side, mid);
    if (Math.abs(c - amountToSpend) < EPSILON) return mid;
    if (c < amountToSpend) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export function calculatePayout(
  position: { yesShares: number; noShares: number },
  resolution: "yes" | "no"
): number {
  return resolution === "yes" ? position.yesShares : position.noShares;
}
