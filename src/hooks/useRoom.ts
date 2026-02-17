"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import type { TypedSocket } from "./useSocket";
import type { RoomView, MarketView, Player } from "@/types/shared";
import type { BetFeedEntry } from "@/components/room/BetFeedToast";

let feedId = 0;

export function useRoom(socket: TypedSocket | null) {
  const [room, setRoom] = useState<RoomView | null>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [betFeed, setBetFeed] = useState<BetFeedEntry[]>([]);
  const [lastStreaks, setLastStreaks] = useState<Record<string, number>>({});
  const rejoinTokenRef = useRef<string | null>(null);

  // Track socket.id — it's only available after connect
  useEffect(() => {
    if (!socket) return;

    function updateId() {
      setMyId(socket!.id ?? null);
    }

    if (socket.connected) {
      updateId();
    }

    socket.on("connect", updateId);
    return () => {
      socket.off("connect", updateId);
    };
  }, [socket]);

  // Auto-expire bet feed toasts after 4s
  useEffect(() => {
    if (betFeed.length === 0) return;
    const timer = setTimeout(() => {
      setBetFeed((prev) => prev.slice(1));
    }, 4000);
    return () => clearTimeout(timer);
  }, [betFeed]);

  useEffect(() => {
    if (!socket) return;

    function onJoined({ room }: { room: RoomView }) {
      setRoom(room);
      setError(null);
      setMyId(socket!.id ?? null);
    }

    function onRejoined({ room }: { room: RoomView }) {
      setRoom(room);
      setError(null);
      setMyId(socket!.id ?? null);
    }

    function onRejoinToken({ token, roomCode }: { token: string; roomCode: string }) {
      rejoinTokenRef.current = token;
      // Persist for page refreshes
      try {
        sessionStorage.setItem("zoo_rejoinToken", token);
        sessionStorage.setItem("zoo_rejoinCode", roomCode);
      } catch {}
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

    function onPlayerDisconnected({ playerId }: { playerId: string }) {
      setRoom((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          players: prev.players.map((p) =>
            p.id === playerId ? { ...p, disconnected: true } : p
          ),
        };
      });
    }

    function onPlayerReconnected({ playerId, newId }: { playerId: string; newId: string }) {
      setRoom((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          players: prev.players.map((p) =>
            p.id === playerId ? { ...p, id: newId, disconnected: false } : p
          ),
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
      streaks,
    }: {
      market: MarketView;
      payouts: Record<string, number>;
      streaks: Record<string, number>;
    }) {
      setRoom((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          markets: prev.markets.map((m) =>
            m.id === market.id ? market : m
          ),
          // Update streaks on players
          players: prev.players.map((p) =>
            streaks[p.id] !== undefined
              ? { ...p, streak: streaks[p.id] }
              : p
          ),
        };
      });
      setLastStreaks(streaks ?? {});
    }

    function onReactionsUpdated({
      marketId,
      reactions,
    }: {
      marketId: string;
      reactions: Record<string, number>;
    }) {
      setRoom((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          markets: prev.markets.map((m) =>
            m.id === marketId ? { ...m, reactions } : m
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
      rankings: { playerId: string; name: string; balance: number; streak: number }[];
    }) {
      setRoom((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          players: prev.players.map((p) => {
            const rank = rankings.find((r) => r.playerId === p.id);
            return rank
              ? { ...p, balance: rank.balance, streak: rank.streak }
              : p;
          }),
        };
      });
    }

    function onBetPlaced(data: {
      playerName: string;
      side: "yes" | "no";
      amount: number;
      marketQuestion: string;
    }) {
      const entry: BetFeedEntry = {
        id: String(++feedId),
        playerName: data.playerName,
        side: data.side,
        amount: data.amount,
        marketQuestion: data.marketQuestion,
        timestamp: Date.now(),
      };
      setBetFeed((prev) => [...prev.slice(-2), entry]);
    }

    socket.on("room:joined", onJoined);
    socket.on("room:rejoined", onRejoined);
    socket.on("room:rejoinToken", onRejoinToken);
    socket.on("room:error", onError);
    socket.on("room:playerJoined", onPlayerJoined);
    socket.on("room:playerLeft", onPlayerLeft);
    socket.on("room:playerDisconnected", onPlayerDisconnected);
    socket.on("room:playerReconnected", onPlayerReconnected);
    socket.on("room:hostChanged", onHostChanged);
    socket.on("room:closed", onClosed);
    socket.on("market:created", onMarketCreated);
    socket.on("market:updated", onMarketUpdated);
    socket.on("market:resolved", onMarketResolved);
    socket.on("market:reactionsUpdated", onReactionsUpdated);
    socket.on("player:balanceUpdated", onBalanceUpdated);
    socket.on("leaderboard:updated", onLeaderboard);
    socket.on("bet:placed", onBetPlaced);

    return () => {
      socket.off("room:joined", onJoined);
      socket.off("room:rejoined", onRejoined);
      socket.off("room:rejoinToken", onRejoinToken);
      socket.off("room:error", onError);
      socket.off("room:playerJoined", onPlayerJoined);
      socket.off("room:playerLeft", onPlayerLeft);
      socket.off("room:playerDisconnected", onPlayerDisconnected);
      socket.off("room:playerReconnected", onPlayerReconnected);
      socket.off("room:hostChanged", onHostChanged);
      socket.off("room:closed", onClosed);
      socket.off("market:created", onMarketCreated);
      socket.off("market:updated", onMarketUpdated);
      socket.off("market:resolved", onMarketResolved);
      socket.off("market:reactionsUpdated", onReactionsUpdated);
      socket.off("player:balanceUpdated", onBalanceUpdated);
      socket.off("leaderboard:updated", onLeaderboard);
      socket.off("bet:placed", onBetPlaced);
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

  const rejoinRoom = useCallback(
    (code: string) => {
      const token =
        rejoinTokenRef.current ||
        (typeof window !== "undefined"
          ? sessionStorage.getItem("zoo_rejoinToken")
          : null);
      if (!token || !socket) return false;
      socket.emit("room:rejoin", { code: code.toUpperCase(), rejoinToken: token });
      return true;
    },
    [socket]
  );

  const leaveRoom = useCallback(() => {
    socket?.emit("room:leave");
    rejoinTokenRef.current = null;
    try {
      sessionStorage.removeItem("zoo_rejoinToken");
      sessionStorage.removeItem("zoo_rejoinCode");
    } catch {}
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

  const reactToMarket = useCallback(
    (marketId: string, emoji: string) => {
      socket?.emit("market:react", { marketId, emoji });
      // Optimistic toggle on myReactions
      setRoom((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          markets: prev.markets.map((m) => {
            if (m.id !== marketId) return m;
            const already = m.myReactions?.includes(emoji);
            return {
              ...m,
              myReactions: already
                ? (m.myReactions ?? []).filter((e) => e !== emoji)
                : [...(m.myReactions ?? []), emoji],
              reactions: {
                ...(m.reactions ?? {}),
                [emoji]: ((m.reactions ?? {})[emoji] || 0) + (already ? -1 : 1),
              },
            };
          }),
        };
      });
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
  const myRank = myId
    ? [...(room?.players ?? [])].sort((a, b) => b.balance - a.balance).findIndex((p) => p.id === myId) + 1
    : 0;

  return {
    room,
    myId,
    isHost,
    myBalance,
    myRank,
    error,
    betFeed,
    lastStreaks,
    createRoom,
    joinRoom,
    rejoinRoom,
    leaveRoom,
    createMarket,
    placeBet,
    resolveMarket,
    reactToMarket,
    importPlayers,
  };
}
