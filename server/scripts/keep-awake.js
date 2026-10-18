/**
 * Keep-awake ping script for Render free tier
 * Pings /health every 10 minutes to prevent the instance from sleeping
 * Run as daemon or background process: node server/scripts/keep-awake.js
 */

const SERVER_URL = process.env.RENDER_EXTERNAL_URL || process.env.SERVER_URL || 'http://localhost:3000';
const PING_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

console.log(`[Keep-Awake] Initialized for ${SERVER_URL} (Interval: 10 mins)`);

async function ping() {
  const healthUrl = `${SERVER_URL.replace(/\/$/, '')}/health`;
  try {
    const res = await fetch(healthUrl);
    const data = await res.json();
    console.log(`[Keep-Awake] ${new Date().toISOString()} - Ping ${healthUrl}: ${res.status} OK (data: ${JSON.stringify(data)})`);
  } catch (err) {
    console.warn(`[Keep-Awake] ${new Date().toISOString()} - Ping failed:`, err.message);
  }
}

// First ping immediately
ping();
// Recurring ping
setInterval(ping, PING_INTERVAL_MS);

