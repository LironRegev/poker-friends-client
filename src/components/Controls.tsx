import React, { useMemo, useState, useEffect } from 'react';
import { getSocket } from '../api/socket';

type Card = { rank:number; suit:'♣'|'♦'|'♥'|'♠' };
type Player = {
  id: string; name: string; stack: number; seat: number;
  inHand: boolean; hasActedThisRound: boolean; isAllIn: boolean;
  isOwner?: boolean; holeCount?: number; hole?: Card[];
  publicHole?: Card[]; // חדש בצד לקוח
};
type Stage = 'waiting'|'preflop'|'flop'|'turn'|'river'|'showdown';
type State = {
  code: string;
  stage: Stage;
  players: Player[];
  dealerSeat: number;
  smallBlind: number;
  bigBlind: number;
  currentBet: number;
  minRaise: number; // קיים ב-state אך לא משתמשים בו למינימום אצלנו
  pot: number;
  community: Card[];
  turnSeat: number;
  lastAggressorSeat: number | null;
  message?: string;
  currency?: string;
  revealSeats?: number[]; // חדש: מי יכול לבצע Show/Muck
};

export default function Controls({
  state,
  me,
  onAction,
  onReveal
}:{
  state: State;
  me: { name: string; stack: number };
  onAction: (kind:'fold'|'check'|'call'|'bet'|'raise', amount?:number)=>void;
  onReveal?: (kind:'show'|'muck')=>void;
}) {
  const hero = useMemo(()=>{
    return (state.players as any[]).find(p => p.hole)
        || state.players.find(p => p.name === me.name)
        || state.players[0];
  }, [state.players, me.name]);

  const n = state.players.length || 1;
  const sbSeat = (state.dealerSeat + 1) % n;
  const bbSeat = (state.dealerSeat + 2) % n;
  const isSB = hero?.seat === sbSeat;
  const isBB = hero?.seat === bbSeat;

  const myTurn = !!hero && state.turnSeat === hero.seat
    && ['preflop','flop','turn','river'].includes(state.stage)
    && hero.inHand && !hero.isAllIn;

  const noRaiseYetPreflop = state.stage === 'preflop'
    && state.currentBet === state.bigBlind
    && state.lastAggressorSeat === bbSeat;

  const showSBComplete = myTurn && isSB && noRaiseYetPreflop;
  const completeDiff = Math.max(0, state.bigBlind - state.smallBlind);

  const showBBCheckPreflop = myTurn && isBB && noRaiseYetPreflop;

  const canGenericCheck = myTurn && state.currentBet === 0;
  const canCall = myTurn && state.currentBet > 0;
  const canBet = myTurn && state.currentBet === 0;
  const canRaise = myTurn && state.currentBet > 0;

  // ===== דלתא ל-RAISE BY/BET BY =====
  const BB = state.bigBlind || 1;
  const [delta, setDelta] = useState<number>(BB);

  // לאפס דלתא ל-BB בכל כניסה לתור
  useEffect(() => {
    if (myTurn) setDelta(BB);
  }, [myTurn, BB]);

  // לאפס דלתא ל-BB כשיש שינוי ב-currentBet (למשל אחרי רייז של יריב)
  useEffect(() => {
    setDelta(BB);
  }, [state.currentBet, BB]);

  const disabledClass = "opacity-50 cursor-not-allowed";
  const btn = "px-3 py-2 rounded-lg font-semibold transition";
  const primary = "bg-violet-600 text-white hover:bg-violet-700";
  const outline = "bg-white border border-slate-300 hover:bg-slate-50";
  const danger = "bg-rose-600 text-white hover:bg-rose-700";
  const subtle = "bg-slate-100 hover:bg-slate-200";

  const currency = state.currency ?? '₪';

  // האם ההירו רשאי לעשות Show/Muck?
  const heroCanReveal = state.stage === 'showdown'
    && typeof hero?.seat === 'number'
    && Array.isArray(state.revealSeats)
    && state.revealSeats.includes(hero.seat);

  // toCall להצגת סכום על CALL (UI אינפורמטיבי)
  const toCall = useMemo(() => {
    if (!canCall && !showSBComplete) return 0;
    if (showSBComplete) return completeDiff;
    return state.currentBet;
  }, [canCall, showSBComplete, completeDiff, state.currentBet]);

  // ===== BY (ללא יישור למכפלת BB, מינימום קבוע = BB) =====
  function handleRaiseBy() {
    // מותר כל סכום ≥ BB
    const legalDelta = Math.max(Math.floor(delta), BB);
    const target = state.currentBet + legalDelta;
    onAction('raise', target);
  }

  function handleBetBy() {
    // כשאין הימור: BET BY לפחות BB
    const legalBet = Math.max(Math.floor(delta), BB);
    onAction('bet', legalBet);
  }

  // --- "התחל משחק" ל-owner בלבד ב-waiting ---
  if (state.stage === 'waiting') {
    const iAmOwner = !!hero?.isOwner;
    const start = () => {
      getSocket().emit('startGame', { code: state.code }, (res?: any) => {
        if (res?.error) alert(res.error);
      });
    };
    return (
      <div className="w-full mt-2">
        <div className="text-xs text-slate-500 mb-2">
          שלב: {stageLabel(state.stage)}
          {" • "}בליינדים: {currency}{state.smallBlind}/{state.bigBlind}
        </div>
        <div className="flex items-center gap-2">
          {iAmOwner ? (
            <button className={`${btn} ${primary}`} onClick={start}>התחל משחק</button>
          ) : (
            <div className="text-sm text-slate-600">ממתינים לבעל החדר להתחיל…</div>
          )}
        </div>
      </div>
    );
  }
  // ---------------------------------------

  return (
    <div className="w-full mt-2">
      {/* סטטוס */}
      <div className="text-xs text-slate-500 mb-2">
        שלב: {stageLabel(state.stage)}
        {" • "}בליינדים: {currency}{state.smallBlind}/{state.bigBlind}
        {myTurn && ["preflop","flop","turn","river"].includes(state.stage) ? <>{" • "}תורך</> : null}
      </div>

      {/* חשיפה/הסתרה בשואודאון */}
      {heroCanReveal && (
        <div className="mb-3 flex items-center gap-2">
          <span className="text-sm text-slate-700">Show / Muck:</span>
          <button className={`${btn} ${subtle}`} onClick={()=> onReveal?.('show')}>Show</button>
          <button className={`${btn} ${subtle}`} onClick={()=> onReveal?.('muck')}>Muck</button>
        </div>
      )}

      {/* פעולות (לא בשואודאון) */}
      {['preflop','flop','turn','river'].includes(state.stage) && (
        <div className="flex flex-wrap items-center gap-2">
          {/* Fold */}
          <button
            className={`${btn} ${danger} ${!myTurn ? disabledClass : ''}`}
            onClick={()=> myTurn && onAction('fold')}
            disabled={!myTurn}
          >
            Fold
          </button>

          {/* Check ל-BB בפרה-פלופ כשאין העלאה */}
          {showBBCheckPreflop && (
            <button className={`${btn} ${outline}`} onClick={()=> onAction('check')}>Check</button>
          )}

          {/* Check גנרי */}
          {!showBBCheckPreflop && canGenericCheck && (
            <button className={`${btn} ${outline}`} onClick={()=> onAction('check')}>Check</button>
          )}

          {/* CALL (מציג סכום) */}
          {showSBComplete ? (
            <button className={`${btn} ${primary}`} onClick={()=> onAction('call')}>
              Call {completeDiff > 0 ? `(${currency}${completeDiff})` : ''}
            </button>
          ) : canCall ? (
            <button className={`${btn} ${primary}`} onClick={()=> onAction('call')}>
              {`Call${toCall ? ` (${currency}${toCall})` : ''}`}
            </button>
          ) : null}

          {/* מפריד גמיש */}
          <div className="grow" />

          {/* שדה וכפתורי BY */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                step={1}
                value={delta}
                onChange={(e)=> setDelta(Math.max(1, Math.floor(Number(e.target.value)||0)))}
                className="w-28 rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <span className="text-[11px] text-slate-500">
                {state.currentBet === 0
                  ? `min bet: ${currency}${BB}`
                  : `min raise: ${currency}${BB}`}
              </span>
            </div>

            {canBet && (
              <button
                className={`${btn} ${outline} ${!myTurn ? disabledClass : ''}`}
                onClick={handleBetBy}
                disabled={!myTurn}
                title="Bet By (מינימום BB, ללא יישור למכפלת BB)"
              >
                BET BY
              </button>
            )}

            {canRaise && (
              <button
                className={`${btn} ${outline} ${!myTurn ? disabledClass : ''}`}
                onClick={handleRaiseBy}
                disabled={!myTurn}
                title="Raise By (מינימום BB, ללא יישור למכפלת BB)"
              >
                RAISE BY
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function stageLabel(s: Stage) {
  switch (s) {
    case 'waiting': return 'ממתינים';
    case 'preflop': return 'פרה־פלופ';
    case 'flop': return 'פלופ';
    case 'turn': return 'טרן';
    case 'river': return 'ריבר';
    case 'showdown': return 'חשיפה';
    default: return s;
  }
}
