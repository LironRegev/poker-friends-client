import React, { useMemo, useEffect, useRef, useState } from 'react';
import Controls from './Controls';
import { emitShowCards, emitMuckCards } from '../api/socket';
import WinnerBadge from './WinnerBadge';

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
  revealSeats?: number[];
  lastWinners?: WinnerInfo[];

  /* אופציונלי: מקורות לדראורים החדשים */
  actionLog?: Array<string | { ts:number; text:string }>;
  chatLog?: Array<string | { ts?:number; from?:string; text:string }>;

  /* שמות נפוצים נוספים שנתמוך בהם לנוחות */
  history?: Array<string | { ts?:number; text?:string }>;
  actions?: Array<string | { ts?:number; text?:string }>;
  moves?: Array<string | { ts?:number; text?:string }>;
  chat?: Array<string | { ts?:number; from?:string; text?:string }>;
  messages?: Array<string | { ts?:number; from?:string; text?:string }>;
  chatMessages?: Array<string | { ts?:number; from?:string; text?:string }>;
  chat_history?: Array<string | { ts?:number; from?:string; text?:string }>;
};

/* ---------- תמונות ---------- */
const CARD_DIR = '/cards';
const BACK_CANDIDATES = ['BACK.png', 'back.png', 'Back.png'];

const suitToWord = (s: Card['suit']) =>
  s === '♣' ? 'club' : s === '♦' ? 'diamond' : s === '♥' ? 'heart' : 'spade';

const rankToWord = (r: number) => {
  if (r >= 2 && r <= 10) return String(r);
  if (r === 11) return 'Jack';
  if (r === 12) return 'Queen';
  if (r === 13) return 'King';
  return 'Ace';
};

const fileForCard = (c: Card) => `${suitToWord(c.suit)}${rankToWord(c.rank)}.png`;

function CardImg({ card }:{ card: Card }) {
  const src = `${CARD_DIR}/${fileForCard(card)}`;
  const alt = `${suitToWord(card.suit)}${rankToWord(card.rank)}`;
  return (
    <img
      src={src}
      alt={alt}
      className="w-full h-full object-contain"
      onError={(e)=>{
        const img = e.currentTarget as HTMLImageElement;
        if (!img.dataset.fallback) {
          img.dataset.fallback = '1';
          img.src = `${CARD_DIR}/${BACK_CANDIDATES[0]}`;
        } else {
          img.style.visibility = 'hidden';
        }
      }}
    />
  );
}

function BackImg({ className = '' }:{ className?: string }) {
  const onErr = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget as HTMLImageElement;
    const idx = Number(img.dataset.idx || 0);
    const next = idx + 1;
    if (next < BACK_CANDIDATES.length) {
      img.dataset.idx = String(next);
      img.src = `${CARD_DIR}/${BACK_CANDIDATES[next]}`;
    } else {
      img.style.visibility = 'hidden';
    }
  };
  return (
    <img
      src={`${CARD_DIR}/${BACK_CANDIDATES[0]}`}
      alt="Back"
      className={`w-full h-full object-contain opacity-40 ${className}`}
      onError={onErr}
      data-idx="0"
    />
  );
}

/** deal/appear חלק (GPU) */
function AnimatedDeal({ children, delayMs = 0 }:{ children: React.ReactNode; delayMs?: number; }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setVisible(false);
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);
  const style: React.CSSProperties = {
    transition: `opacity 600ms cubic-bezier(0.22,1,0.36,1) ${delayMs}ms, transform 600ms cubic-bezier(0.22,1,0.36,1) ${delayMs}ms`,
    opacity: visible ? 1 : 0,
    transform: visible ? 'translate3d(0,0,0)' : 'translate3d(0,14px,0)',
    willChange: 'transform, opacity',
    width: '100%', height: '100%',
  };
  return <div style={style}>{children}</div>;
}

/** flip עדין לחשיפה */
function FlipIn({ children, delayMs = 0 }:{ children: React.ReactNode; delayMs?: number; }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setVisible(false);
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);
  const style: React.CSSProperties = {
    transform: visible ? 'rotateY(0deg)' : 'rotateY(90deg)',
    opacity: visible ? 1 : 0,
    transition: `transform 360ms cubic-bezier(0.22,1,0.36,1) ${delayMs}ms, opacity 360ms ease ${delayMs}ms`,
    transformStyle: 'preserve-3d',
    backfaceVisibility: 'hidden' as any,
    willChange: 'transform, opacity',
    width: '100%', height: '100%',
  };
  return <div style={style}>{children}</div>;
}

/** חשיפת קלפי קהילה – חלק */
function AnimatedFace({ children, delayMs = 0 }:{ children: React.ReactNode; delayMs?: number; }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setVisible(false);
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);
  const style: React.CSSProperties = {
    transition: `opacity 700ms cubic-bezier(0.22,1,0.36,1) ${delayMs}ms, transform 700ms cubic-bezier(0.22,1,0.36,1) ${delayMs}ms`,
    opacity: visible ? 1 : 0,
    transform: visible ? 'translate3d(0,0,0)' : 'translate3d(0,16px,0)',
    willChange: 'transform, opacity',
    width: '100%', height: '100%',
  };
  return <div style={style}>{children}</div>;
}

