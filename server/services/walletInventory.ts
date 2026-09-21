/**
 * Coins + cNFTs for wallet.grudge-studio.com.
 *
 * Coins: Helius DAS / RPC balances on the chosen owner (Crossmint play,
 * linked Wallet 1, never house aUp3). Watchlist is extra mints the user added.
 * cNFTs: Crossmint custodial play wallet first, then DAS compressed, then
 * character_nfts rows. Trader vault is SOL clips only — never listed here.
 */
import { sql } from "drizzle-orm";
import { db } from "../db";
import { listLinkedWallets } from "./walletAccess";
import { getWalletOnChainBalances } from "./solanaBalances";
import { crossmintWalletService } from "./crossmintWallet";

export const GBUX_MINT =
  process.env.GBUX_MINT || "55TpSoMNxbfsNJ9U1dQoo9H3dRtDmjBZVMcKqvU2nray";
export const WSOL_MINT = "So11111111111111111111111111111111111111112";
export const HOUSE_PUBKEY = "aUp3XZqAt27phQNEM7k5KiP6cL3ihyG7uEJuEADbEks";
const CROSSMINT_BASE =
  process.env.CROSSMINT_USE_STAGING === "true"
    ? "https://staging.crossmint.com"
    : "https://www.crossmint.com";
const CROSSMINT_KEY =
  process.env.CROSSMINT_SERVER_API_KEY ||
  process.env.CROSSMINT_SECRET_KEY ||
  process.env.CROSSMINT_API_KEY ||
  "";
const CHARACTER_COLLECTION =
  process.env.CROSSMINT_COLLECTION_ID || "5061318d-ff65-4893-ac4b-9b28efb18ace";

export type OwnerKind = "crossmint" | "linked" | "vault";

function rpcUrl(): string {
  if (process.env.SOLANA_RPC_URL) return process.env.SOLANA_RPC_URL;
  if (process.env.HELIUS_API_KEY) {
    return `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`;
  }
  return "https://api.mainnet-beta.solana.com";
}

async function rpcCall(method: string, params: unknown, opts?: { das?: boolean }): Promise<any> {
  const isDas = Boolean(opts?.das) || method.startsWith("getAsset") || method === "searchAssets";
  const urls = [rpcUrl()];
  if (!urls.includes("https://api.mainnet-beta.solana.com")) {
    urls.push("https://api.mainnet-beta.solana.com");
  }
  let last: Error | null = null;
  for (const url of urls) {
    if (isDas && url.includes("mainnet-beta.solana.com")) continue;
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: "gruda-wallet", method, params }),
      });
      const text = await r.text();
      let j: any;
      try {
        j = JSON.parse(text);
      } catch {
        throw new Error(text.slice(0, 180) || "RPC non-JSON");
      }
      if (j.error) throw new Error(j.error.message || "RPC error");
      return j.result;
    } catch (e) {
      last = e as Error;
    }
  }
  throw last || new Error("RPC failed");
}

async function das(method: string, params: unknown): Promise<any> {
  return rpcCall(method, params, { das: true });
}

function looksLikeMint(s: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(String(s || "").trim());
}

function tokenFromAsset(asset: any) {
  const mint =
    asset?.id ||
    asset?.mint ||
    asset?.token_info?.mint ||
    "";
  if (!mint || mint === HOUSE_PUBKEY) return null;
  const info = asset?.token_info || {};
  const meta = asset?.content?.metadata || {};
  const files = asset?.content?.files || [];
  const logo =
    asset?.content?.links?.image ||
    files[0]?.cdn_uri ||
    files[0]?.uri ||
    meta?.image ||
    "";
  const decimals = Number(info.decimals ?? 0);
  const raw = Number(info.balance ?? info.amount ?? 0);
  const uiAmount =
    typeof info.ui_amount === "number"
      ? info.ui_amount
      : decimals > 0
        ? raw / 10 ** decimals
        : raw;
  return {
    mint,
    symbol: String(info.symbol || meta.symbol || "").slice(0, 16) || mint.slice(0, 4),
    name: String(meta.name || info.symbol || "Token"),
    logo,
    decimals,
    amount: raw,
    uiAmount,
  };
}

