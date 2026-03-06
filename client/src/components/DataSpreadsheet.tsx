import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { HotTable, HotColumn } from "@handsontable/react";
import { registerAllModules } from "handsontable/registry";
import "handsontable/dist/handsontable.full.min.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, Save, RefreshCw, Wand2, Download, Upload, Plus, Trash2,
  Sword, Shield, Sparkles, Flame, Target, Package, Hammer, TreePine,
  FileText, Brain, Check, X, Loader2
} from "lucide-react";

registerAllModules();

interface SpreadsheetTab {
  id: string;
  name: string;
  icon: React.ReactNode;
  endpoint: string;
  columns: ColumnDef[];
}

interface ColumnDef {
  data: string;
  title: string;
  type?: string;
  width?: number;
  readOnly?: boolean;
  source?: string[];
  renderer?: string;
}

const RARITY_OPTIONS = ["Common", "Uncommon", "Rare", "Epic", "Legendary"];
const ITEM_TYPES = ["Weapon", "Armor", "Accessory", "Consumable", "Material", "Resource"];
const SLOT_OPTIONS = ["Head", "Chest", "Legs", "Feet", "MainHand", "OffHand", "Ring", "Amulet", "Back"];
const DAMAGE_TYPES = ["Physical", "Fire", "Ice", "Lightning", "Poison", "Holy", "Shadow", "Arcane"];
const ELEMENT_TYPES = ["None", "Fire", "Ice", "Lightning", "Earth", "Wind", "Water", "Light", "Dark"];

