/**
 * CompleteWorldMap — full 9-sector Warlords era strategic map (Three.js).
 *
 * Always renders from SSOT (WORLD_SECTORS). Optionally merges live player counts
 * from GET /api/map/world. Click sector → detail + Land In / Sail here.
 */
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  MapPin, Ship, Swords, Home, Anchor, Crown, Shield,
} from 'lucide-react';
import {
  buildCompleteWorldMap,
  hexToThreeColor,
  playUrlForSector,
  oceanUrl,
  COMPLETE_MAP_SECTOR_SIZE_M,
  type CompleteMapSector,
  type CompleteWorldMapSnapshot,
} from '@shared/definitions/completeWorldMap';
import { LEGACY_SECTOR_IDS } from '@shared/definitions/sectorBridge';

const SECTOR_SIZE = COMPLETE_MAP_SECTOR_SIZE_M;

const FACTION_COLORS: Record<string, number> = {
  crusade: 0x3b82f6,
  legion: 0xef4444,
  fabled: 0x22c55e,
  worge: 0x9acd32,
  human: 0xc9a227,
  dwarf: 0x6b8cae,
  elf: 0x4a9b6e,
  orc: 0xb84a2a,
  undead: 0x6b5b8c,
  demon: 0x8b1a1a,
};

export interface CompleteWorldMapProps {
  worldSeed?: string;
  className?: string;
  fetchLive?: boolean;
  onSectorSelect?: (sector: CompleteMapSector) => void;
}

