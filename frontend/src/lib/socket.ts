import { io, type Socket } from 'socket.io-client';
import { API_ROOT } from './apiConfig';

// Socket.io connects to the API origin (the root URL, without the /api suffix).
const SOCKET_URL = API_ROOT;

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
