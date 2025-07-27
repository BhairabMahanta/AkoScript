// managers/BattleStateManager.ts
import { BattleState, PlayerTargetData } from '../types/BattleTypes';
export interface Cooldown {
  name: string;          // Ability name
  characterId: string;   // Character ID who used the ability
  characterName: string; // Character name for logging
  cooldown: number;      // Remaining turns
}
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
      playerTargets: {}, // NEW: Initialize empty player targets
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
    console.trace(`\x1b[35m[BATTLE LOG]\x1b[0m ${message}`);
  this.state.battleLogs.push(message);
  }

  clearBattleLogs(): void {
    this.state.battleLogs = [];
  }

addCooldown(cooldown: any): void {
    // Ensure we have character identification
    if (!cooldown.characterId) {
      console.error("Cooldown added without character ID:", cooldown);
      return;
    }
    
    this.state.cooldowns.push(cooldown);
    console.log(`[BattleStateManager] Added cooldown: ${cooldown.name} for ${cooldown.characterName} (${cooldown.cooldown} turns)`);
  }

  // NEW: Check if specific character has ability on cooldown
  isAbilityOnCooldown(abilityName: string, characterName: string): boolean {
    return this.state.cooldowns.some(cooldown => 
      cooldown.name === abilityName && 
      cooldown.characterName === characterName
    );
  }

  // Update this method too
  getCharacterCooldowns(characterName: string): any[] {
    return this.state.cooldowns.filter(cooldown => 
      cooldown.characterName === characterName
    );
  }


  setCooldowns(cooldowns: any[]): void {
    this.state.cooldowns = cooldowns;
  }

  // NEW: Persistent targeting methods
  setPlayerTarget(playerId: string, target: any, autoSelected: boolean = false): void {
    if (!this.state.playerTargets[playerId]) {
      this.state.playerTargets[playerId] = {
        selectedTarget: null,
        lastSelectedTime: 0,
        autoSelected: false
      };
    }
    
    this.state.playerTargets[playerId] = {
      selectedTarget: target,
      lastSelectedTime: Date.now(),
      autoSelected
    };
    
    console.log(`[BattleStateManager] Set target for player ${playerId}: ${target?.name} (auto: ${autoSelected})`);
  }

  getPlayerTarget(playerId: string): any {
    return this.state.playerTargets[playerId]?.selectedTarget || null;
  }

  clearPlayerTarget(playerId: string): void {
    if (this.state.playerTargets[playerId]) {
      this.state.playerTargets[playerId].selectedTarget = null;
      this.state.playerTargets[playerId].autoSelected = false;
      console.log(`[BattleStateManager] Cleared target for player ${playerId}`);
    }
  }

  validatePlayerTarget(playerId: string, validTargets: any[]): boolean {
    const currentTarget = this.getPlayerTarget(playerId);
    if (!currentTarget) return false;
    
    const isValid = validTargets.some(target => 
      target && currentTarget && 
      (target.id === currentTarget.id || target._id === currentTarget._id || 
       target.serialId === currentTarget.serialId)
    );
    
    if (!isValid) {
      console.log(`[BattleStateManager] Target ${currentTarget.name} is no longer valid for player ${playerId}`);
      this.clearPlayerTarget(playerId);
    }
    
    return isValid;
  }

  getCurrentPlayerId(): string {
    if (!this.state.currentTurn) return '';
    return this.state.currentTurn.id || this.state.currentTurn._id || '';
  }

  getPlayerTargetData(playerId: string): PlayerTargetData | null {
    return this.state.playerTargets[playerId] || null;
  }

  isTargetAutoSelected(playerId: string): boolean {
    return this.state.playerTargets[playerId]?.autoSelected || false;
  }
}
