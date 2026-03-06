import { useState } from 'react';
import { PUTER_CONFIG } from '../lib/puterIntegration';
import { AdminLoginDialog } from './AdminLoginDialog';
import { useAdmin } from '@/contexts/AdminContext';
import { Shield, Skull } from 'lucide-react';

export function PuterFooter() {
  const [showAdminDialog, setShowAdminDialog] = useState(false);
  const { isAdmin } = useAdmin();

  return (
    <>
      <footer 
        className="fixed bottom-0 left-0 right-0 py-2 px-4 bg-gradient-to-t from-black/80 to-transparent text-center z-50"
        data-testid="footer-studio"
      >
        <div className="flex items-center justify-center gap-4 text-xs text-gray-400">
          <button
            onClick={() => setShowAdminDialog(true)}
            className="flex items-center gap-1.5 hover:text-amber-400 transition-colors font-cinzel"
            data-testid="button-admin-toggle"
          >
            {isAdmin && <Shield className="w-3 h-3 text-green-400" />}
            <span>{PUTER_CONFIG.appName} v{PUTER_CONFIG.version}</span>
          </button>
          <span className="text-gray-600">|</span>
          <a 
            href={PUTER_CONFIG.developerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-amber-400 transition-colors flex items-center gap-1"
            data-testid="link-studio"
          >
            <Skull className="w-4 h-4" />
            Powered by {PUTER_CONFIG.studio}
          </a>
        </div>
      </footer>

      <AdminLoginDialog 
        open={showAdminDialog} 
        onOpenChange={setShowAdminDialog} 
      />
    </>
  );
}
