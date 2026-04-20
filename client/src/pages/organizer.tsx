import { useEffect, useMemo, useRef, useState } from "react";
import { ForceGraph2D } from "react-force-graph";
import { Activity, AlertTriangle, ExternalLink, Filter, GitBranch, Network, Search, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  nodes as allNodes,
  edges as allEdges,
  readiness as readinessRows,
  STATUS_COLOR,
  KIND_COLOR,
  getNodeById,
  neighbors,
  type NodeKind,
  type NodeStatus,
  type SystemEdge,
  type SystemNode,
} from "@/data/systemMap";

type TabId = "graph" | "readiness" | "issues";

// ---------- helpers ---------------------------------------------------------

function getTabFromUrl(): TabId {
  if (typeof window === "undefined") return "graph";
  const t = new URLSearchParams(window.location.search).get("tab");
  return t === "readiness" || t === "issues" ? t : "graph";
}

function setTabInUrl(tab: TabId) {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  params.set("tab", tab);
  const next = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState(null, "", next);
}

const KIND_LABEL: Record<NodeKind, string> = {
  domain: "Domain",
  service: "Service",
  frontendRoute: "Frontend route",
  apiRewrite: "API rewrite",
  backendEndpoint: "Backend endpoint",
  dataSource: "Data source",
  repo: "Repo",
};

// ---------- graph tab -------------------------------------------------------

interface GraphNode extends SystemNode {
  val: number;
  color: string;
}

