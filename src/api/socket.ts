// client/src/api/socket.ts
import { io, type Socket } from 'socket.io-client';

let socket: Socket | null = null;

// נקרא מה-ENV (Production/Dev). אם אין – נופל ל-localhost לפיתוח.
const SERVER_URL =
  (import.meta as any).env?.VITE_SERVER_URL || 'http://localhost:3001';

console.log('[socket] SERVER_URL =', SERVER_URL);

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SERVER_URL, {
      transports: ['websocket'],
      withCredentials: false,
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 500,
      timeout: 10000,
      // path: '/socket.io', // ברירת מחדל; אפשר להשאיר הערה
    });

    socket.on('connect', () => {
      console.log('[socket] connected', socket?.id);
    });
    socket.on('disconnect', (reason) => {
      console.log('[socket] disconnected:', reason);
    });
    socket.on('connect_error', (err) => {
      console.log('[socket] connect_error:', err?.message || err);
    });
    socket.io.on('reconnect_attempt', (n) => {
      console.log('[socket] reconnect_attempt', n);
    });
    socket.io.on('reconnect', (n) => {
      console.log('[socket] reconnect', n);
    });
    socket.io.on('error', (e) => {
      console.log('[socket.io] error', e);
    });
  }
  return socket!;
}

// עוזרים לחשיפה/הסתרה (כפי שהקוד שלך משתמש)
export function emitShowCards(code: string) {
  getSocket().emit('showCards', { code });
}
export function emitMuckCards(code: string) {
  getSocket().emit('muckCards', { code });
}
