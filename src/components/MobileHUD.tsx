// client/src/components/MobileHUD.tsx
import React from 'react';
import Controls from './Controls';

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
};

type Props = {
  state: State;
  me: { name: string; stack: number };
  onAction: (kind:'fold'|'check'|'call'|'bet'|'raise', amount?:number)=>void;
  onReveal?: (kind:'show'|'muck')=>void;
  isHeroTurn: boolean;
};

export default function MobileHUD({
  state,
  me,
  onAction,
  onReveal,
  isHeroTurn,
}: Props) {
  const currency = state.currency ?? '₪';

  // לא משנה שום לוגיקה – רק עוטף את Controls ב־UI קומפקטי למובייל
  return (
    <div className="w-full md:hidden">
      <div className="fixed bottom-0 inset-x-0 z-40">
        <div className="bg-slate-50/95 backdrop-blur border-t border-slate-200">
          <div className="px-3 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{me.name}</span>
                <span className="text-sm text-slate-700">{currency}{me.stack}</span>
              </div>
              <div
                className={[
                  "text-xs rounded-full px-2 py-0.5 border",
                  isHeroTurn
                    ? "border-emerald-500 text-emerald-700 bg-emerald-50"
                    : "border-slate-300 text-slate-600 bg-white",
                ].join(" ")}
              >
                {isHeroTurn ? 'התור שלך' : 'ממתינים'}
              </div>
            </div>

            {/* שומר על אותה לוגיקת כפתורים בדיוק */}
            <div className="pb-2">
              <Controls
                state={state}
                me={me}
                onAction={onAction}
                onReveal={onReveal}
              />
            </div>
          </div>
          {/* רווח קטן מתחת לכפתורים שלא יידבקו לקצה המסך */}
          <div className="h-2" />
        </div>
      </div>
    </div>
  );
}
