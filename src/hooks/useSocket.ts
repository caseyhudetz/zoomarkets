"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@/types/events";

export type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let globalSocket: TypedSocket | null = null;

export function useSocket() {
  const [socket, setSocket] = useState<TypedSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!globalSocket) {
      globalSocket = io({
        transports: ["websocket", "polling"],
      });
    }

    const s = globalSocket;

    function onConnect() {
      setIsConnected(true);
    }
    function onDisconnect() {
      setIsConnected(false);
    }

    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);

    setSocket(s);
    setIsConnected(s.connected);

    return () => {
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
    };
  }, []);

  return { socket, isConnected };
}
