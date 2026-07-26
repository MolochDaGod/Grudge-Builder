/**
 * TutorialShell — composes Game HUD + Main Panel + Traveler missions.
 * Drop-in overlay for pages/tutorial.tsx (client.grudge-studio.com/tutorial).
 */
import { useCallback, useEffect, useState } from 'react';
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
  /** Called when traveler mission advances */
  onMissionComplete?: (stepId: string, title: string) => void;
  /** Forward game events into mission machine */
  eventBridgeRef?: React.MutableRefObject<((e: Parameters<ReturnType<typeof useTravelerMissions>['onGameEvent']>[0]) => void) | null>;
  onAllMissionsComplete?: () => void;
}

export function TutorialShell(props: TutorialShellProps) {
  const missions = useTravelerMissions(props.raceId);
  const [panelOpen, setPanelOpen] = useState(false);
  const [tab, setTab] = useState<MainPanelTab>('quests');

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

  // Expose event bridge to parent (harvest/craft hooks)
  useEffect(() => {
    if (props.eventBridgeRef) {
      props.eventBridgeRef.current = (e) => missions.onGameEvent(e);
    }
    return () => {
      if (props.eventBridgeRef) props.eventBridgeRef.current = null;
    };
  }, [missions, props.eventBridgeRef]);

  // Notify parent of step completions via checklist transitions
  useEffect(() => {
    if (missions.completedAll) {
      props.onAllMissionsComplete?.();
    }
  }, [missions.completedAll, props]);

  // Hotkeys
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
        // C is also claim in game — only open character if panel already open or with Alt? Use only when panel open
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
        const done = missions.completeStep('meet_traveler');
        if (done) props.onMissionComplete?.(done.id, done.title);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [panelOpen, openPanel, missions, props]);

  const talkTraveler = useCallback(() => {
    const done = missions.completeStep('meet_traveler');
    if (done) props.onMissionComplete?.(done.id, done.title);
  }, [missions, props]);

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
