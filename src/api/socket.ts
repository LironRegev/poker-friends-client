// client/src/api/socket.ts
import { io, type Socket } from 'socket.io-client';

let socket: Socket | null = null;

// נקרא מה-ENV (Production/Dev). אם אין – נופל ל-localhost לפיתוח.
const SERVER_URL =
  (import.meta as any).env?.VITE_SERVER_URL || 'http://localhost:3001';

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SERVER_URL, {
      // עדיף WebSocket ברנדר
      transports: ['websocket'],
      withCredentials: false,
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 500,
      timeout: 10000,
    });

    // לוגים קלים לעזרה בדיבוג פרודקשן (לא חובה)
    socket.on('connect', () => console.log('[socket] connected', socket?.id));
    socket.on('disconnect', (reason) =>
      console.log('[socket] disconnected:', reason)
    );
    socket.on('connect_error', (err) =>
      console.log('[socket] connect_error:', err?.message || err)
    );
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
