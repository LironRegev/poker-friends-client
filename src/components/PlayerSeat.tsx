import React, { useEffect, useState } from 'react';

type Suit = '♣'|'♦'|'♥'|'♠';
type Layout = 'fan' | 'inline';

const CARDS_DIR = '/cards';
const suitToFolder = (s:Suit) => s==='♣' ? 'club' : s==='♦' ? 'diamond' : s==='♥' ? 'heart' : 'spade';
const rankToName  = (n:number) => n===14 ? 'Ace' : n===13 ? 'King' : n===12 ? 'Queen' : n===11 ? 'Jack' : String(n);
const imgSrcFor   = (rank:number, suit:Suit) => `${CARDS_DIR}/${suitToFolder(suit)}${rankToName(rank)}.png`;

const rankLabel = (n:number)=> n===14?'A':n===13?'K':n===12?'Q':n===11?'J':String(n);

function Chip({ label, className }:{ label:string; className?:string }) {
  return (
    <div className={[
      "relative grid place-items-center rounded-full",
      "w-7 h-7 md:w-8 md:h-8 text-[10px] md:text-xs font-bold",
      "border border-slate-900 shadow-md",
      "ring-2 ring-white",
      className || ""
    ].join(" ")}>
      <span>{label}</span>
      <div className="absolute inset-1 rounded-full border border-white/50 pointer-events-none"></div>
    </div>
  );
}
const DealerChip = () => <Chip label="D"  className="bg-white text-slate-900" />;
const SBChip     = () => <Chip label="SB" className="bg-sky-600 text-white" />;
const BBChip     = () => <Chip label="BB" className="bg-amber-600 text-white" />;

function CardBack({ className }:{ className:string }) {
  return (
    <div className={`rounded-2xl border-4 border-slate-200 bg-white shadow-lg overflow-hidden select-none ${className}`}>
      <img src={`${CARDS_DIR}/BACK.png`} alt="BACK" className="w-full h-full object-cover" draggable={false}/>
    </div>
  );
}

function CardFaceImg({ rank, suit, className }:{ rank:number; suit:Suit; className:string }) {
  const [src, setSrc] = useState(imgSrcFor(rank, suit));
  useEffect(()=>{ setSrc(imgSrcFor(rank, suit)); }, [rank, suit]);
  return (
    <div className={`rounded-2xl border border-slate-900 bg-white shadow-sm overflow-hidden select-none ${className}`}>
      <img
        src={src}
        alt={`${rankLabel(rank)}${suit}`}
        className="w-full h-full object-cover"
        draggable={false}
        onError={() => setSrc(`${CARDS_DIR}/BACK.png`)}
      />
    </div>
  );
}

/** מעטפת אנימציה: חלוקת קלף (slide-up + fade), עם דיליי לפי אינדקס */
function AnimatedDeal({ children, delayMs=0 }:{ children:React.ReactNode; delayMs?:number }) {
  const [visible, setVisible] = useState(false);
  useEffect(()=>{
    setVisible(false);
    const raf = requestAnimationFrame(()=> setVisible(true));
    return ()=> cancelAnimationFrame(raf);
  }, []);
  const style: React.CSSProperties = {
    transitionProperty: 'opacity, transform',
    transitionDuration: '700ms',
    transitionTimingFunction: 'cubic-bezier(0.22,1,0.36,1)',
    transitionDelay: `${delayMs}ms`,
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0px)' : 'translateY(14px)',
  };
  return <div style={style}>{children}</div>;
}

