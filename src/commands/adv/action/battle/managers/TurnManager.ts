// managers/TurnManager.ts - MERGED AI EXECUTION WITH IMMEDIATE UPDATES
import { generateAttackBarEmoji } from '../../../../util/glogic';
import { cycleCooldowns } from '../../../../util/glogic';
import { PvPAI } from '../../../ai/pvp';
import { ExtendedPlayer } from '../../../../gamelogic/buffdebufflogic';
import { Player } from '../../../../../data/mongo/playerschema';
import abilities from '../../../../../data/abilities';

export class TurnManager {
  private battle: any;
  private pvpAI: PvPAI | null = null;
  private battleEnded: boolean = false;
  
  // EMBED DEBOUNCING PROPERTIES
  private embedUpdateInProgress: boolean = false;
  private lastEmbedUpdate: number = 0;
  private embedUpdateQueue: NodeJS.Timeout | null = null;
  private embedUpdateCounter: number = 0;

  constructor(battle: any) {
    this.battle = battle;
  }

  public initializePvPAI(): void {
    if (this.battle.mode === 'pvp_afk' && this.battle.player2) {
      this.pvpAI = new PvPAI(this.battle, this.battle.player2);
      console.log(`\x1b[36m[TurnManager]\x1b[0m PvP AI initialized for: ${this.battle.player2.name}`);
    }
  }

