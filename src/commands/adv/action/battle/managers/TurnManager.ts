// managers/TurnManager.ts - CLEANED VERSION
import { generateAttackBarEmoji } from '../../../../util/glogic';
import { cycleCooldowns } from '../../../../util/glogic';
import { PvPAI } from '../../../ai/pvp';
import { ExtendedPlayer } from '../../../../gamelogic/buffdebufflogic';
import { Player } from '../../../../../data/mongo/playerschema';

export class TurnManager {
  private battle: any;
  private pvpAI: PvPAI | null = null;

  constructor(battle: any) {
    this.battle = battle;
  }

  public initializePvPAI(): void {
    if (this.battle.mode === 'pvp_afk' && this.battle.player2) {
      this.pvpAI = new PvPAI(this.battle, this.battle.player2);
      // KEEP: AI initialization is important
      console.log(`[TurnManager] PvP AI initialized for: ${this.battle.player2.name}`);
    }
  }

  async getNextTurn(): Promise<ExtendedPlayer | null> {
    if (this.battle.mode === 'pvp_afk' && !this.pvpAI && this.battle.player2) {
      this.initializePvPAI();
    }
    
    const state = this.battle.stateManager.getState();
    const charactersWith100AtkBar = await this.battle.barManager.fillAtkBars(this.battle.characters);

    let nextTurn: ExtendedPlayer | null = null;

    if (charactersWith100AtkBar.length === 1) {
      nextTurn = charactersWith100AtkBar[0];
    } else if (charactersWith100AtkBar.length > 1) {
      charactersWith100AtkBar.sort((a: any, b: any) => b.atkBar - a.atkBar);
      nextTurn = charactersWith100AtkBar[0];
    }

    if (nextTurn) {
      if (nextTurn.stats.hp <= 0) {
        // KEEP: Death notifications are important
        console.log(`[TurnManager] ${nextTurn.name} is dead, skipping turn`);
        nextTurn.atkBar = 0;
        nextTurn.stats.speed = 0;
        
        this.clearTargetsForDeadCharacter(nextTurn);
        
        return await this.getNextTurn();
      }
    
      this.validateTargetsForNewTurn(nextTurn);
      
      this.battle.stateManager.updateState({
        currentTurn: nextTurn,
        currentTurnIndex: state.currentTurnIndex + 1,
      });

      nextTurn.atkBar -= 100;
      nextTurn.attackBarEmoji = await generateAttackBarEmoji(nextTurn.atkBar);
    }

    await this.battle.barManager.fillHpBars(this.battle.characters);
    
    if (state.nextTurnHappenedCounter >= 1) {
      await this.battle.battleResultManager.printBattleResult();
    }

    if (this.battle.mode === 'pve') {
      await this.handlePvETurn(nextTurn);
    } else {
      await this.handlePvPTurn(nextTurn);
    }
    
    this.battle.stateManager.updateState({
      nextTurnHappenedCounter: state.nextTurnHappenedCounter + 1
    });

    return nextTurn;
  }

private async handlePvETurn(currentTurn: any | null): Promise<void> {
  const state = this.battle.stateManager.getState();
  const currentEnemy = state.aliveEnemies.find(
    (enemy: any) => enemy.name === currentTurn?.name
  );

  if (currentEnemy && currentTurn?.stats.hp > 0) {
    await this.performEnemyTurn(currentTurn, currentEnemy);
    
    // ADD DELAY HERE for PvE embed updates
    await new Promise(resolve => setTimeout(resolve, 750));
    
    await this.continueToNextTurn();
  }
}


  private async handlePvPTurn(currentTurn: any | null): Promise<void> {
    if (this.battle.mode === 'pvp_afk' && this.isAIPlayerTurn(currentTurn)) {
      // KEEP: AI turn execution is important to track
      console.log(`[TurnManager] AI executing turn for: ${currentTurn?.name}`);
      await this.executeAITurn(currentTurn);
    } else {
      // REMOVED: Repetitive "Human player turn" log
    }
  }

