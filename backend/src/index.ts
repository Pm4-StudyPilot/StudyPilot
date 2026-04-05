import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server } from 'socket.io';
import passport from 'passport';
import { configurePassport } from './config/passport';
import { router } from './routes';
import { setupSocketHandlers } from './socket';
import { logger } from './lib/logger';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use(passport.initialize());

configurePassport();

app.use('/api', router);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ err, msg: err.message }, 'Unhandled error');
  res.status(500).json({ error: err.message });
});

setupSocketHandlers(io);

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  logger.info({ port: PORT }, 'Server started');
});

export { io };
