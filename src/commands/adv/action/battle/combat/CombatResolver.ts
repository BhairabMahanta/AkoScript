// combat/CombatResolver.ts - FIXED WITH CharacterIdentifier
import { critOrNot, handleTurnEffects } from '../../../../util/glogic';
import { DodgeResult } from '../types/BattleTypes';
import { CharacterIdentifier } from '../ui/managers/CharacterIdentifier';

export class CombatResolver {
  private battle: any;
  private characterIdentifier: CharacterIdentifier;

  constructor(battle: any) {
    this.battle = battle;
    this.characterIdentifier = new CharacterIdentifier(battle);
  }

  async calculateDamage(attacker: any, target: any): Promise<number> {
    return critOrNot(
      attacker.stats.critRate,
      attacker.stats.critDamage,
      attacker.stats.attack,
      target.stats.defense,
      attacker.stats.attack
    );
  }

  // FIXED: Use CharacterIdentifier for proper team detection
  private isPlayerTeamCharacter(character: any): boolean {
    if (!character) return false;
    
    console.log(`\x1b[33m[CombatResolver]\x1b[0m Checking team for: ${character.name} (Mode: ${this.battle.mode})`);
    
    // Use CharacterIdentifier to check if it's Player 1's character
    if (this.characterIdentifier.isPlayer1Character(character)) {
      console.log(`\x1b[32m[CombatResolver]\x1b[0m ${character.name} is Player 1 character (PLAYER TEAM)`);
      return true;
    }
    
    // In PvP AFK mode, Player 2 characters are AI-controlled (enemy team)
    if (this.battle.mode === 'pvp_afk' && this.characterIdentifier.isPlayer2Character(character)) {
      console.log(`\x1b[31m[CombatResolver]\x1b[0m ${character.name} is Player 2/AI character (AI TEAM)`);
      return false;
    }
    
    // Fallback: Check aliveEnemies for PvE mode
    const state = this.battle.stateManager.getState();
    if (state.aliveEnemies) {
      const isInAliveEnemies = state.aliveEnemies.some((enemy: any) => {
        const match = enemy.name === character.name ||
                     enemy.id === character.id ||
                     enemy._id === character._id ||
                     enemy.serialId === character.serialId;
        
        if (match) {
          console.log(`\x1b[31m[CombatResolver]\x1b[0m ${character.name} found in aliveEnemies (AI TEAM)`);
        }
        return match;
      });
      
      if (isInAliveEnemies) {
        return false;
      }
    }
    
    // Default: assume AI if we can't determine
    console.log(`\x1b[31m[CombatResolver]\x1b[0m ${character.name} team unknown, defaulting to AI TEAM`);
    return false;
  }

  // Get the correct log symbol based on who is acting
  private getLogSymbol(actor: any): string {
    const isPlayerTeam = this.isPlayerTeamCharacter(actor);
    const symbol = isPlayerTeam ? '+' : '-';
    console.log(`\x1b[34m[CombatResolver]\x1b[0m ${actor.name} gets symbol: ${symbol} (isPlayerTeam: ${isPlayerTeam})`);
    return symbol;
  }

  async handleDodge(attacker: any, target: any): Promise<DodgeResult> {
    const state = this.battle.stateManager.getState();
    
    if (state.dodge.id !== target._id && state.dodge.id !== target.id) {
      return { succeeded: false, message: '' };
    }

    // Get symbol based on who is dodging (target)
    const dodgeSymbol = this.getLogSymbol(target);
    // Get symbol based on who is attacking (attacker) 
    const attackSymbol = this.getLogSymbol(attacker);

    type DodgeOptionKey = 
      | 'dodge_and_increase_attack_bar'
      | 'dodge'
      | 'reduce_damage'
      | 'take_hit'
      | 'take_1.5x_damage';

    const dodgeOptions: Record<DodgeOptionKey, () => Promise<DodgeResult>> = {
      dodge_and_increase_attack_bar: async () => {
        const currentAtkBar = typeof target.atkBar === 'number' ? target.atkBar : 0;
        target.atkBar = currentAtkBar + 20;
        return {
          succeeded: true,
          message: `${dodgeSymbol} ${target.name} swiftly dodges the attack increasing 20 attack bar!!`
        };
      },
      dodge: async () => ({
        succeeded: true,
        message: `${dodgeSymbol} ${target.name} barely dodges the attack!`
      }),
      reduce_damage: async () => {
        const damage = await this.calculateDamage(attacker, target);
        const reducedDamage = damage / 2;
        target.stats.hp -= reducedDamage;
        return {
          succeeded: true,
          damage: reducedDamage,
          message: `${dodgeSymbol} ${target.name} partially blocks the attack! Takes ${Math.round(reducedDamage)} damage (reduced from ${Math.round(damage)})`
        };
      },
      take_hit: async () => {
        const damage = await this.calculateDamage(attacker, target);
        target.stats.hp -= damage;
        return {
          succeeded: false,
          damage,
          message: `${attackSymbol} ${attacker.name} attacks ${target.name} for ${damage} damage (dodge failed!)`
        };
      },
      'take_1.5x_damage': async () => {
        const damage = await this.calculateDamage(attacker, target);
        const increasedDamage = damage * 1.5;
        target.stats.hp -= increasedDamage;
        return {
          succeeded: false,
          damage: increasedDamage,
          message: `${attackSymbol} ${attacker.name} attacks ${target.name} for ${Math.round(increasedDamage)} damage (${target.name} slipped while dodging!)`
        };
      },
    };

    const dodgeOption = state.dodge.option as DodgeOptionKey;
    
    if (dodgeOption && dodgeOptions[dodgeOption]) {
      const result = await dodgeOptions[dodgeOption]();
      
      // Clear dodge state after processing
      this.battle.stateManager.updateState({ dodge: { option: null, id: null } });
      
      return result;
    }

    return { succeeded: false, message: '' };
  }

