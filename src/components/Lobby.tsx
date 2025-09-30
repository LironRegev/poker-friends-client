import React, { useEffect, useState } from 'react';

type Me = { name: string; stack: number };

export default function Lobby({
  me, setMe, code, setCode,
  onCreateRoom, onJoinRoom,
}:{
  me: Me;
  setMe: React.Dispatch<React.SetStateAction<Me>>;
  code: string;
  setCode: (v:string)=>void;
  onCreateRoom: (settings: {
    smallBlind: number;
    bigBlind: number;
    buyInMin: number;
    buyInDefault: number;
    currency: string;
  }) => void;
  onJoinRoom: (desiredStack: number) => void;
}) {
  // טאב: Create / Join
  const [tab, setTab] = useState<'create'|'join'>('create');

  // ===== דיפולטים חדשים =====
  const [currency, setCurrency] = useState('₪');
  const [smallBlind, setSmallBlind] = useState(1);
  const [bigBlind, setBigBlind] = useState(2);
  const [buyInMin, setBuyInMin] = useState(20);
  const [buyInDefault, setBuyInDefault] = useState(50);

  // Stack להצטרפות (Join) – דיפולט 50
  const [joinStack, setJoinStack] = useState(50);

  useEffect(()=>{
    if (tab === 'create') {
      setMe(prev=>({ ...prev, stack: buyInDefault }));
    }
  }, [tab, buyInDefault, setMe]);

  const canCreate = !!me.name.trim() && smallBlind>0 && bigBlind>0 && buyInMin>0 && buyInDefault>=buyInMin;
  const canJoin = !!me.name.trim() && !!code.trim() && joinStack>0;

  const labelClass = "block text-sm font-medium text-slate-700";
  const inputClass = "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500";

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm p-5 md:p-6">
      <div className="flex gap-2 mb-4">
        <button
          className={`px-3 py-1.5 rounded-lg border ${tab==='create'?'border-violet-500 text-violet-700 bg-violet-50':'border-slate-300'}`}
          onClick={()=>setTab('create')}
        >צור חדר</button>
        <button
          className={`px-3 py-1.5 rounded-lg border ${tab==='join'?'border-violet-500 text-violet-700 bg-violet-50':'border-slate-300'}`}
          onClick={()=>setTab('join')}
        >הצטרף לחדר</button>
      </div>

      {tab === 'create' ? (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <label className={labelClass}>השם שלך</label>
              <input
                className={inputClass}
                value={me.name}
                onChange={(e)=>setMe(prev=>({...prev, name:e.target.value}))}
                placeholder="למשל: לירון"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>מטבע</label>
                <select
                  className={inputClass}
                  value={currency}
                  onChange={(e)=>setCurrency(e.target.value)}
                >
                  <option value="₪">₪ (ש"ח)</option>
                  <option value="$">$ (USD)</option>
                  <option value="€">€ (EUR)</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Small Blind</label>
                <input
                  type="number" min={1}
                  className={inputClass}
                  value={smallBlind}
                  onChange={(e)=>setSmallBlind(Number(e.target.value)||0)}
                />
              </div>
              <div>
                <label className={labelClass}>Big Blind</label>
                <input
                  type="number" min={1}
                  className={inputClass}
                  value={bigBlind}
                  onChange={(e)=>setBigBlind(Number(e.target.value)||0)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>מינימום כניסה</label>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">{currency}</span>
                  <input
                    type="number" min={1}
                    className={`${inputClass} flex-1`}
                    value={buyInMin}
                    onChange={(e)=>setBuyInMin(Number(e.target.value)||0)}
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>כניסה מומלצת (ברירת מחדל)</label>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">{currency}</span>
                  <input
                    type="number" min={buyInMin}
                    className={`${inputClass} flex-1`}
                    value={buyInDefault}
                    onChange={(e)=>setBuyInDefault(Number(e.target.value)||0)}
                  />
                </div>
              </div>
            </div>

            <button
              disabled={!canCreate}
              onClick={()=>{
                if (bigBlind < smallBlind) return alert('Big Blind חייב להיות גדול או שווה ל-SB');
                if (buyInDefault < buyInMin) return alert('ברירת מחדל חייבת להיות ≥ מינימום כניסה');
                onCreateRoom({ smallBlind, bigBlind, buyInMin, buyInDefault, currency });
              }}
              className={`w-full mt-2 rounded-lg px-4 py-2 font-semibold ${canCreate ? 'bg-violet-600 text-white hover:bg-violet-700' : 'bg-slate-200 text-slate-500'}`}
            >
              צור חדר
            </button>
          </div>

          <div className="space-y-3">
            <div className="rounded-xl border border-slate-200 p-3 bg-slate-50">
              <div className="text-sm text-slate-600">
                בעת יצירת החדר תיכנס אוטומטית עם סכום ברירת המחדל: <b>{currency}{buyInDefault}</b>.
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Join
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <label className={labelClass}>השם שלך</label>
              <input
                className={inputClass}
                value={me.name}
                onChange={(e)=>setMe(prev=>({...prev, name:e.target.value}))}
                placeholder="למשל: לירון"
              />
            </div>

            <div>
              <label className={labelClass}>קוד חדר</label>
              <input
                className={inputClass}
                value={code}
                onChange={(e)=>setCode(e.target.value)}
                placeholder="לדוגמה: AB12"
              />
            </div>

            <div>
              <label className={labelClass}>סכום כניסה</label>
              <div className="flex items-center gap-2">
                <span className="text-slate-500">{currency}</span>
                <input
                  type="number" min={1}
                  className={`${inputClass} flex-1`}
                  value={joinStack}
                  onChange={(e)=>{
                    const n = Number(e.target.value)||0;
                    setJoinStack(n);
                    setMe(prev=>({...prev, stack: n}));
                  }}
                />
              </div>
            </div>

            <button
              disabled={!canJoin}
              onClick={()=> onJoinRoom(joinStack)}
              className={`w-full mt-2 rounded-lg px-4 py-2 font-semibold ${canJoin ? 'bg-violet-600 text-white hover:bg-violet-700' : 'bg-slate-200 text-slate-500'}`}
            >
              הצטרף
            </button>
          </div>

          <div className="space-y-3">
            <div className="rounded-xl border border-slate-200 p-3 bg-slate-50">
              <div className="text-sm text-slate-600">
                המינימום נקבע על־ידי יוצר החדר. אם תכניס פחות מהמינימום, השרת יחזיר הודעת שגיאה בעת ההצטרפות.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
