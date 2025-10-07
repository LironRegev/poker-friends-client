// client/src/api/socket.ts
import { io, type Socket } from 'socket.io-client';

let socket: Socket | null = null;

// --- בחירת כתובת השרת ---
// אם רץ ב־Vite DEV *והעמוד נטען מ־localhost/127.0.0.1*, נכריח חיבור ל־http://localhost:3001
// אחרת ניקח מה-ENV ואם אין – ניפול ל-localhost.
const ENV: any = (import.meta as any).env || {};
const IS_DEV = !!ENV?.DEV;
const PAGE_HOST = (typeof window !== 'undefined' ? window.location.host : '');
const IS_LOCAL_PAGE = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(PAGE_HOST);
const ENV_URL = ENV?.VITE_SERVER_URL as string | undefined;

const SERVER_URL =
  (IS_DEV && IS_LOCAL_PAGE)
    ? 'http://localhost:3001'
    : (ENV_URL || 'http://localhost:3001');

console.log('[socket] MODE =', IS_DEV ? 'development' : ENV?.MODE);
console.log('[socket] pageHost =', PAGE_HOST);
console.log('[socket] SERVER_URL =', SERVER_URL);
if (ENV_URL && SERVER_URL !== ENV_URL) {
  console.log('[socket] (override) VITE_SERVER_URL from env =', ENV_URL, '→ using =', SERVER_URL);
}

// === observable קטן לסטטוס חיבור (לא חובה להשתמש) ===
type ConnStatus = {
  connected: boolean;
  phase: 'idle' | 'connected' | 'disconnected' | 'reconnecting' | 'error';
  attempts?: number;
  reason?: string;
};
let connStatus: ConnStatus = { connected: false, phase: 'idle' };
const listeners: Array<(s: ConnStatus) => void> = [];
function publish() { listeners.forEach(fn => fn({ ...connStatus })); }
export function subscribeConnectionStatus(fn: (s: ConnStatus) => void) {
  listeners.push(fn); fn({ ...connStatus });
  return () => { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); };
}
export function getConnectionStatus() { return { ...connStatus }; }

// אפשרות ידנית
export function forceReconnect() {
  const s = getSocket();
  try { s.disconnect(); } catch {}
  s.connect();
}

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SERVER_URL, {
      transports: ['websocket'],
      withCredentials: false,
      reconnection: true,
      reconnectionAttempts: Infinity,      // ⬅️ לא לוותר
      reconnectionDelay: 800,
      reconnectionDelayMax: 5000,
      timeout: 10000,
      // path: '/socket.io',
    });

    // --- מאזינים וחיווי מצב ---
    socket.on('connect', () => {
      connStatus = { connected: true, phase: 'connected' };
      console.log('[socket] connected', socket?.id);
      publish();
    });

    socket.on('disconnect', (reason) => {
      connStatus = { connected: false, phase: 'disconnected', reason: String(reason) };
      console.log('[socket] disconnected:', reason);
      publish();
    });

    socket.on('connect_error', (err) => {
      connStatus = { connected: false, phase: 'error', reason: err?.message || String(err) };
      console.log('[socket] connect_error:', err?.message || err);
      publish();
    });

    socket.io.on('reconnect_attempt', (n) => {
      connStatus = { connected: false, phase: 'reconnecting', attempts: n };
      console.log('[socket] reconnect_attempt', n);
      publish();
    });

    socket.io.on('reconnect', (n) => {
      connStatus = { connected: true, phase: 'connected' };
      console.log('[socket] reconnect', n);
      publish();
    });

    socket.io.on('reconnect_error', (e) => {
      connStatus = { connected: false, phase: 'reconnecting', reason: e?.message || String(e) };
      console.log('[socket.io] reconnect_error', e);
      publish();
    });

    socket.io.on('reconnect_failed', () => {
      connStatus = { connected: false, phase: 'error', reason: 'reconnect_failed' };
      console.log('[socket.io] reconnect_failed (stopped trying)');
      publish();
    });

    // אינדיקציה לשינויים ברמת הדפדפן (Offline/Online)
    window.addEventListener('online', () => {
      console.log('[socket] browser ONLINE → connect()');
      // נדליק באנר "Reconnecting…" מייד, גם אם ה־socket עוד לא דיווח
      connStatus = { connected: false, phase: 'reconnecting' };
      publish();
      if (socket && !socket.connected) socket.connect();
    });
    window.addEventListener('offline', () => {
      console.log('[socket] browser OFFLINE');
      // נציג באנר "Disconnected" מייד, גם לפני ping-timeout
      connStatus = { connected: false, phase: 'disconnected', reason: 'offline' };
      publish();
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
