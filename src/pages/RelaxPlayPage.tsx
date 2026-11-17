import {
  Download,
  Flower2,
  Heart,
  Palette,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
  Wind,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type ActivityTab = 'memory' | 'catcher' | 'bubbles' | 'mandala';

// ==========================================
// 1. PETAL MEMORY MATCH
// ==========================================
interface MemoryCard {
  uid: number;
  pairId: string;
  symbol: string;
  label: string;
  tint: string;
  flipped: boolean;
  matched: boolean;
}

const MEMORY_SYMBOLS = [
  { id: 'lotus', symbol: '🪷', label: 'Lotus', tint: 'bg-[#F9E8EE] dark:bg-[#3A222B] text-[#9D4E63] dark:text-[#F0A8BA]' },
  { id: 'hibiscus', symbol: '🌺', label: 'Hibiscus', tint: 'bg-[#FCECE8] dark:bg-[#3A2520] text-[#B85B4C] dark:text-[#F0A99B]' },
  { id: 'herb', symbol: '🌿', label: 'Sage', tint: 'bg-[#E9F2EC] dark:bg-[#1E2E24] text-[#4C735B] dark:text-[#9FC6AE]' },
  { id: 'lavender', symbol: '🪻', label: 'Lavender', tint: 'bg-[#EFEAF8] dark:bg-[#292238] text-[#735D9B] dark:text-[#C5B3E6]' },
  { id: 'blossom', symbol: '🌸', label: 'Blossom', tint: 'bg-[#F8EAF1] dark:bg-[#36202B] text-[#A85378] dark:text-[#EB9EC0]' },
  { id: 'sun', symbol: '🌻', label: 'Sun', tint: 'bg-[#FAF2DF] dark:bg-[#332B19] text-[#A27C35] dark:text-[#E5C27D]' },
  { id: 'tulip', symbol: '🌷', label: 'Tulip', tint: 'bg-[#FBEAF0] dark:bg-[#391F29] text-[#B0496A] dark:text-[#F09EB9]' },
  { id: 'tea', symbol: '🍵', label: 'Matcha', tint: 'bg-[#EAF3EA] dark:bg-[#1F2D21] text-[#4B754E] dark:text-[#A3CFA6]' },
  { id: 'moon', symbol: '🌙', label: 'Moon', tint: 'bg-[#ECEBF7] dark:bg-[#242336] text-[#5D5B94] dark:text-[#B6B5E8]' },
  { id: 'sparkles', symbol: '✨', label: 'Glow', tint: 'bg-[#F8F1E3] dark:bg-[#332B1E] text-[#9C763B] dark:text-[#E5C185]' },
];

function createMemoryDeck(pairCount: number): MemoryCard[] {
  const chosen = MEMORY_SYMBOLS.slice(0, pairCount);
  const doubled = [...chosen, ...chosen].map((item, idx) => ({
    uid: idx,
    pairId: item.id,
    symbol: item.symbol,
    label: item.label,
    tint: item.tint,
    flipped: false,
    matched: false,
  }));
  for (let i = doubled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [doubled[i], doubled[j]] = [doubled[j], doubled[i]];
  }
  return doubled;
}

function PetalMemoryGame() {
  const [pairCount, setPairCount] = useState<6 | 8 | 10>(8);
  const [cards, setCards] = useState<MemoryCard[]>(() => createMemoryDeck(8));
  const [selected, setSelected] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [locked, setLocked] = useState(false);
  const [bestMoves, setBestMoves] = useState<Record<number, number>>(() => {
    try {
      const raw = window.localStorage.getItem('bloom_memory_best');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const allMatched = cards.length > 0 && cards.every((c) => c.matched);

  useEffect(() => {
    if (!running || allMatched) return;
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [running, allMatched]);

  useEffect(() => {
    if (allMatched && moves > 0) {
      setBestMoves((prev) => {
        const currentBest = prev[pairCount];
        if (!currentBest || moves < currentBest) {
          const updated = { ...prev, [pairCount]: moves };
          try {
            window.localStorage.setItem('bloom_memory_best', JSON.stringify(updated));
          } catch {
            // ignore
          }
          return updated;
        }
        return prev;
      });
    }
  }, [allMatched, moves, pairCount]);

  const resetGame = (newPairs: 6 | 8 | 10 = pairCount) => {
    setPairCount(newPairs);
    setCards(createMemoryDeck(newPairs));
    setSelected([]);
    setMoves(0);
    setSeconds(0);
    setRunning(false);
    setLocked(false);
  };

  const handleCardClick = (index: number) => {
    if (locked || cards[index].flipped || cards[index].matched) return;
    if (!running) setRunning(true);

    const nextCards = cards.map((c, idx) => (idx === index ? { ...c, flipped: true } : c));
    const nextSelected = [...selected, index];
    setCards(nextCards);
    setSelected(nextSelected);

    if (nextSelected.length === 2) {
      setMoves((m) => m + 1);
      setLocked(true);
      const [firstIdx, secondIdx] = nextSelected;
      if (nextCards[firstIdx].pairId === nextCards[secondIdx].pairId) {
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c, idx) =>
              idx === firstIdx || idx === secondIdx ? { ...c, matched: true } : c
            )
          );
          setSelected([]);
          setLocked(false);
        }, 280);
      } else {
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c, idx) =>
              idx === firstIdx || idx === secondIdx ? { ...c, flipped: false } : c
            )
          );
          setSelected([]);
          setLocked(false);
        }, 720);
      }
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold">Petal Memory Match</h2>
          <p className="text-xs text-[#6E5D66] dark:text-[#B5A7B0]">
            Flip cards to match soothing botanical pairs in as few moves as possible.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex p-1 rounded-xl border border-[#E6DFD7] dark:border-[#352E38] bg-[#FAF8F6] dark:bg-[#141115] text-xs">
            {(
              [
                { p: 6, l: 'Cozy 3×4' },
                { p: 8, l: 'Classic 4×4' },
                { p: 10, l: 'Bloom 4×5' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.p}
                type="button"
                onClick={() => resetGame(opt.p)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                  pairCount === opt.p
                    ? 'bg-[#9D4E63] text-white'
                    : 'text-[#594B53] dark:text-[#BFB2BA] hover:text-[#2B2328]'
                }`}
              >
                {opt.l}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => resetGame(pairCount)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#DFD6CE] dark:border-[#3C333F] text-xs font-medium hover:bg-[#F5F0EC] dark:hover:bg-[#262129] cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" /> New Shuffle
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 max-w-md">
        <div className="p-3 rounded-xl border border-[#E6DFD7] dark:border-[#352E38] bg-[#FAF8F6] dark:bg-[#141115]">
          <p className="text-[11px] text-[#6E5D66] dark:text-[#A598A0]">Moves</p>
          <p className="text-lg font-semibold tabular-nums">{moves}</p>
        </div>
        <div className="p-3 rounded-xl border border-[#E6DFD7] dark:border-[#352E38] bg-[#FAF8F6] dark:bg-[#141115]">
          <p className="text-[11px] text-[#6E5D66] dark:text-[#A598A0]">Time</p>
          <p className="text-lg font-semibold tabular-nums">
            {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}
          </p>
        </div>
        <div className="p-3 rounded-xl border border-[#E6DFD7] dark:border-[#352E38] bg-[#FAF8F6] dark:bg-[#141115]">
          <p className="text-[11px] text-[#6E5D66] dark:text-[#A598A0]">Best Moves</p>
          <p className="text-lg font-semibold tabular-nums">{bestMoves[pairCount] ?? '—'}</p>
        </div>
      </div>

      {allMatched && (
        <div className="p-4 rounded-2xl border border-[#C9D8CD] dark:border-[#395343] bg-[#F2F7F4] dark:bg-[#1D2A22] flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-display text-lg font-semibold text-[#2E523B] dark:text-[#A9D1B8]">
              All pairs matched!
            </p>
            <p className="text-xs text-[#4C6D58] dark:text-[#96B8A2]">
              Completed in {moves} moves and {seconds}s.
            </p>
          </div>
          <button
            type="button"
            onClick={() => resetGame(pairCount)}
            className="px-4 py-2 rounded-xl bg-[#5C7A67] hover:bg-[#496353] text-white text-xs font-medium cursor-pointer"
          >
            Play Again
          </button>
        </div>
      )}

      <div
        className={`grid gap-3 max-w-xl mx-auto ${
          pairCount === 10 ? 'grid-cols-4 sm:grid-cols-5' : 'grid-cols-4'
        }`}
      >
        {cards.map((card, idx) => {
          const revealed = card.flipped || card.matched;
          return (
            <button
              key={card.uid}
              type="button"
              onClick={() => handleCardClick(idx)}
              aria-label={revealed ? card.label : 'Hidden botanical card'}
              className={`aspect-square rounded-2xl border transition-all duration-200 flex flex-col items-center justify-center select-none cursor-pointer ${
                revealed
                  ? `${card.tint} border-[#D9C7CE] dark:border-[#4F3B44] scale-100`
                  : 'border-[#E6DFD7] dark:border-[#352E38] bg-gradient-to-br from-[#F7EEF1] to-[#EFE8E2] dark:from-[#261E24] dark:to-[#1B171D] hover:-translate-y-0.5 hover:border-[#C996A4]'
              } ${card.matched ? 'ring-2 ring-[#6E917B]/60' : ''}`}
            >
              {revealed ? (
                <>
                  <span className="text-2xl sm:text-3xl leading-none">{card.symbol}</span>
                  <span className="mt-1.5 text-[10px] font-medium opacity-85">{card.label}</span>
                </>
              ) : (
                <Flower2 className="h-5 w-5 text-[#B48594] dark:text-[#9D6E7D] opacity-70" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ==========================================
// 2. DEWDROP CATCHER (CANVAS ARCADE GAME)
// ==========================================
interface FallingItem {
  x: number;
  y: number;
  speed: number;
  radius: number;
  kind: 'dewdrop' | 'petal' | 'thorn';
}

function DewdropCatcherGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [status, setStatus] = useState<'idle' | 'playing' | 'paused' | 'gameover'>('idle');
  const [score, setScore] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [combo, setCombo] = useState(0);
  const [highScore, setHighScore] = useState<number>(() => {
    try {
      return Number(window.localStorage.getItem('bloom_catcher_high') || 0);
    } catch {
      return 0;
    }
  });

  const stateRef = useRef({
    basketX: 260,
    basketWidth: 88,
    items: [] as FallingItem[],
    score: 0,
    hearts: 3,
    combo: 0,
    lastSpawn: 0,
    keys: { left: false, right: false },
  });

  const startGame = () => {
    stateRef.current = {
      basketX: 260,
      basketWidth: 88,
      items: [],
      score: 0,
      hearts: 3,
      combo: 0,
      lastSpawn: performance.now(),
      keys: { left: false, right: false },
    };
    setScore(0);
    setHearts(3);
    setCombo(0);
    setStatus('playing');
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') stateRef.current.keys.left = true;
      if (e.key === 'ArrowRight' || e.key === 'd') stateRef.current.keys.right = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') stateRef.current.keys.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd') stateRef.current.keys.right = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    const width = canvas.width;
    const height = canvas.height;

    const drawStaticScene = () => {
      const dark = document.documentElement.classList.contains('dark');
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, dark ? '#1D1822' : '#FAF3F6');
      grad.addColorStop(1, dark ? '#161F1C' : '#EFF5F0');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      const s = stateRef.current;
      // Draw items
      for (const item of s.items) {
        ctx.save();
        ctx.beginPath();
        if (item.kind === 'dewdrop') {
          ctx.fillStyle = '#5B9AA9';
          ctx.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.55)';
          ctx.beginPath();
          ctx.arc(item.x - 3, item.y - 3, item.radius * 0.3, 0, Math.PI * 2);
          ctx.fill();
        } else if (item.kind === 'petal') {
          ctx.fillStyle = '#C96881';
          ctx.ellipse(item.x, item.y, item.radius, item.radius * 0.65, Math.PI / 5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = dark ? '#A48DB8' : '#53435C';
          ctx.moveTo(item.x, item.y - item.radius);
          ctx.lineTo(item.x + item.radius, item.y + item.radius);
          ctx.lineTo(item.x - item.radius, item.y + item.radius);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }

      // Draw Lotus Basket
      const by = height - 34;
      ctx.fillStyle = dark ? '#D6899D' : '#9D4E63';
      ctx.beginPath();
      ctx.roundRect(s.basketX - s.basketWidth / 2, by, s.basketWidth, 18, 9);
      ctx.fill();
      ctx.fillStyle = dark ? '#F0C7D2' : '#F8E3E8';
      ctx.beginPath();
      ctx.roundRect(s.basketX - s.basketWidth / 2 + 8, by + 3, s.basketWidth - 16, 4, 2);
      ctx.fill();
    };

    if (status !== 'playing') {
      drawStaticScene();
      return;
    }

    const tick = (now: number) => {
      const s = stateRef.current;
      if (s.keys.left) s.basketX -= 6.5;
      if (s.keys.right) s.basketX += 6.5;
      s.basketX = Math.max(s.basketWidth / 2 + 8, Math.min(width - s.basketWidth / 2 - 8, s.basketX));

      const spawnInterval = Math.max(360, 880 - s.score * 1.4);
      if (now - s.lastSpawn > spawnInterval) {
        s.lastSpawn = now;
        const r = Math.random();
        const kind: FallingItem['kind'] = r < 0.52 ? 'dewdrop' : r < 0.8 ? 'petal' : 'thorn';
        s.items.push({
          x: 24 + Math.random() * (width - 48),
          y: -16,
          speed: 2.3 + Math.min(3.8, s.score / 110) + Math.random() * 1.2,
          radius: kind === 'petal' ? 12 : 11,
          kind,
        });
      }

      const basketTop = height - 34;
      const remaining: FallingItem[] = [];
      let scoreChanged = false;
      let heartsChanged = false;

      for (const item of s.items) {
        item.y += item.speed;
        const hitsBasket =
          item.y + item.radius >= basketTop &&
          item.y - item.radius <= basketTop + 18 &&
          Math.abs(item.x - s.basketX) <= s.basketWidth / 2 + item.radius * 0.5;

        if (hitsBasket) {
          if (item.kind === 'thorn') {
            s.hearts -= 1;
            s.combo = 0;
            heartsChanged = true;
          } else {
            s.combo += 1;
            const base = item.kind === 'petal' ? 20 : 10;
            const mult = s.combo >= 5 ? 2 : 1;
            s.score += base * mult;
            scoreChanged = true;
          }
          continue;
        }

        if (item.y - item.radius <= height + 10) {
          remaining.push(item);
        } else if (item.kind !== 'thorn') {
          s.combo = 0;
        }
      }
      s.items = remaining;

      if (scoreChanged) {
        setScore(s.score);
        setCombo(s.combo);
      }
      if (heartsChanged) {
        setHearts(s.hearts);
        setCombo(0);
      }

      drawStaticScene();

      if (s.hearts <= 0) {
        setStatus('gameover');
        setHighScore((prev) => {
          const next = Math.max(prev, s.score);
          try {
            window.localStorage.setItem('bloom_catcher_high', String(next));
          } catch {
            // ignore
          }
          return next;
        });
        return;
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [status]);

  const handlePointerMove = (clientX: number) => {
    const canvas = canvasRef.current;
    if (!canvas || status !== 'playing') return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const x = (clientX - rect.left) * scaleX;
    stateRef.current.basketX = Math.max(
      stateRef.current.basketWidth / 2 + 8,
      Math.min(canvas.width - stateRef.current.basketWidth / 2 - 8, x)
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold">Dewdrop Catcher</h2>
          <p className="text-xs text-[#6E5D66] dark:text-[#B5A7B0]">
            Move with mouse, touch, or Arrow keys to catch blue dewdrops (+10) and rose petals (+20). Avoid purple thorns.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {status === 'playing' ? (
            <button
              type="button"
              onClick={() => setStatus('paused')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#DFD6CE] dark:border-[#3C333F] text-xs font-medium cursor-pointer"
            >
              <Pause className="h-3.5 w-3.5" /> Pause
            </button>
          ) : (
            <button
              type="button"
              onClick={status === 'paused' ? () => setStatus('playing') : startGame}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#9D4E63] hover:bg-[#843E51] text-white text-xs font-medium cursor-pointer"
            >
              <Play className="h-3.5 w-3.5" />{' '}
              {status === 'paused' ? 'Resume' : status === 'gameover' ? 'Play Again' : 'Start Game'}
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs">
        <div className="px-3.5 py-2 rounded-xl border border-[#E6DFD7] dark:border-[#352E38] bg-[#FAF8F6] dark:bg-[#141115]">
          Score: <span className="font-semibold tabular-nums">{score}</span>
        </div>
        <div className="px-3.5 py-2 rounded-xl border border-[#E6DFD7] dark:border-[#352E38] bg-[#FAF8F6] dark:bg-[#141115]">
          Combo: <span className="font-semibold tabular-nums">{combo}×</span>
          {combo >= 5 && <span className="ml-1 text-[#9D4E63] dark:text-[#E097AA]">(2× bonus!)</span>}
        </div>
        <div className="px-3.5 py-2 rounded-xl border border-[#E6DFD7] dark:border-[#352E38] bg-[#FAF8F6] dark:bg-[#141115] inline-flex items-center gap-1.5">
          Hearts:
          <span className="inline-flex items-center gap-0.5 text-[#B85D74]">
            {[0, 1, 2].map((i) => (
              <Heart key={i} className={`h-3.5 w-3.5 ${i < hearts ? 'fill-current' : 'opacity-25'}`} />
            ))}
          </span>
        </div>
        <div className="px-3.5 py-2 rounded-xl border border-[#E6DFD7] dark:border-[#352E38] bg-[#FAF8F6] dark:bg-[#141115]">
          High Score: <span className="font-semibold tabular-nums">{highScore}</span>
        </div>
      </div>

      <div className="relative max-w-[540px] mx-auto rounded-2xl overflow-hidden border border-[#E6DFD7] dark:border-[#352E38]">
        <canvas
          ref={canvasRef}
          width={540}
          height={340}
          onMouseMove={(e) => handlePointerMove(e.clientX)}
          onTouchMove={(e) => {
            if (e.touches[0]) handlePointerMove(e.touches[0].clientX);
          }}
          className="w-full h-auto block touch-none cursor-ew-resize"
        />

        {status !== 'playing' && (
          <div className="absolute inset-0 bg-[#2B2328]/35 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 text-center text-white">
            <p className="font-display text-2xl font-semibold">
              {status === 'gameover'
                ? `Round Complete · Score ${score}`
                : status === 'paused'
                ? 'Game Paused'
                : 'Ready to Catch Dewdrops?'}
            </p>
            <p className="mt-1.5 text-xs text-white/85 max-w-xs">
              Slide the rose basket across the garden to collect soothing dewdrops and lotus petals.
            </p>
            <button
              type="button"
              onClick={status === 'paused' ? () => setStatus('playing') : startGame}
              className="mt-4 px-5 py-2.5 rounded-xl bg-[#9D4E63] hover:bg-[#843E51] text-white text-xs font-semibold cursor-pointer"
            >
              {status === 'paused' ? 'Resume' : status === 'gameover' ? 'Play Again' : 'Start Playing'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// 3. CALM BUBBLE POP GARDEN
// ==========================================
const BUBBLE_PALETTE = [
  'from-[#F5DDE4] to-[#E5B8C6] dark:from-[#5D3342] dark:to-[#452430]',
  'from-[#E4DFEF] to-[#C8BEE0] dark:from-[#3B3352] dark:to-[#29233A]',
  'from-[#DCECE2] to-[#B7D4C2] dark:from-[#263C2E] dark:to-[#1B2B21]',
  'from-[#F7E8D8] to-[#E5C5A6] dark:from-[#4C3826] dark:to-[#362619]',
];

function CalmBubblePop() {
  const TOTAL = 30;
  const [popped, setPopped] = useState<boolean[]>(() => Array(TOTAL).fill(false));
  const [popCount, setPopCount] = useState(0);
  const [soundOn, setSoundOn] = useState(true);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playChime = useCallback(
    (index: number) => {
      if (!soundOn || typeof window === 'undefined') return;
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;
        if (!audioCtxRef.current) audioCtxRef.current = new AudioCtx();
        const ctx = audioCtxRef.current;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        // Gentle pentatonic notes
        const scale = [392, 440, 493.88, 587.33, 659.25, 783.99];
        osc.type = 'sine';
        osc.frequency.setValueAtTime(scale[index % scale.length], ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.24);
      } catch {
        // ignore audio errors
      }
    },
    [soundOn]
  );

  const popBubble = (idx: number) => {
    if (popped[idx]) return;
    playChime(idx);
    const next = popped.map((v, i) => (i === idx ? true : v));
    setPopped(next);
    setPopCount((c) => c + 1);
    if (next.every(Boolean)) {
      setTimeout(() => {
        setPopped(Array(TOTAL).fill(false));
      }, 550);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold">Calm Bubble Pop</h2>
          <p className="text-xs text-[#6E5D66] dark:text-[#B5A7B0]">
            A soothing tactile pop board with gentle pentatonic chimes to unwind your mind.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSoundOn((s) => !s)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#DFD6CE] dark:border-[#3C333F] text-xs font-medium cursor-pointer"
          >
            {soundOn ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
            {soundOn ? 'Chimes On' : 'Muted'}
          </button>
          <button
            type="button"
            onClick={() => setPopped(Array(TOTAL).fill(false))}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#9D4E63] hover:bg-[#843E51] text-white text-xs font-medium cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Refill Bubbles
          </button>
        </div>
      </div>

      <div className="text-xs text-[#6E5D66] dark:text-[#B5A7B0]">
        Bubbles popped this session: <span className="font-semibold text-[#2B2328] dark:text-[#F4EEF2] tabular-nums">{popCount}</span>
      </div>

      <div className="max-w-lg mx-auto p-5 rounded-3xl border border-[#E6DFD7] dark:border-[#352E38] bg-[#FAF8F6] dark:bg-[#141115] grid grid-cols-5 sm:grid-cols-6 gap-3.5">
        {popped.map((isPopped, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => popBubble(idx)}
            aria-label={`Bubble ${idx + 1}${isPopped ? ' popped' : ''}`}
            className={`aspect-square rounded-full transition-all duration-200 cursor-pointer flex items-center justify-center ${
              isPopped
                ? 'scale-75 bg-[#EDE6DF]/70 dark:bg-[#231E26] border border-dashed border-[#D5CAC0] dark:border-[#3C333F] opacity-55'
                : `bg-gradient-to-br ${BUBBLE_PALETTE[idx % BUBBLE_PALETTE.length]} shadow-sm hover:scale-105 active:scale-90 border border-white/60 dark:border-white/10`
            }`}
          >
            {!isPopped && <span className="w-2.5 h-2.5 rounded-full bg-white/45 -translate-x-1.5 -translate-y-1.5" />}
          </button>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// 4. MANDALA SKETCH & 4-7-8 BREATHING STUDIO
// ==========================================
const MANDALA_COLORS = ['#9D4E63', '#7E6B9B', '#5C7A67', '#C89B7B', '#5B8EA3'];

function MandalaAndBreathingStudio() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const [brushColor, setBrushColor] = useState(MANDALA_COLORS[0]);
  const [symmetry, setSymmetry] = useState<8 | 12>(12);

  // Breathing timer state
  const [breathingActive, setBreathingActive] = useState(false);
  const [breathTick, setBreathTick] = useState(0); // 0..18 seconds cycle (4 inhale + 7 hold + 8 exhale = 19s)

  useEffect(() => {
    if (!breathingActive) {
      setBreathTick(0);
      return;
    }
    const id = window.setInterval(() => {
      setBreathTick((t) => (t + 1) % 19);
    }, 1000);
    return () => window.clearInterval(id);
  }, [breathingActive]);

  const breathPhase = useMemo(() => {
    if (!breathingActive) return { label: 'Press Start', secondsLeft: 4, scale: 'scale-95' };
    if (breathTick < 4) return { label: 'Inhale Slowly', secondsLeft: 4 - breathTick, scale: 'scale-115' };
    if (breathTick < 11) return { label: 'Hold Gently', secondsLeft: 11 - breathTick, scale: 'scale-115' };
    return { label: 'Exhale Softly', secondsLeft: 19 - breathTick, scale: 'scale-90' };
  }, [breathingActive, breathTick]);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dark = document.documentElement.classList.contains('dark');
    ctx.fillStyle = dark ? '#18141B' : '#FFFDFB';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Faint center guide ring
    ctx.strokeStyle = dark ? 'rgba(255,255,255,0.06)' : 'rgba(157,78,99,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 60, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 130, 0, Math.PI * 2);
    ctx.stroke();
  }, []);

  useEffect(() => {
    clearCanvas();
  }, [clearCanvas]);

  const getCoords = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) * canvas.width) / rect.width,
      y: ((clientY - rect.top) * canvas.height) / rect.height,
    };
  };

  const drawSymmetricalSegment = (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const dx1 = p1.x - cx;
    const dy1 = p1.y - cy;
    const dx2 = p2.x - cx;
    const dy2 = p2.y - cy;

    ctx.strokeStyle = brushColor;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    for (let i = 0; i < symmetry; i++) {
      const angle = (i * 2 * Math.PI) / symmetry;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      ctx.beginPath();
      ctx.moveTo(cx + dx1 * cos - dy1 * sin, cy + dx1 * sin + dy1 * cos);
      ctx.lineTo(cx + dx2 * cos - dy2 * sin, cy + dx2 * sin + dy2 * cos);
      ctx.stroke();
    }
  };

  const handleSaveMandala = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bloom-mandala.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Symmetrical Mandala Pad */}
      <div className="lg:col-span-7 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-semibold">Petal Mandala Pad</h2>
            <p className="text-xs text-[#6E5D66] dark:text-[#B5A7B0]">
              Draw freely—every stroke blooms into symmetrical radial petals.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={clearCanvas}
              className="px-3 py-1.5 rounded-xl border border-[#DFD6CE] dark:border-[#3C333F] text-xs font-medium cursor-pointer"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleSaveMandala}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#9D4E63] text-white text-xs font-medium cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" /> Save PNG
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {MANDALA_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setBrushColor(c)}
                aria-label={`Select color ${c}`}
                className={`w-7 h-7 rounded-full cursor-pointer transition-transform ${
                  brushColor === c ? 'scale-115 ring-2 ring-offset-2 ring-[#2B2328] dark:ring-white' : ''
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="inline-flex p-1 rounded-xl border border-[#DFD6CE] dark:border-[#3C333F] text-xs">
            {([8, 12] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSymmetry(s)}
                className={`px-2.5 py-1 rounded-lg font-medium cursor-pointer ${
                  symmetry === s ? 'bg-[#9D4E63] text-white' : ''
                }`}
              >
                {s}-Petal
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl overflow-hidden border border-[#E6DFD7] dark:border-[#352E38] max-w-[420px]">
          <canvas
            ref={canvasRef}
            width={420}
            height={420}
            onPointerDown={(e) => {
              drawingRef.current = true;
              lastPointRef.current = getCoords(e.clientX, e.clientY);
            }}
            onPointerMove={(e) => {
              if (!drawingRef.current || !lastPointRef.current) return;
              const next = getCoords(e.clientX, e.clientY);
              drawSymmetricalSegment(lastPointRef.current, next);
              lastPointRef.current = next;
            }}
            onPointerUp={() => {
              drawingRef.current = false;
              lastPointRef.current = null;
            }}
            onPointerLeave={() => {
              drawingRef.current = false;
              lastPointRef.current = null;
            }}
            className="w-full h-auto block touch-none cursor-crosshair"
          />
        </div>
      </div>

      {/* 4-7-8 Breathing Pacer */}
      <div className="lg:col-span-5 rounded-2xl border border-[#E6DFD7] dark:border-[#352E38] bg-[#FAF8F6] dark:bg-[#141115] p-6 flex flex-col items-center text-center space-y-5">
        <div>
          <h3 className="font-display text-xl font-semibold">4-7-8 Calm Breathing</h3>
          <p className="mt-1 text-xs text-[#6E5D66] dark:text-[#B5A7B0]">
            Gentle rhythm to ease tension, cramps, or restlessness.
          </p>
        </div>

        <div className="py-6 flex items-center justify-center">
          <div
            className={`w-44 h-44 rounded-full bg-gradient-to-br from-[#F4DCE3] via-[#EAE2F3] to-[#DDECE2] dark:from-[#432632] dark:via-[#2E253D] dark:to-[#203329] border border-[#D9C3CC] dark:border-[#4F3B44] flex flex-col items-center justify-center transition-transform duration-1000 ease-in-out ${breathPhase.scale}`}
          >
            <Wind className="h-5 w-5 text-[#9D4E63] dark:text-[#E097AA] mb-1" />
            <span className="font-display text-lg font-semibold">{breathPhase.label}</span>
            {breathingActive && (
              <span className="text-xs text-[#6E5D66] dark:text-[#C5B8C0] tabular-nums mt-0.5">
                {breathPhase.secondsLeft}s
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setBreathingActive((a) => !a)}
          className="px-5 py-2.5 rounded-xl bg-[#5C7A67] hover:bg-[#496353] text-white text-xs font-medium cursor-pointer"
        >
          {breathingActive ? 'Pause Breathing' : 'Start 4-7-8 Cycle'}
        </button>
      </div>
    </div>
  );
}

// ==========================================
// MAIN RELAX & PLAY HUB PAGE
// ==========================================
export function RelaxPlayPage() {
  const [activeTab, setActiveTab] = useState<ActivityTab>('memory');

  const tabs: { id: ActivityTab; label: string; desc: string; icon: typeof Sparkles }[] = [
    { id: 'memory', label: 'Petal Memory', desc: 'Botanical pair matching', icon: Flower2 },
    { id: 'catcher', label: 'Dewdrop Catcher', desc: 'Arcade garden game', icon: Sparkles },
    { id: 'bubbles', label: 'Bubble Pop', desc: 'Soothing pop & chimes', icon: Heart },
    { id: 'mandala', label: 'Mandala & Breath', desc: 'Radial art & 4-7-8 breath', icon: Palette },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-[#E6DFD7] dark:border-[#352E38] bg-gradient-to-br from-[#FDF6F8] via-[#FFFFFF] to-[#F2F7F4] dark:from-[#261B21] dark:via-[#1D191F] dark:to-[#19231E] p-6 sm:p-7">
        <p className="text-xs font-medium text-[#9D4E63] dark:text-[#E097AA]">
          Relax & Mindful Play
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold">
          Take a gentle break & unwind
        </h1>
        <p className="mt-1.5 text-sm text-[#594B53] dark:text-[#BFB2BA] max-w-2xl">
          Calming mini-games and mindful creative activities built right into Bloom—perfect for passing time, lifting your mood, or relaxing during any phase of your cycle.
        </p>

        <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-3">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  active
                    ? 'border-[#9D4E63] bg-[#FFFFFF] dark:bg-[#2A1E24] shadow-sm'
                    : 'border-[#E6DFD7] dark:border-[#352E38] bg-[#FFFFFF]/70 dark:bg-[#1D191F]/70 hover:bg-[#FFFFFF] dark:hover:bg-[#1D191F]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon
                    className={`h-4 w-4 ${
                      active ? 'text-[#9D4E63] dark:text-[#E097AA]' : 'text-[#6E5D66] dark:text-[#A598A0]'
                    }`}
                  />
                  <span className="text-sm font-semibold">{t.label}</span>
                </div>
                <p className="mt-1 text-[11px] text-[#6E5D66] dark:text-[#A598A0]">{t.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      <section className="rounded-3xl border border-[#E6DFD7] dark:border-[#352E38] bg-[#FFFFFF] dark:bg-[#1D191F] p-5 sm:p-8 shadow-sm">
        {activeTab === 'memory' && <PetalMemoryGame />}
        {activeTab === 'catcher' && <DewdropCatcherGame />}
        {activeTab === 'bubbles' && <CalmBubblePop />}
        {activeTab === 'mandala' && <MandalaAndBreathingStudio />}
      </section>
    </div>
  );
}
