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