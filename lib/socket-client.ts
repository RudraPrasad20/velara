// import { io, Socket } from "socket.io-client";

// let socket: Socket | null = null;

// export function getSocket(): Socket {
//   if (!socket) {
//     // Use the env var in development, fall back to current origin in production.
//     // This handles cases where NEXT_PUBLIC_SOCKET_URL isn't set correctly.
//     const url =
//       process.env.NEXT_PUBLIC_SOCKET_URL ||
//       (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");

//     socket = io(url, {
//       autoConnect: false,
//       // Explicitly set transport order — prevents "Reconnecting" flash
//       transports: ["websocket", "polling"],
//       reconnection: true,
//       reconnectionAttempts: Infinity,  // Keep trying — events can last hours
//       reconnectionDelay: 1000,
//       reconnectionDelayMax: 5000,
//       timeout: 10000,
//     });

//     socket.on("connect_error", (err) => {
//       console.warn("[Socket.io] Connect error:", err.message);
//     });
//   }
//   return socket;
// }


// lib/socket-client.ts
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const url =
      process.env.NEXT_PUBLIC_SOCKET_URL ||
      (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");

    socket = io(url, {
      autoConnect: false,
      path: "/socket.io/",           // ← Important: match server
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 8,       // reasonable for dev
      reconnectionDelay: 800,
      reconnectionDelayMax: 4000,
      timeout: 15000,                // increased
    });

    socket.on("connect_error", (err) => {
      console.error("[Socket.io] Connect error:", err.message);
    });

    socket.on("connect", () => {
      console.log(`[Socket.io] ✅ Connected (ID: ${socket?.id})`);
    });

    socket.on("disconnect", (reason) => {
      console.log(`[Socket.io] Disconnected: ${reason}`);
    });
  }
  return socket;
}