// gamelogic/abilitiesFunction.ts
import {
  checkResults,
  updateMovesOnCd,
  getPlayerMoves,
  critOrNot,
} from "../util/glogic.js";
import { BuffDebuffManager } from "./buffDebuffManager";
import { BuffDebuffLogic, BuffDetails, DebuffDetails, ExtendedPlayer } from "./buffdebufflogic";
import abilities, { AbilityInterface } from "../../data/abilities";
import allFamiliars from "../../data/information/allfamiliars.js";
import { Stats } from "../../data/mongo/playerschema.js";
import { isArray } from "util";

class Ability {
  private battle: any;
  private buffDebuffManager: BuffDebuffManager;
  private buffDebuffLogic: BuffDebuffLogic;

  constructor(battle: any) {
    this.battle = battle;
    this.buffDebuffManager = new BuffDebuffManager(battle);
    this.buffDebuffLogic = new BuffDebuffLogic(battle);
  }

  async cooldownFinder(ability: string): Promise<number> {
    const abilityData = abilities[ability];
    return abilityData?.cooldown || 0;
  }

  async executeAbility(
    user: ExtendedPlayer,
    target: ExtendedPlayer | ExtendedPlayer[],
    allTargets: ExtendedPlayer[],
    allAllies: ExtendedPlayer[],
    abilityName: string
  ): Promise<void> {
    const ability = abilities[abilityName];
    
    if (!ability) {
      console.error(`Ability ${abilityName} not found`);
      return;
    }

    try {
      // Execute ability based on type
      switch (ability.type) {
        case "attack":
          await this.handleAttack(user, target, ability);
          break;
        case "attack_many":
          await this.handleAttack(user, Array.isArray(target) ? target : allTargets, ability);
          break;
        case "increase_self":
          await this.handleBuff(user, user, ability);
          break;
        case "increase_hit":
          await this.handleBuffAttack(user, target, ability);
          break;
        case "decrease":
          await this.handleDebuff(user, target, ability);
          break;
        case "decrease_hit":
          await this.handleDebuffAttack(user, target, ability);
          break;
        case "buff_self":
          await this.handleBuff(user, user, ability);
          break;
        case "buff_many":
          await this.handleBuff(user, Array.isArray(target) ? target : allAllies, ability);
          break;
        case "buff_hit":
          await this.handleBuffAttack(user, target, ability);
          break;
        case "debuff":
          await this.handleDebuff(user, target, ability);
          break;
        case "debuff_many":
          await this.handleDebuff(user, Array.isArray(target) ? target : allTargets, ability);
          break;
        case "debuff_hit":
          await this.handleDebuffAttack(user, target, ability);
          break;
        case "heal":
          await this.handleHeal(user, target, ability);
          break;
        case "heal_many":
          await this.handleHeal(user, Array.isArray(target) ? target : allAllies, ability);
          break;
        case "heal_hit":
          await this.handleHealAttack(user, target, ability);
          break;
        case "hit_buff":
          await this.handleAttackBuff(user, target, ability);
          break;
        default:
          console.log(`Ability type ${ability.type} is not handled.`);
          break;
      }
    } catch (error) {
      console.error(`Error executing ability ${abilityName}:`, error);
      this.battle.addBattleLog(`${user.name} failed to use ${abilityName}.`);
    }
  }

  // Attack ability handler
  private async handleAttack(
    user: ExtendedPlayer,
    target: ExtendedPlayer | ExtendedPlayer[],
    ability: AbilityInterface
  ): Promise<void> {
    if (Array.isArray(target)) {
      try {
        const { damageArray, enemyNameArray } = await this.buffDebuffLogic.aoeDamage(user, target, ability);
        this.battle.addBattleLog(
          `+ ${user.name} performs ${ability.name}, hitting ${enemyNameArray.join(", ")} for ${damageArray.join(", ")} damage respectively`
        );
      } catch (error) {
        console.error("AOE damage error:", error);
        // Fallback to individual attacks
        for (const t of target) {
          await this.battle.combatResolver.critOrNotHandler(
            user.stats.critRate,
            user.stats.critDamage,
            user.stats.attack,
            t.stats.defense,
            t,
            150,
            ability.name
          );
        }
      }
    } else {
      await this.battle.combatResolver.critOrNotHandler(
        user.stats.critRate,
        user.stats.critDamage,
        user.stats.attack,
        target.stats.defense,
        target,
        150,
        ability.name
      );
    }

    // Add cooldown
    this.battle.stateManager.addCooldown({
      name: ability.name,
      cooldown: await this.cooldownFinder(ability.name),
    });
  }

