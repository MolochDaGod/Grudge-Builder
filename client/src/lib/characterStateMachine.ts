export type CharacterState = 
  | 'idle'
  | 'moving'
  | 'harvesting'
  | 'building'
  | 'sleeping'
  | 'combat'
  | 'sailing'
  | 'fishing'
  | 'fishing_idle'
  | 'fishing_casting'
  | 'fishing_waiting'
  | 'fishing_reeling'
  | 'fishing_catching'
  | 'fishing_failed'
  | 'crafting'
  | 'trading'
  | 'talking';

export interface StateTransition {
  from: CharacterState | '*';
  to: CharacterState;
  condition?: (context: StateContext) => boolean;
  onTransition?: (context: StateContext) => void;
}

export interface StateContext {
  characterId: string;
  stamina: number;
  maxStamina: number;
  health: number;
  maxHealth: number;
  position: { x: number; y: number };
  targetPosition?: { x: number; y: number };
  assignedNodeId?: string;
  inCombat: boolean;
  isSailing: boolean;
  currentActivity?: string;
}

export interface StateConfig {
  enterAnimation?: string;
  exitAnimation?: string;
  allowedTransitions: CharacterState[];
  onEnter?: (context: StateContext) => void;
  onExit?: (context: StateContext) => void;
  onUpdate?: (context: StateContext, deltaTime: number) => void;
  minDuration?: number;
}

const STATE_CONFIGS: Record<CharacterState, StateConfig> = {
  idle: {
    enterAnimation: 'Idle',
    allowedTransitions: ['moving', 'harvesting', 'building', 'sleeping', 'combat', 'sailing', 'fishing', 'crafting', 'trading', 'talking'],
    minDuration: 0
  },
  moving: {
    enterAnimation: 'Walk',
    allowedTransitions: ['idle', 'harvesting', 'building', 'combat', 'sailing'],
    minDuration: 100
  },
  harvesting: {
    enterAnimation: 'Attack',
    allowedTransitions: ['idle', 'moving', 'combat', 'sleeping'],
    minDuration: 1000,
    onEnter: (ctx) => {
      console.log(`[StateMachine] ${ctx.characterId} started harvesting at node ${ctx.assignedNodeId}`);
    }
  },
  building: {
    enterAnimation: 'Attack',
    allowedTransitions: ['idle', 'moving', 'combat'],
    minDuration: 2000
  },
  sleeping: {
    enterAnimation: 'Idle',
    allowedTransitions: ['idle'],
    minDuration: 5000,
    onEnter: (ctx) => {
      console.log(`[StateMachine] ${ctx.characterId} fell asleep (stamina: ${ctx.stamina})`);
    }
  },
  combat: {
    enterAnimation: 'Attack',
    allowedTransitions: ['idle', 'moving', 'sleeping'],
    minDuration: 500
  },
  sailing: {
    enterAnimation: 'Idle',
    allowedTransitions: ['idle', 'combat', 'fishing'],
    minDuration: 0
  },
  fishing: {
    enterAnimation: 'Idle',
    allowedTransitions: ['idle', 'sailing', 'combat', 'fishing_idle'],
    minDuration: 0
  },
  fishing_idle: {
    enterAnimation: 'FishingIdle',
    allowedTransitions: ['idle', 'fishing_casting', 'combat'],
    minDuration: 0,
    onEnter: (ctx) => {
      console.log(`[StateMachine] ${ctx.characterId} equipped rod, ready to fish`);
    }
  },
  fishing_casting: {
    enterAnimation: 'FishingCast',
    allowedTransitions: ['fishing_waiting', 'fishing_idle', 'combat'],
    minDuration: 800,
    onEnter: (ctx) => {
      console.log(`[StateMachine] ${ctx.characterId} casting line...`);
    }
  },
  fishing_waiting: {
    enterAnimation: 'FishingWait',
    allowedTransitions: ['fishing_reeling', 'fishing_idle', 'combat'],
    minDuration: 2000,
    onEnter: (ctx) => {
      console.log(`[StateMachine] ${ctx.characterId} waiting for bite...`);
    }
  },
  fishing_reeling: {
    enterAnimation: 'FishingReel',
    allowedTransitions: ['fishing_catching', 'fishing_failed', 'combat'],
    minDuration: 1500,
    onEnter: (ctx) => {
      console.log(`[StateMachine] ${ctx.characterId} got a bite! Reeling...`);
    }
  },
  fishing_catching: {
    enterAnimation: 'FishingCatch',
    allowedTransitions: ['fishing_idle', 'idle'],
    minDuration: 1500,
    onEnter: (ctx) => {
      console.log(`[StateMachine] ${ctx.characterId} caught a fish!`);
    }
  },
  fishing_failed: {
    enterAnimation: 'FishingFail',
    allowedTransitions: ['fishing_idle', 'idle'],
    minDuration: 1000,
    onEnter: (ctx) => {
      console.log(`[StateMachine] ${ctx.characterId} the fish got away!`);
    }
  },
  crafting: {
    enterAnimation: 'Idle',
    allowedTransitions: ['idle', 'moving'],
    minDuration: 1000
  },
  trading: {
    enterAnimation: 'Idle',
    allowedTransitions: ['idle', 'moving'],
    minDuration: 0
  },
  talking: {
    enterAnimation: 'Idle',
    allowedTransitions: ['idle', 'moving', 'combat'],
    minDuration: 0
  }
};

