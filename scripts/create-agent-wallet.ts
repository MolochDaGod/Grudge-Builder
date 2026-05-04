#!/usr/bin/env tsx
/**
 * create-agent-wallet.ts — Provision a Crossmint custodial wallet for the
 * Grudge AI Agent treasury. This wallet holds escrowed cNFTs for players
 * who don't yet have a server-side wallet.
 *
 * Usage:
 *   npx tsx --env-file=.env scripts/create-agent-wallet.ts
 *
 * On success it prints the wallet address. Add it to your .env / Vercel env:
 *   AI_AGENT_WALLET=<printed-address>
 */

const AGENT_EMAIL = "ai-agent@grudgewarlords.com";

const CROSSMINT_API_KEY =
  process.env.CROSSMINT_SERVER_API_KEY ||
  process.env.CROSSMINT_SECRET_KEY ||
  process.env.CROSSMINT_API_KEY;

const CROSSMINT_BASE_URL =
  process.env.CROSSMINT_USE_STAGING === "true"
    ? "https://staging.crossmint.com"
    : "https://www.crossmint.com";

if (!CROSSMINT_API_KEY) {
  console.error(
    "❌ No Crossmint API key found. Set CROSSMINT_SERVER_API_KEY, CROSSMINT_SECRET_KEY, or CROSSMINT_API_KEY in .env"
  );
  process.exit(1);
}

async function main() {
  console.log("🔑 Using Crossmint API:", CROSSMINT_BASE_URL);
  console.log("📧 Agent email:", AGENT_EMAIL);

  // 1. Check if wallet already exists
  const linkedUser = `email:${AGENT_EMAIL}:solana-custodial-wallet`;
  const encodedUser = encodeURIComponent(linkedUser);

  console.log("\n🔍 Checking for existing wallet...");
  const getRes = await fetch(
    `${CROSSMINT_BASE_URL}/api/v1-alpha2/wallets/${encodedUser}`,
    { headers: { "X-API-KEY": CROSSMINT_API_KEY } }
  );

  if (getRes.ok) {
    const existing = await getRes.json();
    console.log("\n✅ Agent wallet already exists!");
    console.log(`   Address:  ${existing.address}`);
    console.log(`   ID:       ${existing.id}`);
    console.log(`   Chain:    ${existing.chain || "solana"}`);
    console.log(`\n📋 Add to .env and Vercel:`);
    console.log(`   AI_AGENT_WALLET=${existing.address}`);
    return;
  }

  if (getRes.status !== 404) {
    const errText = await getRes.text();
    console.error(`❌ Unexpected response checking wallet: ${getRes.status}`, errText);
    process.exit(1);
  }

  // 2. Create the wallet
  console.log("🏗️  Creating new custodial wallet...");
  const createRes = await fetch(
    `${CROSSMINT_BASE_URL}/api/v1-alpha2/wallets`,
    {
      method: "POST",
      headers: {
        "X-API-KEY": CROSSMINT_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "solana-custodial-wallet",
        linkedUser,
      }),
    }
  );

  if (!createRes.ok) {
    const errText = await createRes.text();
    console.error(`❌ Wallet creation failed: ${createRes.status}`, errText);
    process.exit(1);
  }

  const wallet = await createRes.json();

  console.log("\n✅ Agent treasury wallet created!");
  console.log(`   Address:  ${wallet.address}`);
  console.log(`   ID:       ${wallet.id}`);
  console.log(`   Chain:    ${wallet.chain || "solana"}`);
  console.log(`   Linked:   ${AGENT_EMAIL}`);
  console.log(`\n📋 Add to .env and Vercel:`);
  console.log(`   AI_AGENT_WALLET=${wallet.address}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
