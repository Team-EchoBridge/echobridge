import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { createRoom, joinRoom, getRoom, getListenerCount, removeSocketFromRooms } from './rooms.js';

dotenv.config({ path: '../.env' });
dotenv.config();

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

// Contract: GET /health returns { ok: true }
app.get('/health', (req, res) => {
  res.json({ ok: true });
});

io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  // Event: room:create (sent by speaker) -> ack({ roomId })
  socket.on('room:create', ({ srcLang = 'hi' }, callback) => {
    const roomId = createRoom(socket.id, srcLang);
    socket.join(roomId);
    console.log(`[Room] Created ${roomId} with srcLang=${srcLang} by ${socket.id}`);
    if (typeof callback === 'function') {
      callback({ roomId });
    }
  });

  // Event: room:join (sent by listener or speaker) -> ack({ ok, srcLang } or { ok, error })
  socket.on('room:join', ({ roomId, tgtLang = 'en' }, callback) => {
    const result = joinRoom(socket.id, roomId, tgtLang);

    if (result.ok) {
      socket.join(roomId);
      // Join a language-specific subchannel for targeted captions (e.g. "room:ROOM-1234:en")
      socket.join(`${roomId}:${tgtLang}`);
      console.log(`[Room] ${socket.id} joined ${roomId} (tgtLang: ${tgtLang})`);

      // Notify speaker about updated listener count
      const room = getRoom(roomId);
      if (room && room.speakerSocketId) {
        const count = getListenerCount(roomId);
        io.to(room.speakerSocketId).emit('room:count', { count });
      }
    } else {
      console.log(`[Room] ${socket.id} failed to join ${roomId}: ${result.error}`);
    }

    if (typeof callback === 'function') {
      callback(result);
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
    const affectedRooms = removeSocketFromRooms(socket.id);
    for (const { speakerSocketId, count } of affectedRooms) {
      if (speakerSocketId) {
        io.to(speakerSocketId).emit('room:count', { count });
      }
    }
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[EchoBridge Server] Listening on http://0.0.0.0:${PORT}`);
});

export { app, server, io };
