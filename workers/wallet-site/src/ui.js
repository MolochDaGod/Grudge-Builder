/** Production wallet.grudge-studio.com — unique IDs, valid page, buttons in /wallet-app.js */
export function htmlPage(env) {
  const railway = env.RAILWAY_API_ORIGIN || "https://grudge-api-production-0d46.up.railway.app";
  const idGw = env.ID_GATEWAY_ORIGIN || "https://id.grudge-studio.com";
  const poker = env.POKER_ORIGIN || "https://poker.grudge-studio.com";
  const trader = env.TRADER_ORIGIN || "https://trader.grudge-studio.com";
  const logo = idGw + "/grudge-id-logo.png";
  const login = idGw + "/login?redirect_uri=" + encodeURIComponent("https://wallet.grudge-studio.com/") + "&app=wallet&origin=" + encodeURIComponent("https://wallet.grudge-studio.com");
  return `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"/>
<title>Gruda Wallet</title>
<link rel="icon" href="${logo}"/>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Sora:wght@400;500;600;700&display=swap" rel="stylesheet"/>
<style>
:root{--bg:#07070b;--card:#12121a;--line:rgba(255,255,255,.08);--gold:#e0c36a;--gold2:#f3e0a8;--muted:#8b8b96;--text:#f5f5f7;--ok:#3ddeb0;--err:#ff6b7a;--safe:env(safe-area-inset-bottom,0px)}
*{box-sizing:border-box;margin:0;padding:0}html,body{min-height:100%;background:#050508;color:var(--text);font-family:Sora,system-ui,sans-serif}
button,a.btn{font-family:inherit;cursor:pointer}.mono{font-family:IBM Plex Mono,ui-monospace,monospace}
.stage{min-height:100vh;display:flex;justify-content:center;background:#050508}
.app{width:100%;max-width:420px;min-height:100vh;background:linear-gradient(180deg,#12101c 0%,var(--bg) 28%);position:relative;padding-bottom:calc(76px + var(--safe))}
header{display:flex;align-items:center;gap:10px;padding:14px 16px 8px}
.ident{flex:1;min-width:0;display:flex;align-items:center;gap:10px;border:1px solid var(--line);border-radius:999px;padding:5px 12px 5px 5px}
.ident img{width:28px;height:28px;border-radius:50%}.ident .who{min-width:0}
.ident b,.ident span{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px}.ident span{font-size:11px;color:var(--muted)}
.ico{width:36px;height:36px;border-radius:50%;border:1px solid var(--line);background:transparent;color:var(--gold2)}
.hero{text-align:center;padding:18px 20px 8px}.net{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--gold)}
.fig{font-size:40px;font-weight:700}.fig small{font-size:16px;color:var(--muted)}.sub{margin-top:8px;font-size:12px;color:var(--muted)}
.acts{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:16px}
.acts button{border:1px solid var(--line);background:var(--card);color:var(--gold2);border-radius:16px;padding:12px 4px;font-size:11px}
section{padding:8px 16px}.row{display:flex;gap:12px;padding:12px;background:var(--card);border:1px solid var(--line);border-radius:16px;margin:8px 0}
.av{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;background:#1b1528;color:var(--gold)}
.meta{flex:1;min-width:0}.meta span{display:block;font-size:11px;color:var(--muted);overflow:hidden;text-overflow:ellipsis}
.dock{position:absolute;left:0;right:0;bottom:0;display:flex;padding:8px;background:#0a0a10;border-top:1px solid var(--line)}
.dock button{flex:1;background:none;border:0;color:var(--muted);font-size:10px;text-transform:uppercase}.dock button.on{color:var(--gold2)}
.panel{display:none}.panel.on{display:block}.sheet{display:none;position:absolute;inset:0;z-index:8;background:rgba(0,0,0,.55);align-items:flex-end}.sheet.on{display:flex}
.sheet .pad{width:100%;background:#14141c;border-radius:22px 22px 0 0;padding:16px}
.prov,.ghost,.primary{width:100%;border-radius:14px;padding:12px;margin:6px 0;font-weight:600}
.prov{background:var(--card);border:1px solid var(--line);color:var(--text);text-align:left}
.primary{border:0;background:linear-gradient(180deg,#e8d07a,#b8922a);color:#1a1405}
.ghost{background:transparent;color:var(--gold2);border:1px solid var(--line);text-decoration:none;display:block;text-align:center}
.addrbox{font-family:IBM Plex Mono,monospace;font-size:12px;word-break:break-all;background:#000;border-radius:12px;padding:12px}
.input{width:100%;background:#0a0a12;border:1px solid var(--line);border-radius:10px;padding:10px;color:var(--text)}
.msg{font-size:12px;color:var(--muted)}.msg.ok{color:var(--ok)}.msg.err{color:var(--err)}
.dapp{display:block;padding:12px;border-radius:14px;background:var(--card);border:1px solid var(--line);color:var(--gold2);text-decoration:none;margin:8px 0}
.hrow{display:flex;justify-content:space-between;color:var(--muted);font-size:12px;text-transform:uppercase}
.hrow button{background:none;border:0;color:var(--gold)}
</style></head><body><div class="stage"><div class="app">
<header><div class="ident"><img src="${logo}" width="28" height="28" alt=""/><div class="who"><b id="name">Sign in</b><span class="mono" id="gid">Grudge ID</span></div></div>
<a class="ico" id="btn-login" href="${login}">ID</a>
<button class="ico" type="button" id="btn-logout" hidden>x</button></header>
<div class="hero"><div class="net">Gruda · Solana mainnet</div>
<div class="fig"><span id="fig-sol">0.00</span><small>SOL</small></div>
<div class="sub">Vault <span id="tr-sol">0.00</span> · GBUX <span id="gbux">0</span></div></div>
<div class="acts">
<button type="button" id="act-recv">Receive</button>
<button type="button" id="act-send">Send</button>
<button type="button" id="act-swap">Swap</button>
<button type="button" id="act-connect">Wallets</button></div>
<p class="msg" id="toast"></p>
<div class="panel on" id="panel-home">
<section><div class="hrow"><h2>Wallets</h2><button type="button" id="act-add">+ Add</button></div>
<div class="row"><div class="av">1</div><div class="meta"><b>Wallet 1</b><span class="mono" id="w1">Not linked</span></div></div>
<div class="row"><div class="av">T</div><div class="meta"><b>Trader vault</b></div><div id="vault-sol">0.00</div></div>
<div class="row"><div class="av">S</div><div class="meta"><b>SOL</b></div><div id="tok-sol">0.00</div></div>
<div class="row"><div class="av">G</div><div class="meta"><b>GBUX</b></div><div id="tok-gbux">0</div></div></section></div>
<div class="panel" id="panel-coins"><section><div class="hrow"><h2>Coins</h2></div><div id="coin-list"></div></section></div>
<div class="panel" id="panel-nfts"><section><div class="hrow"><h2>cNFTs</h2></div><p class="msg" id="nft-empty">Sign in to sync Crossmint cNFTs.</p><div id="nft-grid"></div></section></div>
<div class="panel" id="panel-dapps"><section><div class="hrow"><h2>Apps</h2></div>
<a class="dapp" href="${trader}">Auto-trader</a><a class="dapp" href="${poker}/wallet">Poker</a><a class="dapp" href="https://grudgewarlords.com">Warlords</a></section></div>
<div class="panel" id="panel-set"><section><div class="hrow"><h2>Set</h2></div><button class="ghost" type="button" id="set-refresh">Refresh</button></section></div>
<nav class="dock">
<button class="on" type="button" data-dock="home">Home</button>
<button type="button" data-dock="coins">Coins</button>
<button type="button" data-dock="nfts">cNFTs</button>
<button type="button" data-dock="dapps">Apps</button>
<button type="button" data-dock="set">Set</button></nav>
<div class="sheet" id="sheet-connect"><div class="pad"><h3>Connect SOL wallet</h3>
<button class="prov" type="button" data-sol="phantom">Phantom</button>
<button class="prov" type="button" data-sol="solflare">Solflare</button>
<button class="prov" type="button" data-sol="backpack">Backpack</button>
<p class="msg" id="connect-msg"></p><button class="ghost" type="button" data-close>Cancel</button></div></div>
<div class="sheet" id="sheet-recv"><div class="pad"><h3>Receive to vault</h3>
<div class="addrbox" id="vault-addr">Sign in then Enable</div>
<button class="primary" type="button" id="btn-enroll">Enable trader</button>
<button class="ghost" type="button" id="btn-copy-vault">Copy address</button>
<a class="ghost" id="btn-solscan" href="#" target="_blank" rel="noopener">Solscan</a>
<p class="msg" id="recv-msg"></p><button class="ghost" type="button" data-close>Close</button></div></div>
<div class="sheet" id="sheet-send"><div class="pad"><h3>Send GBUX to play</h3>
<input class="input" id="send-amt" type="number" min="1" value="10"/>
<button class="primary" type="button" id="btn-play">Send to Poker play</button>
<a class="ghost" href="${poker}/wallet">Open poker wallet</a>
<p class="msg" id="send-msg"></p><button class="ghost" type="button" data-close>Close</button></div></div>
</div></div>
<script>window.GRUDA={railway:${JSON.stringify(railway)},idGw:${JSON.stringify(idGw)},poker:${JSON.stringify(poker)},trader:${JSON.stringify(trader)}};</script>
<script src="/wallet-app.js" defer></script></body></html>`;
}
