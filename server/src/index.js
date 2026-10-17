import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });
dotenv.config(); // fallback to current dir .env

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// Contract: GET /health returns { ok: true }. Used by keep-awake ping and venue check.
app.get('/health', (req, res) => {
  res.json({ ok: true });
});

io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[EchoBridge Server] Listening on http://0.0.0.0:${PORT}`);
});

export { app, server, io };