/** כניסה מלמטה עדינה */
function SlideIn({ children, delayMs = 0 }:{ children: React.ReactNode; delayMs?: number; }) {
  const [v, setV] = useState(false);
  useEffect(() => {
    setV(false);
    const raf = requestAnimationFrame(()=> setV(true));
    return () => cancelAnimationFrame(raf);
  }, []);
  const style: React.CSSProperties = {
    transition: `opacity 420ms cubic-bezier(0.22,1,0.36,1) ${delayMs}ms, transform 420ms cubic-bezier(0.22,1,0.36,1) ${delayMs}ms`,
    opacity: v ? 1 : 0,
    transform: v ? 'translate3d(0,0,0)' : 'translate3d(0,18px,0)',
    willChange: 'transform, opacity',
    width: '100%', height: '100%',
  };
  return <div style={style}>{children}</div>;
}

/* ===== חישובי Best-5 ===== */
function cmpRank(a:{cat:number;tb:number[]}, b:{cat:number;tb:number[]}): number {
  if (a.cat !== b.cat) return a.cat - b.cat;
  const len = Math.max(a.tb.length, b.tb.length);
  for (let i=0;i<len;i++){
    const x = a.tb[i] ?? 0, y = b.tb[i] ?? 0;
    if (x !== y) return x - y;
  }
  return 0;
}

function rank5(cards: Card[]): {cat:number; tb:number[]} {
  const ranks = cards.map(c=>c.rank).sort((a,b)=>b-a);
  const suits = cards.map(c=>c.suit);
  const countByRank: Record<number, number> = {};
  for (const r of ranks) countByRank[r] = (countByRank[r]||0) + 1;

  const groups = Object.entries(countByRank)
    .map(([r,c])=>({r:Number(r), c}))
    .sort((a,b)=> (b.c - a.c) || (b.r - a.r));

  const isFlush = suits.every(s => s === suits[0]);

  const uniqDesc = Array.from(new Set(ranks));
  const hasA = uniqDesc.includes(14);
  const descA5 = hasA ? [...uniqDesc, 1] : uniqDesc;
  let isStraight = false;
  let highStraight = 0;
  for (let i=0;i<=descA5.length-5;i++){
    const a = descA5[i];
    if (descA5[i+1] === a-1 && descA5[i+2] === a-2 && descA5[i+3] === a-3 && descA5[i+4] === a-4) {
      isStraight = true; highStraight = a === 1 ? 5 : a; break;
    }
  }

  if (isStraight && isFlush) return { cat: 8, tb: [highStraight] };
  if (groups[0]?.c === 4) {
    const quad = groups[0].r;
    const kicker = uniqDesc.find(r => r !== quad)!;
    return { cat: 7, tb: [quad, kicker] };
  }
  if (groups[0]?.c === 3 && groups[1]?.c === 2) return { cat: 6, tb: [groups[0].r, groups[1].r] };
  if (isFlush) return { cat: 5, tb: [...uniqDesc] };
  if (isStraight) return { cat: 4, tb: [highStraight] };
  if (groups[0]?.c === 3) {
    const kickers = uniqDesc.filter(r => r !== groups[0].r).slice(0,2);
    return { cat: 3, tb: [groups[0].r, ...kickers] };
  }
  if (groups[0]?.c === 2 && groups[1]?.c === 2) {
    const hi = Math.max(groups[0].r, groups[1].r);
    const lo = Math.min(groups[0].r, groups[1].r);
    const kicker = uniqDesc.find(r => r!==hi && r!==lo)!;
    return { cat: 2, tb: [hi, lo, kicker] };
  }
  if (groups[0]?.c === 2) {
    const pair = groups[0].r;
    const kickers = uniqDesc.filter(r => r!==pair).slice(0,3);
    return { cat: 1, tb: [pair, ...kickers] };
  }
  return { cat: 0, tb: [...uniqDesc] };
}

function best5From7(board: Card[], hole: Card[]) {
  const seven = [
    ...board.map((c, i) => ({ card: c, src: 'B' as const, idx: i })),
    ...hole.map((c, i) => ({ card: c, src: 'H' as const, idx: i })),
  ];
  let best: {rank:{cat:number;tb:number[]}, usedB:number[], usedH:number[]} | null = null;

  for (let e0=0; e0<6; e0++){
    for (let e1=e0+1; e1<7; e1++){
      const pick = seven.filter((_,i)=> i!==e0 && i!==e1);
      const rank = rank5(pick.map(p=>p.card));
      const usedB = pick.filter(p=>p.src==='B').map(p=>p.idx).sort((a,b)=>a-b);
      const usedH = pick.filter(p=>p.src==='H').map(p=>p.idx).sort((a,b)=>a-b);
      const cand = { rank, usedB, usedH };
      if (!best || cmpRank(cand.rank, best.rank) > 0) best = cand;
    }
  }
  if (!best) return null;

  const replaceIdxs = [0,1,2,3,4].filter(i => !best!.usedB.includes(i));
  const enterCards = best.usedH.map(hIdx => hole[hIdx]);

  return {
    usedBoardIdxs: best.usedB,
    replaceIdxs,
    enterCards,
    bestRank: best.rank,
  };
}

