/** Production wallet.grudge-studio.com UI — coins RPC, Crossmint cNFTs, app store. */
export function htmlPage(env) {
  const railway = env.RAILWAY_API_ORIGIN || "https://grudge-api-production-0d46.up.railway.app";
  const idGw = env.ID_GATEWAY_ORIGIN || "https://id.grudge-studio.com";
  const poker = env.POKER_ORIGIN || "https://poker.grudge-studio.com";
  const trader = env.TRADER_ORIGIN || "https://trader.grudge-studio.com";
  const logo = idGw + "/grudge-id-logo.png";
  // Relative /login so preview and production both bounce through this origin's callback.
  const login = "/login";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="gruda-build" content="2026-09-16-sso-v1" />
<title>Gruda Wallet</title>
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
<link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<link rel="manifest" href="/manifest.webmanifest" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Sora:wght@400;500;600;700&display=swap" rel="stylesheet" />
<style>
:root{--bg:#07070b;--card:#12121a;--line:rgba(255,255,255,.08);--gold:#e0c36a;--gold2:#f3e0a8;--muted:#8b8b96;--text:#f5f5f7;--ok:#3ddeb0;--err:#ff6b7a;--safe:env(safe-area-inset-bottom,0px)}
*{box-sizing:border-box;margin:0;padding:0}
html,body{min-height:100%;background:#050508;color:var(--text);font-family:Sora,system-ui,sans-serif}
button,a.btn{font-family:inherit;cursor:pointer}
.mono{font-family:"IBM Plex Mono",ui-monospace,monospace}
.stage{min-height:100vh;display:flex;justify-content:center;background:radial-gradient(900px 420px at 50% -10%,rgba(168,85,247,.16),transparent 55%),#050508}
.app{width:100%;max-width:420px;min-height:100vh;background:linear-gradient(180deg,#12101c 0%,var(--bg) 28%);position:relative;padding-bottom:calc(76px + var(--safe))}
@media(min-width:720px){.app{min-height:820px;margin:28px 0;border-radius:28px;border:1px solid rgba(224,195,106,.18);box-shadow:0 30px 80px #000;overflow:hidden}}
header{display:flex;align-items:center;gap:10px;padding:14px 16px 8px}
.ident{flex:1;min-width:0;display:flex;align-items:center;gap:10px;background:rgba(255,255,255,.04);border:1px solid var(--line);border-radius:999px;padding:5px 12px 5px 5px}
.ident img{width:28px;height:28px;border-radius:50%;flex-shrink:0;object-fit:cover;background:#0a0a12}
.ident .who{min-width:0}
.ident b,.ident span{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ident b{font-size:12px}.ident span{font-size:11px;color:var(--muted)}
.ico{width:36px;height:36px;flex-shrink:0;border-radius:50%;border:1px solid var(--line);background:rgba(255,255,255,.04);color:var(--gold2);display:grid;place-items:center;text-decoration:none;font-size:11px;font-weight:700}
.hero{text-align:center;padding:18px 20px 8px}
.net{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--gold);margin-bottom:10px}
.fig{font-size:40px;font-weight:700;letter-spacing:-.04em;font-variant-numeric:tabular-nums}
.fig small{font-size:16px;color:var(--muted);font-weight:500;margin-left:4px}
.sub{margin-top:8px;font-size:12px;color:var(--muted);line-height:1.4}
.acts{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:16px 16px 8px}
.acts button{border:1px solid var(--line);background:var(--card);color:var(--gold2);border-radius:16px;padding:12px 4px 10px;font-size:11px;font-weight:600}
.acts .ic{display:grid;place-items:center;height:18px;margin-bottom:6px;color:var(--gold)}
.acts .ic svg{width:18px;height:18px;display:block}
section{padding:8px 16px 0}
.hrow{display:flex;justify-content:space-between;align-items:baseline;margin:12px 0 8px}
.hrow h2{font-size:13px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--muted)}
.hrow button{background:none;border:0;color:var(--gold);font-size:12px;font-weight:600}
.row{display:flex;align-items:center;gap:12px;padding:12px;background:linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.02));box-shadow:0 0 0 1px rgba(224,195,106,.14),0 10px 24px rgba(0,0,0,.35);border-radius:18px;margin-bottom:8px}
.av{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;flex-shrink:0;background:#14141c;color:var(--gold);font-size:13px;font-weight:700;overflow:hidden;box-shadow:0 0 0 1px rgba(224,195,106,.35)}
.av img{width:100%;height:100%;object-fit:contain;background:#0a0a12;outline:1px solid rgba(255,255,255,.08);outline-offset:-1px}
.card{background:linear-gradient(180deg,rgba(255,255,255,.06),rgba(18,18,26,.92));box-shadow:0 0 0 1px rgba(224,195,106,.16),0 12px 28px rgba(0,0,0,.4);border-radius:18px;margin-bottom:10px;overflow:hidden}
.card-hit{display:flex;align-items:center;gap:12px;padding:12px;width:100%;background:none;border:0;color:inherit;text-align:left;cursor:pointer;font:inherit}
.card.on .drop{display:block}
.drop{display:none;background:rgba(0,0,0,.38);border-top:1px solid rgba(224,195,106,.12);padding:6px}
.hold{display:flex;width:100%;align-items:center;gap:10px;padding:10px;background:rgba(255,255,255,.03);border:0;border-radius:12px;color:var(--text);margin-bottom:6px;font:inherit;cursor:pointer;text-align:left}
.hold:last-child{margin-bottom:0}
.copychip{display:inline-block;margin-top:4px;background:rgba(224,195,106,.1);border:1px solid rgba(224,195,106,.28);color:var(--gold2);border-radius:999px;padding:3px 8px;font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:11px;cursor:pointer}
.acts button{border:0;background:linear-gradient(180deg,#1c1a24,#101018);color:var(--gold2);border-radius:16px;padding:12px 4px 10px;font-size:11px;font-weight:600;box-shadow:0 0 0 1px rgba(224,195,106,.22),0 8px 18px rgba(0,0,0,.35)}
.primary{width:100%;border:0;border-radius:14px;padding:12px;background:linear-gradient(180deg,#e8d07a,#b8922a);color:#1a1405;font-weight:700;box-shadow:0 8px 18px rgba(184,146,42,.28)}
.ghost{width:100%;margin-top:8px;border-radius:14px;padding:12px;background:transparent;color:var(--gold2);border:0;box-shadow:0 0 0 1px rgba(224,195,106,.2);font-weight:600}
.chev{width:12px;height:12px;margin-left:6px;opacity:.7;transition:transform .15s ease}
.card.on .chev{transform:rotate(180deg)}
.meta{flex:1;min-width:0}
.meta b,.meta span{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.meta b{font-size:14px}.meta span{font-size:11px;color:var(--muted)}
.bal{text-align:right;flex-shrink:0;font-variant-numeric:tabular-nums}
.bal b{display:block;font-size:14px}.bal span{font-size:11px;color:var(--muted)}
.pill{display:inline-block;margin-left:6px;font-size:9px;letter-spacing:.08em;text-transform:uppercase;color:var(--ok);border:1px solid rgba(61,222,176,.35);border-radius:999px;padding:1px 6px}
.tiny{display:block;margin:2px 0 0 auto;background:none;border:0;color:var(--gold);font-size:10px;font-weight:600;padding:0}
.dock{position:absolute;left:0;right:0;bottom:0;display:flex;justify-content:space-around;padding:8px 8px calc(8px + var(--safe));background:rgba(10,10,16,.94);border-top:1px solid var(--line)}
.dock button{flex:1;background:none;border:0;color:var(--muted);font-size:10px;letter-spacing:.04em;text-transform:uppercase;padding:6px}
.dock button.on{color:var(--gold2)}
.panel{display:none}.panel.on{display:block}
.sheet{display:none;position:absolute;inset:0;z-index:8;background:rgba(0,0,0,.55);align-items:flex-end}
.sheet.on{display:flex}
.sheet .pad{width:100%;background:#14141c;border-top:1px solid rgba(224,195,106,.25);border-radius:22px 22px 0 0;padding:16px 16px calc(20px + var(--safe));max-height:92%;overflow:auto}
.grab{width:36px;height:4px;border-radius:99px;background:#333;margin:0 auto 14px}
.sheet h3{font-size:16px;margin-bottom:6px}
.sheet p,.msg{font-size:12px;color:var(--muted);line-height:1.45;margin-bottom:10px}
.msg.ok{color:var(--ok)}.msg.err{color:var(--err)}
.prov{display:flex;width:100%;align-items:center;gap:12px;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:12px;color:var(--text);margin-bottom:8px;font-size:14px;font-weight:600;text-align:left}
.prov img{width:28px;height:28px;border-radius:8px;object-fit:contain;background:#0a0a12;flex-shrink:0}
.addrbox{font-family:"IBM Plex Mono",monospace;font-size:12px;word-break:break-all;background:#000;border-radius:12px;padding:12px;margin:8px 0 12px}
.primary{width:100%;border:0;border-radius:14px;padding:12px;background:linear-gradient(180deg,#e8d07a,#b8922a);color:#1a1405;font-weight:700}
.ghost{width:100%;margin-top:8px;border-radius:14px;padding:12px;background:transparent;color:var(--gold2);border:1px solid var(--line);font-weight:600}
.input{width:100%;background:#0a0a12;border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:10px 12px;color:var(--text);font:inherit;margin:6px 0}
.chips{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 10px}
.chip{border:1px solid var(--line);background:var(--card);color:var(--muted);border-radius:999px;padding:6px 10px;font-size:11px;font-weight:600}
.chip.on{color:#1a1405;background:linear-gradient(180deg,#e8d07a,#b8922a);border-color:transparent}
.addbar{display:flex;gap:8px;margin:4px 0 10px}
.addbar .input{margin:0;flex:1}
.addbar button{flex-shrink:0;border:0;border-radius:10px;padding:0 14px;background:linear-gradient(180deg,#e8d07a,#b8922a);color:#1a1405;font-weight:700;font-size:12px}
.hint{font-size:11px;color:var(--muted);line-height:1.4;margin-bottom:10px}
.nftg{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding-bottom:12px}
.nftc{display:block;background:#0a0a12;border-radius:12px;overflow:hidden;border:1px solid var(--line);text-decoration:none;color:var(--text)}
.nftc img{width:100%;aspect-ratio:1;object-fit:cover;display:block;background:#16161f}
.nftc span{display:block;font-size:10px;padding:6px 7px 8px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.feat{display:block;position:relative;border-radius:18px;overflow:hidden;margin-bottom:12px;text-decoration:none;color:#fff;min-height:148px;background:#16161f}
.feat img{width:100%;height:148px;object-fit:cover;display:block}
.feat .cap{position:absolute;left:0;right:0;bottom:0;padding:14px;background:linear-gradient(transparent,rgba(0,0,0,.85))}
.feat strong{display:block;font-size:16px}
.feat em{display:block;font-style:normal;font-size:11px;color:rgba(255,255,255,.75);margin-top:2px}
.feat .get{position:absolute;top:12px;right:12px}
.appc{display:flex;align-items:center;gap:12px;padding:10px;border-radius:16px;background:var(--card);border:1px solid var(--line);text-decoration:none;color:var(--text);margin-bottom:8px}
.appc img{width:56px;height:56px;border-radius:14px;object-fit:cover;background:#16161f;flex-shrink:0}
.appc .meta{flex:1;min-width:0}
.appc .get{margin-left:auto;flex-shrink:0}
.get{border:0;border-radius:999px;padding:6px 12px;background:rgba(224,195,106,.16);color:var(--gold2);font-size:11px;font-weight:700;text-decoration:none}
.search{width:100%;background:rgba(255,255,255,.05);border:1px solid var(--line);border-radius:12px;padding:10px 12px;color:var(--text);font:inherit;margin-bottom:10px}
.preview{display:flex;align-items:center;gap:12px;padding:12px;background:#0a0a12;border-radius:14px;margin:8px 0}
.empty{font-size:12px;color:var(--muted);line-height:1.45;padding:8px 0 16px}
.suggest{background:var(--card);border:1px solid var(--line);border-radius:14px;margin:0 0 10px;overflow:hidden}
.suggest button{display:flex;width:100%;align-items:center;gap:10px;padding:10px 12px;background:none;border:0;border-bottom:1px solid var(--line);color:var(--text);text-align:left;font:inherit}
.suggest button:last-child{border-bottom:0}
.suggest .av{width:32px;height:32px}
.suggest .mint{font-size:10px;color:var(--muted)}
.store-head{display:flex;justify-content:space-between;align-items:flex-end;padding:4px 0 10px}
.store-head h2{font-size:26px;letter-spacing:-.04em;text-transform:none;color:var(--text);font-weight:700}
.today{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--gold);font-weight:600}
.story{display:block;position:relative;border-radius:22px;overflow:hidden;margin-bottom:16px;text-decoration:none;color:#fff;min-height:210px;background:#16161f}
.story img{width:100%;height:210px;object-fit:cover;display:block}
.story .cap{position:absolute;left:0;right:0;bottom:0;padding:16px;background:linear-gradient(transparent,rgba(0,0,0,.88))}
.story small{display:block;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--gold);margin-bottom:4px}
.story strong{display:block;font-size:20px;letter-spacing:-.03em}
.story em{display:block;font-style:normal;font-size:12px;color:rgba(255,255,255,.78);margin:4px 0 10px}
.story .get{position:absolute;top:14px;right:14px}
.hscroll{display:flex;gap:12px;overflow-x:auto;padding:0 0 12px;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch}
.hscroll::-webkit-scrollbar{display:none}
.iconapp{flex:0 0 108px;scroll-snap-align:start;text-decoration:none;color:var(--text);text-align:center}
.iconapp img{width:72px;height:72px;border-radius:18px;object-fit:cover;display:block;margin:0 auto 8px;background:#16161f;border:1px solid var(--line)}
.iconapp b{display:block;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.iconapp span{display:block;font-size:10px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.iconapp .get{display:inline-block;margin-top:6px}
.appc .dev{display:block;font-size:10px;color:var(--muted);margin-top:2px}
.get{border:0;border-radius:999px;padding:6px 14px;background:rgba(224,195,106,.18);color:var(--gold2);font-size:11px;font-weight:700;text-decoration:none;letter-spacing:.04em}
.cta{display:block;text-align:center;text-decoration:none;margin:8px 0 12px}
.nftc .tag{display:block;font-size:9px;letter-spacing:.08em;text-transform:uppercase;color:var(--gold);padding:0 7px 6px}
</style>
</head>
<body>
<div class="stage"><div class="app">
  <header>
    <div class="ident">
      <img src="/media/grudge-id.png" alt="Grudge ID" width="28" height="28" />
      <div class="who">
        <b id="name">Sign in</b>
        <span class="mono" id="gid">Grudge ID</span>
      </div>
    </div>
    <a class="ico" id="btn-login" href="${login}" title="Grudge ID">ID</a>
    <button class="ico" type="button" id="btn-logout" title="Sign out" hidden>✕</button>
  </header>
  <div class="hero">
    <div class="net">Gruda · Solana mainnet</div>
    <div class="fig"><span id="fig-sol">0.00</span><small>SOL</small></div>
    <div class="sub">Trader <span id="tr-sol">0.00</span> · Play <span id="play">0</span></div>
  </div>
  <div class="acts">
    <button type="button" id="act-recv"><span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v12"/><path d="M7 12l5 5 5-5"/><path d="M5 20h14"/></svg></span>Receive</button>
    <button type="button" id="act-send"><span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20V8"/><path d="M7 12l5-5 5 5"/><path d="M5 4h14"/></svg></span>Send</button>
    <button type="button" id="act-swap"><span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7h11l-3-3"/><path d="M17 17H6l3 3"/></svg></span>Swap</button>
    <button type="button" id="act-connect"><span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18"/></svg></span>Wallets</button>
  </div>
  <p class="msg" id="toast"></p>
  <div class="panel on" id="panel-home">
    <section>
      <div class="hrow"><h2>Wallets</h2><button type="button" id="act-add">+ Add</button></div>
      <div id="linked-list">
        <div class="row"><div class="av"><img src="/media/sol.png" alt=""></div><div class="meta"><b>Wallet 1</b><span class="mono" id="w1">Not linked</span></div><div class="bal"><span>funding</span></div></div>
      </div>
      <div class="row"><div class="av"><img src="/media/sol.png" alt=""></div><div class="meta"><b>Trader</b><span>Auto-trader</span></div><div class="bal"><b id="vault-sol">0.00</b><span>SOL</span></div></div>
    </section>
    <section>
      <div class="hrow"><h2>Tokens</h2></div>
      <div id="home-tokens">
      <div class="row"><div class="av"><img src="/media/sol.png" alt="SOL"></div><div class="meta"><b>Solana</b><span>SOL</span></div><div class="bal"><b id="tok-sol">0.00</b></div></div>
      <div class="row"><div class="av"><img src="/media/gbux.png" alt="GBUX"></div><div class="meta"><b>GBUX</b><span>Poker</span></div><div class="bal"><b id="tok-gbux">0</b></div></div>
      </div>
    </section>
  </div>
  <div class="panel" id="panel-coins">
    <section>
      <div class="hrow"><h2>Coins</h2><button type="button" id="btn-add-token">+ Token</button></div>
      <p class="hint">Search a ticker or paste a mint.</p>
      <div class="chips" id="coin-owners">
        <button type="button" class="chip on" data-owner="all">All</button>
        <button type="button" class="chip" data-owner="play">Play</button>
        <button type="button" class="chip" data-owner="linked">Linked</button>
        <button type="button" class="chip" data-owner="trader">Trader</button>
      </div>
      <div class="addbar">
        <input class="input" id="coin-q" placeholder="Search JUP, BONK, or paste mint" autocomplete="off" />
        <button type="button" id="btn-lookup">Add</button>
      </div>
      <div id="coin-suggest" class="suggest" hidden></div>
      <p class="msg" id="coin-msg"></p>
      <div id="coin-list"><p class="empty">Sign in to load SOL + GBUX, then add any Solana token.</p></div>
    </section>
  </div>
  <div class="panel" id="panel-nfts">
    <section>
      <div class="hrow"><h2>cNFTs</h2><button type="button" id="btn-nft-sync">Sync</button></div>
      <p class="hint" id="nft-empty">Heroes and islands from Foundry show here.</p>
      <p class="msg" id="nft-msg"></p>
      <a class="ghost btn cta" href="https://character.grudge-studio.com/?era=warlords" id="nft-foundry">Mint in Character Foundry</a>
      <div class="nftg" id="nft-grid"></div>
    </section>
  </div>
  <div class="panel" id="panel-dapps">
    <section>
      <div class="store-head">
        <div>
          <div class="today" id="store-today">Today</div>
          <h2>App Store</h2>
        </div>
      </div>
      <input class="search" id="dapp-q" placeholder="Search games, desk, studio" />
      <div class="chips" id="dapp-cats">
        <button type="button" class="chip on" data-cat="all">All</button>
        <button type="button" class="chip" data-cat="Play">Play</button>
        <button type="button" class="chip" data-cat="Desk">Desk</button>
        <button type="button" class="chip" data-cat="Studio">Studio</button>
      </div>
      <div id="dapp-feat"></div>
      <div class="hrow" id="must-head"><h2>Must play</h2></div>
      <div class="hscroll" id="dapp-must"></div>
      <div class="hrow"><h2>From Grudge Studio</h2></div>
      <div id="dapp-list"></div>
    </section>
  </div>
  <div class="panel" id="panel-set"><section>
    <div class="hrow"><h2>Account</h2></div>
    <div class="row">
      <div class="av"><img src="/media/grudge-id.png" alt=""></div>
      <div class="meta"><b id="set-name">Sign in</b><span class="mono" id="set-gid">—</span></div>
      <div class="bal"><button type="button" class="tiny" id="set-copy-gid">Copy ID</button></div>
    </div>
    <div class="hrow"><h2>Addresses</h2></div>
    <div class="row"><div class="meta"><b>Play <span class="pill">Primary</span></b><span class="mono" id="set-play">—</span></div><div class="bal"><button type="button" class="tiny" data-copy="play">Copy</button></div></div>
    <div class="row"><div class="meta"><b>Linked</b><span class="mono" id="set-w1">None</span></div><div class="bal"><button type="button" class="tiny" data-copy="w1">Copy</button></div></div>
    <div class="row"><div class="meta"><b>Trader</b><span class="mono" id="set-vault">Not enabled</span></div><div class="bal"><button type="button" class="tiny" data-copy="vault">Copy</button></div></div>
    <button class="ghost" type="button" id="set-refresh">Refresh</button>
    <button class="ghost" type="button" id="set-logout">Sign out</button>
  </section></div>
  <nav class="dock">
    <button class="on" type="button" data-dock="home">Home</button>
    <button type="button" data-dock="coins">Coins</button>
    <button type="button" data-dock="nfts">cNFTs</button>
    <button type="button" data-dock="dapps">Dapps</button>
    <button type="button" data-dock="set">Set</button>
  </nav>
  <div class="sheet" id="sheet-connect"><div class="pad"><div class="grab"></div>
    <h3>Connect a wallet</h3>
    <p>Phantom, Solflare, Backpack, or another Solana wallet. Links to this Grudge ID. Play stays the primary address.</p>
    <div id="wallet-picker"></div>
    <p class="msg" id="connect-msg"></p>
    <button class="ghost" type="button" data-close>Cancel</button>
  </div></div>
  <div class="sheet" id="sheet-recv"><div class="pad"><div class="grab"></div>
    <h3>Receive</h3>
    <p>Send SOL here for the auto-trader. Leave a little for fees.</p>
    <div class="addrbox" id="vault-addr">Sign in → Enable trader</div>
    <button class="primary" type="button" id="btn-enroll">Enable trader</button>
    <button class="ghost" type="button" id="btn-copy-vault">Copy address</button>
    <a class="ghost btn" id="btn-solscan" href="#" target="_blank" rel="noopener" style="display:block;text-align:center;text-decoration:none">Solscan</a>
    <p class="msg" id="recv-msg"></p>
    <button class="ghost" type="button" data-close>Close</button>
  </div></div>
  <div class="sheet" id="sheet-send"><div class="pad"><div class="grab"></div>
    <h3>Send</h3>
    <p>Send GBUX to Poker.</p>
    <label>Amount GBUX</label>
    <input class="input" id="send-amt" type="number" min="1" value="10" />
    <button class="primary" type="button" id="btn-play">Send to Poker play</button>
    <a class="ghost btn" href="${poker}/wallet" style="display:block;text-align:center;text-decoration:none;margin-top:8px">Open poker wallet</a>
    <p class="msg" id="send-msg"></p>
    <button class="ghost" type="button" data-close>Close</button>
  </div></div>
  <div class="sheet" id="sheet-token"><div class="pad"><div class="grab"></div>
    <h3>Add a token</h3>
    <p>Search a ticker or paste a mint.</p>
    <input class="input" id="token-q" placeholder="JUP, BONK, or mint address" autocomplete="off" />
    <button class="primary" type="button" id="btn-token-lookup">Search</button>
    <div id="token-suggest" class="suggest" hidden></div>
    <div id="token-preview"></div>
    <p class="msg" id="token-msg"></p>
    <button class="ghost" type="button" data-close>Cancel</button>
  </div></div>
</div></div>
<script>
window.GRUDA = {
  railway: ${JSON.stringify(railway)},
  idGw: ${JSON.stringify(idGw)},
  poker: ${JSON.stringify(poker)},
  trader: ${JSON.stringify(trader)},
  build: "2026-09-16-sso-v1",
  art: {
    sol: "/media/sol.png",
    gbux: "/media/gbux.png",
    id: "/media/grudge-id.png",
    play: "/media/crossmint.png",
    gbuxMint: "55TpSoMNxbfsNJ9U1dQoo9H3dRtDmjBZVMcKqvU2nray",
    wsol: "So11111111111111111111111111111111111111112"
  }
};
</script>
<script src="/wallet-app.js" defer></script>
</body>
</html>`;
}
