import React, { useEffect, useMemo, useState, useRef } from 'react';
import { getSocket } from './api/socket';
import Lobby from './components/Lobby';
import Table from './components/Table';
import Chat from './components/Chat';
import RoomHeader from './components/RoomHeader';
import ActivityFeed, { type FeedItem } from './components/ActivityFeed';

type Card = { rank:number; suit:'♣'|'♦'|'♥'|'♠' };
type Player = {
  id: string; name: string; stack: number; seat: number;
  inHand: boolean; hasActedThisRound: boolean; isAllIn: boolean;
  isOwner?: boolean; holeCount?: number; hole?: Card[]; publicHole?: Card[];
};
type Stage = 'waiting'|'preflop'|'flop'|'turn'|'river'|'showdown';

type WinnerInfo = {
  seat: number; name: string; amount: number; category: number | null; categoryName: string;
};

type State = {
  code: string;
  stage: Stage;
  players: Player[];
  dealerSeat: number;
  smallBlind: number;
  bigBlind: number;
  currentBet: number;
  minRaise: number;
  pot: number;
  community: Card[];
  turnSeat: number;
  lastAggressorSeat: number | null;
  message?: string;
  currency?: string;
  buyInMin?: number;
  buyInDefault?: number;
  revealSeats?: number[];
  lastWinners?: WinnerInfo[];
  actionLog?: { ts:number; text:string }[];
};

type RoomSettings = {
  smallBlind: number;
  bigBlind: number;
  buyInMin: number;
  buyInDefault: number;
  currency: string;
};