  // Buff ability handler
  private async handleBuff(
    user: ExtendedPlayer,
    target: ExtendedPlayer | ExtendedPlayer[],
    ability: AbilityInterface
  ): Promise<void> {
    if (ability.value_amount) {
      const buffDetails: BuffDetails = {
        name: ability.name,
        type: ability.logicType || 'buff',
        unique: ability.unique || false,
        value_amount: ability.value_amount,
        targets: target,
        turnLimit: ability.turnLimit || 1,
        flat: ability.flat || false,
      };

      await this.buffDebuffManager.applyBuff(user, target, buffDetails);

      if (
        buffDetails.type.includes("increase_") ||
        buffDetails.type.includes("decrease_")
      ) {
        await this.buffDebuffLogic.increaseWhat(target, buffDetails);
      }
    }

    // Add cooldown
    this.battle.stateManager.addCooldown({
      name: ability.name,
      cooldown: await this.cooldownFinder(ability.name),
    });
  }

  private async handleBuffAttack(
    user: ExtendedPlayer,
    target: ExtendedPlayer | ExtendedPlayer[],
    ability: AbilityInterface
  ): Promise<void> {
    // Apply buff first
    if (ability.value_amount) {
      const buffDetails: BuffDetails = {
        name: ability.name,
        type: ability.logicType || 'buff',
        unique: ability.unique || false,
        value_amount: ability.value_amount,
        targets: user,
        turnLimit: ability.turnLimit || 1,
        flat: ability.flat || false,
      };

      await this.buffDebuffManager.applyBuff(user, user, buffDetails);

      if (
        buffDetails.type.includes("increase_") ||
        buffDetails.type.includes("decrease_")
      ) {
        await this.buffDebuffLogic.increaseWhat(user, buffDetails);
      }
    }

    // Then perform attack
    await this.performAttack(user, target, ability);

    // Add cooldown
    this.battle.stateManager.addCooldown({
      name: ability.name,
      cooldown: await this.cooldownFinder(ability.name),
    });
  }

  private async handleAttackBuff(
    user: ExtendedPlayer,
    target: ExtendedPlayer | ExtendedPlayer[],
    ability: AbilityInterface
  ): Promise<void> {
    // Perform attack first
    await this.performAttack(user, target, ability);

    // Then apply buff
    if (ability.value_amount) {
      const buffDetails: BuffDetails = {
        name: ability.name,
        type: ability.logicType || 'buff',
        unique: ability.unique || false,
        value_amount: ability.value_amount,
        targets: user,
        turnLimit: ability.turnLimit || 1,
        flat: ability.flat || false,
      };
      
      if (
        buffDetails.type.includes("apply_") ||
        buffDetails.type.includes("remove_")
      ) {
        await this.buffDebuffManager.applyBuff(user, user, buffDetails);
        await this.buffDebuffLogic.increaseWhat(user, buffDetails);
      }
    }

    // Add cooldown
    this.battle.stateManager.addCooldown({
      name: ability.name,
      cooldown: await this.cooldownFinder(ability.name),
    });
  }

  // Debuff ability handler
  private async handleDebuff(
    user: ExtendedPlayer,
    target: ExtendedPlayer | ExtendedPlayer[],
    ability: AbilityInterface
  ): Promise<void> {
    if (ability.value_amount) {
      const debuffDetails: DebuffDetails = {
        name: ability.name,
        type: ability.logicType || 'debuff',
        unique: ability.unique || false,
        value_amount: ability.value_amount,
        targets: target,
        turnLimit: ability.turnLimit || 1,
        flat: ability.flat || false,
      };

      await this.buffDebuffManager.applyDebuff(user, target, debuffDetails);

      if (
        debuffDetails.type.includes("apply_") ||
        debuffDetails.type.includes("remove_")
      ) {
        await this.buffDebuffLogic.decreaseWhat(target, debuffDetails);
      }
    }

    // Add cooldown
    this.battle.stateManager.addCooldown({
      name: ability.name,
      cooldown: await this.cooldownFinder(ability.name),
    });
  }

