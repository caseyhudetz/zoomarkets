import { Server as SocketServer, Socket } from "socket.io";
import { RoomManager } from "../state/RoomManager";
import type { ClientToServerEvents, ServerToClientEvents } from "../../src/types/events";

type TypedServer = SocketServer<ClientToServerEvents, ServerToClientEvents>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

// Simple per-socket rate limiter
const rateLimits = new Map<string, number[]>();
const RATE_WINDOW_MS = 5000;
const RATE_MAX_EVENTS = 20;

function isRateLimited(socketId: string): boolean {
  const now = Date.now();
  let timestamps = rateLimits.get(socketId);
  if (!timestamps) {
    timestamps = [];
    rateLimits.set(socketId, timestamps);
  }
  while (timestamps.length > 0 && timestamps[0] <= now - RATE_WINDOW_MS) {
    timestamps.shift();
  }
  if (timestamps.length >= RATE_MAX_EVENTS) {
    return true;
  }
  timestamps.push(now);
  return false;
}

function broadcastLeaderboard(io: TypedServer, rooms: RoomManager, code: string) {
  const rankings = rooms.getLeaderboard(code);
  io.to(code).emit("leaderboard:updated", { rankings });
}

/** Intentional leave (user clicked "Leave") — remove immediately */
function handleLeave(socket: TypedSocket, io: TypedServer, rooms: RoomManager) {
  const room = rooms.getRoomForPlayer(socket.id);
  if (!room) return;

  const wasHost = room.hostId === socket.id;
  const code = room.code;

  rooms.removePlayer(code, socket.id);
  socket.leave(code);

  const updatedRoom = rooms.getRoom(code);
  if (!updatedRoom || updatedRoom.players.length === 0) {
    io.to(code).emit("room:closed");
    return;
  }

  io.to(code).emit("room:playerLeft", { playerId: socket.id });

  if (wasHost) {
    // Find a connected, non-ghost player to be host
    const newHost = updatedRoom.players.find(
      (p) => !p.disconnectedAt && !p.id.startsWith("ghost_")
    ) || updatedRoom.players[0];
    rooms.setHost(code, newHost.id);
    io.to(code).emit("room:hostChanged", { newHostId: newHost.id });
  }

  broadcastLeaderboard(io, rooms, code);
}

/** Socket disconnect — mark as disconnected with grace period for rejoin */
function handleDisconnect(socket: TypedSocket, io: TypedServer, rooms: RoomManager) {
  const room = rooms.getRoomForPlayer(socket.id);
  if (!room) return;

  const code = room.code;
  rooms.markDisconnected(socket.id);
  socket.leave(code);

  // Notify others this player is temporarily offline
  io.to(code).emit("room:playerDisconnected", { playerId: socket.id });

  // If host disconnected, transfer host to a connected player
  if (room.hostId === socket.id) {
    const connectedPlayer = room.players.find(
      (p) => p.id !== socket.id && !p.disconnectedAt && !p.id.startsWith("ghost_")
    );
    if (connectedPlayer) {
      rooms.setHost(code, connectedPlayer.id);
      io.to(code).emit("room:hostChanged", { newHostId: connectedPlayer.id });
    }
  }
}

function emitRejoinToken(socket: TypedSocket, rooms: RoomManager, code: string) {
  const token = rooms.generateRejoinToken(code, socket.id);
  if (token) {
    socket.emit("room:rejoinToken", { token, roomCode: code });
  }
}

