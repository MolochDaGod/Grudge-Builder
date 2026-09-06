import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import type { Room } from '@colyseus/sdk';
import { useAuth } from '@/contexts/AuthContext';
import { useCharacters } from '@/hooks/use-characters';
import { createGameClient } from '@/lib/gameClient';
import { resolvePlayDestination } from '@/lib/playHub';
import { WORLD_SECTORS } from '@shared/definitions/worldMapSectors';
import { assetUrl } from '@/lib/assetConfig';
import './game-lobby.css';

type LiveRoom = { roomId: string; name: string; clients: number; maxClients: number; locked?: boolean; metadata?: { kind?: string; title?: string; sectorId?: string; phase?: string } };
type Member = { sessionId: string; name: string; ready: boolean; connected: boolean };
type Council = { roomId: string; title: string; host: string; custom: boolean; sectorId: string; phase: string; maxClients: number; members: Member[] };
type Chat = { id: string; name: string; text: string; at: number };

export default function GameLobby() {
  const [, navigate] = useLocation();
  const { isAuthenticated, authLoading, authError, user, openLogin, handleLogout } = useAuth();
  const { characters, activeCharacter, activeId, setActive, error: rosterError, loading: rosterLoading } = useCharacters();
  const [view, setView] = useState(window.location.pathname.endsWith('/maps') ? 'maps' : 'sectors');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState('haven_shore');
  const [rooms, setRooms] = useState<LiveRoom[]>([]);
  const [service, setService] = useState('Checking realm…');
  const [serviceReady, setServiceReady] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);
  const [council, setCouncil] = useState<Council | null>(null);
  const [connection, setConnection] = useState('Sign in to join chat');
  const [notice, setNotice] = useState('');
  const [messages, setMessages] = useState<Chat[]>([]);
  const [draft, setDraft] = useState('');
  const [title, setTitle] = useState('');
  const [capacity, setCapacity] = useState(8);
  const [inviteOnly, setInviteOnly] = useState(false);
  const [busy, setBusy] = useState(false);
  const roomRef = useRef<Room | null>(null);
  const generation = useRef(0);
  const activeIdRef = useRef(activeId);
  activeIdRef.current = activeId;
  const sector = WORLD_SECTORS.find(s => s.id === selected) ?? WORLD_SECTORS[0];
  const me = council?.members.find(m => m.sessionId === roomRef.current?.sessionId);
  const host = council?.host === me?.sessionId;

  useEffect(() => {
    const controller = new AbortController();
    async function refresh() {
      const start = performance.now();
      try {
        const response = await fetch('/api/colyseus/health', { signal: controller.signal, cache: 'no-store' });
        if (!response.ok) throw new Error(`Realm service returned HTTP ${response.status}`);
        const data = await response.json();
        if (!data.matchMakerReady || !Array.isArray(data.activeRooms)) throw new Error('Realm is starting');
        setRooms(data.activeRooms);
        setLatency(Math.round(performance.now() - start));
        setServiceReady(true);
        setService('Realm online');
      } catch (error) {
        if (controller.signal.aborted) return;
        setServiceReady(false);
        setRooms([]);
        setService(error instanceof Error ? error.message : 'Realm unreachable');
      }
    }
    void refresh();
    const timer = setInterval(refresh, 15000);
    return () => { controller.abort(); clearInterval(timer); };
  }, []);

  const join = useCallback(async (mode: 'general' | 'create' | 'join', options: Record<string, unknown> = {}) => {
    const ticket = ++generation.current;
    setBusy(true);
    setNotice('');
    setConnection('Connecting…');
    setCouncil(null);
    setMessages([]);
    const previous = roomRef.current;
    roomRef.current = null;
    try {
      if (previous) await previous.leave();
      if (ticket !== generation.current) return;
      const client = createGameClient();
      const identity = { characterId: activeIdRef.current || undefined };
      const room = mode === 'create'
        ? await client.create('custom_lobby', { ...options, ...identity })
        : mode === 'join'
          ? await client.joinById(String(options.roomId), identity)
          : await client.joinOrCreate('game_lobby', identity);
      if (ticket !== generation.current) { await room.leave(); return; }
      roomRef.current = room;
      room.onMessage('lobby', (state: Council) => setCouncil(state));
      room.onMessage('history', (history: Chat[]) => setMessages(history));
      room.onMessage('chat', (message: Chat) => setMessages(current => [...current, message].slice(-80)));
      room.onMessage('notice', (text: string) => setNotice(text));
      room.onMessage('launch', (path: string) => {
        if (!path.startsWith('/play?')) return;
        navigate(path);
      });
      room.onDrop(() => setConnection('Reconnecting…'));
      room.onReconnect(() => { setConnection('Connected'); room.send('sync'); });
      room.onError((_code, message) => setNotice(message || 'Room connection failed.'));
      room.onLeave(() => {
        if (roomRef.current !== room) return;
        roomRef.current = null;
        setCouncil(null);
        setConnection('Disconnected');
      });
      room.send('sync');
      setConnection('Connected');
    } catch (error) {
      if (ticket !== generation.current) return;
      setConnection('Connection failed');
      setNotice(error instanceof Error ? error.message : 'Could not join this room.');
    } finally { if (ticket === generation.current) setBusy(false); }
  }, [navigate]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const invitation = new URLSearchParams(window.location.search).get('room');
    if (invitation && rosterLoading) return;
    void join(invitation ? 'join' : 'general', invitation ? { roomId: invitation } : {});
    return () => {
      ++generation.current;
      const room = roomRef.current;
      roomRef.current = null;
      void room?.leave().catch(() => {});
    };
  }, [isAuthenticated, join, rosterLoading]);

  async function continueGame() {
    if (!isAuthenticated) { openLogin('/lobby'); return; }
    setBusy(true);
    try { navigate((await resolvePlayDestination()).path); }
    catch (error) { setNotice(error instanceof Error ? error.message : 'Could not enter the game.'); }
    finally { setBusy(false); }
  }
  function enterSector() {
    if (!isAuthenticated) { openLogin('/lobby'); return; }
    if (!activeCharacter) { navigate('/create-character'); return; }
    navigate(`/play?sector=${encodeURIComponent(selected)}&mode=zone&worldSeed=grudge-world-1&characterId=${encodeURIComponent(activeCharacter.id)}&from=lobby`);
  }
  const filtered = WORLD_SECTORS.filter(s => `${s.name} ${s.biome}`.toLowerCase().includes(query.toLowerCase()));
  const customRooms = rooms.filter(r => r.name === 'custom_lobby' && !r.locked && (r.metadata?.title || '').toLowerCase().includes(query.toLowerCase()));

  return <main className="war-lobby">
    <aside className="war-sidebar">
      <a href="/" className="war-brand"><img src="/grudge-logo.png" alt="" /><span>GRUDGE<small>WARLORDS</small></span></a>
      <p className="war-eyebrow">WAR COUNCIL</p>
      <nav aria-label="Game navigation">
        <button aria-current={view === 'sectors' ? 'page' : undefined} onClick={() => setView('sectors')}>Active sectors</button>
        <button aria-current={view === 'custom' ? 'page' : undefined} onClick={() => setView('custom')}>Custom games</button>
        <button aria-current={view === 'maps' ? 'page' : undefined} onClick={() => setView('maps')}>Map collection</button>
        <a href="/heroes">Characters & crew</a><a href="/account">My account</a><a href="/lore">Chronicles & lore</a>
      </nav>
      <p className="war-eyebrow">CREATOR TOOLS</p>
      <nav aria-label="Creator navigation"><a href="/editor">Map editor</a><a href="/organizer">Asset organizer</a><a href="/diagnostics">Diagnostics & AI helper</a><a href="/deployments">Deployment desk</a></nav>
      <div className="war-profile">
        {activeCharacter && <img src={assetUrl(`races/${activeCharacter.raceId}-portrait.png`)} alt="" onError={e => { e.currentTarget.hidden = true; }} />}
        <strong>{user?.username || 'Guest explorer'}</strong>
        <span>{authLoading ? 'Checking account…' : isAuthenticated ? 'Grudge ID connected' : 'Browse the realm, then sign in'}</span>
        {isAuthenticated ? <button onClick={handleLogout}>Sign out</button> : <button onClick={() => openLogin('/lobby')}>Sign in with Grudge ID</button>}
      </div>
    </aside>
    <section className="war-main">
      <header className="war-topbar"><span className={serviceReady ? 'war-online' : 'war-offline'}>● {service}</span><span>{latency === null ? '—' : `${latency} ms HTTP round trip`}</span><a href="/research/warcraft-lobby.html">Design reference ↗</a></header>
      <div className="war-heading"><div><p className="war-eyebrow">THE SHATTERED SEAS AWAIT</p><h1>{view === 'custom' ? 'Custom games' : view === 'maps' ? 'Choose your frontier' : 'Enter the realm'}</h1><p>Gather your crew. Choose a shore. Leave your mark.</p></div><button className="war-primary" disabled={busy || authLoading} onClick={continueGame}>Continue journey →</button></div>
      {(notice || authError || rosterError) && <div role="alert" className="war-notice">{notice || authError || rosterError}</div>}
      <div className="war-character-bar"><label htmlFor="lobby-character">Active warlord</label><select id="lobby-character" value={activeId || ''} disabled={!isAuthenticated || rosterLoading || !!council?.custom} onChange={e => setActive(e.target.value)}><option value="">{rosterLoading ? 'Loading characters…' : 'Select a character'}</option>{characters.map(c => <option key={c.id} value={c.id}>{c.name} · Level {c.level || 1}</option>)}</select><a href="/create-character">Create character</a></div>
      <div className="war-browser">
        <section className="war-panel war-map-list"><div className="war-panel-title"><h2>{view === 'custom' ? 'Available games' : 'Warlords sectors'}</h2><span>{view === 'custom' ? customRooms.length : filtered.length}</span></div>
          <input aria-label="Search maps or games" placeholder="Search by map or biome…" value={query} onChange={e => setQuery(e.target.value)} />
          {view !== 'custom' ? <div className="war-sector-list">{filtered.map(s => {
            const active = rooms.filter(r => r.name === 'sector' && r.metadata?.sectorId === s.id);
            const count = active.reduce((sum, r) => sum + r.clients, 0);
            return <button className={selected === s.id ? 'selected' : ''} key={s.id} onClick={() => setSelected(s.id)}><span className={`war-map-dot biome-${s.biome}`} /><span><strong>{s.name}</strong><small>{s.biome} · {serviceReady ? active.length ? `${active.length} active shard${active.length > 1 ? 's' : ''}` : 'Opens on entry' : 'Status unavailable'}</small></span><b>{serviceReady ? `${count} players` : '—'}</b></button>;
          })}</div> : <div className="war-sector-list">{!customRooms.length && <p className="war-empty">{serviceReady ? 'No public custom games are waiting. Create a game for your crew.' : 'The room list is unavailable.'}</p>}{customRooms.map(room => <button key={room.roomId} disabled={busy || !isAuthenticated || !activeCharacter} onClick={() => void join('join', { roomId: room.roomId })}><span><strong>{room.metadata?.title || room.roomId}</strong><small>{room.metadata?.sectorId?.replaceAll('_', ' ')}</small></span><b>{room.clients}/{room.maxClients} · Join</b></button>)}</div>}
        </section>
        <section className="war-panel war-map-details"><div className={`war-map-banner biome-${sector.biome}`}><span className="war-eyebrow">{sector.biome} FRONTIER</span><h2>{sector.name}</h2><span>Warlords open world</span></div><div className="war-map-copy"><p>{sector.description}</p><blockquote>{sector.lore}</blockquote><div className="war-actions"><button className="war-primary" disabled={busy || !serviceReady} onClick={enterSector}>Enter sector</button><a href={`/lore/sectors/${sector.id}`}>Read sector lore</a></div></div>
          <form className="war-create" onSubmit={e => { e.preventDefault(); void join('create', { title, sectorId: selected, capacity, private: inviteOnly }); }}><h3>Create a custom sector game</h3><label>Game name<input required maxLength={60} value={title} onChange={e => setTitle(e.target.value)} placeholder="Name your expedition" /></label><div className="war-form-row"><label>Player slots<select value={capacity} onChange={e => setCapacity(Number(e.target.value))}>{[2,4,8,12,24].map(n => <option key={n}>{n}</option>)}</select></label><label>Visibility<select value={inviteOnly ? 'invite' : 'public'} onChange={e => setInviteOnly(e.target.value === 'invite')}><option value="public">Public</option><option value="invite">Invite link</option></select></label></div><p>Uses {sector.name} with a separate world seed. Invite links let signed-in players join.</p><button className="war-secondary" disabled={busy || !isAuthenticated || !activeCharacter || !serviceReady}>Create game</button></form>
        </section>
      </div>
      <section className="war-panel war-chat"><div className="war-panel-title"><div><h2>{council?.title || 'Warlords chat'}</h2><span>{connection}{council ? ` · ${council.members.length}/${council.maxClients}` : ''}</span></div><div className="war-actions"><button disabled={!isAuthenticated || busy} onClick={() => void join('general')}>General channel</button>{council?.custom && <button onClick={async () => { try { await navigator.clipboard.writeText(`${window.location.origin}/lobby?room=${encodeURIComponent(council.roomId)}`); setNotice('Invitation link copied.'); } catch { setNotice('Could not copy the invitation link.'); } }}>Copy invite</button>}</div></div>
        <div className="war-chat-grid"><div><div role="log" aria-label="Lobby messages" aria-live="polite" className="war-chat-log">{!messages.length && <p className="war-empty">{isAuthenticated ? 'Messages in this channel will appear here.' : 'Sign in to talk with other warlords.'}</p>}{messages.map(m => <p key={m.id}><time>{new Date(m.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time><strong>{m.name}</strong> {m.text}</p>)}</div><form className="war-composer" onSubmit={e => { e.preventDefault(); if (draft.trim() && connection === 'Connected') { roomRef.current?.send('chat', draft.trim()); setDraft(''); } }}><input aria-label="Message this lobby" value={draft} maxLength={500} onChange={e => setDraft(e.target.value)} placeholder={council?.custom ? 'Message your expedition…' : 'Message the general channel…'} disabled={connection !== 'Connected'} /><button disabled={!draft.trim() || connection !== 'Connected'}>Send</button></form></div><div className="war-members"><h3>{council?.custom ? 'Player slots' : 'In this channel'}</h3>{council?.members.map(m => <div key={m.sessionId}><span>{m.name}{m.sessionId === council.host ? ' ♛' : ''}</span><small>{!m.connected ? 'Reconnecting' : council.custom ? m.ready ? 'Ready' : 'Preparing' : 'Online'}</small></div>)}{council?.custom && <div className="war-actions"><button disabled={connection !== 'Connected'} onClick={() => roomRef.current?.send('ready', !me?.ready)}>{me?.ready ? 'Unready' : 'Ready to play'}</button>{host && <button className="war-primary" disabled={!council.members.every(m => m.ready && m.connected)} onClick={() => roomRef.current?.send('start')}>Start game</button>}</div>}</div></div>
      </section>
    </section>
  </main>;
}
