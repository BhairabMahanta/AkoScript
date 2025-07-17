// managers/BattleStateManager.ts
import { BattleState } from '../types/BattleTypes';

export class BattleStateManager {
  private state: BattleState;

  constructor(initialState: Partial<BattleState>) {
    this.state = {
      currentTurn: null,
      currentTurnIndex: 0,
      currentWave: 0,
      aliveTeam: [],
      aliveEnemies: [],
      deadEnemies: [],
      deadFam: [],
      battleLogs: [],
      cooldowns: [],
      continue: true,
      enemyFirst: false,
      pickedChoice: false,
      enemyToHit: null,
      taunted: false,
      dodge: { option: null, id: null },
      nextTurnHappenedCounter: 0,
      ...initialState
    };
  }

  getState(): Readonly<BattleState> {
    return Object.freeze({ ...this.state });
  }

  updateState(updates: Partial<BattleState>): void {
    this.state = { ...this.state, ...updates };
  }

  addBattleLog(message: string): void {
    this.state.battleLogs.push(message);
  }

  clearBattleLogs(): void {
    this.state.battleLogs = [];
  }

  addCooldown(cooldown: any): void {
    this.state.cooldowns.push(cooldown);
  }

  setCooldowns(cooldowns: any[]): void {
    this.state.cooldowns = cooldowns;
  }
}
