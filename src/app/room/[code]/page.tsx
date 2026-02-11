"use client";

import { useEffect, useState, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from "@/hooks/useSocket";
import { useRoom } from "@/hooks/useRoom";
import { RoomHeader } from "@/components/room/RoomHeader";
import { MarketCard } from "@/components/room/MarketCard";
import { Leaderboard } from "@/components/room/Leaderboard";
import { CreateMarketModal } from "@/components/room/CreateMarketModal";
import { ZoomImportModal } from "@/components/room/ZoomImportModal";
import { Confetti } from "@/components/effects/Confetti";

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
    error,
    joinRoom,
    leaveRoom,
    createMarket,
    placeBet,
    resolveMarket,
    importPlayers,
  } = useRoom(socket);

  const [showCreateMarket, setShowCreateMarket] = useState(false);
  const [showZoomImport, setShowZoomImport] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [joinName, setJoinName] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);

  // Track whether we've attempted auto-join
  const autoJoinAttempted = useRef(false);

  // Auto-join: if we came from the landing page with a stored name, join automatically
  useEffect(() => {
    if (!socket || !isConnected || autoJoinAttempted.current) return;
    if (room && room.code === upperCode) return; // Already in this room

    const storedName = sessionStorage.getItem("zoo_playerName");
    const storedCode = sessionStorage.getItem("zoo_roomCode");

    if (storedName && storedCode === upperCode) {
      autoJoinAttempted.current = true;
      // Clear sessionStorage
      sessionStorage.removeItem("zoo_playerName");
      sessionStorage.removeItem("zoo_roomCode");

      // The socket may already be in the room (if we created it on the landing page).
      // Emit room:join — the server handles the case where we're already in the room.
      // Actually, for the creator: the server's room:create already added us.
      // But the room page's useRoom hook hasn't received room:joined yet because
      // the handler registered AFTER the event fired on the landing page.
      // Solution: emit room:join which will either re-join or get "Already in room".
      // But "Already in room" is an error... Let's handle this differently.

      // We'll just emit join. If we get "Already in room", that means we created it.
      // In that case we need to get the room state. Let's add a "room:rejoin" flow
      // or just handle the error gracefully.

      // Simplest fix: on the server, if "Already in room", just re-emit room:joined.
      joinRoom(upperCode, storedName);
    }
  }, [socket, isConnected, room, upperCode, joinRoom]);

  // Show confetti on market resolution
  useEffect(() => {
    if (!socket) return;
    function onResolved() {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 100);
    }
    socket.on("market:resolved", onResolved);
    return () => {
      socket.off("market:resolved", onResolved);
    };
  }, [socket]);

  // Track join errors separately
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

  // Determine if we're in the room
  const isInRoom = room && room.code === upperCode;

  // Not connected yet or not in the room — show join form
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
        playerCount={room.players.length}
        myBalance={myBalance}
        isHost={isHost}
        onLeave={handleLeave}
      />

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Main content */}
        <main className="flex-1 p-4 overflow-y-auto">
          {/* Empty state */}
          {room.markets.length === 0 && (
            <div className="text-center py-16 animate-fade-in">
              <h2 className="text-xl font-semibold text-text-secondary mb-2">
                No markets yet
              </h2>
              <p className="text-text-muted max-w-sm mx-auto">
                {isHost
                  ? 'Click "New Market" below to create your first prediction!'
                  : "Waiting for the host to create a market..."}
              </p>
            </div>
          )}

          {/* Open Markets */}
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
                />
              ))}
            </div>
          )}

          {/* Resolved Markets */}
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
                />
              ))}
            </div>
          )}
        </main>

        {/* Sidebar */}
        <aside className="w-full lg:w-80 p-4 lg:border-l border-zoo-border space-y-4">
          <Leaderboard players={room.players} myId={myId} />

          {/* Players list */}
          <div className="bg-zoo-surface border border-zoo-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-zoo-border flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
                Players ({room.players.length})
              </h3>
              <button
                onClick={() => setShowZoomImport(true)}
                className="text-xs px-2 py-1 rounded-lg bg-neon-purple/10 border border-neon-purple/30 text-neon-purple hover:bg-neon-purple/20 transition-colors"
              >
                + Import Names
              </button>
            </div>
            <div className="p-3 flex flex-wrap gap-2">
              {room.players.map((p) => (
                <span
                  key={p.id}
                  className={`text-xs px-2 py-1 rounded-full border ${
                    p.id === myId
                      ? "bg-neon-blue/10 border-neon-blue/30 text-neon-blue"
                      : p.id.startsWith("ghost_")
                        ? "bg-neon-purple/10 border-neon-purple/30 text-neon-purple"
                        : "bg-zoo-bg border-zoo-border text-text-secondary"
                  }`}
                >
                  {p.name}
                  {p.isHost ? " (Host)" : ""}
                </span>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* FAB buttons */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-40">
        <button
          onClick={() => setShowCreateMarket(true)}
          className="px-5 py-3 rounded-xl bg-neon-blue text-zoo-bg font-bold shadow-lg hover:shadow-neon-blue/30 hover:scale-105 transition-all"
        >
          + New Market
        </button>
      </div>

      {/* Error toast */}
      {error && (
        <div className="fixed bottom-6 left-6 p-3 rounded-lg bg-neon-red/10 border border-neon-red/30 text-neon-red text-sm animate-slide-up z-50">
          {error}
        </div>
      )}

      {/* Create Market Modal */}
      {showCreateMarket && (
        <CreateMarketModal
          onClose={() => setShowCreateMarket(false)}
          onCreate={createMarket}
        />
      )}

      {/* Zoom Import Modal */}
      {showZoomImport && (
        <ZoomImportModal
          existingNames={room.players.map((p) => p.name)}
          onImport={importPlayers}
          onClose={() => setShowZoomImport(false)}
        />
      )}
    </div>
  );
}