export default function App() {
  const socket = useMemo(() => getSocket(), []);
  const [me, setMe] = useState<{ name: string; stack: number }>({ name: '', stack: 1000 });
  const [code, setCode] = useState('');
  const [state, setState] = useState<State | null>(null);
  const [chat, setChat] = useState<{ name: string; text: string; ts: number }[]>([]);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [mobileReveal, setMobileReveal] = useState(false);

  const prevStateRef = useRef<State | null>(null);

  function requestPrivateState(roomCode?: string, fallback?: State) {
    const c = roomCode || code;
    if (!c) { if (fallback) setState(fallback); return; }
    socket.emit('getState', { code: c }, (res: any) => {
      if (res?.state) setState(res.state as State);
      else if (fallback) setState(fallback);
    });
  }

  useEffect(() => {
    const onState = (s: State) => {
      socket.emit('getState', { code: s.code }, (res: any) => {
        const ns: State = (res?.state as State) ?? s;
        if (Array.isArray(ns.actionLog)) {
          const mapped: FeedItem[] = ns.actionLog.map(i => ({ ts: i.ts, text: i.text }));
          setFeed(mapped);
        }
        setState(ns);
        prevStateRef.current = ns;
      });
    };
    const onChat = (m: { name: string; text: string; ts: number }) => setChat(prev => [...prev, m]);
    const onConnect = () => { if (code) requestPrivateState(code, state || undefined); };
    socket.on('state', onState);
    socket.on('chat', onChat);
    socket.on('connect', onConnect);
    socket.on('reconnect', onConnect as any);
    return () => {
      socket.off('state', onState);
      socket.off('chat', onChat);
      socket.off('connect', onConnect);
      socket.off('reconnect', onConnect as any);
    };
  }, [socket, code, state]);

  function onCreateRoom(settings: RoomSettings) {
    setMe(prev => ({ ...prev, stack: settings.buyInDefault }));
    socket.emit('createRoom', {
      name: me.name, stack: settings.buyInDefault,
      smallBlind: settings.smallBlind, bigBlind: settings.bigBlind,
      buyInMin: settings.buyInMin, buyInDefault: settings.buyInDefault,
      currency: settings.currency || '₪',
    }, (res: any) => {
      if (res?.error) return alert(res.error);
      setCode(res.code); setState(res.state);
      requestPrivateState(res.code, res.state);
    });
  }

  function onJoinRoom(desiredStack: number) {
    socket.emit('joinRoom', { code, name: me.name, stack: desiredStack }, (res: any) => {
      if (res?.error) return alert(res.error);
      setMe(prev => ({ ...prev, stack: desiredStack }));
      setState(res.state);
      requestPrivateState(res.code || code, res.state);
    });
  }

  function onLeave() {
    socket.emit('leaveRoom', { code });
    setState(null);
    setChat([]);
    setFeed([]);
  }

  function sendChat(text: string) {
    socket.emit('chat', { code, text, name: me.name || 'Player' });
  }

  const carpetTileSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300' viewBox='0 0 300 300'>
    <defs><radialGradient id='bg' cx='50%' cy='50%' r='65%'>
    <stop offset='0%' stop-color='#2b1411'/><stop offset='100%' stop-color='#1e100e'/>
    </radialGradient></defs>
    <rect width='100%' height='100%' fill='url(#bg)'/></svg>`.replace(/\s+/g, ' ');
  const carpetDataUri = `url("data:image/svg+xml;utf8,${encodeURIComponent(carpetTileSvg)}")`;
  const casinoFloorStyle: React.CSSProperties = { backgroundImage: carpetDataUri, backgroundColor: '#211210' };

  if (!state) {
    return (
      <>
        <div className="fixed inset-0 -z-10" style={casinoFloorStyle} />
        <Lobby me={me} setMe={setMe} code={code} setCode={setCode} onCreateRoom={onCreateRoom} onJoinRoom={onJoinRoom} />
      </>
    );
  }

  return (
    <div className="h-screen">
      <div className="fixed inset-0 -z-10" style={casinoFloorStyle} />

      <div className="h-full grid gap-3 md:grid-cols-[1fr_300px] px-4 md:px-6 pt-4">
        <div className="h-full flex flex-col min-h-0">
          <RoomHeader state={state} me={me} code={code} onLeave={onLeave} onStart={() => socket.emit('startGame', { code })} />
          <div className="flex-1 min-h-0">
            <Table state={state} me={me} onAction={(kind, amount) => socket.emit('action', { code, kind, amount })} />
          </div>

          {/* כפתור לפתיחת צ'אט/היסטוריה במובייל */}
          <div className="md:hidden flex justify-center mt-2 mb-3">
            <button
              className="px-4 py-2 rounded-full bg-white border border-slate-300 shadow text-sm font-medium"
              onClick={() => setMobileReveal(true)}
            >
              חשוף צ׳אט/היסטוריה
            </button>
          </div>
        </div>

        {/* צד ימין לדסקטופ בלבד */}
        <div className="hidden md:flex h-full min-h-0 overflow-hidden flex-col gap-3">
          <div className="flex-1 min-h-[200px] rounded-2xl border border-slate-200 bg-white p-2 overflow-y-auto">
            <Chat chat={chat} onSend={sendChat} />
          </div>
          <div className="flex-1 min-h-[200px]">
            <ActivityFeed items={feed} />
          </div>
        </div>
      </div>

      {/* --- Mobile reveal panel --- */}
      {mobileReveal && (
        <div className="md:hidden fixed inset-0 z-[90]">
          <div className="absolute inset-0 bg-black/35" onClick={() => setMobileReveal(false)} />
          <div className="absolute bottom-3 left-3 right-3 rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="px-4 py-2 border-b border-slate-200 flex items-center justify-between">
              <div className="font-semibold">צ׳אט / היסטוריה</div>
              <button
                className="px-2 py-1 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-sm"
                onClick={() => setMobileReveal(false)}
              >
                סגור
              </button>
            </div>

            <div className="p-3 pt-3">
              <div className="h-[78vh] min-h-0 grid grid-rows-[3fr_2fr] gap-3">
                <section className="min-h-0 rounded-xl border border-slate-200 overflow-hidden">
                  <div className="h-full overflow-y-auto p-2">
                    <Chat chat={chat} onSend={sendChat} />
                  </div>
                </section>
                <section className="min-h-0 rounded-xl border border-slate-200 overflow-hidden">
                  <div className="h-full overflow-y-auto p-2">
                    <ActivityFeed items={feed} />
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
