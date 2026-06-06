/**
 * WorldMap3D.tsx
 * ─────────────────────────────────────────────────────────────
 * Three.js overhead strategic map for the Grudge RTS.
 *
 * Renders the 9-sector world as a zoomable 3D terrain view:
 *   - World zoom: all 9 sectors, faction colors, player dots
 *   - Sector zoom: single sector, terrain detail, NPCs, claims
 *   - Area zoom: close-up, individual buildings, resource nodes
 *
 * Data sources:
 *   - /api/map/world (REST) — sector lore, player counts, tide
 *   - /api/map/sector/:id (REST) — detailed sector info
 *   - Colyseus WorldRoom state — real-time tide, sector summaries
 *
 * Modes:
 *   - "player" — shows self, allies, claims, buildings
 *   - "admin"  — adds UUID search, teleport, all players visible
 * ─────────────────────────────────────────────────────────────
 */

import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MapPin, Search, Crosshair, ZoomIn, ZoomOut,
  Users, Flag, Building, ChevronLeft, X,
  Paintbrush, Mountain, TreePine, Sword, Download,
  Upload, Save, Trash2, Eye, Shield, Crown,
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

// ── Types ───────────────────────────────────────────────────────

type ZoomLevel = "world" | "sector" | "area";
type MapMode = "player" | "admin";

interface SectorData {
  sectorId: string;
  name: string;
  subtitle: string;
  biome: string;
  difficulty: number;
  description: string;
  controllingFaction: string | null;
  hasVendors: boolean;
  hasDockyards: boolean;
  specialFeatures: string[];
  heroes: { id: string; name: string; title: string; factionId: string; level: number }[];
  playerCount: number;
}

interface WorldMapData {
  sectors: Record<string, SectorData>;
  tideHeight: number;
  serverTime: number;
  factions: Record<string, { name: string; color: string }>;
}

interface Props {
  mode?: MapMode;
  apiBase?: string;
  onClose?: () => void;
  onSectorSelect?: (sectorId: string) => void;
  onTeleport?: (sectorId: string, x: number, z: number) => void;
  className?: string;
}

// ── Biome colors (matches GrudgesTerrainSystem.js) ──────────────

const BIOME_COLORS: Record<string, number> = {
  arid:        0xc4a35a,
  highland:    0x8a9a7a,
  mountain:    0x4a5560,
  industrial:  0x5a5a5a,
  pirate:      0x2a6a8a,
  neutral:     0x7a8a6a,
  urban_ruin:  0x6a5a4a,
  flooded:     0x4a6a5a,
  crater:      0x3a3a3a,
  contested:   0x8a7a5a,
};

const FACTION_COLORS: Record<string, number> = {
  crusade: 0x3b82f6,
  legion:  0xef4444,
  fabled:  0x22c55e,
};

// ── Sector grid layout ──────────────────────────────────────────

const SECTOR_SIZE = 6000;
const GRID: Record<string, { col: number; row: number }> = {
  NW: { col: 0, row: 0 }, N:      { col: 1, row: 0 }, NE: { col: 2, row: 0 },
  W:  { col: 0, row: 1 }, CENTER: { col: 1, row: 1 }, E:  { col: 2, row: 1 },
  SW: { col: 0, row: 2 }, S:      { col: 1, row: 2 }, SE: { col: 2, row: 2 },
};

// ── Component ───────────────────────────────────────────────────

