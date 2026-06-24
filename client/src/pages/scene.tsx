/**
 * /scene — full-page Grudge Studio opening scene + universal model viewer.
 * Thin wrapper around the reusable <OpeningScene> component.
 */

import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";
import OpeningScene from "@/components/forge/OpeningScene";

export default function ScenePage() {
  const [, setLocation] = useLocation();
  return (
    <div className="flex h-screen w-screen flex-col bg-[#0a0a12]">
      <header className="flex items-center gap-2 border-b border-slate-800 bg-slate-900/80 px-3 py-2 backdrop-blur-sm">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/forge")} className="text-slate-400">
          <Home className="h-4 w-4" />
        </Button>
        <h1 className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-sm font-bold text-transparent">
          Grudge Studio — Opening Scene
        </h1>
      </header>
      <div className="min-h-0 flex-1 p-3">
        <OpeningScene className="h-full" />
      </div>
    </div>
  );
}