/* ====== SFX ====== */
const SFX_TURN = '/sfx/turn1.wav';
const SFX_RAISE = '/sfx/poker_chips1-87592.mp3';

/* ===== קומפוננטה ===== */
export default function Table({
  state,
  me,
  onAction,
}:{
  state: State;
  me: { name: string; stack: number };
  onAction: (kind:'fold'|'check'|'call'|'bet'|'raise', amount?:number)=>void;
}) {
  /* מסמן את הגוף במובייל כדי להחביא פנלים ישנים */
  useEffect(() => {
    const on = () => document.body.classList.add('pf-mobile-clean');
    const off = () => document.body.classList.remove('pf-mobile-clean');
    on();
    return off;
  }, []);

  const hero = useMemo(()=>{
    return (state.players as any[]).find(p => p.hole)
        || state.players.find(p => p.name === me.name)
        || state.players[0];
  }, [state.players, me.name]);

  const n = Math.max(1, state.players.length);
  const sbSeat = (state.dealerSeat + 1) % n;
  const bbSeat = (state.dealerSeat + 2) % n;

  const opponents = useMemo(()=> state.players.filter(p => p.id !== hero?.id), [state.players, hero?.id]);
  const currency = state.currency ?? '₪';

  const heroIsDealer = !!hero && hero.seat === state.dealerSeat;
  const heroIsSB = !!hero && hero.seat === sbSeat;
  const heroIsBB = !!hero && hero.seat === bbSeat;

  const isSeatTurn = (seat:number) =>
    seat === state.turnSeat && ['preflop','flop','turn','river'].includes(state.stage);

  const winnerSeats = useMemo(() => new Set((state.lastWinners ?? []).map(w => w.seat)), [state.lastWinners]);
  const isSeatWinner = (seat:number) => winnerSeats.has(seat);

  const onReveal = (kind:'show'|'muck') => {
    if (!state?.code) return;
    if (kind === 'show') emitShowCards(state.code);
    else emitMuckCards(state.code);
  };

  const [winnerIdx, setWinnerIdx] = useState(0);
  const timerRef = useRef<number | null>(null);
  const CYCLE_MS = 2600;
  const FALL_MS  = 320;
  const ENTER_MS = 420;

  useEffect(() => {
    if (state.stage === 'showdown' && state.lastWinners && state.lastWinners.length > 0) {
      setWinnerIdx(0);
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
      const tick = (i:number) => {
        setWinnerIdx(i);
        const hasNext = i < state.lastWinners!.length - 1;
        if (hasNext) timerRef.current = window.setTimeout(() => tick(i+1), CYCLE_MS);
      };
      tick(0);
      return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    } else {
      setWinnerIdx(0);
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    }
  }, [state.stage, state.lastWinners]);

  const winOverlay = useMemo(() => {
    if (state.stage !== 'showdown' || !state.lastWinners || state.lastWinners.length === 0) return null;
    if (state.community.length < 5) return null;

    const idx = Math.min(winnerIdx, state.lastWinners.length - 1);
    const mainSeat = state.lastWinners[idx].seat;
    const winner = state.players.find(p => p.seat === mainSeat);
    if (!winner) return null;

    let winnerHole: Card[] | undefined;
    if (hero && hero.seat === mainSeat && hero.hole) winnerHole = hero.hole;
    else if (winner.publicHole && winner.publicHole.length >= 2) winnerHole = winner.publicHole;

    if (!winnerHole) return null;
    const best = best5From7(state.community, winnerHole);
    if (!best) return null;

    const map: Record<number, Card> = {};
    const sorted = [...best.replaceIdxs].sort((a,b)=>a-b);
    sorted.forEach((idx, i) => { map[idx] = best.enterCards[i]; });

    return { usedBoardIdxs: best.usedBoardIdxs, replaceIdxs: sorted, enteringMap: map as Record<number, Card>, FALL_MS, ENTER_MS };
  }, [state.stage, state.lastWinners, state.players, state.community, hero, winnerIdx]);

  const heroCompact = state.stage === 'showdown';
  const heroTurn = hero ? isSeatTurn(hero.seat) : false;

  const [liveBanner, setLiveBanner] = useState<null | { text: string; key: number }>(null);
  const [potPulse, setPotPulse] = useState(false);
  const [highlightSeat, setHighlightSeat] = useState<number | null>(null);
  const prevBetRef = useRef<number>(state.currentBet);
  const prevStageRef = useRef<Stage>(state.stage);

  const turnSfxRef = useRef<HTMLAudioElement | null>(null);
  const raiseSfxRef = useRef<HTMLAudioElement | null>(null);

  const [showMute, setShowMute] = useState(false);
  const [muteTurn, setMuteTurn] = useState<boolean>(false);
  const [muteRaise, setMuteRaise] = useState<boolean>(false);

  const [showChat, setShowChat] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    try {
      setMuteTurn(localStorage.getItem('pf_mute_turn') === '1');
      setMuteRaise(localStorage.getItem('pf_mute_raise') === '1');
    } catch {}
    turnSfxRef.current = new Audio(SFX_TURN);
    raiseSfxRef.current = new Audio(SFX_RAISE);
    if (turnSfxRef.current) { turnSfxRef.current.preload = 'auto'; }
    if (raiseSfxRef.current) { raiseSfxRef.current.preload = 'auto'; }
  }, []);

  const playTurn = () => {
    if (muteTurn) return;
    const a = turnSfxRef.current;
    if (!a) return;
    try { a.currentTime = 0; a.play().catch(()=>{}); } catch {}
  };
  const playRaise = () => {
    if (muteRaise) return;
    const a = raiseSfxRef.current;
    if (!a) return;
    try { a.currentTime = 0; a.play().catch(()=>{}); } catch {}
  };

  const wasHeroTurnRef = useRef<boolean>(false);
  useEffect(() => {
    const was = wasHeroTurnRef.current;
    if (heroTurn && !was) playTurn();
    wasHeroTurnRef.current = heroTurn;
  }, [heroTurn]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const prevBet = prevBetRef.current;
    const increased = state.currentBet > prevBet;
    prevBetRef.current = state.currentBet;

    const stageOk = ['preflop','flop','turn','river'].includes(state.stage);
    const stageChanged = prevStageRef.current !== state.stage;
    prevStageRef.current = state.stage;

    if (!stageOk || state.lastAggressorSeat == null) return;
    if (increased) {
      const aggr = state.players.find(p => p.seat === state.lastAggressorSeat);
      const who = aggr?.name ?? 'שחקן';
      const txt = `${who} העלה ל־${currency}${state.currentBet}`;

      setLiveBanner({ text: txt, key: Date.now() });
      setPotPulse(true);
      setHighlightSeat(state.lastAggressorSeat);
      playRaise();

      window.setTimeout(() => setPotPulse(false), 650);
      window.setTimeout(() => setHighlightSeat(null), 900);
      window.setTimeout(() => setLiveBanner(null), 2600);
    } else if (stageChanged) {
      setPotPulse(false);
      setHighlightSeat(null);
      setLiveBanner(null);
    }
  }, [state.currentBet, state.lastAggressorSeat, state.stage, state.players, currency]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    try { localStorage.setItem('pf_mute_turn', muteTurn ? '1':'0'); } catch {}
  }, [muteTurn]);
  useEffect(() => {
    try { localStorage.setItem('pf_mute_raise', muteRaise ? '1':'0'); } catch {}
  }, [muteRaise]);

  /* ===== נורמליזציה של לוגים ===== */
  const normalizedHistory = useMemo(() => {
    const candidates: any[] = [
      (state as any).actionLog,
      (state as any).history,
      (state as any).actions,
      (state as any).moves,
    ].filter(Boolean);
    const raw = candidates[0];
    if (!Array.isArray(raw)) return [] as { ts:number; text:string }[];
    return raw.map((r:any) => {
      if (typeof r === 'string') return { ts: 0, text: r as string };
      const ts = typeof r?.ts === 'number' ? r.ts : 0;
      const text = typeof r?.text === 'string' ? r.text : String(r ?? '');
      return { ts, text };
    });
  }, [state]);

  const normalizedChat = useMemo(() => {
    const candidates: any[] = [
      (state as any).chatLog,
      (state as any).chat,
      (state as any).messages,
      (state as any).chatMessages,
      (state as any).chat_history,
    ].filter(Boolean);
    const raw = candidates[0];
    if (!Array.isArray(raw)) return [] as { ts:number; from?:string; text:string }[];
    return raw.map((r:any) => {
      if (typeof r === 'string') return { ts: 0, text: r as string };
      const ts = typeof r?.ts === 'number' ? r.ts : 0;
      const from = r?.from ? String(r.from) : undefined;
      const text = typeof r?.text === 'string' ? r.text : String(r ?? '');
      return { ts, from, text };
    });
  }, [state]);

  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [normalizedChat]);

  return (
    <div className="w-full h-full flex flex-col gap-3">
      <style>{`
        @keyframes ringPulse {
          0%,100% { box-shadow: 0 0 0 3px rgba(255,255,255,0.85), 0 0 18px rgba(255,255,255,0.55); }
          50%     { box-shadow: 0 0 0 1px rgba(255,255,255,0.25), 0 0 6px rgba(255,255,255,0.25); }
        }
        .turn-outline { animation: ringPulse 1.1s ease-in-out infinite; border-radius: 22px; }
        .hero-skin, .hero-skin * { color:#ffffff !important; font-weight:600; }
        .winner-text-force, .winner-text-force * { color:#000 !important; }
        .force-dark, .force-dark * { color:#000 !important; }

        .hero-skin input[type="number"]::-webkit-inner-spin-button,
        .hero-skin input[type="number"]::-webkit-outer-spin-button{
          -webkit-appearance: none; margin: 0;
        }
        .hero-skin input[type="number"]{ -moz-appearance: textfield; }

        .num-wrap { position: relative; }
        .num-wrap input { padding-right: 2.4rem; }
        .num-arrow{
          position: absolute; right: 8px; width: 22px; height: 18px;
          display: grid; place-items: center; background: transparent;
          border: 0; cursor: pointer; border-radius: 6px;
        }
        .num-arrow.up{ top: 6px; }
        .num-arrow.down{ bottom: 6px; }
        .num-arrow::before{
          content:''; width:0; height:0;
          border-left:6px solid transparent; border-right:6px solid transparent;
        }
        .num-arrow.up::before{ border-bottom:8px solid #fff; opacity:.95; }
        .num-arrow.down::before{ border-top:8px solid #fff; opacity:.95; }
        .num-arrow:hover{ background:rgba(255,255,255,.12); }
        .num-arrow:active{ transform: translateY(1px); }
      `}</style>

      {/* כפתורי מגירות — מובייל בלבד */}
      <div className="flex items-center justify-end gap-2 -mb-1 md:hidden">
        <button
          className="px-3 py-1.5 rounded-full border border-slate-300 bg-white hover:bg-slate-50 text-sm"
          onClick={()=>{ setShowChat(v=>!v); setShowHistory(false); }}
        >
          Chat
        </button>
        <button
          className="px-3 py-1.5 rounded-full border border-slate-300 bg-white hover:bg-slate-50 text-sm"
          onClick={()=>{ setShowHistory(v=>!v); setShowChat(false); }}
        >
          History
        </button>
      </div>

      {/* רצועת שחקנים */}
      <PlayersStrip
        players={opponents}
        dealerSeat={state.dealerSeat}
        sbSeat={sbSeat}
        bbSeat={bbSeat}
        isSeatTurn={isSeatTurn}
        isSeatWinner={isSeatWinner}
        highlightSeat={highlightSeat}
        currency={currency}
      />

      {/* שולחן + קופה */}
      <TableFelt
        pot={state.pot}
        currency={currency}
        potPulse={potPulse}
        community={state.community}
        winOverlay={winOverlay}
      />

      {/* HERO */}
      {hero && (
        <HeroBlock
          hero={hero}
          heroTurn={heroTurn}
          heroCompact={heroCompact}
          isSeatWinner={isSeatWinner}
          highlightSeat={highlightSeat}
          currency={currency}
          state={state}
          me={me}
          onAction={onAction}
          onReveal={onReveal}
          muteTurn={muteTurn}
          muteRaise={muteRaise}
          setShowMute={setShowMute}
          showMute={showMute}
          setMuteTurn={setMuteTurn}
          setMuteRaise={setMuteRaise}
        />
      )}

      {/* DRAWER: Chat — מובייל בלבד */}
      {showChat && (
        <div className="fixed inset-0 z-[80] md:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={()=>setShowChat(false)} />
          <div className="absolute right-0 top-0 h-full w-[88vw] sm:w-[420px] bg-white shadow-xl border-l border-slate-200 flex flex-col">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <div className="font-semibold">Chat</div>
              <button
                className="px-2 py-1 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-sm"
                onClick={()=> setShowChat(false)}
              >
                סגור
              </button>
            </div>
            <div ref={chatScrollRef} className="p-3 text-sm text-slate-700 overflow-auto grow">
              {normalizedChat.length === 0 ? (
                <div className="text-slate-500">אין הודעות עדיין…</div>
              ) : (
                <ul className="space-y-1.5">
                  {normalizedChat.map((m, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      {m.from ? <span className="font-semibold">{m.from}:</span> : null}
                      <span className="text-slate-700">{m.text}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DRAWER: History — מובייל בלבד */}
      {showHistory && (
        <div className="fixed inset-0 z-[80] md:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={()=>setShowHistory(false)} />
          <div className="absolute left-0 top-0 h-full w-[88vw] sm:w-[420px] bg-white shadow-xl border-r border-slate-200 flex flex-col">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <div className="font-semibold">History</div>
              <button
                className="px-2 py-1 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-sm"
                onClick={()=> setShowHistory(false)}
              >
                סגור
              </button>
            </div>
            <div className="p-3 text-sm text-slate-700 overflow-auto grow">
              {normalizedHistory.length === 0 ? (
                <div className="text-slate-500">אין מהלכים עדיין…</div>
              ) : (
                <ul className="space-y-1.5">
                  {normalizedHistory.map((h, idx) => (<li key={idx}>{h.text}</li>))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* באנר לייב */}
      {liveBanner && <LiveBanner text={liveBanner.text} />}
    </div>
  );
}

/* ===== רכיבי משנה מפורקים עבור ניקיון ===== */

function PlayersStrip({
  players, dealerSeat, sbSeat, bbSeat, isSeatTurn, isSeatWinner, highlightSeat, currency
}:{
  players: Player[];
  dealerSeat: number; sbSeat: number; bbSeat: number;
  isSeatTurn: (seat:number)=>boolean;
  isSeatWinner: (seat:number)=>boolean;
  highlightSeat: number | null;
  currency: string;
}) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
      {players.map((p) => {
        const isDealer = p.seat === dealerSeat;
        const isSB = p.seat === sbSeat;
        const isBB = p.seat === bbSeat;
        const isTurn = isSeatTurn(p.seat);
        const isWinner = isSeatWinner(p.seat);
        const oppCardCount = Math.max(0, p.holeCount ?? 2);

        const containerClass = [
          'rounded-xl flex flex-col gap-1.5',
          isWinner
            ? 'border-2 border-amber-500 bg-amber-50 p-4'
            : !p.inHand
              ? 'border-2 border-rose-500 bg-rose-50 p-3'
              : isTurn
                ? 'border-2 border-emerald-500 bg-emerald-50 p-3'
                : 'border border-slate-200 bg-white p-2',
          (highlightSeat === p.seat) ? 'outline outline-4 outline-amber-300/70 shadow-lg' : ''
        ].join(' ');

        return (
          <div key={p.id} className={containerClass}>
            <div className="flex items-center justify-between">
              <div className="font-semibold text-slate-800 truncate text-sm">{p.name}</div>
              <div className="text-[10px] text-slate-500">Seat {p.seat+1}</div>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-xs text-slate-700">{currency}{p.stack}</div>
              <div className="flex items-center gap-1 ml-auto">
                {isDealer && <Chip label="D" title="Dealer" />}
                {isSB && <Chip label="SB" title="Small Blind" />}
                {isBB && <Chip label="BB" title="Big Blind" />}
              </div>
            </div>

            <div className="text-[11px] text-slate-500">
              {p.inHand ? 'ביד' : 'מחוץ ליד'}
              {p.isAllIn ? ' • ALL-IN' : ''}
            </div>

            {oppCardCount > 0 && (
              <div className={`flex items-start gap-1.5 mt-1 ${!p.inHand ? 'opacity-50' : ''}`}>
                {Array.from({ length: oppCardCount }).map((_, i) => {
                  const visToken = p.publicHole && p.publicHole[i] ? 'face' : 'back';
                  const dealKey = `deal-${p.id}-${i}-${visToken}-${oppCardCount}`;
                  const face = p.publicHole && p.publicHole[i];

                  return (
                    <div
                      key={i}
                      className="
                        w-[60px] h-[90px]
                        sm:w-[64px] sm:h-[96px]
                        rounded-[0.3rem]
                        border overflow-hidden border-slate-300
                        bg-white
                        flex items-center justify-center
                        p-[0rem]
                      "
                    >
                      {face ? (
                        <FlipIn key={dealKey} delayMs={i * 120}>
                          <CardImg card={face} />
                        </FlipIn>
                      ) : (
                        <AnimatedDeal key={dealKey} delayMs={i * 220}>
                          <BackImg />
                        </AnimatedDeal>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TableFelt({
  pot, currency, potPulse, community, winOverlay
}:{
  pot: number; currency: string; potPulse: boolean;
  community: Card[];
  winOverlay: null | {
    usedBoardIdxs: number[]; replaceIdxs: number[]; enteringMap: Record<number, Card>;
    FALL_MS: number; ENTER_MS: number;
  };
}) {
  return (
    <div className="mt-1">
      <div className="relative mx-auto w-full max-w-[1100px] md:max-w-[1280px] -mt-2 md:-mt-2">
        <div className="relative mx-auto aspect-[13/3] max-h-[190px]">
          <div
            className="
              absolute inset-0 rounded-[999px]
              bg-[conic-gradient(from_210deg_at_50%_50%,#8a6a55_0%,#6e523d_30%,#8a6a55_65%,#5c4636_100%)]
              shadow-[inset_0_0_0_6px_rgba(0,0,0,0.12),0_10px_22px_rgba(0,0,0,0.22)]
            "
          />
          <div
            className="
              absolute inset-[12px] rounded-[999px]
              bg-[radial-gradient(ellipse_at_center,#7b604c_0%,#6a5242_45%,#5a463a_85%)]
              shadow-[inset_0_0_36px_rgba(0,0,0,0.22)]
            "
          />
          <div className="absolute inset-[12px] rounded-[999px] ring-1 ring-black/10 pointer-events-none" />

          <div className="absolute left-5 top-3 md:left-96 md:top-2 z-10 pointer-events-none select-none">
            <div className={`flex items-baseline gap-2 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.65)] transition-all duration-500 ${potPulse ? 'ring-2 ring-amber-300 rounded-full px-2 scale-105' : ''}`}>
              <span className="font-bold">Pot</span>
              <span className="font-extrabold">{currency}{pot}</span>
            </div>
          </div>

          <div className="absolute inset-[12px] rounded-[999px] grid place-items-center">
            <BoardCards community={community} winOverlay={winOverlay} />
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroBlock({
  hero, heroTurn, heroCompact, isSeatWinner, highlightSeat, currency, state, me, onAction, onReveal,
  muteTurn, muteRaise, setShowMute, showMute, setMuteTurn, setMuteRaise
}:{
  hero: Player; heroTurn: boolean; heroCompact: boolean;
  isSeatWinner: (seat:number)=>boolean;
  highlightSeat: number | null;
  currency: string;
  state: State; me: { name: string; stack: number };
  onAction: (kind:'fold'|'check'|'call'|'bet'|'raise', amount?:number)=>void;
  onReveal: (kind:'show'|'muck')=>void;
  muteTurn: boolean; muteRaise: boolean;
  setShowMute: React.Dispatch<React.SetStateAction<boolean>>;
  showMute: boolean;
  setMuteTurn: React.Dispatch<React.SetStateAction<boolean>>;
  setMuteRaise: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  return (
    <div className={`sticky bottom-0 ${heroCompact ? 'pt-1.5' : 'pt-3'} bg-gradient-to-t from-slate-50 via-slate-50/90 to-transparent`}>
      <div className={heroTurn ? 'turn-outline' : ''}>
        <div
          className={[
            'relative',
            'rounded-2xl hero-skin hero-felt',
            isSeatWinner(hero.seat)
              ? (heroCompact ? 'border-2 border-amber-500 bg-amber-50 p-3' : 'border-2 border-amber-500 bg-amber-50 p-5')
              : !hero.inHand
                ? (heroCompact ? 'border-2 border-rose-500 bg-rose-50 p-2.5' : 'border-2 border-rose-500 bg-rose-50 p-4')
                : (heroCompact ? `border border-[#2E7D32] p-2` : `border border-[#2E7D32] p-3`),
            (highlightSeat === hero.seat) ? 'outline outline-4 outline-amber-300/70 shadow-lg' : ''
          ].join(' ')}
        >
          {/* כפתור MUTE */}
          <div className="absolute right-3 top-38 z-50 select-none">
            <div className="relative">
              <button
                className="rounded-full p-2 border border-white/60 bg-white/15 hover:bg-white/25 transition"
                onClick={()=> setShowMute(v=>!v)}
                title="השתקת צלילים"
              >
                <span aria-hidden>{(muteTurn || muteRaise) ? '🔇' : '🔊'}</span>
              </button>
              {showMute && (
                <div className="force-dark absolute right-0 bottom-full mb-2 w-56 bg-white border border-slate-200 rounded-xl shadow p-3">
                  <div className="text-sm font-bold mb-2">השתקת צלילים</div>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={muteTurn} onChange={(e)=> setMuteTurn(e.target.checked)} />
                    Your Turn
                  </label>
                  <label className="flex items-center gap-2 text-sm mt-1">
                    <input type="checkbox" checked={muteRaise} onChange={(e)=> setMuteRaise(e.target.checked)} />
                    Raise / All-in
                  </label>
                  <div className="mt-3 flex justify-end">
                    <button className="px-3 py-1 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-sm" onClick={()=> setShowMute(false)}>סגור</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* עליון */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="font-semibold">{hero.name}</div>
              <div>{currency}{hero.stack}</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-xs text-white/80">Seat {hero.seat+1}</div>
              <div className="flex items-center gap-1">
                {(hero as any).seat === (state.dealerSeat) && <Chip label="D" title="Dealer" />}
                {(hero as any).seat === ((state.dealerSeat + 1) % (state.players.length || 1)) && <Chip label="SB" title="Small Blind" />}
                {(hero as any).seat === ((state.dealerSeat + 2) % (state.players.length || 1)) && <Chip label="BB" title="Big Blind" />}
              </div>
            </div>
          </div>

          {/* קלפים + וינר */}
          <div className="mt-2 flex flex-col items-center gap-3">
            {hero.hole && hero.hole.length > 0 && (<HeroCards hole={hero.hole} compact={heroCompact} />)}
            {state.lastWinners && state.lastWinners.length > 0 && (
              <div className="winner-text-force">
                <WinnerBadge winners={state.lastWinners} currency={currency} heroSeat={hero.seat} />
              </div>
            )}
          </div>

          {/* קונסולות פעולה */}
          <div className="mt-3">
            <Controls state={state} me={me} onAction={onAction} onReveal={onReveal} />
          </div>
        </div>
      </div>
    </div>
  );
}

function LiveBanner({ text }: { text: string }) {
  return (
    <div className="pointer-events-none fixed top-3 inset-x-0 z-[70] flex justify-center">
      <div className="rounded-full border border-amber-300 bg-amber-100/90 px-4 py-1 shadow text-amber-900 font-semibold tracking-wide">
        {text} <span className="ml-1">📈</span>
      </div>
    </div>
  );
}

function Chip({ label, title }:{label:string; title?:string}) {
  return (
    <span title={title} className="inline-flex items-center justify-center text-[10px] font-bold w-6 h-6 rounded-full bg-slate-800 text-white">
      {label}
    </span>
  );
}

function BoardCards({
  community,
  winOverlay
}:{
  community: Card[];
  winOverlay: null | {
    usedBoardIdxs: number[];
    replaceIdxs: number[];
    enteringMap: Record<number, Card>;
    FALL_MS: number;
    ENTER_MS: number;
  };
}) {
  const prevRef = useRef<(Card | undefined)[]>([]);
  const [appearKeys, setAppearKeys] = useState<number[]>([0,0,0,0,0]);
  const prevLenRef = useRef(0);
  const [delays, setDelays] = useState<number[]>([0,0,0,0,0]);

  useEffect(() => {
    setAppearKeys(prev => {
      const next = [...prev];
      for (let i = 0; i < 5; i++) {
        const hadBefore = !!prevRef.current[i];
        const hasNow = !!community[i];
        if (!hadBefore && hasNow) next[i] = (next[i] || 0) + 1;
      }
      prevRef.current = [...community];
      return next;
    });

    const prevLen = prevLenRef.current;
    const curLen = community.filter(Boolean).length;
    const d = [0,0,0,0,0];
    if (prevLen === 0 && curLen >= 3) { d[0]=0; d[1]=350; d[2]=700; }
    else if (prevLen === 3 && curLen === 4) { d[3]=0; }
    else if (prevLen === 4 && curLen === 5) { d[4]=0; }
    setDelays(d);
    prevLenRef.current = curLen;
  }, [community]);

  const [phase, setPhase] = useState<'idle'|'fall'|'enter'|'hold'>('idle');
  const sigRef = useRef<string>('none');
  useEffect(() => {
    const sig = winOverlay
      ? JSON.stringify({ b: winOverlay.usedBoardIdxs, r: winOverlay.replaceIdxs, e: Object.values(winOverlay.enteringMap).map(c=>`${c.rank}${c.suit}`) })
      : 'none';
    if (sigRef.current === sig) return;
    sigRef.current = sig;

    if (!winOverlay || winOverlay.replaceIdxs.length === 0) {
      setPhase('idle');
      return;
    }

    setPhase('fall');
    const t1 = setTimeout(()=> setPhase('enter'), winOverlay.FALL_MS);
    const t2 = setTimeout(()=> setPhase('hold'),  winOverlay.FALL_MS + winOverlay.ENTER_MS);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [winOverlay]);

  const falling = new Set(winOverlay?.replaceIdxs ?? []);
  const used    = new Set(winOverlay?.usedBoardIdxs ?? []);

  return (
    <div className="flex items-center justify-center gap-2 overflow-visible">
      {Array.from({ length: 5 }).map((_, i) => {
        const c = community[i];
        const faceKey = `face-${i}-${appearKeys[i]}`;

        const ghosted   = !!winOverlay && phase !== 'idle' && falling.has(i);
        const animateNow= !!winOverlay && phase === 'fall' && falling.has(i);

        const showEnter = winOverlay && (phase==='enter' || phase==='hold') && falling.has(i);
        const goldBoard = !!winOverlay && phase!=='idle' && used.has(i) && !falling.has(i);

        const wrapperClasses = [
          "relative",
          "w-[80px] h-[120px]",
          "rounded-[0.3rem]",
          goldBoard ? "ring-2 ring-amber-400 ring-offset-[3px] ring-offset-[#5a463a]" : "",
          "overflow-visible",
        ].join(" ");

        const ghostStyle: React.CSSProperties | undefined = ghosted ? {
          transform: 'translate3d(0,-45px,0) translateZ(0)',
          filter: 'grayscale(1) brightness(0.9)',
          opacity: 0.45,
          transition: animateNow ? 'transform 320ms ease, filter 320ms ease, opacity 320ms ease' : undefined,
          willChange: 'transform, opacity, filter'
        } : undefined;

        const enterCard = showEnter && winOverlay?.enteringMap[i];

        return (
          <div key={i} className={wrapperClasses}>
            <div style={ghostStyle}>
              {c ? (
                <AnimatedFace key={faceKey} delayMs={delays[i]}>
                  <div className="w-full h-full rounded-[0.3rem] shadow-[0_8px_16px_rgba(0,0,0,0.35)]">
                    <CardImg card={c} />
                  </div>
                </AnimatedFace>
              ) : (
                <BackImg className="opacity-60" />
              )}
            </div>

            {enterCard && (
              <div className="absolute inset-0">
                <SlideIn>
                  <div className="w-full h-full rounded-[0.3rem]">
                    <CardImg card={enterCard} />
                  </div>
                </SlideIn>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function HeroCards({ hole, compact = false }:{ hole: Card[]; compact?: boolean }) {
  const sz = compact ? ['w-[64px] h-[96px]'] : ['w-[80px] h-[120px]'];
  return (
    <div className="flex items-center gap-2">
      {hole.map((c, i) => {
        const k = `hero-${i}-${c.rank}-${c.suit}`;
        return (
          <div
            key={i}
            className={[
              ...sz,
              "rounded-[0.3rem]",
              "border overflow-hidden border-slate-300",
              "bg-white",
              "flex items-center justify-center",
              "p-[0rem]"
            ].join(' ')}
          >
            <AnimatedDeal key={k} delayMs={i * 220}>
              <CardImg card={c} />
            </AnimatedDeal>
          </div>
        );
      })}
    </div>
  );
}