const SPREADSHEET_TABS: SpreadsheetTab[] = [
  {
    id: "items",
    name: "All Items",
    icon: <Package className="w-4 h-4" />,
    endpoint: "/api/admin/items",
    columns: [
      { data: "id", title: "ID", width: 80, readOnly: true },
      { data: "name", title: "Name", width: 180 },
      { data: "type", title: "Type", width: 100, type: "dropdown", source: ITEM_TYPES },
      { data: "slot", title: "Slot", width: 100, type: "dropdown", source: SLOT_OPTIONS },
      { data: "rarity", title: "Rarity", width: 100, type: "dropdown", source: RARITY_OPTIONS },
      { data: "tier", title: "Tier", width: 60, type: "numeric" },
      { data: "buyPrice", title: "Buy Price", width: 80, type: "numeric" },
      { data: "sellPrice", title: "Sell Price", width: 80, type: "numeric" },
      { data: "description", title: "Description", width: 250 },
      { data: "spriteId", title: "Sprite ID", width: 120 },
    ]
  },
  {
    id: "weapons",
    name: "Weapons",
    icon: <Sword className="w-4 h-4" />,
    endpoint: "/api/admin/weapons",
    columns: [
      { data: "id", title: "ID", width: 80, readOnly: true },
      { data: "name", title: "Name", width: 180 },
      { data: "weaponType", title: "Weapon Type", width: 120 },
      { data: "rarity", title: "Rarity", width: 100, type: "dropdown", source: RARITY_OPTIONS },
      { data: "tier", title: "Tier", width: 60, type: "numeric" },
      { data: "damage", title: "Damage", width: 80, type: "numeric" },
      { data: "damageType", title: "Damage Type", width: 100, type: "dropdown", source: DAMAGE_TYPES },
      { data: "critChance", title: "Crit %", width: 70, type: "numeric" },
      { data: "attackSpeed", title: "Atk Speed", width: 80, type: "numeric" },
      { data: "requiredLevel", title: "Req Level", width: 80, type: "numeric" },
      { data: "craftingLevel", title: "Craft Lvl", width: 80, type: "numeric" },
      { data: "spriteId", title: "Sprite", width: 120 },
    ]
  },
  {
    id: "armor",
    name: "Armor",
    icon: <Shield className="w-4 h-4" />,
    endpoint: "/api/admin/armor",
    columns: [
      { data: "id", title: "ID", width: 80, readOnly: true },
      { data: "name", title: "Name", width: 180 },
      { data: "slot", title: "Slot", width: 100, type: "dropdown", source: ["Head", "Chest", "Legs", "Feet", "Back"] },
      { data: "rarity", title: "Rarity", width: 100, type: "dropdown", source: RARITY_OPTIONS },
      { data: "tier", title: "Tier", width: 60, type: "numeric" },
      { data: "defense", title: "Defense", width: 80, type: "numeric" },
      { data: "resistance", title: "Resistance", width: 80, type: "numeric" },
      { data: "blockChance", title: "Block %", width: 80, type: "numeric" },
      { data: "material", title: "Material", width: 100 },
      { data: "requiredLevel", title: "Req Level", width: 80, type: "numeric" },
      { data: "spriteId", title: "Sprite", width: 120 },
    ]
  },
  {
    id: "spells",
    name: "Spells",
    icon: <Sparkles className="w-4 h-4" />,
    endpoint: "/api/admin/spells",
    columns: [
      { data: "id", title: "ID", width: 80, readOnly: true },
      { data: "name", title: "Name", width: 150 },
      { data: "element", title: "Element", width: 100, type: "dropdown", source: ELEMENT_TYPES },
      { data: "baseDamage", title: "Base DMG", width: 80, type: "numeric" },
      { data: "manaCost", title: "Mana", width: 70, type: "numeric" },
      { data: "cooldown", title: "CD (s)", width: 70, type: "numeric" },
      { data: "castTime", title: "Cast (s)", width: 70, type: "numeric" },
      { data: "range", title: "Range", width: 70, type: "numeric" },
      { data: "aoe", title: "AoE", width: 60, type: "checkbox" },
      { data: "description", title: "Description", width: 250 },
      { data: "effectId", title: "Effect", width: 120 },
    ]
  },
  {
    id: "skills",
    name: "Class Skills",
    icon: <Target className="w-4 h-4" />,
    endpoint: "/api/admin/skills",
    columns: [
      { data: "id", title: "ID", width: 80, readOnly: true },
      { data: "name", title: "Name", width: 150 },
      { data: "classId", title: "Class", width: 100 },
      { data: "tier", title: "Tier", width: 60, type: "numeric" },
      { data: "unlockLevel", title: "Unlock Lvl", width: 80, type: "numeric" },
      { data: "type", title: "Type", width: 100 },
      { data: "cooldown", title: "CD (s)", width: 70, type: "numeric" },
      { data: "energyCost", title: "Energy", width: 70, type: "numeric" },
      { data: "effect", title: "Effect", width: 200 },
      { data: "description", title: "Description", width: 250 },
    ]
  },
  {
    id: "monsters",
    name: "Monsters",
    icon: <Flame className="w-4 h-4" />,
    endpoint: "/api/admin/monsters",
    columns: [
      { data: "id", title: "ID", width: 80, readOnly: true },
      { data: "name", title: "Name", width: 150 },
      { data: "type", title: "Type", width: 100 },
      { data: "level", title: "Level", width: 60, type: "numeric" },
      { data: "hp", title: "HP", width: 80, type: "numeric" },
      { data: "damage", title: "Damage", width: 80, type: "numeric" },
      { data: "defense", title: "Defense", width: 80, type: "numeric" },
      { data: "xpReward", title: "XP", width: 70, type: "numeric" },
      { data: "goldReward", title: "Gold", width: 70, type: "numeric" },
      { data: "dropTable", title: "Drop Table", width: 150 },
      { data: "spriteId", title: "Sprite", width: 120 },
    ]
  },
  {
    id: "harvestables",
    name: "Harvestables",
    icon: <TreePine className="w-4 h-4" />,
    endpoint: "/api/admin/harvestables",
    columns: [
      { data: "id", title: "ID", width: 80, readOnly: true },
      { data: "name", title: "Name", width: 150 },
      { data: "type", title: "Type", width: 100 },
      { data: "profession", title: "Profession", width: 100 },
      { data: "requiredLevel", title: "Req Level", width: 80, type: "numeric" },
      { data: "harvestTime", title: "Time (s)", width: 80, type: "numeric" },
      { data: "staminaCost", title: "Stamina", width: 80, type: "numeric" },
      { data: "baseYield", title: "Base Yield", width: 80, type: "numeric" },
      { data: "rarity", title: "Rarity", width: 100, type: "dropdown", source: RARITY_OPTIONS },
      { data: "spriteId", title: "Sprite", width: 120 },
    ]
  },
  {
    id: "recipes",
    name: "Recipes",
    icon: <Hammer className="w-4 h-4" />,
    endpoint: "/api/admin/recipes",
    columns: [
      { data: "id", title: "ID", width: 80, readOnly: true },
      { data: "name", title: "Name", width: 150 },
      { data: "profession", title: "Profession", width: 100 },
      { data: "requiredLevel", title: "Req Level", width: 80, type: "numeric" },
      { data: "outputItemId", title: "Output Item", width: 120 },
      { data: "outputQuantity", title: "Output Qty", width: 80, type: "numeric" },
      { data: "craftTime", title: "Time (s)", width: 80, type: "numeric" },
      { data: "successChance", title: "Success %", width: 80, type: "numeric" },
      { data: "xpReward", title: "XP", width: 70, type: "numeric" },
      { data: "ingredients", title: "Ingredients (JSON)", width: 200 },
    ]
  },
  {
    id: "attributes",
    name: "Attributes",
    icon: <FileText className="w-4 h-4" />,
    endpoint: "/api/admin/attributes",
    columns: [
      { data: "id", title: "ID", width: 80, readOnly: true },
      { data: "name", title: "Name", width: 120 },
      { data: "shortName", title: "Short", width: 60 },
      { data: "description", title: "Description", width: 250 },
      { data: "baseValue", title: "Base", width: 70, type: "numeric" },
      { data: "maxValue", title: "Max", width: 70, type: "numeric" },
      { data: "perPointBonus", title: "Per Point", width: 100 },
      { data: "diminishingThreshold", title: "DR Threshold", width: 100, type: "numeric" },
    ]
  },
];

