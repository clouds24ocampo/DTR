import { io, Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "./types/global/messaging/messageio.types";

export const connectSocket = (
  userId: string
): Socket<ServerToClientEvents, ClientToServerEvents> => {
  const socket = io(import.meta.env.VITE_API_URL, {
    transports: ["websocket"],
    auth: { userId, token: localStorage.getItem("auth-token") },
    autoConnect: true,
  });

  socket.on("connect", () => {
    socket.emit("auth", { userId });
  });

  return socket;
};
