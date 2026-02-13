import crypto from "crypto";
import {
  cost,
  priceYes,
  priceNo,
  tradeCost,
  sharesToBuy,
  calculatePayout,
  DEFAULT_B,
} from "../engine/lmsr";

const STARTING_BALANCE = 1000;
const MIN_BET = 1;
const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 4;
const CLEANUP_INTERVAL = 60_000;
const MAX_INACTIVE_MS = 30 * 60_000;

export interface Player {
  id: string;
  name: string;
  balance: number;
  isHost: boolean;
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
  lastActivity: number;
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
}

export interface RoomView {
  code: string;
  hostId: string;
  players: Player[];
  markets: MarketView[];
}

export class RoomManager {
  private rooms = new Map<string, Room>();
  private playerToRoom = new Map<string, string>();
  private cleanupTimer: ReturnType<typeof setInterval>;

  constructor() {
    this.cleanupTimer = setInterval(() => this.cleanup(), CLEANUP_INTERVAL);
  }

  destroy() {
    clearInterval(this.cleanupTimer);
  }

  private generateCode(): string {
    let code: string;
    do {
      code = "";
      for (let i = 0; i < CODE_LENGTH; i++) {
        code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
      }
    } while (this.rooms.has(code));
    return code;
  }

  createRoom(hostSocketId: string, playerName: string): string {
    const code = this.generateCode();
    const now = Date.now();
    const room: Room = {
      code,
      hostId: hostSocketId,
      players: [
        {
          id: hostSocketId,
          name: playerName,
          balance: STARTING_BALANCE,
          isHost: true,
        },
      ],
      markets: [],
      createdAt: now,
      lastActivity: now,
    };
    this.rooms.set(code, room);
    this.playerToRoom.set(hostSocketId, code);
    return code;
  }

  joinRoom(
    code: string,
    socketId: string,
    playerName: string
  ): { error?: string; alreadyInRoom?: boolean } {
    const room = this.rooms.get(code.toUpperCase());
    if (!room) return { error: "Room not found" };
    if (room.players.find((p) => p.id === socketId))
      return { alreadyInRoom: true };

    room.players.push({
      id: socketId,
      name: playerName,
      balance: STARTING_BALANCE,
      isHost: false,
    });
    room.lastActivity = Date.now();
    this.playerToRoom.set(socketId, room.code);
    return {};
  }

