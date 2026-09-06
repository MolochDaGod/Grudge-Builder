import { Component, type ReactNode } from 'react';

export function GameRecovery({ message, retry }: { message: string; retry?: () => void }) {
  return <main className="min-h-screen bg-slate-950 text-slate-100 grid place-items-center p-6">
    <section className="max-w-lg border border-amber-500/30 rounded-xl p-8 space-y-5" role="alert">
      <p className="text-amber-300 text-xs tracking-widest uppercase">Grudge Warlords · Recovery</p>
      <h1 className="text-2xl font-bold">The game could not start</h1>
      <p>{message}</p>
      <p className="text-sm text-slate-400">For a graphics error, enable browser hardware acceleration, close other 3D tabs, and retry. Your account remains available from the lobby.</p>
      <div className="flex flex-wrap gap-4">
        <button className="rounded bg-amber-400 text-black px-4 py-2" onClick={retry ?? (() => window.location.reload())}>Retry game</button>
        <a href="/lobby" className="px-4 py-2 underline">Return to lobby</a>
        <a href="/diagnostics" className="px-4 py-2 underline">Connection diagnostics</a>
      </div>
    </section>
  </main>;
}

export class GameErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() { return this.state.error ? <GameRecovery message={this.state.error.message} /> : this.props.children; }
}
