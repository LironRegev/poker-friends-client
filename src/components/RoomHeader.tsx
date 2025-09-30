import React from 'react';

export default function RoomHeader({
  state, me, code, onLeave, onStart
}:{
  state: any;
  me: {name:string; stack:number};
  code: string;
  onLeave: ()=>void;
  onStart: ()=>void;
}) {
  const curr = state.currency || '₪';
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <div className="space-y-0.5">
        <div className="text-xl font-bold text-violet-700">
          חדר #{state.code || code}
        </div>
        <div className="text-sm text-slate-600">
          Blinds: {curr}{state.smallBlind}/{curr}{state.bigBlind}
          {typeof state.buyInMin === 'number' && (
            <> • Min buy-in: {curr}{state.buyInMin}</>
          )}
          {typeof state.buyInDefault === 'number' && (
            <> • Default: {curr}{state.buyInDefault}</>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="text-sm text-slate-700">
          {me.name} • Stack: {curr}{me.stack}
        </div>
        <button
          onClick={onStart}
          className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-sm"
        >
          התחל משחק
        </button>
        <button
          onClick={onLeave}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
        >
          יציאה
        </button>
      </div>
    </div>
  );
}
