/**
 * Video Mocap Studio — upload/record video, track body, mirror to animation, save & reuse.
 * Route: /video-mocap  /mocap
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { getMotionDeployService } from "@/lib/animation/MotionDeployService";
import {
  listSavedMocap,
  saveMocapClip,
  deleteSavedMocap,
  downloadMocapJson,
  downloadMocapLibrary,
  type SavedMocapClip,
} from "@/lib/animation/videoMocap/mocapLibrary";
import {
  consumeMocapHandoff,
  clearMocapHandoff,
  publishMocapHandoff,
  importBakeJson,
  animStudioPagesUrl,
} from "@/lib/animation/videoMocap/mocapBridge";
import type { ReconstructedMotion } from "@shared/animation/mocap";

export default function VideoMocapPage() {
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [mirror, setMirror] = useState(false);
  const [sampleFps, setSampleFps] = useState(12);
  const [maxSec, setMaxSec] = useState(10);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [motion, setMotion] = useState<ReconstructedMotion | null>(null);
  const [library, setLibrary] = useState<SavedMocapClip[]>([]);
  const [clipName, setClipName] = useState("");
  const [recording, setRecording] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const clockRef = useRef(new THREE.Clock());
  const sceneApi = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    bones: Map<string, THREE.Bone>;
    root: THREE.Group;
    raf: number;
  } | null>(null);

  const refreshLibrary = useCallback(() => {
    setLibrary(listSavedMocap());
  }, []);

  useEffect(() => {
    refreshLibrary();
    // Handoff from anim.grudge-studio.com / anim-studio.pages.dev
    const params = new URLSearchParams(window.location.search);
    if (params.get("handoff") === "1") {
      const h = consumeMocapHandoff();
      if (h?.motion) {
        setMotion(h.motion);
        setClipName(h.motion.name || h.motion.id);
        setProgress(`Imported handoff from ${h.sourceHost || "Anim Studio"}`);
        // play after mount
        setTimeout(() => {
          try {
            playMotionOnPreview(h.motion);
          } catch {
            /* preview not ready */
          }
        }, 400);
      }
    }
  }, [refreshLibrary]);

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      stopCamera();
      teardownPreview();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onPickFile(f: File | null) {
    setError(null);
    setMotion(null);
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setFile(f);
    if (f) {
      setVideoUrl(URL.createObjectURL(f));
      setClipName(f.name.replace(/\.[^.]+$/, ""));
    } else {
      setVideoUrl(null);
    }
  }

  async function startCameraRecord() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 1280, height: 720 },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      chunksRef.current = [];
      const rec = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
          ? "video/webm;codecs=vp9"
          : "video/webm",
      });
      mediaRecorderRef.current = rec;
      rec.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        const f = new File([blob], `mocap_record_${Date.now()}.webm`, {
          type: "video/webm",
        });
        onPickFile(f);
        stopCamera();
      };
      rec.start(200);
      setRecording(true);
    } catch (e) {
      setError((e as Error).message || "Camera permission denied");
    }
  }

  function stopCameraRecord() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setRecording(false);
  }

  function teardownPreview() {
    const api = sceneApi.current;
    if (!api) return;
    cancelAnimationFrame(api.raf);
    api.renderer.dispose();
    previewRef.current?.replaceChildren();
    sceneApi.current = null;
    mixerRef.current = null;
  }

  /** Simple stick-figure skeleton driven by mixamorig quats for preview */
  function ensurePreviewSkeleton() {
    if (sceneApi.current || !previewRef.current) return sceneApi.current!;
    const w = previewRef.current.clientWidth || 400;
    const h = 360;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    previewRef.current.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0c121c);
    const camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 50);
    camera.position.set(0, 1.2, 3.2);
    camera.lookAt(0, 0.9, 0);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.1));
    const grid = new THREE.GridHelper(4, 12, 0x334455, 0x1a2433);
    scene.add(grid);

    const bones = new Map<string, THREE.Bone>();
    const root = new THREE.Group();
    root.position.y = 0;
    scene.add(root);

    // Minimal hierarchy for visual
    const mk = (name: string, parent: THREE.Object3D, y = 0.2) => {
      const b = new THREE.Bone();
      b.name = name;
      b.position.y = y;
      parent.add(b);
      bones.set(name, b);
      const joint = new THREE.Mesh(
        new THREE.SphereGeometry(0.04, 10, 10),
        new THREE.MeshStandardMaterial({ color: 0x3dd6c6, emissive: 0x0a3030 }),
      );
      b.add(joint);
      return b;
    };

    const hips = mk("mixamorigHips", root, 1.0);
    const spine = mk("mixamorigSpine", hips, 0.15);
    const spine2 = mk("mixamorigSpine2", spine, 0.15);
    const neck = mk("mixamorigNeck", spine2, 0.12);
    mk("mixamorigHead", neck, 0.12);
    const lSh = mk("mixamorigLeftShoulder", spine2, 0.05);
    lSh.position.x = 0.12;
    const lArm = mk("mixamorigLeftArm", lSh, 0);
    lArm.position.set(0.18, 0, 0);
    const lFa = mk("mixamorigLeftForeArm", lArm, 0);
    lFa.position.set(0.22, 0, 0);
    mk("mixamorigLeftHand", lFa, 0).position.set(0.18, 0, 0);
    const rSh = mk("mixamorigRightShoulder", spine2, 0.05);
    rSh.position.x = -0.12;
    const rArm = mk("mixamorigRightArm", rSh, 0);
    rArm.position.set(-0.18, 0, 0);
    const rFa = mk("mixamorigRightForeArm", rArm, 0);
    rFa.position.set(-0.22, 0, 0);
    mk("mixamorigRightHand", rFa, 0).position.set(-0.18, 0, 0);
    const lUp = mk("mixamorigLeftUpLeg", hips, 0);
    lUp.position.set(0.1, 0, 0);
    const lLeg = mk("mixamorigLeftLeg", lUp, 0);
    lLeg.position.set(0, -0.4, 0);
    mk("mixamorigLeftFoot", lLeg, 0).position.set(0, -0.4, 0);
    const rUp = mk("mixamorigRightUpLeg", hips, 0);
    rUp.position.set(-0.1, 0, 0);
    const rLeg = mk("mixamorigRightLeg", rUp, 0);
    rLeg.position.set(0, -0.4, 0);
    mk("mixamorigRightFoot", rLeg, 0).position.set(0, -0.4, 0);

    const skinned = new THREE.SkinnedMesh(
      new THREE.BoxGeometry(0.01, 0.01, 0.01),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    const skeleton = new THREE.Skeleton([...bones.values()]);
    skinned.add(hips);
    skinned.bind(skeleton);
    root.add(skinned);

    const helper = new THREE.SkeletonHelper(hips);
    (helper.material as THREE.LineBasicMaterial).color.set(0x7c9cff);
    scene.add(helper);

    // Mixer on group so tracks like "mixamorigHips.quaternion" resolve by name
    const mixer = new THREE.AnimationMixer(root);
    mixerRef.current = mixer;

    const api = {
      renderer,
      scene,
      camera,
      bones,
      root,
      raf: 0,
    };
    const loop = () => {
      api.raf = requestAnimationFrame(loop);
      const dt = clockRef.current.getDelta();
      mixer.update(dt);
      renderer.render(scene, camera);
    };
    loop();
    sceneApi.current = api;
    return api;
  }

  function playMotionOnPreview(m: ReconstructedMotion) {
    ensurePreviewSkeleton();
    const mixer = mixerRef.current;
    const api = sceneApi.current;
    if (!mixer || !api) return;
    mixer.stopAllAction();
    const svc = getMotionDeployService();
    // Clip targets bone.quaternion paths — bind to root that contains bone names
    const clip = svc.toAnimationClip(m);
    // Retarget track names if needed — tracks are "mixamorigX.quaternion"
    const action = mixer.clipAction(clip);
    action.reset().setLoop(THREE.LoopRepeat, Infinity).play();
  }

  async function runTrack() {
    if (!file) {
      setError("Pick or record a video first");
      return;
    }
    setBusy(true);
    setError(null);
    setProgress("Loading pose model…");
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    try {
      const svc = getMotionDeployService();
      const m = await svc.fromRecordedVideo(file, {
        sampleFps,
        mirror,
        maxDurationSec: maxSec,
        fleetClipKey: clipName
          ? `vidmocap_${clipName.replace(/\W+/g, "_").slice(0, 40)}`
          : undefined,
        name: clipName || file.name,
        signal: abortRef.current.signal,
        onProgress: (p) => {
          setProgress(
            `Tracking ${((p.t / Math.max(0.01, p.duration)) * 100).toFixed(0)}% · frame ${p.frameIndex + 1}/${p.totalFrames}${p.hasPose ? "" : " (no pose)"}`,
          );
        },
      });
      setMotion(m);
      setProgress(
        `Done — ${m.frames.length} frames, conf ${m.confidence.toFixed(2)}, ${m.durationSec.toFixed(1)}s`,
      );
      playMotionOnPreview(m);
    } catch (e) {
      setError((e as Error).message || String(e));
      setProgress("");
    } finally {
      setBusy(false);
    }
  }

  function saveCurrent() {
    if (!motion) return;
    saveMocapClip(motion, {
      name: clipName || motion.name,
      sourceFileName: file?.name,
      sampleFps,
      mirror,
      manifest: getMotionDeployService().getLastManifest() || undefined,
      tags: ["video-mocap", mirror ? "mirrored" : "direct"],
    });
    publishMocapHandoff(motion, "library");
    refreshLibrary();
    setProgress(`Saved “${clipName || motion.id}” to library`);
  }

  async function importJsonFile(f: File) {
    try {
      const data = JSON.parse(await f.text());
      const m =
        data.motion?.frames
          ? data.motion
          : importBakeJson(data);
      if (!m) throw new Error("Unrecognized JSON");
      setMotion(m);
      setClipName(m.name || m.id);
      playMotionOnPreview(m);
      setProgress(`Imported ${m.id}`);
    } catch (e) {
      setError((e as Error).message || "Import failed");
    }
  }

  function loadSaved(entry: SavedMocapClip) {
    setMotion(entry.motion);
    setClipName(entry.name);
    playMotionOnPreview(entry.motion);
    setProgress(`Loaded ${entry.name}`);
  }

  const statusColor = useMemo(() => {
    if (error) return "text-red-400";
    if (busy) return "text-amber-300";
    if (motion) return "text-emerald-400";
    return "text-slate-400";
  }, [error, busy, motion]);

  return (
    <div className="min-h-screen bg-[#070a10] text-slate-100 font-sans">
      <header className="border-b border-slate-800 px-6 py-5 max-w-6xl mx-auto">
        <p className="text-xs tracking-widest uppercase text-cyan-400/90 mb-1">
          Grudge Studio · Video Mocap
        </p>
        <h1 className="text-2xl md:text-3xl font-bold">
          Watch · Track · Mirror · Save
        </h1>
        <p className="text-slate-400 mt-2 max-w-2xl text-sm leading-relaxed">
          Upload or record a short clip (best 2–10s, full body visible). We track
          the person with MediaPipe, mirror the motion onto a Mixamo-compatible
          skeleton, and let you save a reusable animation JSON for the fleet.
        </p>
        <p className="mt-3 text-sm flex flex-wrap gap-x-3 gap-y-1">
          <a
            className="text-cyan-400 underline"
            href={animStudioPagesUrl()}
            target="_blank"
            rel="noreferrer"
          >
            Anim Studio (Cloudflare Pages)
          </a>
          <a className="text-cyan-400 underline" href="https://anim.grudge-studio.com" target="_blank" rel="noreferrer">
            anim.grudge-studio.com
          </a>
          <label className="text-slate-400 cursor-pointer underline">
            Import bake JSON
            <input
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void importJsonFile(f);
                e.target.value = "";
              }}
            />
          </label>
        </p>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-6 grid lg:grid-cols-2 gap-6">
        {/* Left: source */}
        <section className="space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <h2 className="font-semibold text-cyan-300 mb-3">1. Video source</h2>
            <div className="flex flex-wrap gap-2 mb-3">
              <label className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 cursor-pointer text-sm hover:border-cyan-600">
                Upload video
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => onPickFile(e.target.files?.[0] || null)}
                />
              </label>
              {!recording ? (
                <button
                  type="button"
                  className="px-3 py-2 rounded-lg bg-indigo-700/80 border border-indigo-500 text-sm"
                  onClick={startCameraRecord}
                >
                  Record webcam
                </button>
              ) : (
                <button
                  type="button"
                  className="px-3 py-2 rounded-lg bg-red-700 border border-red-500 text-sm animate-pulse"
                  onClick={stopCameraRecord}
                >
                  Stop & use recording
                </button>
              )}
            </div>
            <video
              ref={videoRef}
              src={videoUrl || undefined}
              controls
              playsInline
              className="w-full rounded-lg bg-black aspect-video object-contain border border-slate-800"
            />
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={mirror}
                  onChange={(e) => setMirror(e.target.checked)}
                />
                Mirror L/R (selfie)
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-slate-500 text-xs">Sample FPS</span>
                <input
                  type="number"
                  min={4}
                  max={24}
                  value={sampleFps}
                  onChange={(e) => setSampleFps(Number(e.target.value) || 12)}
                  className="bg-slate-950 border border-slate-700 rounded px-2 py-1"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-slate-500 text-xs">Max seconds</span>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={maxSec}
                  onChange={(e) => setMaxSec(Number(e.target.value) || 10)}
                  className="bg-slate-950 border border-slate-700 rounded px-2 py-1"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-slate-500 text-xs">Clip name</span>
                <input
                  value={clipName}
                  onChange={(e) => setClipName(e.target.value)}
                  placeholder="my_combo"
                  className="bg-slate-950 border border-slate-700 rounded px-2 py-1"
                />
              </label>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy || !file}
                onClick={runTrack}
                className="px-4 py-2 rounded-lg bg-cyan-700 hover:bg-cyan-600 disabled:opacity-40 font-medium text-sm"
              >
                {busy ? "Tracking…" : "Track & mirror motion"}
              </button>
              {busy && (
                <button
                  type="button"
                  className="px-3 py-2 rounded-lg border border-slate-600 text-sm"
                  onClick={() => abortRef.current?.abort()}
                >
                  Cancel
                </button>
              )}
            </div>
            <p className={`mt-2 text-sm ${statusColor}`}>
              {error || progress || "Ready"}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <h2 className="font-semibold text-cyan-300 mb-2">Tips</h2>
            <ul className="text-sm text-slate-400 space-y-1 list-disc pl-5">
              <li>Full body in frame, upright, good lighting</li>
              <li>2–10s works best (combos, attacks, gestures)</li>
              <li>Enable Mirror if you recorded facing the webcam</li>
              <li>Saved clips stay in this browser; download JSON for CDN bake</li>
            </ul>
          </div>
        </section>

        {/* Right: preview + save */}
        <section className="space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <h2 className="font-semibold text-cyan-300 mb-3">2. Mirrored skeleton preview</h2>
            <div
              ref={previewRef}
              className="w-full h-[360px] rounded-lg bg-[#0c121c] border border-slate-800 overflow-hidden"
            />
            <canvas ref={canvasRef} className="hidden" />
            {motion && (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="px-3 py-2 rounded-lg bg-emerald-700 text-sm"
                  onClick={saveCurrent}
                >
                  Save to library
                </button>
                <button
                  type="button"
                  className="px-3 py-2 rounded-lg border border-slate-600 text-sm"
                  onClick={() => downloadMocapJson(motion, `${motion.id}.json`)}
                >
                  Download bake JSON
                </button>
                <button
                  type="button"
                  className="px-3 py-2 rounded-lg border border-slate-600 text-sm"
                  onClick={() => playMotionOnPreview(motion)}
                >
                  Replay
                </button>
              </div>
            )}
            {motion && (
              <pre className="mt-3 text-[10px] text-slate-500 overflow-auto max-h-28">
                {motion.reply}
                {"\n"}
                bones={motion.bones.length} frames={motion.frames.length}{" "}
                conf={motion.confidence.toFixed(2)} source={motion.source}
              </pre>
            )}
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-cyan-300">3. Saved animations</h2>
              <button
                type="button"
                className="text-xs text-slate-400 underline"
                onClick={downloadMocapLibrary}
              >
                Export library
              </button>
            </div>
            {library.length === 0 ? (
              <p className="text-sm text-slate-500">No saved mocap clips yet.</p>
            ) : (
              <ul className="space-y-2 max-h-64 overflow-auto">
                {library.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2 text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{c.name}</div>
                      <div className="text-xs text-slate-500">
                        {c.durationSec.toFixed(1)}s · {c.motion.frames.length}f ·{" "}
                        {new Date(c.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="text-cyan-400 text-xs"
                      onClick={() => loadSaved(c)}
                    >
                      Use
                    </button>
                    <button
                      type="button"
                      className="text-xs text-slate-400"
                      onClick={() => {
                        downloadMocapJson(c.motion, `${c.id}.json`);
                      }}
                    >
                      JSON
                    </button>
                    <button
                      type="button"
                      className="text-xs text-red-400"
                      onClick={() => {
                        deleteSavedMocap(c.id);
                        refreshLibrary();
                      }}
                    >
                      Del
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
