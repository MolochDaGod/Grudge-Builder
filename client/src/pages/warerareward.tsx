/**
 * Warerareward — Keel launch offer page
 * 
 * Visual offer: 22 land spots on faction islands + home-island
 * Referral UI with WERA-XXXXXX code format
 * First character free (copy only — Keel grant after register, not a public mint)
 * Email/username register + login
 * cNFT character/island: show copy + later Crossmint (do not invent a mint or keys)
 * 
 * Auth/API (same-origin paths only — Vercel proxies to Railway → id.grudge-studio.com):
 * - POST /api/auth/register {username, password, displayName?}
 * - POST /api/auth/login
 * - Then Authorization: Bearer for GET /api/auth/me, GET /api/account, POST /api/wallet/create
 * - Referral: GET/POST /api/auth/referral/me and POST /api/auth/referral/claim {code} — handle 404/501 gracefully
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { WarlordsShell } from '@/components/WarlordsShell';
import { 
  Gift, 
  MapPin, 
  Users, 
  Check, 
  Copy,
  Mail,
  Lock,
  User,
  AlertCircle,
  Loader2,
  ChevronRight,
  Anchor,
  Crown
} from 'lucide-react';
import { authHeaders } from '@/lib/grudgeBackend';

interface ReferralData {
  code?: string;
  referrals?: number;
  rewards?: number;
}

export default function WarerarewardPage() {
  const { isAuthenticated, openLogin, user } = useAuth();
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [myReferralCode, setMyReferralCode] = useState<string | null>(null);
  const [referralData, setReferralData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState(false);

  // Load referral data for authenticated users
  useEffect(() => {
    if (isAuthenticated) {
      loadReferralData();
    }
  }, [isAuthenticated]);

  async function loadReferralData() {
    try {
      const res = await fetch('/api/auth/referral/me', {
        headers: authHeaders(),
      });
      
      if (res.ok) {
        const data = await res.json();
        setReferralData(data);
        setMyReferralCode(data.code || null);
      } else if (res.status !== 404 && res.status !== 501) {
        console.warn('Referral API unavailable:', res.status);
      }
    } catch (err) {
      // Referral API not yet implemented — graceful fallback
      console.debug('Referral endpoint not available yet');
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          password,
          displayName: username,
          ...(email ? { email } : {}),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Registration failed' }));
        throw new Error(data.error || 'Registration failed');
      }

      // After successful registration, claim referral code if provided
      if (referralCode.trim()) {
        await claimReferralCode(referralCode.trim());
      }

      // Reload to trigger auth context update
      window.location.reload();
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Login failed' }));
        throw new Error(data.error || 'Login failed');
      }

      // Reload to trigger auth context update
      window.location.reload();
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  async function claimReferralCode(code: string) {
    try {
      const res = await fetch('/api/auth/referral/claim', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      if (res.ok) {
        setClaimSuccess(true);
        await loadReferralData();
      } else if (res.status !== 404 && res.status !== 501) {
        const data = await res.json().catch(() => ({}));
        console.warn('Referral claim failed:', data.error || res.statusText);
      }
    } catch (err) {
      console.debug('Referral claim endpoint not available yet');
    }
  }

  function copyReferralCode() {
    if (myReferralCode) {
      navigator.clipboard.writeText(myReferralCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  }

  return (
    <WarlordsShell>
      {/* Hero Section */}
      <section className="relative min-h-[85vh] flex items-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('https://assets.grudge-studio.com/art/warlords-hero-bg.jpg')`,
            filter: 'saturate(0.9) brightness(0.4)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/70 to-[#05060c]" />
        
        <div className="relative z-10 max-w-5xl mx-auto px-4 py-20 w-full text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/30 mb-6">
              <Gift className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-semibold tracking-wider uppercase text-amber-300">
                Keel Launch Offer
              </span>
            </div>

            <h1
              className="text-5xl md:text-7xl font-black tracking-wider mb-4"
              style={{
                fontFamily: "'Cinzel', serif",
                background: 'linear-gradient(180deg, #f6c945 0%, #fff3c2 45%, #f6c945 70%, #8b6914 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              CLAIM YOUR ISLAND
            </h1>

            <p className="text-xl md:text-2xl text-slate-300 mb-3 max-w-2xl mx-auto">
              22 land spots on faction islands + your home island
            </p>
            
            <p className="text-sm text-slate-500 mb-8 italic">
              First character free — Keel grant after registration
            </p>

            {!isAuthenticated ? (
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => setShowRegisterForm(!showRegisterForm)}
                  className="px-8 py-3.5 rounded-xl font-bold tracking-wider cursor-pointer border-0"
                  style={{
                    fontFamily: "'Cinzel', serif",
                    background: 'linear-gradient(180deg, #f6c945, #d8a819)',
                    color: '#20180a',
                    boxShadow: '0 14px 40px -10px rgba(246,201,69,0.55)',
                  }}
                >
                  {showRegisterForm ? 'SIGN UP NOW' : 'GET STARTED'}
                </button>
                <button
                  type="button"
                  onClick={openLogin}
                  className="px-8 py-3.5 rounded-xl font-semibold tracking-wide border border-amber-500/40 text-amber-300 bg-black/30 hover:bg-black/50 cursor-pointer"
                >
                  Already have an account?
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3 items-center">
                <div className="flex items-center gap-2 px-6 py-3 rounded-xl bg-green-500/10 border border-green-500/30">
                  <Check className="w-5 h-5 text-green-400" />
                  <span className="text-green-300 font-semibold">
                    Signed in as {user?.username || 'Warlord'}
                  </span>
                </div>
                <a
                  href="https://character.grudge-studio.com?era=warlords"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-amber-300 border border-amber-500/40 bg-black/30 hover:bg-black/50 no-underline"
                >
                  <Crown className="w-5 h-5" />
                  Create your hero
                  <ChevronRight className="w-4 h-4" />
                </a>
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* Auth Forms (visible when not authenticated and toggled) */}
      {!isAuthenticated && showRegisterForm && (
        <section className="max-w-md mx-auto px-4 py-12">
          <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-sm p-8">
            <div className="flex justify-center gap-4 mb-6">
              <button
                type="button"
                onClick={() => setShowRegisterForm(true)}
                className={`text-sm font-semibold pb-2 border-b-2 transition-colors ${
                  showRegisterForm
                    ? 'text-amber-300 border-amber-400'
                    : 'text-slate-500 border-transparent'
                }`}
              >
                Sign Up
              </button>
              <button
                type="button"
                onClick={() => setShowRegisterForm(false)}
                className={`text-sm font-semibold pb-2 border-b-2 transition-colors ${
                  !showRegisterForm
                    ? 'text-amber-300 border-amber-400'
                    : 'text-slate-500 border-transparent'
                }`}
              >
                Sign In
              </button>
            </div>

            <form onSubmit={showRegisterForm ? handleRegister : handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  <User className="w-4 h-4 inline mr-1" />
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-lg bg-black/60 border border-white/10 text-white focus:border-amber-400/50 focus:outline-none"
                  placeholder="Enter username"
                />
              </div>

              {showRegisterForm && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    <Mail className="w-4 h-4 inline mr-1" />
                    Email (optional)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg bg-black/60 border border-white/10 text-white focus:border-amber-400/50 focus:outline-none"
                    placeholder="your@email.com"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  <Lock className="w-4 h-4 inline mr-1" />
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-lg bg-black/60 border border-white/10 text-white focus:border-amber-400/50 focus:outline-none"
                  placeholder="Enter password"
                />
              </div>

              {showRegisterForm && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    <Gift className="w-4 h-4 inline mr-1" />
                    Referral Code (optional)
                  </label>
                  <input
                    type="text"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                    className="w-full px-4 py-2.5 rounded-lg bg-black/60 border border-white/10 text-white focus:border-amber-400/50 focus:outline-none font-mono"
                    placeholder="WERA-XXXXXX"
                  />
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                  <AlertCircle className="w-4 h-4 text-red-400" />
                  <span className="text-sm text-red-300">{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-3 rounded-lg font-bold tracking-wide cursor-pointer border-0 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  fontFamily: "'Cinzel', serif",
                  background: 'linear-gradient(180deg, #f6c945, #d8a819)',
                  color: '#20180a',
                }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {showRegisterForm ? 'Creating Account...' : 'Signing In...'}
                  </span>
                ) : (
                  showRegisterForm ? 'Create Account' : 'Sign In'
                )}
              </button>
            </form>
          </div>
        </section>
      )}

      {/* 22 Land Spots + Home Island */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <h2
            className="text-3xl md:text-4xl font-bold tracking-wide text-amber-400 mb-2"
            style={{ fontFamily: "'Cinzel', serif" }}
          >
            Your Territory
          </h2>
          <p className="text-slate-400">
            22 faction island spots + 1 home island — yours to build, harvest, and defend
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Faction Islands */}
          <div className="rounded-2xl border border-amber-500/20 bg-black/40 backdrop-blur-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <MapPin className="w-6 h-6 text-amber-400" />
              <h3 className="text-xl font-bold text-white" style={{ fontFamily: "'Cinzel', serif" }}>
                22 Faction Spots
              </h3>
            </div>
            <p className="text-sm text-slate-300 mb-4">
              Strategic land parcels across Crusade, Legion, and Fabled territories. Build camps, 
              harvest resources, and establish your guild presence.
            </p>
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-400" />
                Prime resource nodes
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-400" />
                Faction protection zones
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-400" />
                Guild camp sites
              </li>
            </ul>
          </div>

          {/* Home Island */}
          <div className="rounded-2xl border border-amber-500/20 bg-black/40 backdrop-blur-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <Anchor className="w-6 h-6 text-amber-400" />
              <h3 className="text-xl font-bold text-white" style={{ fontFamily: "'Cinzel', serif" }}>
                Home Island
              </h3>
            </div>
            <p className="text-sm text-slate-300 mb-4">
              Your private sanctuary. Craft, store, and rest between voyages. Invite up to 5 allies 
              to visit your island.
            </p>
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-400" />
                Private resource gathering
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-400" />
                Crafting benches
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-400" />
                Storage vaults
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Referral Section */}
      {isAuthenticated && (
        <section className="max-w-4xl mx-auto px-4 py-12">
          <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-900/20 to-black/40 backdrop-blur-sm p-8">
            <div className="flex items-center gap-3 mb-6">
              <Users className="w-7 h-7 text-amber-400" />
              <h3 className="text-2xl font-bold text-white" style={{ fontFamily: "'Cinzel', serif" }}>
                Invite Warlords
              </h3>
            </div>

            {myReferralCode ? (
              <div className="space-y-4">
                <p className="text-slate-300">
                  Share your code and earn rewards when allies join the realm.
                </p>
                
                <div className="flex items-center gap-3">
                  <div className="flex-1 px-4 py-3 rounded-lg bg-black/60 border border-white/10">
                    <code className="text-lg font-mono text-amber-300">{myReferralCode}</code>
                  </div>
                  <button
                    type="button"
                    onClick={copyReferralCode}
                    className="px-6 py-3 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 cursor-pointer flex items-center gap-2"
                  >
                    {copiedCode ? (
                      <>
                        <Check className="w-5 h-5" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-5 h-5" />
                        Copy
                      </>
                    )}
                  </button>
                </div>

                {referralData && (
                  <div className="grid grid-cols-2 gap-4 pt-4">
                    <div className="text-center p-4 rounded-lg bg-black/40 border border-white/5">
                      <div className="text-2xl font-bold text-amber-400">
                        {referralData.referrals || 0}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">Referrals</div>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-black/40 border border-white/5">
                      <div className="text-2xl font-bold text-amber-400">
                        {referralData.rewards || 0}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">Rewards</div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-slate-400 italic">
                Referral codes will be available soon. Check back after launch.
              </p>
            )}

            {claimSuccess && (
              <div className="mt-4 flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                <Check className="w-4 h-4 text-green-400" />
                <span className="text-sm text-green-300">Referral code claimed successfully!</span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* cNFT Info Section */}
      <section className="max-w-4xl mx-auto px-4 py-12">
        <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-sm p-8 text-center">
          <h3
            className="text-2xl font-bold text-white mb-3"
            style={{ fontFamily: "'Cinzel', serif" }}
          >
            Character & Island cNFTs
          </h3>
          <p className="text-slate-300 mb-4">
            Your hero and home island will be minted as Solana compressed NFTs.
          </p>
          <p className="text-sm text-slate-500 italic">
            Minting powered by Crossmint — available after character creation. No wallet required to start.
          </p>
        </div>
      </section>

      {/* Footer CTA */}
      {!isAuthenticated && (
        <section className="max-w-5xl mx-auto px-4 py-16 text-center">
          <p className="text-slate-400 mb-6">
            Ready to claim your territory in Grudge Warlords?
          </p>
          <button
            type="button"
            onClick={() => setShowRegisterForm(true)}
            className="px-10 py-4 rounded-xl font-bold tracking-wider text-lg cursor-pointer border-0"
            style={{
              fontFamily: "'Cinzel', serif",
              background: 'linear-gradient(180deg, #f6c945, #d8a819)',
              color: '#20180a',
              boxShadow: '0 14px 40px -10px rgba(246,201,69,0.55)',
            }}
          >
            START YOUR JOURNEY
          </button>
        </section>
      )}
    </WarlordsShell>
  );
}
