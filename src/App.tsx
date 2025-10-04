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

  // חדשים להגדרות חדר
  currency?: string;
  buyInMin?: number;
  buyInDefault?: number;

  revealSeats?: number[];     // מי יכול לבצע Show/Muck
  lastWinners?: WinnerInfo[]; // תצוגת מנצחים ליד ה-HERO
  actionLog?: { ts:number; text:string }[]; // יומן מהשרת
};

type RoomSettings = {
  smallBlind: number;
  bigBlind: number;
  buyInMin: number;
  buyInDefault: number;
  currency: string;
};

export default function App(){
  const socket = useMemo(()=>getSocket(),[]);
  const [me, setMe]   = useState<{name:string; stack:number}>({name:'', stack:1000});
  const [code, setCode] = useState('');
  const [state, setState] = useState<State | null>(null);
  const [chat, setChat]   = useState<{name:string;text:string;ts:number}[]>([]);

  // הזנת ActivityFeed מהשרת
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const prevStateRef = useRef<State | null>(null);

  // === חדש: רפרנס ל-extras + פתיחה בלחיצה אחת ===
  const extrasRef = useRef<HTMLDivElement | null>(null);
  const openExtrasOnce = () => {
    // מגלגל בעדינות אל אזור ה-extras (צ׳אט/היסטוריה) — קליק אחד.
    requestAnimationFrame(() => {
      extrasRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  // עוזר: בקשה ל-state פרטי מהשרת
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

        // מזינים את ה-ActivityFeed מהשרת (actionLog)
        if (Array.isArray(ns.actionLog)) {
          const mapped: FeedItem[] = ns.actionLog.map(i => ({ ts: i.ts, text: i.text }));
          setFeed(mapped);
        }

        setState(ns);
        prevStateRef.current = ns;
      });
    };

    const onChat  = (m: { name: string; text: string; ts: number }) => {
      setChat(prev => [...prev, m]);
    };

    const onConnect = () => { 
      if (code) requestPrivateState(code, state || undefined);
    };

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

  // יצירת חדר
  function onCreateRoom(settings: RoomSettings) {
    setMe(prev => ({ ...prev, stack: settings.buyInDefault }));
    socket.emit(
      'createRoom',
      {
        name: me.name,
        stack: settings.buyInDefault,
        smallBlind: settings.smallBlind,
        bigBlind: settings.bigBlind,
        buyInMin: settings.buyInMin,
        buyInDefault: settings.buyInDefault,
        currency: settings.currency || '₪',
      },
      (res:any)=>{
        if (res?.error) return alert(res.error);
        setCode(res.code);
        setState(res.state);
        requestPrivateState(res.code, res.state);
      }
    );
  }

  // הצטרפות
  function onJoinRoom(desiredStack: number) {
    socket.emit('joinRoom', { code, name: me.name, stack: desiredStack }, (res:any)=>{
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

  function sendChat(text:string){
    socket.emit('chat', { code, text, name: me.name || 'Player' });
  }

  /* ============================
     רקע “רצפת קזינו” — עדין
     ============================ */
  const carpetTileSvg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300' viewBox='0 0 300 300'>
      <defs>
        <radialGradient id='bg' cx='50%' cy='50%' r='65%'>
          <stop offset='0%' stop-color='#2b1411'/>
          <stop offset='100%' stop-color='#1e100e'/>
        </radialGradient>
      </defs>
      <rect width='100%' height='100%' fill='url(#bg)'/>
    </svg>`.replace(/\s+/g, ' ');
  const carpetDataUri = `url("data:image/svg+xml;utf8,${encodeURIComponent(carpetTileSvg)}")`;

  const casinoFloorStyle: React.CSSProperties = {
    backgroundColor: '#211210',
    backgroundImage: carpetDataUri
  };

  if (!state) {
    return (
      <>
        <div className="fixed inset-0 -z-10 pointer-events-none" style={casinoFloorStyle} />
        <Lobby
          me={me}
          setMe={setMe}
          code={code}
          setCode={setCode}
          onCreateRoom={onCreateRoom}
          onJoinRoom={onJoinRoom}
        />
      </>
    );
  }

  return (
    <div className="h-screen">
      {/* שכבות רצפה מאחור */}
      <div className="fixed inset-0 -z-10 pointer-events-none" style={casinoFloorStyle} />

      <div className="h-full grid gap-3 md:grid-cols-[1fr_300px] px-4 md:px-6 pt-4">
        {/* שמאל: המשחק */}
        <div className="h-full flex flex-col min-h-0">
          <RoomHeader
            state={state}
            me={me}
            code={code}
            onLeave={onLeave}
            onStart={() => socket.emit('startGame', { code })}
          />
          <div className="flex-1 min-h-0">
            <Table
              state={state}
              me={me}
              onAction={(kind, amount) =>
                socket.emit('action', { code, kind, amount })
              }
            />
          </div>

          {/* כפתור חשיפה — מובייל: קליק אחד גולל ל-extras */}
          <div className="md:hidden flex justify-center mt-2 mb-3">
            <button
              className="px-4 py-2 rounded-full bg-white border border-slate-300 shadow text-sm font-medium"
              onClick={openExtrasOnce}
            >
              חשוף צ׳אט/היסטוריה
            </button>
          </div>
        </div>

        {/* ימין: צ'אט + יומן פעולות — גלוי גם במובייל כדי שיהיה למה לגלול */}
        <div
          id="extras"
          ref={extrasRef}
          className="block md:flex h-full min-h-0 overflow-hidden flex-col gap-3 mt-4 md:mt-0 scroll-mt-24"
        >
          {/* צ׳אט: גובה קבוע במובייל + גלילה פנימית */}
          <div className="rounded-2xl border border-slate-200 bg-white p-2 overflow-hidden">
            <div className="h-[42vh] md:h-auto md:max-h-none overflow-y-auto">
              <Chat chat={chat} onSend={sendChat} />
            </div>
          </div>

          {/* היסטוריה */}
          <div className="rounded-2xl border border-slate-200 bg-white p-2 overflow-hidden">
            <div className="h-[28vh] md:h-auto md:max-h-none overflow-y-auto">
              <ActivityFeed items={feed} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