function nftFromAsset(asset: any, ownerWallet: string, ownerKind: string) {
  const mint = asset?.id || asset?.compression?.asset_hash || "";
  const meta = asset?.content?.metadata || {};
  const files = asset?.content?.files || [];
  const image =
    asset?.content?.links?.image ||
    files[0]?.cdn_uri ||
    files[0]?.uri ||
    meta.image ||
    "";
  const compressed = Boolean(asset?.compression?.compressed);
  const collection =
    asset?.grouping?.find?.((g: any) => g.group_key === "collection")?.group_value ||
    null;
  const collectionName =
    meta.collection?.name ||
    meta.symbol ||
    "";
  const classified = classifyNft({
    name: meta.name,
    collection,
    collectionName,
    compressed,
  });
  return {
    id: mint,
    kind: compressed ? "cnft" : "nft",
    mint,
    name: String(meta.name || "NFT"),
    imageUrl: image,
    characterId: null as string | null,
    ownerKind,
    ownerWallet,
    collection,
    collectionName: collectionName || classified.label,
    compressed,
    source: "das",
    project: classified.project,
    access: classified.access,
  };
}

export function classifyNft(n: {
  name?: string | null;
  collection?: string | null;
  collectionName?: string | null;
  era?: string | null;
  source?: string | null;
  compressed?: boolean;
  kind?: string | null;
}) {
  const blob = [n.name, n.collectionName, n.collection, n.era, n.kind]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const era = String(n.era || "").toLowerCase();
  if (era === "nexus" || /nemesis|nexus card|season 0/.test(blob)) {
    return { project: "nemesis", label: "Nexus Nemesis", access: false };
  }
  if (era === "voxel" || /grudox|voxel explorer/.test(blob)) {
    return { project: "voxel", label: "Voxel", access: false };
  }
  if (era === "armada" || /\bmech\b|armada/.test(blob)) {
    return { project: "armada", label: "Armada", access: false };
  }
  if (/home island|\bisland\b|find land/.test(blob) || n.kind === "island") {
    return { project: "island", label: "Home island", access: false };
  }
  if (era === "warlords" || /warlord|grudge 6|grudge6/.test(blob)) {
    return { project: "warlords", label: "Warlords", access: false };
  }
  if (/grower/.test(blob)) {
    return { project: "growerz", label: "THC Growerz", access: true };
  }
  if (/bad seed/.test(blob)) {
    return { project: "badseeds", label: "Bad Seeds", access: true };
  }
  if (/kronic|thc labz|zalez|rugged kronic/.test(blob)) {
    return { project: "thc", label: "THC Labz", access: true };
  }
  if (n.source === "db") {
    return { project: "warlords", label: "Warlords", access: false };
  }
  return { project: "other", label: n.collectionName || "Other", access: false };
}

export async function resolveOwnerAddress(
  account: {
    id: string;
    walletAddress?: string | null;
    walletType?: string | null;
    grudgeId?: string | null;
    crossmintEmail?: string | null;
  },
  owner: OwnerKind,
  vaultPubkey?: string | null,
): Promise<{ address: string; kind: OwnerKind; label: string }> {
  if (owner === "vault") {
    const pk = String(vaultPubkey || "").trim();
    if (!pk || pk === HOUSE_PUBKEY) {
      return { address: "", kind: "vault", label: "Trader vault" };
    }
    return { address: pk, kind: "vault", label: "Trader vault" };
  }
  if (owner === "linked") {
    const linked = await listLinkedWallets(account.id);
    const primary = linked.find((w) => w.isPrimary) || linked[0];
    const addr = String(primary?.walletAddress || "").trim();
    return { address: addr, kind: "linked", label: primary?.label || "Wallet 1" };
  }
  const play = String(account.walletAddress || "").trim();
  if (account.walletType === "crossmint" && play && play !== HOUSE_PUBKEY) {
    return { address: play, kind: "crossmint", label: "Play · Crossmint" };
  }
  return { address: play, kind: "crossmint", label: "Play wallet" };
}

