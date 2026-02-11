import { createServer, IncomingMessage, ServerResponse } from "http";
import { Server as SocketServer } from "socket.io";
import next from "next";
import { registerSocketHandlers } from "./socket/handler";
import { RoomManager } from "./state/RoomManager";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req: IncomingMessage, res: ServerResponse) => {
    // Health check
    if (req.url === "/api/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          status: "ok",
          rooms: roomManager.getRoomCount(),
          connections: io.engine.clientsCount,
        })
      );
      return;
    }
    // Delegate everything else to Next.js
    handle(req, res);
  });

  const io = new SocketServer(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    pingInterval: 10000,
    pingTimeout: 5000,
  });

  const roomManager = new RoomManager();

  registerSocketHandlers(io, roomManager);

  httpServer.listen(port, () => {
    console.log(`\n  ZooMarkets ready on http://${hostname}:${port}\n`);
  });
});
