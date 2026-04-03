/**
 * BackendRequired — Guard for pages that need the local Express server.
 *
 * Sprite editor, sprite admin, AI helper, launcher all require the
 * local server (server/routes.ts) which only runs during `npm run dev`.
 * In production (Vercel), these routes 404.
 *
 * This component probes the backend and shows a connection UI if unreachable.
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Server } from "lucide-react";

interface Props {
  /** Health endpoint to probe (e.g. "/api/sprites/scan") */
  probe?: string;
  /** Page title for the fallback UI */
  title?: string;
  children: React.ReactNode;
}

export default function BackendRequired({ probe = "/api/game/health", title = "Development Tool", children }: Props) {
  const [status, setStatus] = useState<"checking" | "ok" | "down">("checking");

  const check = async () => {
    setStatus("checking");
    try {
      const res = await fetch(probe, { method: "GET" });
      setStatus(res.ok || res.status === 401 ? "ok" : "down");
    } catch {
      setStatus("down");
    }
  };

  useEffect(() => { check(); }, []);

  if (status === "checking") {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
          <p className="text-slate-400 text-sm">Connecting to backend...</p>
        </div>
      </div>
    );
  }

  if (status === "down") {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md text-center space-y-4 border border-amber-700/30 rounded-xl bg-amber-950/20 p-8">
          <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto" />
          <h2 className="text-xl font-cinzel font-bold text-amber-200">{title}</h2>
          <p className="text-slate-400 text-sm">
            This feature requires the Grudge Studio backend server.
            Start the local dev server or connect via Cloudflare Tunnel.
          </p>
          <div className="flex flex-col gap-2 text-xs text-slate-500 bg-slate-900/50 rounded-lg p-3 font-mono text-left">
            <p># Start local dev server:</p>
            <p className="text-amber-400">npm run dev</p>
            <p className="mt-2"># Or start Docker stack:</p>
            <p className="text-amber-400">scripts\start-local.ps1</p>
          </div>
          <Button onClick={check} variant="outline" className="border-amber-700/40 text-amber-400 hover:bg-amber-900/20">
            <RefreshCw className="w-4 h-4 mr-2" /> Retry Connection
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