export function registerSocketHandlers(io: TypedServer, rooms: RoomManager) {
  io.on("connection", (socket: TypedSocket) => {
    console.log(`Connected: ${socket.id}`);

    // Rate-limit middleware for all events
    socket.use((event, next) => {
      if (isRateLimited(socket.id)) {
        console.log(`[RATE] ${socket.id} rate limited`);
        return next(new Error("Rate limited"));
      }
      next();
    });

    socket.on("room:create", ({ playerName }) => {
      const existing = rooms.getRoomForPlayer(socket.id);
      if (existing) {
        handleLeave(socket, io, rooms);
      }

      const code = rooms.createRoom(socket.id, playerName);
      socket.join(code);
      socket.emit("room:created", { code });
      const view = rooms.getRoomView(code, socket.id);
      if (view) socket.emit("room:joined", { room: view });
      emitRejoinToken(socket, rooms, code);
    });

    socket.on("room:join", ({ code, playerName }) => {
      const normalizedCode = code.toUpperCase();

      const existing = rooms.getRoomForPlayer(socket.id);
      if (existing && existing.code !== normalizedCode) {
        handleLeave(socket, io, rooms);
      }

      const result = rooms.joinRoom(normalizedCode, socket.id, playerName);

      if (result.error) {
        socket.emit("room:error", { message: result.error });
        return;
      }

      if (result.alreadyInRoom) {
        socket.join(normalizedCode);
        const view = rooms.getRoomView(normalizedCode, socket.id);
        if (view) socket.emit("room:joined", { room: view });
        emitRejoinToken(socket, rooms, normalizedCode);
        return;
      }

      socket.join(normalizedCode);

      const view = rooms.getRoomView(normalizedCode, socket.id);
      if (view) socket.emit("room:joined", { room: view });

      const player = rooms.getPlayer(normalizedCode, socket.id);
      if (player) {
        socket.to(normalizedCode).emit("room:playerJoined", { player: { ...player, streak: player.streak } });
      }

      emitRejoinToken(socket, rooms, normalizedCode);
      broadcastLeaderboard(io, rooms, normalizedCode);
    });

    socket.on("room:rejoin", ({ code, rejoinToken }) => {
      const normalizedCode = code.toUpperCase();
      console.log(`[REJOIN] Attempting rejoin to ${normalizedCode} with token ${rejoinToken}`);

      const result = rooms.rejoinPlayer(normalizedCode, rejoinToken, socket.id);
      if (!result) {
        console.log(`[REJOIN] Failed — token expired or invalid`);
        socket.emit("room:error", { message: "Session expired, please rejoin" });
        return;
      }

      console.log(`[REJOIN] Success! ${result.player.name} restored`);
      socket.join(result.roomCode);

      const view = rooms.getRoomView(result.roomCode, socket.id);
      if (view) socket.emit("room:rejoined", { room: view });

      // Notify others
      io.to(result.roomCode).emit("room:playerReconnected", {
        playerId: result.player.id,
        newId: socket.id,
      });

      emitRejoinToken(socket, rooms, result.roomCode);
      broadcastLeaderboard(io, rooms, result.roomCode);
    });

    socket.on("room:leave", () => {
      handleLeave(socket, io, rooms);
    });

    socket.on("room:importPlayers", ({ names }: { names: string[] }) => {
      const room = rooms.getRoomForPlayer(socket.id);
      if (!room) return;

      console.log(`[IMPORT] Importing ${names.length} players`);
      const added: { id: string; name: string; balance: number; isHost: boolean; streak: number }[] = [];
      for (const name of names) {
        const player = rooms.addGhostPlayer(room.code, name);
        if (player) {
          added.push({ id: player.id, name: player.name, balance: player.balance, isHost: player.isHost, streak: player.streak });
          io.to(room.code).emit("room:playerJoined", { player: { id: player.id, name: player.name, balance: player.balance, isHost: player.isHost, streak: player.streak } });
        }
      }
      console.log(`[IMPORT] Added ${added.length} ghost players`);
      if (added.length > 0) {
        broadcastLeaderboard(io, rooms, room.code);
      }
    });

    socket.on("market:create", ({ question }) => {
      const room = rooms.getRoomForPlayer(socket.id);
      if (!room) return;

      const market = rooms.createMarket(room.code, question);
      for (const player of room.players) {
        if (!player.disconnectedAt) {
          const view = rooms.getMarketView(room.code, market.id, player.id);
          if (view) {
            io.to(player.id).emit("market:created", { market: view });
          }
        }
      }
    });

    socket.on("market:bet", ({ marketId, side, amount }) => {
      const room = rooms.getRoomForPlayer(socket.id);
      if (!room) {
        console.log(`[BET] No room found for ${socket.id}`);
        return;
      }

      console.log(`[BET] ${socket.id} betting ${amount} Clout on ${side} in market ${marketId.slice(0,8)}`);

      const bettor = rooms.getPlayer(room.code, socket.id);
      const market = rooms.getRoom(room.code)?.markets.find(m => m.id === marketId);

      const result = rooms.placeBet(
        room.code,
        marketId,
        socket.id,
        side,
        amount
      );
      if (result.error) {
        console.log(`[BET] Error: ${result.error}`);
        socket.emit("room:error", { message: result.error });
        return;
      }

      console.log(`[BET] Success! Got ${result.shares?.toFixed(2)} shares`);

      const updatedRoom = rooms.getRoom(room.code);
      if (!updatedRoom) return;

      // Send personalized market view to each connected player
      for (const player of updatedRoom.players) {
        if (!player.disconnectedAt) {
          const view = rooms.getMarketView(room.code, marketId, player.id);
          if (view) {
            io.to(player.id).emit("market:updated", { market: view });
          }
        }
      }

      for (const player of updatedRoom.players) {
        if (!player.disconnectedAt) {
          io.to(player.id).emit("player:balanceUpdated", {
            playerId: player.id,
            newBalance: player.balance,
          });
        }
      }

      // Broadcast bet feed
      if (bettor && market) {
        io.to(room.code).emit("bet:placed", {
          playerName: bettor.name,
          side,
          amount,
          marketQuestion: market.question,
        });
      }

      broadcastLeaderboard(io, rooms, room.code);
    });

    socket.on("market:resolve", ({ marketId, resolution }) => {
      const room = rooms.getRoomForPlayer(socket.id);
      if (!room || room.hostId !== socket.id) {
        console.log(`[RESOLVE] Rejected: not host or no room`);
        return;
      }

      console.log(`[RESOLVE] Market ${marketId.slice(0,8)} resolved as ${resolution.toUpperCase()}`);

      const { payouts, streaks } = rooms.resolveMarket(room.code, marketId, resolution);
      console.log(`[RESOLVE] Payouts:`, payouts);

      const updatedRoom = rooms.getRoom(room.code);
      if (!updatedRoom) return;

      for (const player of updatedRoom.players) {
        if (!player.disconnectedAt) {
          const view = rooms.getMarketView(room.code, marketId, player.id);
          if (view) {
            io.to(player.id).emit("market:resolved", { market: view, payouts, streaks });
            io.to(player.id).emit("player:balanceUpdated", {
              playerId: player.id,
              newBalance: player.balance,
            });
          }
        }
      }

      broadcastLeaderboard(io, rooms, room.code);
    });

    socket.on("market:react", ({ marketId, emoji }) => {
      const room = rooms.getRoomForPlayer(socket.id);
      if (!room) return;

      const counts = rooms.addReaction(room.code, marketId, socket.id, emoji);
      if (counts) {
        io.to(room.code).emit("market:reactionsUpdated", { marketId, reactions: counts });
      }
    });

    socket.on("disconnect", () => {
      console.log(`Disconnected: ${socket.id}`);
      rateLimits.delete(socket.id);
      handleDisconnect(socket, io, rooms);
    });
  });
}
