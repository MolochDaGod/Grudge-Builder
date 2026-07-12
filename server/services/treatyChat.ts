/**
 * Treaty Chat — friends, 1:1 DMs, and groups between Grudge accounts.
 * Account-scoped (Grudge ID), never character-scoped.
 */
import { and, desc, eq, or, sql, isNull, ne, inArray, gt } from "drizzle-orm";
import { db } from "../db";
import {
  accounts,
  treatyDmThreads,
  treatyFriends,
  treatyGroupMembers,
  treatyGroupMessages,
  treatyGroups,
  treatyMessages,
  treatyServerChannels,
  treatyServerMessages,
  users,
} from "@shared/schema";

function pairAccounts(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export async function resolveAccountByGrudgeIdOrName(
  query: string,
): Promise<{ accountId: string; grudgeId: string | null; displayName: string | null } | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  if (trimmed.toUpperCase().startsWith("GRUDGE_")) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.grudgeId, trimmed.toUpperCase()))
      .limit(1);
    if (!user) return null;
    const [account] = await db.select().from(accounts).where(eq(accounts.userId, user.id)).limit(1);
    if (!account) return null;
    return { accountId: account.id, grudgeId: user.grudgeId, displayName: account.displayName };
  }

  const [byName] = await db
    .select({ account: accounts, user: users })
    .from(accounts)
    .innerJoin(users, eq(accounts.userId, users.id))
    .where(
      or(
        sql`lower(${accounts.displayName}) = ${trimmed.toLowerCase()}`,
        eq(users.username, trimmed),
        sql`lower(${users.username}) = ${trimmed.toLowerCase()}`,
      ),
    )
    .limit(1);

  if (byName) {
    return {
      accountId: byName.account.id,
      grudgeId: byName.user.grudgeId,
      displayName: byName.account.displayName,
    };
  }
  return null;
}

async function friendProfile(accountId: string) {
  const [row] = await db
    .select({
      accountId: accounts.id,
      grudgeId: accounts.grudgeId,
      displayName: accounts.displayName,
      avatarUrl: accounts.avatarUrl,
    })
    .from(accounts)
    .where(eq(accounts.id, accountId))
    .limit(1);
  return row || null;
}

export async function listTreatySocial(accountId: string) {
  const rows = await db
    .select()
    .from(treatyFriends)
    .where(
      or(eq(treatyFriends.accountId, accountId), eq(treatyFriends.friendAccountId, accountId)),
    )
    .orderBy(desc(treatyFriends.createdAt));

  const friends: Array<{
    id: string;
    status: string;
    accountId: string;
    grudgeId: string | null;
    displayName: string | null;
    avatarUrl: string | null;
    isIncoming: boolean;
  }> = [];

  for (const row of rows) {
    const otherId = row.accountId === accountId ? row.friendAccountId : row.accountId;
    const profile = await friendProfile(otherId);
    friends.push({
      id: row.id,
      status: row.status,
      accountId: otherId,
      grudgeId: profile?.grudgeId ?? null,
      displayName: profile?.displayName ?? null,
      avatarUrl: profile?.avatarUrl ?? null,
      isIncoming: row.status === "pending" && row.initiatedBy !== accountId,
    });
  }

  return {
    friends: friends.filter((f) => f.status === "accepted"),
    pendingIncoming: friends.filter((f) => f.status === "pending" && f.isIncoming),
    pendingOutgoing: friends.filter((f) => f.status === "pending" && !f.isIncoming),
  };
}

export async function sendFriendRequest(fromAccountId: string, targetQuery: string) {
  const target = await resolveAccountByGrudgeIdOrName(targetQuery);
  if (!target) throw new Error("Player not found");
  if (target.accountId === fromAccountId) throw new Error("Cannot add yourself");

  const [existing] = await db
    .select()
    .from(treatyFriends)
    .where(
      or(
        and(eq(treatyFriends.accountId, fromAccountId), eq(treatyFriends.friendAccountId, target.accountId)),
        and(eq(treatyFriends.accountId, target.accountId), eq(treatyFriends.friendAccountId, fromAccountId)),
      ),
    )
    .limit(1);

  if (existing) {
    if (existing.status === "accepted") throw new Error("Already friends");
    if (existing.status === "pending") throw new Error("Friend request already pending");
    if (existing.status === "blocked") throw new Error("Unable to send request");
  }

  const [created] = await db
    .insert(treatyFriends)
    .values({
      accountId: fromAccountId,
      friendAccountId: target.accountId,
      status: "pending",
      initiatedBy: fromAccountId,
    })
    .returning();

  return { request: created, target };
}