export class CharacterStateMachine {
  private currentState: CharacterState = 'idle';
  private stateStartTime: number = Date.now();
  private context: StateContext;
  private listeners: Set<(state: CharacterState, context: StateContext) => void> = new Set();
  private transitionHistory: Array<{ from: CharacterState; to: CharacterState; timestamp: number }> = [];
  
  constructor(initialContext: StateContext, initialState: CharacterState = 'idle') {
    this.context = { ...initialContext };
    this.currentState = initialState;
    this.stateStartTime = Date.now();
  }
  
  getState(): CharacterState {
    return this.currentState;
  }
  
  getContext(): StateContext {
    return { ...this.context };
  }
  
  getStateConfig(): StateConfig {
    return STATE_CONFIGS[this.currentState];
  }
  
  getStateDuration(): number {
    return Date.now() - this.stateStartTime;
  }
  
  getAnimation(): string {
    return STATE_CONFIGS[this.currentState].enterAnimation || 'Idle';
  }
  
  canTransitionTo(newState: CharacterState): boolean {
    const config = STATE_CONFIGS[this.currentState];
    
    if (!config.allowedTransitions.includes(newState)) {
      return false;
    }
    
    if (config.minDuration && this.getStateDuration() < config.minDuration) {
      return false;
    }
    
    return true;
  }
  
  transition(newState: CharacterState, updatedContext?: Partial<StateContext>): boolean {
    if (!this.canTransitionTo(newState)) {
      console.warn(`[StateMachine] Cannot transition from ${this.currentState} to ${newState}`);
      return false;
    }
    
    const oldState = this.currentState;
    const oldConfig = STATE_CONFIGS[oldState];
    const newConfig = STATE_CONFIGS[newState];
    
    oldConfig.onExit?.(this.context);
    
    if (updatedContext) {
      this.context = { ...this.context, ...updatedContext };
    }
    
    this.currentState = newState;
    this.stateStartTime = Date.now();
    
    this.transitionHistory.push({
      from: oldState,
      to: newState,
      timestamp: Date.now()
    });
    
    if (this.transitionHistory.length > 50) {
      this.transitionHistory = this.transitionHistory.slice(-50);
    }
    
    newConfig.onEnter?.(this.context);
    
    this.notifyListeners();
    
    return true;
  }
  