  private isAIPlayerTurn(currentTurn: any | null): boolean {
    if (!currentTurn || !this.battle.player2) return false;
    
    const player2Id = this.battle.player2.id || this.battle.player2._id;
    
    if (currentTurn.id === player2Id || currentTurn._id === player2Id) {
      return true;
    }
    
    return this.battle.player2FamiliarInfo.some((f: any) => 
      f.serialId === currentTurn.serialId && f.name === currentTurn.name
    );
  }

  private async executeAITurn(currentTurn: any | null): Promise<void> {
    if (!this.pvpAI || !currentTurn) {
      console.error("[TurnManager] PvP AI not initialized");
      await this.executeAIFallback(currentTurn);
      return;
    }
    
    try {
      const availableTargets = this.pvpAI.getAvailableTargets();
      // REMOVED: Repetitive "Available targets for AI" log - this is shown in PvPAI
      
      const validTargets = availableTargets.filter(target => 
        target && target.name && target.stats && target.stats.defense !== undefined
      );
      
      if (validTargets.length === 0) {
        console.log("[TurnManager] No valid targets available for AI");
        await this.executeAIFallback(currentTurn);
        return;
      }
      
      const decision = await this.pvpAI.makeDecision(currentTurn, validTargets);
      // KEEP: AI decisions are important
      console.log(`[TurnManager] AI decision: ${decision.action} - ${decision.reasoning}`);
      
      if (decision.target) {
        const targets = Array.isArray(decision.target) ? decision.target : [decision.target];
        const allTargetsValid = targets.every(t => t && t.name && t.stats && t.stats.defense !== undefined);
        
        if (!allTargetsValid) {
          console.error("[TurnManager] AI decision contains invalid targets, using fallback");
          await this.executeAIFallback(currentTurn);
          return;
        }
      }
      
      await this.pvpAI.executeDecision(decision);
      await this.continueToNextTurn();
      
    } catch (error) {
      console.error("[TurnManager] Error in AI turn execution:", error);
      await this.executeAIFallback(currentTurn);
    }
  }

  private async executeAIFallback(currentTurn: any | null): Promise<void> {
    // KEEP: Fallback actions are important to track
    console.log("[TurnManager] Executing AI fallback action");
    
    if (!currentTurn) {
      await this.continueToNextTurn();
      return;
    }
    
    try {
      let availableTargets: any[] = [];
      
      if (this.battle.mode === 'pvp_afk') {
        availableTargets = [this.battle.player, ...this.battle.familiarInfo]
          .filter((target: any) => target && target.stats && target.stats.hp > 0 && target.stats.defense !== undefined);
      } else {
        availableTargets = this.battle.stateManager.getState().aliveEnemies
          .filter((target: any) => target && target.stats && target.stats.hp > 0 && target.stats.defense !== undefined);
      }
      
      // REMOVED: Repetitive "Fallback targets" log
      
      if (availableTargets.length > 0) {
        const randomTarget = availableTargets[Math.floor(Math.random() * availableTargets.length)];
        
        const currentPlayerId = this.getCurrentPlayerIdForCharacter(currentTurn);
        if (currentPlayerId) {
          this.battle.stateManager.setPlayerTarget(currentPlayerId, randomTarget, true);
        }
        
        this.battle.stateManager.updateState({
          enemyToHit: randomTarget,
          pickedChoice: true
        });
        
        await this.battle.turnManager.performPlayerTurn();
        this.battle.addBattleLog(`+ ${currentTurn.name} attacks ${randomTarget.name} using basic attack (AI fallback)`);
      } else {
        console.error("[TurnManager] No valid targets for AI fallback");
      }
    } catch (error) {
      console.error("[TurnManager] Error in AI fallback:", error);
    }
    
    await this.continueToNextTurn();
  }

