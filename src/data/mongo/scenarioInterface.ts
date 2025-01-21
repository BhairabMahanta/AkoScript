export interface EntityInteraction {
  name: string;
  position: { x: number; y: number };
  interactionFinished: boolean;
}

export interface Floor {
  floorNumber: number;
  miniboss: boolean;
  boss: boolean;
  cleared: boolean;
  quests?: string[];
  rewarded: boolean;
}

export interface BossFloor {
  floorNumber: number;
  unlocked: boolean;
  cleared: boolean;
  playerPos: { x: number; y: number };
  entityInteractions: EntityInteraction[];
}

export interface interfaceScenario {
  id: string;
  name: string;
  selected: boolean;
  floors: (Floor | BossFloor)[]; // Can be an array of Floor or BossFloor
  difficulties: string[];
  claimedReward: boolean;
  number: number;
}
export interface PlayerScenarioData extends Document {
  playerId: string;
  scenarios: interfaceScenario[];
}
