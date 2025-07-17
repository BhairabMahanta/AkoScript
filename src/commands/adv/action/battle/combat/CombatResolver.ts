// combat/CombatResolver.ts
import { critOrNot, handleTurnEffects } from '../../../../util/glogic';
import { DodgeResult } from '../types/BattleTypes';

export class CombatResolver {
  private battle: any;

  constructor(battle: any) {
    this.battle = battle;
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

  async handleDodge(attacker: any, target: any): Promise<DodgeResult> {
    const state = this.battle.stateManager.getState();
    
    if (state.dodge.id !== target._id && state.dodge.id !== target.id) {
      return { succeeded: false, message: '' };
    }

    // Define the valid dodge option keys
    type DodgeOptionKey = 
      | 'dodge_and_increase_attack_bar'
      | 'dodge'
      | 'reduce_damage'
      | 'take_hit'
      | 'take_15x_damage';

    const dodgeOptions: Record<DodgeOptionKey, () => Promise<DodgeResult>> = {
      dodge_and_increase_attack_bar: async () => {
        // Fix: Ensure atkBar is treated as a number
        const currentAtkBar = typeof target.atkBar === 'number' ? target.atkBar : 0;
        target.atkBar = currentAtkBar + 20;
        return {
          succeeded: true,
          message: `- ${target.name} swiftly dodges the attack increasing 20 attack bar!!`
        };
      },
      dodge: async () => ({
        succeeded: true,
        message: `- ${target.name} barely dodges the attack!`
      }),
      reduce_damage: async () => {
        const damage = await this.calculateDamage(attacker, target);
        const reducedDamage = damage / 2;
        target.stats.hp -= reducedDamage;
        return {
          succeeded: true,
          damage: reducedDamage,
          message: `- ${attacker.name} attacks ${target.name} for ${reducedDamage} damage. Reduced ${damage - reducedDamage} damage!!`
        };
      },
      take_hit: async () => {
        const damage = await this.calculateDamage(attacker, target);
        target.stats.hp -= damage;
        return {
          succeeded: false,
          damage,
          message: `+ ${attacker.name} attacks ${target.name} for ${damage} damage. Failed to dodge!`
        };
      },
      take_15x_damage: async () => {
        const damage = await this.calculateDamage(attacker, target);
        const increasedDamage = damage * 2;
        target.stats.hp -= increasedDamage + damage;
        return {
          succeeded: false,
          damage: damage + increasedDamage,
          message: `+ ${attacker.name} attacks ${target.name} for ${damage} damage and ${increasedDamage}. ${target.name} slipped and fell while trying to dodge!`
        };
      },
    };

    const dodgeOption = state.dodge.option as DodgeOptionKey;
    
    // Type guard to ensure the option is valid
    if (dodgeOption && dodgeOptions[dodgeOption]) {
      return await dodgeOptions[dodgeOption]();
    }

    return { succeeded: false, message: '' };
  }

  async executeBasicAttack(attacker: any, target: any): Promise<void> {
    const damage = await this.calculateDamage(attacker, target);
    await this.applyDamage(target, damage, attacker, "basic attack");
  }

  async applyDamage(target: any, damage: number, attacker: any, attackName: string = "an attack"): Promise<void> {
    const dodgeResult = await this.handleDodge(attacker, target);
    
    if (dodgeResult.succeeded) {
      this.battle.stateManager.addBattleLog(dodgeResult.message);
      await handleTurnEffects(attacker);
      this.battle.stateManager.updateState({ dodge: { option: null, id: null } });
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
      return;
    }

    // Apply final damage
    target.stats.hp -= statusResult.damage;
    this.battle.stateManager.addBattleLog(
      `+ ${attacker.name} attacks ${target.name} for ${statusResult.damage} damage using ${attackName}`
    );

    await handleTurnEffects(attacker);
  }

  async handleStatusEffects(
    target: any,
    damage: number,
    attacker: any,
    name?: string
  ): Promise<void | boolean> {
    const dodgeEffect = await this.handleDodge(attacker, target);
    
    if (dodgeEffect.succeeded) {
      this.battle.stateManager.addBattleLog(dodgeEffect.message);
      await handleTurnEffects(attacker);
      this.battle.stateManager.updateState({ dodge: { option: null, id: null } });
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

    // Apply final damage
    target.stats.hp -= statusResult.damage;
    this.battle.stateManager.addBattleLog(
      `+ ${attacker.name} attacks ${target.name} for ${statusResult.damage} damage using ${
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

    // Handle dodge mechanics
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
