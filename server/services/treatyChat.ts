/**
 * Treaty Chat — friends list + 1:1 DMs between Grudge accounts.
 */
import { and, desc, eq, or, sql, isNull, ne, inArray } from "drizzle-orm";
import { db } from "../db";
import { accounts, treatyDmThreads, treatyFriends, treatyMessages, users } from "@shared/schema";

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

  if (!threads.length) return 0;

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
  return row?.count ?? 0;
}