// gamelogic/buffDebuffManager.ts
import { Player } from "../../data/mongo/playerschema";
import { BuffDetails, DebuffDetails, ExtendedPlayer } from "./buffdebufflogic";

class BuffDebuffManager {
  private battle: any;

  constructor(battle: any) {
    this.battle = battle;
  }

  // Method to apply a debuff
  async applyDebuff(
    user: ExtendedPlayer,
    target: ExtendedPlayer | ExtendedPlayer[],
    debuffDetails: DebuffDetails
  ): Promise<void> {
    if (!debuffDetails) {
      console.error("Debuff details are undefined");
      return;
    }

    // Special case: apply_ or remove_
    if (
      debuffDetails.type?.startsWith("apply_") ||
      debuffDetails.type?.startsWith("remove_")
    ) {
      await this.handleSpecialDebuff(user, target, debuffDetails);
    } else {
      await this.handleNormalDebuff(user, target, debuffDetails);
    }
  }

  private async handleSpecialDebuff(
    user: ExtendedPlayer,
    target: ExtendedPlayer | ExtendedPlayer[],
    debuffDetails: DebuffDetails
  ): Promise<void> {
    const specialDebuff = {
      debuffType: debuffDetails.type,
      name: debuffDetails.name,
      remainingTurns: debuffDetails.turnLimit,
      targets: debuffDetails.targets,
      flat: debuffDetails.flat || false,
    };

    if (Array.isArray(target)) {
      for (const trgt of target) {
        if (!trgt.statuses.debuffs) {
          trgt.statuses.debuffs = [];
        }
        
        // Create a proper debuff object that matches BuffDetails structure
        const debuffObject: DebuffDetails = {
          ...debuffDetails,
          targets: trgt
        };
        
        trgt.statuses.debuffs.push(debuffObject);
        
        this.battle.addBattleLog(
          `${user.name} applied ${debuffDetails.name} to ${trgt.name} for ${debuffDetails.turnLimit} turns.`
        );
      }
    } else {
      if (!target.statuses.debuffs) {
        target.statuses.debuffs = [];
      }
      
      const debuffObject: DebuffDetails = {
        ...debuffDetails,
        targets: target
      };
      
      target.statuses.debuffs.push(debuffObject);
      
      this.battle.addBattleLog(
        `${user.name} applied ${debuffDetails.name} to ${target.name} for ${debuffDetails.turnLimit} turns.`
      );
    }
  }

  private async handleNormalDebuff(
    user: ExtendedPlayer,
    target: ExtendedPlayer | ExtendedPlayer[],
    debuffDetails: DebuffDetails
  ): Promise<void> {
    if (Array.isArray(target)) {
      for (const trgt of target) {
        if (!trgt.statuses.debuffs) {
          trgt.statuses.debuffs = [];
        }
        
        const debuff: DebuffDetails = { ...debuffDetails, targets: trgt };
        trgt.statuses.debuffs.push(debuff);
        
        this.battle.addBattleLog(
          `${user.name} applied ${debuffDetails.name} to ${trgt.name} for ${debuffDetails.turnLimit} turns.`
        );
      }
    } else {
      if (!target.statuses.debuffs) {
        target.statuses.debuffs = [];
      }
      
      const debuff: DebuffDetails = { ...debuffDetails, targets: target };
      target.statuses.debuffs.push(debuff);
      
      this.battle.addBattleLog(
        `${user.name} applied ${debuffDetails.name} to ${target.name} for ${debuffDetails.turnLimit} turns.`
      );
    }
  }

  // Method to remove a debuff
  async removeDebuff(
    user: ExtendedPlayer,
    target: ExtendedPlayer,
    debuffType: string,
    shouldLog: boolean = true
  ): Promise<void> {
    if (!target.statuses.debuffs) {
      target.statuses.debuffs = [];
      return;
    }

    const originalLength = target.statuses.debuffs.length;
    target.statuses.debuffs = target.statuses.debuffs.filter(
      (debuff) => debuff.type !== debuffType
    );

    if (shouldLog && target.statuses.debuffs.length < originalLength) {
      this.battle.addBattleLog(
        `${user.name} removed ${debuffType} debuff from ${target.name}.`
      );
    }
  }

