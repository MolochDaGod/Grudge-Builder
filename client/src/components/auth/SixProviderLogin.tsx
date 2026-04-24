/**
 * SixProviderLogin — drop-in auth card with all six sign-in methods.
 *
 * 1. Email + password
 * 2. Google OAuth (direct to Supabase)
 * 3. Discord OAuth (direct to Supabase — paste Discord app client ID/secret
 *    into Supabase dashboard; no code changes needed here)
 * 4. Phone / Twilio SMS OTP
 * 5. Puter (via auth-puter-bridge Worker)
 * 6. Solana wallet — SIWS (via auth-solana-bridge Worker)
 *
 * Mount it anywhere the existing login flow mounts, or replace the current
 * login page body with <SixProviderLogin/>.
 */
import { useState } from 'react';
import { useLocation } from 'wouter';
import { supabase } from '@/lib/supabaseClient';
import { signInWithPuter, signInWithSolana } from '@/lib/authBridges';
import { useWallet } from '@solana/wallet-adapter-react';

declare global {
  interface Window {
    puter?: {
      auth: {
        signIn: () => Promise<{ username: string; uuid: string }>;
        getToken: () => string | null | undefined;
      };
    };
  }
}

type Mode = 'email' | 'phone' | 'none';

export default function SixProviderLogin() {
  const [, setLocation] = useLocation();
  const wallet = useWallet();

  const [mode, setMode] = useState<Mode>('none');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function withBusy<T>(label: string, fn: () => Promise<T>): Promise<T | null> {
    setError(null);
    setBusy(label);
    try {
      return await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return null;
    } finally {
      setBusy(null);
    }
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    await withBusy('email', async () => {
      // Try sign-in first; if invalid creds, try sign-up.
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signInErr) {
        const { error: signUpErr } = await supabase.auth.signUp({ email, password });
        if (signUpErr) throw signUpErr;
        setError('Account created — check your email to confirm, then sign in.');
        return;
      }
      setLocation('/dashboard');
    });
  }

  async function handleOAuth(provider: 'google' | 'discord') {
    await withBusy(provider, async () => {
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (err) throw err;
    });
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    await withBusy('phone-send', async () => {
      const { error: err } = await supabase.auth.signInWithOtp({ phone });
      if (err) throw err;
      setOtpSent(true);
    });
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    await withBusy('phone-verify', async () => {
      const { error: err } = await supabase.auth.verifyOtp({ phone, token: otp, type: 'sms' });
      if (err) throw err;
      setLocation('/dashboard');
    });
  }

  async function handlePuter() {
    await withBusy('puter', async () => {
      if (!window.puter?.auth) throw new Error('Puter SDK not loaded');
      const { username } = await window.puter.auth.signIn();
      const token = window.puter.auth.getToken?.();
      if (!token) throw new Error('Puter returned no token');
      await signInWithPuter(username, token);
      setLocation('/dashboard');
    });
  }

  async function handleSolana() {
    await withBusy('solana', async () => {
      if (!wallet.connected) await wallet.connect();
      if (!wallet.publicKey || !wallet.signMessage) throw new Error('Wallet not ready');
      await signInWithSolana({
        publicKey: wallet.publicKey,
        signMessage: wallet.signMessage,
      });
      setLocation('/dashboard');
    });
  }

  return (
    <div style={{ maxWidth: 420, margin: '0 auto', padding: 24, fontFamily: 'sans-serif' }}>
      <h2 style={{ marginBottom: 16 }}>Sign in to Grudge Studio</h2>

      {error && (
        <div style={{ background: '#3b1', padding: 10, borderRadius: 6, marginBottom: 12, color: '#fff' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button type="button" disabled={!!busy} onClick={() => setMode(mode === 'email' ? 'none' : 'email')}>
          Email + password
        </button>
        {mode === 'email' && (
          <form onSubmit={handleEmail} style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 12 }}>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email" required />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password" required />
            <button type="submit" disabled={busy === 'email'}>{busy === 'email' ? 'Signing in…' : 'Sign in / Sign up'}</button>
          </form>
        )}

        <button type="button" disabled={!!busy} onClick={() => handleOAuth('google')}>
          Continue with Google
        </button>

        <button type="button" disabled={!!busy} onClick={() => handleOAuth('discord')}>
          Continue with Discord
        </button>

        <button type="button" disabled={!!busy} onClick={() => setMode(mode === 'phone' ? 'none' : 'phone')}>
          Continue with Phone (SMS)
        </button>
        {mode === 'phone' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 12 }}>
            {!otpSent ? (
              <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+15551234567" required />
                <button type="submit" disabled={busy === 'phone-send'}>Send code</button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="6-digit code" required />
                <button type="submit" disabled={busy === 'phone-verify'}>Verify</button>
              </form>
            )}
          </div>
        )}

        <button type="button" disabled={!!busy} onClick={handlePuter}>
          Continue with Puter
        </button>

        <button type="button" disabled={!!busy} onClick={handleSolana}>
          {wallet.connected ? `Sign in with ${wallet.wallet?.adapter.name ?? 'wallet'}` : 'Connect Solana Wallet'}
        </button>
      </div>
    </div>
  );
}