export async function respondFriendRequest(
  accountId: string,
  requestId: string,
  accept: boolean,
) {
  const [row] = await db.select().from(treatyFriends).where(eq(treatyFriends.id, requestId)).limit(1);
  if (!row) throw new Error("Request not found");
  if (row.friendAccountId !== accountId && row.accountId !== accountId) {
    throw new Error("Not your request");
  }
  if (row.status !== "pending") throw new Error("Request already handled");
  if (accept && row.friendAccountId !== accountId) {
    throw new Error("Only the recipient can accept");
  }

  const status = accept ? "accepted" : "declined";
  const [updated] = await db
    .update(treatyFriends)
    .set({ status, respondedAt: Date.now() })
    .where(eq(treatyFriends.id, requestId))
    .returning();

  return updated;
}

export async function getOrCreateDmThread(accountId: string, friendAccountId: string) {
  const [low, high] = pairAccounts(accountId, friendAccountId);
  let [thread] = await db
    .select()
    .from(treatyDmThreads)
    .where(and(eq(treatyDmThreads.accountLow, low), eq(treatyDmThreads.accountHigh, high)))
    .limit(1);

  if (!thread) {
    [thread] = await db
      .insert(treatyDmThreads)
      .values({ accountLow: low, accountHigh: high })
      .returning();
  }
  return thread!;
}

export async function listDmThreads(accountId: string) {
  const threads = await db
    .select()
    .from(treatyDmThreads)
    .where(or(eq(treatyDmThreads.accountLow, accountId), eq(treatyDmThreads.accountHigh, accountId)))
    .orderBy(desc(treatyDmThreads.updatedAt));

  const result = [];
  for (const t of threads) {
    const otherId = t.accountLow === accountId ? t.accountHigh : t.accountLow;
    const profile = await friendProfile(otherId);
    const [last] = await db
      .select()
      .from(treatyMessages)
      .where(eq(treatyMessages.threadId, t.id))
      .orderBy(desc(treatyMessages.createdAt))
      .limit(1);
    const unread = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(treatyMessages)
      .where(
        and(
          eq(treatyMessages.threadId, t.id),
          ne(treatyMessages.senderAccountId, accountId),
          isNull(treatyMessages.readAt),
        ),
      );

    result.push({
      threadId: t.id,
      otherAccountId: otherId,
      grudgeId: profile?.grudgeId ?? null,
      displayName: profile?.displayName ?? "Warlord",
      avatarUrl: profile?.avatarUrl ?? null,
      lastMessage: last?.content ?? null,
      lastMessageAt: last?.createdAt ?? t.updatedAt,
      unread: unread[0]?.count ?? 0,
    });
  }
  return result;
}

export async function getThreadMessages(accountId: string, threadId: string) {
  const [thread] = await db.select().from(treatyDmThreads).where(eq(treatyDmThreads.id, threadId)).limit(1);
  if (!thread) throw new Error("Thread not found");
  if (thread.accountLow !== accountId && thread.accountHigh !== accountId) {
    throw new Error("Access denied");
  }

  const messages = await db
    .select()
    .from(treatyMessages)
    .where(eq(treatyMessages.threadId, threadId))
    .orderBy(treatyMessages.createdAt);

  await db
    .update(treatyMessages)
    .set({ readAt: Date.now() })
    .where(
      and(
        eq(treatyMessages.threadId, threadId),
        ne(treatyMessages.senderAccountId, accountId),
        isNull(treatyMessages.readAt),
      ),
    );

  return messages;
}

