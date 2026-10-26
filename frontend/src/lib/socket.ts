import { io, type Socket } from 'socket.io-client';
import { API_ROOT } from './apiConfig';

// Keep Socket.IO on the API host; the Next.js API route proxies HTTP, not
// Socket.IO upgrades.
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || API_ROOT;

let socket: Socket | null = null;
let socketToken: string | null = null;

// Reuse the socket only while the authenticated browser token remains the same.
export function getSocket(): Socket {
  if (typeof window === 'undefined') {
    throw new Error('Socket is only available in the browser');
  }
  const token = localStorage.getItem('mobile_token');
  if (!socket || token !== socketToken) {
    socket?.disconnect();
    socketToken = token;
    socket = io(SOCKET_URL, {
      auth: { token: token || undefined },
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });
  }
  return socket;
}

export function closeSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    socketToken = null;
  }
}
