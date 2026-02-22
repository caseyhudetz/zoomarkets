import { CURRENCY_SYMBOL } from "./constants";

export function formatClout(amount: number): string {
  return `${CURRENCY_SYMBOL} ${Math.round(amount).toLocaleString()}`;
}

export function formatCloutCompact(amount: number): string {
  return `${Math.round(amount)}${CURRENCY_SYMBOL}`;
}
