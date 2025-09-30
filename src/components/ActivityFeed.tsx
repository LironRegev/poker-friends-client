import React, { useEffect, useRef } from 'react';

export type FeedItem = { ts: number; text: string };

export default function ActivityFeed({ items }: { items: FeedItem[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // גלילה אוטומטית לסוף
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [items]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white flex flex-col h-full">
      <div className="px-3 py-2 border-b border-slate-200 text-sm font-semibold text-slate-700">
        היסטוריית מהלכים
      </div>
      <div ref={ref} className="p-3 overflow-auto text-sm leading-relaxed space-y-2">
        {items.length === 0 ? (
          <div className="text-slate-400 text-xs">אין אירועים עדיין…</div>
        ) : (
          items.map((it, i) => (
            <div key={i} className="text-slate-700">
              <span className="text-[11px] text-slate-400 tabular-nums mr-2">
                {new Date(it.ts).toLocaleTimeString()}
              </span>
              <span>{it.text}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
