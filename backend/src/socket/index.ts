import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { JwtPayload } from "../types";

const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-production";

export function setupSocketHandlers(io: Server) {
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error("Authentication required"));
    }

    try {
      const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
      socket.data.user = payload;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.data.user.userId}`);

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.data.user.userId}`);
    });
  });
}