export async function sendDmMessage(accountId: string, threadId: string, content: string) {
  const text = content.trim();
  if (!text || text.length > 2000) throw new Error("Invalid message");

  const [thread] = await db.select().from(treatyDmThreads).where(eq(treatyDmThreads.id, threadId)).limit(1);
  if (!thread) throw new Error("Thread not found");
  if (thread.accountLow !== accountId && thread.accountHigh !== accountId) {
    throw new Error("Access denied");
  }

  const otherId = thread.accountLow === accountId ? thread.accountHigh : thread.accountLow;
  const [friendship] = await db
    .select()
    .from(treatyFriends)
    .where(
      and(
        or(
          and(eq(treatyFriends.accountId, accountId), eq(treatyFriends.friendAccountId, otherId)),
          and(eq(treatyFriends.accountId, otherId), eq(treatyFriends.friendAccountId, accountId)),
        ),
        eq(treatyFriends.status, "accepted"),
      ),
    )
    .limit(1);

  if (!friendship) throw new Error("Treaty friends only — accept friend request first");

  const now = Date.now();
  const [msg] = await db
    .insert(treatyMessages)
    .values({ threadId, senderAccountId: accountId, content: text, createdAt: now })
    .returning();

  await db.update(treatyDmThreads).set({ updatedAt: now }).where(eq(treatyDmThreads.id, threadId));

  const { notifyTreatyDm } = await import("./treatyCrossNotify");
  void notifyTreatyDm({
    recipientAccountId: otherId,
    senderAccountId: accountId,
    threadId,
    content: text,
  });

  return msg;
}

export async function countUnreadTreatyMessages(accountId: string): Promise<number> {
  const threads = await db
    .select({ id: treatyDmThreads.id })
    .from(treatyDmThreads)
    .where(or(eq(treatyDmThreads.accountLow, accountId), eq(treatyDmThreads.accountHigh, accountId)));

  let dmUnread = 0;
  if (threads.length) {
    const threadIds = threads.map((t: { id: string }) => t.id);
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(treatyMessages)
      .where(
        and(
          inArray(treatyMessages.threadId, threadIds),
          ne(treatyMessages.senderAccountId, accountId),
          isNull(treatyMessages.readAt),
        ),
      );
    dmUnread = row?.count ?? 0;
  }

  const memberships = await db
    .select()
    .from(treatyGroupMembers)
    .where(eq(treatyGroupMembers.accountId, accountId));

  let groupUnread = 0;
  for (const m of memberships) {
    const since = m.lastReadAt ?? 0;
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(treatyGroupMessages)
      .where(
        and(
          eq(treatyGroupMessages.groupId, m.groupId),
          ne(treatyGroupMessages.senderAccountId, accountId),
          gt(treatyGroupMessages.createdAt, since),
        ),
      );
    groupUnread += row?.count ?? 0;
  }

  return dmUnread + groupUnread;
}

// ─── Groups ───────────────────────────────────────────────────────────────

const MAX_GROUP_NAME = 64;
const MAX_GROUP_DESC = 280;
const MAX_GROUP_MEMBERS = 50;

async function requireGroupMember(accountId: string, groupId: string) {
  const [member] = await db
    .select()
    .from(treatyGroupMembers)
    .where(and(eq(treatyGroupMembers.groupId, groupId), eq(treatyGroupMembers.accountId, accountId)))
    .limit(1);
  if (!member) throw new Error("Not a group member");
  return member;
}

