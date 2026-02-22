"use client";

import { useEffect, useState, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from "@/hooks/useSocket";
import { useRoom } from "@/hooks/useRoom";
import { useSounds } from "@/hooks/useSounds";
import { RoomHeader } from "@/components/room/RoomHeader";
import { MarketCard } from "@/components/room/MarketCard";
import { Leaderboard } from "@/components/room/Leaderboard";
import { CreateMarketModal } from "@/components/room/CreateMarketModal";
import { Confetti } from "@/components/effects/Confetti";
import { BetFeedToast } from "@/components/room/BetFeedToast";
import { MobileBottomBar } from "@/components/room/MobileBottomBar";
import { BottomSheet } from "@/components/room/BottomSheet";

export default function RoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const upperCode = code.toUpperCase();
  const router = useRouter();
  const { socket, isConnected } = useSocket();
  const {
    room,
    myId,
    isHost,
    myBalance,
    myRank,
    error,
    betFeed,
    lastStreaks,
    joinRoom,
    rejoinRoom,
    leaveRoom,
    createMarket,
    placeBet,
    resolveMarket,
    reactToMarket,
    commentOnMarket,
  } = useRoom(socket);

  const { muted, toggleMute, playBetSound, playResolveSound, playStreakSound } =
    useSounds();

  const [showCreateMarket, setShowCreateMarket] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [joinName, setJoinName] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);

  const autoJoinAttempted = useRef(false);

  // Auto-join: try rejoin token first, then fall back to stored name
  useEffect(() => {
    if (!socket || !isConnected || autoJoinAttempted.current) return;
    if (room && room.code === upperCode) return;

    autoJoinAttempted.current = true;

    const rejoinCode = sessionStorage.getItem("zoo_rejoinCode");
    if (rejoinCode === upperCode) {
      const attempted = rejoinRoom(upperCode);
      if (attempted) return;
    }

    const storedName = sessionStorage.getItem("zoo_playerName");
    const storedCode = sessionStorage.getItem("zoo_roomCode");

    if (storedName && storedCode === upperCode) {
      sessionStorage.removeItem("zoo_playerName");
      sessionStorage.removeItem("zoo_roomCode");
      joinRoom(upperCode, storedName);
    }
  }, [socket, isConnected, room, upperCode, joinRoom, rejoinRoom]);

  // Play sounds on events
  useEffect(() => {
    if (!socket) return;

    function onBetPlaced() {
      playBetSound();
    }

    function onResolved() {
      playResolveSound();
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 100);
    }

    socket.on("bet:placed", onBetPlaced);
    socket.on("market:resolved", onResolved);
    return () => {
      socket.off("bet:placed", onBetPlaced);
      socket.off("market:resolved", onResolved);
    };
  }, [socket, playBetSound, playResolveSound]);

  // Play streak sound when my streak increases
  useEffect(() => {
    if (!myId || !lastStreaks[myId]) return;
    if (lastStreaks[myId] >= 2) {
      playStreakSound();
    }
  }, [lastStreaks, myId, playStreakSound]);

  // Track join errors
  useEffect(() => {
    if (error) {
      setJoinError(error);
      setTimeout(() => setJoinError(null), 4000);
    }
  }, [error]);

  function handleLeave() {
    leaveRoom();
    router.push("/");
  }

  function handleJoinFromPage() {
    if (!joinName.trim()) return;
    joinRoom(upperCode, joinName.trim());
  }

  const isInRoom = room && room.code === upperCode;

  if (!isInRoom) {
    return (
      <div className="min-h-screen grid-bg flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold">
              <span className="text-neon-green">Zoo</span>
              <span className="text-neon-blue">Markets</span>
            </h1>
            <p className="text-text-muted mt-2">
              Joining room{" "}
              <span className="font-mono text-neon-blue">{upperCode}</span>
            </p>
          </div>

          {joinError && (
            <div className="mb-4 p-3 rounded-lg bg-neon-red/10 border border-neon-red/30 text-neon-red text-sm text-center animate-slide-up">
              {joinError}
            </div>
          )}

          {!isConnected ? (
            <div className="text-center text-text-muted">Connecting...</div>
          ) : autoJoinAttempted.current && !joinError ? (
            <div className="text-center text-text-muted">Joining room...</div>
          ) : (
            <div className="bg-zoo-surface border border-zoo-border rounded-xl p-6 animate-slide-up">
              <input
                type="text"
                placeholder="Your display name"
                value={joinName}
                onChange={(e) => setJoinName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleJoinFromPage()}
                maxLength={20}
                autoFocus
                className="w-full p-3 rounded-lg bg-zoo-bg border border-zoo-border focus:border-neon-blue/50 focus:outline-none text-text-primary placeholder:text-text-muted transition-colors"
              />
              <button
                onClick={handleJoinFromPage}
                disabled={!joinName.trim()}
                className="w-full mt-4 p-3 rounded-lg bg-neon-blue/20 border border-neon-blue/40 text-neon-blue font-semibold hover:bg-neon-blue/30 transition-colors disabled:opacity-40"
              >
                Join Room
              </button>
              <button
                onClick={() => router.push("/")}
                className="w-full mt-2 text-center text-text-muted text-sm hover:text-text-secondary transition-colors"
              >
                Back to Home
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const openMarkets = room.markets.filter((m) => m.status === "open");
  const resolvedMarkets = room.markets.filter((m) => m.status === "resolved");

  return (
    <div className="min-h-screen bg-zoo-bg flex flex-col">
      <Confetti active={showConfetti} />

      <RoomHeader
        code={room.code}
        roomName={room.name}
        playerCount={room.players.length}
        myBalance={myBalance}
        isHost={isHost}
        muted={muted}
        onLeave={handleLeave}
        onToggleMute={toggleMute}
      />

      <div className="flex-1 flex flex-col lg:flex-row pb-16 lg:pb-0">
        {/* Main content */}
        <main className="flex-1 p-3 sm:p-4 overflow-y-auto">
          {room.markets.length === 0 && (
            <div className="text-center py-16 animate-fade-in">
              <h2 className="text-xl font-semibold text-text-secondary mb-2">
                No markets yet
              </h2>
              <p className="text-text-muted max-w-sm mx-auto">
                {isHost
                  ? 'Tap "New Market" below to create your first prediction!'
                  : "Waiting for the host to create a market..."}
              </p>
            </div>
          )}

          {openMarkets.length > 0 && (
            <div className="space-y-4 mb-6">
              <h2 className="text-xs text-text-muted uppercase tracking-wider font-semibold px-1">
                Active Markets
              </h2>
              {openMarkets.map((market) => (
                <MarketCard
                  key={market.id}
                  market={market}
                  isHost={isHost}
                  myBalance={myBalance}
                  onBet={placeBet}
                  onResolve={resolveMarket}
                  onReact={reactToMarket}
                  onComment={commentOnMarket}
                />
              ))}
            </div>
          )}

          {resolvedMarkets.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xs text-text-muted uppercase tracking-wider font-semibold px-1">
                Resolved
              </h2>
              {resolvedMarkets.map((market) => (
                <MarketCard
                  key={market.id}
                  market={market}
                  isHost={isHost}
                  myBalance={myBalance}
                  onBet={placeBet}
                  onResolve={resolveMarket}
                  onReact={reactToMarket}
                  onComment={commentOnMarket}
                />
              ))}
            </div>
          )}
        </main>

        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-80 p-4 border-l border-zoo-border space-y-4">
          <Leaderboard players={room.players} myId={myId} />

          <div className="bg-zoo-surface border border-zoo-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-zoo-border">
              <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
                Players ({room.players.length})
              </h3>
            </div>
            <div className="p-3 flex flex-wrap gap-2">
              {room.players.map((p) => (
                <span
                  key={p.id}
                  className={`text-xs px-2 py-1 rounded-full border ${
                    p.id === myId
                      ? "bg-neon-blue/10 border-neon-blue/30 text-neon-blue"
                      : p.disconnected
                        ? "bg-zoo-bg border-zoo-border text-text-muted opacity-50"
                        : "bg-zoo-bg border-zoo-border text-text-secondary"
                  }`}
                >
                  {p.name}
                  {p.isHost ? " (Host)" : ""}
                  {p.disconnected ? " (offline)" : ""}
                </span>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* Mobile Bottom Bar */}
      <MobileBottomBar
        myRank={myRank || 1}
        myBalance={myBalance}
        playerCount={room.players.length}
        onTap={() => setShowBottomSheet(true)}
      />

      {/* Mobile Bottom Sheet */}
      <BottomSheet
        isOpen={showBottomSheet}
        onClose={() => setShowBottomSheet(false)}
      >
        <Leaderboard players={room.players} myId={myId} />

        <div className="bg-zoo-surface border border-zoo-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-zoo-border">
            <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
              Players ({room.players.length})
            </h3>
          </div>
          <div className="p-3 flex flex-wrap gap-2">
            {room.players.map((p) => (
              <span
                key={p.id}
                className={`text-xs px-2 py-1 rounded-full border ${
                  p.id === myId
                    ? "bg-neon-blue/10 border-neon-blue/30 text-neon-blue"
                    : p.disconnected
                      ? "bg-zoo-bg border-zoo-border text-text-muted opacity-50"
                      : "bg-zoo-bg border-zoo-border text-text-secondary"
                }`}
              >
                {p.name}
                {p.isHost ? " (Host)" : ""}
                {p.disconnected ? " (offline)" : ""}
              </span>
            ))}
          </div>
        </div>
      </BottomSheet>

      <BetFeedToast entries={betFeed} />

      {/* FAB */}
      <div className="fixed bottom-20 lg:bottom-6 right-4 sm:right-6 flex flex-col gap-3 z-30">
        <button
          onClick={() => setShowCreateMarket(true)}
          className="px-5 py-3 rounded-xl bg-neon-blue text-zoo-bg font-bold shadow-lg hover:shadow-neon-blue/30 hover:scale-105 transition-all min-h-[48px]"
        >
          + New Market
        </button>
      </div>

      {error && (
        <div className="fixed top-20 left-4 right-4 sm:left-auto sm:right-6 sm:w-80 p-3 rounded-lg bg-neon-red/10 border border-neon-red/30 text-neon-red text-sm animate-slide-up z-50">
          {error}
        </div>
      )}

      {showCreateMarket && (
        <CreateMarketModal
          onClose={() => setShowCreateMarket(false)}
          onCreate={createMarket}
        />
      )}
    </div>
  );
}
