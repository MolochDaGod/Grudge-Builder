import { useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { isAuthenticated } from "@/lib/grudgeBackend";
import { assetUrl } from "@/lib/assetConfig";

declare global {
  interface Window {
    openGrudgeAuthModal?: () => void;
    grudgeAuthIsLoggedIn?: () => boolean;
  }
}

export default function LoginPage() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // If already authenticated, skip to home
    if (isAuthenticated() || window.grudgeAuthIsLoggedIn?.()) {
      setLocation("/home");
      return;
    }

    // Listen for auth success from the Grudge Auth Modal
    const onAuthSuccess = () => {
      setLocation("/home");
    };
    window.addEventListener("grudge:auth:success", onAuthSuccess);

    // Auto-open the auth modal on mount
    const timer = setTimeout(() => {
      window.openGrudgeAuthModal?.();
    }, 400);

    return () => {
      window.removeEventListener("grudge:auth:success", onAuthSuccess);
      clearTimeout(timer);
    };
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage: `url(${assetUrl("/backgrounds/login-bg.jpg")})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md text-center"
      >
        <img
          src={assetUrl("/sprites/ui/grudge-logo.png")}
          alt="Grudge Warlords"
          className="w-20 h-20 mx-auto mb-4"
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
        <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 font-cinzel tracking-wide mb-1">
          GRUDGE
        </h1>
        <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-amber-400 font-cinzel tracking-[0.2em] mb-2">
          WARLORDS
        </h2>
        <p className="text-stone-500 text-xs tracking-widest uppercase mb-8">
          Grudge Studio
        </p>

        <button
          onClick={() => window.openGrudgeAuthModal?.()}
          className="px-8 py-3 rounded-lg font-cinzel font-bold tracking-wider text-stone-950"
          style={{
            background: 'linear-gradient(135deg, #DB6331, #FAAC47)',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.95rem',
            letterSpacing: '0.1em',
            boxShadow: '0 4px 24px rgba(250,172,71,0.3)',
          }}
        >
          SIGN IN WITH GRUDGE ID
        </button>

        <p className="text-stone-600 text-xs mt-6">
          Sign in for cloud saves, characters, and crafting
        </p>
      </motion.div>
    </div>
  );
}
