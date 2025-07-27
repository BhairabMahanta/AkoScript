// gamelogic/buffDebuffManager.ts
import { Player } from "../../data/mongo/playerschema";
import { StatusEffect, ExtendedPlayer, BuffDetails, DebuffDetails } from "./buffdebufflogic";

class BuffDebuffManager {
  private battle: any;

  constructor(battle: any) {
    this.battle = battle;
  }

  // Unified method for applying status effects
  private async applyStatusEffect(
    user: ExtendedPlayer,
    targets: ExtendedPlayer | ExtendedPlayer[],
    effect: StatusEffect,
    isBuff: boolean
  ): Promise<void> {
    if (!effect) {
      console.error("Status effect details are undefined");
      return;
    }

    const targetArray = Array.isArray(targets) ? targets : [targets];
    const statusType = isBuff ? 'buffs' : 'debuffs';
    const actionWord = isBuff ? 'buff' : 'debuff';

    for (const target of targetArray) {
      if (!target.statuses[statusType]) {
        target.statuses[statusType] = [];
      }

      const statusEffect: StatusEffect = {
        ...effect,
        targets: target
      };

      target.statuses[statusType].push(statusEffect);

      // this.battle.addBattleLog(
      //   `${user.name} applied ${effect.name} ${actionWord} to ${target.name} for ${effect.turnLimit} turns.`
      // );
    }
  }

  // Apply buff method
  async applyBuff(
    user: ExtendedPlayer,
    targets: ExtendedPlayer | ExtendedPlayer[],
    buffDetails: StatusEffect
  ): Promise<void> {
    await this.applyStatusEffect(user, targets, buffDetails, true);
  }

  // Apply debuff method
  async applyDebuff(
    user: ExtendedPlayer,
    targets: ExtendedPlayer | ExtendedPlayer[],
    debuffDetails: StatusEffect
  ): Promise<void> {
    await this.applyStatusEffect(user, targets, debuffDetails, false);
  }

  // Unified method for removing status effects
  private removeStatusEffect(
    user: ExtendedPlayer,
    target: ExtendedPlayer,
    effectType: string,
    isBuff: boolean,
    shouldLog: boolean = true
  ): void {
    const statusType = isBuff ? 'buffs' : 'debuffs';
    const actionWord = isBuff ? 'buff' : 'debuff';

    if (!target.statuses[statusType]) {
      target.statuses[statusType] = [];
      return;
    }

    const originalLength = target.statuses[statusType].length;
    target.statuses[statusType] = target.statuses[statusType].filter(
      (effect) => effect.type !== effectType
    );

    if (shouldLog && target.statuses[statusType].length < originalLength) {
      this.battle.addBattleLog(
        `${user.name} removed ${effectType} ${actionWord} from ${target.name}.`
      );
    }
  }

  // Remove buff method
  removeBuff(
    user: ExtendedPlayer,
    target: ExtendedPlayer,
    buffType: string,
    shouldLog: boolean = true
  ): void {
    this.removeStatusEffect(user, target, buffType, true, shouldLog);
  }

  // Remove debuff method
  removeDebuff(
    user: ExtendedPlayer,
    target: ExtendedPlayer,
    debuffType: string,
    shouldLog: boolean = true
  ): void {
    this.removeStatusEffect(user, target, debuffType, false, shouldLog);
  }

  // Helper methods
  hasBuff(target: ExtendedPlayer, buffType: string): boolean {
    return target.statuses.buffs?.some(buff => buff.type === buffType) || false;
  }

  hasDebuff(target: ExtendedPlayer, debuffType: string): boolean {
    return target.statuses.debuffs?.some(debuff => debuff.type === debuffType) || false;
  }

  hasStatusEffect(target: ExtendedPlayer, effectType: string): boolean {
    return this.hasBuff(target, effectType) || this.hasDebuff(target, effectType);
  }
}

export { BuffDebuffManager };
