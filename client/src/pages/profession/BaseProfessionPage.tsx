import { useState } from "react";
import { useLocation } from "wouter";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeft, TreeDeciduous, Hammer, Sparkles, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProfessionData } from "@/lib/craftingTypes";
import { CraftingInterface } from "@/components/profession/CraftingInterface";
import { UpgradeInterface } from "@/components/profession/UpgradeInterface";
import { ActivitiesPanel } from "@/components/profession/ActivitiesPanel";
import { TreeVisualizer } from "@/components/profession/TreeVisualizer";
import { ProfessionKey } from "@/data/crafting/professionActivities";

type AccentColor = "amber" | "green" | "purple" | "orange" | "slate";

const ACCENT_STYLES: Record<AccentColor, { active: string; text: string }> = {
  amber: {
    active: "data-[state=active]:bg-gradient-to-b data-[state=active]:from-amber-500/30 data-[state=active]:to-amber-600/20 data-[state=active]:text-amber-400 data-[state=active]:border-amber-500/50",
    text: "text-amber-400",
  },
  green: {
    active: "data-[state=active]:bg-gradient-to-b data-[state=active]:from-green-500/30 data-[state=active]:to-green-600/20 data-[state=active]:text-green-400 data-[state=active]:border-green-500/50",
    text: "text-green-400",
  },
  purple: {
    active: "data-[state=active]:bg-gradient-to-b data-[state=active]:from-purple-500/30 data-[state=active]:to-purple-600/20 data-[state=active]:text-purple-400 data-[state=active]:border-purple-500/50",
    text: "text-purple-400",
  },
  orange: {
    active: "data-[state=active]:bg-gradient-to-b data-[state=active]:from-orange-500/30 data-[state=active]:to-orange-600/20 data-[state=active]:text-orange-400 data-[state=active]:border-orange-500/50",
    text: "text-orange-400",
  },
  slate: {
    active: "data-[state=active]:bg-gradient-to-b data-[state=active]:from-slate-500/30 data-[state=active]:to-slate-600/20 data-[state=active]:text-slate-300 data-[state=active]:border-slate-500/50",
    text: "text-slate-300",
  },
};

interface BaseProfessionPageProps {
  data: ProfessionData;
  professionKey: ProfessionKey;
  accentColor?: AccentColor;
  craftingLabel?: string;
}

export function BaseProfessionPage({ 
  data, 
  professionKey,
  accentColor = "amber",
  craftingLabel = "Crafting"
}: BaseProfessionPageProps) {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("crafting");

  const tabs = [
    { value: "skill-tree", label: "Skill Tree", icon: TreeDeciduous },
    { value: "crafting", label: craftingLabel, icon: Hammer },
    { value: "upgrades", label: "Upgrades", icon: Sparkles },
    { value: "activities", label: "XP Activities", icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/professions")}
              className="text-slate-400 hover:text-white"
              data-testid="button-back"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <div className="flex items-center gap-3">
              <span className="text-3xl">{data.icon}</span>
              <div>
                <h1 className={`text-2xl font-heading font-bold ${data.color}`} data-testid="profession-title">
                  {data.name}
                </h1>
                <p className="text-xs text-slate-400">{data.role}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <div className="bg-black/30 border border-white/10 rounded-lg px-3 py-2">
              <span className="text-slate-400">Level: </span>
              <span className={`font-bold ${data.color}`}>1</span>
            </div>
            <div className="bg-black/30 border border-white/10 rounded-lg px-3 py-2">
              <span className="text-slate-400">XP: </span>
              <span className="text-white font-bold">0 / 100</span>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full bg-slate-900/50 border border-white/10 rounded-xl p-1 mb-6">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-3 transition-all rounded-lg",
                  ACCENT_STYLES[accentColor].active
                )}
                data-testid={`tab-${tab.value}`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="skill-tree" className="mt-0">
            <Card className="bg-slate-900/30 border-white/10 p-6 rounded-xl">
              <div className="h-[600px]">
                <TreeVisualizer 
                  nodes={data.treeData} 
                  color={accentColor}
                  profession={professionKey}
                  bgImage={data.bgImage}
                />
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="crafting" className="mt-0">
            <CraftingInterface data={data} />
          </TabsContent>

          <TabsContent value="upgrades" className="mt-0">
            <UpgradeInterface data={data} />
          </TabsContent>

          <TabsContent value="activities" className="mt-0">
            <ActivitiesPanel profession={professionKey} accentColor={accentColor} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