async function ensureWatchTable(): Promise<boolean> {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS account_token_watch (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
        account_id varchar NOT NULL,
        mint text NOT NULL,
        symbol text,
        name text,
        logo_url text,
        decimals integer,
        created_at bigint NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint,
        UNIQUE (account_id, mint)
      )
    `);
    return true;
  } catch (e) {
    console.warn("[walletInventory] watch table", (e as Error).message);
    return false;
  }
}

export async function listWatchMints(accountId: string): Promise<string[]> {
  try {
    const rows = (await db.execute(
      sql`SELECT mint FROM account_token_watch WHERE account_id = ${accountId}`,
    )) as any;
    const list = (rows?.rows || rows || []) as Array<{ mint: string }>;
    return list.map((r) => r.mint).filter(Boolean);
  } catch {
    return [];
  }
}

export async function addWatchMint(
  accountId: string,
  token: {
    mint: string;
    symbol?: string;
    name?: string;
    logo?: string;
    decimals?: number;
  },
): Promise<void> {
  if (!looksLikeMint(token.mint)) throw new Error("Invalid mint");
  if (token.mint === HOUSE_PUBKEY) throw new Error("House mint cannot be watched");
  await ensureWatchTable();
  await db.execute(sql`
    INSERT INTO account_token_watch (account_id, mint, symbol, name, logo_url, decimals)
    VALUES (
      ${accountId},
      ${token.mint},
      ${token.symbol || null},
      ${token.name || null},
      ${token.logo || null},
      ${token.decimals ?? null}
    )
    ON CONFLICT (account_id, mint) DO UPDATE SET
      symbol = COALESCE(EXCLUDED.symbol, account_token_watch.symbol),
      name = COALESCE(EXCLUDED.name, account_token_watch.name),
      logo_url = COALESCE(EXCLUDED.logo_url, account_token_watch.logo_url)
  `);
}

export async function removeWatchMint(accountId: string, mint: string): Promise<void> {
  await db.execute(
    sql`DELETE FROM account_token_watch WHERE account_id = ${accountId} AND mint = ${mint}`,
  );
}

export async function searchTokens(query: string): Promise<
  Array<{ mint: string; symbol: string; name: string; logo: string; decimals: number }>
> {
  const q = String(query || "").trim();
  if (!q) return [];
  const out: Array<{ mint: string; symbol: string; name: string; logo: string; decimals: number }> = [];
  if (looksLikeMint(q)) {
    const one = await lookupMint(q);
    if (one) out.push(one);
  }
  try {
    const url =
      "https://lite-api.jup.ag/tokens/v2/search?query=" + encodeURIComponent(q);
    const r = await fetch(url, { headers: { accept: "application/json" } });
    const rows = (await r.json()) as any[];
    for (const row of Array.isArray(rows) ? rows : []) {
      if (!row?.id || row.id === GBUX_MINT) continue;
      if (out.some((t) => t.mint === row.id)) continue;
      out.push({
        mint: String(row.id),
        symbol: String(row.symbol || ""),
        name: String(row.name || row.symbol || "Token"),
        logo: String(row.icon || row.logoURI || ""),
        decimals: Number(row.decimals ?? 0),
      });
      if (out.length >= 8) break;
    }
  } catch {
    /* ignore */
  }
  return out.filter((t) => t.mint !== GBUX_MINT);
}

export async function lookupMint(query: string): Promise<{
  mint: string;
  symbol: string;
  name: string;
  logo: string;
  decimals: number;
} | null> {
  const q = String(query || "").trim();
  if (!q) return null;

  if (looksLikeMint(q)) {
    try {
      const asset = await das("getAsset", { id: q });
      const tok = tokenFromAsset(asset);
      if (tok) {
        return {
          mint: tok.mint,
          symbol: tok.symbol,
          name: tok.name,
          logo: tok.logo,
          decimals: tok.decimals,
        };
      }
    } catch {
      /* Jupiter */
    }
  }

  try {
    const url =
      "https://lite-api.jup.ag/tokens/v2/search?query=" + encodeURIComponent(q);
    const r = await fetch(url, { headers: { accept: "application/json" } });
    const rows = (await r.json()) as any[];
    const first = Array.isArray(rows) ? rows[0] : null;
    if (first && first.id) {
      return {
        mint: String(first.id),
        symbol: String(first.symbol || ""),
        name: String(first.name || first.symbol || "Token"),
        logo: String(first.icon || first.logoURI || ""),
        decimals: Number(first.decimals ?? 0),
      };
    }
  } catch {
    /* ignore */
  }
  return null;
}

export async function listTokensForAccount(opts: {
  account: {
    id: string;
    walletAddress?: string | null;
    walletType?: string | null;
    grudgeId?: string | null;
    gbuxBalance?: number | string | null;
  };
  owner: OwnerKind;
  vaultPubkey?: string | null;
  extraMints?: string[];
}) {
  const { account, owner } = opts;
  if (owner === "vault") {
    return {
      owner: "vault",
      address: String(opts.vaultPubkey || ""),
      label: "Trader vault · engine key, not SIWS",
      note: "Vault coins come from the trader engine. cNFTs do not live here.",
      items: [] as any[],
      bagGbux: Number(account.gbuxBalance ?? 0),
    };
  }

  const resolved = await resolveOwnerAddress(account, owner, opts.vaultPubkey);
  const watch = await listWatchMints(account.id);
  const extra = [...watch, ...(opts.extraMints || [])].filter(looksLikeMint);
  const items: any[] = [];

  let sol = 0;
  let onchainGbux = 0;
  if (resolved.address && resolved.address !== HOUSE_PUBKEY) {
    try {
      const bal = await getWalletOnChainBalances(resolved.address);
      sol = Number(bal.sol || 0);
      onchainGbux = Number(bal.gbux || 0);
    } catch {
      /* keep 0 */
    }
    try {
      const page = await das("searchAssets", {
        ownerAddress: resolved.address,
        tokenType: "fungible",
        page: 1,
        limit: 50,
      });
      const assets = page?.items || page || [];
      for (const a of assets) {
        const tok = tokenFromAsset(a);
        if (!tok) continue;
        if (tok.mint === GBUX_MINT) {
          onchainGbux = tok.uiAmount;
          continue;
        }
        if (tok.mint === WSOL_MINT) continue;
        items.push({
          ...tok,
          owner: resolved.kind,
          ownerWallet: resolved.address,
          watched: extra.includes(tok.mint),
        });
      }
    } catch (e) {
      console.warn("[walletInventory] searchAssets", (e as Error).message);
      try {
        const parsed = await rpcCall("getTokenAccountsByOwner", [
          resolved.address,
          { programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" },
          { encoding: "jsonParsed" },
        ]);
        const accs = parsed?.value || [];
        for (const a of accs) {
          const info = a?.account?.data?.parsed?.info;
          if (!info?.mint) continue;
          const tokAmt = info.tokenAmount || {};
          const mint = String(info.mint);
          if (mint === GBUX_MINT) {
            onchainGbux = Number(tokAmt.uiAmount || 0);
            continue;
          }
          if (mint === WSOL_MINT) continue;
          items.push({
            mint,
            symbol: mint.slice(0, 4),
            name: "Token",
            logo: "",
            decimals: Number(tokAmt.decimals || 0),
            amount: Number(tokAmt.amount || 0),
            uiAmount: Number(tokAmt.uiAmount || 0),
            owner: resolved.kind,
            ownerWallet: resolved.address,
            watched: extra.includes(mint),
          });
        }
      } catch (e2) {
        console.warn("[walletInventory] token accounts", (e2 as Error).message);
      }
    }
  }

  for (const mint of extra) {
    if (items.some((t) => t.mint === mint) || mint === GBUX_MINT || mint === WSOL_MINT) continue;
    const meta = await lookupMint(mint).catch(() => null);
    items.push({
      mint,
      symbol: meta?.symbol || mint.slice(0, 4),
      name: meta?.name || "Token",
      logo: meta?.logo || "",
      decimals: meta?.decimals || 0,
      amount: 0,
      uiAmount: 0,
      owner: resolved.kind,
      ownerWallet: resolved.address,
      watched: true,
    });
  }

  items.sort((a, b) => Number(b.uiAmount || 0) - Number(a.uiAmount || 0));

  return {
    owner: resolved.kind,
    address: resolved.address,
    label: resolved.label,
    rpc: rpcUrl().includes("helius") ? "helius" : "solana",
    bagGbux: Number(account.gbuxBalance ?? 0),
    items: [
      {
        mint: "SOL",
        symbol: "SOL",
        name: "Solana",
        logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
        decimals: 9,
        uiAmount: sol,
        owner: resolved.kind,
        ownerWallet: resolved.address,
        native: true,
      },
      {
        mint: GBUX_MINT,
        symbol: "GBUX",
        name: "GBUX",
        logo: "https://poker.grudge-studio.com/media/gbux-coin.png",
        decimals: 6,
        uiAmount: onchainGbux,
        bag: Number(account.gbuxBalance ?? 0),
        owner: resolved.kind,
        ownerWallet: resolved.address,
        feeOnly: true,
        note: "Fleet bag / play · fee buy-and-forward, not a trader bag",
      },
      ...items,
    ],
  };
}

async function crossmintNfts(address: string, email?: string | null) {
  if (!CROSSMINT_KEY) return [] as any[];
  const locators = [
    address ? `solana:${address}` : "",
    email ? `email:${email}:solana-custodial-wallet` : "",
    email ? `email:${email}:solana` : "",
  ].filter(Boolean);
  const out: any[] = [];
  for (const loc of locators) {
    try {
      const url = `${CROSSMINT_BASE}/api/2022-06-09/wallets/${encodeURIComponent(loc)}/nfts?page=1&perPage=50`;
      const r = await fetch(url, { headers: { "X-API-KEY": CROSSMINT_KEY } });
      if (!r.ok) continue;
      const rows = (await r.json()) as any[];
      if (!Array.isArray(rows)) continue;
      for (const n of rows) {
        const mint = String(n.mintHash || n.tokenId || n.locator || n.contractAddress || "");
        const name = n.metadata?.name || "cNFT";
        const collectionName = n.metadata?.collection?.name || n.collectionId || "";
        const classified = classifyNft({ name, collection: n.collectionId, collectionName, source: "crossmint" });
        out.push({
          id: n.locator || mint,
          kind: "cnft",
          mint,
          name,
          imageUrl: n.metadata?.image || "",
          characterId: null,
          ownerKind: "crossmint",
          ownerWallet: address,
          collection: n.metadata?.collection?.id || n.collectionId || CHARACTER_COLLECTION,
          collectionName: collectionName || classified.label,
          compressed: true,
          source: "crossmint",
          locator: loc,
          project: classified.project,
          access: classified.access,
        });
      }
      if (out.length) break;
    } catch (e) {
      console.warn("[walletInventory] crossmint nfts", loc, (e as Error).message);
    }
  }
  return out;
}

async function dasNfts(address: string, ownerKind: string) {
  if (!address) return [] as any[];
  const types = ["compressedNft", "regularNft"] as const;
  const out: any[] = [];
  for (const tokenType of types) {
    for (let page = 1; page <= 3; page++) {
      try {
        const result = await das("searchAssets", {
          ownerAddress: address,
          tokenType,
          page,
          limit: 50,
        });
        const items = result?.items || [];
        for (const a of items) out.push(nftFromAsset(a, address, ownerKind));
        if (items.length < 50) break;
      } catch (e) {
        console.warn("[walletInventory] das nfts", tokenType, (e as Error).message);
        break;
      }
    }
  }
  return out;
}

async function dbCharacterNfts(accountId: string, playWallet: string) {
  try {
    const rows = (await db.execute(sql`
      SELECT
        n.id,
        n.character_id,
        n.mint_address,
        n.asset_id,
        n.image_uri,
        n.is_compressed,
        n.owner_wallet_address,
        n.crossmint_action_id,
        n.status,
        c.name AS character_name,
        c.avatar_url,
        c.game_era
      FROM character_nfts n
      LEFT JOIN characters c ON c.id = n.character_id
      WHERE n.account_id = ${accountId}
      ORDER BY n.created_at DESC
      LIMIT 80
    `)) as any;
    const list = (rows?.rows || rows || []) as any[];
    return list
      .filter((n) => n.mint_address || n.crossmint_action_id)
      .map((n) => {
        const classified = classifyNft({
          name: n.character_name,
          era: n.game_era,
          source: "db",
        });
        return {
        id: n.id,
        kind: n.is_compressed === false ? "nft" : "cnft",
        mint: n.mint_address || n.asset_id || n.crossmint_action_id,
        name: n.character_name || "Hero",
        imageUrl: n.image_uri || n.avatar_url || "",
        characterId: n.character_id,
        ownerKind: "crossmint",
        ownerWallet: n.owner_wallet_address || playWallet,
        compressed: n.is_compressed !== false,
        source: "db",
        status: n.status,
        era: n.game_era || "warlords",
        project: classified.project,
        collectionName: classified.label,
        access: classified.access,
      };
      });
  } catch (e) {
    console.warn("[walletInventory] character_nfts", (e as Error).message);
    return [];
  }
}

async function dbIslandNfts(accountId: string, playWallet: string) {
  try {
    const rows = (await db.execute(sql`
      SELECT
        n.id,
        n.island_id,
        n.mint_address,
        n.asset_id,
        n.image_uri,
        n.is_compressed,
        n.owner_wallet_address,
        n.crossmint_action_id,
        n.status
      FROM island_nfts n
      WHERE n.account_id = ${accountId}
      ORDER BY n.created_at DESC
      LIMIT 40
    `)) as any;
    const list = (rows?.rows || rows || []) as any[];
    return list
      .filter((n) => n.mint_address || n.crossmint_action_id)
      .map((n) => ({
        id: n.id,
        kind: "island",
        mint: n.mint_address || n.asset_id || n.crossmint_action_id,
        name: "Home island",
        imageUrl: n.image_uri || "",
        characterId: null,
        ownerKind: "crossmint",
        ownerWallet: n.owner_wallet_address || playWallet,
        compressed: n.is_compressed !== false,
        source: "db",
        status: n.status,
        project: "island",
        collectionName: "Home island",
        access: false,
      }));
  } catch (e) {
    console.warn("[walletInventory] island_nfts", (e as Error).message);
    return [];
  }
}

export async function listNftsForAccount(opts: {
  account: {
    id: string;
    walletAddress?: string | null;
    walletType?: string | null;
    grudgeId?: string | null;
    crossmintEmail?: string | null;
  };
}) {
  const { account } = opts;
  let play = String(account.walletAddress || "").trim();
  const email =
    account.crossmintEmail ||
    (account.grudgeId
      ? crossmintWalletService.stableEmailForGrudgeId(account.grudgeId)
      : null);

  if ((!play || play === HOUSE_PUBKEY) && email) {
    try {
      const w = await crossmintWalletService.getWalletByEmail(email);
      if (w?.address && w.address !== HOUSE_PUBKEY) play = w.address;
    } catch (e) {
      console.warn("[walletInventory] crossmint wallet lookup", (e as Error).message);
    }
  }

  const linked = await listLinkedWallets(account.id).catch(() => []);
  const linkedAddrs = [...new Set(
    linked
      .map((w) => String(w.walletAddress || "").trim())
      .filter((a) => a && a !== HOUSE_PUBKEY && a !== play),
  )];

  const [cm, dasPlay, dbChars, dbIslands, ...dasLinked] = await Promise.all([
    crossmintNfts(play, email),
    dasNfts(play, "crossmint"),
    dbCharacterNfts(account.id, play),
    dbIslandNfts(account.id, play),
    ...linkedAddrs.map((a) => dasNfts(a, "linked")),
  ]);

  const seen = new Set<string>();
  const items: any[] = [];
  for (const n of [...cm, ...dasPlay, ...dasLinked.flat(), ...dbChars, ...dbIslands]) {
    const key = String(n.mint || n.id);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    if (!n.project) {
      const c = classifyNft(n);
      n.project = c.project;
      n.collectionName = n.collectionName || c.label;
      n.access = c.access;
    }
    items.push(n);
  }

  const projects = [...new Set(items.map((n) => n.project).filter(Boolean))];

  return {
    accountId: account.id,
    grudgeId: account.grudgeId,
    crossmint: play,
    ownerKind: "crossmint",
    linked: linkedAddrs,
    rpc: rpcUrl().includes("helius") ? "helius" : "solana",
    projects,
    items,
  };
}

export const DAPPS_CATALOG = [
  { id: "trader", name: "Auto-trader", tagline: "SOL desk · rotating capital", category: "Desk", featured: true, row: "hero", href: "https://trader.grudge-studio.com", img: "https://trader.grudge-studio.com/art/fabledgrudge.jpeg", developer: "Grudge Studio", rating: "4.9", age: "18+", blurb: "Fund the vault from Wallet 1. Engine key, not SIWS." },
  { id: "poker", name: "BUDB Poker", tagline: "Holdem · slots · blackjack", category: "Play", row: "must", href: "https://poker.grudge-studio.com/lobby", img: "https://poker.grudge-studio.com/media/og-image.jpg", developer: "Grudge Studio", rating: "4.8", age: "18+", blurb: "Sit with bag GBUX from this hub." },
  { id: "poker-wallet", name: "Poker wallet", tagline: "BUDB play · fund · sit", category: "Play", row: "must", href: "https://poker.grudge-studio.com/wallet", img: "https://poker.grudge-studio.com/media/felt-budb-green.jpg", developer: "Grudge Studio", rating: "4.7", age: "18+", blurb: "Move GBUX onto the felt." },
  { id: "warlords", name: "Warlords", tagline: "Home island · play", category: "Play", row: "must", href: "https://client.grudge-studio.com/home", img: "https://client.grudge-studio.com/opengraph.jpg", developer: "Grudge Studio", rating: "4.8", age: "13+", blurb: "Hero cNFTs mint to your Crossmint play wallet." },
  { id: "grudox", name: "GRUDOX", tagline: "Arcade cabinets", category: "Play", row: "must", href: "https://grudox.grudge-studio.com", img: "https://grudox.grudge-studio.com/opengraph.jpg", developer: "Grudge Studio", rating: "4.6", age: "13+", blurb: "Cabinets, same Grudge ID." },
  { id: "mine", name: "Mine-Loader", tagline: "Voxel realms", category: "Play", row: "must", href: "https://mineloader.grudge-studio.com", img: "https://mineloader.grudge-studio.com/opengraph.jpg", developer: "Grudge Studio", rating: "4.5", age: "9+", blurb: "Voxel worlds on your ID." },
  { id: "foundry", name: "Character Foundry", tagline: "Create · 4 slots", category: "Studio", row: "studio", href: "https://character.grudge-studio.com/?era=warlords", img: "https://character.grudge-studio.com/opengraph.jpg", developer: "Grudge Studio", rating: "4.7", age: "13+", blurb: "Mint lands on Crossmint play — shows in cNFTs." },
  { id: "forge", name: "Forge", tagline: "Map / scene editor", category: "Studio", row: "studio", href: "https://forge.grudge-studio.com", img: "https://forge.grudge-studio.com/opengraph.jpg", developer: "Grudge Studio", rating: "4.4", age: "13+", blurb: "Build scenes for Warlords." },
  { id: "open", name: "Grudge Open", tagline: "Danger · library", category: "Studio", row: "studio", href: "https://open.grudge-studio.com", img: "https://open.grudge-studio.com/opengraph.jpg", developer: "Grudge Studio", rating: "4.3", age: "18+", blurb: "Research library, same session." },
  { id: "studio", name: "Studio portal", tagline: "grudge-studio.com", category: "Studio", row: "studio", href: "https://grudge-studio.com", img: "https://grudge-studio.com/opengraph.jpg", developer: "Grudge Studio", rating: "4.6", age: "13+", blurb: "Home of the fleet." },
];

export function dappsPayload() {
  return {
    store: "Grudge Apps",
    copy: "Opens with your Grudge ID session. Not a wallet connect.",
    items: DAPPS_CATALOG,
  };
}
