// ui/managers/TargetManager.ts
import { CharacterIdentifier } from "./CharacterIdentifier";

export class TargetManager {
  private battle: any;
  private characterIdentifier: CharacterIdentifier;

  constructor(battle: any) {
    this.battle = battle;
    this.characterIdentifier = new CharacterIdentifier(battle);
  }

  getCurrentTargetList(): any[] {
    const state = this.battle.stateManager.getState();
    let availableTargets: any[] = [];
    
    if (this.battle.mode === 'pve') {
      availableTargets = state.aliveEnemies || [];
    } else {
      const currentTurn = state.currentTurn;
      
      if (this.characterIdentifier.isPlayer1Character(currentTurn)) {
        availableTargets = [this.battle.player2, ...this.battle.player2FamiliarInfo]
          .filter(target => target && target.stats && target.stats.hp > 0);
      } else {
        availableTargets = [this.battle.player, ...this.battle.familiarInfo]
          .filter(target => target && target.stats && target.stats.hp > 0);
      }
    }
    
    return availableTargets;
  }

  validateAndManageTarget(playerId: string, availableTargets: any[]): void {
    const isValidTarget = this.battle.stateManager.validatePlayerTarget(playerId, availableTargets);
    
    if (!isValidTarget && availableTargets.length > 0) {
      if (availableTargets.length === 1) {
        this.battle.stateManager.setPlayerTarget(playerId, availableTargets[0], true);
        console.log(`[TargetManager] Auto-selected target: ${availableTargets[0].name}`);
      }
    }
  }

  getCurrentPlayerId(): string {
    const state = this.battle.stateManager.getState();
    const currentTurn = state.currentTurn;
    
    if (!currentTurn) return '';
    
    if (this.battle.mode === 'pve') {
      return this.battle.player.id;
    }
    
    const player1Id = this.battle.player.id || this.battle.player._id;
    const player2Id = this.battle.player2.id || this.battle.player2._id;
    
    if (this.characterIdentifier.isPlayer1Character(currentTurn)) {
      return player1Id;
    } else if (this.characterIdentifier.isPlayer2Character(currentTurn)) {
      return player2Id;
    }
    
    return '';
  }

  getTargetMenuPlaceholder(): string {
    const currentPlayerId = this.getCurrentPlayerId();
    const currentTarget = this.battle.stateManager.getPlayerTarget(currentPlayerId);
    
    if (currentTarget) {
      return `Current target: ${currentTarget.name} (Click to change)`;
    } else {
      return "Select target";
    }
  }

  createTargetOptions(): any[] {
    const availableTargets = this.getCurrentTargetList();
    const currentPlayerId = this.getCurrentPlayerId();
    const currentTarget = this.battle.stateManager.getPlayerTarget(currentPlayerId);
    
    console.log(`[TargetManager] Creating dropdown for player ${currentPlayerId}, current target: ${currentTarget?.name}`);
    
    const options = availableTargets.map((target: any, index: number) => {
      const isCurrentTarget = currentTarget && 
        (target.id === currentTarget.id || target._id === currentTarget._id || 
         target.serialId === currentTarget.serialId);
      
      return {
        label: target.name + (isCurrentTarget ? " ✓" : ""),
        description: isCurrentTarget ? `Current target` : `Attack ${target.name}`,
        value: `enemy_${index}`,
      };
    });

    return options.length > 0 ? options : [{
      label: "No Targets",
      description: "No enemies available to attack.",
      value: "no_target",
    }];
  }
}
