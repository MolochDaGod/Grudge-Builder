/**
 * TutorialShell — composes Game HUD + Main Panel + Traveler missions.
 * Drop-in overlay for pages/tutorial.tsx.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { TutorialGameHUD } from './TutorialGameHUD';
import { TutorialMainPanel, type MainPanelTab } from './TutorialMainPanel';
import { useTravelerMissions } from './useTravelerMissions';
import type { ControlMode } from '@/components/TutorialGameplayHUD';
import type { HotbarSlot } from '@/lib/tutorialSkills';

export interface TutorialShellProps {
  characterName: string;
  raceId: string;
  classId: string;
  level: number;
  hp: number;
  maxHp: number;
  playMode: ControlMode;
  onModeChange: (m: ControlMode) => void;
  sticks: number;
  stones: number;
  inventory: string[];
  equippedMainHand: string | null;
  classHotbar: HotbarSlot[];
  weaponHotbar: HotbarSlot[];
  hasWeapon: boolean;
  notification: string | null;
  allyMessage: string | null;
  introActive?: boolean;
  onSkipIntro?: () => void;
  chunkHits?: { left: number; max: number } | null;
  onCraft: (recipeId: string) => void;
  onEquip: (itemId: string) => void;
  onUnequip: () => void;
  /** Server-authoritative raft launch/board after item_raft is crafted. */
  onBoardRaft?: () => void;
  /** Called whenever a Traveler step transitions to complete. */
  onMissionComplete?: (stepId: string, title: string) => void;
  /** Forward game events into mission machine */
  eventBridgeRef?: React.MutableRefObject<((e: Parameters<ReturnType<typeof useTravelerMissions>['onGameEvent']>[0]) => void) | null>;
  onAllMissionsComplete?: () => void;
}

export function TutorialShell(props: TutorialShellProps) {
  const missions = useTravelerMissions(props.raceId);
  const [panelOpen, setPanelOpen] = useState(false);
  const [tab, setTab] = useState<MainPanelTab>('quests');
  const reportedMissionIdsRef = useRef<Set<string>>(new Set());

  const openPanel = useCallback(
    (t: MainPanelTab = 'quests') => {
      setTab(t);
      setPanelOpen(true);
      missions.onGameEvent({
        type: 'panel_open',
        panel: t === 'character' ? 'main' : t,
      });
    },
    [missions],
  );

  useEffect(() => {
    if (props.eventBridgeRef) {
      props.eventBridgeRef.current = (e) => missions.onGameEvent(e);
    }
    return () => {
      if (props.eventBridgeRef) props.eventBridgeRef.current = null;
    };
  }, [missions, props.eventBridgeRef]);

  // Bridge the client Traveler state machine into the authoritative room. This
  // catches automatic steps (harvest counts, panel tour, combat) as well as the
  // explicit traveler interaction and prevents the server/client quest chains
  // from drifting apart.
  useEffect(() => {
    for (const step of missions.checklist) {
      if (!step.completed || reportedMissionIdsRef.current.has(step.id)) continue;
      reportedMissionIdsRef.current.add(step.id);
      props.onMissionComplete?.(step.id, step.title);
    }
  }, [missions.checklist, props.onMissionComplete]);

  useEffect(() => {
    if (missions.completedAll) {
      props.onAllMissionsComplete?.();
    }
  }, [missions.completedAll, props.onAllMissionsComplete]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;

      if (e.key === 'Escape') {
        if (panelOpen) {
          setPanelOpen(false);
          e.preventDefault();
        }
        return;
      }

      // Once the real coastal raft has been crafted, E is the canonical launch
      // and board action. This runs before the traveler interaction shortcut.
      if (e.key.toLowerCase() === 'e' && props.inventory.includes('raft') && props.onBoardRaft) {
        e.preventDefault();
        props.onBoardRaft();
        missions.onGameEvent({ type: 'board' });
        return;
      }

      const k = e.key.toUpperCase();
      if (k === 'P') {
        e.preventDefault();
        if (panelOpen) setPanelOpen(false);
        else openPanel('quests');
      } else if (k === 'I') {
        e.preventDefault();
        openPanel('inventory');
      } else if (k === 'K') {
        e.preventDefault();
        openPanel('skills');
      } else if (k === 'C' && !e.shiftKey) {
        if (panelOpen) {
          e.preventDefault();
          setTab('character');
          missions.onGameEvent({ type: 'panel_open', panel: 'main' });
        }
      } else if (k === 'L') {
        e.preventDefault();
        openPanel('quests');
      } else if (k === 'E' && missions.activeStep?.id === 'meet_traveler') {
        e.preventDefault();
        missions.completeStep('meet_traveler');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [panelOpen, openPanel, missions, props.inventory, props.onBoardRaft]);

  const talkTraveler = useCallback(() => {
    missions.completeStep('meet_traveler');
  }, [missions]);

  const raftReady = props.inventory.includes('raft');

  return (
    <>
      <TutorialGameHUD
        characterName={props.characterName}
        raceId={props.raceId}
        classId={props.classId}
        level={props.level}
        hp={props.hp}
        maxHp={props.maxHp}
        playMode={props.playMode}
        onModeChange={props.onModeChange}
        sticks={props.sticks}
        stones={props.stones}
        classHotbar={props.classHotbar}
        weaponHotbar={props.weaponHotbar}
        hasWeapon={props.hasWeapon}
        missions={missions}
        notification={props.notification}
        allyMessage={props.allyMessage}
        onOpenMainPanel={openPanel}
        onTalkTraveler={talkTraveler}
        introActive={props.introActive}
        onSkipIntro={props.onSkipIntro}
        chunkHits={props.chunkHits}
      />

      {raftReady && props.onBoardRaft && (
        <button
          type="button"
          onClick={() => {
            props.onBoardRaft?.();
            missions.onGameEvent({ type: 'board' });
          }}
          className="absolute bottom-28 left-1/2 z-[58] -translate-x-1/2 rounded-xl border border-cyan-400/60 bg-slate-950/90 px-5 py-3 text-sm font-black tracking-wide text-cyan-100 shadow-xl shadow-cyan-950/40 hover:bg-cyan-950/90"
        >
          Launch &amp; Board Coastal Raft · E
        </button>
      )}

      <TutorialMainPanel
        open={panelOpen}
        tab={tab}
        onTabChange={(t) => {
          setTab(t);
          missions.onGameEvent({
            type: 'panel_open',
            panel: t === 'character' ? 'main' : t,
          });
        }}
        onClose={() => setPanelOpen(false)}
        characterName={props.characterName}
        raceId={props.raceId}
        classId={props.classId}
        level={props.level}
        hp={props.hp}
        maxHp={props.maxHp}
        sticks={props.sticks}
        stones={props.stones}
        inventory={props.inventory}
        equippedMainHand={props.equippedMainHand}
        classHotbar={props.classHotbar}
        weaponHotbar={props.weaponHotbar}
        missions={missions}
        onCraft={(id) => {
          props.onCraft(id);
          missions.onGameEvent({ type: 'craft', itemId: id });
        }}
        onEquip={(id) => {
          props.onEquip(id);
          missions.onGameEvent({ type: 'equip', itemId: id });
        }}
        onUnequip={props.onUnequip}
      />
    </>
  );
}

export default TutorialShell;
