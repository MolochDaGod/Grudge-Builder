/**
 * TVS / Grudox Animator AI Worker Chat
 *
 * Offline NL → animation plan + optional LLM via ai.grudge-studio.com / fleet.
 * Executes on THREE.AnimationMixer, AnimationDirector, or a registered host.
 *
 * Usage on https://grudox.grudge-studio.com/animator/ :
 *   <script src="/js/tvs-anim-worker-chat.js" defer></script>
 *
 * Host registration (from SPA):
 *   window.AnimWorkerChat.setHost({
 *     getMixer: () => mixer,
 *     getRoot: () => model,
 *     resolveClip: (slot) => clipsBySemantic[slot],
 *     listClips: () => Object.keys(clipsBySemantic),
 *     setGaitTarget: (m,s) => director.setGaitTarget(m,s),
 *     playOneShot: (clip,o) => director.playOneShot(...),
 *     THREE,
 *   });
 */
(function (global) {
  "use strict";

  var VERSION = "1.0.0";
  var AI_CHAT =
    "https://ai.grudge-studio.com/v1/agents/animator/chat";
  var AI_ASSISTANT = "https://ai.grudge-studio.com/ai/assistant";

  var SEMANTIC = [
    "idle",
    "locomotion",
    "walk",
    "run",
    "sprint",
    "attack",
    "defend",
    "block",
    "dodge",
    "cast",
    "jump",
    "sit",
    "emote",
    "death",
    "hit",
    "special",
  ];

  var ALIASES = {
    idle: "idle",
    stand: "idle",
    standing: "idle",
    walk: "walk",
    walking: "walk",
    run: "run",
    running: "run",
    sprint: "sprint",
    dash: "sprint",
    move: "locomotion",
    go: "locomotion",
    attack: "attack",
    slash: "attack",
    strike: "attack",
    punch: "attack",
    defend: "defend",
    block: "block",
    guard: "block",
    dodge: "dodge",
    roll: "dodge",
    cast: "cast",
    spell: "cast",
    magic: "cast",
    jump: "jump",
    sit: "sit",
    emote: "emote",
    wave: "emote",
    death: "death",
    die: "death",
    special: "special",
  };

  var ONESHOT = {
    attack: 1,
    dodge: 1,
    jump: 1,
    cast: 1,
    special: 1,
    hit: 1,
    death: 1,
    emote: 1,
  };
  var GAIT = { walk: 1, run: 1, sprint: 1, locomotion: 1 };

  var FACTS = {
    human: [
      "Humanoid locomotion is root-driven on XZ; feet plant relative to hips.",
      "Idle is a breathing loop — never a frozen T-pose.",
      "Walk/run blend by speed; attacks are one-shots (windup→active→recovery).",
      "Hip bone is the skeletal root; moving only the mesh root causes foot slide.",
    ],
    rigid: [
      "Gameplay owns Object3D position; bone tracks are visual.",
      "Prefer rotation-only clips when retargeting across scales.",
      "Set gait from velocity; face with yaw; colliders stay in sidecar JSON.",
    ],
    mixer: [
      "One AnimationMixer per instance on that instance's anim root.",
      "SkeletonUtils.clone for skinned meshes — never Object3D.clone alone.",
      "Always mixer.update(delta); pause when culled.",
      "Loco = weighted idle/walk/run; one-shots use LoopOnce + clampWhenFinished.",
      "Share clips, never share mixers. Dispose actions/listeners on unmount.",
    ],
    grudge: [
      "Bip001 rotation-only JSON under /anims/baked/{pack}/.",
      "AnimationDirector: setGaitTarget, playOneShot, update(dt), dispose.",
      "Empty clips forbidden. Semantic slots > raw FBX names.",
    ],
  };

  // ── State ────────────────────────────────────────────────────
  var host = null;
  var history = [];
  var panelEl = null;
  var useLlm = true;
  var apiKey = null;

  // ── NL compiler ──────────────────────────────────────────────
  function findSlot(lower) {
    var keys = Object.keys(ALIASES).sort(function (a, b) {
      return b.length - a.length;
    });
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (new RegExp("\\b" + k + "\\b", "i").test(lower)) return ALIASES[k];
    }
    return null;
  }

  function compileNL(input) {
    var text = String(input || "").trim();
    if (!text) {
      return {
        reply: "Try: walk, attack, wave, move forward 2, turn left, list clips, explain mixer.",
        confidence: 1,
        ops: [],
        source: "local",
      };
    }
    var lower = text.toLowerCase();
    var ops = [];
    var notes = [];
    var confidence = 0.85;

    if (/\b(help|how|what|explain|teach|best practice)/i.test(lower)) {
      var topic = "mixer";
      if (/\b(human|motion|walk|gait)\b/.test(lower)) topic = "human";
      else if (/\b(rigid|physics|root)\b/.test(lower)) topic = "rigid";
      else if (/\b(grudge|bip001|director)\b/.test(lower)) topic = "grudge";
      ops.push({ op: "explain", topic: topic });
      notes.push("Explain " + topic);
    }
    if (
      /\b(list|show|available)\b.*\b(clip|anim)/i.test(lower) ||
      lower === "list" ||
      lower === "clips"
    ) {
      ops.push({ op: "list_clips" });
      notes.push("List clips");
    }
    if (/\b(stop|halt|cancel)\b/.test(lower)) {
      ops.push({ op: "stop", fade: 0.2 });
      ops.push({ op: "set_gait", moving: false, sprinting: false });
      notes.push("Stop");
    }
    if (/\bpause\b/.test(lower)) ops.push({ op: "pause", paused: true });
    if (/\b(resume|unpause)\b/.test(lower)) ops.push({ op: "pause", paused: false });
    if (/\b(reset|t-?pose)\b/.test(lower)) {
      ops.push({ op: "reset_pose" });
      notes.push("Reset");
    }

    // procedural
    if (
      /^\s*(wave|nod|bounce|spin)\s*$/i.test(text) ||
      (/\b(create|make)\b/.test(lower) &&
        /\b(wave|nod|bounce|spin|breathe)\b/.test(lower))
    ) {
      var preset = "breathe";
      if (/\bwave\b/.test(lower)) preset = "wave";
      else if (/\bnod\b/.test(lower)) preset = "nod";
      else if (/\bbounce\b/.test(lower)) preset = "bounce";
      else if (/\bspin\b/.test(lower)) preset = "spin";
      ops.push({
        op: "create_clip",
        name: preset,
        kind: "procedural",
        preset: preset,
        duration: 1.1,
        play: true,
      });
      notes.push("Procedural " + preset);
    }

    // move
    var moveTo = lower.match(
      /\b(?:move|go|walk)\s+(?:to\s+)?(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/,
    );
    if (moveTo) {
      ops.push({
        op: "move_root",
        x: +moveTo[1],
        y: +moveTo[2],
        z: +moveTo[3],
        relative: false,
        duration: 0.6,
      });
      ops.push({ op: "set_gait", moving: true, sprinting: false });
      notes.push("Move to position");
    } else {
      var amtM = lower.match(/(-?\d+(?:\.\d+)?)/);
      var amt = amtM ? +amtM[1] : 1;
      var dir = null;
      if (/\bforward\b|\bahead\b/.test(lower)) dir = { x: 0, y: 0, z: amt };
      else if (/\bback(ward)?\b/.test(lower)) dir = { x: 0, y: 0, z: -amt };
      else if (/\bleft\b/.test(lower) && !/\bturn left\b/.test(lower))
        dir = { x: -amt, y: 0, z: 0 };
      else if (/\bright\b/.test(lower) && !/\bturn right\b/.test(lower))
        dir = { x: amt, y: 0, z: 0 };
      if (dir) {
        ops.push({
          op: "move_root",
          x: dir.x,
          y: dir.y,
          z: dir.z,
          relative: true,
          duration: 0.5,
        });
        var sprint = /\b(sprint|dash)\b/.test(lower);
        ops.push({ op: "set_gait", moving: true, sprinting: sprint });
        ops.push({
          op: "play",
          slot: sprint ? "sprint" : /\brun\b/.test(lower) ? "run" : "walk",
          loop: true,
          fade: 0.2,
        });
        notes.push("Move relative");
      }
    }

    if (/\bturn left\b/.test(lower)) {
      ops.push({ op: "face", yaw: 90, degrees: true });
      notes.push("Turn left");
    } else if (/\bturn right\b/.test(lower)) {
      ops.push({ op: "face", yaw: -90, degrees: true });
      notes.push("Turn right");
    } else if (/\bturn around\b/.test(lower)) {
      ops.push({ op: "face", yaw: 180, degrees: true });
      notes.push("Turn around");
    }

    if (/\b(stop moving|stand still)\b/.test(lower)) {
      ops.push({ op: "set_gait", moving: false, sprinting: false });
      ops.push({ op: "play", slot: "idle", loop: true, fade: 0.25 });
      notes.push("Stand still");
    }

    var slot = findSlot(lower);
    var hasPlay = ops.some(function (o) {
      return o.op === "play" || o.op === "oneshot" || o.op === "create_clip";
    });
    if (slot && !hasPlay) {
      if (GAIT[slot]) {
        ops.push({
          op: "set_gait",
          moving: true,
          sprinting: slot === "sprint",
        });
        ops.push({
          op: "play",
          slot: slot === "locomotion" ? "walk" : slot,
          loop: true,
          fade: 0.25,
        });
        notes.push("Gait " + slot);
      } else if (ONESHOT[slot]) {
        ops.push({ op: "oneshot", slot: slot, fade: 0.15 });
        notes.push("One-shot " + slot);
      } else if (slot === "idle") {
        ops.push({ op: "set_gait", moving: false, sprinting: false });
        ops.push({ op: "play", slot: "idle", loop: true, fade: 0.3 });
        notes.push("Idle");
      } else {
        ops.push({ op: "play", slot: slot, loop: true, fade: 0.25 });
        notes.push("Play " + slot);
      }
    }

    if (ops.length === 0) {
      return {
        reply:
          "Not sure — try walk, run, attack, dodge, idle, wave, move forward 2, list clips, explain mixer.",
        confidence: 0.25,
        ops: [{ op: "list_clips" }],
        source: "local",
      };
    }

    return {
      reply: notes.join(" · ") || "OK",
      confidence: confidence,
      ops: ops.slice(0, 8),
      source: "local",
    };
  }

  function explain(topic) {
    var list = FACTS[topic] || FACTS.mixer;
    return (
      (topic === "human"
        ? "Human motion:\n"
        : topic === "rigid"
          ? "Rigid body:\n"
          : topic === "grudge"
            ? "Grudge runtime:\n"
            : "AnimationMixer:\n") +
      list
        .map(function (f) {
          return "• " + f;
        })
        .join("\n")
    );
  }

  // ── Executor ─────────────────────────────────────────────────
  function resolveClip(slot) {
    if (!host) return null;
    if (host.resolveClip) return host.resolveClip(slot) || null;
    if (host.clips && host.clips[slot]) return host.clips[slot];
    return null;
  }

  function buildProcedural(name, preset, duration) {
    var THREE = (host && host.THREE) || global.THREE;
    if (!THREE || !THREE.AnimationClip) return null;
    var times = [0, duration / 2, duration];
    var tracks = [];
    function quatTrack(eulers) {
      var values = [];
      for (var i = 0; i < eulers.length; i++) {
        var e = eulers[i];
        var q = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(e[0], e[1], e[2]),
        );
        values.push(q.x, q.y, q.z, q.w);
      }
      return new THREE.QuaternionKeyframeTrack(".quaternion", times, values);
    }
    if (preset === "bounce") {
      tracks.push(
        new THREE.VectorKeyframeTrack(".position", times, [
          0, 0, 0, 0, 0.35, 0, 0, 0, 0,
        ]),
      );
    } else if (preset === "spin") {
      tracks.push(
        quatTrack([
          [0, 0, 0],
          [0, Math.PI, 0],
          [0, Math.PI * 2, 0],
        ]),
      );
    } else if (preset === "nod") {
      tracks.push(
        quatTrack([
          [0, 0, 0],
          [0.35, 0, 0],
          [0, 0, 0],
        ]),
      );
    } else {
      tracks.push(
        new THREE.VectorKeyframeTrack(".position", times, [
          0, 0, 0, 0, 0.04, 0, 0, 0, 0,
        ]),
      );
      tracks.push(
        quatTrack([
          [0, 0, 0],
          [0, 0, 0.08],
          [0, 0, 0],
        ]),
      );
    }
    var clip = new THREE.AnimationClip(name, duration, tracks);
    if (clip.optimize) clip.optimize();
    if (host && host.clips) host.clips[name] = clip;
    return clip;
  }

  function executePlan(plan) {
    var messages = [];
    var errors = [];
    if (plan.reply) messages.push(plan.reply);
    if (!host) {
      messages.push(
        "(No animation host yet — register with AnimWorkerChat.setHost. Ops were planned: " +
          plan.ops
            .map(function (o) {
              return o.op;
            })
            .join(", ") +
          ")",
      );
      return { ok: false, messages: messages, errors: ["no host"] };
    }

    for (var i = 0; i < plan.ops.length; i++) {
      var op = plan.ops[i];
      try {
        var m = runOp(op);
        if (m) messages.push(m);
      } catch (err) {
        errors.push(op.op + ": " + (err.message || err));
      }
    }
    return { ok: errors.length === 0, messages: messages, errors: errors };
  }

  function runOp(op) {
    var mixer = host.getMixer && host.getMixer();
    var root = host.getRoot && host.getRoot();
    var THREE = host.THREE || global.THREE;

    switch (op.op) {
      case "list_clips": {
        var clips =
          (host.listClips && host.listClips()) ||
          (host.clips ? Object.keys(host.clips) : []) ||
          SEMANTIC.slice();
        return "Clips: " + (clips.length ? clips.join(", ") : "(none)");
      }
      case "explain":
        return explain(op.topic || "mixer");
      case "set_gait":
        if (host.setGaitTarget) {
          host.setGaitTarget(!!op.moving, !!op.sprinting);
          return "Gait moving=" + !!op.moving + " sprint=" + !!op.sprinting;
        }
        return playSlot(
          !op.moving ? "idle" : op.sprinting ? "sprint" : "walk",
          true,
          0.25,
        );
      case "play":
        return playSlot(op.slot, op.loop !== false, op.fade || 0.25, op.timeScale);
      case "oneshot":
        if (host.playOneShot) {
          host.playOneShot(op.slot, {
            fade: op.fade || 0.15,
            timeScale: op.timeScale || 1,
          });
          return "One-shot " + op.slot;
        }
        return playSlot(op.slot, false, op.fade || 0.15, op.timeScale);
      case "stop":
        if (host.stopAll) host.stopAll(op.fade);
        else if (mixer && mixer.stopAllAction) mixer.stopAllAction();
        return "Stopped";
      case "crossfade": {
        var a = resolveClip(op.from);
        var b = resolveClip(op.to);
        if (mixer && a && b) {
          var fa = mixer.clipAction(a);
          var ta = mixer.clipAction(b);
          fa.play();
          ta.reset().play();
          fa.crossFadeTo(ta, op.duration || 0.35, true);
          return "Crossfade " + op.from + " → " + op.to;
        }
        return playSlot(op.to, true, op.duration || 0.35);
      }
      case "move_root":
        if (!root) return "No root";
        if (op.relative !== false) {
          root.position.x += op.x || 0;
          root.position.y += op.y || 0;
          root.position.z += op.z || 0;
        } else {
          root.position.set(op.x || 0, op.y || 0, op.z || 0);
        }
        return (
          "Root (" +
          root.position.x.toFixed(2) +
          ", " +
          root.position.y.toFixed(2) +
          ", " +
          root.position.z.toFixed(2) +
          ")"
        );
      case "face":
        if (!root) return "No root";
        root.rotation.y =
          op.degrees !== false ? (op.yaw * Math.PI) / 180 : op.yaw;
        return "Face " + op.yaw + (op.degrees !== false ? "°" : "rad");
      case "create_clip": {
        var clip =
          (host.createProceduralClip &&
            host.createProceduralClip(op.name, op.preset, op.duration || 1.1)) ||
          buildProcedural(op.name, op.preset, op.duration || 1.1);
        if (!clip) return "Need THREE for procedural clips";
        if (op.play !== false && mixer) {
          var act = mixer.clipAction(clip);
          if (THREE) act.loop = THREE.LoopOnce;
          act.clampWhenFinished = true;
          act.reset().fadeIn(0.15).play();
        }
        return "Procedural " + op.preset;
      }
      case "set_weight": {
        var c = resolveClip(op.slot);
        if (mixer && c) mixer.clipAction(c).setEffectiveWeight(op.weight);
        return "Weight " + op.slot + "=" + op.weight;
      }
      case "set_timescale": {
        var c2 = resolveClip(op.slot);
        if (mixer && c2)
          mixer.clipAction(c2).setEffectiveTimeScale(op.timeScale);
        return "TimeScale " + op.slot + "=" + op.timeScale;
      }
      case "pause": {
        var names =
          (host.listClips && host.listClips()) ||
          (host.clips ? Object.keys(host.clips) : []);
        for (var j = 0; j < names.length; j++) {
          var cl = resolveClip(names[j]);
          if (mixer && cl) mixer.clipAction(cl).paused = !!op.paused;
        }
        return op.paused ? "Paused" : "Unpaused";
      }
      case "reset_pose":
        if (host.stopAll) host.stopAll(0);
        if (mixer && mixer.stopAllAction) mixer.stopAllAction();
        playSlot("idle", true, 0);
        return "Reset toward idle";
      default:
        return "Unknown op " + op.op;
    }
  }

  function playSlot(slot, loop, fade, timeScale) {
    if (loop !== false && host.playLoop) {
      host.playLoop(slot, fade);
      return "Play loop " + slot;
    }
    var mixer = host.getMixer && host.getMixer();
    var clip = resolveClip(slot);
    var THREE = host.THREE || global.THREE;
    if (!mixer || !clip) {
      if (host.playOneShot) {
        host.playOneShot(slot, { fade: fade });
        return "Play " + slot + " (oneshot path)";
      }
      throw new Error('No clip for "' + slot + '"');
    }
    var action = mixer.clipAction(clip);
    if (THREE) action.loop = loop === false ? THREE.LoopOnce : THREE.LoopRepeat;
    if (loop === false) action.clampWhenFinished = true;
    if (timeScale != null) action.setEffectiveTimeScale(timeScale);
    action.reset().fadeIn(fade || 0.25).play();
    return "Play " + slot;
  }

  // ── LLM path ─────────────────────────────────────────────────
  function extractJson(text) {
    if (!text) return null;
    try {
      return JSON.parse(text.trim());
    } catch (e) {}
    var fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) {
      try {
        return JSON.parse(fence[1].trim());
      } catch (e2) {}
    }
    var s = text.indexOf("{");
    var e3 = text.lastIndexOf("}");
    if (s >= 0 && e3 > s) {
      try {
        return JSON.parse(text.slice(s, e3 + 1));
      } catch (e4) {}
    }
    return null;
  }

  async function askLlm(userText, localPlan) {
    var fleet = global.GrudgeFleet;
    var body = {
      message: userText,
      context: {
        source: "tvs-anim-worker-chat",
        localPlan: localPlan,
        clips: (host && host.listClips && host.listClips()) || SEMANTIC,
        knowledge: "animator-v" + VERSION,
      },
    };

    // Prefer fleet assistant when present
    if (fleet && typeof fleet.askAssistant === "function") {
      try {
        var ans = await fleet.askAssistant(
          "[Animator worker — respond with JSON ops plan only]\n" + userText,
        );
        var parsed =
          typeof ans === "string"
            ? extractJson(ans)
            : ans && (ans.ops ? ans : extractJson(ans.answer || ans.response || ans.message));
        if (parsed && parsed.ops) {
          parsed.source = "llm";
          return parsed;
        }
      } catch (e) {
        console.warn("[AnimWorkerChat] fleet assistant", e);
      }
    }

    var key =
      apiKey ||
      (global.localStorage && global.localStorage.getItem("grudge_ai_key")) ||
      "";
    var headers = { "Content-Type": "application/json" };
    if (key) headers.Authorization = "Bearer " + key;

    try {
      var res = await fetch(AI_CHAT, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("AI " + res.status);
      var data = await res.json();
      var text = data.response || data.answer || data.message || "";
      var plan = extractJson(text);
      if (plan && plan.ops) {
        plan.source = "llm";
        return plan;
      }
    } catch (err) {
      console.warn("[AnimWorkerChat] LLM", err);
    }
    return null;
  }

  async function handleUserMessage(text) {
    var local = compileNL(text);
    history.push({ role: "user", content: text });

    var plan = local;
    if (useLlm && local.confidence < 0.55) {
      var llmPlan = await askLlm(text, local);
      if (llmPlan && llmPlan.ops && llmPlan.ops.length) {
        plan = llmPlan;
        if (!plan.reply) plan.reply = local.reply;
        plan.source = "hybrid";
      }
    }

    var result = executePlan(plan);
    var reply =
      result.messages.join("\n") +
      (result.errors.length ? "\n⚠ " + result.errors.join("; ") : "");
    history.push({ role: "assistant", content: reply, plan: plan });
    return { plan: plan, result: result, reply: reply };
  }

  // ── UI ───────────────────────────────────────────────────────
  function mountPanel(parent) {
    if (panelEl) return panelEl;
    var el = document.createElement("div");
    el.id = "anim-worker-chat";
    el.innerHTML =
      '<style>' +
      "#anim-worker-chat{position:fixed;left:12px;bottom:12px;width:340px;max-height:52vh;" +
      "display:flex;flex-direction:column;background:rgba(10,14,22,.95);color:#e8eef6;" +
      "border:1px solid #2a3a4e;border-radius:12px;font:12px/1.4 system-ui,sans-serif;" +
      "z-index:100000;box-shadow:0 12px 40px rgba(0,0,0,.5)}" +
      "#anim-worker-chat header{display:flex;justify-content:space-between;align-items:center;" +
      "padding:8px 10px;border-bottom:1px solid #243044;font-weight:600}" +
      "#anim-worker-chat header span{color:#7c9cff}" +
      "#anim-worker-chat .log{flex:1;overflow:auto;padding:8px;min-height:120px}" +
      "#anim-worker-chat .msg{margin:0 0 8px;padding:6px 8px;border-radius:8px;background:#141c28}" +
      "#anim-worker-chat .msg.user{background:#1a2840;border-left:3px solid #7c9cff}" +
      "#anim-worker-chat .msg.bot{border-left:3px solid #3dd6c6}" +
      "#anim-worker-chat .msg pre{margin:4px 0 0;white-space:pre-wrap;color:#9ab;font-size:10px}" +
      "#anim-worker-chat form{display:flex;gap:6px;padding:8px;border-top:1px solid #243044}" +
      "#anim-worker-chat input{flex:1;background:#0c121c;border:1px solid #2a3a4e;color:#eef;" +
      "border-radius:8px;padding:8px;font:inherit}" +
      "#anim-worker-chat button{background:#243656;border:1px solid #3a5080;color:#cde;" +
      "border-radius:8px;padding:8px 10px;cursor:pointer}" +
      "#anim-worker-chat button.primary{background:#2a4a8a;border-color:#7c9cff;color:#fff}" +
      "#anim-worker-chat .hints{display:flex;flex-wrap:wrap;gap:4px;padding:0 8px 6px}" +
      "#anim-worker-chat .hints button{font-size:10px;padding:3px 7px;border-radius:999px}" +
      "#anim-worker-chat .status{padding:0 10px 6px;color:#6a7a90;font-size:10px}" +
      "</style>" +
      '<header><div>Animator <span>AI Worker</span></div>' +
      '<button type="button" id="awc-close" title="Close">✕</button></header>' +
      '<div class="log" id="awc-log"></div>' +
      '<div class="hints" id="awc-hints"></div>' +
      '<div class="status" id="awc-status">v' +
      VERSION +
      " · local NL + optional LLM</div>" +
      '<form id="awc-form"><input id="awc-input" placeholder="walk · attack · wave · explain mixer" autocomplete="off" />' +
      '<button class="primary" type="submit">Go</button></form>';

    (parent || document.body).appendChild(el);
    panelEl = el;

    el.querySelector("#awc-close").onclick = function () {
      el.remove();
      panelEl = null;
    };

    var hints = [
      "walk",
      "run",
      "attack",
      "idle",
      "wave",
      "move forward 2",
      "list clips",
      "explain mixer",
    ];
    var hintsEl = el.querySelector("#awc-hints");
    hints.forEach(function (h) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = h;
      b.onclick = function () {
        el.querySelector("#awc-input").value = h;
        submit(h);
      };
      hintsEl.appendChild(b);
    });

    el.querySelector("#awc-form").onsubmit = function (ev) {
      ev.preventDefault();
      var v = el.querySelector("#awc-input").value;
      el.querySelector("#awc-input").value = "";
      submit(v);
    };

    addLog(
      "bot",
      "Animator AI Worker ready. I understand human motion, rigid-body roots, and Three.js AnimationMixer.\nHost: " +
        (host ? "connected" : "waiting for setHost()"),
    );
    return el;
  }

  function addLog(kind, text, plan) {
    if (!panelEl) return;
    var log = panelEl.querySelector("#awc-log");
    var div = document.createElement("div");
    div.className = "msg " + (kind === "user" ? "user" : "bot");
    div.textContent = text;
    if (plan && plan.ops && plan.ops.length) {
      var pre = document.createElement("pre");
      pre.textContent = JSON.stringify(plan.ops, null, 0);
      div.appendChild(pre);
    }
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
  }

  function setStatus(t) {
    if (panelEl) {
      var s = panelEl.querySelector("#awc-status");
      if (s) s.textContent = t;
    }
  }

  async function submit(text) {
    if (!text || !String(text).trim()) return;
    addLog("user", text);
    setStatus("Thinking…");
    try {
      var out = await handleUserMessage(text);
      addLog("bot", out.reply, out.plan);
      setStatus(
        "source=" +
          (out.plan.source || "local") +
          " conf=" +
          (out.plan.confidence != null
            ? out.plan.confidence.toFixed(2)
            : "?") +
          " host=" +
          (host ? "yes" : "no"),
      );
      global.dispatchEvent &&
        global.dispatchEvent(
          new CustomEvent("anim-worker:plan", { detail: out }),
        );
    } catch (err) {
      addLog("bot", "Error: " + (err.message || err));
      setStatus("error");
    }
  }

  function setHost(h) {
    host = h || null;
    if (host && !host.THREE && global.THREE) host.THREE = global.THREE;
    setStatus("Host " + (host ? "connected" : "cleared"));
    global.dispatchEvent &&
      global.dispatchEvent(
        new CustomEvent("anim-worker:host", { detail: { hasHost: !!host } }),
      );
  }

  function autoMount() {
    var path = (global.location && global.location.pathname) || "";
    if (/\/animator(\/|$)/.test(path) || /[?&]animchat=1/.test(location.search || "")) {
      mountPanel();
    }
  }

  var api = {
    version: VERSION,
    setHost: setHost,
    getHost: function () {
      return host;
    },
    compile: compileNL,
    execute: executePlan,
    handle: handleUserMessage,
    mount: mountPanel,
    unmount: function () {
      if (panelEl) panelEl.remove();
      panelEl = null;
    },
    setUseLlm: function (v) {
      useLlm = !!v;
    },
    setApiKey: function (k) {
      apiKey = k;
      try {
        if (k) localStorage.setItem("grudge_ai_key", k);
      } catch (e) {}
    },
    knowledge: FACTS,
    semanticSlots: SEMANTIC.slice(),
  };

  global.AnimWorkerChat = api;
  global.TvsAnimWorkerChat = api;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      setTimeout(autoMount, 500);
    });
  } else {
    setTimeout(autoMount, 500);
  }
})(typeof window !== "undefined" ? window : globalThis);
