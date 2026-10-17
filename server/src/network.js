import os from 'os';

/**
 * Get the local IPv4 address of this machine on the local network (LAN / Wi-Fi)
 * @returns {string} e.g. "192.168.1.15" or "localhost"
 */
export function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      // Look for external IPv4 addresses (skip internal 127.0.0.1)
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

