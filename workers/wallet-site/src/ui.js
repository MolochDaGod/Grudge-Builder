/** Production wallet.grudge-studio.com UI — one Wallet Standard sheet, unique IDs. */
export function htmlPage(env) {
  const railway = env.RAILWAY_API_ORIGIN || "https://grudge-api-production-0d46.up.railway.app";
  const idGw = env.ID_GATEWAY_ORIGIN || "https://id.grudge-studio.com";
  const poker = env.POKER_ORIGIN || "https://poker.grudge-studio.com";
  const trader = env.TRADER_ORIGIN || "https://trader.grudge-studio.com";
  const logo = idGw + "/grudge-id-logo.png";
  const login =
    idGw +
    "/login?redirect_uri=" +
    encodeURIComponent("https://wallet.grudge-studio.com/auth/callback") +
    "&return=" +
    encodeURIComponent("https://wallet.grudge-studio.com/auth/callback") +
    "&app=wallet&origin=" +
    encodeURIComponent("https://wallet.grudge-studio.com");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="gruda-build" content="2026-09-16-connect-v3" />
<title>Gruda Wallet</title>
<link rel="icon" href="${logo}" />
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
.ident img{width:28px;height:28px;border-radius:50%;flex-shrink:0}
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
.acts .ic{display:block;font-size:16px;margin-bottom:6px;color:var(--gold)}
section{padding:8px 16px 0}
.hrow{display:flex;justify-content:space-between;align-items:baseline;margin:12px 0 8px}
.hrow h2{font-size:13px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--muted)}
.hrow button{background:none;border:0;color:var(--gold);font-size:12px;font-weight:600}
.row{display:flex;align-items:center;gap:12px;padding:12px;background:var(--card);border:1px solid var(--line);border-radius:16px;margin-bottom:8px}
.av{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;flex-shrink:0;background:#1b1528;color:var(--gold);font-size:13px;font-weight:700}
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
.sheet .pad{width:100%;background:#14141c;border-top:1px solid rgba(224,195,106,.25);border-radius:22px 22px 0 0;padding:16px 16px calc(20px + var(--safe))}
.grab{width:36px;height:4px;border-radius:99px;background:#333;margin:0 auto 14px}
.sheet h3{font-size:16px;margin-bottom:6px}
.sheet p,.msg{font-size:12px;color:var(--muted);line-height:1.45;margin-bottom:10px}
.msg.ok{color:var(--ok)}.msg.err{color:var(--err)}
.prov{display:flex;width:100%;align-items:center;gap:12px;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:12px;color:var(--text);margin-bottom:8px;font-size:14px;font-weight:600;text-align:left}
.addrbox{font-family:"IBM Plex Mono",monospace;font-size:12px;word-break:break-all;background:#000;border-radius:12px;padding:12px;margin:8px 0 12px}
.primary{width:100%;border:0;border-radius:14px;padding:12px;background:linear-gradient(180deg,#e8d07a,#b8922a);color:#1a1405;font-weight:700}
.ghost{width:100%;margin-top:8px;border-radius:14px;padding:12px;background:transparent;color:var(--gold2);border:1px solid var(--line);font-weight:600}
.input{width:100%;background:#0a0a12;border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:10px 12px;color:var(--text);font:inherit;margin:6px 0}
.dapp{display:block;padding:12px;border-radius:14px;background:var(--card);border:1px solid var(--line);color:var(--gold2);text-decoration:none;margin-bottom:8px;font-size:14px;font-weight:600}
</style>
</head>
<body>
<div class="stage"><div class="app">
  <header>
    <div class="ident">
      <img src="${logo}" alt="" width="28" height="28" />
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
    <div class="sub">Vault <span id="tr-sol">0.00</span> · bag GBUX <span id="gbux">0</span> · play <span id="play">0</span></div>
  </div>
  <div class="acts">
    <button type="button" id="act-recv"><span class="ic">↓</span>Receive</button>
    <button type="button" id="act-send"><span class="ic">↑</span>Send</button>
    <button type="button" id="act-swap"><span class="ic">⇄</span>Swap</button>
    <button type="button" id="act-connect"><span class="ic">◎</span>Wallets</button>
  </div>
  <p class="msg" id="toast"></p>
  <div class="panel on" id="panel-home">
    <section>
      <div class="hrow"><h2>Wallets</h2><button type="button" id="act-add">+ Add</button></div>
      <div id="linked-list">
        <div class="row"><div class="av">1</div><div class="meta"><b>Wallet 1</b><span class="mono" id="w1">Not linked</span></div><div class="bal"><span>funding</span></div></div>
      </div>
      <div class="row"><div class="av">T</div><div class="meta"><b>Trader vault</b><span>Engine key · not a browser wallet</span></div><div class="bal"><b id="vault-sol">0.00</b><span>SOL</span></div></div>
    </section>
    <section>
      <div class="hrow"><h2>Tokens</h2></div>
      <div class="row"><div class="av">◎</div><div class="meta"><b>Solana</b><span>SOL</span></div><div class="bal"><b id="tok-sol">0.00</b></div></div>
      <div class="row"><div class="av">G</div><div class="meta"><b>GBUX</b><span>Fleet bag · fee / play, not traded</span></div><div class="bal"><b id="tok-gbux">0</b></div></div>
    </section>
  </div>
  <div class="panel" id="panel-coins"><section><div class="hrow"><h2>Coins</h2></div><div id="coin-list"></div></section></div>
  <div class="panel" id="panel-nfts"><section><div class="hrow"><h2>cNFTs</h2></div><p class="msg" id="nft-empty">Sign in to sync cNFTs from your Crossmint wallet.</p><div id="nft-grid"></div></section></div>
  <div class="panel" id="panel-dapps"><section><div class="hrow"><h2>Apps</h2></div>
    <a class="dapp" href="${trader}">Auto-trader</a>
    <a class="dapp" href="${poker}/wallet">Poker wallet</a>
    <a class="dapp" href="https://grudgewarlords.com">Warlords</a>
  </section></div>
  <div class="panel" id="panel-set"><section><div class="hrow"><h2>Settings</h2></div>
    <p class="msg">Grudge ID is login. One Connect sheet links Phantom / Solflare / Backpack / any Wallet Standard SOL wallet into linked_wallets. The trader vault is never SIWS.</p>
    <button class="ghost" type="button" id="set-refresh">Refresh balances</button>
  </section></div>
  <nav class="dock">
    <button class="on" type="button" data-dock="home">Home</button>
    <button type="button" data-dock="coins">Coins</button>
    <button type="button" data-dock="nfts">cNFTs</button>
    <button type="button" data-dock="dapps">Apps</button>
    <button type="button" data-dock="set">Set</button>
  </nav>
  <div class="sheet" id="sheet-connect"><div class="pad"><div class="grab"></div>
    <h3>Connect a SOL wallet</h3>
    <p>One system: Wallet Standard, then Phantom / Solflare / Backpack. Signs SIWS and writes Wallet 1 / 2 on this Grudge ID. Does not log you in, replace Crossmint, or touch the trader vault. House aUp3 is never listed.</p>
    <div id="wallet-picker"></div>
    <p class="msg" id="connect-msg"></p>
    <button class="ghost" type="button" data-close>Cancel</button>
  </div></div>
  <div class="sheet" id="sheet-recv"><div class="pad"><div class="grab"></div>
    <h3>Receive to trader vault</h3>
    <p>Send SOL from Wallet 1 to this address. Keep 0.02 for fees. Buys need more than 0.03. Not house aUp3.</p>
    <div class="addrbox" id="vault-addr">Sign in → Enable trader</div>
    <button class="primary" type="button" id="btn-enroll">Enable trader</button>
    <button class="ghost" type="button" id="btn-copy-vault">Copy address</button>
    <a class="ghost btn" id="btn-solscan" href="#" target="_blank" rel="noopener" style="display:block;text-align:center;text-decoration:none">Solscan</a>
    <p class="msg" id="recv-msg"></p>
    <button class="ghost" type="button" data-close>Close</button>
  </div></div>
  <div class="sheet" id="sheet-send"><div class="pad"><div class="grab"></div>
    <h3>Send</h3>
    <p>Play GBUX stays on the fleet bag / poker ledger. On-chain GBUX is fee-only and is forwarded to the Grudge dev wallet.</p>
    <label>Amount GBUX</label>
    <input class="input" id="send-amt" type="number" min="1" value="10" />
    <button class="primary" type="button" id="btn-play">Send to Poker play</button>
    <a class="ghost btn" href="${poker}/wallet" style="display:block;text-align:center;text-decoration:none;margin-top:8px">Open poker wallet</a>
    <p class="msg" id="send-msg"></p>
    <button class="ghost" type="button" data-close>Close</button>
  </div></div>
</div></div>
<script>
window.GRUDA = {
  railway: ${JSON.stringify(railway)},
  idGw: ${JSON.stringify(idGw)},
  poker: ${JSON.stringify(poker)},
  trader: ${JSON.stringify(trader)},
  build: "2026-09-16-connect-v3"
};
</script>
<script src="/wallet-app.js" defer></script>
</body>
</html>`;
}
