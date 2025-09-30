// client/src/components/TableSkin.tsx
import React from 'react';

export default function TableSkin({ children }:{ children: React.ReactNode }) {
  return (
    <div className="relative mx-auto w-full max-w-[1200px] px-2">
      {/* שולחן אובאלי */}
      <div
        className="
          relative mx-auto
          aspect-[7/4] rounded-[999px]
          shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)]
          overflow-hidden
        "
      >
        {/* FELT */}
        <div
          className="
            absolute inset-0
            bg-emerald-800
            bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.25)_0%,rgba(0,0,0,0.15)_40%,transparent_70%)]
          "
        />
        {/* עומק/וינייט */}
        <div
          className="
            absolute inset-0 mix-blend-multiply opacity-40
            bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.25),transparent_60%)]
          "
        />
        {/* RAIL (שפה חיצונית) */}
        <div
          className="
            absolute -inset-3 rounded-[999px] pointer-events-none
            bg-[conic-gradient(from_200deg_at_50%_50%,#3b2f2a_0%,#251d1a_25%,#3b2f2a_60%,#1b1513_100%)]
            shadow-[inset_0_0_0_2px_rgba(255,255,255,0.06)]
          "
        />
        {/* ברק עדין על ה־rail */}
        <div
          className="
            absolute -inset-3 rounded-[999px] pointer-events-none
            bg-[radial-gradient(circle_at_40%_25%,rgba(255,255,255,0.15),transparent_40%)]
            opacity-30
          "
        />
        {/* WATERMARK/לוגו במרכז */}
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="text-white text-5xl md:text-6xl font-black tracking-widest uppercase opacity-5 select-none">
            Poker Friends
          </div>
        </div>

        {/* התוכן של השולחן */}
        <div className="absolute inset-[5%] flex flex-col items-stretch justify-between">
          {children}
        </div>
      </div>
    </div>
  );
}