function GraphTab({
  filteredNodes,
  filteredEdges,
  selectedId,
  onSelect,
}: {
  filteredNodes: SystemNode[];
  filteredEdges: SystemEdge[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const ro = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const graphData = useMemo(() => {
    const fanIn = new Map<string, number>();
    for (const e of filteredEdges) {
      fanIn.set(e.target, (fanIn.get(e.target) ?? 0) + 1);
    }
    const nodes: GraphNode[] = filteredNodes.map(n => ({
      ...n,
      val: 1 + Math.min(12, fanIn.get(n.id) ?? 0),
      color: STATUS_COLOR[n.status],
    }));
    const nodeIds = new Set(nodes.map(n => n.id));
    const links = filteredEdges.filter(e => nodeIds.has(e.source) && nodeIds.has(e.target));
    return { nodes, links };
  }, [filteredNodes, filteredEdges]);

  return (
    <div ref={containerRef} className="relative w-full h-[calc(100vh-260px)] rounded-lg border border-border/60 bg-background/60 overflow-hidden">
      <ForceGraph2D
        width={size.w}
        height={size.h}
        graphData={graphData as any}
        nodeLabel={(n: any) => `${n.label}  —  ${KIND_LABEL[n.kind as NodeKind]} [${n.status}]`}
        nodeRelSize={4}
        linkColor={() => "rgba(148,163,184,0.35)"}
        linkDirectionalArrowLength={3}
        linkDirectionalArrowRelPos={1}
        onNodeClick={(n: any) => onSelect(n.id as string)}
        onBackgroundClick={() => onSelect(null)}
        nodeCanvasObjectMode={() => "after"}
        nodeCanvasObject={(node: any, ctx, globalScale) => {
          const label = node.label as string;
          const fontSize = 11 / Math.max(1, globalScale);
          ctx.font = `${fontSize}px Inter, ui-sans-serif, system-ui`;
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.fillStyle = node.id === selectedId ? "#fef3c7" : "#cbd5e1";
          ctx.fillText(label, node.x, (node.y ?? 0) + 6);
          if (node.id === selectedId) {
            ctx.strokeStyle = "#fbbf24";
            ctx.lineWidth = 2 / Math.max(1, globalScale);
            ctx.beginPath();
            ctx.arc(node.x, node.y, (node.val ?? 1) + 3, 0, Math.PI * 2);
            ctx.stroke();
          }
        }}
      />
    </div>
  );
}

// ---------- readiness tab ---------------------------------------------------

const STATUS_PILL: Record<string, string> = {
  ok: "bg-emerald-900/40 text-emerald-300 border-emerald-700/40",
  missing: "bg-red-900/40 text-red-300 border-red-700/40",
  unknown: "bg-slate-800/60 text-slate-300 border-slate-600/40",
  "n/a": "bg-slate-800/40 text-slate-400 border-slate-700/40",
};

function StatusPill({ value }: { value: string }) {
  const cls = STATUS_PILL[value] ?? STATUS_PILL.unknown;
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wide border ${cls}`}>{value}</span>
  );
}

function ReadinessTab() {
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Production-readiness snapshot per service. <code className="text-amber-300">missing</code> rows are your action items.
      </p>
      <div className="rounded-lg border border-border/60 overflow-hidden">
        <div className="grid grid-cols-[1.6fr_0.8fr_0.8fr_0.8fr_0.8fr_0.8fr_0.8fr_0.8fr] gap-0 text-[11px] uppercase tracking-wide bg-slate-900/60 text-slate-400 px-3 py-2">
          <div>Service</div>
          <div>HTTPS</div>
          <div>Health</div>
          <div>CORS</div>
          <div>Auth</div>
          <div>Rate-limit</div>
          <div>Observability</div>
          <div>Backup</div>
        </div>
        <ScrollArea className="max-h-[calc(100vh-380px)]">
          {readinessRows.map(r => {
            const svc = getNodeById(r.serviceId);
            return (
              <div key={r.serviceId} className="grid grid-cols-[1.6fr_0.8fr_0.8fr_0.8fr_0.8fr_0.8fr_0.8fr_0.8fr] gap-0 items-center px-3 py-2 border-t border-border/40 text-xs">
                <div>
                  <div className="font-medium">{svc?.label ?? r.serviceId}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {r.owner ? `owner: ${r.owner}` : null}
                    {r.runbook ? <> · runbook: <code>{r.runbook}</code></> : null}
                  </div>
                </div>
                <StatusPill value={r.https} />
                <StatusPill value={r.healthEndpoint ? "ok" : "missing"} />
                <StatusPill value={r.cors} />
                <StatusPill value={r.authRequired} />
                <StatusPill value={r.rateLimit} />
                <StatusPill value={r.observability} />
                <StatusPill value={r.backup} />
              </div>
            );
          })}
        </ScrollArea>
      </div>
    </div>
  );
}

// ---------- issues tab ------------------------------------------------------

interface Issue {
  id: string;
  severity: "high" | "medium" | "low";
  title: string;
  detail: string;
  nodeId?: string;
}

function computeIssues(): Issue[] {
  const issues: Issue[] = [];
  // Live nodes that depend on planned/broken targets
  const nodeMap = new Map(allNodes.map(n => [n.id, n]));
  for (const e of allEdges) {
    const s = nodeMap.get(e.source);
    const t = nodeMap.get(e.target);
    if (!s || !t) continue;
    if (s.status === "live" && (t.status === "planned" || t.status === "broken")) {
      issues.push({
        id: `dep:${e.source}->${e.target}:${e.kind}`,
        severity: t.status === "broken" ? "high" : "medium",
        title: `${s.label} depends on ${t.status} node ${t.label}`,
        detail: `Edge kind: ${e.kind}. Either ship ${t.label} or degrade ${s.label} gracefully.`,
        nodeId: t.id,
      });
    }
  }
  // Alias routes (same label suffix with "(alias)")
  for (const n of allNodes) {
    if (n.kind === "frontendRoute" && n.notes?.toLowerCase().includes("alias of")) {
      issues.push({
        id: `alias:${n.id}`,
        severity: "low",
        title: `Route ${n.label} is an alias`,
        detail: n.notes ?? "Consider redirecting and removing the duplicate.",
        nodeId: n.id,
      });
    }
  }
  // Deprecated still routed
  for (const n of allNodes) {
    if (n.status === "deprecated") {
      issues.push({
        id: `dep-route:${n.id}`,
        severity: "low",
        title: `${n.label} is flagged deprecated`,
        detail: n.notes ?? "Schedule for deletion.",
        nodeId: n.id,
      });
    }
  }
  // Readiness holes
  for (const r of readinessRows) {
    const holes = (["https", "cors", "authRequired", "rateLimit", "observability", "backup"] as const)
      .filter(k => (r as any)[k] === "missing");
    if (holes.length) {
      issues.push({
        id: `readiness:${r.serviceId}`,
        severity: holes.includes("https") || holes.includes("authRequired") ? "high" : "medium",
        title: `${getNodeById(r.serviceId)?.label ?? r.serviceId}: missing ${holes.join(", ")}`,
        detail: "See Readiness tab. Each missing cell should be an issue in Grudge-Studio-Mission.",
        nodeId: r.serviceId,
      });
    }
  }
  return issues.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "high" ? -1 : a.severity === "medium" && b.severity === "low" ? -1 : 1));
}

function IssuesTab({ onSelect }: { onSelect: (id: string | null) => void }) {
  const issues = useMemo(computeIssues, []);
  const counts = {
    high: issues.filter(i => i.severity === "high").length,
    medium: issues.filter(i => i.severity === "medium").length,
    low: issues.filter(i => i.severity === "low").length,
  };
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs">
        <Badge className="bg-red-900/40 text-red-300 border border-red-700/40">High {counts.high}</Badge>
        <Badge className="bg-amber-900/40 text-amber-300 border border-amber-700/40">Medium {counts.medium}</Badge>
        <Badge className="bg-slate-800/60 text-slate-300 border border-slate-600/40">Low {counts.low}</Badge>
        <span className="text-muted-foreground ml-2">Auto-computed from the manifest. Click a row to highlight the node in the graph.</span>
      </div>
      <ScrollArea className="max-h-[calc(100vh-340px)]">
        <div className="space-y-2">
          {issues.map(i => (
            <button
              key={i.id}
              onClick={() => { onSelect(i.nodeId ?? null); setTabInUrl("graph"); }}
              className="w-full text-left rounded-lg border border-border/60 bg-slate-900/40 hover:bg-slate-900/70 p-3"
            >
              <div className="flex items-center gap-2">
                <Badge
                  className={
                    i.severity === "high"
                      ? "bg-red-900/40 text-red-300 border border-red-700/40"
                      : i.severity === "medium"
                      ? "bg-amber-900/40 text-amber-300 border border-amber-700/40"
                      : "bg-slate-800/60 text-slate-300 border border-slate-600/40"
                  }
                >
                  {i.severity}
                </Badge>
                <div className="font-medium text-sm">{i.title}</div>
              </div>
              <div className="text-xs text-muted-foreground mt-1">{i.detail}</div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

// ---------- inspector panel -------------------------------------------------

function Inspector({ id, onClose }: { id: string; onClose: () => void }) {
  const node = getNodeById(id);
  if (!node) return null;
  const { incoming, outgoing } = neighbors(id);
  const copyIssue = () => {
    const body = [
      `## ${node.label}`,
      "",
      `- Kind: \`${KIND_LABEL[node.kind]}\``,
      `- Status: \`${node.status}\``,
      `- Group: \`${node.group}\``,
      node.owner ? `- Owner: \`${node.owner}\`` : null,
      node.repo ? `- Repo: \`${node.repo}\`` : null,
      node.url ? `- URL: ${node.url}` : null,
      node.notes ? `\n${node.notes}` : null,
      "",
      `### Incoming (${incoming.length})`,
      ...incoming.map(e => `- \`${e.kind}\` ← ${getNodeById(e.source)?.label ?? e.source}`),
      "",
      `### Outgoing (${outgoing.length})`,
      ...outgoing.map(e => `- \`${e.kind}\` → ${getNodeById(e.target)?.label ?? e.target}`),
    ].filter(Boolean).join("\n");
    navigator.clipboard?.writeText(body);
  };
  return (
    <Card className="w-full border-border/60 bg-slate-900/50">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base">{node.label}</CardTitle>
          <div className="flex items-center gap-2 mt-1">
            <Badge className="text-[10px]" style={{ backgroundColor: KIND_COLOR[node.kind], color: "#0f172a" }}>
              {KIND_LABEL[node.kind]}
            </Badge>
            <Badge className="text-[10px]" style={{ backgroundColor: STATUS_COLOR[node.status], color: "#0f172a" }}>
              {node.status}
            </Badge>
            <span className="text-[10px] text-muted-foreground">group: {node.group}</span>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 p-0"><X className="w-4 h-4" /></Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {node.notes && <p className="text-xs text-muted-foreground">{node.notes}</p>}
        {node.url && (
          <a href={node.url} target="_blank" rel="noopener noreferrer" className="text-xs text-amber-400 hover:text-amber-300 inline-flex items-center gap-1">
            <ExternalLink className="w-3 h-3" /> {node.url}
          </a>
        )}
        <Separator />
        <div>
          <div className="text-[11px] uppercase tracking-wide text-slate-400 mb-1">Outgoing ({outgoing.length})</div>
          <ul className="text-xs space-y-1">
            {outgoing.slice(0, 12).map(e => (
              <li key={`${e.source}-${e.target}-${e.kind}`}>
                <code className="text-amber-300/80">{e.kind}</code> → {getNodeById(e.target)?.label ?? e.target}
              </li>
            ))}
            {outgoing.length === 0 && <li className="text-muted-foreground">(none)</li>}
          </ul>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wide text-slate-400 mb-1">Incoming ({incoming.length})</div>
          <ul className="text-xs space-y-1">
            {incoming.slice(0, 12).map(e => (
              <li key={`${e.source}-${e.target}-${e.kind}`}>
                {getNodeById(e.source)?.label ?? e.source} <code className="text-amber-300/80">{e.kind}</code>
              </li>
            ))}
            {incoming.length === 0 && <li className="text-muted-foreground">(none)</li>}
          </ul>
        </div>
        <div className="flex gap-2 pt-2">
          <Button size="sm" variant="secondary" onClick={copyIssue}>Copy as issue</Button>
          {node.url && (
            <Button size="sm" variant="outline" onClick={() => window.open(node.url!, "_blank", "noopener")}>
              Open
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------- page ------------------------------------------------------------

export default function OrganizerPage() {
  const [tab, setTab] = useState<TabId>(getTabFromUrl());
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<NodeKind | "all">("all");
  const [statusFilter, setStatusFilter] = useState<NodeStatus | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => { setTabInUrl(tab); }, [tab]);

  const filteredNodes = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allNodes.filter(n => {
      if (kindFilter !== "all" && n.kind !== kindFilter) return false;
      if (statusFilter !== "all" && n.status !== statusFilter) return false;
      if (!q) return true;
      return (
        n.label.toLowerCase().includes(q) ||
        n.id.toLowerCase().includes(q) ||
        (n.group?.toLowerCase().includes(q) ?? false) ||
        (n.notes?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [query, kindFilter, statusFilter]);

  const filteredEdges = useMemo(() => {
    const ids = new Set(filteredNodes.map(n => n.id));
    return allEdges.filter(e => ids.has(e.source) && ids.has(e.target));
  }, [filteredNodes]);

  const kinds: (NodeKind | "all")[] = ["all", "domain", "service", "frontendRoute", "apiRewrite", "dataSource", "repo"];
  const statuses: (NodeStatus | "all")[] = ["all", "live", "planned", "broken", "deprecated"];

  const counts = useMemo(() => ({
    nodes: allNodes.length,
    edges: allEdges.length,
    services: allNodes.filter(n => n.kind === "service").length,
    routes: allNodes.filter(n => n.kind === "frontendRoute").length,
    planned: allNodes.filter(n => n.status === "planned").length,
    broken: allNodes.filter(n => n.status === "broken").length,
  }), []);

  return (
    <div className="min-h-screen bg-background text-foreground p-4">
      <div className="max-w-[1500px] mx-auto">
        <header className="flex items-center justify-between mb-3">
          <div>
            <h1 className="font-cinzel text-2xl text-amber-300 tracking-wide flex items-center gap-2">
              <Network className="w-5 h-5" /> Grudge Studio Organizer
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              {counts.nodes} nodes · {counts.edges} edges · {counts.services} services · {counts.routes} frontend routes · {counts.planned} planned · {counts.broken} broken
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-amber-900/40 text-amber-300 border border-amber-700/40">
              source: <code className="ml-1">client/src/data/systemMap.ts</code>
            </Badge>
          </div>
        </header>

        <div className="grid grid-cols-[1fr_360px] gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Search className="w-3 h-3" />
              </div>
              <Input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search nodes by label, id, group, notes..."
                className="max-w-sm h-8"
              />
              <div className="flex items-center gap-1 text-xs text-muted-foreground ml-2">
                <Filter className="w-3 h-3" /> kind:
              </div>
              {kinds.map(k => (
                <Button
                  key={k}
                  size="sm"
                  variant={kindFilter === k ? "secondary" : "outline"}
                  className="h-7 text-xs"
                  onClick={() => setKindFilter(k)}
                >
                  {k === "all" ? "all" : KIND_LABEL[k as NodeKind]}
                </Button>
              ))}
              <span className="text-xs text-muted-foreground ml-2">status:</span>
              {statuses.map(s => (
                <Button
                  key={s}
                  size="sm"
                  variant={statusFilter === s ? "secondary" : "outline"}
                  className="h-7 text-xs"
                  onClick={() => setStatusFilter(s)}
                >
                  {s}
                </Button>
              ))}
            </div>

            <Tabs value={tab} onValueChange={v => setTab(v as TabId)}>
              <TabsList>
                <TabsTrigger value="graph"><GitBranch className="w-3.5 h-3.5 mr-1" /> Graph</TabsTrigger>
                <TabsTrigger value="readiness"><ShieldCheck className="w-3.5 h-3.5 mr-1" /> Readiness</TabsTrigger>
                <TabsTrigger value="issues"><AlertTriangle className="w-3.5 h-3.5 mr-1" /> Issues</TabsTrigger>
              </TabsList>
              <TabsContent value="graph">
                <GraphTab
                  filteredNodes={filteredNodes}
                  filteredEdges={filteredEdges}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                />
              </TabsContent>
              <TabsContent value="readiness">
                <ReadinessTab />
              </TabsContent>
              <TabsContent value="issues">
                <IssuesTab onSelect={setSelectedId} />
              </TabsContent>
            </Tabs>
          </div>

          <aside className="space-y-3">
            <Card className="border-border/60 bg-slate-900/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" /> Legend
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-1">Status</div>
                  <div className="flex flex-wrap gap-2">
                    {(["live", "planned", "broken", "deprecated"] as NodeStatus[]).map(s => (
                      <span key={s} className="inline-flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STATUS_COLOR[s] }} />
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-1">Kind</div>
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(KIND_COLOR) as NodeKind[]).map(k => (
                      <span key={k} className="inline-flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: KIND_COLOR[k] }} />
                        {KIND_LABEL[k]}
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
            {selectedId ? (
              <Inspector id={selectedId} onClose={() => setSelectedId(null)} />
            ) : (
              <Card className="border-border/60 bg-slate-900/40">
                <CardContent className="text-xs text-muted-foreground p-4">
                  Click a node in the graph to inspect it. Use the Issues tab to jump directly to problem nodes.
                </CardContent>
              </Card>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