  forceState(newState: CharacterState, updatedContext?: Partial<StateContext>): void {
    const oldConfig = STATE_CONFIGS[this.currentState];
    const newConfig = STATE_CONFIGS[newState];
    
    oldConfig.onExit?.(this.context);
    
    if (updatedContext) {
      this.context = { ...this.context, ...updatedContext };
    }
    
    this.currentState = newState;
    this.stateStartTime = Date.now();
    
    newConfig.onEnter?.(this.context);
    this.notifyListeners();
  }
  
  updateContext(updates: Partial<StateContext>): void {
    this.context = { ...this.context, ...updates };
    
    if (this.context.stamina <= 0 && this.currentState !== 'sleeping') {
      this.transition('sleeping');
    }
    
    if (this.context.inCombat && this.currentState !== 'combat' && this.canTransitionTo('combat')) {
      this.transition('combat');
    }
  }
  
  update(deltaTime: number): void {
    const config = STATE_CONFIGS[this.currentState];
    config.onUpdate?.(this.context, deltaTime);
  }
  
  subscribe(listener: (state: CharacterState, context: StateContext) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  
  private notifyListeners(): void {
    Array.from(this.listeners).forEach(listener => {
      listener(this.currentState, this.context);
    });
  }
  
  getTransitionHistory(): Array<{ from: CharacterState; to: CharacterState; timestamp: number }> {
    return [...this.transitionHistory];
  }
  
  serialize(): { state: CharacterState; context: StateContext; stateStartTime: number } {
    return {
      state: this.currentState,
      context: { ...this.context },
      stateStartTime: this.stateStartTime
    };
  }
  
  static deserialize(data: { state: CharacterState; context: StateContext; stateStartTime: number }): CharacterStateMachine {
    const machine = new CharacterStateMachine(data.context, data.state);
    machine.stateStartTime = data.stateStartTime;
    return machine;
  }
}

export class CharacterStateManager {
  private machines: Map<string, CharacterStateMachine> = new Map();
  private globalListeners: Set<(characterId: string, state: CharacterState, context: StateContext) => void> = new Set();
  
  getOrCreate(characterId: string, initialContext: StateContext): CharacterStateMachine {
    let machine = this.machines.get(characterId);
    if (!machine) {
      machine = new CharacterStateMachine(initialContext);
      machine.subscribe((state, context) => {
        this.notifyGlobalListeners(characterId, state, context);
      });
      this.machines.set(characterId, machine);
    }
    return machine;
  }
  
  get(characterId: string): CharacterStateMachine | undefined {
    return this.machines.get(characterId);
  }
  
  remove(characterId: string): boolean {
    return this.machines.delete(characterId);
  }
  
  getAll(): Map<string, CharacterStateMachine> {
    return new Map(this.machines);
  }
  
  updateAll(deltaTime: number): void {
    Array.from(this.machines.values()).forEach(machine => {
      machine.update(deltaTime);
    });
  }
  
  subscribe(listener: (characterId: string, state: CharacterState, context: StateContext) => void): () => void {
    this.globalListeners.add(listener);
    return () => this.globalListeners.delete(listener);
  }
  
  private notifyGlobalListeners(characterId: string, state: CharacterState, context: StateContext): void {
    Array.from(this.globalListeners).forEach(listener => {
      listener(characterId, state, context);
    });
  }
  
  getCharactersInState(state: CharacterState): string[] {
    const result: string[] = [];
    Array.from(this.machines.entries()).forEach(([id, machine]) => {
      if (machine.getState() === state) {
        result.push(id);
      }
    });
    return result;
  }
  
  serialize(): Record<string, { state: CharacterState; context: StateContext; stateStartTime: number }> {
    const result: Record<string, ReturnType<CharacterStateMachine['serialize']>> = {};
    Array.from(this.machines.entries()).forEach(([id, machine]) => {
      result[id] = machine.serialize();
    });
    return result;
  }
}

export const globalStateManager = new CharacterStateManager();
