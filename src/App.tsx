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

  // מוסיף תמיכה בצ'אט אופציונלי כדי שהמגירה במובייל תתמלא
  chatLog?: { ts?:number; from?:string; text:string }[];
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
      <g fill='none' stroke-linecap='round' stroke-linejoin='round'>
        <circle cx='150' cy='150' r='118' stroke='#d8b45e' stroke-opacity='.16' stroke-width='8'/>
        <circle cx='150' cy='150' r='100' stroke='#844457' stroke-opacity='.12' stroke-width='10'/>
        <circle cx='150' cy='150' r='84'  stroke='#f1d683' stroke-opacity='.18' stroke-width='5'/>
        <circle cx='150' cy='150' r='68'  stroke='#5a3645' stroke-opacity='.20' stroke-width='5'/>
      </g>
      <g fill='#f1d683' fill-opacity='.10'>
        ${Array.from({length:12}).map((_,i)=> {
          const a = i*30; const rad = 28;
          const cx = 150 + Math.cos(a*Math.PI/180)*rad;
          const cy = 150 + Math.sin(a*Math.PI/180)*rad;
          return `<ellipse cx='${cx.toFixed(2)}' cy='${cy.toFixed(2)}' rx='10' ry='18' transform='rotate(${a} ${cx.toFixed(2)} ${cy.toFixed(2)})'/>`;
        }).join('')}
      </g>
      <g fill='#f1d683' fill-opacity='.12'>
        ${Array.from({length:16}).map((_,i)=> {
          const a = i*22.5; const rad = 108;
          const cx = 150 + Math.cos(a*Math.PI/180)*rad;
          const cy = 150 + Math.sin(a*Math.PI/180)*rad;
          return `<circle cx='${cx.toFixed(2)}' cy='${cy.toFixed(2)}' r='3'/>`;
        }).join('')}
      </g>
    </svg>`.replace(/\s+/g, ' ');
  const carpetDataUri = `url("data:image/svg+xml;utf8,${encodeURIComponent(carpetTileSvg)}")`;

  const casinoFloorStyle: React.CSSProperties = {
    backgroundColor: '#211210',
    backgroundImage: [
      carpetDataUri,
      'linear-gradient(45deg, rgba(236,197,104,0.045) 1px, transparent 1px), linear-gradient(-45deg, rgba(236,197,104,0.045) 1px, transparent 1px)',
      'radial-gradient(rgba(255,255,255,0.035) 1px, transparent 1.4px)',
      'linear-gradient(120deg, #2a1512, #22110f 60%, #2a1512)'
    ].join(', '),
    backgroundSize: [
      '300px 300px',
      '18px 18px, 18px 18px',
      '28px 28px',
      '100% 100%'
    ].join(', '),
    backgroundPosition: [
      '0 0',
      '0 0, 9px 9px',
      '14px 14px',
      '0 0'
    ].join(', '),
    filter: 'saturate(0.85) brightness(0.92)',
  };

  if (!state) {
    // מוסיף רקע קבוע למסך – בלי לשנות את מבנה ה־Lobby
    return (
      <>
        <div className="fixed inset-0 -z-10 pointer-events-none" style={casinoFloorStyle} />
        <div className="fixed inset-0 -z-10 pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.22),transparent_65%)]" />
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

  // === דוחפים את הצ'אט המקומי לתוך state שנשלח ל-Table (למגירות מובייל) ===
  const stateForTable: State = useMemo(() => {
    const chatLog = chat.map(m => ({ ts: m.ts, from: m.name, text: m.text }));
    return { ...(state as State), chatLog };
  }, [state, chat]);

  return (
    <div className="h-screen">
      {/* שכבות רצפה מאחור — אינן משנות את הגריד/מידות */}
      <div className="fixed inset-0 -z-10 pointer-events-none" style={casinoFloorStyle} />
      <div className="fixed inset-0 -z-10 pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.22),transparent_65%)]" />

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
              state={stateForTable}
              me={me}
              onAction={(kind, amount) =>
                socket.emit('action', { code, kind, amount })
              }
            />
          </div>
        </div>

        {/* ימין: צ'אט + יומן פעולות — מוסתר לחלוטין במובייל */}
        <div className="hidden md:flex h-full min-h-0 overflow-hidden flex-col gap-3">
          <div className="flex-1 min-h-[200px] rounded-2xl border border-slate-200 bg-white p-2 overflow-y-auto">
            <Chat chat={chat} onSend={sendChat} />
          </div>
          <div className="flex-1 min-h-[200px]">
            <ActivityFeed items={feed} />
          </div>
        </div>
      </div>
    </div>
  );
}
