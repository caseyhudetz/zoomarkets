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
const REJOIN_GRACE_MS = 2 * 60_000;

export interface Player {
  id: string;
  name: string;
  balance: number;
  isHost: boolean;
  streak: number;
  rejoinToken?: string;
  disconnectedAt?: number;
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
  reactions: Record<string, Set<string>>;
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
  reactions: Record<string, number>;
  myReactions: string[];
}

export interface RoomView {
  code: string;
  hostId: string;
  players: {
    id: string;
    name: string;
    balance: number;
    isHost: boolean;
    streak: number;
    disconnected?: boolean;
  }[];
  markets: MarketView[];
}

export class RoomManager {
  private rooms = new Map<string, Room>();
  private playerToRoom = new Map<string, string>();
  private rejoinTokens = new Map<string, { roomCode: string; playerId: string }>();
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

  generateRejoinToken(code: string, socketId: string): string | null {
    const room = this.rooms.get(code);
    if (!room) return null;
    const player = room.players.find((p) => p.id === socketId);
    if (!player) return null;

    // Clear old token if any
    if (player.rejoinToken) {
      this.rejoinTokens.delete(player.rejoinToken);
    }

    const token = crypto.randomUUID().slice(0, 8);
    player.rejoinToken = token;
    this.rejoinTokens.set(token, { roomCode: code, playerId: player.id });
    return token;
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
          streak: 0,
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
      streak: 0,
    });
    room.lastActivity = Date.now();
    this.playerToRoom.set(socketId, room.code);
    return {};
  }

  markDisconnected(socketId: string): string | null {
    const code = this.playerToRoom.get(socketId);
    if (!code) return null;
    const room = this.rooms.get(code);
    if (!room) return null;
    const player = room.players.find((p) => p.id === socketId);
    if (!player) return null;

    player.disconnectedAt = Date.now();
    return code;
  }

  rejoinPlayer(
    code: string,
    rejoinToken: string,
    newSocketId: string
  ): { player: Player; roomCode: string } | null {
    const tokenInfo = this.rejoinTokens.get(rejoinToken);
    if (!tokenInfo || tokenInfo.roomCode !== code.toUpperCase()) return null;

    const room = this.rooms.get(code.toUpperCase());
    if (!room) return null;

    const player = room.players.find((p) => p.id === tokenInfo.playerId);
    if (!player) return null;

    // Check grace period
    if (player.disconnectedAt && Date.now() - player.disconnectedAt > REJOIN_GRACE_MS) {
      return null;
    }

    const oldId = player.id;

    // Update player ID to new socket
    player.id = newSocketId;
    player.disconnectedAt = undefined;

    // Update playerToRoom mapping
    this.playerToRoom.delete(oldId);
    this.playerToRoom.set(newSocketId, room.code);

    // Clear old token
    this.rejoinTokens.delete(rejoinToken);

    // Update positions in all markets: swap old ID for new ID
    for (const market of room.markets) {
      if (market.positions[oldId]) {
        market.positions[newSocketId] = market.positions[oldId];
        delete market.positions[oldId];
      }
      for (const playerSet of Object.values(market.reactions)) {
        if (playerSet.has(oldId)) {
          playerSet.delete(oldId);
          playerSet.add(newSocketId);
        }
      }
    }

    // Update host reference if needed
    if (room.hostId === oldId) {
      room.hostId = newSocketId;
    }

    room.lastActivity = Date.now();
    return { player, roomCode: room.code };
  }

  addGhostPlayer(code: string, name: string): Player | null {
    const room = this.rooms.get(code);
    if (!room) return null;
    if (room.players.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
      return null;
    }
    const ghostId = `ghost_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const player: Player = {
      id: ghostId,
      name,
      balance: STARTING_BALANCE,
      isHost: false,
      streak: 0,
    };
    room.players.push(player);
    room.lastActivity = Date.now();
    return player;
  }

  removePlayer(code: string, socketId: string): void {
    const room = this.rooms.get(code);
    if (!room) return;

    const player = room.players.find((p) => p.id === socketId);
    if (player?.rejoinToken) {
      this.rejoinTokens.delete(player.rejoinToken);
    }

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
      reactions: {},
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

    if (side === "yes") {
      market.qYes += shares;
    } else {
      market.qNo += shares;
    }

    market.yesPrice = priceYes(market.qYes, market.qNo, market.b);
    market.noPrice = priceNo(market.qYes, market.qNo, market.b);

    market.priceHistory.push({
      timestamp: Date.now(),
      yesPrice: market.yesPrice,
    });

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

    player.balance -= amount;
    room.lastActivity = Date.now();

    return { shares };
  }

  resolveMarket(
    code: string,
    marketId: string,
    resolution: "yes" | "no"
  ): { payouts: Record<string, number>; streaks: Record<string, number> } {
    const room = this.rooms.get(code)!;
    const market = room.markets.find((m) => m.id === marketId)!;

    market.status = "resolved";
    market.resolution = resolution;
    market.resolvedAt = Date.now();

    const payouts: Record<string, number> = {};
    const streaks: Record<string, number> = {};

    for (const [playerId, position] of Object.entries(market.positions)) {
      const payout = calculatePayout(position, resolution);
      payouts[playerId] = Math.round(payout * 100) / 100;
      const player = room.players.find((p) => p.id === playerId);
      if (player) {
        player.balance += payout;
        player.balance = Math.round(player.balance * 100) / 100;

        const wonShares = resolution === "yes" ? position.yesShares : position.noShares;
        const lostShares = resolution === "yes" ? position.noShares : position.yesShares;
        if (wonShares > 0 && wonShares >= lostShares) {
          player.streak += 1;
        } else if (lostShares > 0) {
          player.streak = 0;
        }
        streaks[playerId] = player.streak;
      }
    }

    room.lastActivity = Date.now();
    return { payouts, streaks };
  }

  addReaction(
    code: string,
    marketId: string,
    playerId: string,
    emoji: string
  ): Record<string, number> | null {
    const room = this.rooms.get(code);
    if (!room) return null;
    const market = room.markets.find((m) => m.id === marketId);
    if (!market) return null;

    if (!market.reactions[emoji]) {
      market.reactions[emoji] = new Set();
    }

    if (market.reactions[emoji].has(playerId)) {
      market.reactions[emoji].delete(playerId);
      if (market.reactions[emoji].size === 0) {
        delete market.reactions[emoji];
      }
    } else {
      market.reactions[emoji].add(playerId);
    }

    const counts: Record<string, number> = {};
    for (const [e, playerSet] of Object.entries(market.reactions)) {
      counts[e] = playerSet.size;
    }
    return counts;
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

    const reactions: Record<string, number> = {};
    for (const [emoji, playerSet] of Object.entries(market.reactions)) {
      reactions[emoji] = playerSet.size;
    }

    const myReactions: string[] = [];
    for (const [emoji, playerSet] of Object.entries(market.reactions)) {
      if (playerSet.has(forPlayerId)) {
        myReactions.push(emoji);
      }
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
      reactions,
      myReactions,
    };
  }

  getRoomView(code: string, forPlayerId: string): RoomView | null {
    const room = this.rooms.get(code);
    if (!room) return null;

    return {
      code: room.code,
      hostId: room.hostId,
      players: room.players.map((p) => ({
        id: p.id,
        name: p.name,
        balance: p.balance,
        isHost: p.isHost,
        streak: p.streak,
        disconnected: !!p.disconnectedAt,
      })),
      markets: room.markets.map((m) => this.getMarketView(code, m.id, forPlayerId)!),
    };
  }

  getLeaderboard(
    code: string
  ): { playerId: string; name: string; balance: number; streak: number }[] {
    const room = this.rooms.get(code);
    if (!room) return [];
    return room.players
      .map((p) => ({ playerId: p.id, name: p.name, balance: p.balance, streak: p.streak }))
      .sort((a, b) => b.balance - a.balance);
  }

  getRoomCount(): number {
    return this.rooms.size;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [code, room] of this.rooms) {
      // Prune players past grace period
      const expired = room.players.filter(
        (p) => p.disconnectedAt && now - p.disconnectedAt > REJOIN_GRACE_MS
      );
      for (const p of expired) {
        if (p.rejoinToken) this.rejoinTokens.delete(p.rejoinToken);
        this.playerToRoom.delete(p.id);
      }
      room.players = room.players.filter(
        (p) => !p.disconnectedAt || now - p.disconnectedAt <= REJOIN_GRACE_MS
      );

      // Remove empty or inactive rooms
      if (room.players.length === 0 || now - room.lastActivity > MAX_INACTIVE_MS) {
        for (const p of room.players) {
          this.playerToRoom.delete(p.id);
          if (p.rejoinToken) this.rejoinTokens.delete(p.rejoinToken);
        }
        this.rooms.delete(code);
      }
    }
  }
}
