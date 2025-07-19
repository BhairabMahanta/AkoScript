// managers/TurnManager.ts
import { generateAttackBarEmoji } from '../../../../util/glogic';
import { cycleCooldowns } from '../../../../util/glogic';
import { PvPAI } from '../../../ai/pvp';
import { ExtendedPlayer } from '../../../../gamelogic/buffdebufflogic';

export class TurnManager {
  private battle: any;
  private pvpAI: PvPAI | null = null;

  constructor(battle: any) {
    this.battle = battle;
  }

  public initializePvPAI(): void {
    if (this.battle.mode === 'pvp_afk' && this.battle.player2) {
      console.log("[TurnManager] Initializing PvP AI for AFK mode");
      this.pvpAI = new PvPAI(this.battle, this.battle.player2);
      console.log(`[TurnManager] PvP AI initialized for: ${this.battle.player2.name}`);
    }
  }

  async getNextTurn(): Promise<ExtendedPlayer | null> {
    console.log("[TurnManager] Getting next turn...");
    
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
        console.log(`[TurnManager] ${nextTurn.name} is dead, skipping turn`);
        nextTurn.atkBar = 0;
        nextTurn.stats.speed = 0;
        
        this.clearTargetsForDeadCharacter(nextTurn);
        
        return await this.getNextTurn();
      }

      console.log(`[TurnManager] Setting current turn to: ${nextTurn.name}`);
      
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
    console.log(`[TurnManager] Handling PvE turn for: ${currentTurn?.name}`);
    
    const state = this.battle.stateManager.getState();
    const currentEnemy = state.aliveEnemies.find(
      (enemy: any) => enemy.name === currentTurn?.name
    );

