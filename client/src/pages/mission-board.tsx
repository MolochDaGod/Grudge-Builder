import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/contexts/AdminContext";
import {
  Sword, Shield, Scroll, MapPin, Users, Star, Clock, 
  ChevronRight, Trophy, Sparkles, Crown, Skull, Flame,
  ArrowLeft, Filter
} from "lucide-react";
import { assetUrl } from "@/lib/assetConfig";
import { useAuthGuard } from '@/hooks/use-auth-guard';

interface Mission {
  id: string;
  title: string;
  description: string;
  missionType: string;
  factionId: string | null;
  minLevel: number;
  maxLevel: number | null;
  objectives: Array<{ id: string; description: string; type: string }>;
  rewards: {
    xp: number;
    gold: number;
    items: Array<{ itemId: string; quantity: number }>;
    reputationChanges?: Array<{ factionId: string; change: number }>;
  };
  status: string;
  isBoss?: boolean;
}

interface LoreEntity {
  id: string;
  name: string;
  entityType: string;
  description: string;
  title?: string;
  domain?: string;
  patronGodId?: string;
}

interface MissionProgress {
  id: string;
  missionId: string;
  status: string;
  objectivesCompleted: string[];
  attemptCount: number;
  acceptedAt: number | null;
}

const MissionTypeIcon: Record<string, React.ElementType> = {
  story: Crown,
  side: Scroll,
  daily: Star,
  dungeon: Skull,
  raid: Flame,
};