  addGhostPlayer(code: string, name: string): Player | null {
    const room = this.rooms.get(code);
    if (!room) return null;
    // Check for duplicate names
    if (room.players.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
      return null;
    }
    const ghostId = `ghost_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const player: Player = {
      id: ghostId,
      name,
      balance: STARTING_BALANCE,
      isHost: false,
    };
    room.players.push(player);
    room.lastActivity = Date.now();
    return player;
  }

  removePlayer(code: string, socketId: string): void {
    const room = this.rooms.get(code);
    if (!room) return;

    room.players = room.players.filter((p) => p.id !== socketId);
    this.playerToRoom.delete(socketId);

    if (room.players.length === 0) {
      this.rooms.delete(code);
    }
  }

  getRoom(code: string): Room | null {
    return this.rooms.get(code) ?? null;
  }

  getRoomForPlayer(socketId: string): Room | null {
    const code = this.playerToRoom.get(socketId);
    if (!code) return null;
    return this.rooms.get(code) ?? null;
  }

  getPlayer(code: string, socketId: string): Player | null {
    const room = this.rooms.get(code);
    if (!room) return null;
    return room.players.find((p) => p.id === socketId) ?? null;
  }

  setHost(code: string, socketId: string): void {
    const room = this.rooms.get(code);
    if (!room) return;
    room.hostId = socketId;
    for (const p of room.players) {
      p.isHost = p.id === socketId;
    }
  }

  createMarket(code: string, question: string): Market {
    const room = this.rooms.get(code)!;
    const now = Date.now();
    const market: Market = {
      id: crypto.randomUUID(),
      question,
      status: "open",
      resolution: null,
      createdAt: now,
      resolvedAt: null,
      qYes: 0,
      qNo: 0,
      b: DEFAULT_B,
      yesPrice: 0.5,
      noPrice: 0.5,
      positions: {},
      priceHistory: [{ timestamp: now, yesPrice: 0.5 }],
    };
    room.markets.push(market);
    room.lastActivity = now;
    return market;
  }

  placeBet(
    code: string,
    marketId: string,
    playerId: string,
    side: "yes" | "no",
    amount: number
  ): { error?: string; shares?: number } {
    const room = this.rooms.get(code);
    if (!room) return { error: "Room not found" };

    const market = room.markets.find((m) => m.id === marketId);
    if (!market) return { error: "Market not found" };
    if (market.status !== "open") return { error: "Market is closed" };

    const player = room.players.find((p) => p.id === playerId);
    if (!player) return { error: "Player not found" };

    if (amount < MIN_BET) return { error: `Minimum bet is ${MIN_BET}` };
    if (amount > player.balance) return { error: "Insufficient balance" };

    const shares = sharesToBuy(
      market.qYes,
      market.qNo,
      market.b,
      side,
      amount
    );

    // Update market state
    if (side === "yes") {
      market.qYes += shares;
    } else {
      market.qNo += shares;
    }

    // Update prices
    market.yesPrice = priceYes(market.qYes, market.qNo, market.b);
    market.noPrice = priceNo(market.qYes, market.qNo, market.b);

    // Record price history
    market.priceHistory.push({
      timestamp: Date.now(),
      yesPrice: market.yesPrice,
    });

    // Update player position
    if (!market.positions[playerId]) {
      market.positions[playerId] = {
        yesShares: 0,
        noShares: 0,
        totalInvested: 0,
      };
    }
    const pos = market.positions[playerId];
    if (side === "yes") {
      pos.yesShares += shares;
    } else {
      pos.noShares += shares;
    }
    pos.totalInvested += amount;

    // Deduct from balance
    player.balance -= amount;
    room.lastActivity = Date.now();

    return { shares };
  }

  resolveMarket(
    code: string,
    marketId: string,
    resolution: "yes" | "no"
  ): Record<string, number> {
    const room = this.rooms.get(code)!;
    const market = room.markets.find((m) => m.id === marketId)!;

    market.status = "resolved";
    market.resolution = resolution;
    market.resolvedAt = Date.now();

    const payouts: Record<string, number> = {};

    for (const [playerId, position] of Object.entries(market.positions)) {
      const payout = calculatePayout(position, resolution);
      payouts[playerId] = Math.round(payout * 100) / 100;
      const player = room.players.find((p) => p.id === playerId);
      if (player) {
        player.balance += payout;
        player.balance = Math.round(player.balance * 100) / 100;
      }
    }

    room.lastActivity = Date.now();
    return payouts;
  }

  getMarketView(
    code: string,
    marketId: string,
    forPlayerId: string
  ): MarketView | null {
    const room = this.rooms.get(code);
    if (!room) return null;
    const market = room.markets.find((m) => m.id === marketId);
    if (!market) return null;

    let totalVolume = 0;
    for (const pos of Object.values(market.positions)) {
      totalVolume += pos.totalInvested;
    }

    return {
      id: market.id,
      question: market.question,
      status: market.status,
      resolution: market.resolution,
      yesPrice: market.yesPrice,
      noPrice: market.noPrice,
      totalVolume: Math.round(totalVolume * 100) / 100,
      myPosition: market.positions[forPlayerId] ?? null,
      priceHistory: market.priceHistory,
    };
  }

  getRoomView(code: string, forPlayerId: string): RoomView | null {
    const room = this.rooms.get(code);
    if (!room) return null;

    return {
      code: room.code,
      hostId: room.hostId,
      // Deep copy players so mutations on server don't leak to serialized data
      players: room.players.map((p) => ({ ...p })),
      markets: room.markets.map((m) => this.getMarketView(code, m.id, forPlayerId)!),
    };
  }

  getLeaderboard(
    code: string
  ): { playerId: string; name: string; balance: number }[] {
    const room = this.rooms.get(code);
    if (!room) return [];
    return room.players
      .map((p) => ({ playerId: p.id, name: p.name, balance: p.balance }))
      .sort((a, b) => b.balance - a.balance);
  }

  getRoomCount(): number {
    return this.rooms.size;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [code, room] of this.rooms) {
      if (room.players.length === 0 || now - room.lastActivity > MAX_INACTIVE_MS) {
        for (const p of room.players) {
          this.playerToRoom.delete(p.id);
        }
        this.rooms.delete(code);
      }
    }
  }
}