  private clearTargetsForDeadCharacter(deadCharacter: any): void {
    const state = this.battle.stateManager.getState();
    
    // REMOVED: Repetitive "Checking if anyone was targeting" log
    
    Object.keys(state.playerTargets).forEach(playerId => {
      const currentTarget = this.battle.stateManager.getPlayerTarget(playerId);
      
      if (currentTarget && (
        currentTarget.id === deadCharacter.id || 
        currentTarget._id === deadCharacter._id || 
        currentTarget.serialId === deadCharacter.serialId
      )) {
        this.battle.stateManager.clearPlayerTarget(playerId);
        // KEEP: Target clearing due to death is important
        console.log(`[TurnManager] Cleared target for player ${playerId} because their target ${deadCharacter.name} died`);
      }
    });
  }

  private validateTargetsForNewTurn(currentTurn: ExtendedPlayer): void {
    const state = this.battle.stateManager.getState();
    const currentPlayerId = this.getCurrentPlayerIdForCharacter(currentTurn);
    
    if (currentPlayerId) {
      const availableTargets = this.getAvailableTargetsForPlayer(currentPlayerId);
      
      const validTargets = availableTargets.filter(target => 
        target && target.stats && target.stats.hp > 0 && target.stats.defense !== undefined
      );
      
      const isValidTarget = this.battle.stateManager.validatePlayerTarget(currentPlayerId, validTargets);
      
      if (!isValidTarget && validTargets.length === 1) {
        this.battle.stateManager.setPlayerTarget(currentPlayerId, validTargets[0], true);
        // KEEP: Auto-target selection is important
        console.log(`[TurnManager] Auto-selected target for ${currentTurn.name}: ${validTargets[0].name}`);
      } else if (!isValidTarget && validTargets.length > 1) {
        this.battle.stateManager.clearPlayerTarget(currentPlayerId);
        // REMOVED: Repetitive "Multiple targets available" log - happens too often
      }
    }
  }

  private getCurrentPlayerIdForCharacter(character: any): string {
    if (!character) return '';
    
    if (this.battle.mode === 'pve') {
      return this.battle.player.id;
    }
    
    const player1Id = this.battle.player.id || this.battle.player._id;
    const player2Id = this.battle.player2.id || this.battle.player2._id;
    
    if (character.id === player1Id || character._id === player1Id) {
      return player1Id;
    }
    
    if (this.battle.familiarInfo.some((f: any) => 
      f.serialId === character.serialId && f.name === character.name
    )) {
      return player1Id;
    }
    
    if (character.id === player2Id || character._id === player2Id) {
      return player2Id;
    }
    
    if (this.battle.player2FamiliarInfo && this.battle.player2FamiliarInfo.some((f: any) => 
      f.serialId === character.serialId && f.name === character.name
    )) {
      return player2Id;
    }
    
    return '';
  }

  private getAvailableTargetsForPlayer(playerId: string): any[] {
    const state = this.battle.stateManager.getState();
    
    if (this.battle.mode === 'pve') {
      return (state.aliveEnemies || []).filter((target:Player) => 
        target && target.stats && target.stats.hp > 0
      );
    }
    
    const player1Id = this.battle.player.id || this.battle.player._id;
    
    if (playerId === player1Id) {
      return [this.battle.player2, ...(this.battle.player2FamiliarInfo || [])]
        .filter(target => target && target.stats && target.stats.hp > 0);
    } else {
      return [this.battle.player, ...(this.battle.familiarInfo || [])]
        .filter(target => target && target.stats && target.stats.hp > 0);
    }
  }

  private async performEnemyTurn(currentTurn: ExtendedPlayer, currentEnemy: any): Promise<void> {
    // REMOVED: Repetitive "Performing enemy turn" log
    
    if (currentTurn?.stats.hp <= 0) {
      // KEEP: Death during turn is important
      console.log(`[TurnManager] ${currentTurn.name} died before taking enemy turn`);
      return;
    }

    const target = this.getEnemyTarget();
    // REMOVED: Repetitive "Enemy targeting" log - shown in getEnemyTarget
    
    const damage = await this.battle.mobAIClass?.move(currentTurn, target);

    await this.battle.combatResolver.applyDamage(
      target,
      damage || 0,
      currentEnemy,
      "enemy attack"
    );

    await cycleCooldowns(this.battle.stateManager.getState().cooldowns, currentTurn.name);
    
    // REMOVED: Repetitive "Enemy turn completed" log
  }

