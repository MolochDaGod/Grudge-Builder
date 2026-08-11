/**
 * Casting Master codex — Linear + CastingAbilities merge for info / fleet.
 * Route: /casting-master
 */
import { useMemo, useState } from "react";
import {
  CASTING_MASTER_VERSION,
  LINEAR_SHOT_META,
  PATH_ELEMENTS,
  PRODUCT_TO_LINEAR,
  TERRAIN_LAYERS,
  TERRAIN_RULES,
  MASTER_VFX_EFFECTS,
  planMasterCast,
  getMasterContract,
  type LinearSkillshotId,
} from "@shared/casting/masterCatalog";

const SHOTS = Object.values(LINEAR_SHOT_META);

export default function CastingMasterPage() {
  const contract = useMemo(() => getMasterContract(), []);
  const [element, setElement] = useState("fire");
  const plan = useMemo(
    () => planMasterCast({ element, id: `demo_${element}` }, { focusCombat: true }),
    [element],
  );

  return (
    <div className="min-h-screen bg-[#0a0c12] text-[#e8eef6] p-6 md:p-10 font-sans">
      <header className="max-w-5xl mx-auto mb-8 border-b border-[#2a3a4e] pb-6">
        <p className="text-[#7c9cff] text-sm tracking-widest uppercase mb-2">
          Grudge Studio · Casting Master v{CASTING_MASTER_VERSION}
        </p>
        <h1 className="text-3xl md:text-4xl font-bold">Linear + Casting → Islands</h1>
        <p className="mt-3 text-[#9ab] max-w-2xl leading-relaxed">
          Mastered skillshots and weapon VFX from{" "}
          <a
            className="text-[#3dd6c6] underline"
            href="https://github.com/MolochDaGod/LinearAbiltyCastingThreeJS"
            target="_blank"
            rel="noreferrer"
          >
            LinearAbilityCasting
          </a>{" "}
          and{" "}
          <a
            className="text-[#3dd6c6] underline"
            href="https://github.com/MolochDaGod/CastingAbilitiesThreeJS"
            target="_blank"
            rel="noreferrer"
          >
            CastingAbilities
          </a>
          , on three-layer islands (
          <a
            className="text-[#3dd6c6] underline"
            href="https://simonstorlschulke.github.io/threejs-examples/?scene=0"
            target="_blank"
            rel="noreferrer"
          >
            terrain L0 pattern
          </a>
          ). Contract for{" "}
          <a className="text-[#3dd6c6] underline" href="https://info.grudge-studio.com">
            info.grudge-studio.com
          </a>
          .
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <a
            className="px-3 py-1.5 rounded-full bg-[#1a2840] border border-[#3a5080]"
            href="/api/v1/casting-master-contract.json"
          >
            casting-master-contract.json
          </a>
          <a
            className="px-3 py-1.5 rounded-full bg-[#1a2840] border border-[#3a5080]"
            href="https://casting.grudge.studio"
            target="_blank"
            rel="noreferrer"
          >
            casting lab
          </a>
          <a
            className="px-3 py-1.5 rounded-full bg-[#1a2840] border border-[#3a5080]"
            href="/weapon-skills"
          >
            weapon skills
          </a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto grid gap-8 md:grid-cols-2">
        <section>
          <h2 className="text-lg font-semibold text-[#7c9cff] mb-3">
            Linear skillshots
          </h2>
          <ul className="space-y-2">
            {SHOTS.map((s) => (
              <li
                key={s.id}
                className="rounded-xl border border-[#243044] bg-[#121820] p-3"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ background: `#${s.color.toString(16).padStart(6, "0")}` }}
                  />
                  <strong>{s.name}</strong>
                  <span className="text-[#6a7a90] text-xs ml-auto">
                    {s.shape} · {s.id}
                  </span>
                </div>
                <p className="text-sm text-[#9ab] mt-1">{s.description}</p>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#7c9cff] mb-3">
            Product → linear map
          </h2>
          <div className="rounded-xl border border-[#243044] bg-[#121820] p-4 space-y-2 text-sm">
            {Object.entries(PRODUCT_TO_LINEAR).map(([k, v]) => (
              <div key={k} className="flex justify-between border-b border-[#1a2433] py-1">
                <span className="text-[#cde]">{k}</span>
                <span className="text-[#3dd6c6]">{v ?? "—"}</span>
              </div>
            ))}
          </div>

          <h2 className="text-lg font-semibold text-[#7c9cff] mt-6 mb-3">
            Path cast elements
          </h2>
          <div className="flex flex-wrap gap-2">
            {PATH_ELEMENTS.map((e) => (
              <span
                key={e}
                className="px-3 py-1 rounded-full bg-[#1a2840] border border-[#2a3a4e] text-sm capitalize"
              >
                {e}
              </span>
            ))}
          </div>

          <h2 className="text-lg font-semibold text-[#7c9cff] mt-6 mb-3">
            Live plan demo
          </h2>
          <select
            className="w-full bg-[#0c121c] border border-[#2a3a4e] rounded-lg p-2 mb-3"
            value={element}
            onChange={(e) => setElement(e.target.value)}
          >
            {Object.keys(PRODUCT_TO_LINEAR).map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
          <pre className="text-xs bg-[#0c121c] border border-[#243044] rounded-xl p-3 overflow-auto text-[#9ab]">
            {JSON.stringify(plan, null, 2)}
          </pre>
        </section>

        <section className="md:col-span-2">
          <h2 className="text-lg font-semibold text-[#7c9cff] mb-3">
            Three-layer terrain
          </h2>
          <div className="grid sm:grid-cols-5 gap-2 mb-3">
            {Object.entries(TERRAIN_LAYERS).map(([k, v]) => (
              <div
                key={k}
                className="rounded-lg bg-[#121820] border border-[#243044] p-2 text-center text-xs"
              >
                <div className="text-[#7c9cff] font-mono">{v}</div>
                <div className="text-[#6a7a90] mt-1">{k}</div>
              </div>
            ))}
          </div>
          <ul className="text-sm text-[#9ab] space-y-1 list-disc pl-5">
            {TERRAIN_RULES.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </section>

        <section className="md:col-span-2">
          <h2 className="text-lg font-semibold text-[#7c9cff] mb-3">
            VFX + GLSL dependencies
          </h2>
          <p className="text-sm text-[#9ab] mb-2">
            Shared noise + common GLSL libs drive ice / lightning / meteor / beam /
            snare / glacier materials (vendored under{" "}
            <code className="text-[#3dd6c6]">island3d/casting/</code>).
          </p>
          <div className="flex flex-wrap gap-2">
            {MASTER_VFX_EFFECTS.map((id) => (
              <span
                key={id}
                className="px-2 py-1 text-xs rounded bg-[#141c28] border border-[#2a3a4e]"
              >
                {id}
              </span>
            ))}
          </div>
          <pre className="mt-4 text-[10px] text-[#6a7a90] overflow-auto">
            Hosts: {JSON.stringify(contract.hosts, null, 2)}
          </pre>
        </section>
      </main>
    </div>
  );
}

// silence unused type import if tree-shaken
void (0 as unknown as LinearSkillshotId);
