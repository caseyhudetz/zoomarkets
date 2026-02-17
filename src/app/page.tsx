"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from "@/hooks/useSocket";
import { CURRENCY_SYMBOL } from "@/lib/constants";

export default function Home() {
  const router = useRouter();
  const { socket, isConnected } = useSocket();

  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [joinName, setJoinName] = useState("");
  const [mode, setMode] = useState<"pick" | "create" | "join">("pick");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Listen for errors
  useEffect(() => {
    if (!socket) return;
    function onError({ message }: { message: string }) {
      setError(message);
      setLoading(false);
      setTimeout(() => setError(null), 4000);
    }
    socket.on("room:error", onError);
    return () => {
      socket.off("room:error", onError);
    };
  }, [socket]);

  function handleCreate() {
    if (!name.trim() || !socket) return;
    setLoading(true);
    socket.once("room:created", ({ code }) => {
      sessionStorage.setItem("zoo_playerName", name.trim());
      sessionStorage.setItem("zoo_roomCode", code);
      router.push(`/room/${code}`);
    });
    socket.emit("room:create", { playerName: name.trim() });
  }

  function handleJoin() {
    if (!joinCode.trim() || !joinName.trim() || !socket) return;
    setLoading(true);
    sessionStorage.setItem("zoo_playerName", joinName.trim());
    sessionStorage.setItem("zoo_roomCode", joinCode.trim().toUpperCase());
    router.push(`/room/${joinCode.trim().toUpperCase()}`);
  }

  return (
    <div className="min-h-screen grid-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="text-5xl font-bold tracking-tight mb-2">
            <span className="text-neon-green">Zoo</span>
            <span className="text-neon-blue">Markets</span>
          </h1>
          <p className="text-text-secondary text-lg">
            Bet your {CURRENCY_SYMBOL} reputation
          </p>
        </div>

        {/* Connection indicator */}
        <div className="flex items-center justify-center gap-2 mb-8 text-sm">
          <span
            className={`w-2 h-2 rounded-full ${
              isConnected ? "bg-neon-green" : "bg-neon-red"
            }`}
          />
          <span className="text-text-muted">
            {isConnected ? "Connected" : "Connecting..."}
          </span>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-neon-red/10 border border-neon-red/30 text-neon-red text-sm text-center animate-slide-up">
            {error}
          </div>
        )}

        {mode === "pick" && (
          <div className="space-y-4 animate-fade-in">
            <button
              onClick={() => setMode("create")}
              disabled={!isConnected}
              className="w-full p-4 rounded-xl bg-zoo-surface border border-zoo-border hover:border-neon-green/50 hover:glow-green transition-all text-left group disabled:opacity-50"
            >
              <div className="text-lg font-semibold text-text-primary group-hover:text-neon-green transition-colors">
                Create a Room
              </div>
              <div className="text-sm text-text-muted mt-1">
                Start a new prediction room and share the code
              </div>
            </button>

            <button
              onClick={() => setMode("join")}
              disabled={!isConnected}
              className="w-full p-4 rounded-xl bg-zoo-surface border border-zoo-border hover:border-neon-blue/50 hover:glow-blue transition-all text-left group disabled:opacity-50"
            >
              <div className="text-lg font-semibold text-text-primary group-hover:text-neon-blue transition-colors">
                Join a Room
              </div>
              <div className="text-sm text-text-muted mt-1">
                Enter a 4-digit code to join
              </div>
            </button>
          </div>
        )}

        {mode === "create" && (
          <div className="animate-slide-up space-y-4">
            <div className="bg-zoo-surface border border-zoo-border rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">Create a Room</h2>
              <input
                type="text"
                placeholder="Your display name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                maxLength={20}
                autoFocus
                className="w-full p-3 rounded-lg bg-zoo-bg border border-zoo-border focus:border-neon-green/50 focus:outline-none text-text-primary placeholder:text-text-muted transition-colors"
              />
              <button
                onClick={handleCreate}
                disabled={!name.trim() || !isConnected || loading}
                className="w-full mt-4 p-3 rounded-lg bg-neon-green/20 border border-neon-green/40 text-neon-green font-semibold hover:bg-neon-green/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? "Creating..." : "Create Room"}
              </button>
            </div>
            <button
              onClick={() => setMode("pick")}
              className="w-full text-center text-text-muted text-sm hover:text-text-secondary transition-colors"
            >
              Back
            </button>
          </div>
        )}

        {mode === "join" && (
          <div className="animate-slide-up space-y-4">
            <div className="bg-zoo-surface border border-zoo-border rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">Join a Room</h2>
              <input
                type="text"
                placeholder="Room code (e.g. A3F7)"
                value={joinCode}
                onChange={(e) =>
                  setJoinCode(e.target.value.toUpperCase().slice(0, 4))
                }
                maxLength={4}
                autoFocus
                className="w-full p-3 rounded-lg bg-zoo-bg border border-zoo-border focus:border-neon-blue/50 focus:outline-none text-text-primary placeholder:text-text-muted font-mono text-center text-2xl tracking-[0.3em] uppercase transition-colors"
              />
              <input
                type="text"
                placeholder="Your display name"
                value={joinName}
                onChange={(e) => setJoinName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                maxLength={20}
                className="w-full mt-3 p-3 rounded-lg bg-zoo-bg border border-zoo-border focus:border-neon-blue/50 focus:outline-none text-text-primary placeholder:text-text-muted transition-colors"
              />
              <button
                onClick={handleJoin}
                disabled={
                  !joinCode.trim() || !joinName.trim() || !isConnected || loading
                }
                className="w-full mt-4 p-3 rounded-lg bg-neon-blue/20 border border-neon-blue/40 text-neon-blue font-semibold hover:bg-neon-blue/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? "Joining..." : "Join Room"}
              </button>
            </div>
            <button
              onClick={() => setMode("pick")}
              className="w-full text-center text-text-muted text-sm hover:text-text-secondary transition-colors"
            >
              Back
            </button>
          </div>
        )}

        <div className="mt-12 text-center text-text-muted text-xs">
          No real money. Just {CURRENCY_SYMBOL} Clout and bragging rights.
        </div>
      </div>
    </div>
  );
}