  private getEnemyTarget(): any {
    const isTargetingPlayer = Math.random() < 0.3;
    const aliveFamiliars = this.battle.familiarInfo.filter(
      (familiar: any) => familiar.stats.hp > 0
    );
    
    const target = isTargetingPlayer || aliveFamiliars.length < 1
      ? this.battle.player
      : aliveFamiliars[Math.floor(Math.random() * aliveFamiliars.length)];
    
    // REMOVED: Repetitive "Enemy targeting" log - this happens every enemy turn
    return target;
  }

  async performPlayerTurn(): Promise<void> {
    // REMOVED: Repetitive "Performing player turn" log
    
    const state = this.battle.stateManager.getState();
    
    if (!state.enemyToHit) {
      console.error("[TurnManager] No enemy target set for player turn");
      return;
    }
    
    if (!state.enemyToHit.stats || state.enemyToHit.stats.defense === undefined) {
      // KEEP: Invalid target errors are important
      console.error(`[TurnManager] Invalid target for combat: ${state.enemyToHit.name || 'Unknown'}`);
      return;
    }
    
    // REMOVED: Repetitive "Player attacking" log - we can see this from combat results
    
    await this.battle.combatResolver.executeBasicAttack(
      state.currentTurn,
      state.enemyToHit
    );
    
    // REMOVED: Repetitive "Player turn completed" log
  }

  async continueToNextTurn(): Promise<void> {
    // REMOVED: Repetitive "Continuing to next turn" log
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const state = this.battle.stateManager.getState();
    
    const alivePlayerTeam = [this.battle.player, ...this.battle.familiarInfo].filter(
      (char: any) => char && char.stats && char.stats.hp > 0
    );
    
    const aliveEnemyTeam = (state.aliveEnemies || []).filter(
      (enemy: any) => enemy && enemy.stats && enemy.stats.hp > 0
    );
    
    if (alivePlayerTeam.length === 0) {
      // KEEP: Battle end conditions are important
      console.log("[TurnManager] Player team defeated - battle over");
      await this.battle.battleResultManager.handleDefeat();
      return;
    }
    
    if (aliveEnemyTeam.length === 0) {
      // KEEP: Battle end conditions are important  
      console.log("[TurnManager] Enemy team defeated - battle over");
      await this.battle.battleResultManager.handleVictory();
      return;
    }
    
    this.battle.stateManager.updateState({
      aliveTeam: alivePlayerTeam,
      aliveEnemies: aliveEnemyTeam
    });
    
    await this.getNextTurn();
  }

// In TurnManager.ts - completeTurnAndContinue method
async completeTurnAndContinue(): Promise<void> {
  const state = this.battle.stateManager.getState();
  
  if (this.battle.initialisedEmbed && this.battle.initialMessage) {
    try {
      // ADD DELAY BEFORE EMBED UPDATE
      await new Promise(resolve => setTimeout(resolve, 1500));
      console.log("WHY IS ITHAPPENIKNG")
      
      const updatedEmbed = await this.battle.initialisedEmbed.sendInitialEmbed(
        state.currentTurn,
        this.battle.mode === 'pve' ? this.battle.mobInfo : this.battle.player2FamiliarInfo
      );
      
      await this.battle.initialMessage.edit({
        embeds: [updatedEmbed],
        components: await this.battle.ui.createActionRows(),
      });
    } catch (error) {
      console.error("[TurnManager] Error updating battle UI:", error);
    }
  }
  
  await this.continueToNextTurn();
}

}