  async getNextTurn(): Promise<ExtendedPlayer | null> {
    if (this.battle.mode === 'pvp_afk' && !this.pvpAI && this.battle.player2) {
      this.initializePvPAI();
    }
    
    const state = this.battle.stateManager.getState();
    const charactersWith100AtkBar = await this.battle.barManager.fillAtkBars(this.battle.characters);

    console.log(`\x1b[34m[TurnManager]\x1b[0m Characters with 100 atkBar:`, 
      charactersWith100AtkBar.map((c:any) => `${c.name}(${c.atkBar})`));

    let nextTurn: ExtendedPlayer | null = null;

    if (charactersWith100AtkBar.length === 1) {
      nextTurn = charactersWith100AtkBar[0];
    } else if (charactersWith100AtkBar.length > 1) {
      charactersWith100AtkBar.sort((a: any, b: any) => b.atkBar - a.atkBar);
      nextTurn = charactersWith100AtkBar[0];
    }

    if (nextTurn) {
      console.log(`\x1b[34m[TurnManager]\x1b[0m Next turn: ${nextTurn.name} (HP: ${nextTurn.stats.hp})`);
      
      if (nextTurn.stats.hp <= 0) {
        console.log(`\x1b[31m[TurnManager]\x1b[0m ${nextTurn.name} is dead, skipping turn`);
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
    } else {
      console.log(`\x1b[33m[TurnManager]\x1b[0m No characters with 100 atkBar found`);
    }

    // HP BAR FILLING
    try {
      console.log(`\x1b[36m[TurnManager]\x1b[0m Starting HP bar filling...`);
      await this.battle.barManager.fillHpBars(this.battle.characters);
      console.log(`\x1b[36m[TurnManager]\x1b[0m HP bar filling completed`);
    } catch (error) {
      console.error(`\x1b[91m[TurnManager]\x1b[0m Error in fillHpBars:`, error);
    }
    
    // BATTLE RESULT CHECKING
    try {
      if (state.nextTurnHappenedCounter >= 1) {
        console.log(`\x1b[36m[TurnManager]\x1b[0m Checking battle results...`);
        await this.battle.battleResultManager.printBattleResult();
        console.log(`\x1b[36m[TurnManager]\x1b[0m Battle result check completed`);
      }
    } catch (error) {
      console.error(`\x1b[91m[TurnManager]\x1b[0m Error in battle result check:`, error);
    }

    console.log(`\x1b[34m[TurnManager]\x1b[0m Battle mode: ${this.battle.mode}, Next turn: ${nextTurn?.name}`);
    
    // HANDLE TURN BASED ON MODE AND CHARACTER TYPE
    try {
      if (this.battle.mode === 'pve') {
        await this.handlePvETurn(nextTurn);
      } else {
        await this.handlePvPTurn(nextTurn);
      }
    } catch (error) {
      console.error(`\x1b[91m[TurnManager]\x1b[0m Error in turn handling:`, error);
      await this.continueToNextTurn();
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
      // AI ENEMY TURN - EXECUTE AND UPDATE IMMEDIATELY
      console.log(`\x1b[35m[TurnManager]\x1b[0m PvE AI Turn: ${currentTurn.name}`);
      
      await this.performEnemyTurn(currentTurn, currentEnemy);
      
      // IMMEDIATE UPDATE + DELAY + CONTINUE (merged)
      await new Promise(resolve => setTimeout(resolve, 1000));
      await this.performEmbedUpdate();
      await this.continueToNextTurn();
    } else {
      // PLAYER TURN - ONLY UPDATE IF IT'S THE FIRST PLAYER TURN IN SEQUENCE
      console.log(`\x1b[36m[TurnManager]\x1b[0m Player turn: ${currentTurn?.name || 'Unknown'}`);
      
      // UPDATE EMBED TO SET UP PLAYER UI (this is necessary for buttons/dropdowns)
      await this.performEmbedUpdate();
    }
  }

  private async handlePvPTurn(currentTurn: any | null): Promise<void> {
    console.log(`\x1b[33m[TurnManager]\x1b[0m handlePvPTurn for: ${currentTurn?.name}`);
    
    if (this.battle.mode === 'pvp_afk' && this.isAIPlayerTurn(currentTurn)) {
      // AI PLAYER TURN - EXECUTE AND UPDATE IMMEDIATELY
      console.log(`\x1b[33m[TurnManager]\x1b[0m PvP AI Turn: ${currentTurn?.name}`);
      
      await this.executeAITurnImmediate(currentTurn);
    } else {
      // HUMAN PLAYER TURN - UPDATE TO SET UP UI
      console.log(`\x1b[36m[TurnManager]\x1b[0m Player turn: ${currentTurn?.name || 'Unknown'}`);
      
      // UPDATE EMBED TO SET UP PLAYER UI (this is necessary for buttons/dropdowns)
      await this.performEmbedUpdate();
    }
  }

  // NEW: Combined AI execution with immediate embed update and continuation
  private async executeAITurnImmediate(currentTurn: any | null): Promise<void> {
    if (!this.pvpAI || !currentTurn) {
      console.error("\x1b[31m[TurnManager]\x1b[0m PvP AI not initialized");
      await this.executeAIFallbackImmediate(currentTurn);
      return;
    }
    
    try {
      const availableTargets = this.pvpAI.getAvailableTargets();
      
      const validTargets = availableTargets.filter(target => 
        target && target.name && target.stats && target.stats.defense !== undefined
      );
      
      if (validTargets.length === 0) {
        console.log("\x1b[31m[TurnManager]\x1b[0m No valid targets available for AI");
        await this.executeAIFallbackImmediate(currentTurn);
        return;
      }
      
      const decision = await this.pvpAI.makeDecision(currentTurn, validTargets);
      console.log(`\x1b[32m[TurnManager]\x1b[0m AI decision: ${decision.action} - ${decision.reasoning}`);
      

// PREVENT FRIENDLY FIRE - BUT ALLOW DEFENSIVE ABILITIES
if (decision.target && decision.abilityName) {
  const ability = abilities[decision.abilityName];
  const isDefensiveAbility = ability && (
    ability.logicType === 'increase_defense' ||
    ability.name.toLowerCase().includes('defend') ||
    ability.name.toLowerCase().includes('protect') ||
    ability.name.toLowerCase().includes('heal') ||
    ability.name.toLowerCase().includes('buff') ||
    ability.type.includes('buff') ||
    ability.type.includes('heal')
  );
  
  if (!isDefensiveAbility) {
    // Only check friendly fire for OFFENSIVE abilities
    const targets = Array.isArray(decision.target) ? decision.target : [decision.target];
    const friendlyFire = targets.some(target => this.isAIPlayerTurn(target));
    
    if (friendlyFire) {
      console.error("AI trying to attack teammate with offensive ability, using fallback");
      await this.executeAIFallbackImmediate(currentTurn);
      return;
    }
  } else {
    console.log(`✅ Allowing defensive ability ${decision.abilityName} to target teammates`);
  }
}

      
      // EXECUTE AI DECISION
      await this.pvpAI.executeDecision(decision);
      await cycleCooldowns(this.battle.stateManager.getState().cooldowns, currentTurn.name);
      // IMMEDIATE: Delay + Update + Continue (all merged)
      await new Promise(resolve => setTimeout(resolve, 1000));
      await this.performEmbedUpdate();
      await this.continueToNextTurn();
      
    } catch (error) {
      console.error("\x1b[31m[TurnManager]\x1b[0m Error in AI turn execution:", error);
      await this.executeAIFallbackImmediate(currentTurn);
    }
  }

  // NEW: Immediate AI fallback with merged update
  private async executeAIFallbackImmediate(currentTurn: any | null): Promise<void> {
    console.log("\x1b[33m[TurnManager]\x1b[0m Executing AI fallback action");
    
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
        
        await this.performPlayerTurn();
        this.battle.addBattleLog(`- ${currentTurn.name} attacks ${randomTarget.name} using basic attack (AI fallback)`);
      } else {
        console.error("\x1b[31m[TurnManager]\x1b[0m No valid targets for AI fallback");
      }
    } catch (error) {
      console.error("\x1b[31m[TurnManager]\x1b[0m Error in AI fallback:", error);
    }
    
