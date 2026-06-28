import { lazy, Suspense, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useAccount } from "@/hooks/use-account";
import { shouldShowGrudgeToken } from "@/lib/grudgeTokenVisibility";
import { GrudgeWalletModal } from "./GrudgeWalletModal";
import { isAuthenticated, fetchWalletOverview } from "@/lib/grudgeBackend";
import { fetchTreatyUnread } from "@/lib/treatyChat";

const GrudgeTokenHelmet = lazy(() =>
  import("./GrudgeTokenHelmet").then((m) => ({ default: m.GrudgeTokenHelmet })),
);

/**
 * Floating Grudge token (3D helmet) — bottom-left on game pages.
 * Opens the wallet modal: balances, cNFTs, swap, send, Treaty chat, linked wallets.
 */
export function GrudgeTokenWidget() {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const { isAuthenticated: authContextAuthed, openLogin } = useAuth();
  const { account } = useAccount();
  const hasToken = isAuthenticated();
  const sessionReady = authContextAuthed || hasToken;

  const { data: overview } = useQuery({
    queryKey: ["wallet-overview"],
    queryFn: fetchWalletOverview,
    enabled: sessionReady,
    staleTime: 30_000,
  });

  const { data: unreadData } = useQuery({
    queryKey: ["treaty-unread"],
    queryFn: fetchTreatyUnread,
    enabled: sessionReady,
    refetchInterval: sessionReady ? 15_000 : false,
    staleTime: 10_000,
  });

  if (!shouldShowGrudgeToken(location)) return null;

  const gbux = overview?.gbuxBalance ?? account?.gbuxBalance ?? 0;
  const treatyUnread = unreadData?.unread ?? 0;

  const handleClick = () => {
    if (!sessionReady) {
      openLogin();
      return;
    }
    setOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        aria-label="Open Grudge wallet"
        data-testid="grudge-token-fab"
        className="fixed bottom-4 left-4 z-[45] group flex flex-col items-center gap-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded-2xl"
      >
        <div
          className="relative w-[76px] h-[76px] rounded-2xl overflow-hidden border-2 border-amber-500/50 shadow-lg shadow-amber-900/40 transition-transform group-hover:scale-105 group-active:scale-95"
          style={{
            background:
              "radial-gradient(ellipse at 50% 30%, rgba(251,191,36,0.25) 0%, rgba(15,10,8,0.95) 70%)",
          }}
        >
          <Suspense
            fallback={
              <div className="w-full h-full flex items-center justify-center">
                <img
                  src="/sprites/gbux-token.png"
                  alt=""
                  className="w-10 h-10 rounded-full animate-pulse"
                />
              </div>
            }
          >
            <GrudgeTokenHelmet className="w-full h-full pointer-events-none" />
          </Suspense>
          <div className="absolute inset-0 ring-1 ring-inset ring-amber-300/20 rounded-2xl pointer-events-none" />
          {treatyUnread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-600 text-white text-[10px] font-bold border-2 border-slate-950">
              {treatyUnread > 99 ? "99+" : treatyUnread}
            </span>
          )}
        </div>
        <span className="text-[10px] font-bold text-amber-300/90 bg-slate-950/90 px-2 py-0.5 rounded-full border border-amber-800/40 font-mono tabular-nums">
          {gbux >= 1000 ? `${(gbux / 1000).toFixed(1)}k` : gbux} GBUX
        </span>
      </button>

      <GrudgeWalletModal open={open} onOpenChange={setOpen} />
    </>
  );
}