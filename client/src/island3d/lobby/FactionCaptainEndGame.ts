/**
 * Proximity + E interaction with faction captains for End Game mission (level 20+).
 */
import * as THREE from 'three';
import {
  canOfferEndGame,
  END_GAME_FLAGS,
  END_GAME_MIN_LEVEL,
  formatEndGameDialogue,
  type EndGameDialogueLine,
} from '@shared/definitions/endGameMission';

export interface CaptainInteractState {
  open: boolean;
  captainName: string;
  raceId: string;
  lines: EndGameDialogueLine[];
  lineIndex: number;
  canAccept: boolean;
  level: number;
}

export interface FactionCaptainEndGameOpts {
  root: THREE.Object3D;
  getPlayerPosition: () => THREE.Vector3;
  getPlayerLevel: () => number;
  getPlayerName: () => string;
  interactRadiusM?: number;
  onOpen?: (state: CaptainInteractState) => void;
  onClose?: () => void;
}

export class FactionCaptainEndGame {
  private opts: FactionCaptainEndGameOpts;
  private captains: THREE.Object3D[] = [];
  private near: THREE.Object3D | null = null;
  private state: CaptainInteractState | null = null;
  private promptVisible = false;

  constructor(opts: FactionCaptainEndGameOpts) {
    this.opts = opts;
    this.rescan();
  }

  /** Allow React to re-read level after character load */
  setLevelGetter(fn: () => number): void {
    this.opts.getPlayerLevel = fn;
  }

  rescan(): void {
    this.captains = [];
    this.opts.root.traverse((o) => {
      const npc = o.userData?.npc;
      if (npc?.role === 'captain_mounted') {
        this.captains.push(o);
      }
    });
  }

  getState(): CaptainInteractState | null {
    return this.state;
  }

  isPromptVisible(): boolean {
    return this.promptVisible && !this.state?.open;
  }

  getNearCaptain(): THREE.Object3D | null {
    return this.near;
  }

  update(): void {
    const pos = this.opts.getPlayerPosition();
    const r = this.opts.interactRadiusM ?? 4.5;
    let best: THREE.Object3D | null = null;
    let bestD = r;
    const tmp = new THREE.Vector3();
    for (const c of this.captains) {
      c.getWorldPosition(tmp);
      const d = tmp.distanceTo(pos);
      if (d < bestD) {
        bestD = d;
        best = c;
      }
    }
    this.near = best;
    const level = this.opts.getPlayerLevel();
    this.promptVisible = !!best && canOfferEndGame(level);
  }

  tryInteract(): boolean {
    if (!this.near) return false;
    const level = this.opts.getPlayerLevel();
    if (!canOfferEndGame(level)) return false;

    const npc = this.near.userData.npc;
    const accepted =
      typeof localStorage !== 'undefined' &&
      localStorage.getItem(END_GAME_FLAGS.missionAccepted) === '1';

    this.state = {
      open: true,
      captainName: npc?.name ?? 'Faction Captain',
      raceId: npc?.raceId ?? 'human',
      lines: formatEndGameDialogue(this.opts.getPlayerName(), level),
      lineIndex: 0,
      canAccept: level >= END_GAME_MIN_LEVEL,
      level,
    };
    if (accepted) {
      // Re-offer cinematic
      this.state.lineIndex = Math.max(0, this.state.lines.length - 2);
    }
    try {
      localStorage.setItem(END_GAME_FLAGS.missionOffered, '1');
    } catch {
      /* ignore */
    }
    this.opts.onOpen?.(this.state);
    return true;
  }

  advanceDialogue(): 'more' | 'accept' | 'closed' {
    if (!this.state) return 'closed';
    if (this.state.lineIndex < this.state.lines.length - 1) {
      this.state.lineIndex += 1;
      this.opts.onOpen?.(this.state);
      return 'more';
    }
    return 'accept';
  }

  close(): void {
    this.state = null;
    this.opts.onClose?.();
  }
}
