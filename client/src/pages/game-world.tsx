import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { useColyseus, type PlayerInfo } from '@/hooks/use-colyseus';
import { GameHUD } from '@/components/GameHUD';
import { Island3DEngine, type Island3DEngineConfig } from '@/island3d/engine/Island3DEngine';
import { RemotePlayerManager, type RemotePlayerData } from '@/island3d/sync/RemotePlayerManager';
import { characterAPI } from '@/lib/api';
import { CLASS_WEAPON_MAP } from '@/lib/modelManifest';
import type { CreatureLootEvent } from '@/island3d/creatures/CreatureManager';
import { SkillEffectController } from '@/island3d/player/SkillEffects';
import { listEffects, getEffect } from '@/lib/effectsApi';
import { WorldLoading, WorldErrorOverlay } from '@/components/world/WorldLoading';
import * as THREE from 'three';

const SECTOR_BIOME_NAMES: Record<string, string> = {
  NW: 'Arid Wasteland', N: 'Highland Plateau', NE: 'Crown Peaks',
  W: 'Industrial Yard', CENTER: 'The Crucible', E: 'Urban Ruins',
  SW: 'Drowned Quarter', S: 'The Pit', SE: 'Grinding March',
};

const DEFAULT_SECTOR = 'CENTER';

// Small polished VFX panel to demonstrate SkillEffectController + effectsApi wiring
function WorldVFXPanel({ engine, reducedMotion }: { engine: Island3DEngine | null; reducedMotion: boolean }) {
  const [effects, setEffects] = useState<Array<{ uuid: string; name: string }>>([]);
  const [busy, setBusy] = useState(false);
  const controllerRef = useRef<SkillEffectController | null>(null);

  useEffect(() => {
    let mounted = true;
    listEffects().then(rows => {
      if (mounted) setEffects(rows.slice(0, 6).map(r => ({ uuid: r.uuid, name: r.name })));
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  const ensureController = () => {
    if (!engine?.character) return null;
    const model = (engine.character as any).model as THREE.Object3D | undefined;
    if (!model) return null;
    if (!controllerRef.current) {
      controllerRef.current = new SkillEffectController(model);
    }
    return controllerRef.current;
  };

  const trigger = async (kind: 'rim' | 'frost' | 'hit' | 'demo') => {
    const ctrl = ensureController();
    if (!ctrl || busy) return;
    setBusy(true);
    try {
      if (kind === 'rim') {
        ctrl.startRimGlow(undefined, 3);
      } else if (kind === 'frost') {
        // Frost via material swap on meshes
        const id = ctrl.startDissolve(1.5); // reuse dissolve path for demo variety
        // quick stop + frost instead — simpler: just hit flash + rim
        setTimeout(() => ctrl.stopEffect(id), 200);
        ctrl.startRimGlow(new THREE.Color(0x88ccff), 2);
      } else if (kind === 'hit') {
        if (engine?.character) {
          const m = (engine.character as any).model;
          if (m) { const { applyHitFlash } = await import('@/island3d/player/SkillEffects'); applyHitFlash(m as THREE.Object3D, 0xffffff, 0.18); }
        }
      } else {
        // demo: try to fetch a real effect and apply rim as proxy
        const sample = effects[0];
        if (sample) {
          await getEffect(sample.uuid).catch(() => null);
        }
        ctrl.startRimGlow(undefined, 2.5);
      }
    } finally {
      setTimeout(() => setBusy(false), 250);
    }
  };

  return (
    <motion.div
      className="absolute top-4 left-1/2 -translate-x-1/2 z-[55] pointer-events-auto"
      initial={reducedMotion ? false : { opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.18 }}
    >
      <div className="bg-black/70 backdrop-blur-md border border-white/10 rounded-2xl px-3 py-1.5 flex items-center gap-2 text-xs">
        <span className="text-white/40 tracking-wider pr-1">WORLD VFX</span>
        <button onClick={() => trigger('rim')} disabled={busy} className="px-2 py-0.5 rounded border border-white/10 hover:border-amber-500/40 text-amber-300 disabled:opacity-50">Rim</button>
        <button onClick={() => trigger('hit')} disabled={busy} className="px-2 py-0.5 rounded border border-white/10 hover:border-amber-500/40 text-amber-300 disabled:opacity-50">Hit</button>
        <button onClick={() => trigger('demo')} disabled={busy} className="px-2 py-0.5 rounded border border-white/10 hover:border-amber-500/40 text-amber-300 disabled:opacity-50">Demo</button>
        {effects.length > 0 && (
          <span className="text-[10px] text-white/30 pl-1">+{effects.length} effects</span>
        )}
      </div>
    </motion.div>
  );
}

export default function GameWorldPage() {
  const [, setLocation] = useLocation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Island3DEngine | null>(null);
  const remotePlayersRef = useRef<RemotePlayerManager | null>(null);
  const moveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [lootNotification, setLootNotification] = useState<string | null>(null);

  const [playerInfo, setPlayerInfo] = useState<PlayerInfo | null>(null);
  const [characterLoaded, setCharacterLoaded] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Detect reduced motion preference (ui-ux-pro-max)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  // Load active character (backend-first, same pattern as play + game-character)
  useEffect(() => {
    async function loadCharacter() {
      try {
        const grudgeId = localStorage.getItem('grudge_account_id') || 'guest';
        const activeId = localStorage.getItem(`gruda_active_character_${grudgeId}`) ||
          localStorage.getItem('grudge_active_character') ||
          localStorage.getItem('gruda_active_character_guest');

        if (!activeId) {
          setLocation('/create-character');
          return;
        }

        const char = await characterAPI.get(activeId);
        const model3d = (char as any).model3d || {};
        setPlayerInfo({
          characterName: char.name,
          heroClass: char.classId,
          heroRace: char.raceId,
          faction: (char as any).faction || 'crusade',
          level: char.level,
          characterId: char.id,
          accountId: (char as any).accountId,
          baseModelId: model3d.baseModelId || char.raceId || 'human',
          equippedMeshes: model3d.equippedMeshes || {},
          weaponSlots: model3d.weaponSlots || {},
          skinColor: model3d.skinColor || '#ffffff',
          armorColor: model3d.armorColor || '#ffffff',
          equippedWeaponType: CLASS_WEAPON_MAP[char.classId] || 'sword-shield',
        });
      } catch (err) {
        console.warn('[GameWorld] Character load failed — redirecting');
        setLocation('/create-character');
        return;
      }
      setCharacterLoaded(true);
    }
    loadCharacter();
  }, [setLocation]);

  const colyseus = useColyseus(playerInfo);

  useEffect(() => {
    if (characterLoaded && playerInfo) colyseus.connect();
  }, [characterLoaded, playerInfo]); // eslint-disable-line

  useEffect(() => {
    if (colyseus.connected && !colyseus.sectorId) colyseus.joinSector(DEFAULT_SECTOR);
  }, [colyseus.connected, colyseus.sectorId]); // eslint-disable-line

  // Initialize 3D engine (zone mode) — elevated with PostProcessing + DayNight
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || engineRef.current) return;

    const config: Island3DEngineConfig = {
      seed: `sector-${DEFAULT_SECTOR}`,
      canvas,
      width: window.innerWidth,
      height: window.innerHeight,
      mode: 'zone',
      sectorId: DEFAULT_SECTOR,
      worldSeed: 'aethermoor-v1',
      quality: 'medium',           // enables PostProcessing (bloom+SMAA+grading)
      enableCharacter: true,
      onLoadProgress: (pct) => setLoadProgress(pct),
      dayNight: { cycleDurationMs: 10 * 60 * 1000 }, // 10 min cycle — DayNightCycle active
    };

    const engine = new Island3DEngine(config);
    engineRef.current = engine;

    engine.init().then(() => {
      setLoaded(true);
      engine.start();

      if (engine.creatures) {
        engine.creatures.onLootDrop = (event: CreatureLootEvent) => {
          const items = event.loot.map(l => `${l.name} ×${l.quantity}`).join(', ');
          setLootNotification(`${event.creatureName}: ${items}`);
          setTimeout(() => setLootNotification(null), 4000);
        };
      }
    }).catch((err) => {
      console.error('[GameWorld] Engine init failed:', err);
      engine.start();
      setLoaded(true);
    });

    const handleResize = () => engine.resize(window.innerWidth, window.innerHeight);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (moveIntervalRef.current) clearInterval(moveIntervalRef.current);
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  // Position sync (15Hz) + remote players — identical reliable pattern
  useEffect(() => {
    if (!colyseus.sectorRoom || !engineRef.current) return;

    moveIntervalRef.current = setInterval(() => {
      const engine = engineRef.current;
      if (!engine?.character) return;
      const pos = engine.character.getPosition();
      const facing = engine.character.getFacing();
      const state = engine.character.isMoving() ? 'moving' : 'idle';
      colyseus.sendMove(pos.x, pos.y, pos.z, facing, state);
    }, 1000 / 15);

    return () => {
      if (moveIntervalRef.current) clearInterval(moveIntervalRef.current);
    };
  }, [colyseus.sectorRoom]);

  // Remote players
  useEffect(() => {
    if (!colyseus.sectorRoom || !engineRef.current || !colyseus.localSessionId) return;

    const engine = engineRef.current;
    const rpm = new RemotePlayerManager(engine.getScene(), colyseus.localSessionId);
    remotePlayersRef.current = rpm;
    const unregister = engine.onUpdate((dt) => rpm.update(dt));

    const room = colyseus.sectorRoom;
    room.state.players.onAdd((player: any, sessionId: string) => {
      if (sessionId === colyseus.localSessionId) return;
      rpm.addPlayer(sessionId, {
        id: player.id,
        characterName: player.characterName,
        heroClass: player.heroClass,
        heroRace: player.heroRace,
        faction: player.faction,
        level: player.level,
        x: player.x, y: player.y, z: player.z,
        facing: player.facing,
        state: player.state,
        hp: player.hp, maxHp: player.maxHp,
        baseModelId: player.baseModelId,
        equippedMeshJson: player.equippedMeshJson,
        weaponSlotsJson: player.weaponSlotsJson,
        skinColor: player.skinColor,
        armorColor: player.armorColor,
        equippedWeaponType: player.equippedWeaponType,
      });
      player.onChange(() => {
        rpm.updatePlayer(sessionId, {
          x: player.x, y: player.y, z: player.z,
          facing: player.facing, state: player.state,
          hp: player.hp, maxHp: player.maxHp,
        });
      });
    });
    room.state.players.onRemove((_p: any, sid: string) => rpm.removePlayer(sid));

    return () => { unregister(); rpm.dispose(); remotePlayersRef.current = null; };
  }, [colyseus.sectorRoom, colyseus.localSessionId]); // eslint-disable-line

  const localPlayer = colyseus.localSessionId ? colyseus.players.get(colyseus.localSessionId) : null;
  const sectorBiome = colyseus.sectorId ? SECTOR_BIOME_NAMES[colyseus.sectorId] || '' : '';

  // HUD entrance motion (framer) — reduced when prefers-reduced-motion
  const hudInitial = reducedMotion ? false : { opacity: 0, y: 8 };
  const hudAnimate = { opacity: 1, y: 0 };

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      <AnimatePresence>
        {!loaded && (
          <WorldLoading
            progress={loadProgress}
            connecting={colyseus.connecting}
            connected={colyseus.connected}
            error={colyseus.error}
            reducedMotion={reducedMotion}
          />
        )}
      </AnimatePresence>

      {/* 3D Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: loaded ? 'block' : 'none' }}
        onClick={(e) => engineRef.current?.handleClick(e.clientX, e.clientY)}
        onMouseMove={(e) => engineRef.current?.handleMouseMove(e.clientX, e.clientY)}
      />

      {/* Loot toast */}
      <AnimatePresence>
        {lootNotification && (
          <motion.div
            className="absolute top-20 left-1/2 -translate-x-1/2 z-50"
            initial={reducedMotion ? false : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <div className="bg-black/80 backdrop-blur-sm rounded-xl border border-amber-600/30 px-5 py-2.5 text-amber-300 text-sm font-bold tracking-wider">
              🎯 {lootNotification}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Elevated VFX panel (wires SkillEffectController + effectsApi) */}
      {loaded && engineRef.current && (
        <WorldVFXPanel engine={engineRef.current} reducedMotion={reducedMotion} />
      )}

      {/* Game HUD with motion entrance */}
      {loaded && playerInfo && (
        <motion.div
          initial={hudInitial}
          animate={hudAnimate}
          transition={{ duration: reducedMotion ? 0 : 0.22 }}
        >
          <GameHUD
            hp={localPlayer?.hp ?? 200}
            maxHp={localPlayer?.maxHp ?? 200}
            mana={localPlayer?.mana ?? 50}
            maxMana={localPlayer?.maxMana ?? 50}
            characterName={playerInfo.characterName}
            heroClass={playerInfo.heroClass}
            level={playerInfo.level}
            sectorId={colyseus.sectorId}
            sectorBiome={sectorBiome}
            playerCount={colyseus.players.size}
            enemyCount={colyseus.enemies.size}
            connected={colyseus.connected}
            connecting={colyseus.connecting}
            error={colyseus.error}
            onSendChat={colyseus.sendChat}
            onDisconnect={() => setLocation('/home')}
          />
        </motion.div>
      )}

      {/* Disconnected / error overlay */}
      {loaded && colyseus.error && (
        <WorldErrorOverlay
          message={colyseus.error}
          onRetry={() => window.location.reload()}
          reducedMotion={reducedMotion}
        />
      )}

      {/* Clean disconnected state hint (non-blocking) */}
      {loaded && !colyseus.connected && !colyseus.connecting && !colyseus.error && (
        <div className="absolute bottom-6 right-4 z-[60] text-[10px] px-2 py-1 rounded bg-black/60 text-white/40 border border-white/10">
          Reconnecting…
        </div>
      )}
    </div>
  );
}