    if (currentEnemy && currentTurn?.stats.hp > 0) {
      console.log(`[TurnManager] Executing enemy AI for: ${currentTurn.name}`);
      await this.performEnemyTurn(currentTurn, currentEnemy);
      await this.continueToNextTurn();
    } else {
      console.log(`[TurnManager] Player turn: ${currentTurn?.name}`);
    }
  }

  private async handlePvPTurn(currentTurn: any | null): Promise<void> {
    console.log(`[TurnManager] Handling PvP turn for: ${currentTurn?.name}`);
    
    if (this.battle.mode === 'pvp_afk' && this.isAIPlayerTurn(currentTurn)) {
      console.log(`[TurnManager] Executing AI turn for: ${currentTurn?.name}`);
      await this.executeAITurn(currentTurn);
    } else {
      console.log(`[TurnManager] Human player turn: ${currentTurn?.name}`);
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
      console.log(`[TurnManager] AI executing turn for: ${currentTurn.name}`);
      
      const availableTargets = this.pvpAI.getAvailableTargets();
      
      if (availableTargets.length === 0) {
        console.log("[TurnManager] No targets available for AI");
        await this.continueToNextTurn();
        return;
      }
      
      const decision = await this.pvpAI.makeDecision(currentTurn, availableTargets);
      console.log(`[TurnManager] AI decision: ${decision.action} - ${decision.reasoning}`);
      
      await this.pvpAI.executeDecision(decision);
      await this.continueToNextTurn();
      
    } catch (error) {
      console.error("[TurnManager] Error in AI turn execution:", error);
      await this.executeAIFallback(currentTurn);
    }
  }

  private async executeAIFallback(currentTurn: any | null): Promise<void> {
    console.log("[TurnManager] Executing AI fallback action");
    
    if (!currentTurn) return;
    
    try {
      const availableTargets = [this.battle.player, ...this.battle.familiarInfo]
        .filter((target: any) => target && target.stats && target.stats.hp > 0);
      
      if (availableTargets.length > 0) {
        const randomTarget = availableTargets[Math.floor(Math.random() * availableTargets.length)];
        
        const currentPlayerId = this.battle.player2.id || this.battle.player2._id;
        this.battle.stateManager.setPlayerTarget(currentPlayerId, randomTarget, true);
        
        this.battle.stateManager.updateState({
          enemyToHit: randomTarget,
          pickedChoice: true
        });
        
        await this.battle.turnManager.performPlayerTurn();
        this.battle.addBattleLog(`+ ${currentTurn.name} attacks ${randomTarget.name} using basic attack (AI fallback)`);
      }
    } catch (error) {
      console.error("[TurnManager] Error in AI fallback:", error);
    }
    
    await this.continueToNextTurn();
  }

  private clearTargetsForDeadCharacter(deadCharacter: any): void {
    const state = this.battle.stateManager.getState();
    
    Object.keys(state.playerTargets).forEach(playerId => {
      const target = this.battle.stateManager.getPlayerTarget(playerId);
      if (target && (
        target.id === deadCharacter.id || 
        target._id === deadCharacter._id || 
        target.serialId === deadCharacter.serialId
      )) {
        this.battle.stateManager.clearPlayerTarget(playerId);
        console.log(`[TurnManager] Cleared target for player ${playerId} due to character death: ${deadCharacter.name}`);
      }
    });
  }

  private validateTargetsForNewTurn(currentTurn: ExtendedPlayer): void {
    const state = this.battle.stateManager.getState();
    const currentPlayerId = this.getCurrentPlayerIdForCharacter(currentTurn);
    
    if (currentPlayerId) {
      const availableTargets = this.getAvailableTargetsForPlayer(currentPlayerId);
      
      const isValidTarget = this.battle.stateManager.validatePlayerTarget(currentPlayerId, availableTargets);
      
      if (!isValidTarget && availableTargets.length === 1) {
        this.battle.stateManager.setPlayerTarget(currentPlayerId, availableTargets[0], true);
        console.log(`[TurnManager] Auto-selected target for ${currentTurn.name}: ${availableTargets[0].name}`);
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
    
    if (this.battle.player2FamiliarInfo.some((f: any) => 
      f.serialId === character.serialId && f.name === character.name
    )) {
      return player2Id;
    }
    
    return '';
  }

  private getAvailableTargetsForPlayer(playerId: string): any[] {
    const state = this.battle.stateManager.getState();
    
    if (this.battle.mode === 'pve') {
      return state.aliveEnemies || [];
    }
    
    const player1Id = this.battle.player.id || this.battle.player._id;
    
    if (playerId === player1Id) {
      return [this.battle.player2, ...this.battle.player2FamiliarInfo]
        .filter(target => target && target.stats && target.stats.hp > 0);
    } else {
      return [this.battle.player, ...this.battle.familiarInfo]
        .filter(target => target && target.stats && target.stats.hp > 0);
    }
  }

  private async performEnemyTurn(currentTurn: ExtendedPlayer, currentEnemy: any): Promise<void> {
    console.log(`[TurnManager] Performing enemy turn for: ${currentTurn.name}`);
    
    if (currentTurn?.stats.hp <= 0) {
      console.log(`[TurnManager] ${currentTurn.name} died before taking enemy turn`);
      return;
    }

    const target = this.getEnemyTarget();
    console.log(`[TurnManager] Enemy ${currentTurn.name} targeting: ${target.name}`);
    
    const damage = await this.battle.mobAIClass?.move(currentTurn, target);

    await this.battle.combatResolver.applyDamage(
      target,
      damage || 0,
      currentEnemy,
      "enemy attack"
    );

    await cycleCooldowns(this.battle.stateManager.getState().cooldowns);
    
    console.log(`[TurnManager] Enemy turn completed for: ${currentTurn.name}`);
  }

  private getEnemyTarget(): any {
    const isTargetingPlayer = Math.random() < 0.3;
    const aliveFamiliars = this.battle.familiarInfo.filter(
      (familiar: any) => familiar.stats.hp > 0
    );
    
    const target = isTargetingPlayer || aliveFamiliars.length < 1
      ? this.battle.player
      : aliveFamiliars[Math.floor(Math.random() * aliveFamiliars.length)];
    
    console.log(`[TurnManager] Enemy targeting: ${target.name}`);
    return target;
  }

  async performPlayerTurn(): Promise<void> {
    console.log("[TurnManager] Performing player turn");
    
    const state = this.battle.stateManager.getState();
    
    if (!state.enemyToHit) {
      console.error("[TurnManager] No enemy target set for player turn");
      return;
    }
    
    console.log(`[TurnManager] Player ${state.currentTurn?.name} attacking ${state.enemyToHit.name}`);
    
    await this.battle.combatResolver.executeBasicAttack(
      state.currentTurn,
      state.enemyToHit
    );
    
    console.log("[TurnManager] Player turn completed");
  }

  async continueToNextTurn(): Promise<void> {
    console.log("[TurnManager] Continuing to next turn...");
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const state = this.battle.stateManager.getState();
    
    const alivePlayerTeam = [this.battle.player, ...this.battle.familiarInfo].filter(
      (char: any) => char.stats.hp > 0
    );
    
    const aliveEnemyTeam = state.aliveEnemies.filter(
      (enemy: any) => enemy.stats.hp > 0
    );
    
    if (alivePlayerTeam.length === 0) {
      console.log("[TurnManager] Player team defeated - battle over");
      await this.battle.battleResultManager.handleDefeat();
      return;
    }
    
    if (aliveEnemyTeam.length === 0) {
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

  async completeTurnAndContinue(): Promise<void> {
    console.log("[TurnManager] Completing turn and continuing...");
    
    const state = this.battle.stateManager.getState();
    await cycleCooldowns(state.cooldowns);
    
    if (this.battle.initialisedEmbed && this.battle.initialMessage) {
      try {
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
