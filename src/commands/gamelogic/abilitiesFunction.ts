import {
  checkResults,
  updateMovesOnCd,
  getPlayerMoves,
  critOrNot,
} from "../util/glogic.js";
import { BuffDebuffManager, ExtendedPlayer } from "./buffDebuffManager";
import { BuffDebuffLogic } from "./buffdebufflogic";
import abilities, { AbilityInterface } from "../../data/abilities";
import allFamiliars from "../../data/information/allfamiliars.js";
import { Stats } from "../../data/mongo/playerschema.js";
import { isArray } from "util";
// import { calculateDamage } from "../../../my_rust_library/my_rust_library.node";
// import { some } from "../../../data/locations.js";

type DebuffDetails = {
  name: string;
  debuffType: string;
  unique: boolean;
  value_amount: Record<string, number>;
  targets: ExtendedPlayer;
  turnLimit: number;
  flat: boolean;
};

type BuffDetails = {
  name: string;
  buffType: string;
  unique: boolean;
  value_amount: Record<string, number>;
  targets: ExtendedPlayer;
  turnLimit: number;
  flat: boolean;
};

export class Ability {
  private battleLogs: any;
  private that2: any;
  private enemyToHit: any;
  private cooldowns: { name: string; cooldown: Promise<number> }[];
  private buffDebuffManager: any;
  private buffDebuffLogic: any;

  constructor(that: any) {
    this.that2 = that;
    this.battleLogs = that.battleLogs;
    this.enemyToHit = that.enemyToHit;
    this.cooldowns = that.cooldowns;
    this.buffDebuffManager = new BuffDebuffManager(that);
    this.buffDebuffLogic = new BuffDebuffLogic(that);
  }

  async cooldownFinder(ability: string): Promise<number> {
    const abilityCooldown = abilities[ability].cooldown;
    return abilityCooldown;
  }

