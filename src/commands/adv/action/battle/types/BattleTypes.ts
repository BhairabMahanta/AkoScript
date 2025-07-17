import { interfaceScenario } from "../../../../../data/mongo/scenarioInterface";
import { ExtendedPlayer } from "../../../../gamelogic/buffdebufflogic";
import { BattleMode } from "../battle";

// types/BattleTypes.ts
export interface BattleConfig {
  player: ExtendedPlayer;
  enemy?: ExtendedEnemy; // Made optional for PvP
  opponent?: ExtendedPlayer; // Added for PvP opponent
  message: any;
  scenario?: interfaceScenario | null; // Made optional for PvP
  mode?: BattleMode; // Added mode support
}
export interface ExtendedEnemy extends Enemy {
  floorNum: number;
}interface hasAllies {
  name: string;
  element: string;
}
export interface Enemy {
  type: string;
  name: string;
  element: string; // Primary element for the main enemy
  waves: any[];
  hasAllies: hasAllies[];
  rewards: any;
}
export interface BattleState {
  currentTurn: ExtendedPlayer | null;
  currentTurnIndex: number;
  currentWave: number;
  aliveTeam: ExtendedPlayer[];
  aliveEnemies: any[];
  deadEnemies: any[];
  deadFam: any[];
  battleLogs: string[];
  cooldowns: any[];
  continue: boolean;
  enemyFirst: boolean;
  pickedChoice: boolean;
  enemyToHit: any;
  taunted: boolean;
  dodge: { option: any; id: any };
  nextTurnHappenedCounter: number;
}

export interface DodgeResult {
  succeeded: boolean;
  damage?: number;
  message: string;
}
