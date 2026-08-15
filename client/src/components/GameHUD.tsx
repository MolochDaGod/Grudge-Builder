/**
 * GameHUD — in-game overlay rendered on top of the 3D canvas.
 *
 * Shows: health/mana bars, minimap placeholder, hotbar, sector info,
 * player list, chat, and connection status.
 */
import { useState, useRef, useEffect } from 'react';
import { Heart, Zap, MessageSquare, Users, MapPin, Swords, Leaf, X } from 'lucide-react';

interface GameHUDProps {
  // Player stats
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  characterName: string;
  heroClass: string;
  level: number;
  // Sector info
  sectorId: string | null;
  sectorBiome?: string;
  // Players
  playerCount: number;
  enemyCount: number;
  // Connection
  connected: boolean;
  connecting: boolean;
  error: string | null;
  // Callbacks
  onSendChat?: (text: string) => void;
  onDisconnect?: () => void;
  /** Player windup (catalog ≥ 0.12 s) */
  castName?: string | null;
  castProgress?: number;
  /** Hostile telegraphs */
  enemyCasts?: Array<{ id: string; name: string; progress: number; remainingSec: number }>;
}

interface ChatMsg {
  id: number;
  sender: string;
  text: string;
  time: number;
}

const HOTBAR_SKILLS = [
  { slot: 1, key: '1', label: 'Skill 1', color: '#ff6b57' },
  { slot: 2, key: '2', label: 'Skill 2', color: '#6aa9ff' },
  { slot: 3, key: '3', label: 'Skill 3', color: '#6bdc8b' },
  { slot: 4, key: '4', label: 'Skill 4', color: '#c792ff' },
  { slot: 5, key: '5', label: '', color: '#333' }, // empty
  { slot: 6, key: '6', label: 'Food', color: '#f6c945' },
  { slot: 7, key: '7', label: 'Potion', color: '#ff4466' },
  { slot: 8, key: '8', label: 'Relic', color: '#9966ff' },
];