  async executeAbility(
    user: ExtendedPlayer,
    target: ExtendedPlayer,
    allTargets: ExtendedPlayer[],
    allAllies: ExtendedPlayer[],
    eability: string
  ): Promise<void> {
    const ability = abilities[eability];

    // Execute ability based on type
    switch (ability.type) {
      case "attack":
        await this.handleAttack(user, target, ability);
        break;
      case "attack_many":
        await this.handleAttack(user, allTargets, ability);
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
        await this.handleBuff(user, target, ability);
        break;
      case "buff_hit":
        await this.handleBuffAttack(user, target, ability);
        break;
      case "debuff":
        await this.handleDebuff(user, target, ability);
        break;
      case "debuff_many":
        await this.handleDebuff(user, allTargets, ability);
        break;
      case "debuff_hit":
        await this.handleDebuffAttack(user, target, ability);
        break;
      case "heal":
        await this.handleHeal(user, target, ability);
        break;
      case "heal_many":
        await this.handleHeal(user, allTargets, ability);
        break;
      case "heal_hit":
        await this.handleHealAttack(user, target, ability);
        break;
      // case "decrease_many_attack":
      //   await this.handleDecreaseManyAttack(user, allTargets, ability);
      //   break;
      // case "increase_many_attack":
      //   await this.handleIncreaseManyAttack(user, allTargets, ability);
      //   break;
      // case "increase_many_attack_many":
      //   await this.handleIncreaseManyAttackMany(user, allTargets, ability);
      //   break;
      // case "special_effect":
      //   await this.handleSpecialEffect(user, target, ability);
      //   break;
      // case "special_effect_attack":
      //   await this.handleSpecialEffectAttack(user, target, ability);
      //   break;
      // case "special_effect_many":
      //   await this.handleSpecialEffectMany(user, allTargets, ability);
      //   break;
      case "hit_buff":
        await this.handleAttackBuff(user, target, ability);
        break;
      // case "attack_debuff":
      //   await this.handleAttackDebuff(user, target, ability);
      //   break;
      // case "increase_attack_buff":
      //   await this.handleIncreaseAttackBuff(user, target, ability);
      //   break;
      // case "increase_attack_debuff":
      //   await this.handleIncreaseAttackDebuff(user, target, ability);
      //   break;
      // case "decrease_attack_buff":
      //   await this.handleDecreaseAttackBuff(user, target, ability);
      //   break;
      // case "decrease_attack_debuff":
      //   await this.handleDecreaseAttackDebuff(user, target, ability);
      //   break;
      // case "buff_attack":
      //   await this.handleBuffAttack(user, target, ability);
      //   break;
      // case "debuff_attack":
      //   await this.handleDebuffAttack(user, target, ability);
      //   break;
      // case "heal_buff":
      //   await this.handleHealBuff(user, target, ability);
      //   break;
      // case "heal_debuff":
      //   await this.handleHealDebuff(user, target, ability);
      //   break;
      // case "special_effect_buff":
      //   await this.handleSpecialEffectBuff(user, target, ability);
      //   break;
      // case "special_effect_debuff":
      //   await this.handleSpecialEffectDebuff(user, target, ability);
      //   break;
      // case "heal_special_effect":
      //   await this.handleHealSpecialEffect(user, target, ability);
      //   break;
      // case "buff_special_effect":
      //   await this.handleBuffSpecialEffect(user, target, ability);
      //   break;
      // case "debuff_special_effect":
      //   await this.handleDebuffSpecialEffect(user, target, ability);
      //   break;
      // case "increase_attack_heal":
      //   await this.handleIncreaseAttackHeal(user, target, ability);
      //   break;
      // case "decrease_attack_heal":
      //   await this.handleDecreaseAttackHeal(user, target, ability);
      //   break;
      // case "increase_attack_special_effect":
      //   await this.handleIncreaseAttackSpecialEffect(user, target, ability);
      //   break;
      // case "decrease_attack_special_effect":
      //   await this.handleDecreaseAttackSpecialEffect(user, target, ability);
      //   break;
      // case "increase_buff_attack":
      //   await this.handleIncreaseBuffAttack(user, target, ability);
      //   break;
      // case "decrease_buff_attack":
      //   await this.handleDecreaseBuffAttack(user, target, ability);
      //   break;
      // case "increase_buff_special_effect":
      //   await this.handleIncreaseBuffSpecialEffect(user, target, ability);
      //   break;
      // case "decrease_buff_special_effect":
      //   await this.handleDecreaseBuffSpecialEffect(user, target, ability);
      //   break;
      // case "increase_debuff_attack":
      //   await this.handleIncreaseDebuffAttack(user, target, ability);
      //   break;
      // case "decrease_debuff_attack":
      //   await this.handleDecreaseDebuffAttack(user, target, ability);
      //   break;
      // case "increase_debuff_special_effect":
      //   await this.handleIncreaseDebuffSpecialEffect(user, target, ability);
      //   break;
      // case "decrease_debuff_special_effect":
      //   await this.handleDecreaseDebuffSpecialEffect(user, target, ability);
      //   break;
      default:
        console.log(`Ability type ${ability.type} is not handled.`);
        break;
    }
  }

  // Attack ability handler
  private async handleAttack(
    user: ExtendedPlayer,
    target: ExtendedPlayer | ExtendedPlayer[],
    ability: AbilityInterface
  ): Promise<void> {
    // Assuming you have a function to calculate damage
    if (Array.isArray(target)) {
      const { damageArray, enemyNameArray } =
        await this.buffDebuffLogic.aoeDamage(user, target, target);

      this.battleLogs.push(
        `+ ${user.name} performs frostNova, hitting ${enemyNameArray.join(
          " ,"
        )} for ${damageArray.join(" ,")} damage respectively`
      );
    } else {
      const damage = await this.that2.critOrNotHandler(
        user.stats.critRate,
        user.stats.critDamage,
        user.stats.attack,
        target.stats.defense,
        target,
        150,
        ability.name
      );

      this.cooldowns.push({
        name: ability.name,
        cooldown: this.cooldownFinder(ability.name),
      });
    }
  }

