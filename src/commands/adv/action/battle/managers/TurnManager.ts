// managers/TurnManager.ts
import { generateAttackBarEmoji } from '../../../../util/glogic';
import { cycleCooldowns } from '../../../../util/glogic';
import { PvPAI } from '../../../ai/pvp';

export class TurnManager {
  private battle: any;
  private pvpAI: PvPAI | null = null;

  constructor(battle: any) {
    this.battle = battle;
    
    // DON'T initialize PvP AI here - it's too early
    // We'll initialize it later when the battle is fully set up
  }

  // NEW: Method to initialize PvP AI after Battle is fully constructed
  public initializePvPAI(): void {
    if (this.battle.mode === 'pvp_afk' && this.battle.player2) {
      console.log("[TurnManager] Initializing PvP AI for AFK mode");
      this.pvpAI = new PvPAI(this.battle, this.battle.player2);
      console.log(`[TurnManager] PvP AI initialized for: ${this.battle.player2.name}`);
    }
  }

  async getNextTurn(): Promise<any> {
    console.log("[TurnManager] Getting next turn...");
    
    // Initialize PvP AI if not already done (safety check)
    if (this.battle.mode === 'pvp_afk' && !this.pvpAI && this.battle.player2) {
      this.initializePvPAI();
    }
    
    const state = this.battle.stateManager.getState();
    const charactersWith100AtkBar = await this.battle.barManager.fillAtkBars(this.battle.characters);

    let nextTurn = null;

    if (charactersWith100AtkBar.length === 1) {
      nextTurn = charactersWith100AtkBar[0];
    } else if (charactersWith100AtkBar.length > 1) {
      charactersWith100AtkBar.sort((a: any, b: any) => b.atkBar - a.atkBar);
      nextTurn = charactersWith100AtkBar[0];
    }

    if (nextTurn) {
      // Check if the character is still alive before setting as current turn
      if (nextTurn.stats.hp <= 0) {
        console.log(`[TurnManager] ${nextTurn.name} is dead, skipping turn`);
        nextTurn.atkBar = 0;
        nextTurn.stats.speed = 0;
        
        // Recursively get next valid turn
        return await this.getNextTurn();
      }

      console.log(`[TurnManager] Setting current turn to: ${nextTurn.name}`);
      
      this.battle.stateManager.updateState({
        currentTurn: nextTurn,
        currentTurnId: nextTurn._id || nextTurn.id,
        // Reset targeting state for new turn
        pickedChoice: false,
        enemyToHit: null
      });

      nextTurn.atkBar -= 100;
      nextTurn.attackBarEmoji = await generateAttackBarEmoji(nextTurn.atkBar);
    }

    await this.battle.barManager.fillHpBars(this.battle.characters);
    
    if (state.nextTurnHappenedCounter >= 1) {
      await this.battle.battleResultManager.printBattleResult();
    }

    // Handle turn execution based on mode
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

  private async handlePvETurn(currentTurn: any): Promise<void> {
    console.log(`[TurnManager] Handling PvE turn for: ${currentTurn?.name}`);
    
    const state = this.battle.stateManager.getState();
    const currentEnemy = state.aliveEnemies.find(
      (enemy: any) => enemy.name === currentTurn?.name
    );

    // If this is an enemy turn, execute AI
    if (currentEnemy && currentTurn?.stats.hp > 0) {
      console.log(`[TurnManager] Executing enemy AI for: ${currentTurn.name}`);
      await this.performEnemyTurn(currentTurn, currentEnemy);
      
      // After enemy turn, continue to next turn
      await this.continueToNextTurn();
    } else {
      console.log(`[TurnManager] Player turn: ${currentTurn?.name}`);
      // For player turns, wait for interaction
    }
  }

  private async handlePvPTurn(currentTurn: any): Promise<void> {
    console.log(`[TurnManager] Handling PvP turn for: ${currentTurn?.name}`);
    
    // Check if this is an AI player's turn in AFK mode
    if (this.battle.mode === 'pvp_afk' && this.isAIPlayerTurn(currentTurn)) {
      console.log(`[TurnManager] Executing AI turn for: ${currentTurn.name}`);
      await this.executeAITurn(currentTurn);
    } else {
      console.log(`[TurnManager] Human player turn: ${currentTurn?.name}`);
      // For human player turns, wait for interaction
      // NO WAITING - the UI system will handle this automatically
    }
  }

  private isAIPlayerTurn(currentTurn: any): boolean {
    if (!currentTurn || !this.battle.player2) return false;
    
    const player2Id = this.battle.player2.id || this.battle.player2._id;
    
    // Check if it's player2 themselves
    if (currentTurn.id === player2Id || currentTurn._id === player2Id) {
      return true;
    }
    
    // Check if it's player2's familiar
    const isPlayer2Familiar = this.battle.player2FamiliarInfo.some((f: any) => 
      f.serialId === currentTurn.serialId && f.name === currentTurn.name
    );
    
    return isPlayer2Familiar;
  }

  private async executeAITurn(currentTurn: any): Promise<void> {
    if (!this.pvpAI) {
      console.error("[TurnManager] PvP AI not initialized");
      await this.executeAIFallback(currentTurn);
      return;
    }
    
    try {
      console.log(`[TurnManager] AI executing turn for: ${currentTurn.name}`);
      
      // Get available targets for AI
      const availableTargets = this.pvpAI.getAvailableTargets();
      
      if (availableTargets.length === 0) {
        console.log("[TurnManager] No targets available for AI");
        await this.continueToNextTurn();
        return;
      }
      
      // AI makes decision
      const decision = await this.pvpAI.makeDecision(currentTurn, availableTargets);
      console.log(`[TurnManager] AI decision: ${decision.action} - ${decision.reasoning}`);
      
      // Execute the decision
      await this.pvpAI.executeDecision(decision);
      
      // IMPORTANT: Continue to next turn automatically - NO WAITING!
      await this.continueToNextTurn();
      
    } catch (error) {
      console.error("[TurnManager] Error in AI turn execution:", error);
      await this.executeAIFallback(currentTurn);
    }
  }

  private async executeAIFallback(currentTurn: any): Promise<void> {
    console.log("[TurnManager] Executing AI fallback action");
    
    try {
      // Simple fallback - attack the first available target
      const state = this.battle.stateManager.getState();
      const availableTargets = [this.battle.player, ...this.battle.familiarInfo]
        .filter((target: any) => target && target.stats && target.stats.hp > 0);
      
      if (availableTargets.length > 0) {
        const randomTarget = availableTargets[Math.floor(Math.random() * availableTargets.length)];
        
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

  // Rest of your existing methods remain the same...
  private async performEnemyTurn(currentTurn: any, currentEnemy: any): Promise<void> {
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
    
    console.log(`[TurnManager] Player ${state.currentTurn.name} attacking ${state.enemyToHit.name}`);
    
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
