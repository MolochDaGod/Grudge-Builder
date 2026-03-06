import { 
  professionActivities, 
  ProfessionKey, 
  ActivityType, 
  ACTIVITY_TYPE_LABELS, 
  ACTIVITY_TYPE_COLORS,
  getAllActivityTypes 
} from "@/data/crafting/professionActivities";
import { Pickaxe, Hammer, Target, Building2, Calendar, Swords, Compass } from "lucide-react";

const ACTIVITY_ICONS: Record<ActivityType, React.ReactNode> = {
  harvest: <Pickaxe className="w-4 h-4" />,
  craft: <Hammer className="w-4 h-4" />,
  mission: <Target className="w-4 h-4" />,
  supply: <Building2 className="w-4 h-4" />,
  event: <Calendar className="w-4 h-4" />,
  combat: <Swords className="w-4 h-4" />,
  discovery: <Compass className="w-4 h-4" />,
};

interface ActivitiesPanelProps {
  profession: ProfessionKey;
  accentColor?: string;
}

export function ActivitiesPanel({ profession, accentColor = "amber" }: ActivitiesPanelProps) {
  const activities = professionActivities[profession];
  const activityTypes = getAllActivityTypes(profession);

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/50 p-4 rounded-xl border border-white/10">
        <h3 className={`text-lg font-heading text-${accentColor}-400 mb-2`}>XP Activities</h3>
        <p className="text-xs text-slate-400">
          Complete these activities to earn profession XP and level up your {profession.charAt(0).toUpperCase() + profession.slice(1)} skills.
          Higher tier activities reward more XP.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {activityTypes.map((type) => {
          const typeActivities = activities.filter(a => a.activityType === type);
          return (
            <div 
              key={type} 
              className="bg-slate-900/30 rounded-xl border border-white/5 overflow-hidden"
              data-testid={`activities-section-${type}`}
            >
              <div className={`flex items-center gap-2 px-4 py-3 bg-slate-800/50 border-b border-white/5`}>
                <span className={ACTIVITY_TYPE_COLORS[type]}>{ACTIVITY_ICONS[type]}</span>
                <h4 className={`text-sm font-bold uppercase tracking-wider ${ACTIVITY_TYPE_COLORS[type]}`}>
                  {ACTIVITY_TYPE_LABELS[type]}
                </h4>
                <span className="ml-auto text-xs text-slate-500">{typeActivities.length} activities</span>
              </div>
              
              <div className="divide-y divide-white/5">
                {typeActivities.map((activity) => (
                  <div 
                    key={activity.id} 
                    className="px-4 py-3 hover:bg-white/5 transition-colors"
                    data-testid={`activity-item-${activity.id}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-white font-medium truncate">{activity.name}</span>
                          {activity.tierMultiplier && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded font-bold">
                              TIER×
                            </span>
                          )}
                          {!activity.repeatable && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded font-bold">
                              ONCE
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{activity.description}</p>
                        {activity.requirements && (
                          <p className="text-[10px] text-red-400 mt-1">Requires: {activity.requirements}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-sm font-bold text-green-400">+{activity.baseXp}</span>
                        <span className="text-[10px] text-slate-500">XP</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-slate-900/30 p-4 rounded-xl border border-white/5">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">XP Multipliers</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="bg-black/30 p-3 rounded-lg border border-white/5">
            <div className="text-amber-400 font-bold mb-1">Tier Bonus</div>
            <div className="text-slate-400">Activities marked <span className="text-amber-400">TIER×</span> multiply base XP by material tier (T1=×1, T8=×8)</div>
          </div>
          <div className="bg-black/30 p-3 rounded-lg border border-white/5">
            <div className="text-blue-400 font-bold mb-1">Mission Bonus</div>
            <div className="text-slate-400">Faction missions grant 2× XP during war time events</div>
          </div>
          <div className="bg-black/30 p-3 rounded-lg border border-white/5">
            <div className="text-green-400 font-bold mb-1">Guild Bonus</div>
            <div className="text-slate-400">+25% XP for activities done in guild territories</div>
          </div>
          <div className="bg-black/30 p-3 rounded-lg border border-white/5">
            <div className="text-purple-400 font-bold mb-1">First Time</div>
            <div className="text-slate-400">First completion of any activity grants 3× XP bonus</div>
          </div>
        </div>
      </div>
    </div>
  );
}
