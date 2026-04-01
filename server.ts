import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server as SocketIOServer } from "socket.io";

// Properly typed global declaration — eliminates the "Unexpected any" error
declare global {
  // eslint-disable-next-line no-var
  var io: SocketIOServer | undefined;
}

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
    maxHttpBufferSize: 1e6,
  });

  io.on("connection", (socket) => {
    console.log(`[Socket.io] Connected: ${socket.id}`);

    socket.on("join-event", (slug: string) => {
      void socket.join(slug);
      const roomSize = io.sockets.adapter.rooms.get(slug)?.size ?? 0;
      console.log(`[Socket.io] ${socket.id} joined "${slug}" (${roomSize} viewers)`);
      io.to(slug).emit("viewer-count", roomSize);
    });

    socket.on("leave-event", (slug: string) => {
      void socket.leave(slug);
      const roomSize = io.sockets.adapter.rooms.get(slug)?.size ?? 0;
      console.log(`[Socket.io] ${socket.id} left "${slug}" (${roomSize} remaining)`);
      io.to(slug).emit("viewer-count", roomSize);
    });

    socket.on(
      "photographer-uploading",
      ({ slug, uploading }: { slug: string; uploading: boolean }) => {
        socket.to(slug).emit("photographer-uploading", { uploading });
      }
    );

    socket.on("disconnecting", () => {
      socket.rooms.forEach((room) => {
        if (room === socket.id) return;
        const currentSize = io.sockets.adapter.rooms.get(room)?.size ?? 1;
        const newSize = Math.max(0, currentSize - 1);
        io.to(room).emit("viewer-count", newSize);
      });
    });

    socket.on("disconnect", (reason) => {
      console.log(`[Socket.io] Disconnected: ${socket.id} (${reason})`);
    });
  });

  // Use typed global instead of (global as any)
  global.io = io;

  const PORT = parseInt(process.env.PORT || "3000", 10);
  httpServer.listen(PORT, () => {
    console.log(`> Ready on http://localhost:${PORT}`);
    console.log(`> Socket.io attached`);
    console.log(`> Mode: ${dev ? "development" : "production"}`);
  });
});