  private async handleDebuffAttack(
    user: ExtendedPlayer,
    target: ExtendedPlayer | ExtendedPlayer[],
    ability: AbilityInterface
  ): Promise<void> {
    // Apply debuff first
    if (ability.value_amount) {
      const debuffDetails: DebuffDetails = {
        name: ability.name,
        type: ability.logicType || 'debuff',
        unique: ability.unique || false,
        value_amount: ability.value_amount,
        targets: target,
        turnLimit: ability.turnLimit || 1,
        flat: ability.flat || false,
      };

      await this.buffDebuffManager.applyDebuff(user, target, debuffDetails);

      if (
        debuffDetails.type.includes("increase_") ||
        debuffDetails.type.includes("decrease_")
      ) {
        await this.buffDebuffLogic.decreaseWhat(target, debuffDetails);
      }
    }

    // Then perform attack
    await this.performAttack(user, target, ability);

    // Add cooldown
    this.battle.stateManager.addCooldown({
      name: ability.name,
      cooldown: await this.cooldownFinder(ability.name),
    });
  }

  // Heal ability handler
  private async handleHeal(
    user: ExtendedPlayer,
    target: ExtendedPlayer | ExtendedPlayer[],
    ability: AbilityInterface
  ): Promise<void> {
    const healAmount = ability.value_amount && typeof ability.value_amount === 'object' 
      ? (ability.value_amount as any)["heal"] || 0 
      : 0;
    
    if (Array.isArray(target)) {
      for (const t of target) {
        const currentHp = typeof t.stats.hp === 'number' ? t.stats.hp : 0;
        const maxHp = t.maxHp || currentHp;
        t.stats.hp = Math.min(currentHp + healAmount, maxHp);
      }
      this.battle.addBattleLog(
        `${user.name} heals ${target.map(t => t.name).join(", ")} with ${ability.name}, restoring ${healAmount} HP each.`
      );
    } else {
      const currentHp = typeof target.stats.hp === 'number' ? target.stats.hp : 0;
      const maxHp = target.maxHp || currentHp;
      target.stats.hp = Math.min(currentHp + healAmount, maxHp);
      this.battle.addBattleLog(
        `${user.name} heals ${target.name} with ${ability.name}, restoring ${healAmount} HP.`
      );
    }

    // Add cooldown
    this.battle.stateManager.addCooldown({
      name: ability.name,
      cooldown: await this.cooldownFinder(ability.name),
    });
  }

  private async handleHealAttack(
    user: ExtendedPlayer,
    target: ExtendedPlayer | ExtendedPlayer[],
    ability: AbilityInterface
  ): Promise<void> {
    // Perform attack first
    await this.performAttack(user, target, ability);

    // Then heal user
    const healAmount = ability.value_amount && typeof ability.value_amount === 'object' 
      ? (ability.value_amount as any)["heal"] || 0 
      : 0;
      
    const currentHp = typeof user.stats.hp === 'number' ? user.stats.hp : 0;
    const maxHp = user.maxHp || currentHp;
    user.stats.hp = Math.min(currentHp + healAmount, maxHp);
    
    this.battle.addBattleLog(
      `${user.name} heals themselves with ${ability.name}, restoring ${healAmount} HP.`
    );

    // Add cooldown
    this.battle.stateManager.addCooldown({
      name: ability.name,
      cooldown: await this.cooldownFinder(ability.name),
    });
  }

  // Helper method to perform attack
  private async performAttack(
    user: ExtendedPlayer,
    target: ExtendedPlayer | ExtendedPlayer[],
    ability: AbilityInterface
  ): Promise<void> {
    if (Array.isArray(target)) {
      try {
        const { damageArray, enemyNameArray } = await this.buffDebuffLogic.aoeDamage(user, target, ability);
        this.battle.addBattleLog(
          `+ ${user.name} performs ${ability.name}, hitting ${enemyNameArray.join(", ")} for ${damageArray.join(", ")} damage respectively`
        );
      } catch (error) {
        console.error("AOE damage error:", error);
        // Fallback to individual attacks
        for (const t of target) {
          await this.battle.combatResolver.critOrNotHandler(
            user.stats.critRate,
            user.stats.critDamage,
            user.stats.attack,
            t.stats.defense,
            t,
            150,
            ability.name
          );
        }
      }
    } else {
      await this.battle.combatResolver.critOrNotHandler(
        user.stats.critRate,
        user.stats.critDamage,
        user.stats.attack,
        target.stats.defense,
        target,
        150,
        ability.name
      );
    }
  }
}

export { Ability };