const DifficultyColors: Record<number, string> = {
  1: "bg-green-500/20 text-green-400 border-green-500/30",
  2: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  3: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  4: "bg-red-500/20 text-red-400 border-red-500/30",
  5: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

function MissionCard({ 
  mission, 
  factions, 
  isAccepted,
  onAccept 
}: { 
  mission: Mission; 
  factions: LoreEntity[];
  isAccepted: boolean;
  onAccept: (missionId: string) => void;
}) {
  const faction = factions.find(f => f.id === mission.factionId);
  const TypeIcon = MissionTypeIcon[mission.missionType] || Scroll;
  const difficulty = Math.min(5, Math.ceil((mission.minLevel || 1) / 4));
  const isBossMission = mission.isBoss || mission.missionType === 'raid' || difficulty >= 5;

  return (
    <Card 
      className={`bg-slate-800/50 border-slate-600 hover:border-amber-500/50 transition-all group ${
        isBossMission ? 'ring-1 ring-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.2)]' : ''
      }`}
      data-testid={`card-mission-${mission.id}`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {isBossMission ? (
              <img 
                src={assetUrl("/sprites/ui/boss-indicator.png")} 
                alt="Boss" 
                className="w-6 h-6"
                style={{ filter: 'drop-shadow(0 0 4px rgba(168, 85, 247, 0.6))' }}
              />
            ) : (
              <TypeIcon className="w-5 h-5 text-amber-400" />
            )}
            <Badge variant="outline" className={isBossMission ? "bg-purple-500/20 text-purple-400 border-purple-500/30" : DifficultyColors[difficulty]}>
              {isBossMission ? "BOSS" : `Tier ${difficulty}`}
            </Badge>
          </div>
          {faction && (
            <Badge variant="secondary" className="bg-slate-700">
              {faction.name}
            </Badge>
          )}
        </div>
        <CardTitle className={`group-hover:text-amber-400 transition-colors mt-2 ${isBossMission ? 'text-purple-200' : 'text-amber-100'}`}>
          {isBossMission && <span className="text-yellow-400">★ </span>}
          {mission.title}
        </CardTitle>
        <CardDescription className="text-slate-400 line-clamp-2">
          {mission.description}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pb-2">
        <div className="flex items-center gap-4 text-sm text-slate-300">
          <div className="flex items-center gap-1">
            <Shield className="w-4 h-4 text-blue-400" />
            <span>Lvl {mission.minLevel}{mission.maxLevel ? `-${mission.maxLevel}` : "+"}</span>
          </div>
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 text-yellow-400" />
            <span>{mission.rewards?.xp || 0} XP</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-amber-400">⛁</span>
            <span>{mission.rewards?.gold || 0}</span>
          </div>
        </div>
        
        {mission.objectives && mission.objectives.length > 0 && (
          <div className="mt-3 space-y-1">
            <p className="text-xs font-medium text-slate-400 uppercase">Objectives</p>
            {mission.objectives.slice(0, 2).map((obj, idx) => (
              <div key={obj.id || idx} className="flex items-center gap-2 text-sm text-slate-300">
                <ChevronRight className="w-3 h-3 text-amber-400" />
                <span className="line-clamp-1">{obj.description}</span>
              </div>
            ))}
            {mission.objectives.length > 2 && (
              <p className="text-xs text-slate-500">+{mission.objectives.length - 2} more objectives</p>
            )}
          </div>
        )}
      </CardContent>
      
      <CardFooter className="pt-2">
        <Button 
          onClick={() => onAccept(mission.id)}
          disabled={isAccepted}
          className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:opacity-50"
          data-testid={`button-accept-mission-${mission.id}`}
        >
          {isAccepted ? (
            <>
              <Clock className="w-4 h-4 mr-2" />
              In Progress
            </>
          ) : (
            <>
              <Sword className="w-4 h-4 mr-2" />
              Accept Quest
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}

function ActiveMissionCard({ 
  progress, 
  mission,
  onStartChallenge
}: { 
  progress: MissionProgress; 
  mission: Mission | undefined;
  onStartChallenge: (missionId: string) => void;
}) {
  if (!mission) return null;
  
  const completedCount = progress.objectivesCompleted?.length || 0;
  const totalCount = mission.objectives?.length || 1;
  const progressPercent = (completedCount / totalCount) * 100;
  const isDungeonMission = mission.missionType === "dungeon" || mission.missionType === "raid";

  return (
    <Card 
      className="bg-gradient-to-br from-slate-800 to-slate-900 border-amber-500/30"
      data-testid={`card-active-mission-${mission.id}`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
            Active
          </Badge>
          <span className="text-xs text-slate-400">
            Attempt #{progress.attemptCount}
          </span>
        </div>
        <CardTitle className="text-amber-100 mt-2">{mission.title}</CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-slate-400">Progress</span>
              <span className="text-amber-400">{completedCount}/{totalCount}</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
          
          {mission.objectives && mission.objectives.length > 0 && (
            <div className="space-y-2">
              {mission.objectives.map((obj, idx) => {
                const isCompleted = progress.objectivesCompleted?.includes(obj.id);
                return (
                  <div 
                    key={obj.id || idx} 
                    className={`flex items-center gap-2 text-sm ${isCompleted ? 'text-green-400' : 'text-slate-300'}`}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      isCompleted ? 'border-green-400 bg-green-400/20' : 'border-slate-500'
                    }`}>
                      {isCompleted && <span className="text-xs">✓</span>}
                    </div>
                    <span className={isCompleted ? 'line-through' : ''}>{obj.description}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="flex flex-col gap-2">
        {isDungeonMission && (
          <Button 
            onClick={() => onStartChallenge(mission.id)}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500"
            data-testid={`button-start-challenge-${mission.id}`}
          >
            <Sword className="w-4 h-4 mr-2" />
            Enter Combat
          </Button>
        )}
        <div className="flex gap-2 w-full">
          <Button 
            variant="outline" 
            className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10"
            data-testid={`button-abandon-mission-${mission.id}`}
          >
            Abandon
          </Button>
          <Button 
            className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600"
            data-testid={`button-track-mission-${mission.id}`}
          >
            <MapPin className="w-4 h-4 mr-2" />
            Track
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

export default function MissionBoardPage() {
  const authReady = useAuthGuard();
  if (!authReady) return null;

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAdmin } = useAdmin();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("available");
  const [filterFaction, setFilterFaction] = useState<string | null>(null);
  
  const headers: Record<string, string> = isAdmin ? { "x-admin-mode": "true" } : {};

  const handleStartChallenge = (missionId: string) => {
    setLocation(`/combat?mission=${missionId}`);
  };

  const { data: missions = [], isLoading: loadingMissions } = useQuery<Mission[]>({
    queryKey: ["/api/game/missions", filterFaction],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("status", "active");
      if (filterFaction) params.append("factionId", filterFaction);
      const res = await fetch(`/api/game/missions?${params}`, { headers });
      return res.json();
    },
  });

  const { data: factions = [] } = useQuery<LoreEntity[]>({
    queryKey: ["/api/game/factions/list"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/game/factions/list", { headers });
        if (!res.ok) return [];
        const data = await res.json();
        // Backend returns { factions: ['pirate','undead','elven','orcish'] }
        return (data.factions || []).map((f: string) => ({ id: f, name: f, type: 'faction' }));
      } catch { return []; }
    },
  });

  // Backend missions route: GET /missions returns user's missions (JWT-scoped)
  const { data: playerProgress = [] } = useQuery<MissionProgress[]>({
    queryKey: ["/api/game/missions", "player"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/game/missions", { headers });
        if (!res.ok) return [];
        return res.json();
      } catch { return []; }
    },
  });

  const acceptMutation = useMutation({
    mutationFn: async (missionId: string) => {
      // Backend: POST /missions creates a new mission for the user
      const res = await fetch(`/api/game/missions`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ title: `Mission ${missionId}`, type: 'fighting' }),
      });
      if (!res.ok) throw new Error("Failed to accept mission");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/game/missions"] });
      toast({
        title: "Quest Accepted!",
        description: "Your journey awaits. Check the tracker for objectives.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Accept Quest",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const activeMissions = playerProgress.filter(p => 
    p.status === "accepted" || p.status === "in_progress"
  );
  const completedMissions = playerProgress.filter(p => p.status === "completed");

  const acceptedMissionIds = new Set(activeMissions.map(p => p.missionId));

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/home">
              <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-amber-100 flex items-center gap-2">
                <Scroll className="w-8 h-8 text-amber-400" />
                Mission Board
              </h1>
              <p className="text-slate-400">Accept quests and embark on adventures</p>
            </div>
          </div>
          
          {isAdmin && (
            <Link href="/admin">
              <Button variant="outline" className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10">
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Missions
              </Button>
            </Link>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-slate-800 border border-slate-700">
            <TabsTrigger 
              value="available" 
              className="data-[state=active]:bg-amber-600"
              data-testid="tab-available-missions"
            >
              <Scroll className="w-4 h-4 mr-2" />
              Available ({missions.length})
            </TabsTrigger>
            <TabsTrigger 
              value="active" 
              className="data-[state=active]:bg-amber-600"
              data-testid="tab-active-missions"
            >
              <Sword className="w-4 h-4 mr-2" />
              Active ({activeMissions.length})
            </TabsTrigger>
            <TabsTrigger 
              value="completed" 
              className="data-[state=active]:bg-amber-600"
              data-testid="tab-completed-missions"
            >
              <Trophy className="w-4 h-4 mr-2" />
              Completed ({completedMissions.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="available" className="space-y-6">
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="w-4 h-4 text-slate-400" />
              <Button
                variant={filterFaction === null ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterFaction(null)}
                className={filterFaction === null ? "bg-amber-600" : "border-slate-600"}
                data-testid="filter-all-factions"
              >
                All Factions
              </Button>
              {factions.map(faction => (
                <Button
                  key={faction.id}
                  variant={filterFaction === faction.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterFaction(faction.id)}
                  className={filterFaction === faction.id ? "bg-amber-600" : "border-slate-600"}
                  data-testid={`filter-faction-${faction.id}`}
                >
                  {faction.name}
                </Button>
              ))}
            </div>

            {loadingMissions ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" />
              </div>
            ) : missions.length === 0 ? (
              <Card className="bg-slate-800/50 border-slate-600">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Scroll className="w-16 h-16 text-slate-500 mb-4" />
                  <h3 className="text-xl font-semibold text-slate-300 mb-2">No Missions Available</h3>
                  <p className="text-slate-400 text-center max-w-md">
                    {isAdmin 
                      ? "Use the AI generator to create new missions for adventurers."
                      : "Check back later for new quests, brave adventurer."}
                  </p>
                  {isAdmin && (
                    <Link href="/admin">
                      <Button className="mt-4 bg-gradient-to-r from-purple-600 to-indigo-600">
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate Missions
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {missions.map(mission => (
                  <MissionCard
                    key={mission.id}
                    mission={mission}
                    factions={factions}
                    isAccepted={acceptedMissionIds.has(mission.id)}
                    onAccept={(id) => acceptMutation.mutate(id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="active" className="space-y-4">
            {activeMissions.length === 0 ? (
              <Card className="bg-slate-800/50 border-slate-600">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Sword className="w-16 h-16 text-slate-500 mb-4" />
                  <h3 className="text-xl font-semibold text-slate-300 mb-2">No Active Missions</h3>
                  <p className="text-slate-400">Accept a quest from the mission board to begin.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeMissions.map(progress => {
                  const mission = missions.find(m => m.id === progress.missionId);
                  return (
                    <ActiveMissionCard
                      key={progress.id}
                      progress={progress}
                      mission={mission}
                      onStartChallenge={handleStartChallenge}
                    />
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {completedMissions.length === 0 ? (
              <Card className="bg-slate-800/50 border-slate-600">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Trophy className="w-16 h-16 text-slate-500 mb-4" />
                  <h3 className="text-xl font-semibold text-slate-300 mb-2">No Completed Missions</h3>
                  <p className="text-slate-400">Complete quests to earn rewards and glory!</p>
                </CardContent>
              </Card>
            ) : (
              <ScrollArea className="h-[600px]">
                <div className="space-y-2">
                  {completedMissions.map(progress => {
                    const mission = missions.find(m => m.id === progress.missionId);
                    if (!mission) return null;
                    return (
                      <Card 
                        key={progress.id} 
                        className="bg-slate-800/30 border-slate-700"
                        data-testid={`card-completed-mission-${mission.id}`}
                      >
                        <CardContent className="flex items-center justify-between p-4">
                          <div className="flex items-center gap-3">
                            <Trophy className="w-5 h-5 text-yellow-400" />
                            <div>
                              <p className="font-medium text-slate-200">{mission.title}</p>
                              <p className="text-sm text-slate-400">
                                {mission.rewards?.xp || 0} XP earned
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30">
                            Completed
                          </Badge>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
