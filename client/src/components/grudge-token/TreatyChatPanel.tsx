import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  MessageCircle,
  Send,
  UserPlus,
  ArrowLeft,
  Check,
  X,
  Users,
  Plus,
  LogOut,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAccount } from "@/hooks/use-account";
import {
  fetchTreatySocial,
  fetchTreatyDmThreads,
  fetchTreatyMessages,
  sendTreatyFriendRequest,
  respondTreatyFriendRequest,
  openTreatyDmThread,
  sendTreatyMessage,
  fetchTreatyGroups,
  createTreatyGroup,
  fetchTreatyGroupMessages,
  sendTreatyGroupMessage,
  inviteToTreatyGroup,
  leaveTreatyGroup,
  type TreatyDmThread,
  type TreatyMessage,
  type TreatyFriendProfile,
  type TreatyGroupSummary,
  type TreatyGroupMessage,
} from "@/lib/treatyChat";

const POLL_MS = 5000;

function displayLabel(f: { displayName: string | null; grudgeId: string | null; name?: string }) {
  return f.name || f.displayName || f.grudgeId || "Warlord";
}

function formatTime(ts: number) {
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

interface TreatyChatPanelProps {
  active: boolean;
  /** Full-height layout for the /treaty app page */
  expanded?: boolean;
}

type SubTab = "friends" | "dms" | "groups";

export function TreatyChatPanel({ active, expanded = false }: TreatyChatPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { account } = useAccount();
  const myAccountId = account?.id;

  const [subTab, setSubTab] = useState<SubTab>("dms");
  const [addQuery, setAddQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupMembers, setNewGroupMembers] = useState("");
  const [inviteQuery, setInviteQuery] = useState("");
  const [inviting, setInviting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const panelH = expanded ? "h-[min(70vh,640px)]" : "h-[min(52vh,420px)]";
  const listH = expanded ? "max-h-[min(60vh,560px)]" : "max-h-[min(48vh,380px)]";

  const { data: social, isLoading: loadingSocial } = useQuery({
    queryKey: ["treaty-social"],
    queryFn: fetchTreatySocial,
    enabled: active,
    refetchInterval: active ? POLL_MS : false,
  });

  const { data: threadsData, isLoading: loadingThreads } = useQuery({
    queryKey: ["treaty-dm-threads"],
    queryFn: fetchTreatyDmThreads,
    enabled: active && (subTab === "dms" || !!activeThreadId),
    refetchInterval: active && (subTab === "dms" || !!activeThreadId) ? POLL_MS : false,
  });

  const { data: groupsData, isLoading: loadingGroups } = useQuery({
    queryKey: ["treaty-groups"],
    queryFn: fetchTreatyGroups,
    enabled: active && (subTab === "groups" || !!activeGroupId),
    refetchInterval: active && (subTab === "groups" || !!activeGroupId) ? POLL_MS : false,
  });

  const { data: messagesData, isLoading: loadingMessages } = useQuery({
    queryKey: ["treaty-messages", activeThreadId],
    queryFn: () => fetchTreatyMessages(activeThreadId!),
    enabled: active && !!activeThreadId,
    refetchInterval: active && activeThreadId ? POLL_MS : false,
  });

  const { data: groupMessagesData, isLoading: loadingGroupMessages } = useQuery({
    queryKey: ["treaty-group-messages", activeGroupId],
    queryFn: () => fetchTreatyGroupMessages(activeGroupId!),
    enabled: active && !!activeGroupId,
    refetchInterval: active && activeGroupId ? POLL_MS : false,
  });

  const threads = threadsData?.threads ?? [];
  const groups = groupsData?.groups ?? [];
  const messages = messagesData?.messages ?? [];
  const groupMessages = groupMessagesData?.messages ?? [];
  const activeThread = threads.find((t) => t.threadId === activeThreadId);
  const activeGroup = groups.find((g) => g.groupId === activeGroupId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, groupMessages]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["treaty-social"] });
    queryClient.invalidateQueries({ queryKey: ["treaty-dm-threads"] });
    queryClient.invalidateQueries({ queryKey: ["treaty-messages"] });
    queryClient.invalidateQueries({ queryKey: ["treaty-groups"] });
    queryClient.invalidateQueries({ queryKey: ["treaty-group-messages"] });
    queryClient.invalidateQueries({ queryKey: ["treaty-unread"] });
  };

  const startDm = async (friendAccountId: string) => {
    try {
      const { thread } = await openTreatyDmThread(friendAccountId);
      setActiveGroupId(null);
      setActiveThreadId(thread.id);
      setSubTab("dms");
      refresh();
    } catch (e: unknown) {
      toast({
        title: "Could not open DM",
        description: e instanceof Error ? e.message : "Error",
        variant: "destructive",
      });
    }
  };

  const handleSendDm = async () => {
    if (!activeThreadId || !draft.trim()) return;
    setSending(true);
    try {
      await sendTreatyMessage(activeThreadId, draft.trim());
      setDraft("");
      refresh();
    } catch (e: unknown) {
      toast({
        title: "Send failed",
        description: e instanceof Error ? e.message : "Error",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleSendGroup = async () => {
    if (!activeGroupId || !draft.trim()) return;
    setSending(true);
    try {
      await sendTreatyGroupMessage(activeGroupId, draft.trim());
      setDraft("");
      refresh();
    } catch (e: unknown) {
      toast({
        title: "Send failed",
        description: e instanceof Error ? e.message : "Error",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  // ── Active DM conversation ────────────────────────────────────────────
  if (activeThreadId && activeThread) {
    return (
      <div className={`flex flex-col ${panelH}`}>
        <div className="flex items-center gap-2 pb-3 border-b border-amber-900/20">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setActiveThreadId(null)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{displayLabel(activeThread)}</p>
            {activeThread.grudgeId && (
              <p className="text-xs text-slate-500 font-mono truncate">{activeThread.grudgeId}</p>
            )}
          </div>
          <Badge variant="outline" className="text-[10px] shrink-0">
            DM
          </Badge>
        </div>

        <div className="flex-1 overflow-y-auto py-3 space-y-2 min-h-0">
          {loadingMessages && messages.length === 0 ? (
            <div className="flex justify-center py-8 text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">No messages yet. Say hello.</p>
          ) : (
            messages.map((m) => (
              <MessageBubble key={m.id} message={m} isMine={m.senderAccountId === myAccountId} />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <Composer
          draft={draft}
          setDraft={setDraft}
          sending={sending}
          onSend={handleSendDm}
          placeholder="Treaty message…"
        />
      </div>
    );
  }

  // ── Active group conversation ─────────────────────────────────────────
  if (activeGroupId) {
    const canInvite =
      !activeGroup || activeGroup.role === "owner" || activeGroup.role === "admin";
    return (
      <div className={`flex flex-col ${panelH}`}>
        <div className="flex items-center gap-2 pb-3 border-b border-amber-900/20">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setActiveGroupId(null)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{activeGroup?.name ?? "Group"}</p>
            <p className="text-xs text-slate-500 truncate">
              {activeGroup
                ? `${activeGroup.memberCount} members · ${activeGroup.role}`
                : "Loading…"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-500"
            title="Leave group"
            onClick={async () => {
              try {
                await leaveTreatyGroup(activeGroupId);
                setActiveGroupId(null);
                toast({ title: "Left group" });
                refresh();
              } catch (e: unknown) {
                toast({
                  title: "Could not leave",
                  description: e instanceof Error ? e.message : "Error",
                  variant: "destructive",
                });
              }
            }}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>

        {canInvite && (
          <div className="flex gap-2 py-2 border-b border-slate-800">
            <Input
              value={inviteQuery}
              onChange={(e) => setInviteQuery(e.target.value)}
              placeholder="Invite by Grudge ID…"
              className="bg-slate-900 h-8 text-sm"
            />
            <Button
              size="sm"
              disabled={inviting || !inviteQuery.trim()}
              onClick={async () => {
                setInviting(true);
                try {
                  await inviteToTreatyGroup(activeGroupId, inviteQuery.trim());
                  toast({ title: "Member invited" });
                  setInviteQuery("");
                  refresh();
                } catch (e: unknown) {
                  toast({
                    title: "Invite failed",
                    description: e instanceof Error ? e.message : "Error",
                    variant: "destructive",
                  });
                } finally {
                  setInviting(false);
                }
              }}
            >
              {inviting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
            </Button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto py-3 space-y-2 min-h-0">
          {loadingGroupMessages && groupMessages.length === 0 ? (
            <div className="flex justify-center py-8 text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : groupMessages.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">No messages yet. Start the treaty.</p>
          ) : (
            groupMessages.map((m) => (
              <GroupMessageBubble
                key={m.id}
                message={m}
                isMine={m.senderAccountId === myAccountId}
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <Composer
          draft={draft}
          setDraft={setDraft}
          sending={sending}
          onSend={handleSendGroup}
          placeholder="Message group…"
        />
      </div>
    );
  }

  // ── List tabs ─────────────────────────────────────────────────────────
  const dmUnread = threads.reduce((n, t) => n + t.unread, 0);
  const groupUnread = groups.reduce((n, g) => n + g.unread, 0);

  return (
    <Tabs
      value={subTab}
      onValueChange={(v) => setSubTab(v as SubTab)}
      className="w-full"
    >
      <TabsList className="grid w-full grid-cols-3 bg-slate-900/80 mb-3">
        <TabsTrigger value="dms" className="gap-1.5">
          <MessageCircle className="h-3.5 w-3.5" />
          DMs
          {dmUnread > 0 && (
            <Badge variant="destructive" className="h-4 px-1 text-[10px]">
              {dmUnread}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="groups" className="gap-1.5">
          <Users className="h-3.5 w-3.5" />
          Groups
          {groupUnread > 0 && (
            <Badge variant="destructive" className="h-4 px-1 text-[10px]">
              {groupUnread}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="friends" className="gap-1.5">
          <UserPlus className="h-3.5 w-3.5" />
          Friends
          {(social?.pendingIncoming?.length ?? 0) > 0 && (
            <Badge variant="secondary" className="h-4 px-1 text-[10px]">
              {social!.pendingIncoming.length}
            </Badge>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="dms" className="mt-0">
        {loadingThreads ? (
          <div className="flex justify-center py-8 text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : threads.length === 0 ? (
          <div className="text-center py-8 space-y-2">
            <MessageCircle className="h-8 w-8 mx-auto text-slate-600" />
            <p className="text-sm text-slate-500">No DM threads yet.</p>
            <p className="text-xs text-slate-600">Add friends first, then message them here.</p>
          </div>
        ) : (
          <div className={`${listH} overflow-y-auto space-y-1`}>
            {threads.map((t) => (
              <DmThreadRow key={t.threadId} thread={t} onOpen={() => setActiveThreadId(t.threadId)} />
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="groups" className="mt-0 space-y-3">
        <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3 space-y-2">
          <p className="text-xs uppercase tracking-wide text-slate-500">Create group</p>
          <Input
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            placeholder="Group name"
            className="bg-slate-900 h-9"
            maxLength={64}
          />
          <Input
            value={newGroupMembers}
            onChange={(e) => setNewGroupMembers(e.target.value)}
            placeholder="Members (Grudge IDs, comma-separated)"
            className="bg-slate-900 h-9 text-sm"
          />
          <Button
            size="sm"
            className="w-full"
            disabled={creatingGroup || !newGroupName.trim()}
            onClick={async () => {
              setCreatingGroup(true);
              try {
                const members = newGroupMembers
                  .split(/[,;\s]+/)
                  .map((s) => s.trim())
                  .filter(Boolean);
                const { group } = await createTreatyGroup(newGroupName.trim(), undefined, members);
                toast({ title: "Group created" });
                setNewGroupName("");
                setNewGroupMembers("");
                refresh();
                setActiveGroupId(group.id);
              } catch (e: unknown) {
                toast({
                  title: "Create failed",
                  description: e instanceof Error ? e.message : "Error",
                  variant: "destructive",
                });
              } finally {
                setCreatingGroup(false);
              }
            }}
          >
            {creatingGroup ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Plus className="h-4 w-4 mr-1" />
            )}
            Create group
          </Button>
        </div>

        {loadingGroups ? (
          <div className="flex justify-center py-6 text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-6 space-y-2">
            <Users className="h-8 w-8 mx-auto text-slate-600" />
            <p className="text-sm text-slate-500">No groups yet.</p>
            <p className="text-xs text-slate-600">Create one for your warband, guild, or fleet.</p>
          </div>
        ) : (
          <div className={`${listH} overflow-y-auto space-y-1`}>
            {groups.map((g) => (
              <GroupRow key={g.groupId} group={g} onOpen={() => setActiveGroupId(g.groupId)} />
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="friends" className="mt-0 space-y-4">
        <div className="flex gap-2">
          <Input
            value={addQuery}
            onChange={(e) => setAddQuery(e.target.value)}
            placeholder="Grudge ID or display name"
            className="bg-slate-900"
            onKeyDown={(e) => {
              if (e.key === "Enter" && addQuery.trim()) {
                e.preventDefault();
                (document.getElementById("treaty-add-friend") as HTMLButtonElement)?.click();
              }
            }}
          />
          <Button
            id="treaty-add-friend"
            disabled={adding || !addQuery.trim()}
            onClick={async () => {
              setAdding(true);
              try {
                await sendTreatyFriendRequest(addQuery.trim());
                toast({ title: "Friend request sent" });
                setAddQuery("");
                refresh();
              } catch (e: unknown) {
                toast({
                  title: "Request failed",
                  description: e instanceof Error ? e.message : "Error",
                  variant: "destructive",
                });
              } finally {
                setAdding(false);
              }
            }}
          >
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          </Button>
        </div>

        {loadingSocial ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
          </div>
        ) : (
          <div className={`${expanded ? "max-h-[min(52vh,480px)]" : "max-h-[min(42vh,340px)]"} overflow-y-auto space-y-3`}>
            {(social?.pendingIncoming?.length ?? 0) > 0 && (
              <section>
                <p className="text-xs uppercase tracking-wide text-amber-400/80 mb-2">Incoming requests</p>
                {social!.pendingIncoming.map((f) => (
                  <FriendRequestRow key={f.id} friend={f} onRespond={refresh} />
                ))}
              </section>
            )}

            {(social?.pendingOutgoing?.length ?? 0) > 0 && (
              <section>
                <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Pending sent</p>
                {social!.pendingOutgoing.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center justify-between rounded-lg border border-slate-800 px-3 py-2 text-sm"
                  >
                    <span>{displayLabel(f)}</span>
                    <Badge variant="outline" className="text-xs">
                      Pending
                    </Badge>
                  </div>
                ))}
              </section>
            )}

            <section>
              <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">
                Treaty allies ({social?.friends?.length ?? 0})
              </p>
              {(social?.friends?.length ?? 0) === 0 ? (
                <p className="text-sm text-slate-600 py-4 text-center">No friends yet.</p>
              ) : (
                social!.friends.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center justify-between rounded-lg border border-slate-800 px-3 py-2 mb-1"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{displayLabel(f)}</p>
                      {f.grudgeId && (
                        <p className="text-xs text-slate-500 font-mono truncate">{f.grudgeId}</p>
                      )}
                    </div>
                    <Button size="sm" variant="outline" onClick={() => startDm(f.accountId)}>
                      <MessageCircle className="h-3.5 w-3.5 mr-1" />
                      DM
                    </Button>
                  </div>
                ))
              )}
            </section>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}

function Composer({
  draft,
  setDraft,
  sending,
  onSend,
  placeholder,
}: {
  draft: string;
  setDraft: (v: string) => void;
  sending: boolean;
  onSend: () => void;
  placeholder: string;
}) {
  return (
    <div className="flex gap-2 pt-2 border-t border-amber-900/20">
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={placeholder}
        className="bg-slate-900"
        maxLength={2000}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSend();
          }
        }}
      />
      <Button size="icon" disabled={sending || !draft.trim()} onClick={onSend}>
        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      </Button>
    </div>
  );
}

function DmThreadRow({ thread, onOpen }: { thread: TreatyDmThread; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full flex items-center gap-3 rounded-lg border border-slate-800 px-3 py-2.5 text-left hover:bg-slate-900/60 transition-colors"
    >
      {thread.avatarUrl ? (
        <img src={thread.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
      ) : (
        <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center shrink-0">
          <MessageCircle className="h-4 w-4 text-slate-500" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium truncate">{displayLabel(thread)}</p>
          <span className="text-[10px] text-slate-500 shrink-0">{formatTime(thread.lastMessageAt)}</span>
        </div>
        <p className="text-xs text-slate-500 truncate">{thread.lastMessage || "Start conversation"}</p>
      </div>
      {thread.unread > 0 && (
        <Badge variant="destructive" className="shrink-0 h-5 min-w-5 px-1.5 text-[10px]">
          {thread.unread}
        </Badge>
      )}
    </button>
  );
}

function GroupRow({ group, onOpen }: { group: TreatyGroupSummary; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full flex items-center gap-3 rounded-lg border border-slate-800 px-3 py-2.5 text-left hover:bg-slate-900/60 transition-colors"
    >
      <div className="w-9 h-9 rounded-full bg-amber-950/50 border border-amber-900/40 flex items-center justify-center shrink-0">
        <Users className="h-4 w-4 text-amber-500/80" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium truncate">{group.name}</p>
          <span className="text-[10px] text-slate-500 shrink-0">{formatTime(group.lastMessageAt)}</span>
        </div>
        <p className="text-xs text-slate-500 truncate">
          {group.lastMessage || `${group.memberCount} members`}
        </p>
      </div>
      {group.unread > 0 && (
        <Badge variant="destructive" className="shrink-0 h-5 min-w-5 px-1.5 text-[10px]">
          {group.unread}
        </Badge>
      )}
    </button>
  );
}

function FriendRequestRow({
  friend,
  onRespond,
}: {
  friend: TreatyFriendProfile;
  onRespond: () => void;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const respond = async (accept: boolean) => {
    setBusy(true);
    try {
      await respondTreatyFriendRequest(friend.id, accept);
      toast({ title: accept ? "Friend accepted" : "Request declined" });
      onRespond();
    } catch (e: unknown) {
      toast({
        title: "Failed",
        description: e instanceof Error ? e.message : "Error",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center justify-between rounded-lg border border-amber-900/30 bg-amber-950/20 px-3 py-2 mb-1">
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">{displayLabel(friend)}</p>
        {friend.grudgeId && (
          <p className="text-xs text-slate-500 font-mono truncate">{friend.grudgeId}</p>
        )}
      </div>
      <div className="flex gap-1 shrink-0">
        <Button size="icon" variant="outline" className="h-8 w-8" disabled={busy} onClick={() => respond(true)}>
          <Check className="h-4 w-4 text-emerald-400" />
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8" disabled={busy} onClick={() => respond(false)}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function MessageBubble({ message, isMine }: { message: TreatyMessage; isMine: boolean }) {
  return (
    <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
          isMine
            ? "bg-amber-900/40 border border-amber-800/40 text-amber-50"
            : "bg-slate-800/80 border border-slate-700 text-slate-200"
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
        <p className="text-[10px] opacity-50 mt-1 text-right">{formatTime(message.createdAt)}</p>
      </div>
    </div>
  );
}

function GroupMessageBubble({
  message,
  isMine,
}: {
  message: TreatyGroupMessage;
  isMine: boolean;
}) {
  const label = message.senderDisplayName || message.senderGrudgeId || "Warlord";
  return (
    <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
          isMine
            ? "bg-amber-900/40 border border-amber-800/40 text-amber-50"
            : "bg-slate-800/80 border border-slate-700 text-slate-200"
        }`}
      >
        {!isMine && (
          <p className="text-[10px] font-medium text-amber-400/80 mb-0.5 truncate">{label}</p>
        )}
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
        <p className="text-[10px] opacity-50 mt-1 text-right">{formatTime(message.createdAt)}</p>
      </div>
    </div>
  );
}
