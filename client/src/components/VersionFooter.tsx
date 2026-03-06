import { useState } from "react";
import { AdminLoginDialog } from "./AdminLoginDialog";
import { useAdmin } from "@/contexts/AdminContext";
import { Shield, Skull } from "lucide-react";
import { PUTER_CONFIG } from "@/lib/puterIntegration";

export function VersionFooter() {
  const [showAdminDialog, setShowAdminDialog] = useState(false);
  const { isAdmin } = useAdmin();

  return (
    <>
      <div className="fixed bottom-2 left-1/2 transform -translate-x-1/2 z-40">
        <button
          onClick={() => setShowAdminDialog(true)}
          className="flex items-center gap-2 px-3 py-1 bg-slate-900/80 border border-slate-700/50 rounded-full text-xs text-slate-500 hover:text-amber-400 hover:border-amber-600/50 transition-all backdrop-blur-sm"
          data-testid="button-version-footer"
        >
          {isAdmin && <Shield className="w-3 h-3 text-green-400" />}
          <Skull className="w-3 h-3" />
          <span className="font-cinzel">{PUTER_CONFIG.studio}</span>
          <span className="text-slate-600">v{PUTER_CONFIG.version}</span>
        </button>
      </div>

      <AdminLoginDialog 
        open={showAdminDialog} 
        onOpenChange={setShowAdminDialog} 
      />
    </>
  );
}