  async executeBasicAttack(attacker: any, target: any): Promise<void> {
    const damage = await this.calculateDamage(attacker, target);
    await this.applyDamage(target, damage, attacker, "basic attack");
  }

  async applyDamage(target: any, damage: number, attacker: any, attackName: string = "an attack"): Promise<void> {
    // Check for dodge first
    const dodgeResult = await this.handleDodge(attacker, target);
    
    if (dodgeResult.succeeded || dodgeResult.message) {
      // Dodge was processed (successful or failed), log the result
      this.battle.stateManager.addBattleLog(dodgeResult.message);
      await handleTurnEffects(attacker);
      return;
    }

    // No dodge state, proceed with normal damage
    if (target.isNPC === true) {
      return;
    }

    const statusResult = await this.battle.statusEffectManager.applyOnDamageEffects(
      target, damage, attacker, this.battle
    );

    if (statusResult.effectApplied) {
      await handleTurnEffects(attacker);
      return;
    }

    // Apply final damage - use symbol based on attacker's team
    target.stats.hp -= statusResult.damage;
    
    const attackSymbol = this.getLogSymbol(attacker);
    
    this.battle.stateManager.addBattleLog(
      `${attackSymbol} ${attacker.name} attacks ${target.name} for ${statusResult.damage} damage using ${attackName}`
    );
    
    // Add the crit/normal damage indicator on separate line (like in your logs)
    const isCritical = statusResult.damage > damage * 1.2;
    const critText = isCritical ? "crit damage" : "normal damage";
    console.log(critText);

    await handleTurnEffects(attacker);
  }

  async handleStatusEffects(
    target: any,
    damage: number,
    attacker: any,
    name?: string
  ): Promise<void | boolean> {
    // Check for dodge first
    const dodgeEffect = await this.handleDodge(attacker, target);
    
    if (dodgeEffect.succeeded || dodgeEffect.message) {
      this.battle.stateManager.addBattleLog(dodgeEffect.message);
      await handleTurnEffects(attacker);
      return;
    }

    if (target.isNPC === true) {
      return;
    }

    const statusResult = await this.battle.statusEffectManager.applyOnDamageEffects(
      target, damage, attacker, this.battle
    );

    if (statusResult.effectApplied) {
      await handleTurnEffects(attacker);
      return true;
    }

    // Apply final damage - use symbol based on attacker's team
    target.stats.hp -= statusResult.damage;
    
    const attackSymbol = this.getLogSymbol(attacker);
    
    this.battle.stateManager.addBattleLog(
      `${attackSymbol} ${attacker.name} attacks ${target.name} for ${statusResult.damage} damage using ${
        name !== undefined ? name : "an attack"
      }`
    );

    await handleTurnEffects(attacker);
    return false;
  }

  getCurrentAttacker(): any {
    const state = this.battle.stateManager.getState();
    return state.currentTurn;
  }

  getEnemyTarget(): any {
    const isTargetingPlayer = Math.random() < 0.3;
    const aliveFamiliars = this.battle.familiarInfo.filter(
      (familiar: any) => familiar.stats.hp > 0
    );
    
    return isTargetingPlayer || aliveFamiliars.length < 1
      ? this.battle.player
      : aliveFamiliars[Math.floor(Math.random() * aliveFamiliars.length)];
  }

  async performTurn(): Promise<void> {
    const state = this.battle.stateManager.getState();
    console.log(
      "attacker:",
      state.currentTurn?.name,
      "attacking",
      state.enemyToHit?.name
    );
    
    const damage = await this.calculateDamage(
      state.currentTurn,
      state.enemyToHit
    );

    await this.handleStatusEffects(state.enemyToHit, damage, state.currentTurn);
  }

  async critOrNotHandler(
    critRate: number,
    critDamage: number,
    attack: number,
    defense: number,
    target: any,
    ability: any,
    name: string
  ): Promise<void> {
    const damage = await critOrNot(
      critRate,
      critDamage,
      attack,
      defense,
      ability
    );

    await this.handleStatusEffects(target, damage, this.getCurrentAttacker(), name);
  }
}
