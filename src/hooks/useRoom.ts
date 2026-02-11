"use client";

import { useEffect, useState, useCallback } from "react";
import type { TypedSocket } from "./useSocket";
import type { RoomView, MarketView, Player } from "@/types/shared";

export function useRoom(socket: TypedSocket | null) {
  const [room, setRoom] = useState<RoomView | null>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Track socket.id — it's only available after connect
  useEffect(() => {
    if (!socket) return;

    function updateId() {
      setMyId(socket!.id ?? null);
    }

    // Set immediately if already connected
    if (socket.connected) {
      updateId();
    }

    socket.on("connect", updateId);
    return () => {
      socket.off("connect", updateId);
    };
  }, [socket]);

  useEffect(() => {
    if (!socket) return;

    function onJoined({ room }: { room: RoomView }) {
      setRoom(room);
      setError(null);
      // Also update myId in case it wasn't set yet
      setMyId(socket!.id ?? null);
    }

    function onError({ message }: { message: string }) {
      setError(message);
      setTimeout(() => setError(null), 4000);
    }

    function onPlayerJoined({ player }: { player: Player }) {
      setRoom((prev) => {
        if (!prev) return prev;
        if (prev.players.find((p) => p.id === player.id)) return prev;
        return { ...prev, players: [...prev.players, player] };
      });
    }

    function onPlayerLeft({ playerId }: { playerId: string }) {
      setRoom((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          players: prev.players.filter((p) => p.id !== playerId),
        };
      });
    }

    function onHostChanged({ newHostId }: { newHostId: string }) {
      setRoom((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          hostId: newHostId,
          players: prev.players.map((p) => ({
            ...p,
            isHost: p.id === newHostId,
          })),
        };
      });
    }

    function onClosed() {
      setRoom(null);
    }

    function onMarketCreated({ market }: { market: MarketView }) {
      setRoom((prev) => {
        if (!prev) return prev;
        // Avoid duplicate if we get created + updated for same market
        if (prev.markets.find((m) => m.id === market.id)) {
          return {
            ...prev,
            markets: prev.markets.map((m) =>
              m.id === market.id ? market : m
            ),
          };
        }
        return { ...prev, markets: [...prev.markets, market] };
      });
    }

    function onMarketUpdated({ market }: { market: MarketView }) {
      setRoom((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          markets: prev.markets.map((m) =>
            m.id === market.id ? market : m
          ),
        };
      });
    }

    function onMarketResolved({
      market,
    }: {
      market: MarketView;
      payouts: Record<string, number>;
    }) {
      setRoom((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          markets: prev.markets.map((m) =>
            m.id === market.id ? market : m
          ),
        };
      });
    }

    function onBalanceUpdated({
      playerId,
      newBalance,
    }: {
      playerId: string;
      newBalance: number;
    }) {
      setRoom((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          players: prev.players.map((p) =>
            p.id === playerId ? { ...p, balance: newBalance } : p
          ),
        };
      });
    }

    function onLeaderboard({
      rankings,
    }: {
      rankings: { playerId: string; name: string; balance: number }[];
    }) {
      setRoom((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          players: prev.players.map((p) => {
            const rank = rankings.find((r) => r.playerId === p.id);
            return rank ? { ...p, balance: rank.balance } : p;
          }),
        };
      });
    }

    socket.on("room:joined", onJoined);
    socket.on("room:error", onError);
    socket.on("room:playerJoined", onPlayerJoined);
    socket.on("room:playerLeft", onPlayerLeft);
    socket.on("room:hostChanged", onHostChanged);
    socket.on("room:closed", onClosed);
    socket.on("market:created", onMarketCreated);
    socket.on("market:updated", onMarketUpdated);
    socket.on("market:resolved", onMarketResolved);
    socket.on("player:balanceUpdated", onBalanceUpdated);
    socket.on("leaderboard:updated", onLeaderboard);

    return () => {
      socket.off("room:joined", onJoined);
      socket.off("room:error", onError);
      socket.off("room:playerJoined", onPlayerJoined);
      socket.off("room:playerLeft", onPlayerLeft);
      socket.off("room:hostChanged", onHostChanged);
      socket.off("room:closed", onClosed);
      socket.off("market:created", onMarketCreated);
      socket.off("market:updated", onMarketUpdated);
      socket.off("market:resolved", onMarketResolved);
      socket.off("player:balanceUpdated", onBalanceUpdated);
      socket.off("leaderboard:updated", onLeaderboard);
    };
  }, [socket]);

  const createRoom = useCallback(
    (playerName: string) => {
      socket?.emit("room:create", { playerName });
    },
    [socket]
  );

  const joinRoom = useCallback(
    (code: string, playerName: string) => {
      socket?.emit("room:join", { code: code.toUpperCase(), playerName });
    },
    [socket]
  );

  const leaveRoom = useCallback(() => {
    socket?.emit("room:leave");
    setRoom(null);
  }, [socket]);

  const createMarket = useCallback(
    (question: string) => {
      socket?.emit("market:create", { question });
    },
    [socket]
  );

  const placeBet = useCallback(
    (marketId: string, side: "yes" | "no", amount: number) => {
      socket?.emit("market:bet", { marketId, side, amount });
    },
    [socket]
  );

  const resolveMarket = useCallback(
    (marketId: string, resolution: "yes" | "no") => {
      socket?.emit("market:resolve", { marketId, resolution });
    },
    [socket]
  );

  const importPlayers = useCallback(
    (names: string[]) => {
      socket?.emit("room:importPlayers", { names });
    },
    [socket]
  );

  const isHost = !!(myId && room?.hostId === myId);
  const myPlayer = myId ? room?.players.find((p) => p.id === myId) : null;
  const myBalance = myPlayer?.balance ?? 1000;

  return {
    room,
    myId,
    isHost,
    myBalance,
    error,
    createRoom,
    joinRoom,
    leaveRoom,
    createMarket,
    placeBet,
    resolveMarket,
    importPlayers,
  };
}
