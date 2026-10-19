import { io, type Socket } from 'socket.io-client';
import { API_ROOT } from './apiConfig';

// Socket.io connects to the API origin (the root URL, without the /api suffix).
const SOCKET_URL = API_ROOT;

let socket: Socket | null = null;

// Returns a singleton Socket.io client. The admin auth token is sent in the
// handshake so the server only admits admin/manager connections into the
// "admin" room that receives real-time notifications.
export function getSocket(): Socket {
  if (typeof window === 'undefined') {
    throw new Error('Socket is only available in the browser');
  }
  if (!socket) {
    const token = localStorage.getItem('mobile_token') || undefined;
    socket = io(SOCKET_URL, {
      auth: { token },
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
  }
}
