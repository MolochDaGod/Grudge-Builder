import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { lazy, Suspense } from "react";
const MonacoEditor = lazy(() => import("@monaco-editor/react"));
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Play, Square, RotateCcw, Save, FolderOpen, Home,
  Terminal as TerminalIcon, Code2, Eye, Loader2, AlertTriangle,
  ChevronDown, FileCode, Package,
} from "lucide-react";
import { getCurrentUser } from "@/lib/grudgeBackend";
import { getWebContainer, isWebContainerSupported, EDITOR_TEMPLATES } from "@/lib/webcontainer";

type EditorStatus = "idle" | "booting" | "installing" | "running" | "error";

export default function EditorPage() {
  const [, setLocation] = useLocation();
  const user = getCurrentUser();

  // State
  const [status, setStatus] = useState<EditorStatus>("idle");
  const [statusText, setStatusText] = useState("Ready");
  const [code, setCode] = useState(EDITOR_TEMPLATES[0].getFiles().src.directory["main.js"].file.contents);
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState(EDITOR_TEMPLATES[0].id);
  const [showTerminal, setShowTerminal] = useState(true);
  const [unsupported, setUnsupported] = useState(false);
  const [activeFile, setActiveFile] = useState("src/main.js");

  // Refs
  const wcRef = useRef<any>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const writeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-scroll terminal
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [terminalOutput]);

  const log = useCallback((msg: string) => {
    setTerminalOutput(prev => [...prev.slice(-200), msg]);
  }, []);

  // ── Boot WebContainer ──────────────────────────────────────────
  const boot = useCallback(async () => {
    if (!isWebContainerSupported()) {
      setUnsupported(true);
      return;
    }

    try {
      setStatus("booting");
      setStatusText("Booting WebContainer...");
      log("⚡ Booting in-browser Node.js runtime...");

      const wc = await getWebContainer();
      wcRef.current = wc;

      // Listen for server-ready
      wc.on("server-ready", (_port: number, url: string) => {
        log(`✅ Dev server ready at ${url}`);
        setPreviewUrl(url);
        setStatus("running");
        setStatusText("Running");
      });

      // Mount template files
      const template = EDITOR_TEMPLATES.find(t => t.id === selectedTemplate) || EDITOR_TEMPLATES[0];
      const files = template.getFiles();
      await wc.mount(files);
      log(`📂 Mounted ${template.name} template`);

      // npm install
      setStatus("installing");
      setStatusText("Installing dependencies...");
      log("📦 Running npm install...");

      const install = await wc.spawn("npm", ["install"]);
      install.output.pipeTo(new WritableStream({
        write(data) { log(data); },
      }));
      const installExit = await install.exit;

      if (installExit !== 0) {
        setStatus("error");
        setStatusText("Install failed");
        log("❌ npm install failed");
        return;
      }

      log("✅ Dependencies installed");

      // Start dev server
      setStatusText("Starting dev server...");
      log("🚀 Starting Vite dev server...");

      const devServer = await wc.spawn("npm", ["run", "dev"]);
      devServer.output.pipeTo(new WritableStream({
        write(data) { log(data); },
      }));

    } catch (err: any) {
      setStatus("error");
      setStatusText(err.message || "Boot failed");
      log(`❌ Error: ${err.message}`);
    }
  }, [selectedTemplate, log]);

  // ── Live edit: write file on code change (debounced) ───────────
  const handleCodeChange = useCallback((value: string | undefined) => {
    if (!value) return;
    setCode(value);

    if (writeTimeoutRef.current) clearTimeout(writeTimeoutRef.current);
    writeTimeoutRef.current = setTimeout(async () => {
      if (wcRef.current && status === "running") {
        try {
          await wcRef.current.fs.writeFile(`/${activeFile}`, value);
        } catch {
          // Vite HMR will pick up the change — ignore write errors during restart
        }
      }
    }, 300);
  }, [status, activeFile]);

  // ── Save to Grudge backend ─────────────────────────────────────
  const saveToBackend = useCallback(async () => {
    if (!user) {
      log("⚠️ Login required to save");
      return;
    }
    try {
      log("💾 Saving to Grudge backend...");
      const res = await fetch("/api/scenes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          name: `Scene ${new Date().toLocaleTimeString()}`,
          template: selectedTemplate,
          code,
        }),
      });
      if (res.ok) {
        log("✅ Saved to Grudge backend");
      } else {
        log(`⚠️ Save returned ${res.status}`);
      }
    } catch (err: any) {
      log(`❌ Save error: ${err.message}`);
    }
  }, [user, code, selectedTemplate, log]);

  // ── Restart ────────────────────────────────────────────────────
  const restart = useCallback(async () => {
    setPreviewUrl(null);
    setTerminalOutput([]);
    setStatus("idle");
    setStatusText("Ready");
    wcRef.current = null;
    // Re-trigger boot
    boot();
  }, [boot]);

  // ── Template change ────────────────────────────────────────────
  const handleTemplateChange = (templateId: string) => {
    const template = EDITOR_TEMPLATES.find(t => t.id === templateId);
    if (!template) return;
    setSelectedTemplate(templateId);
    const files = template.getFiles();
    setCode(files.src.directory["main.js"].file.contents);
    setActiveFile("src/main.js");
  };

  // ── Unsupported browser ────────────────────────────────────────
  if (unsupported) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertTriangle className="w-16 h-16 mx-auto text-amber-500 mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Browser Not Supported</h1>
          <p className="text-slate-400 mb-4">
            The Grudge Editor needs SharedArrayBuffer which requires cross-origin isolation headers.
            Make sure you're on HTTPS and your browser supports WebContainers.
          </p>
          <Button onClick={() => setLocation("/launcher")} variant="outline">
            <Home className="w-4 h-4 mr-2" /> Back to Launcher
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-white overflow-hidden">
      {/* ── Toolbar ──────────────────────────────────────────── */}
      <header className="h-12 border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm flex items-center px-3 gap-2 shrink-0">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/launcher")} className="text-slate-400 h-8">
          <Home className="w-4 h-4" />
        </Button>

        <div className="w-px h-6 bg-slate-700" />

        <h1 className="text-sm font-bold text-amber-400 mr-2">Grudge Editor</h1>

        {/* Template picker */}
        <div className="relative">
          <select
            value={selectedTemplate}
            onChange={e => handleTemplateChange(e.target.value)}
            disabled={status !== "idle"}
            className="bg-slate-800 border border-slate-700 rounded text-xs px-2 py-1 text-slate-300 appearance-none pr-6 cursor-pointer disabled:opacity-50"
          >
            {EDITOR_TEMPLATES.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <ChevronDown className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
        </div>

        <div className="flex-1" />

        {/* Status */}
        <Badge
          variant="outline"
          className={cn("text-[10px] h-6", {
            "border-slate-600 text-slate-400": status === "idle",
            "border-blue-600 text-blue-400": status === "booting" || status === "installing",
            "border-green-600 text-green-400": status === "running",
            "border-red-600 text-red-400": status === "error",
          })}
        >
          {(status === "booting" || status === "installing") && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
          {statusText}
        </Badge>

        {/* Actions */}
        {status === "idle" && (
          <Button size="sm" className="h-8 bg-green-700 hover:bg-green-600 text-white" onClick={boot}>
            <Play className="w-3.5 h-3.5 mr-1" /> Run
          </Button>
        )}
        {status === "running" && (
          <>
            <Button size="sm" variant="outline" className="h-8 border-slate-700" onClick={restart}>
              <RotateCcw className="w-3.5 h-3.5 mr-1" /> Restart
            </Button>
            <Button size="sm" variant="outline" className="h-8 border-amber-700 text-amber-400" onClick={saveToBackend}>
              <Save className="w-3.5 h-3.5 mr-1" /> Save
            </Button>
          </>
        )}

        <Button
          size="sm"
          variant="ghost"
          className={cn("h-8", showTerminal ? "text-amber-400" : "text-slate-500")}
          onClick={() => setShowTerminal(!showTerminal)}
        >
          <TerminalIcon className="w-3.5 h-3.5" />
        </Button>
      </header>

      {/* ── Main content: code + preview ─────────────────────── */}
      <div className="flex-1 flex min-h-0">
        {/* Left: Code editor */}
        <div className="w-1/2 border-r border-slate-800 flex flex-col min-h-0">
          {/* File tab */}
          <div className="h-8 border-b border-slate-800 bg-slate-900/50 flex items-center px-2 gap-1 shrink-0">
            <button className="flex items-center gap-1 px-2 py-0.5 text-[11px] rounded bg-slate-800 text-amber-300 border border-slate-700">
              <FileCode className="w-3 h-3" />
              {activeFile}
            </button>
            <button
              className="flex items-center gap-1 px-2 py-0.5 text-[11px] rounded text-slate-500 hover:text-slate-300"
              onClick={() => {
                setActiveFile("package.json");
                const template = EDITOR_TEMPLATES.find(t => t.id === selectedTemplate) || EDITOR_TEMPLATES[0];
                const files = template.getFiles();
                setCode(files["package.json"].file.contents);
              }}
            >
              <Package className="w-3 h-3" />
              package.json
            </button>
          </div>

          <div className="flex-1 min-h-0">
            <Suspense fallback={<div className="p-4 text-slate-500">Loading editor...</div>}>
              <MonacoEditor
                height="100%"
                language={activeFile.endsWith(".json") ? "json" : "javascript"}
                theme="vs-dark"
                value={code}
                onChange={handleCodeChange}
                options={{
                  fontSize: 13,
                  minimap: { enabled: false },
                  lineNumbers: "on",
                  scrollBeyondLastLine: false,
                  wordWrap: "on",
                  tabSize: 2,
                  automaticLayout: true,
                  padding: { top: 8 },
                }}
              />
            </Suspense>
          </div>
        </div>

        {/* Right: Preview + Terminal */}
        <div className="w-1/2 flex flex-col min-h-0">
          {/* Preview */}
          <div className={cn("flex-1 bg-slate-950 relative min-h-0", showTerminal ? "" : "")}>
            {previewUrl ? (
              <iframe
                ref={iframeRef}
                src={previewUrl}
                className="w-full h-full border-0"
                allow="cross-origin-isolated"
                title="Grudge Scene Preview"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-600">
                <div className="text-center">
                  <Eye className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Click <strong>Run</strong> to start the live preview</p>
                  <p className="text-xs text-slate-700 mt-1">Full Node.js + npm runs in your browser</p>
                </div>
              </div>
            )}
          </div>

          {/* Terminal */}
          {showTerminal && (
            <div className="h-48 border-t border-slate-800 bg-black/80 flex flex-col shrink-0">
              <div className="h-7 border-b border-slate-800 bg-slate-900/50 flex items-center px-3 shrink-0">
                <TerminalIcon className="w-3 h-3 text-slate-500 mr-2" />
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Terminal</span>
              </div>
              <div className="flex-1 overflow-y-auto p-2 font-mono text-[11px] text-slate-400 leading-relaxed">
                {terminalOutput.length === 0 && (
                  <span className="text-slate-600">Waiting for commands...</span>
                )}
                {terminalOutput.map((line, i) => (
                  <div key={i} className={cn(
                    "whitespace-pre-wrap break-all",
                    line.startsWith("❌") && "text-red-400",
                    line.startsWith("✅") && "text-green-400",
                    line.startsWith("⚡") && "text-cyan-400",
                    line.startsWith("📦") && "text-blue-400",
                    line.startsWith("🚀") && "text-purple-400",
                    line.startsWith("💾") && "text-amber-400",
                    line.startsWith("⚠️") && "text-yellow-400",
                  )}>
                    {line}
                  </div>
                ))}
                <div ref={terminalEndRef} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