export function GameHUD(props: GameHUDProps) {
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  let msgId = useRef(0);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    props.onSendChat?.(chatInput.trim());
    setMessages(m => [...m, {
      id: ++msgId.current,
      sender: props.characterName,
      text: chatInput.trim(),
      time: Date.now(),
    }]);
    setChatInput('');
  };

  const hpPct = props.maxHp > 0 ? (props.hp / props.maxHp) * 100 : 0;
  const manaPct = props.maxMana > 0 ? (props.mana / props.maxMana) * 100 : 0;

  return (
    <div className="fixed inset-0 pointer-events-none z-50" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ── Top-left: Player frame ── */}
      <div className="absolute top-4 left-4 pointer-events-auto">
        <div className="bg-black/70 backdrop-blur-sm rounded-xl border border-white/10 p-3 w-64">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-xs font-bold text-black">
              {props.level}
            </div>
            <div>
              <div className="text-white text-sm font-bold">{props.characterName}</div>
              <div className="text-white/50 text-[10px] uppercase tracking-wider">{props.heroClass}</div>
            </div>
          </div>

          {/* HP bar */}
          <div className="relative h-4 bg-red-950/50 rounded-full overflow-hidden mb-1.5 border border-red-800/30">
            <div className="absolute inset-0 rounded-full transition-all duration-300" style={{ width: `${hpPct}%`, background: 'linear-gradient(90deg, #dc2626, #ef4444)' }} />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[10px] font-bold text-white drop-shadow-sm">{props.hp} / {props.maxHp}</span>
            </div>
          </div>

          {/* Mana bar */}
          <div className="relative h-3 bg-blue-950/50 rounded-full overflow-hidden border border-blue-800/30">
            <div className="absolute inset-0 rounded-full transition-all duration-300" style={{ width: `${manaPct}%`, background: 'linear-gradient(90deg, #2563eb, #3b82f6)' }} />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[9px] font-bold text-white drop-shadow-sm">{props.mana} / {props.maxMana}</span>
            </div>
          </div>
        </div>
      </div>

      {props.castName && (props.castProgress ?? 0) > 0 && (props.castProgress ?? 0) < 1 && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 pointer-events-none w-72">
          <div className="text-amber-200/90 text-[10px] uppercase tracking-widest text-center mb-1">
            {props.castName}
          </div>
          <div className="h-2 bg-black/60 rounded-full overflow-hidden border border-amber-500/30">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.round((props.castProgress ?? 0) * 100)}%`,
                background: 'linear-gradient(90deg, #f6c945, #fff3c2)',
              }}
            />
          </div>
        </div>
      )}

      {!!props.enemyCasts?.length && (
        <div className="absolute top-28 left-4 pointer-events-none w-56 space-y-1.5">
          {props.enemyCasts.slice(0, 4).map((e) => (
            <div key={e.id} className="bg-black/70 rounded-lg border border-red-500/30 px-2 py-1">
              <div className="flex justify-between text-[10px] text-red-200 mb-0.5">
                <span className="truncate">{e.name}</span>
                <span>{e.remainingSec.toFixed(1)}s</span>
              </div>
              <div className="h-1.5 bg-red-950/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500"
                  style={{ width: `${Math.round(e.progress * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Top-right: Sector info + connection ── */}
      <div className="absolute top-4 right-4 pointer-events-auto">
        <div className="bg-black/70 backdrop-blur-sm rounded-xl border border-white/10 p-3 text-right min-w-[180px]">
          <div className="flex items-center justify-end gap-2 mb-1">
            <MapPin className="w-3 h-3 text-amber-400" />
            <span className="text-white text-sm font-bold">{props.sectorId || 'None'}</span>
            <span className={`w-2 h-2 rounded-full ${props.connected ? 'bg-green-500' : props.connecting ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'}`} />
          </div>
          {props.sectorBiome && (
            <div className="text-white/40 text-[10px] uppercase tracking-wider mb-2">{props.sectorBiome}</div>
          )}
          <div className="flex items-center justify-end gap-3 text-[11px]">
            <span className="flex items-center gap-1 text-green-400"><Users className="w-3 h-3" />{props.playerCount}</span>
            <span className="flex items-center gap-1 text-red-400"><Swords className="w-3 h-3" />{props.enemyCount}</span>
          </div>
          {props.error && (
            <div className="text-red-400 text-[10px] mt-1 max-w-[200px] truncate">{props.error}</div>
          )}
        </div>
      </div>

      {/* ── Top-right: Minimap placeholder ── */}
      <div className="absolute top-24 right-4 pointer-events-auto">
        <div className="w-40 h-40 bg-black/60 backdrop-blur-sm rounded-xl border border-white/10 flex items-center justify-center">
          <div className="text-center">
            <div className="w-4 h-4 bg-amber-500 rounded-full mx-auto mb-1 animate-pulse" />
            <span className="text-white/30 text-[9px] uppercase tracking-wider">Minimap</span>
          </div>
        </div>
      </div>

      {/* ── Bottom-center: Hotbar ── */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-auto">
        <div className="flex gap-1.5 bg-black/60 backdrop-blur-sm rounded-2xl border border-white/10 p-2">
          {HOTBAR_SKILLS.map(s => (
            <div
              key={s.slot}
              className="relative w-12 h-12 rounded-xl border border-white/10 flex items-center justify-center cursor-pointer hover:border-white/30 transition-colors"
              style={{ background: `linear-gradient(180deg, ${s.color}22, ${s.color}08)` }}
            >
              <span className="text-white/70 text-[10px] font-medium">{s.label || '—'}</span>
              <span className="absolute top-0.5 left-1.5 text-[9px] text-white/30 font-bold">{s.key}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Bottom-left: Chat ── */}
      <div className="absolute bottom-6 left-4 pointer-events-auto">
        {chatOpen ? (
          <div className="w-80 bg-black/80 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/10">
              <span className="text-white/60 text-xs">Chat</span>
              <button onClick={() => setChatOpen(false)} className="text-white/30 hover:text-white"><X className="w-3 h-3" /></button>
            </div>
            <div className="h-32 overflow-y-auto px-3 py-1.5 space-y-1 text-xs">
              {messages.map(m => (
                <div key={m.id}>
                  <span className="text-amber-400 font-bold">{m.sender}: </span>
                  <span className="text-white/80">{m.text}</span>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div className="flex border-t border-white/10">
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendChat()}
                placeholder="Type a message..."
                className="flex-1 bg-transparent text-white text-xs px-3 py-2 outline-none placeholder:text-white/20"
              />
              <button onClick={handleSendChat} className="px-3 text-amber-400 hover:text-amber-300 text-xs font-bold">Send</button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setChatOpen(true)}
            className="bg-black/60 backdrop-blur-sm rounded-xl border border-white/10 p-2.5 text-white/40 hover:text-white/70 transition-colors"
          >
            <MessageSquare className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}