  // Buff ability handler
  private async handleBuff(
    user: ExtendedPlayer,
    target: ExtendedPlayer | ExtendedPlayer[],
    ability: AbilityInterface
  ): Promise<void> {
    if (ability.value_amount) {
      const buffDetails = {
        name: ability.name,
        type: ability.logicType,
        unique: ability.unique || false,
        value_amount: ability.value_amount,
        targets: target,
        turnLimit: ability.turnLimit || 1,
        flat: ability.flat || false,
      };

      this.buffDebuffManager.applyBuff(user, target, buffDetails);

      if (
        buffDetails.type?.includes("increase_") ||
        buffDetails.type?.includes("decrease_")
      ) {
        await this.buffDebuffLogic.increaseWhat(target, buffDetails);
      }
      this.battleLogs.push(`${user.name} is buffed with ${ability.name}.`);
    }
  }

  private async handleBuffAttack(
    user: ExtendedPlayer,
    target: ExtendedPlayer | ExtendedPlayer[],
    ability: AbilityInterface
  ): Promise<void> {
    if (ability.value_amount) {
      const buffDetails = {
        name: ability.name,
        type: ability.logicType,
        unique: ability.unique || false,
        value_amount: ability.value_amount,
        targets: user,
        turnLimit: ability.turnLimit || 1,
        flat: ability.flat || false,
      };
      console.log("bufflogicTyupe:", buffDetails.type);

      this.buffDebuffManager.applyBuff(user, user, buffDetails);

      if (
        buffDetails.type?.includes("increase_") ||
        buffDetails.type?.includes("decrease_")
      ) {
        await this.buffDebuffLogic.increaseWhat(user, buffDetails);
      }
      console.log(`${user.name} is buffed with ${ability.name}.`);
    }

    if (Array.isArray(target)) {
      const { damageArray, enemyNameArray } =
        await this.buffDebuffLogic.aoeDamage(user, target, target);

      this.battleLogs.push(
        `+ ${user.name} performs frostNova, hitting ${enemyNameArray.join(
          " ,"
        )} for ${damageArray.join(" ,")} damage respectively`
      );
    } else {
      const damage = await this.that2.critOrNotHandler(
        user.stats.critRate,
        user.stats.critDamage,
        user.stats.attack,
        target.stats.defense,
        target,
        150,
        ability.name
      );

      this.cooldowns.push({
        name: ability.name,
        cooldown: this.cooldownFinder(ability.name),
      });
    }
  }
  private async handleAttackBuff(
    user: ExtendedPlayer,
    target: ExtendedPlayer | ExtendedPlayer[],
    ability: AbilityInterface
  ): Promise<void> {
    // Assuming you have a function to calculate damage

    if (Array.isArray(target)) {
      const { damageArray, enemyNameArray } =
        await this.buffDebuffLogic.aoeDamage(user, target, target);

      this.battleLogs.push(
        `+ ${user.name} performs frostNova, hitting ${enemyNameArray.join(
          " ,"
        )} for ${damageArray.join(" ,")} damage respectively`
      );
    } else {
      const damage = await this.that2.critOrNotHandler(
        user.stats.critRate,
        user.stats.critDamage,
        user.stats.attack,
        target.stats.defense,
        target,
        150,
        ability.name
      );
    }
    if (ability.value_amount) {
      const buffDetails = {
        name: ability.name,
        type: ability.logicType,
        unique: ability.unique || false,
        value_amount: ability.value_amount,
        targets: user,
        turnLimit: ability.turnLimit || 1,
        flat: ability.flat || false,
      };
      if (
        buffDetails.type?.includes("apply_") ||
        buffDetails.type?.includes("remove_")
      ) {
        this.buffDebuffManager.applyBuff(user, user, buffDetails);
      }
      if (
        buffDetails.type?.includes("apply_") ||
        buffDetails.type?.includes("remove_")
      ) {
        await this.buffDebuffLogic.increaseWhat(user, buffDetails);
      }
      console.log(`${user.name} is buffed with ${ability.name}.`);
    }
    this.cooldowns.push({
      name: ability.name,
      cooldown: this.cooldownFinder(ability.name),
    });
  }
  // Debuff ability handler
  private async handleDebuff(
    user: ExtendedPlayer,
    target: ExtendedPlayer | ExtendedPlayer[],
    ability: AbilityInterface
  ): Promise<void> {
    if (ability.value_amount) {
      const debuffDetails = {
        name: ability.name,
        type: ability.logicType,
        unique: ability.unique || false,
        value_amount: ability.value_amount,
        targets: target,
        turnLimit: ability.turnLimit || 1,
        flat: ability.flat || false,
      };
      console.log("bufflogicTyupe:", debuffDetails.type);

      this.buffDebuffManager.applyDebuff(user, target, debuffDetails);

      if (
        debuffDetails.type?.includes("apply_") ||
        debuffDetails.type?.includes("remove_")
      ) {
        await this.buffDebuffLogic.decreaseWhat(target, debuffDetails);
      }
    }
    this.cooldowns.push({
      name: ability.name,
      cooldown: this.cooldownFinder(ability.name),
    });
  }
  private async handleDebuffAttack(
    user: ExtendedPlayer,
    target: ExtendedPlayer,
    ability: AbilityInterface
  ): Promise<void> {
    if (ability.value_amount) {
      const debuffDetails = {
        name: ability.name,
        type: ability.logicType,
        unique: ability.unique || false,
        value_amount: ability.value_amount,
        targets: target,
        turnLimit: ability.turnLimit || 1,
        flat: ability.flat || false,
      };
      console.log("bufflogicTyupe:", debuffDetails.type);

      this.buffDebuffManager.applyDebuff(user, target, debuffDetails);

      if (
        debuffDetails.type?.includes("increase_") ||
        debuffDetails.type?.includes("decrease_")
      ) {
        await this.buffDebuffLogic.decreaseWhat(target, debuffDetails);
      }
    }

    if (Array.isArray(target)) {
      const { damageArray, enemyNameArray } =
        await this.buffDebuffLogic.aoeDamage(user, target, target);

      this.battleLogs.push(
        `+ ${user.name} performs frostNova, hitting ${enemyNameArray.join(
          " ,"
        )} for ${damageArray.join(" ,")} damage respectively`
      );
    } else {
      const damage = await this.that2.critOrNotHandler(
        user.stats.critRate,
        user.stats.critDamage,
        user.stats.attack,
        target.stats.defense,
        target,
        150,
        ability.name
      );

      this.cooldowns.push({
        name: ability.name,
        cooldown: this.cooldownFinder(ability.name),
      });
    }
  }