    // IMMEDIATE: Delay + Update + Continue (all merged)
    await new Promise(resolve => setTimeout(resolve, 1000));
    await this.performEmbedUpdate();
    await this.continueToNextTurn();
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

  private clearTargetsForDeadCharacter(deadCharacter: any): void {
    const state = this.battle.stateManager.getState();
    
    Object.keys(state.playerTargets).forEach(playerId => {
      const currentTarget = this.battle.stateManager.getPlayerTarget(playerId);
      
      if (currentTarget && (
        currentTarget.id === deadCharacter.id || 
        currentTarget._id === deadCharacter._id || 
        currentTarget.serialId === deadCharacter.serialId
      )) {
        this.battle.stateManager.clearPlayerTarget(playerId);
        console.log(`\x1b[33m[TurnManager]\x1b[0m Cleared target for player ${playerId} because their target ${deadCharacter.name} died`);
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
        console.log(`\x1b[32m[TurnManager]\x1b[0m Auto-selected target for ${currentTurn.name}: ${validTargets[0].name}`);
      } else if (!isValidTarget && validTargets.length > 1) {
        this.battle.stateManager.clearPlayerTarget(currentPlayerId);
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
    if (currentTurn?.stats.hp <= 0) {
      console.log(`\x1b[31m[TurnManager]\x1b[0m ${currentTurn.name} died before taking enemy turn`);
      return;
    }

    const target = this.getEnemyTarget();
    
    const damage = await this.battle.mobAIClass?.move(currentTurn, target);

    await this.battle.combatResolver.applyDamage(
      target,
      damage || 0,
      currentEnemy,
      "enemy attack"
    );

    await cycleCooldowns(this.battle.stateManager.getState().cooldowns, currentTurn.name);
  }

  private getEnemyTarget(): any {
    const isTargetingPlayer = Math.random() < 0.3;
    const aliveFamiliars = this.battle.familiarInfo.filter(
      (familiar: any) => familiar.stats.hp > 0
    );
    
    const target = isTargetingPlayer || aliveFamiliars.length < 1
      ? this.battle.player
      : aliveFamiliars[Math.floor(Math.random() * aliveFamiliars.length)];
    
    return target;
  }

  async performPlayerTurn(): Promise<void> {
    const state = this.battle.stateManager.getState();
    
    if (!state.enemyToHit) {
      console.error("\x1b[31m[TurnManager]\x1b[0m No enemy target set for player turn");
      return;
    }
    
    if (!state.enemyToHit.stats || state.enemyToHit.stats.defense === undefined) {
      console.error(`\x1b[31m[TurnManager]\x1b[0m Invalid target for combat: ${state.enemyToHit.name || 'Unknown'}`);
      return;
    }
    
    await this.battle.combatResolver.executeBasicAttack(
      state.currentTurn,
      state.enemyToHit
    );
  }

  async continueToNextTurn(): Promise<void> {
    if (this.battleEnded) return;
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const state = this.battle.stateManager.getState();
    
    const alivePlayerTeam = [this.battle.player, ...this.battle.familiarInfo].filter(
      (char: any) => char && char.stats && char.stats.hp > 0
    );
    
    const aliveEnemyTeam = (state.aliveEnemies || []).filter(
      (enemy: any) => enemy && enemy.stats && enemy.stats.hp > 0
    );
    
    if (alivePlayerTeam.length === 0) {
      this.battleEnded = true;
      console.log("\x1b[31m[TurnManager]\x1b[0m Player team defeated - battle over");
      await this.battle.battleResultManager.handleDefeat();
      await this.performFinalEmbedUpdate();
      return;
    }
    
    if (aliveEnemyTeam.length === 0) {
      this.battleEnded = true;
      console.log("\x1b[32m[TurnManager]\x1b[0m Enemy team defeated - battle over");
      await this.battle.battleResultManager.handleVictory();
      await this.performFinalEmbedUpdate();
      return;
    }
    
    this.battle.stateManager.updateState({
      aliveTeam: alivePlayerTeam,
      aliveEnemies: aliveEnemyTeam
    });
    
    await this.getNextTurn();
  }

  // =================== EMBED UPDATE SYSTEM ===================

  // MODIFIED: Smart embed update that only updates when necessary
  async completeTurnAndContinue(): Promise<void> {
    console.log(`\x1b[94m[EMBED]\x1b[0m completeTurnAndContinue() called - player action completed`);
    
    if (this.embedUpdateInProgress) {
      console.log(`\x1b[93m[EMBED]\x1b[0m Embed update already in progress, skipping to next turn`);
      await this.continueToNextTurn();
      return;
    }

    const now = Date.now();
    const timeSinceLastUpdate = now - this.lastEmbedUpdate;
    
    if (timeSinceLastUpdate < 500) {
      console.log(`\x1b[93m[EMBED]\x1b[0m Embed update too soon (${timeSinceLastUpdate}ms ago), debouncing`);
      this.queueEmbedUpdate();
      await this.continueToNextTurn();
      return;
    }

    // CHECK: If next turn is AI, don't update here (AI will handle it immediately)
    await this.continueToNextTurn();
    
    // SMART UPDATE: Only update if the next turn is a player turn
    const nextState = this.battle.stateManager.getState();
    const nextTurn = nextState.currentTurn;
    
    if (nextTurn && !this.isAITurn(nextTurn)) {
      console.log(`\x1b[96m[EMBED]\x1b[0m Next turn is player, updating embed for UI setup`);
      // The embed will be updated in handlePvPTurn/handlePvETurn for player turns
    }
  }

  // NEW: Check if a turn belongs to AI
  private isAITurn(currentTurn: any): boolean {
    if (this.battle.mode === 'pve') {
      const state = this.battle.stateManager.getState();
      return state.aliveEnemies.some((enemy: any) => enemy.name === currentTurn?.name);
    } else {
      return this.isAIPlayerTurn(currentTurn);
    }
  }

  private queueEmbedUpdate(delay: number = 750): void {
    if (this.embedUpdateQueue) {
      console.log(`\x1b[96m[EMBED]\x1b[0m Clearing existing embed queue`);
      clearTimeout(this.embedUpdateQueue);
    }
    
    console.log(`\x1b[96m[EMBED]\x1b[0m Queueing embed update with ${delay}ms delay`);
    this.embedUpdateQueue = setTimeout(async () => {
      await this.performEmbedUpdate();
      this.embedUpdateQueue = null;
    }, delay);
  }

  private async performEmbedUpdate(): Promise<void> {
    if (this.embedUpdateInProgress) {
      console.log(`\x1b[93m[EMBED]\x1b[0m performEmbedUpdate blocked - already in progress`);
      return;
    }
    
    this.embedUpdateInProgress = true;
    this.lastEmbedUpdate = Date.now();
    this.embedUpdateCounter++;
    
    console.log(`\x1b[92m[EMBED #${this.embedUpdateCounter}]\x1b[0m Starting embed update...`);
    
    try {
      const state = this.battle.stateManager.getState();
      
      if (this.battle.initialisedEmbed && this.battle.initialMessage) {
        const updatedEmbed = await this.battle.initialisedEmbed.sendInitialEmbed(
          state.currentTurn,
          this.battle.mode === 'pve' ? this.battle.mobInfo : this.battle.player2FamiliarInfo
        );
        
        console.log(`\x1b[94m[EMBED #${this.embedUpdateCounter}]\x1b[0m Sending PATCH request to Discord...`);
        
        await this.battle.initialMessage.edit({
          embeds: [updatedEmbed],
          components: await this.battle.ui.createActionRows(),
        });
        
        console.log(`\x1b[92m[EMBED #${this.embedUpdateCounter}]\x1b[0m ✅ Embed updated successfully`);
      } else {
        console.log(`\x1b[91m[EMBED #${this.embedUpdateCounter}]\x1b[0m ❌ Missing embed or message objects`);
      }
    } catch (error) {
      console.error(`\x1b[91m[EMBED #${this.embedUpdateCounter}]\x1b[0m ❌ Error updating battle UI:`, error);
    } finally {
      this.embedUpdateInProgress = false;
      console.log(`\x1b[95m[EMBED #${this.embedUpdateCounter}]\x1b[0m Embed update completed (lock released)`);
    }
  }

  private async performFinalEmbedUpdate(): Promise<void> {
    this.embedUpdateCounter++;
    console.log(`\x1b[93m[FINAL EMBED #${this.embedUpdateCounter}]\x1b[0m Battle ended - sending final embed update...`);
    
    try {
      if (this.battle.battleEmbed && this.battle.initialMessage) {
        console.log(`\x1b[94m[FINAL EMBED #${this.embedUpdateCounter}]\x1b[0m Sending final PATCH request to Discord...`);
        
        await this.battle.initialMessage.edit({
          embeds: [this.battle.battleEmbed],
          components: [],
        });
        
        console.log(`\x1b[92m[FINAL EMBED #${this.embedUpdateCounter}]\x1b[0m ✅ Final embed updated successfully`);
      } else {
        console.log(`\x1b[91m[FINAL EMBED #${this.embedUpdateCounter}]\x1b[0m ❌ Missing final embed or message objects`);
      }
    } catch (error) {
      console.error(`\x1b[91m[FINAL EMBED #${this.embedUpdateCounter}]\x1b[0m ❌ Error updating final battle UI:`, error);
    }
  }
}
