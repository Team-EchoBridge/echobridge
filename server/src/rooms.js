/**
 * In-memory room management for EchoBridge
 * Adheres strictly to docs/contracts.md
 */

// Key: roomId, Value: Room object
// Room object shape:
// {
//   id: string,
//   srcLang: 'hi' | 'mr',
//   speakerSocketId: string | null,
//   listeners: Map<string, { socketId: string, tgtLang: string }>,
//   createdAt: number
// }
const rooms = new Map();

/**
 * Generate a clean, 6-character room code (e.g. ROOM-4A2B or 6 random digits)
 * Easy to type on phones or embed in QR.
 */
function generateRoomId() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `ROOM-${code}`;
}

/**
 * Create a new room
 * @param {string} socketId - Speaker socket ID
 * @param {string} srcLang - 'hi' | 'mr'
 * @returns {string} roomId
 */
export function createRoom(socketId, srcLang = 'hi') {
  let roomId = generateRoomId();
  while (rooms.has(roomId)) {
    roomId = generateRoomId();
  }

  rooms.set(roomId, {
    id: roomId,
    srcLang,
    speakerSocketId: socketId,
    listeners: new Map(),
    createdAt: Date.now()
  });

  return roomId;
}

/**
 * Join an existing room
 * Speaker or listener
 * @param {string} socketId
 * @param {string} roomId
 * @param {string} tgtLang
 * @returns {{ ok: true, srcLang: string } | { ok: false, error: string }}
 */
export function joinRoom(socketId, roomId, tgtLang = 'en') {
  const room = rooms.get(roomId);
  if (!room) {
    return { ok: false, error: 'Room not found' };
  }

  // If this socket is the creator/speaker joining, don't count them as a listener
  if (room.speakerSocketId === socketId) {
    return { ok: true, srcLang: room.srcLang };
  }

  // Otherwise, record as a listener
  room.listeners.set(socketId, { socketId, tgtLang });
  return { ok: true, srcLang: room.srcLang };
}

/**
 * Get room by ID
 * @param {string} roomId
 */
export function getRoom(roomId) {
  return rooms.get(roomId);
}

/**
 * Count active listeners in a room
 * @param {string} roomId
 * @returns {number}
 */
export function getListenerCount(roomId) {
  const room = rooms.get(roomId);
  return room ? room.listeners.size : 0;
}

/**
 * Get active target languages breakdown for a room
 * @param {string} roomId
 * @returns {{ activeLanguages: string[], breakdown: Record<string, number> }}
 */
export function getRoomLanguages(roomId) {
  const room = rooms.get(roomId);
  if (!room || room.listeners.size === 0) {
    return { activeLanguages: ['en'], breakdown: {} };
  }

  const breakdown = {};
  for (const listener of room.listeners.values()) {
    const lang = listener.tgtLang || 'en';
    breakdown[lang] = (breakdown[lang] || 0) + 1;
  }

  const activeLanguages = Object.keys(breakdown);
  return {
    activeLanguages: activeLanguages.length > 0 ? activeLanguages : ['en'],
    breakdown
  };
}

/**
 * Handle socket disconnection across all rooms
 * Cleans up listeners and returns array of affected rooms where listener count changed
 * @param {string} socketId
 * @returns {Array<{ roomId: string, speakerSocketId: string | null, count: number }>}
 */
export function removeSocketFromRooms(socketId) {
  const affected = [];

  for (const [roomId, room] of rooms.entries()) {
    let changed = false;

    if (room.listeners.has(socketId)) {
      room.listeners.delete(socketId);
      changed = true;
    }

    if (room.speakerSocketId === socketId) {
      // Keep room alive for listeners or mark speaker disconnected
      room.speakerSocketId = null;
    }

    if (changed) {
      affected.push({
        roomId,
        speakerSocketId: room.speakerSocketId,
        count: room.listeners.size
      });
    }
  }

  return affected;
}
