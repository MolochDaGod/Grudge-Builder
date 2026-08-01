import Layout from "@/components/Layout";
import { TruthPanel } from "@/components/TruthPanel";
import { FLEET_SERVICES } from "@shared/fleet";
import { Activity, ExternalLink } from "lucide-react";

export default function SystemsPage() {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8 pb-12">
        <header className="space-y-2">
          <div className="flex items-center gap-2 text-amber-400">
            <Activity className="h-5 w-5" />
            <h1 className="text-2xl font-bold text-stone-100">ONE TRUTH Systems</h1>
          </div>
          <p className="text-stone-400 text-sm max-w-2xl">
            Live connectivity checks for the Grudge Warlords fleet. A score below 85%
            usually means a Vercel rewrite, env var, or CDN route is pointing at a
            deprecated host instead of the canonical service.
          </p>
        </header>

        <TruthPanel variant="page" refreshMs={60_000} />

        <section className="rounded-xl border border-emerald-800/40 bg-emerald-950/20 p-6">
          <h2 className="text-lg font-semibold text-emerald-100 mb-2">Faction hero campaign (27 NPCs)</h2>
          <p className="text-sm text-stone-400 mb-3">
            Grudachain deploys 27 production hero NPCs. Each gives 3 quests; finish all 8 of your faction
            (24 quests) to unlock the mounted commander for dragons, world bosses, island sacks, and
            resource tributes. Daily board rotates automatically.
          </p>
          <div className="text-xs text-stone-500 space-y-1 font-mono">
            <div>SSOT: shared/definitions/factionHeroCampaign.ts</div>
            <div>Docs: docs/FACTION_HERO_CAMPAIGN.md</div>
            <div>Progress: localStorage warlords_faction_hero_campaign_v1</div>
          </div>
        </section>

        <section className="rounded-xl border border-sky-800/40 bg-sky-950/20 p-6">
          <h2 className="text-lg font-semibold text-sky-100 mb-2">Asset showcase (mounts · buildings · boats)</h2>
          <p className="text-sm text-stone-400 mb-3">
            Full in-game usage catalog: all mounts, benches, towers, boats, camp upgrades, modular
            pieces, and siege engines — with craft recipes, cost, HP, abilities, armor/weapons, and
            add-ons.
          </p>
          <a
            href="/asset-showcase"
            className="inline-flex items-center gap-2 rounded-lg bg-sky-600/90 hover:bg-sky-500 px-4 py-2 text-sm font-medium text-stone-950"
          >
            Open asset showcase
          </a>
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-stone-500">
            <a href="/assets" className="text-sky-400/80 hover:underline">
              /assets
            </a>
            <span>SSOT: shared/definitions/warlordsAssetShowcase.ts</span>
          </div>
        </section>

        <section className="rounded-xl border border-rose-800/40 bg-rose-950/20 p-6">
          <h2 className="text-lg font-semibold text-rose-100 mb-2">Assassination Grounds</h2>
          <p className="text-sm text-stone-400 mb-3">
            Ultimate Assassination Grounds map with full navmesh, target systems, entrance/exit
            portals, and a Return to Danger Room yes/no prompt.
          </p>
          <a
            href="/assassination-grounds"
            className="inline-flex items-center gap-2 rounded-lg bg-rose-600/90 hover:bg-rose-500 px-4 py-2 text-sm font-medium text-stone-50"
          >
            Enter Assassination Grounds
          </a>
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-stone-500">
            <a href="/maps/assassination-grounds" className="text-rose-400/80 hover:underline">
              /maps/assassination-grounds
            </a>
            <a
              href="https://open.grudge-studio.com/danger"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-amber-400/80 hover:underline"
            >
              Danger Room <ExternalLink className="h-3 w-3" />
            </a>
            <span>SSOT: shared/definitions/assassinationGroundsMap.ts</span>
          </div>
        </section>

        <section className="rounded-xl border border-amber-800/40 bg-amber-950/20 p-6">
          <h2 className="text-lg font-semibold text-amber-100 mb-2">Combat equipment lab</h2>
          <p className="text-sm text-stone-400 mb-3">
            Canonical database browser for weapons/armor, grip + wrist IK (anti mesh-through-body),
            hit reach colliders, force patterns (push/pull/knock-up/uppercut), passives, and live
            buff/debuff stacks with icons and tooltips.
          </p>
          <a
            href="/combat-lab"
            className="inline-flex items-center gap-2 rounded-lg bg-amber-600/90 hover:bg-amber-500 px-4 py-2 text-sm font-medium text-stone-950"
          >
            Open Combat Lab
          </a>
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-stone-500">
            <a href="/weapon-admin" className="text-amber-400/80 hover:underline">
              Weapon models
            </a>
            <a href="/weapon-skills" className="text-amber-400/80 hover:underline">
              Weapon skills
            </a>
            <a href="/admin-combat" className="text-amber-400/80 hover:underline">
              Timeline editor
            </a>
            <a href="/database" className="text-amber-400/80 hover:underline">
              Item database
            </a>
          </div>
        </section>

        <section className="rounded-xl border border-stone-700/60 bg-stone-950/60 p-6">
          <h2 className="text-lg font-semibold text-stone-200 mb-4">Registered services</h2>
          <div className="space-y-3">
            {FLEET_SERVICES.map((svc) => (
              <div
                key={svc.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg bg-stone-900/50 px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium text-stone-200">{svc.label}</p>
                  {svc.notes && (
                    <p className="text-xs text-stone-500 mt-0.5">{svc.notes}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-stone-500">
                  <span className="rounded bg-stone-800 px-2 py-0.5">{svc.role}</span>
                  {svc.url.startsWith("http") ? (
                    <a
                      href={svc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-amber-400/90 hover:underline"
                    >
                      {svc.url.replace("https://", "")}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <span>{svc.url}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <p className="text-xs text-stone-600">
          CLI: <code className="text-stone-500">npm run probe:truth</code> ·{" "}
          <code className="text-stone-500">npm run probe:deployments</code>
        </p>
      </div>
    </Layout>
  );
}