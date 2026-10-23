import { io } from 'socket.io-client';

// Determine default server URL: same host on port 3000, or VITE_SERVER_URL if configured
const SERVER_URL = import.meta.env.VITE_SERVER_URL || `http://${window.location.hostname}:3000`;

export const socket = io(SERVER_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000
});

/**
 * Create a new room (sent by speaker)
 * @param {string} srcLang - 'hi' | 'mr'
 * @returns {Promise<{ roomId: string }>}
 */
export function createRoom(srcLang) {
  return new Promise((resolve, reject) => {
    socket.emit('room:create', { srcLang }, (response) => {
      if (response && response.roomId) {
        resolve(response);
      } else {
        reject(new Error(response?.error || 'Failed to create room'));
      }
    });
  });
}

/**
 * Join an existing room (speaker or listener)
 * @param {string} roomId
 * @param {string} tgtLang - 'en' (or same as srcLang if speaker)
 * @returns {Promise<{ ok: boolean, srcLang?: string, error?: string }>}
 */
export function joinRoom(roomId, tgtLang) {
  return new Promise((resolve) => {
    socket.emit('room:join', { roomId, tgtLang }, (response) => {
      resolve(response);
    });
  });
}

/**
 * Rebind speaker to existing room after page refresh
 * @param {string} roomId
 * @returns {Promise<{ ok: boolean, srcLang?: string, count?: number, languages?: object, error?: string }>}
 */
export function rebindSpeaker(roomId) {
  return new Promise((resolve) => {
    socket.emit('room:rebind', { roomId }, (response) => {
      resolve(response);
    });
  });
}

/**
 * Explicitly terminate/close a room (speaker only)
 * @param {string} roomId
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export function closeRoom(roomId) {
  return new Promise((resolve) => {
    socket.emit('room:close', { roomId }, (response) => {
      resolve(response);
    });
  });
}

/**
 * Listen for room termination event (sent to listeners when speaker ends session)
 * @param {(data: { roomId: string, reason: string }) => void} callback
 */
export function onRoomClosed(callback) {
  socket.on('room:closed', callback);
  return () => socket.off('room:closed', callback);
}

/**
 * Send an utterance (speaker)
 * @param {{ roomId: string, srcLang: string, seq: number, audio: ArrayBuffer, tSent: number, replayId?: string }} payload
 */
export function sendUtterance(payload) {
  socket.emit('utterance', payload);
}

/**
 * Listen to transcript events (sent to everyone in the room)
 * @param {(data: { seq: number, srcText: string, unclear: boolean, timings: object }) => void} callback
 */
export function onTranscript(callback) {
  socket.on('transcript', callback);
  return () => socket.off('transcript', callback);
}

/**
 * Listen to caption events (sent to listeners in that tgtLang)
 * @param {(data: { seq: number, srcText: string, tgtText: string, tgtLang: string, numbers: Array<object>, unclear: boolean, timings: object }) => void} callback
 */
export function onCaption(callback) {
  socket.on('caption', callback);
  return () => socket.off('caption', callback);
}

/**
 * Listen to room listener count (speaker only)
 * @param {(data: { count: number, languages?: Record<string, number> }) => void} callback
 */
export function onRoomCount(callback) {
  socket.on('room:count', callback);
  return () => socket.off('room:count', callback);
}

/**
 * Listen to utterance error events (speaker only)
 * @param {(data: { seq: number, message: string }) => void} callback
 */
export function onUtteranceError(callback) {
  socket.on('utterance:error', callback);
  return () => socket.off('utterance:error', callback);
}
