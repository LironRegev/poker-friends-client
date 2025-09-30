import React from 'react';

type WinnerInfo = {
  seat: number;
  name: string;
  amount: number;
  category: number | null;
  categoryName: string;
};

export default function WinnerBadge({
  winners,
  currency,
  heroSeat
}:{
  winners: WinnerInfo[];
  currency: string;
  heroSeat?: number;
}) {
  if (!winners?.length) return null;

  return (
    <div className="w-full flex flex-col items-center text-center">
      {/* כותרת גדולה */}
      <div className="inline-flex items-center gap-3 px-4 py-2 rounded-2xl bg-emerald-100/80 ring-1 ring-emerald-300 shadow-md text-emerald-900 text-xl md:text-2xl font-extrabold">
        <span aria-hidden>🏆</span>
        <span>Winner{winners.length>1 ? 's' : ''}</span>
      </div>

      {/* רשימת הזוכים – מיושרת מרכז וגדולה */}
      <ul className="mt-3 flex flex-col items-center gap-2">
        {winners.map(w => {
          const isHero = typeof heroSeat==='number' && w.seat === heroSeat;
          return (
            <li key={`${w.seat}-${w.name}`} className="flex flex-wrap items-center justify-center gap-2">
              <span
                className={[
                  "px-3 py-1 rounded-lg border text-base md:text-lg font-semibold",
                  isHero
                    ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                    : "bg-white border-slate-200 text-slate-700"
                ].join(' ')}
              >
                {w.name}{isHero ? ' (You)' : ''}
              </span>
              <span className="text-slate-600 text-base md:text-lg">{w.categoryName}</span>
              <span className="font-mono font-extrabold text-slate-900 text-xl md:text-2xl">
                +{currency}{w.amount}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