export default function CompleteWorldMap({
  worldSeed = 'grudge-world-1',
  className = '',
  fetchLive = true,
  onSectorSelect,
}: CompleteWorldMapProps) {
  const [, navigate] = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<string | null>(null);
  const hoveredRef = useRef<string | null>(null);
  const onSelectRef = useRef(onSectorSelect);
  onSelectRef.current = onSectorSelect;

  const [snapshot, setSnapshot] = useState<CompleteWorldMapSnapshot>(() =>
    buildCompleteWorldMap(worldSeed),
  );
  const [selected, setSelected] = useState<CompleteMapSector | null>(null);
  const [liveOk, setLiveOk] = useState(false);

  useEffect(() => {
    selectedRef.current = selected?.legacyId ?? null;
  }, [selected]);

  // Live overlay (non-blocking)
  useEffect(() => {
    if (!fetchLive) return;
    let cancelled = false;

    const applyLive = async () => {
      try {
        const res = await fetch('/api/map/world');
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        if (cancelled) return;
        const playerCounts: Record<string, number> = {};
        const controllingFactions: Record<string, string | null> = {};
        for (const [id, s] of Object.entries(data.sectors ?? {}) as [string, any][]) {
          playerCounts[id] = s.playerCount ?? 0;
          controllingFactions[id] = s.controllingFaction ?? null;
        }
        setSnapshot(buildCompleteWorldMap(worldSeed, { playerCounts, controllingFactions }));
        setLiveOk(true);
      } catch {
        setLiveOk(false);
      }
    };

    void applyLive();
    const poll = window.setInterval(applyLive, 15_000);
    return () => {
      cancelled = true;
      window.clearInterval(poll);
    };
  }, [fetchLive, worldSeed]);

  // Three.js scene — rebuild only when snapshot sector set changes (not hover)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const w = container.clientWidth || 800;
    const h = container.clientHeight || 600;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060d18);
    scene.fog = new THREE.FogExp2(0x0a1628, 0.00004);

    const worldSpan = SECTOR_SIZE * 3.2;
    const aspect = w / h;
    const camH = worldSpan * 0.55;
    const camera = new THREE.OrthographicCamera(
      -camH * aspect,
      camH * aspect,
      camH,
      -camH,
      1,
      80_000,
    );
    camera.position.set(SECTOR_SIZE * 1.5, 18_000, SECTOR_SIZE * 1.5 + 2000);
    camera.lookAt(SECTOR_SIZE * 1.5, 0, SECTOR_SIZE * 1.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0x6688aa, 0.55));
    const sun = new THREE.DirectionalLight(0xfff0dd, 1.15);
    sun.position.set(12_000, 20_000, 8000);
    scene.add(sun);
    scene.add(new THREE.HemisphereLight(0x87ceeb, 0x1a3040, 0.35));

    const oceanGeo = new THREE.PlaneGeometry(SECTOR_SIZE * 5.5, SECTOR_SIZE * 5.5, 64, 64);
    oceanGeo.rotateX(-Math.PI / 2);
    const oceanPos = oceanGeo.attributes.position;
    for (let i = 0; i < oceanPos.count; i++) {
      const x = oceanPos.getX(i);
      const z = oceanPos.getZ(i);
      oceanPos.setY(i, Math.sin(x * 0.0004) * Math.cos(z * 0.0005) * 18);
    }
    oceanPos.needsUpdate = true;
    oceanGeo.computeVertexNormals();
    const ocean = new THREE.Mesh(
      oceanGeo,
      new THREE.MeshStandardMaterial({
        color: 0x0c4a6e,
        roughness: 0.25,
        metalness: 0.15,
        transparent: true,
        opacity: 0.92,
      }),
    );
    ocean.position.set(SECTOR_SIZE * 1.5, -40, SECTOR_SIZE * 1.5);
    scene.add(ocean);

    const sectorMeshes: THREE.Mesh[] = [];

    for (const sector of snapshot.sectors) {
      const { col, row } = sector.grid;
      const originX = col * SECTOR_SIZE;
      const originZ = row * SECTOR_SIZE;
      const cx = originX + SECTOR_SIZE / 2;
      const cz = originZ + SECTOR_SIZE / 2;

      const landColor = hexToThreeColor(sector.colors.mid);
      const deepColor = hexToThreeColor(sector.colors.deep);
      const accent = hexToThreeColor(sector.colors.accent);

      const geo = new THREE.PlaneGeometry(SECTOR_SIZE * 0.88, SECTOR_SIZE * 0.88, 48, 48);
      geo.rotateX(-Math.PI / 2);
      const pos = geo.attributes.position;
      const maxH = 80 + sector.difficultyMax * 12;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const z = pos.getZ(i);
        const nx = x / (SECTOR_SIZE * 0.44);
        const nz = z / (SECTOR_SIZE * 0.44);
        const island = Math.max(0, 1 - Math.sqrt(nx * nx + nz * nz) * 0.95);
        const noise =
          Math.sin(x * 0.0015 + col) * Math.cos(z * 0.0018 + row) * maxH * 0.35 +
          Math.sin(x * 0.004) * 20;
        pos.setY(i, island * (40 + noise));
      }
      pos.needsUpdate = true;
      geo.computeVertexNormals();

      const mat = new THREE.MeshStandardMaterial({
        color: landColor,
        roughness: 0.88,
        metalness: 0.04,
        flatShading: true,
        emissive: sector.isSafeZone ? accent : deepColor,
        emissiveIntensity: sector.isSafeZone ? 0.08 : sector.isContested ? 0.06 : 0.02,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(cx, 0, cz);
      mesh.userData = {
        legacyId: sector.legacyId,
        zoneId: sector.zoneId,
        sector,
        baseEmissive: sector.isSafeZone ? 0.08 : sector.isContested ? 0.06 : 0.02,
      };
      mesh.receiveShadow = true;
      scene.add(mesh);
      sectorMeshes.push(mesh);

      const edgeColor = sector.isSafeZone
        ? 0x22d3ee
        : sector.isContested
          ? 0xfbbf24
          : 0x334155;
      const edge = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(SECTOR_SIZE * 0.92, 30, SECTOR_SIZE * 0.92)),
        new THREE.LineBasicMaterial({ color: edgeColor, transparent: true, opacity: 0.55 }),
      );
      edge.position.set(cx, 20, cz);
      scene.add(edge);

      if (sector.raceCity) {
        const raceColor = FACTION_COLORS[sector.raceCity.raceId] ?? 0xc9a227;
        const cap = new THREE.Mesh(
          new THREE.CylinderGeometry(120, 160, 280, 8),
          new THREE.MeshStandardMaterial({
            color: raceColor,
            emissive: raceColor,
            emissiveIntensity: 0.35,
            metalness: 0.3,
          }),
        );
        cap.position.set(cx + SECTOR_SIZE * 0.12, 160, cz - SECTOR_SIZE * 0.08);
        scene.add(cap);
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(220, 24, 8, 24),
          new THREE.MeshStandardMaterial({
            color: raceColor,
            emissive: raceColor,
            emissiveIntensity: 0.4,
          }),
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(cap.position.x, 40, cap.position.z);
        scene.add(ring);
      }

      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 160;
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, 640, 160);
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(40, 20, 560, 120);
      ctx.font = "bold 42px Cinzel, serif";
      ctx.fillStyle = sector.isSafeZone ? '#67e8f9' : '#f6c945';
      ctx.textAlign = 'center';
      ctx.fillText(sector.name, 320, 70);
      ctx.font = '22px Inter, sans-serif';
      ctx.fillStyle = '#cbd5e1';
      const city = sector.raceCity ? ` · ${sector.raceCity.name}` : '';
      ctx.fillText(
        `${sector.subtitle} · Lv ${sector.difficultyMin}–${sector.difficultyMax}${city}`,
        320,
        110,
      );
      const tex = new THREE.CanvasTexture(canvas);
      const spr = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }),
      );
      spr.position.set(cx, 900, cz);
      spr.scale.set(3200, 800, 1);
      spr.renderOrder = 20;
      scene.add(spr);

      if (sector.playerCount > 0) {
        const pulse = new THREE.Mesh(
          new THREE.SphereGeometry(80 + sector.playerCount * 12, 12, 12),
          new THREE.MeshBasicMaterial({ color: 0x34d399, transparent: true, opacity: 0.55 }),
        );
        pulse.position.set(cx - SECTOR_SIZE * 0.28, 200, cz + SECTOR_SIZE * 0.28);
        scene.add(pulse);
      }
    }

    const gridMat = new THREE.LineBasicMaterial({ color: 0x1e3a5f, transparent: true, opacity: 0.4 });
    for (let i = 0; i <= 3; i++) {
      scene.add(
        new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(i * SECTOR_SIZE, 8, 0),
            new THREE.Vector3(i * SECTOR_SIZE, 8, SECTOR_SIZE * 3),
          ]),
          gridMat,
        ),
      );
      scene.add(
        new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 8, i * SECTOR_SIZE),
            new THREE.Vector3(SECTOR_SIZE * 3, 8, i * SECTOR_SIZE),
          ]),
          gridMat,
        ),
      );
    }

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let dragging = false;
    let last = { x: 0, y: 0 };

    const pick = (clientX: number, clientY: number) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      return raycaster.intersectObjects(sectorMeshes, false);
    };

    const onMove = (e: MouseEvent) => {
      if (dragging) {
        const dx = (e.clientX - last.x) * (14 / camera.zoom);
        const dy = (e.clientY - last.y) * (14 / camera.zoom);
        camera.position.x -= dx;
        camera.position.z -= dy;
        camera.lookAt(camera.position.x, 0, camera.position.z - 2000);
        last = { x: e.clientX, y: e.clientY };
        return;
      }
      const hits = pick(e.clientX, e.clientY);
      hoveredRef.current = hits.length ? (hits[0].object.userData.legacyId as string) : null;
      container.style.cursor = hits.length ? 'pointer' : 'default';
    };

    const onClick = (e: MouseEvent) => {
      if (dragging) return;
      const hits = pick(e.clientX, e.clientY);
      if (!hits.length) return;
      const sec = hits[0].object.userData.sector as CompleteMapSector;
      selectedRef.current = sec.legacyId;
      setSelected(sec);
      onSelectRef.current?.(sec);
      const { col, row } = sec.grid;
      const cx = col * SECTOR_SIZE + SECTOR_SIZE / 2;
      const cz = row * SECTOR_SIZE + SECTOR_SIZE / 2;
      camera.position.set(cx, 12_000, cz + 1500);
      camera.lookAt(cx, 0, cz);
      camera.zoom = Math.min(2.4, Math.max(camera.zoom, 1.4));
      camera.updateProjectionMatrix();
    };

    const onDown = (e: PointerEvent) => {
      if (e.button === 1 || e.button === 2 || e.shiftKey) {
        dragging = true;
        last = { x: e.clientX, y: e.clientY };
        container.style.cursor = 'grabbing';
      }
    };
    const onUp = () => {
      dragging = false;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const f = e.deltaY > 0 ? 0.92 : 1.08;
      camera.zoom = Math.max(0.35, Math.min(4.5, camera.zoom * f));
      camera.updateProjectionMatrix();
    };

    container.addEventListener('mousemove', onMove);
    container.addEventListener('click', onClick);
    container.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);
    container.addEventListener('wheel', onWheel, { passive: false });
    container.addEventListener('contextmenu', (e) => e.preventDefault());

    let frame = 0;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      ocean.position.y = -40 + Math.sin(Date.now() * 0.0008) * 6;
      const hov = hoveredRef.current;
      const sel = selectedRef.current;
      for (const m of sectorMeshes) {
        const mat = m.material as THREE.MeshStandardMaterial;
        const base = (m.userData.baseEmissive as number) ?? 0.02;
        const isH = m.userData.legacyId === hov;
        const isS = m.userData.legacyId === sel;
        mat.emissiveIntensity = isS ? 0.2 : isH ? 0.14 : base;
      }
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const nw = container.clientWidth;
      const nh = container.clientHeight;
      const asp = nw / nh;
      camera.left = -camH * asp;
      camera.right = camH * asp;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(frame);
      container.removeEventListener('mousemove', onMove);
      container.removeEventListener('click', onClick);
      container.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      container.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, [snapshot]);

  const landIn = useCallback(
    (sec: CompleteMapSector) => {
      navigate(playUrlForSector(sec.zoneId, worldSeed, sec.raceCity?.id));
    },
    [navigate, worldSeed],
  );

  const gridLegend = useMemo(
    () =>
      LEGACY_SECTOR_IDS.map((id) => snapshot.sectorsByLegacy[id]).filter(
        Boolean,
      ) as CompleteMapSector[],
    [snapshot],
  );

  return (
    <div className={`relative w-full h-full min-h-[520px] bg-slate-950 ${className}`}>
      <div ref={containerRef} className="absolute inset-0" />

      <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center gap-2 pointer-events-none">
        <Badge className="bg-black/70 border border-amber-600/50 text-amber-300 font-cinzel pointer-events-auto">
          <MapPin className="w-3 h-3 mr-1" />
          Complete World Map · 9 Sectors
        </Badge>
        <Badge
          className={`pointer-events-auto border ${
            liveOk
              ? 'bg-emerald-950/70 border-emerald-600/40 text-emerald-300'
              : 'bg-slate-900/70 border-slate-600 text-slate-400'
          }`}
        >
          {liveOk ? 'Live overlay' : 'SSOT offline render'}
        </Badge>
        <div className="ml-auto flex gap-2 pointer-events-auto">
          <Button
            size="sm"
            variant="outline"
            className="border-cyan-700/50 bg-black/60 text-cyan-200 hover:bg-cyan-950/50"
            onClick={() => navigate(oceanUrl(worldSeed))}
          >
            <Ship className="w-4 h-4 mr-1" />
            Sail Ocean
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-slate-600 bg-black/60"
            onClick={() => navigate('/home-island')}
          >
            <Home className="w-4 h-4 mr-1" />
            Home
          </Button>
        </div>
      </div>

      <div className="absolute bottom-3 left-3 z-20 rounded-xl border border-slate-700/60 bg-black/75 backdrop-blur p-2 pointer-events-auto">
        <p className="text-[9px] text-slate-500 uppercase tracking-widest mb-1 px-1">3×3 Warlords</p>
        <div className="grid grid-cols-3 gap-0.5">
          {([0, 1, 2] as const).flatMap((row) =>
            ([0, 1, 2] as const).map((col) => {
              const sec = gridLegend.find((s) => s.grid.col === col && s.grid.row === row);
              if (!sec) return <div key={`${col}-${row}`} className="w-14 h-10 bg-slate-900" />;
              const active = selected?.legacyId === sec.legacyId;
              return (
                <button
                  key={sec.legacyId}
                  type="button"
                  onClick={() => setSelected(sec)}
                  className={`w-14 h-10 rounded text-[8px] font-bold leading-tight px-0.5 border ${
                    active
                      ? 'border-amber-400 bg-amber-500/20 text-amber-100'
                      : 'border-slate-700 bg-slate-900/80 text-slate-300 hover:border-slate-500'
                  }`}
                  title={sec.name}
                >
                  {sec.name.split(' ')[0]}
                </button>
              );
            }),
          )}
        </div>
        <p className="text-[8px] text-slate-600 mt-1 px-0.5">Scroll zoom · Shift-drag pan</p>
      </div>

      {selected && (
        <div className="absolute top-14 right-3 z-20 w-80 max-w-[92vw] rounded-2xl border border-amber-800/40 bg-black/85 backdrop-blur-md p-4 pointer-events-auto shadow-2xl">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="font-cinzel text-lg text-amber-300 font-bold">{selected.name}</h2>
              <p className="text-xs text-slate-400">{selected.subtitle}</p>
            </div>
            {selected.isSafeZone && (
              <Badge className="bg-cyan-900/50 text-cyan-200 border border-cyan-600/40">
                <Shield className="w-3 h-3 mr-1" /> Safe
              </Badge>
            )}
            {selected.isContested && (
              <Badge className="bg-amber-900/50 text-amber-200 border border-amber-600/40">
                Contested
              </Badge>
            )}
          </div>
          <p className="text-sm text-slate-300 mt-2 leading-relaxed">{selected.description}</p>
          <div className="flex flex-wrap gap-1 mt-2">
            <Badge variant="outline" className="text-[10px] border-slate-600 text-slate-400">
              {selected.biome}
            </Badge>
            <Badge variant="outline" className="text-[10px] border-slate-600 text-slate-400">
              Lv {selected.difficultyMin}–{selected.difficultyMax}
            </Badge>
            <Badge variant="outline" className="text-[10px] border-slate-600 text-slate-400">
              {selected.zoneId}
            </Badge>
            {selected.playerCount > 0 && (
              <Badge className="text-[10px] bg-emerald-900/40 text-emerald-300">
                {selected.playerCount} online
              </Badge>
            )}
          </div>
          {selected.raceCity && (
            <div className="mt-3 flex items-center gap-2 text-sm text-amber-200/90">
              <Crown className="w-4 h-4 text-amber-400" />
              <span>
                {selected.raceCity.name}{' '}
                <span className="text-slate-500">({selected.raceCity.raceId} capital)</span>
              </span>
            </div>
          )}
          {selected.resources.length > 0 && (
            <p className="text-[11px] text-slate-500 mt-2">
              Resources: {selected.resources.slice(0, 6).join(', ')}
            </p>
          )}
          <div className="grid gap-2 mt-4">
            <Button
              className="w-full bg-purple-700 hover:bg-purple-600 font-cinzel"
              onClick={() => landIn(selected)}
            >
              <Swords className="w-4 h-4 mr-2" />
              Land In Sector
            </Button>
            <Button
              variant="outline"
              className="w-full border-cyan-800/50 text-cyan-200"
              onClick={() => navigate(oceanUrl(worldSeed))}
            >
              <Anchor className="w-4 h-4 mr-2" />
              Sail Ocean Map
            </Button>
          </div>
        </div>
      )}

      {!selected && (
        <div className="absolute bottom-3 right-3 z-20 max-w-xs rounded-xl border border-slate-700/50 bg-black/70 backdrop-blur px-3 py-2 text-[11px] text-slate-400 pointer-events-none">
          Click a sector to inspect · <span className="text-cyan-400">Haven Shore</span> is the
          starter PVE trade harbor
        </div>
      )}
    </div>
  );
}
