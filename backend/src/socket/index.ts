import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { JwtPayload } from '../types';
import { logger } from '../lib/logger';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';

export function setupSocketHandlers(io: Server) {
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
      socket.data.user = payload;
      next();
      // eslint-disable-next-line linting-rules/require-console-error-in-catch -- error is passed to next()
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`User connected: ${socket.data.user.userId}`);

    socket.on('disconnect', () => {
      logger.info(`User disconnected: ${socket.data.user.userId}`);
    });
  });
}