interface AIEditDialogProps {
  open: boolean;
  onClose: () => void;
  onApply: (changes: Record<string, unknown>[]) => void;
  currentData: Record<string, unknown>[];
  tabName: string;
}

function AIEditDialog({ open, onClose, onApply, currentData, tabName }: AIEditDialogProps) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<Record<string, unknown>[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);
    setPreview(null);

    try {
      const response = await fetch("/api/admin/ai-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          tabName,
          currentData: currentData.slice(0, 50),
        }),
      });

      if (!response.ok) throw new Error("AI edit failed");
      
      const result = await response.json();
      setPreview(result.changes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate changes");
      toast({
        title: "AI Edit Failed",
        description: "Could not generate changes from your prompt",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (preview) {
      onApply(preview);
      onClose();
      setPrompt("");
      setPreview(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Brain className="w-5 h-5 text-purple-400" />
            AI-Assisted Edit - {tabName}
          </DialogTitle>
          <DialogDescription>
            Describe the changes you want to make in natural language
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Textarea
            placeholder="Example: Add 20% more damage to all legendary weapons, or Create 5 new fire spells at tier 3..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-[100px] bg-slate-800 border-slate-600"
            data-testid="ai-edit-prompt"
          />

          <Button
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            className="w-full bg-purple-600 hover:bg-purple-700"
            data-testid="btn-generate-changes"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
            ) : (
              <><Wand2 className="w-4 h-4 mr-2" /> Generate Changes</>
            )}
          </Button>

          {error && (
            <div className="p-3 bg-red-900/50 border border-red-700 rounded text-red-300 text-sm">
              {error}
            </div>
          )}

          {preview && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-white">Preview Changes ({preview.length} rows)</div>
              <ScrollArea className="h-[200px] bg-slate-800 rounded border border-slate-700 p-2">
                <pre className="text-xs text-slate-300">
                  {JSON.stringify(preview, null, 2)}
                </pre>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          {preview && (
            <Button onClick={handleApply} className="bg-green-600 hover:bg-green-700">
              <Check className="w-4 h-4 mr-2" /> Apply Changes
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DataSpreadsheet() {
  const [activeTab, setActiveTab] = useState("items");
  const [data, setData] = useState<Record<string, Record<string, unknown>[]>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [hasChanges, setHasChanges] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const { toast } = useToast();
  const hotTableRef = useRef<any>(null);

  const currentTab = useMemo(() => 
    SPREADSHEET_TABS.find(t => t.id === activeTab) || SPREADSHEET_TABS[0],
    [activeTab]
  );

  const dialogData = useMemo(() => 
    data[activeTab] || [],
    [data, activeTab]
  );

  const loadTabData = useCallback(async (tabId: string) => {
    const tab = SPREADSHEET_TABS.find(t => t.id === tabId);
    if (!tab) return;

    setLoading(prev => ({ ...prev, [tabId]: true }));
    
    try {
      const response = await fetch(tab.endpoint);
      if (response.ok) {
        const result = await response.json();
        setData(prev => ({ ...prev, [tabId]: result.data || result }));
      } else {
        setData(prev => ({ ...prev, [tabId]: generateMockData(tabId, 50) }));
      }
    } catch {
      setData(prev => ({ ...prev, [tabId]: generateMockData(tabId, 50) }));
    } finally {
      setLoading(prev => ({ ...prev, [tabId]: false }));
    }
  }, []);

  useEffect(() => {
    if (!data[activeTab] && !loading[activeTab]) {
      loadTabData(activeTab);
    }
  }, [activeTab, data, loading, loadTabData]);

  const filteredData = useMemo(() => {
    const tabData = data[activeTab] || [];
    if (!searchTerm) return tabData;
    
    return tabData.filter(row => 
      Object.values(row).some(val => 
        String(val).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [data, activeTab, searchTerm]);

  const handleChange = useCallback((changes: any, source: string) => {
    if (source === "loadData" || source === "updateData" || !changes || changes.length === 0) return;
    if (source === "edit" || source === "paste" || source === "autofill") {
      setHasChanges(prev => ({ ...prev, [activeTab]: true }));
    }
  }, [activeTab]);

  const handleSave = async () => {
    const tab = currentTab;
    const tabData = data[activeTab];
    
    try {
      const response = await fetch(tab.endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: tabData }),
      });

      if (response.ok) {
        setHasChanges(prev => ({ ...prev, [activeTab]: false }));
        toast({
          title: "Saved Successfully",
          description: `${tab.name} data has been saved to the database`,
        });
      } else {
        throw new Error("Save failed");
      }
    } catch {
      toast({
        title: "Save Failed",
        description: "Could not save changes. Data saved locally only.",
        variant: "destructive",
      });
    }
  };

  const handleAddRow = () => {
    const newRow: Record<string, unknown> = {};
    currentTab.columns.forEach(col => {
      newRow[col.data] = col.type === "numeric" ? 0 : col.type === "checkbox" ? false : "";
    });
    newRow.id = `new_${Date.now()}`;
    
    setData(prev => ({
      ...prev,
      [activeTab]: [...(prev[activeTab] || []), newRow]
    }));
    setHasChanges(prev => ({ ...prev, [activeTab]: true }));
  };

  const handleAIApply = (changes: Record<string, unknown>[]) => {
    setData(prev => ({
      ...prev,
      [activeTab]: changes
    }));
    setHasChanges(prev => ({ ...prev, [activeTab]: true }));
    toast({
      title: "AI Changes Applied",
      description: `${changes.length} rows have been updated`,
    });
  };

  const handleExport = () => {
    const tabData = data[activeTab] || [];
    const csv = convertToCSV(tabData, currentTab.columns);
    downloadFile(csv, `${activeTab}_export.csv`, "text/csv");
  };

  return (
    <div className="space-y-4">
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-amber-400" />
                Game Data Spreadsheet
              </CardTitle>
              <CardDescription>
                Edit game prefabs, assets, and configurations with AI assistance
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {hasChanges[activeTab] && (
                <Badge className="bg-amber-600">Unsaved Changes</Badge>
              )}
              <Badge className="bg-slate-700">
                {filteredData.length} rows
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-slate-900 flex-wrap h-auto gap-1 p-1">
              {SPREADSHEET_TABS.map(tab => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="gap-1.5 text-xs"
                  data-testid={`spreadsheet-tab-${tab.id}`}
                >
                  {tab.icon}
                  {tab.name}
                  {hasChanges[tab.id] && (
                    <span className="w-2 h-2 bg-amber-500 rounded-full" />
                  )}
                </TabsTrigger>
              ))}
            </TabsList>

            <div className="flex items-center gap-2 mt-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search across all columns..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-10 bg-slate-900 border-slate-600"
                  data-testid="spreadsheet-search"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAiDialogOpen(true)}
                className="gap-1.5"
                data-testid="btn-ai-edit"
              >
                <Wand2 className="w-4 h-4" />
                AI Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddRow}
                className="gap-1.5"
                data-testid="btn-add-row"
              >
                <Plus className="w-4 h-4" />
                Add Row
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadTabData(activeTab)}
                className="gap-1.5"
                data-testid="btn-refresh-data"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                className="gap-1.5"
                data-testid="btn-export-csv"
              >
                <Download className="w-4 h-4" />
              </Button>
              <Button
                onClick={handleSave}
                disabled={!hasChanges[activeTab]}
                className="gap-1.5 bg-green-600 hover:bg-green-700"
                data-testid="btn-save-changes"
              >
                <Save className="w-4 h-4" />
                Save
              </Button>
            </div>

            {SPREADSHEET_TABS.map(tab => (
              <TabsContent key={tab.id} value={tab.id} className="mt-4">
                {loading[tab.id] ? (
                  <div className="flex items-center justify-center h-[400px] bg-slate-900 rounded border border-slate-700">
                    <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
                  </div>
                ) : (
                  <div className="rounded border border-slate-700 overflow-hidden">
                    <HotTable
                      ref={hotTableRef}
                      data={filteredData as any}
                      colHeaders={tab.columns.map(c => c.title)}
                      columns={tab.columns.map(col => ({
                        data: col.data,
                        type: col.type || "text",
                        source: col.source,
                        readOnly: col.readOnly,
                        width: col.width,
                      }))}
                      rowHeaders={true}
                      height={450}
                      width="100%"
                      licenseKey="non-commercial-and-evaluation"
                      stretchH="all"
                      contextMenu={true}
                      manualColumnResize={true}
                      manualRowResize={true}
                      filters={true}
                      dropdownMenu={true}
                      afterChange={handleChange}
                      className="htDark"
                    />
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {aiDialogOpen && (
        <AIEditDialog
          open={aiDialogOpen}
          onClose={() => setAiDialogOpen(false)}
          onApply={handleAIApply}
          currentData={dialogData}
          tabName={currentTab.name}
        />
      )}
    </div>
  );
}

function generateMockData(tabId: string, count: number): Record<string, unknown>[] {
  const tab = SPREADSHEET_TABS.find(t => t.id === tabId);
  if (!tab) return [];

  return Array.from({ length: count }, (_, i) => {
    const row: Record<string, unknown> = {};
    tab.columns.forEach(col => {
      if (col.data === "id") row[col.data] = i + 1;
      else if (col.data === "name") row[col.data] = `${tabId.slice(0, -1)} ${i + 1}`;
      else if (col.type === "numeric") row[col.data] = Math.floor(Math.random() * 100);
      else if (col.type === "checkbox") row[col.data] = Math.random() > 0.5;
      else if (col.source) row[col.data] = col.source[Math.floor(Math.random() * col.source.length)];
      else row[col.data] = "";
    });
    return row;
  });
}

function convertToCSV(data: Record<string, unknown>[], columns: ColumnDef[]): string {
  const headers = columns.map(c => c.title).join(",");
  const rows = data.map(row => 
    columns.map(col => {
      const val = row[col.data];
      if (typeof val === "string" && (val.includes(",") || val.includes('"') || val.includes("\n"))) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return String(val ?? "");
    }).join(",")
  );
  return [headers, ...rows].join("\n");
}

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