export default function WorldMap3D({
  mode = "player",
  apiBase = "",
  onClose,
  onSectorSelect,
  onTeleport,
  className = "",
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const animFrameRef = useRef<number>(0);

  const [worldData, setWorldData] = useState<WorldMapData | null>(null);
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>("world");
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [hoveredSector, setHoveredSector] = useState<string | null>(null);
  const [adminSearch, setAdminSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Admin editor state
  const [editTool, setEditTool] = useState<"select" | "terrain" | "faction" | "npc" | "building">("select");
  const [editBiome, setEditBiome] = useState("arid");
  const [editFaction, setEditFaction] = useState<string | null>(null);
  const [editDifficulty, setEditDifficulty] = useState(1);
  const [pendingEdits, setPendingEdits] = useState<Record<string, any>>({});
  const [editStatus, setEditStatus] = useState<string | null>(null);

  // ── Fetch world data ────────────────────────────────────────

  useEffect(() => {
    const fetchWorld = async () => {
      try {
        const res = await fetch(`${apiBase}/api/map/world`);
        const data = await res.json();
        setWorldData(data);
      } catch (err) {
        console.error("[WorldMap3D] Failed to fetch world data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchWorld();
    const poll = setInterval(fetchWorld, 10_000);
    return () => clearInterval(poll);
  }, [apiBase]);

  // ── Three.js setup ──────────────────────────────────────────

  useEffect(() => {
    if (!containerRef.current || !worldData) return;

    const container = containerRef.current;
    const w = container.clientWidth;
    const h = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a1628);
    sceneRef.current = scene;

    // Orthographic camera (top-down)
    const worldSpan = SECTOR_SIZE * 3;
    const aspect = w / h;
    const camH = worldSpan * 0.6;
    const camera = new THREE.OrthographicCamera(
      -camH * aspect, camH * aspect, camH, -camH, 1, 50000
    );
    camera.position.set(SECTOR_SIZE * 1.5, 12000, SECTOR_SIZE * 1.5);
    camera.lookAt(SECTOR_SIZE * 1.5, 0, SECTOR_SIZE * 1.5);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambient = new THREE.AmbientLight(0x6688aa, 0.6);
    scene.add(ambient);
    const sun = new THREE.DirectionalLight(0xffeedd, 1.0);
    sun.position.set(10000, 15000, 8000);
    scene.add(sun);

    // ── Build sector terrain meshes ─────────────────────────────

    const sectorMeshes: Record<string, THREE.Mesh> = {};

    for (const [id, grid] of Object.entries(GRID)) {
      const sectorData = worldData.sectors[id];
      if (!sectorData) continue;

      const biomeColor = BIOME_COLORS[sectorData.biome] || 0x888888;
      const originX = grid.col * SECTOR_SIZE;
      const originZ = grid.row * SECTOR_SIZE;

      // Terrain plane with simple procedural height variation
      const geo = new THREE.PlaneGeometry(SECTOR_SIZE - 40, SECTOR_SIZE - 40, 32, 32);
      geo.rotateX(-Math.PI / 2);

      // Add subtle height noise based on difficulty
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const z = pos.getZ(i);
        const noise = Math.sin(x * 0.002) * Math.cos(z * 0.003) * sectorData.difficulty * 15;
        pos.setY(i, noise);
      }
      pos.needsUpdate = true;
      geo.computeVertexNormals();

      const mat = new THREE.MeshStandardMaterial({
        color: biomeColor,
        roughness: 0.85,
        metalness: 0.05,
        flatShading: true,
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(originX + SECTOR_SIZE / 2, 0, originZ + SECTOR_SIZE / 2);
      mesh.userData = { sectorId: id, ...sectorData };
      mesh.receiveShadow = true;
      scene.add(mesh);
      sectorMeshes[id] = mesh;

      // Faction border glow
      if (sectorData.controllingFaction) {
        const borderColor = FACTION_COLORS[sectorData.controllingFaction] || 0xffffff;
        const borderGeo = new THREE.EdgesGeometry(
          new THREE.BoxGeometry(SECTOR_SIZE - 20, 50, SECTOR_SIZE - 20)
        );
        const borderMat = new THREE.LineBasicMaterial({ color: borderColor, linewidth: 2 });
        const borderLine = new THREE.LineSegments(borderGeo, borderMat);
        borderLine.position.set(originX + SECTOR_SIZE / 2, 25, originZ + SECTOR_SIZE / 2);
        scene.add(borderLine);
      }

      // Sector label (sprite)
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 128;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "rgba(0,0,0,0)";
      ctx.fillRect(0, 0, 512, 128);
      ctx.font = "bold 36px 'Cinzel', serif";
      ctx.fillStyle = "#d4af37";
      ctx.textAlign = "center";
      ctx.fillText(sectorData.name, 256, 45);
      ctx.font = "20px 'Inter', sans-serif";
      ctx.fillStyle = "#aaa";
      ctx.fillText(`Difficulty ${sectorData.difficulty} • ${sectorData.playerCount} online`, 256, 80);

      const labelTexture = new THREE.CanvasTexture(canvas);
      const labelMat = new THREE.SpriteMaterial({ map: labelTexture, transparent: true });
      const label = new THREE.Sprite(labelMat);
      label.position.set(originX + SECTOR_SIZE / 2, 400, originZ + SECTOR_SIZE / 2);
      label.scale.set(2500, 625, 1);
      scene.add(label);

      // Hero NPC markers
      for (const hero of sectorData.heroes) {
        const heroGeo = new THREE.ConeGeometry(60, 200, 4);
        const heroColor = FACTION_COLORS[hero.factionId] || 0xffd700;
        const heroMat = new THREE.MeshStandardMaterial({ color: heroColor, emissive: heroColor, emissiveIntensity: 0.3 });
        const heroMesh = new THREE.Mesh(heroGeo, heroMat);
        const hx = originX + SECTOR_SIZE * 0.2 + Math.random() * SECTOR_SIZE * 0.6;
        const hz = originZ + SECTOR_SIZE * 0.2 + Math.random() * SECTOR_SIZE * 0.6;
        heroMesh.position.set(hx, 100, hz);
        heroMesh.userData = { heroId: hero.id, heroName: hero.name };
        scene.add(heroMesh);
      }

      // Player count indicator
      if (sectorData.playerCount > 0) {
        const dotGeo = new THREE.SphereGeometry(40 + sectorData.playerCount * 10, 12, 12);
        const dotMat = new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.6 });
        const dot = new THREE.Mesh(dotGeo, dotMat);
        dot.position.set(originX + SECTOR_SIZE / 2, 200, originZ + SECTOR_SIZE / 2);
        scene.add(dot);
      }
    }

    // ── Ocean plane (covers entire world) ───────────────────────

    const oceanGeo = new THREE.PlaneGeometry(SECTOR_SIZE * 5, SECTOR_SIZE * 5);
    oceanGeo.rotateX(-Math.PI / 2);
    const oceanMat = new THREE.MeshStandardMaterial({
      color: 0x1a3a5a,
      transparent: true,
      opacity: 0.7,
      roughness: 0.1,
      metalness: 0.2,
    });
    const ocean = new THREE.Mesh(oceanGeo, oceanMat);
    ocean.position.set(SECTOR_SIZE * 1.5, worldData.tideHeight ?? 0, SECTOR_SIZE * 1.5);
    ocean.renderOrder = 14;
    scene.add(ocean);

    // ── Grid lines between sectors ──────────────────────────────

    const gridMat = new THREE.LineBasicMaterial({ color: 0x334455, transparent: true, opacity: 0.5 });
    for (let i = 0; i <= 3; i++) {
      // Vertical
      const vGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(i * SECTOR_SIZE, 10, 0),
        new THREE.Vector3(i * SECTOR_SIZE, 10, SECTOR_SIZE * 3),
      ]);
      scene.add(new THREE.Line(vGeo, gridMat));
      // Horizontal
      const hGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 10, i * SECTOR_SIZE),
        new THREE.Vector3(SECTOR_SIZE * 3, 10, i * SECTOR_SIZE),
      ]);
      scene.add(new THREE.Line(hGeo, gridMat));
    }

    // ── Raycaster for hover/click ───────────────────────────────

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const meshes = Object.values(sectorMeshes);
      const hits = raycaster.intersectObjects(meshes);
      if (hits.length > 0) {
        setHoveredSector(hits[0].object.userData.sectorId);
        container.style.cursor = "pointer";
      } else {
        setHoveredSector(null);
        container.style.cursor = "default";
      }
    };

    const onClick = (e: MouseEvent) => {
      raycaster.setFromCamera(mouse, camera);
      const meshes = Object.values(sectorMeshes);
      const hits = raycaster.intersectObjects(meshes);
      if (hits.length > 0) {
        const sid = hits[0].object.userData.sectorId;
        setSelectedSector(sid);
        onSectorSelect?.(sid);
        // Zoom into sector
        zoomToSector(sid, camera);
        setZoomLevel("sector");
      }
    };

    container.addEventListener("mousemove", onMouseMove);
    container.addEventListener("click", onClick);

    // ── Mouse wheel zoom ────────────────────────────────────────

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 1.1 : 0.9;
      camera.zoom = Math.max(0.3, Math.min(5, camera.zoom * (1 / factor)));
      camera.updateProjectionMatrix();
    };
    container.addEventListener("wheel", onWheel, { passive: false });

    // ── Drag pan ────────────────────────────────────────────────

    let isDragging = false;
    let lastMouse = { x: 0, y: 0 };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button === 2 || e.button === 1) { // right or middle click
        isDragging = true;
        lastMouse = { x: e.clientX, y: e.clientY };
        container.style.cursor = "grabbing";
      }
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = (e.clientX - lastMouse.x) * 10 / camera.zoom;
      const dy = (e.clientY - lastMouse.y) * 10 / camera.zoom;
      camera.position.x -= dx;
      camera.position.z -= dy;
      camera.lookAt(camera.position.x, 0, camera.position.z);
      lastMouse = { x: e.clientX, y: e.clientY };
    };
    const onPointerUp = () => {
      isDragging = false;
      container.style.cursor = "default";
    };

    container.addEventListener("pointerdown", onPointerDown);
    container.addEventListener("pointermove", onPointerMove);
    container.addEventListener("pointerup", onPointerUp);
    container.addEventListener("contextmenu", (e) => e.preventDefault());

    // ── Render loop ─────────────────────────────────────────────

    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      // Animate ocean
      ocean.position.y = Math.sin(Date.now() * 0.001) * 2;
      renderer.render(scene, camera);
    };
    animate();

    // ── Resize ──────────────────────────────────────────────────

    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      const aspect = w / h;
      camera.left = -camH * aspect;
      camera.right = camH * aspect;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    // ── Cleanup ─────────────────────────────────────────────────

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      container.removeEventListener("mousemove", onMouseMove);
      container.removeEventListener("click", onClick);
      container.removeEventListener("wheel", onWheel);
      container.removeEventListener("pointerdown", onPointerDown);
      container.removeEventListener("pointermove", onPointerMove);
      container.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [worldData]);

  // ── Zoom helpers ────────────────────────────────────────────

  const zoomToSector = (sectorId: string, camera: THREE.OrthographicCamera) => {
    const grid = GRID[sectorId];
    if (!grid) return;
    const cx = grid.col * SECTOR_SIZE + SECTOR_SIZE / 2;
    const cz = grid.row * SECTOR_SIZE + SECTOR_SIZE / 2;
    camera.position.set(cx, 8000, cz);
    camera.lookAt(cx, 0, cz);
    camera.zoom = 1.8;
    camera.updateProjectionMatrix();
  };

  const zoomToWorld = () => {
    const camera = cameraRef.current;
    if (!camera) return;
    camera.position.set(SECTOR_SIZE * 1.5, 12000, SECTOR_SIZE * 1.5);
    camera.lookAt(SECTOR_SIZE * 1.5, 0, SECTOR_SIZE * 1.5);
    camera.zoom = 1;
    camera.updateProjectionMatrix();
    setZoomLevel("world");
    setSelectedSector(null);
  };

  const sectorInfo = selectedSector ? worldData?.sectors[selectedSector] : null;

  // ── Render ────────────────────────────────────────────────────

  return (
    <div className={`relative w-full h-full ${className}`}>
      {/* Three.js canvas container */}
      <div ref={containerRef} className="absolute inset-0" />

      {/* Loading */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-30">
          <div className="text-amber-400 font-cinzel text-xl animate-pulse">Loading World Map...</div>
        </div>
      )}

      {/* Top bar */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
        {onClose && (
          <Button size="sm" variant="outline" onClick={onClose} className="border-slate-600 bg-black/60 hover:bg-black/80">
            <X className="w-4 h-4" />
          </Button>
        )}
        {zoomLevel !== "world" && (
          <Button size="sm" variant="outline" onClick={zoomToWorld} className="border-slate-600 bg-black/60 hover:bg-black/80">
            <ChevronLeft className="w-4 h-4 mr-1" />
            World View
          </Button>
        )}
        <Badge className="bg-black/60 border border-amber-600/50 text-amber-400 font-cinzel">
          <MapPin className="w-3 h-3 mr-1" />
          {zoomLevel === "world" ? "Grudge Warlords — World Map" : sectorInfo?.name || selectedSector}
        </Badge>
      </div>

      {/* Zoom controls */}
      <div className="absolute top-3 right-3 z-20 flex flex-col gap-1">
        <Button size="sm" variant="outline" onClick={() => {
          if (cameraRef.current) { cameraRef.current.zoom = Math.min(5, cameraRef.current.zoom * 1.3); cameraRef.current.updateProjectionMatrix(); }
        }} className="border-slate-600 bg-black/60 w-8 h-8 p-0">
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={() => {
          if (cameraRef.current) { cameraRef.current.zoom = Math.max(0.3, cameraRef.current.zoom * 0.7); cameraRef.current.updateProjectionMatrix(); }
        }} className="border-slate-600 bg-black/60 w-8 h-8 p-0">
          <ZoomOut className="w-4 h-4" />
        </Button>
      </div>

      {/* Sector info panel */}
      {sectorInfo && (
        <div className="absolute bottom-3 left-3 z-20 w-80 bg-black/85 border border-amber-600/40 rounded-lg p-4 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-cinzel text-amber-400 text-lg">{sectorInfo.name}</h3>
            <Badge variant="outline" className="text-xs border-slate-500">{sectorInfo.biome}</Badge>
          </div>
          <p className="text-slate-400 text-xs mb-3">{sectorInfo.subtitle} — {sectorInfo.description}</p>

          <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
            <div className="text-center p-1.5 bg-slate-800/60 rounded">
              <div className="text-amber-400 font-bold">{sectorInfo.difficulty}</div>
              <div className="text-slate-500">Difficulty</div>
            </div>
            <div className="text-center p-1.5 bg-slate-800/60 rounded">
              <div className="text-green-400 font-bold">{sectorInfo.playerCount}</div>
              <div className="text-slate-500">Players</div>
            </div>
            <div className="text-center p-1.5 bg-slate-800/60 rounded">
              <div className="text-blue-400 font-bold">{sectorInfo.heroes.length}</div>
              <div className="text-slate-500">Heroes</div>
            </div>
          </div>

          {sectorInfo.controllingFaction && (
            <div className="flex items-center gap-2 mb-2">
              <Flag className="w-3 h-3" style={{ color: `#${FACTION_COLORS[sectorInfo.controllingFaction]?.toString(16)}` }} />
              <span className="text-xs text-slate-300">
                Controlled by {worldData?.factions[sectorInfo.controllingFaction]?.name || sectorInfo.controllingFaction}
              </span>
            </div>
          )}

          {sectorInfo.heroes.length > 0 && (
            <div className="mb-2">
              <div className="text-xs text-slate-500 mb-1">Heroes</div>
              <div className="flex flex-wrap gap-1">
                {sectorInfo.heroes.map(h => (
                  <Badge key={h.id} variant="outline" className="text-[10px] border-amber-600/40 text-amber-300">
                    {h.name} Lv{h.level}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {sectorInfo.specialFeatures.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {sectorInfo.specialFeatures.map(f => (
                <Badge key={f} variant="secondary" className="text-[10px] bg-slate-700/60">
                  {f.replace(/_/g, " ")}
                </Badge>
              ))}
            </div>
          )}

          <Button size="sm" className="w-full mt-3 bg-amber-700 hover:bg-amber-600" onClick={() => onSectorSelect?.(selectedSector!)}>
            Enter Sector
          </Button>
        </div>
      )}

      {/* Admin Forge panel */}
      {mode === "admin" && (
        <div className="absolute top-3 right-14 bottom-3 z-20 w-80 flex flex-col gap-2 pointer-events-none">

          {/* Search + Teleport */}
          <div className="bg-black/90 border border-red-600/40 rounded-lg p-3 backdrop-blur-sm pointer-events-auto">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-red-400" />
              <span className="text-red-400 font-bold text-xs uppercase tracking-wider">Forge Admin</span>
            </div>
            <div className="flex gap-1.5 mb-2">
              <Input
                placeholder="Search player UUID..."
                value={adminSearch}
                onChange={e => setAdminSearch(e.target.value)}
                className="bg-slate-800 border-slate-700 text-xs h-7"
              />
              <Button size="sm" variant="outline" className="border-red-600/60 text-red-400 h-7 px-2 text-xs"
                onClick={async () => {
                  if (!adminSearch) return;
                  try {
                    const res = await fetch(`${apiBase}/api/admin/player/${adminSearch}`, {
                      headers: { "x-admin-token": "admin" },
                    });
                    const data = await res.json();
                    if (data.found && data.currentSector) {
                      zoomToSector(data.currentSector, cameraRef.current!);
                      setSelectedSector(data.currentSector);
                      setZoomLevel("sector");
                    } else {
                      setEditStatus("Player not found");
                    }
                  } catch { setEditStatus("Search failed"); }
                }}>
                <Search className="w-3 h-3" />
              </Button>
            </div>
            {selectedSector && (
              <Button size="sm" variant="outline" className="w-full border-red-600/60 text-red-400 h-7 text-xs"
                onClick={() => onTeleport?.(selectedSector, 0, 0)}>
                <Crosshair className="w-3 h-3 mr-1" />
                Teleport to {selectedSector}
              </Button>
            )}
          </div>

          {/* Edit tools — only when a sector is selected */}
          {selectedSector && sectorInfo && (
            <div className="bg-black/90 border border-amber-600/40 rounded-lg p-3 backdrop-blur-sm pointer-events-auto flex-1 overflow-y-auto">
              <div className="flex items-center gap-2 mb-3">
                <Paintbrush className="w-4 h-4 text-amber-400" />
                <span className="text-amber-400 font-bold text-xs uppercase tracking-wider">Sector Editor — {sectorInfo.name}</span>
              </div>

              {/* Tool selector */}
              <div className="flex gap-1 mb-3">
                {[
                  { id: "select" as const, icon: <Eye className="w-3 h-3" />, tip: "Select" },
                  { id: "terrain" as const, icon: <Mountain className="w-3 h-3" />, tip: "Terrain" },
                  { id: "faction" as const, icon: <Flag className="w-3 h-3" />, tip: "Faction" },
                  { id: "npc" as const, icon: <Sword className="w-3 h-3" />, tip: "NPC" },
                  { id: "building" as const, icon: <Building className="w-3 h-3" />, tip: "Building" },
                ].map(t => (
                  <Button key={t.id} size="sm" variant={editTool === t.id ? "default" : "outline"}
                    className={`h-7 px-2 text-xs ${editTool === t.id ? "bg-amber-700" : "border-slate-700"}`}
                    onClick={() => setEditTool(t.id)} title={t.tip}>
                    {t.icon}
                  </Button>
                ))}
              </div>

              {/* Terrain tool */}
              {editTool === "terrain" && (
                <div className="space-y-2 mb-3">
                  <div className="text-xs text-slate-400">Biome</div>
                  <div className="grid grid-cols-3 gap-1">
                    {Object.entries(BIOME_COLORS).map(([biome, color]) => (
                      <button key={biome}
                        onClick={() => {
                          setEditBiome(biome);
                          setPendingEdits(p => ({ ...p, biome }));
                        }}
                        className={`h-7 rounded text-[10px] border transition-all ${
                          editBiome === biome
                            ? "border-amber-400 ring-1 ring-amber-400/50"
                            : "border-slate-700 hover:border-slate-500"
                        }`}
                        style={{ backgroundColor: `#${color.toString(16).padStart(6, "0")}40` }}>
                        {biome}
                      </button>
                    ))}
                  </div>
                  <div className="text-xs text-slate-400 mt-2">Difficulty</div>
                  <div className="flex items-center gap-2">
                    <input type="range" min={1} max={10} value={editDifficulty}
                      onChange={e => {
                        const v = parseInt(e.target.value);
                        setEditDifficulty(v);
                        setPendingEdits(p => ({ ...p, difficulty: v }));
                      }}
                      className="flex-1 h-1 accent-amber-500" />
                    <span className="text-amber-400 text-xs font-bold w-4">{editDifficulty}</span>
                  </div>
                </div>
              )}

              {/* Faction tool */}
              {editTool === "faction" && (
                <div className="space-y-2 mb-3">
                  <div className="text-xs text-slate-400">Controlling Faction</div>
                  <div className="grid grid-cols-2 gap-1">
                    {[
                      { id: null, label: "Contested", color: "#666" },
                      { id: "crusade", label: "Crusade", color: "#3b82f6" },
                      { id: "legion", label: "Legion", color: "#ef4444" },
                      { id: "fabled", label: "Fabled", color: "#22c55e" },
                    ].map(f => (
                      <button key={f.id ?? "none"}
                        onClick={() => {
                          setEditFaction(f.id);
                          setPendingEdits(p => ({ ...p, controllingFaction: f.id }));
                        }}
                        className={`h-8 rounded text-xs border flex items-center justify-center gap-1.5 transition-all ${
                          editFaction === f.id
                            ? "border-white ring-1 ring-white/30"
                            : "border-slate-700 hover:border-slate-500"
                        }`}>
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: f.color }} />
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* NPC tool */}
              {editTool === "npc" && (
                <div className="space-y-2 mb-3">
                  <div className="text-xs text-slate-400">Place NPC (click on terrain)</div>
                  <div className="text-xs text-slate-500">
                    Current heroes: {sectorInfo.heroes.map(h => h.name).join(", ") || "none"}
                  </div>
                  <Button size="sm" variant="outline" className="w-full border-slate-700 text-xs h-7"
                    onClick={() => setPendingEdits(p => ({ ...p, addNpc: { type: "vendor", x: 0, z: 0 } }))}>
                    <Users className="w-3 h-3 mr-1" /> Add Vendor NPC
                  </Button>
                  <Button size="sm" variant="outline" className="w-full border-slate-700 text-xs h-7"
                    onClick={() => setPendingEdits(p => ({ ...p, addNpc: { type: "quest_giver", x: 0, z: 0 } }))}>
                    <Crown className="w-3 h-3 mr-1" /> Add Quest Giver
                  </Button>
                  <Button size="sm" variant="outline" className="w-full border-slate-700 text-xs h-7"
                    onClick={() => setPendingEdits(p => ({ ...p, addNpc: { type: "guard", x: 0, z: 0 } }))}>
                    <Shield className="w-3 h-3 mr-1" /> Add Guard
                  </Button>
                </div>
              )}

              {/* Building tool */}
              {editTool === "building" && (
                <div className="space-y-2 mb-3">
                  <div className="text-xs text-slate-400">Place Structure (click on terrain)</div>
                  <Button size="sm" variant="outline" className="w-full border-slate-700 text-xs h-7"
                    onClick={() => setPendingEdits(p => ({ ...p, addBuilding: { type: "dock", x: 0, z: 0 } }))}>
                    <Building className="w-3 h-3 mr-1" /> Dock
                  </Button>
                  <Button size="sm" variant="outline" className="w-full border-slate-700 text-xs h-7"
                    onClick={() => setPendingEdits(p => ({ ...p, addBuilding: { type: "tower", x: 0, z: 0 } }))}>
                    <Mountain className="w-3 h-3 mr-1" /> Watch Tower
                  </Button>
                  <Button size="sm" variant="outline" className="w-full border-slate-700 text-xs h-7"
                    onClick={() => setPendingEdits(p => ({ ...p, addBuilding: { type: "market", x: 0, z: 0 } }))}>
                    <TreePine className="w-3 h-3 mr-1" /> Market Stall
                  </Button>
                </div>
              )}

              {/* Actions */}
              <div className="border-t border-slate-700 pt-3 mt-3 space-y-1.5">
                {/* Push live edits */}
                {Object.keys(pendingEdits).length > 0 && (
                  <Button size="sm" className="w-full bg-amber-700 hover:bg-amber-600 h-7 text-xs"
                    onClick={async () => {
                      setEditStatus("Pushing...");
                      try {
                        const res = await fetch(`${apiBase}/api/admin/sector/${selectedSector}/edit`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json", "x-admin-token": "admin" },
                          body: JSON.stringify(pendingEdits),
                        });
                        const data = await res.json();
                        setEditStatus(data.ok ? "Changes pushed live!" : data.message);
                        setPendingEdits({});
                      } catch { setEditStatus("Push failed"); }
                    }}>
                    <Save className="w-3 h-3 mr-1" />
                    Push {Object.keys(pendingEdits).length} edit(s) live
                  </Button>
                )}

                {/* Export */}
                <Button size="sm" variant="outline" className="w-full border-slate-700 h-7 text-xs"
                  onClick={async () => {
                    setEditStatus("Exporting...");
                    try {
                      const res = await fetch(`${apiBase}/api/admin/sector/${selectedSector}/export`, {
                        headers: { "x-admin-token": "admin" },
                      });
                      const data = await res.json();
                      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `sector_${selectedSector}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                      setEditStatus("Exported!");
                    } catch { setEditStatus("Export failed"); }
                  }}>
                  <Download className="w-3 h-3 mr-1" /> Export Sector JSON
                </Button>

                {/* Import */}
                <Button size="sm" variant="outline" className="w-full border-slate-700 h-7 text-xs"
                  onClick={() => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = ".json";
                    input.onchange = async (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (!file) return;
                      setEditStatus("Importing...");
                      try {
                        const text = await file.text();
                        const data = JSON.parse(text);
                        const res = await fetch(`${apiBase}/api/admin/sector/import`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json", "x-admin-token": "admin" },
                          body: JSON.stringify(data),
                        });
                        const result = await res.json();
                        setEditStatus(result.ok ? "Imported!" : result.message);
                      } catch { setEditStatus("Import failed"); }
                    };
                    input.click();
                  }}>
                  <Upload className="w-3 h-3 mr-1" /> Import Sector JSON
                </Button>

                {/* Clear edits */}
                {Object.keys(pendingEdits).length > 0 && (
                  <Button size="sm" variant="outline" className="w-full border-red-700/60 text-red-400 h-7 text-xs"
                    onClick={() => { setPendingEdits({}); setEditStatus(null); }}>
                    <Trash2 className="w-3 h-3 mr-1" /> Discard edits
                  </Button>
                )}
              </div>

              {/* Status */}
              {editStatus && (
                <div className="mt-2 text-[10px] text-center text-slate-400 animate-pulse">{editStatus}</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Hovered sector tooltip */}
      {hoveredSector && !selectedSector && worldData?.sectors[hoveredSector] && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 px-4 py-2 bg-black/90 border border-amber-600/40 rounded-lg text-center pointer-events-none">
          <div className="text-amber-400 font-cinzel text-sm">{worldData.sectors[hoveredSector].name}</div>
          <div className="text-slate-400 text-xs">
            {worldData.sectors[hoveredSector].biome} • Difficulty {worldData.sectors[hoveredSector].difficulty}
            {worldData.sectors[hoveredSector].playerCount > 0 && ` • ${worldData.sectors[hoveredSector].playerCount} online`}
          </div>
        </div>
      )}

      {/* Controls hint */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 text-[10px] text-slate-600 pointer-events-none">
        Click sector to zoom • Right-drag to pan • Scroll to zoom • ESC for world view
      </div>
    </div>
  );
}
