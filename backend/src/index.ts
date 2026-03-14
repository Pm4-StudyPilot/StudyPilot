import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import passport from "passport";
import { configurePassport } from "./config/passport";
import { router } from "./routes";
import { setupSocketHandlers } from "./socket";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json());
app.use(passport.initialize());

configurePassport();

app.use("/api", router);

setupSocketHandlers(io);

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export { io };