  // Method to apply a buff
  async applyBuff(
    user: ExtendedPlayer,
    target: ExtendedPlayer | ExtendedPlayer[],
    buffDetails: BuffDetails
  ): Promise<void> {
    if (!buffDetails) {
      console.error("Buff details are undefined");
      return;
    }

    // Special case: apply_ or remove_
    if (
      buffDetails.type?.startsWith("apply_") ||
      buffDetails.type?.startsWith("remove_")
    ) {
      await this.handleSpecialBuff(user, target, buffDetails);
    } else {
      await this.handleNormalBuff(user, target, buffDetails);
    }
  }

  private async handleSpecialBuff(
    user: ExtendedPlayer,
    target: ExtendedPlayer | ExtendedPlayer[],
    buffDetails: BuffDetails
  ): Promise<void> {
    if (Array.isArray(target)) {
      for (const trgt of target) {
        if (!trgt.statuses.buffs) {
          trgt.statuses.buffs = [];
        }
        
        const buffObject: BuffDetails = {
          ...buffDetails,
          targets: trgt
        };
        
        trgt.statuses.buffs.push(buffObject);
        
        this.battle.addBattleLog(
          `${user.name} applied ${buffDetails.name} to ${trgt.name} for ${buffDetails.turnLimit} turns.`
        );
      }
    } else {
      if (!target.statuses.buffs) {
        target.statuses.buffs = [];
      }
      
      const buffObject: BuffDetails = {
        ...buffDetails,
        targets: target
      };
      
      target.statuses.buffs.push(buffObject);
      
      this.battle.addBattleLog(
        `${user.name} applied ${buffDetails.name} to ${target.name} for ${buffDetails.turnLimit} turns.`
      );
    }
  }

  private async handleNormalBuff(
    user: ExtendedPlayer,
    target: ExtendedPlayer | ExtendedPlayer[],
    buffDetails: BuffDetails
  ): Promise<void> {
    if (Array.isArray(target)) {
      for (const trgt of target) {
        if (!trgt.statuses.buffs) {
          trgt.statuses.buffs = [];
        }
        
        const buff: BuffDetails = { ...buffDetails, targets: trgt };
        trgt.statuses.buffs.push(buff);
        
        this.battle.addBattleLog(
          `${user.name} applied ${buffDetails.name} to ${trgt.name} for ${buffDetails.turnLimit} turns.`
        );
      }
    } else {
      if (!target.statuses.buffs) {
        target.statuses.buffs = [];
      }
      
      const buff: BuffDetails = { ...buffDetails, targets: target };
      target.statuses.buffs.push(buff);
      
      this.battle.addBattleLog(
        `${user.name} applied ${buffDetails.name} to ${target.name} for ${buffDetails.turnLimit} turns.`
      );
    }
  }

  // Method to remove a buff
  async removeBuff(
    user: ExtendedPlayer,
    target: ExtendedPlayer,
    buffType: string,
    shouldLog: boolean = true
  ): Promise<void> {
    if (!target.statuses.buffs) {
      target.statuses.buffs = [];
      return;
    }

    const originalLength = target.statuses.buffs.length;
    target.statuses.buffs = target.statuses.buffs.filter(
      (buff) => buff.type !== buffType
    );

    if (shouldLog && target.statuses.buffs.length < originalLength) {
      this.battle.addBattleLog(
        `${user.name} removed ${buffType} buff from ${target.name}.`
      );
    }
  }

  // Helper methods
  hasBuff(target: ExtendedPlayer, buffType: string): boolean {
    if (!target.statuses.buffs) return false;
    return target.statuses.buffs.some(buff => buff.type === buffType);
  }

  hasDebuff(target: ExtendedPlayer, debuffType: string): boolean {
    if (!target.statuses.debuffs) return false;
    return target.statuses.debuffs.some(debuff => debuff.type === debuffType);
  }
}

export { BuffDebuffManager };