  // Heal ability handler
  private async handleHeal(
    user: ExtendedPlayer,
    target: ExtendedPlayer | ExtendedPlayer[],
    ability: AbilityInterface
  ): Promise<void> {
    const healAmount = ability.value_amount
      ? ability.value_amount["heal"] || 0
      : 0;
    console.log(
      `${user.name} heals ${target} with ${ability.name}, restoring ${healAmount} HP.`
    );
  }
  private async handleHealAttack(
    user: ExtendedPlayer,
    target: ExtendedPlayer | ExtendedPlayer[],
    ability: AbilityInterface
  ): Promise<void> {
    if (Array.isArray(target)) {
      const { damageArray, enemyNameArray } =
        await this.buffDebuffLogic.aoeDamage(user, target, target);

      this.battleLogs.push(
        `+ ${user.name} performs frostNova, hitting ${enemyNameArray.join(
          " ,"
        )} for ${damageArray.join(" ,")} damage respectively`
      );
    } else {
      const damage = await this.that2.critOrNotHandler(
        user.stats.critRate,
        user.stats.critDamage,
        user.stats.attack,
        target.stats.defense,
        target,
        150,
        ability.name
      );

      console.log(
        `${user.name} attacks ${target} with ${ability.name}, causing ${damage} damage.`
      );
    }
    const healAmount = ability.value_amount
      ? ability.value_amount["heal"] || 0
      : 0;
    console.log(
      `${user.name} heals ${target} with ${ability.name}, restoring ${healAmount} HP.`
    );
  }
}
