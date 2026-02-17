import type { Player, RoomView, MarketView } from "./shared";

export interface ClientToServerEvents {
  "room:create": (data: { playerName: string }) => void;
  "room:join": (data: { code: string; playerName: string }) => void;
  "room:rejoin": (data: { code: string; rejoinToken: string }) => void;
  "room:leave": () => void;
  "market:create": (data: { question: string }) => void;
  "market:bet": (data: {
    marketId: string;
    side: "yes" | "no";
    amount: number;
  }) => void;
  "market:resolve": (data: {
    marketId: string;
    resolution: "yes" | "no";
  }) => void;
  "market:react": (data: { marketId: string; emoji: string }) => void;
  "room:importPlayers": (data: { names: string[] }) => void;
}

export interface ServerToClientEvents {
  "room:created": (data: { code: string }) => void;
  "room:joined": (data: { room: RoomView }) => void;
  "room:rejoined": (data: { room: RoomView }) => void;
  "room:rejoinToken": (data: { token: string; roomCode: string }) => void;
  "room:error": (data: { message: string }) => void;
  "room:playerJoined": (data: { player: Player }) => void;
  "room:playerLeft": (data: { playerId: string }) => void;
  "room:playerDisconnected": (data: { playerId: string }) => void;
  "room:playerReconnected": (data: { playerId: string; newId: string }) => void;
  "room:hostChanged": (data: { newHostId: string }) => void;
  "room:closed": () => void;
  "market:created": (data: { market: MarketView }) => void;
  "market:updated": (data: { market: MarketView }) => void;
  "market:resolved": (data: {
    market: MarketView;
    payouts: Record<string, number>;
    streaks: Record<string, number>;
  }) => void;
  "market:reactionsUpdated": (data: {
    marketId: string;
    reactions: Record<string, number>;
  }) => void;
  "player:balanceUpdated": (data: {
    playerId: string;
    newBalance: number;
  }) => void;
  "leaderboard:updated": (data: {
    rankings: { playerId: string; name: string; balance: number; streak: number }[];
  }) => void;
  "bet:placed": (data: {
    playerName: string;
    side: "yes" | "no";
    amount: number;
    marketQuestion: string;
  }) => void;
}