export async function createTreatyGroup(
  ownerAccountId: string,
  name: string,
  description?: string,
  memberQueries: string[] = [],
) {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > MAX_GROUP_NAME) throw new Error("Invalid group name");
  const desc = description?.trim() || null;
  if (desc && desc.length > MAX_GROUP_DESC) throw new Error("Description too long");

  const now = Date.now();
  const [group] = await db
    .insert(treatyGroups)
    .values({
      name: trimmed,
      description: desc,
      ownerAccountId,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  await db.insert(treatyGroupMembers).values({
    groupId: group!.id,
    accountId: ownerAccountId,
    role: "owner",
    joinedAt: now,
    lastReadAt: now,
  });

  const added: string[] = [ownerAccountId];
  for (const q of memberQueries.slice(0, MAX_GROUP_MEMBERS - 1)) {
    try {
      const target = await resolveAccountByGrudgeIdOrName(q);
      if (!target || target.accountId === ownerAccountId || added.includes(target.accountId)) continue;
      // Prefer friends but allow any resolvable Grudge ID (invite by ID)
      await db.insert(treatyGroupMembers).values({
        groupId: group!.id,
        accountId: target.accountId,
        role: "member",
        joinedAt: now,
      });
      added.push(target.accountId);
    } catch {
      /* skip bad invites */
    }
  }

  return { group: group!, memberCount: added.length };
}

export async function listTreatyGroups(accountId: string) {
  const memberships = await db
    .select()
    .from(treatyGroupMembers)
    .where(eq(treatyGroupMembers.accountId, accountId));

  if (!memberships.length) return [];

  const groupIds = memberships.map((m) => m.groupId);
  const groups = await db
    .select()
    .from(treatyGroups)
    .where(inArray(treatyGroups.id, groupIds))
    .orderBy(desc(treatyGroups.updatedAt));

  const result = [];
  for (const g of groups) {
    const membership = memberships.find((m) => m.groupId === g.id)!;
    const members = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(treatyGroupMembers)
      .where(eq(treatyGroupMembers.groupId, g.id));
    const [last] = await db
      .select()
      .from(treatyGroupMessages)
      .where(eq(treatyGroupMessages.groupId, g.id))
      .orderBy(desc(treatyGroupMessages.createdAt))
      .limit(1);
    const since = membership.lastReadAt ?? 0;
    const [unreadRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(treatyGroupMessages)
      .where(
        and(
          eq(treatyGroupMessages.groupId, g.id),
          ne(treatyGroupMessages.senderAccountId, accountId),
          gt(treatyGroupMessages.createdAt, since),
        ),
      );

    result.push({
      groupId: g.id,
      name: g.name,
      description: g.description,
      ownerAccountId: g.ownerAccountId,
      avatarUrl: g.avatarUrl,
      role: membership.role,
      memberCount: members[0]?.count ?? 0,
      lastMessage: last?.content ?? null,
      lastMessageAt: last?.createdAt ?? g.updatedAt,
      unread: unreadRow?.count ?? 0,
      updatedAt: g.updatedAt,
    });
  }

  return result.sort((a, b) => b.lastMessageAt - a.lastMessageAt);
}

export async function getTreatyGroupDetail(accountId: string, groupId: string) {
  await requireGroupMember(accountId, groupId);
  const [group] = await db.select().from(treatyGroups).where(eq(treatyGroups.id, groupId)).limit(1);
  if (!group) throw new Error("Group not found");

  const memberRows = await db
    .select()
    .from(treatyGroupMembers)
    .where(eq(treatyGroupMembers.groupId, groupId));

  const members = [];
  for (const m of memberRows) {
    const profile = await friendProfile(m.accountId);
    members.push({
      accountId: m.accountId,
      role: m.role,
      joinedAt: m.joinedAt,
      grudgeId: profile?.grudgeId ?? null,
      displayName: profile?.displayName ?? null,
      avatarUrl: profile?.avatarUrl ?? null,
    });
  }

  return { group, members };
}

export async function inviteToTreatyGroup(
  accountId: string,
  groupId: string,
  targetQuery: string,
) {
  const member = await requireGroupMember(accountId, groupId);
  if (member.role !== "owner" && member.role !== "admin") {
    throw new Error("Only owners/admins can invite");
  }

  const countRows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(treatyGroupMembers)
    .where(eq(treatyGroupMembers.groupId, groupId));
  if ((countRows[0]?.count ?? 0) >= MAX_GROUP_MEMBERS) {
    throw new Error("Group is full");
  }

  const target = await resolveAccountByGrudgeIdOrName(targetQuery);
  if (!target) throw new Error("Player not found");

  const [existing] = await db
    .select()
    .from(treatyGroupMembers)
    .where(
      and(eq(treatyGroupMembers.groupId, groupId), eq(treatyGroupMembers.accountId, target.accountId)),
    )
    .limit(1);
  if (existing) throw new Error("Already a member");

  const [created] = await db
    .insert(treatyGroupMembers)
    .values({
      groupId,
      accountId: target.accountId,
      role: "member",
      joinedAt: Date.now(),
    })
    .returning();

  await db.update(treatyGroups).set({ updatedAt: Date.now() }).where(eq(treatyGroups.id, groupId));
  return { member: created, target };
}

export async function leaveTreatyGroup(accountId: string, groupId: string) {
  const member = await requireGroupMember(accountId, groupId);
  const [group] = await db.select().from(treatyGroups).where(eq(treatyGroups.id, groupId)).limit(1);
  if (!group) throw new Error("Group not found");

  if (member.role === "owner") {
    const others = await db
      .select()
      .from(treatyGroupMembers)
      .where(and(eq(treatyGroupMembers.groupId, groupId), ne(treatyGroupMembers.accountId, accountId)));
    if (others.length > 0) {
      // Transfer ownership to oldest remaining admin, else oldest member
      const next =
        others.find((m) => m.role === "admin") ||
        others.sort((a, b) => a.joinedAt - b.joinedAt)[0];
      if (next) {
        await db
          .update(treatyGroupMembers)
          .set({ role: "owner" })
          .where(eq(treatyGroupMembers.id, next.id));
        await db
          .update(treatyGroups)
          .set({ ownerAccountId: next.accountId, updatedAt: Date.now() })
          .where(eq(treatyGroups.id, groupId));
      }
    } else {
      // Last member leaves — delete group content
      await db.delete(treatyGroupMessages).where(eq(treatyGroupMessages.groupId, groupId));
      await db.delete(treatyGroupMembers).where(eq(treatyGroupMembers.groupId, groupId));
      await db.delete(treatyGroups).where(eq(treatyGroups.id, groupId));
      return { deleted: true };
    }
  }

  await db
    .delete(treatyGroupMembers)
    .where(and(eq(treatyGroupMembers.groupId, groupId), eq(treatyGroupMembers.accountId, accountId)));
  await db.update(treatyGroups).set({ updatedAt: Date.now() }).where(eq(treatyGroups.id, groupId));
  return { left: true };
}

export async function getGroupMessages(accountId: string, groupId: string) {
  await requireGroupMember(accountId, groupId);

  const messages = await db
    .select()
    .from(treatyGroupMessages)
    .where(eq(treatyGroupMessages.groupId, groupId))
    .orderBy(treatyGroupMessages.createdAt);

  // Enrich sender labels for UI
  const enriched = [];
  for (const m of messages) {
    const profile = await friendProfile(m.senderAccountId);
    enriched.push({
      ...m,
      senderDisplayName: profile?.displayName ?? null,
      senderGrudgeId: profile?.grudgeId ?? null,
    });
  }

  await db
    .update(treatyGroupMembers)
    .set({ lastReadAt: Date.now() })
    .where(and(eq(treatyGroupMembers.groupId, groupId), eq(treatyGroupMembers.accountId, accountId)));

  return enriched;
}

export async function sendGroupMessage(accountId: string, groupId: string, content: string) {
  const text = content.trim();
  if (!text || text.length > 2000) throw new Error("Invalid message");

  await requireGroupMember(accountId, groupId);

  const now = Date.now();
  const [msg] = await db
    .insert(treatyGroupMessages)
    .values({ groupId, senderAccountId: accountId, content: text, createdAt: now })
    .returning();

  await db.update(treatyGroups).set({ updatedAt: now }).where(eq(treatyGroups.id, groupId));
  await db
    .update(treatyGroupMembers)
    .set({ lastReadAt: now })
    .where(and(eq(treatyGroupMembers.groupId, groupId), eq(treatyGroupMembers.accountId, accountId)));

  return msg;
}

// ─── Server / fleet chat (all games + studio pages) ─────────────────────────

const DEFAULT_SERVER_CHANNELS: Array<{
  slug: string;
  name: string;
  description: string;
  gameId: string;
  sortOrder: number;
}> = [
  { slug: "fleet-general", name: "Fleet General", description: "All Grudge Studio players", gameId: "fleet", sortOrder: 0 },
  { slug: "fleet-help", name: "Fleet Help", description: "Questions and onboarding", gameId: "fleet", sortOrder: 1 },
  { slug: "lfg", name: "Looking for Group", description: "Find party / crew", gameId: "fleet", sortOrder: 2 },
  { slug: "warlords", name: "Grudge Warlords", description: "Warlords chat", gameId: "warlords", sortOrder: 10 },
  { slug: "genesis", name: "Warlord Genesis", description: "MOBA / RTS siege chat", gameId: "genesis", sortOrder: 11 },
  { slug: "grudge6", name: "Grudge6 Lab", description: "Character lab and HUD", gameId: "grudge6", sortOrder: 12 },
  { slug: "forge", name: "Studio Forge", description: "Map and editor chat", gameId: "forge", sortOrder: 13 },
  { slug: "crafting", name: "Crafting", description: "WCS / professions", gameId: "crafting", sortOrder: 14 },
];

/** Ensure seed channels exist (safe to call on each list). */
export async function ensureTreatyServerChannels(): Promise<void> {
  for (const ch of DEFAULT_SERVER_CHANNELS) {
    try {
      await db
        .insert(treatyServerChannels)
        .values({
          slug: ch.slug,
          name: ch.name,
          description: ch.description,
          gameId: ch.gameId,
          isPublic: 1,
          sortOrder: ch.sortOrder,
        })
        .onConflictDoNothing({ target: treatyServerChannels.slug });
    } catch {
      /* table may not exist until migrate — swallow */
    }
  }
}

export async function listTreatyServerChannels(gameId?: string | null) {
  await ensureTreatyServerChannels();
  const rows = await db
    .select()
    .from(treatyServerChannels)
    .where(eq(treatyServerChannels.isPublic, 1))
    .orderBy(treatyServerChannels.sortOrder);

  if (gameId && gameId !== "all") {
    // Always include fleet-global channels + matching game
    return rows.filter((r) => r.gameId === "fleet" || r.gameId === gameId || r.slug === gameId);
  }
  return rows;
}

async function resolveServerChannel(slugOrId: string) {
  const [bySlug] = await db
    .select()
    .from(treatyServerChannels)
    .where(eq(treatyServerChannels.slug, slugOrId))
    .limit(1);
  if (bySlug) return bySlug;
  const [byId] = await db
    .select()
    .from(treatyServerChannels)
    .where(eq(treatyServerChannels.id, slugOrId))
    .limit(1);
  return byId || null;
}

export async function listServerChannelMessages(
  accountId: string,
  slugOrId: string,
  limit = 80,
) {
  void accountId; // reserved for mute/ban later
  const channel = await resolveServerChannel(slugOrId);
  if (!channel) throw new Error("Channel not found");

  const messages = await db
    .select()
    .from(treatyServerMessages)
    .where(eq(treatyServerMessages.channelId, channel.id))
    .orderBy(desc(treatyServerMessages.createdAt))
    .limit(Math.min(200, Math.max(1, limit)));

  const enriched = [];
  for (const msg of messages.reverse()) {
    const profile = await friendProfile(msg.senderAccountId);
    enriched.push({
      id: msg.id,
      channelId: channel.id,
      channelSlug: channel.slug,
      content: msg.content,
      createdAt: msg.createdAt,
      senderAccountId: msg.senderAccountId,
      senderDisplayName: profile?.displayName ?? null,
      senderGrudgeId: profile?.grudgeId ?? null,
      senderAvatarUrl: profile?.avatarUrl ?? null,
    });
  }
  return { channel, messages: enriched };
}

export async function sendServerChannelMessage(
  accountId: string,
  slugOrId: string,
  content: string,
) {
  const text = content.trim();
  if (!text || text.length > 2000) throw new Error("Invalid message");

  const channel = await resolveServerChannel(slugOrId);
  if (!channel) throw new Error("Channel not found");
  if (!channel.isPublic) throw new Error("Channel is not public");

  const now = Date.now();
  const [msg] = await db
    .insert(treatyServerMessages)
    .values({
      channelId: channel.id,
      senderAccountId: accountId,
      content: text,
      createdAt: now,
    })
    .returning();

  const profile = await friendProfile(accountId);
  return {
    message: {
      id: msg!.id,
      channelId: channel.id,
      channelSlug: channel.slug,
      content: msg!.content,
      createdAt: msg!.createdAt,
      senderAccountId: accountId,
      senderDisplayName: profile?.displayName ?? null,
      senderGrudgeId: profile?.grudgeId ?? null,
      senderAvatarUrl: profile?.avatarUrl ?? null,
    },
    channel,
  };
}