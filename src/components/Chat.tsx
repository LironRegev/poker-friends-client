import React, { useEffect, useRef, useState } from 'react';

export default function Chat({
  chat,
  onSend,
}: {
  chat: { name: string; text: string; ts: number }[];
  onSend: (text: string) => void;
}) {
  const [msg, setMsg] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const t = msg.trim();
    if (!t) return;
    onSend(t);
    setMsg('');
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-3 py-2 border-b border-slate-200 text-sm font-semibold text-slate-700">
        Chat
      </div>

      <div ref={listRef} className="flex-1 overflow-auto p-3 space-y-2">
        {chat.length === 0 ? (
          <div className="text-slate-400 text-xs">No messages yet…</div>
        ) : (
          chat.map((m, i) => (
            <div key={i} className="text-sm">
              <span className="font-semibold text-slate-800">{m.name}</span>
              <span className="text-slate-400 text-xs ml-2">
                {new Date(m.ts).toLocaleTimeString()}
              </span>
              <div className="text-slate-700">{m.text}</div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={submit} className="p-2 border-t border-slate-200 flex items-center gap-2">
        <input
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          placeholder="Type a message…"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
        <button
          type="submit"
          className="px-3 py-2 rounded-lg bg-violet-600 text-white font-semibold hover:bg-violet-700"
        >
          Send
        </button>
      </form>
    </div>
  );
}
