import { Server as SocketServer, Socket } from "socket.io";
import { RoomManager } from "../state/RoomManager";
import type { ClientToServerEvents, ServerToClientEvents } from "../../src/types/events";

type TypedServer = SocketServer<ClientToServerEvents, ServerToClientEvents>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

function broadcastLeaderboard(io: TypedServer, rooms: RoomManager, code: string) {
  const rankings = rooms.getLeaderboard(code);
  io.to(code).emit("leaderboard:updated", { rankings });
}

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
    const newHost = updatedRoom.players[0];
    rooms.setHost(code, newHost.id);
    io.to(code).emit("room:hostChanged", { newHostId: newHost.id });
  }

  broadcastLeaderboard(io, rooms, code);
}

export function registerSocketHandlers(io: TypedServer, rooms: RoomManager) {
  io.on("connection", (socket: TypedSocket) => {
    console.log(`Connected: ${socket.id}`);

    socket.on("room:create", ({ playerName }) => {
      // Leave any existing room first
      const existing = rooms.getRoomForPlayer(socket.id);
      if (existing) {
        handleLeave(socket, io, rooms);
      }

      const code = rooms.createRoom(socket.id, playerName);
      socket.join(code);
      socket.emit("room:created", { code });
      const view = rooms.getRoomView(code, socket.id);
      if (view) socket.emit("room:joined", { room: view });
    });

    socket.on("room:join", ({ code, playerName }) => {
      const normalizedCode = code.toUpperCase();

      // If player is in a DIFFERENT room, leave it first
      const existing = rooms.getRoomForPlayer(socket.id);
      if (existing && existing.code !== normalizedCode) {
        handleLeave(socket, io, rooms);
      }

      const result = rooms.joinRoom(normalizedCode, socket.id, playerName);

      if (result.error) {
        socket.emit("room:error", { message: result.error });
        return;
      }

      // If already in room (e.g. creator navigating to room page), just re-emit state
      if (result.alreadyInRoom) {
        socket.join(normalizedCode);
        const view = rooms.getRoomView(normalizedCode, socket.id);
        if (view) socket.emit("room:joined", { room: view });
        return;
      }

      socket.join(normalizedCode);

      const view = rooms.getRoomView(normalizedCode, socket.id);
      if (view) socket.emit("room:joined", { room: view });

      const player = rooms.getPlayer(normalizedCode, socket.id);
      if (player) {
        socket.to(normalizedCode).emit("room:playerJoined", { player });
      }

      broadcastLeaderboard(io, rooms, normalizedCode);
    });

    socket.on("room:leave", () => {
      handleLeave(socket, io, rooms);
    });

    // Any player can bulk-import player names (e.g. from Zoom participant list)
    socket.on("room:importPlayers", ({ names }: { names: string[] }) => {
      const room = rooms.getRoomForPlayer(socket.id);
      if (!room) return;

      console.log(`[IMPORT] Host importing ${names.length} players`);
      const added: any[] = [];
      for (const name of names) {
        const player = rooms.addGhostPlayer(room.code, name);
        if (player) {
          added.push(player);
          io.to(room.code).emit("room:playerJoined", { player });
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
      // Send to each player with their personalized view
      for (const player of room.players) {
        const view = rooms.getMarketView(room.code, market.id, player.id);
        if (view) {
          io.to(player.id).emit("market:created", { market: view });
        }
      }
    });

    socket.on("market:bet", ({ marketId, side, amount }) => {
      const room = rooms.getRoomForPlayer(socket.id);
      if (!room) {
        console.log(`[BET] No room found for ${socket.id}`);
        return;
      }

      console.log(`[BET] ${socket.id} betting $${amount} on ${side} in market ${marketId.slice(0,8)}`);

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

      // Get fresh room state after bet
      const updatedRoom = rooms.getRoom(room.code);
      if (!updatedRoom) return;

      // Send personalized market view to each player
      for (const player of updatedRoom.players) {
        const view = rooms.getMarketView(room.code, marketId, player.id);
        if (view) {
          io.to(player.id).emit("market:updated", { market: view });
        }
      }

      // Broadcast balance updates for ALL players (not just the bettor)
      for (const player of updatedRoom.players) {
        io.to(player.id).emit("player:balanceUpdated", {
          playerId: player.id,
          newBalance: player.balance,
        });
        console.log(`[BET] Sent balance update: ${player.name} = $${player.balance.toFixed(2)}`);
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

      const payouts = rooms.resolveMarket(room.code, marketId, resolution);
      console.log(`[RESOLVE] Payouts:`, payouts);

      // Get fresh room state
      const updatedRoom = rooms.getRoom(room.code);
      if (!updatedRoom) return;

      // Send personalized resolution view to each player
      for (const player of updatedRoom.players) {
        const view = rooms.getMarketView(room.code, marketId, player.id);
        if (view) {
          io.to(player.id).emit("market:resolved", { market: view, payouts });
          io.to(player.id).emit("player:balanceUpdated", {
            playerId: player.id,
            newBalance: player.balance,
          });
          console.log(`[RESOLVE] ${player.name} new balance: $${player.balance.toFixed(2)}`);
        }
      }

      broadcastLeaderboard(io, rooms, room.code);
    });

    socket.on("disconnect", () => {
      console.log(`Disconnected: ${socket.id}`);
      handleLeave(socket, io, rooms);
    });
  });
}