export default function PlayerSeat({
  p, isDealer, isSB, isBB, isTurn, stage, myName,
  isHero=false, compact=false, showControls=false, controlsAtTop=false, ControlsComponent
}:{
  p:any; isDealer:boolean; isSB:boolean; isBB:boolean; isTurn:boolean; stage:string; myName:string;
  isHero?: boolean;
  compact?: boolean;
  showControls?: boolean;
  controlsAtTop?: boolean;
  ControlsComponent?: React.ReactNode;
}) {
  const isMe = p?.name === myName;
  const showHole = isMe || stage === 'showdown';

  // העדפת פריסה (לשחקן עצמו)
  const [myLayout, setMyLayout] = useState<Layout>('fan');
  useEffect(()=>{
    if (!isMe) return;
    const saved = (localStorage.getItem('pf:handLayout') as Layout|null);
    if (saved === 'fan' || saved === 'inline') setMyLayout(saved);
  }, [isMe]);

  const toggleLayout = () => {
    const next: Layout = myLayout === 'fan' ? 'inline' : 'fan';
    setMyLayout(next);
    localStorage.setItem('pf:handLayout', next);
  };

  const layout: Layout = isMe ? myLayout : 'fan';

  const baseSize =
    isHero
      ? "w-[clamp(88px,8vw,116px)]  h-[clamp(134px,11.3vw,176px)]"
      : compact
      ? "w-[clamp(70px,6.5vw,96px)]  h-[clamp(106px,10.2vw,142px)]"
      : "w-[clamp(84px,8vw,116px)]  h-[clamp(128px,11.8vw,176px)]";

  const cardClassByIndex = (i:number) => {
    if (layout === 'inline') return `${baseSize} rotate-0 ml-0`;
    const ml = compact ? "-ml-6 md:-ml-8" : "-ml-8 md:-ml-10";
    return [baseSize, i>0 ? ml : "", i===0 ? "-rotate-6" : "rotate-6"].join(" ");
  };

  const count = p?.holeCount ?? (Array.isArray(p?.hole) ? p.hole.length : 0);

  const cards = Array.from({ length: count }).map((_, i) => {
    const card = p?.hole?.[i];
    const revealed = !!(showHole && card);
    const cls = cardClassByIndex(i);

    // מפתח שיגרום לאנימציה בכל פעם שנוסף קלף או שנחשף (Show)
    const visToken = revealed ? `face-${card.rank}${card.suit}` : 'back';
    const dealKey = `deal-${p?.id ?? 'x'}-${i}-${visToken}-${count}`;

    return (
      <AnimatedDeal key={dealKey} delayMs={i * 220}>
        {revealed
          ? <CardFaceImg rank={card.rank} suit={card.suit} className={cls}/>
          : <CardBack className={cls}/>
        }
      </AnimatedDeal>
    );
  });

  return (
    <div
      className={[
        "relative overflow-visible",
        "rounded-2xl border",
        isTurn ? "border-emerald-400 ring-2 ring-emerald-200" : "border-slate-200",
        "bg-white",
        isHero ? "p-4 md:p-5 shadow-md min-h-[170px] md:min-h-[190px]"
               : compact ? "p-3 shadow-sm min-h-[140px]"
                         : "p-4 md:p-5 shadow-sm min-h-[180px] md:min-h-[210px]"
      ].join(" ")}
    >
      {/* צ'יפים: דילר/סמול/ביג */}
      <div className="absolute right-2 top-2 flex items-center gap-1.5">
        {isDealer && <DealerChip />}
        {isSB && <SBChip />}
        {isBB && <BBChip />}
      </div>

      {/* שם/סטאק */}
      <div className="flex justify-between items-center pr-16">
        <div className="font-semibold truncate">{p.name}</div>
        <div className="text-slate-700 font-mono">{p.stack}</div>
      </div>

      {/* כפתורי פעולה – למעלה בתוך ה-HERO (אם נדרש) */}
      {showControls && isMe && ControlsComponent && controlsAtTop && (
        <div className="mt-2">{ControlsComponent}</div>
      )}

      <div className="text-xs text-slate-500 mt-1">
        {p.inHand ? (p.isAllIn ? 'ALL-IN' : 'In hand') : 'Folded'}
      </div>

      {/* היד */}
      {count > 0 && (
        <div className={
          layout === 'inline'
            ? "flex items-start mt-3 gap-3"
            : "flex items-start mt-3 pl-6 pr-2 pt-4 pb-1"
        }>
          {cards}
        </div>
      )}

      {/* כפתורי פעולה – אם לא למעלה, אז למטה */}
      {showControls && isMe && ControlsComponent && !controlsAtTop && (
        <div className="mt-2">{ControlsComponent}</div>
      )}

      {/* מתג פריסת יד */}
      {isMe && (
        <button
          onClick={toggleLayout}
          className="absolute right-2 bottom-2 text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 font-medium shadow-sm"
          title={myLayout === 'fan' ? 'Change to side-by-side' : 'Change to fanned'}
        >
          {myLayout === 'fan' ? 'Fan' : 'Inline'}
        </button>
      )}
    </div>
  );
}
