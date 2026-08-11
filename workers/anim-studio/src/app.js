import { trackVideoFile, preloadPoseModel } from "./tracker.js";
import { listClips, saveClip, deleteClip, toBakeJson, downloadJson } from "./library.js";
import { createPreview } from "./preview.js";

const API = "/api";
const HANDOFF_KEY = "grudge_mocap_handoff_v1";
const WARLORDS_MOCAP = "https://grudgewarlords.com/video-mocap";

function uid() {
  return `vidmocap_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function sanitizeMotion(tracked, name) {
  const id = uid();
  const frames = tracked.poses.map((p) => ({
    t: p.t,
    duration: p.duration,
    pose: p.pose,
    root: p.root ? [p.root[0], 0, p.root[2]] : undefined,
    confidence: p.confidence,
  }));
  return {
    id,
    name: name || id,
    skeleton: "mixamorig",
    durationSec: tracked.durationSec,
    frames,
    bones: Object.keys(frames[0]?.pose || {}),
    rootMotion: "baked_locked",
    source: "screen_recording",
    confidence: 0.9,
    validation: { ok: true, errors: [], warnings: [], sanitized: true },
    reply: `Tracked ${tracked.durationSec.toFixed(1)}s · ${tracked.frameCount} poses @ ${tracked.sampleFps}fps${tracked.mirror ? " · mirrored" : ""}`,
  };
}

export function mountApp(root) {
  root.innerHTML = `
    <div class="shell">
      <header class="topbar">
        <div class="brand">
          <div class="brand-mark" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 64 64" fill="none"><path d="M18 40c6-14 10-22 14-22s8 8 14 22" stroke="#3dd6c6" stroke-width="5" stroke-linecap="round"/><circle cx="32" cy="22" r="5" fill="#7c9cff"/></svg>
          </div>
          <div>
            <h1>Anim Studio</h1>
            <p>anim.grudge-studio.com · video mocap → save & reuse</p>
          </div>
        </div>
        <nav class="nav-links" aria-label="Fleet">
          <a class="chip active" href="/">Studio</a>
          <a class="chip" href="https://grudox.grudge-studio.com/animator/" target="_blank" rel="noopener">Grudox Animator</a>
          <a class="chip" href="https://grudgewarlords.com/video-mocap" target="_blank" rel="noopener">Warlords Mocap</a>
          <a class="chip" href="https://casting.grudge.studio" target="_blank" rel="noopener">Casting Lab</a>
          <a class="chip" href="${API}/health" target="_blank" rel="noopener">API</a>
        </nav>
      </header>

      <div class="steps" id="steps">
        <div class="step on" data-s="1"><strong>1 · Source</strong>Upload or record</div>
        <div class="step" data-s="2"><strong>2 · Track</strong>Body pose capture</div>
        <div class="step" data-s="3"><strong>3 · Mirror</strong>Mixamo skeleton</div>
        <div class="step" data-s="4"><strong>4 · Save</strong>Library & JSON</div>
      </div>

      <div class="grid">
        <section class="panel">
          <h2>Video source</h2>
          <div class="drop" id="drop" tabindex="0" role="button" aria-label="Drop video or click to upload">
            <div>
              <strong>Drop video here</strong>
              <span>mp4 / webm · full body · 2–10s ideal<br/>or click to browse · <span class="kbd">V</span> focus</span>
            </div>
          </div>
          <input type="file" id="file" accept="video/*" hidden />
          <video class="preview" id="video" controls playsinline></video>
          <div class="row">
            <label class="field check"><input type="checkbox" id="mirror" /> Mirror L/R (selfie)</label>
            <label class="field">Sample FPS
              <input type="number" id="fps" min="4" max="24" value="12" />
            </label>
            <label class="field">Max sec
              <input type="number" id="maxsec" min="1" max="30" value="10" />
            </label>
            <label class="field">Clip name
              <input type="text" id="name" placeholder="my_combo" />
            </label>
          </div>
          <div class="row">
            <button class="btn" type="button" id="btn-record">Record webcam</button>
            <button class="btn primary" type="button" id="btn-track" disabled>Track & mirror</button>
            <button class="btn ghost" type="button" id="btn-cancel" hidden>Cancel</button>
          </div>
          <div class="progress" id="bar" hidden><i id="bar-fill"></i></div>
          <div class="status" id="status">Ready — load a short full-body clip</div>
        </section>

        <section class="panel">
          <h2>Mirrored animation preview</h2>
          <div id="preview-host"></div>
          <div class="row">
            <button class="btn primary" type="button" id="btn-save" disabled>Save to library</button>
            <button class="btn" type="button" id="btn-dl" disabled>Download bake JSON</button>
            <button class="btn" type="button" id="btn-handoff" disabled>Send to Warlords</button>
            <button class="btn ghost" type="button" id="btn-replay" disabled>Replay</button>
          </div>
          <div class="meta" id="meta"></div>
        </section>

        <section class="panel" style="grid-column: 1 / -1">
          <div class="row" style="justify-content: space-between; margin-top: 0">
            <h2 style="margin:0">Saved animations</h2>
            <div class="row" style="margin:0">
              <label class="btn ghost" style="cursor:pointer">Import JSON
                <input type="file" id="import-json" accept="application/json,.json" hidden />
              </label>
              <button class="btn ghost" type="button" id="btn-export-lib">Export library</button>
            </div>
          </div>
          <ul class="library" id="library"></ul>
        </section>
      </div>

      <footer class="footer">
        <span>Rigid-safe · rotation-only bones · Y-hip lock · one mixer per instance</span>
        <span>API proxy → anim-ai-worker · MediaPipe on-device (video stays local)</span>
      </footer>
    </div>
    <div class="toast" id="toast" role="status"></div>
  `;

  const el = (id) => root.querySelector(id);
  const drop = el("#drop");
  const fileInput = el("#file");
  const video = el("#video");
  const status = el("#status");
  const bar = el("#bar");
  const barFill = el("#bar-fill");
  const toast = el("#toast");
  const meta = el("#meta");
  const libraryEl = el("#library");
  const steps = [...root.querySelectorAll(".step")];

  let file = null;
  let videoUrl = null;
  let motion = null;
  let preview = null;
  let abort = null;
  let recorder = null;
  let stream = null;
  let recording = false;

  function setStatus(msg, kind = "") {
    status.textContent = msg;
    status.className = "status" + (kind ? ` ${kind}` : "");
  }
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2200);
  }
  function setStep(n) {
    steps.forEach((s) => {
      const v = Number(s.dataset.s);
      s.classList.toggle("on", v === n);
      s.classList.toggle("done", v < n);
    });
  }
  function setProgress(pct) {
    bar.hidden = false;
    barFill.style.width = `${Math.max(0, Math.min(100, pct))}%`;
  }

  function pickFile(f) {
    if (!f) return;
    file = f;
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    videoUrl = URL.createObjectURL(f);
    video.src = videoUrl;
    video.srcObject = null;
    el("#name").value = f.name.replace(/\.[^.]+$/, "");
    el("#btn-track").disabled = false;
    setStep(1);
    setStatus(`Loaded ${f.name} (${(f.size / 1e6).toFixed(1)} MB)`);
    motion = null;
    el("#btn-save").disabled = true;
    el("#btn-dl").disabled = true;
    el("#btn-replay").disabled = true;
  }

  drop.addEventListener("click", () => fileInput.click());
  drop.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") fileInput.click();
  });
  fileInput.addEventListener("change", () => pickFile(fileInput.files?.[0]));
  ["dragenter", "dragover"].forEach((ev) =>
    drop.addEventListener(ev, (e) => {
      e.preventDefault();
      drop.classList.add("drag");
    }),
  );
  ["dragleave", "drop"].forEach((ev) =>
    drop.addEventListener(ev, (e) => {
      e.preventDefault();
      drop.classList.remove("drag");
    }),
  );
  drop.addEventListener("drop", (e) => {
    const f = e.dataTransfer?.files?.[0];
    if (f) pickFile(f);
  });

  // Keyboard: T track, S save, R record
  window.addEventListener("keydown", (e) => {
    if (e.target.matches("input,textarea")) return;
    if (e.key === "t" || e.key === "T") el("#btn-track").click();
    if (e.key === "s" || e.key === "S") el("#btn-save").click();
    if (e.key === "r" || e.key === "R") el("#btn-record").click();
  });

  el("#btn-record").addEventListener("click", async () => {
    if (recording) {
      recorder?.stop();
      recording = false;
      el("#btn-record").textContent = "Record webcam";
      el("#btn-record").classList.remove("danger");
      return;
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 1280, height: 720 },
        audio: false,
      });
      video.srcObject = stream;
      await video.play();
      const chunks = [];
      recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
          ? "video/webm;codecs=vp9"
          : "video/webm",
      });
      recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      recorder.onstop = () => {
        stream?.getTracks().forEach((t) => t.stop());
        stream = null;
        video.srcObject = null;
        const blob = new Blob(chunks, { type: "video/webm" });
        pickFile(new File([blob], `record_${Date.now()}.webm`, { type: "video/webm" }));
        showToast("Recording ready — track when you like");
      };
      recorder.start(200);
      recording = true;
      el("#btn-record").textContent = "Stop recording";
      el("#btn-record").classList.add("danger");
      setStatus("Recording… click Stop when done", "busy");
    } catch (err) {
      setStatus(err.message || "Camera denied", "err");
    }
  });

  el("#btn-track").addEventListener("click", async () => {
    if (!file) return;
    abort?.abort();
    abort = new AbortController();
    el("#btn-track").disabled = true;
    el("#btn-cancel").hidden = false;
    setStep(2);
    setStatus("Loading pose model…", "busy");
    setProgress(0);
    try {
      const tracked = await trackVideoFile(file, {
        sampleFps: Number(el("#fps").value) || 12,
        maxDurationSec: Number(el("#maxsec").value) || 10,
        mirror: el("#mirror").checked,
        signal: abort.signal,
        onProgress: (p) => {
          setProgress(p.pct || 0);
          setStatus(
            `Tracking ${p.pct?.toFixed?.(0) ?? 0}% · frame ${p.frameIndex + 1}/${p.totalFrames}${p.hasPose ? "" : " · seeking pose…"}`,
            "busy",
          );
        },
      });
      setStep(3);
      const name = el("#name").value.trim() || file.name;
      motion = sanitizeMotion(tracked, name);
      meta.textContent = motion.reply;
      el("#btn-save").disabled = false;
      el("#btn-dl").disabled = false;
      el("#btn-handoff").disabled = false;
      el("#btn-replay").disabled = false;
      if (!preview) preview = createPreview(el("#preview-host"));
      preview.play(motion);
      setProgress(100);
      setStatus(motion.reply, "ok");
      setStep(4);
      showToast("Motion mirrored — save, download, or send to Warlords");
    } catch (err) {
      setStatus(err.message || String(err), "err");
      bar.hidden = true;
    } finally {
      el("#btn-track").disabled = !file;
      el("#btn-cancel").hidden = true;
    }
  });

  el("#btn-cancel").addEventListener("click", () => abort?.abort());

  el("#btn-save").addEventListener("click", () => {
    if (!motion) return;
    saveClip({
      id: motion.id,
      name: el("#name").value.trim() || motion.name,
      createdAt: new Date().toISOString(),
      durationSec: motion.durationSec,
      sampleFps: Number(el("#fps").value) || 12,
      mirror: el("#mirror").checked,
      sourceFileName: file?.name,
      motion,
    });
    renderLibrary();
    showToast("Saved to library");
    setStatus(`Saved “${el("#name").value || motion.id}”`, "ok");
  });

  el("#btn-dl").addEventListener("click", () => {
    if (!motion) return;
    downloadJson(toBakeJson(motion), `${motion.id}.json`);
    showToast("Bake JSON downloaded");
  });

  el("#btn-handoff").addEventListener("click", () => {
    if (!motion) return;
    try {
      localStorage.setItem(
        HANDOFF_KEY,
        JSON.stringify({
          v: 1,
          at: new Date().toISOString(),
          motion,
          sourceHost: location.host,
          intent: "play_special",
        }),
      );
    } catch {
      /* */
    }
    window.open(`${WARLORDS_MOCAP}?handoff=1`, "_blank", "noopener");
    showToast("Handoff written — Warlords mocap page can import");
  });

  el("#btn-replay").addEventListener("click", () => {
    if (motion && preview) preview.play(motion);
  });

  el("#btn-export-lib").addEventListener("click", () => {
    downloadJson(listClips(), `anim-studio-library-${Date.now()}.json`);
  });

  el("#import-json").addEventListener("change", async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const text = await f.text();
      const data = JSON.parse(text);
      // bake JSON or library entry
      if (data.motion?.frames) {
        motion = data.motion;
      } else if (data.tracks) {
        motion = bakeJsonToMotion(data);
      } else if (Array.isArray(data) && data[0]?.motion) {
        motion = data[0].motion;
      } else {
        throw new Error("Unrecognized JSON (expect bake tracks or library entry)");
      }
      el("#name").value = motion.name || motion.id;
      el("#btn-save").disabled = false;
      el("#btn-dl").disabled = false;
      el("#btn-handoff").disabled = false;
      el("#btn-replay").disabled = false;
      if (!preview) preview = createPreview(el("#preview-host"));
      preview.play(motion);
      meta.textContent = motion.reply || "Imported JSON";
      setStatus("Imported animation JSON", "ok");
      setStep(4);
      showToast("Import OK");
    } catch (err) {
      setStatus(err.message || String(err), "err");
    }
    e.target.value = "";
  });

  function bakeJsonToMotion(o) {
    const tracks = o.tracks || [];
    const boneTimes = new Map();
    for (const t of tracks) {
      const bone = String(t.name || "").replace(/\.quaternion$/, "");
      if (!bone) continue;
      boneTimes.set(bone, { times: t.times, values: t.values });
    }
    const first = [...boneTimes.values()][0];
    if (!first) throw new Error("No tracks");
    const frames = first.times.map((t, i) => {
      const pose = {};
      for (const [bone, tv] of boneTimes) {
        const vi = i * 4;
        pose[bone] = [
          tv.values[vi] ?? 0,
          tv.values[vi + 1] ?? 0,
          tv.values[vi + 2] ?? 0,
          tv.values[vi + 3] ?? 1,
        ];
      }
      const next = first.times[i + 1] ?? t + 0.1;
      return { t, duration: Math.max(0.04, next - t), pose, confidence: 0.85 };
    });
    const id = String(o.name || `import_${Date.now().toString(36)}`);
    return {
      id,
      name: id,
      skeleton: "mixamorig",
      durationSec: Number(o.duration) || frames[frames.length - 1]?.t || 1,
      frames,
      bones: [...boneTimes.keys()],
      rootMotion: "baked_locked",
      source: "pose_sequence",
      confidence: 0.85,
      validation: { ok: true, errors: [], warnings: ["imported"], sanitized: true },
      reply: `Imported ${id}`,
    };
  }

  function renderLibrary() {
    const clips = listClips();
    if (!clips.length) {
      libraryEl.innerHTML = `<li style="justify-content:center;color:var(--muted);font-size:0.85rem">No saved clips yet</li>`;
      return;
    }
    libraryEl.innerHTML = clips
      .map(
        (c) => `
      <li data-id="${c.id}">
        <div class="info">
          <strong>${escapeHtml(c.name)}</strong>
          <small>${c.durationSec.toFixed(1)}s · ${c.motion?.frames?.length || 0} frames · ${new Date(c.createdAt).toLocaleString()}</small>
        </div>
        <div class="actions">
          <button type="button" class="btn" data-act="use">Use</button>
          <button type="button" class="btn" data-act="json">JSON</button>
          <button type="button" class="btn danger" data-act="del">Del</button>
        </div>
      </li>`,
      )
      .join("");
  }

  libraryEl.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-act]");
    const li = e.target.closest("li[data-id]");
    if (!btn || !li) return;
    const clip = listClips().find((c) => c.id === li.dataset.id);
    if (!clip) return;
    if (btn.dataset.act === "use") {
      motion = clip.motion;
      el("#name").value = clip.name;
      el("#btn-save").disabled = false;
      el("#btn-dl").disabled = false;
      el("#btn-replay").disabled = false;
      if (!preview) preview = createPreview(el("#preview-host"));
      preview.play(motion);
      meta.textContent = motion.reply || clip.name;
      setStatus(`Loaded ${clip.name}`, "ok");
      setStep(4);
    }
    if (btn.dataset.act === "json") {
      downloadJson(toBakeJson(clip.motion), `${clip.id}.json`);
    }
    if (btn.dataset.act === "del") {
      deleteClip(clip.id);
      renderLibrary();
      showToast("Deleted");
    }
  });

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  renderLibrary();
  preloadPoseModel();

  // Health ping for access optimization awareness
  fetch(`${API}/health`)
    .then((r) => r.json())
    .then((j) => {
      if (j?.ok) setStatus((status.textContent || "Ready") + ` · API ${j.version || "ok"}`);
    })
    .catch(() => {});

  return {
    dispose() {
      preview?.dispose();
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      stream?.getTracks().forEach((t) => t.stop());
    },
  };
}
