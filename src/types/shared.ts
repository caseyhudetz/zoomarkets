export type ReactionEmoji = "🔥" | "😂" | "💀" | "🤔";

export interface Player {
  id: string;
  name: string;
  balance: number;
  isHost: boolean;
  streak: number;
  disconnected?: boolean;
}

export interface Position {
  yesShares: number;
  noShares: number;
  totalInvested: number;
}

export interface Market {
  id: string;
  question: string;
  status: "open" | "resolved";
  resolution: "yes" | "no" | null;
  createdAt: number;
  resolvedAt: number | null;
  qYes: number;
  qNo: number;
  b: number;
  yesPrice: number;
  noPrice: number;
  positions: Record<string, Position>;
  priceHistory: { timestamp: number; yesPrice: number }[];
}

export interface Room {
  code: string;
  hostId: string;
  players: Player[];
  markets: Market[];
  createdAt: number;
}

export interface Comment {
  id: string;
  playerId: string;
  playerName: string;
  text: string;
  timestamp: number;
}

export interface RoomView {
  code: string;
  name?: string;
  hostId: string;
  players: Player[];
  markets: MarketView[];
}

export interface MarketView {
  id: string;
  question: string;
  status: "open" | "resolved";
  resolution: "yes" | "no" | null;
  yesPrice: number;
  noPrice: number;
  totalVolume: number;
  myPosition: Position | null;
  priceHistory: { timestamp: number; yesPrice: number }[];
  reactions: Record<string, number>;
  myReactions: string[];
  comments: Comment[];
}
