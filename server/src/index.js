import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { createRoom, joinRoom, getRoom, getListenerCount, removeSocketFromRooms } from './rooms.js';
import { TimingTracker } from './timings.js';
import { processUtterance, getCachedTranslation, setCachedTranslation } from './nlpAdapter.js';

import { getLocalIpAddress } from './network.js';

dotenv.config({ path: '../.env' });
dotenv.config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  maxHttpBufferSize: 1e6 // 1MB buffer limit to easily handle 6s 16kHz mono audio (~192KB)
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
      // Join language subchannel (e.g. "ROOM-1234:en") for targeted captions
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

  // Event: utterance (sent by speaker)
  // Payload: { roomId, srcLang, seq, audio, tSent, replayId? }
  socket.on('utterance', async (payload) => {
    const { roomId, srcLang, seq, audio, tSent, replayId } = payload || {};
    const room = getRoom(roomId);

    if (!room) {
      socket.emit('utterance:error', { seq: seq || 0, message: 'Room not found' });
      return;
    }

    const timings = new TimingTracker(tSent);

    try {
      // Step 1: Speech to Text & Translation
      // Target languages for listeners in this room (currently default 'en')
      const targetLangs = ['en'];

      const nlpResult = await processUtterance({
        audio,
        srcLang: srcLang || room.srcLang,
        tgtLangs: targetLangs
      });

      // Mark STT stage complete
      timings.markSttDone();

      // Emit transcript as soon as speech recognition finishes
      // Sent to everyone in the room (speaker + listeners)
      io.to(roomId).emit('transcript', {
        seq,
        srcText: nlpResult.srcText,
        unclear: nlpResult.unclear,
        timings: timings.toObject()
      });

      // Step 2: Translation & Guard Check
      // Check cache for translation if not unclear
      let finalTranslations = nlpResult.translations;
      let finalNumbers = nlpResult.numbers || [];

      if (!nlpResult.unclear && nlpResult.srcText) {
        for (const lang of targetLangs) {
          const cached = getCachedTranslation(nlpResult.srcText, lang);
          if (cached) {
            finalTranslations[lang] = cached.tgtText;
            finalNumbers = cached.numbers;
          } else if (finalTranslations[lang]) {
            setCachedTranslation(nlpResult.srcText, lang, {
              tgtText: finalTranslations[lang],
              numbers: finalNumbers
            });
          }
        }
      }

      timings.markTranslateDone();

      // Emit caption to listeners listening in each tgtLang
      // When unclear is true, tgtText is an empty string
      for (const lang of targetLangs) {
        timings.markEmit();
        const tgtText = nlpResult.unclear ? '' : (finalTranslations[lang] || '');

        io.to(`${roomId}:${lang}`).emit('caption', {
          seq,
          srcText: nlpResult.srcText,
          tgtText,
          tgtLang: lang,
          numbers: nlpResult.unclear ? [] : finalNumbers,
          unclear: nlpResult.unclear,
          timings: timings.toObject()
        });
      }
    } catch (err) {
      console.error(`[Utterance Error] Room ${roomId}, Seq ${seq}:`, err);
      socket.emit('utterance:error', { seq: seq || 0, message: err.message || 'Error processing utterance' });
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
const CLIENT_PORT = process.env.CLIENT_PORT || 5173;

server.listen(PORT, '0.0.0.0', () => {
  const localIp = getLocalIpAddress();
  console.log(`\n======================================================`);
  console.log(`[EchoBridge Server] Backend running on port ${PORT}`);
  console.log(`- Local Speaker (laptop):  http://localhost:${CLIENT_PORT}/speak`);
  console.log(`- Local Health Check:     http://localhost:${PORT}/health`);
  console.log(`- Phone Join URL (LAN):   http://${localIp}:${CLIENT_PORT}/join/<roomId>`);
  console.log(`======================================================\n`);
});

export { app, server, io };
