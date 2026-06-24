/**
 * Discord slash-command interactions — scoped, read-only account lookups.
 * Only returns data for the Discord user who invoked the command.
 *
 * Env: DISCORD_PUBLIC_KEY, DISCORD_BOT_TOKEN (optional, for follow-ups)
 * Route: POST /api/discord/interactions
 */
import type { Express, Request, Response } from "express";
import { verifyKey } from "discord-interactions";
import { buildScopedProfileByDiscordId } from "./lib/scopedProfile";

const DISCORD_PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY || "";
const DISCORD_API = "https://discord.com/api/v10";

async function verifyDiscordSignature(req: Request): Promise<boolean> {
  if (!DISCORD_PUBLIC_KEY) return false;
  const signature = req.get("X-Signature-Ed25519") || "";
  const timestamp = req.get("X-Signature-Timestamp") || "";
  const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
  if (!rawBody || !signature || !timestamp) return false;
  return verifyKey(rawBody, signature, timestamp, DISCORD_PUBLIC_KEY);
}

function embedField(name: string, value: string, inline = true) {
  return { name, value: value || "—", inline };
}

function profileToEmbed(p: Awaited<ReturnType<typeof buildScopedProfileByDiscordId>>) {
  if (!p) {
    return {
      title: "No linked Grudge account",
      description:
        "Sign in at [grudge6.grudge-studio.com/game](https://grudge6.grudge-studio.com/game) with **Continue with Discord**, or link Discord from an existing Grudge ID session.",
      color: 0xf87171,
    };
  }

  return {
    title: `Grudge Account — ${p.displayName}`,
    color: 0x5865f2,
    fields: [
      embedField("Grudge ID", p.grudgeId),
      embedField("Username", p.username),
      embedField("Email", p.email || "not set"),
      embedField("Puter ID", p.puterId || "not linked"),
      embedField("Wallet", p.walletAddress || "none"),
      embedField("Server wallet", p.serverWalletAddress || "none"),
      embedField("GBUX", String(p.gbuxBalance)),
      embedField("Gold", String(p.gold)),
      embedField("Premium", String(p.premiumCurrency)),
      embedField("Characters", `${p.characters.count} (${p.characters.cnftCount} cNFT)`),
      embedField("Character names", p.characters.names.join(", ") || "none"),
      embedField("Account XP", String(p.accountXp)),
      embedField("Providers", p.providers.join(", ")),
    ],
    footer: { text: "Scoped view — only your linked account data" },
  };
}

async function handleCommand(name: string, discordUserId: string) {
  switch (name) {
    case "account":
    case "grudge": {
      const profile = await buildScopedProfileByDiscordId(discordUserId);
      return {
        type: 4,
        data: {
          embeds: [profileToEmbed(profile)],
          flags: 64, // ephemeral
        },
      };
    }
    case "wallet": {
      const profile = await buildScopedProfileByDiscordId(discordUserId);
      if (!profile) {
        return {
          type: 4,
          data: {
            content: "No linked Grudge account. Use `/account` after signing in on grudge-studio.com.",
            flags: 64,
          },
        };
      }
      return {
        type: 4,
        data: {
          embeds: [{
            title: "Wallet (scoped)",
            color: 0x6ee7b7,
            fields: [
              embedField("Wallet", profile.walletAddress || "none"),
              embedField("Server wallet", profile.serverWalletAddress || "none"),
              embedField("Type", profile.walletType || "none"),
              embedField("GBUX", String(profile.gbuxBalance)),
              embedField("Gold", String(profile.gold)),
            ],
          }],
          flags: 64,
        },
      };
    }
    case "characters": {
      const profile = await buildScopedProfileByDiscordId(discordUserId);
      if (!profile) {
        return {
          type: 4,
          data: { content: "No linked account.", flags: 64 },
        };
      }
      return {
        type: 4,
        data: {
          embeds: [{
            title: "Characters (scoped)",
            color: 0xd4a400,
            description: `${profile.characters.count} character(s), ${profile.characters.cnftCount} minted cNFT(s)`,
            fields: [
              embedField("Names", profile.characters.names.join(", ") || "none"),
              embedField("Grudge ID", profile.grudgeId),
            ],
          }],
          flags: 64,
        },
      };
    }
    default:
      return {
        type: 4,
        data: { content: "Unknown command.", flags: 64 },
      };
  }
}

/** Register slash commands with Discord (run once on boot if token set). */
export async function registerDiscordCommands(): Promise<void> {
  const token = process.env.DISCORD_BOT_TOKEN;
  const appId = process.env.DISCORD_APPLICATION_ID;
  if (!token || !appId) return;

  const commands = [
    { name: "account", description: "Your scoped Grudge ID account summary" },
    { name: "wallet", description: "Your wallet + GBUX balances (scoped)" },
    { name: "characters", description: "Your characters + cNFT count (scoped)" },
    { name: "grudge", description: "Alias for /account" },
  ];

  const res = await fetch(`${DISCORD_API}/applications/${appId}/commands`, {
    method: "PUT",
    headers: {
      Authorization: `Bot ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commands),
  });

  if (!res.ok) {
    console.warn("[Discord] Command registration failed:", await res.text());
  } else {
    console.log("[Discord] Slash commands registered");
  }
}

export function registerDiscordInteractionRoutes(app: Express): void {
  app.post("/api/discord/interactions", async (req: Request, res: Response) => {
    if (!(await verifyDiscordSignature(req))) {
      return res.status(401).json({ error: "Invalid signature" });
    }

    const body = req.body as {
      type: number;
      data?: { name?: string };
      member?: { user?: { id?: string } };
      user?: { id?: string };
    };

    if (body.type === 1) {
      return res.json({ type: 1 });
    }

    if (body.type === 2 && body.data?.name) {
      const discordUserId = body.member?.user?.id || body.user?.id;
      if (!discordUserId) {
        return res.json({ type: 4, data: { content: "Could not identify Discord user.", flags: 64 } });
      }
      const response = await handleCommand(body.data.name, discordUserId);
      return res.json(response);
    }

    return res.status(400).json({ error: "Unhandled interaction" });
  });

  console.log("[Discord] Interaction route: POST /api/discord/interactions");
}