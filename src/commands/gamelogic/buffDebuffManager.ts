import { Player } from "../../data/mongo/playerschema";
import { BuffDetails, DebuffDetails } from "./buffdebufflogic";

interface ExtendedPlayer extends Player {
  statuses: {
    buffs: BuffDetails[];
    debuffs: DebuffDetails[];
  };
}

class BuffDebuffManager {
  battleLogs: string[];

  constructor(that: { battleLogs: string[] }) {
    this.battleLogs = that.battleLogs;
  }

  // Method to apply a debuff
  async applyDebuff(
    user: ExtendedPlayer,
    target: ExtendedPlayer | ExtendedPlayer[],
    debuffDetails: DebuffDetails
  ): Promise<void> {
    // Special case: apply_ or remove_
    if (
      debuffDetails.debuffType.startsWith("apply_") ||
      debuffDetails.debuffType.startsWith("remove_")
    ) {
      const specialDebuff = {
        debuffType: debuffDetails.debuffType,
        name: debuffDetails.name,
        remainingTurns: debuffDetails.turnLimit,
        targets: debuffDetails.targets,
        flat: debuffDetails.flat || false,
      };

      if (Array.isArray(target)) {
        for (let trgt of target) {
          if (!trgt.statuses.debuffs) {
            trgt.statuses.debuffs = [];
          }
          (debuffDetails as any).value_amount[
            (debuffDetails as any).value_name
          ] = {
            ...(debuffDetails as any).value_amount[
              (debuffDetails as any).value_name
            ], // Existing properties of invincible
            ...specialDebuff, // New properties from specialBuff
          };
          trgt.statuses.debuffs.push((debuffDetails as any).value_amount);
          this.battleLogs.push(
            `${user.name} applied ${debuffDetails.name} to ${trgt.name} for ${debuffDetails.turnLimit} turns.`
          );
        }
      } else {
        (debuffDetails as any).value_amount[(debuffDetails as any).value_name] =
          {
            ...(debuffDetails as any).value_amount[
              (debuffDetails as any).value_name
            ], // Existing properties of invincible
            ...specialDebuff, // New properties from specialBuff
          };

        target.statuses.debuffs.push((debuffDetails as any).value_amount);
      }
    } else {
      // Normal case: debuff application
      const debuffTemplate = {
        debuffType: debuffDetails.debuffType,
        name: debuffDetails.name,
        remainingTurns: debuffDetails.turnLimit,
        value_amount: debuffDetails.value_amount,
        flat: debuffDetails.flat || false,
        turnLimit: debuffDetails.turnLimit,
      };

      if (Array.isArray(debuffDetails.targets)) {
        for (let target of debuffDetails.targets) {
          const debuff = { ...debuffTemplate, targets: target };
          this.battleLogs.push(
            `${user.name} applied ${debuffDetails.name} to ${target.name} for ${debuffDetails.turnLimit} turns.`
          );
          target.statuses.debuffs.push(debuff);
          console.log(`Debuff applied to ${target.name}:`, debuff);
        }
      } else {
        const debuff = { ...debuffTemplate, targets: debuffDetails.targets };
        debuffDetails.targets.statuses.debuffs.push(debuff);
        console.log(`Debuff applied to ${debuffDetails.targets.name}:`, debuff);
        this.battleLogs.push(
          `${user.name} applied ${debuffDetails.name} to ${debuffDetails.targets.name} for ${debuffDetails.turnLimit} turns.`
        );
      }
    }
  }

  // Method to remove a debuff
  async removeDebuff(
    user: ExtendedPlayer,
    target: ExtendedPlayer,
    debuffType: string,
    isTrue: boolean
  ): Promise<void> {
    target.statuses.debuffs = await target.statuses.debuffs.filter(
      (debuff) => debuff.debuffType !== debuffType
    );
    if (isTrue) {
      this.battleLogs.push(
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
    // Check if user has a buff blocker
    // if (user.hasBuffBlocker) {
    //   this.battleLogs.push(
    //     `${user.name} could not receive the ${buffDetails.name} buff.`
    //   );
    //   return;
    // }

    // Special case: apply_ or remove_
    if (
      buffDetails.buffType.startsWith("apply_") ||
      buffDetails.buffType.startsWith("remove_")
    ) {
      const specialBuff = {
        type: buffDetails.buffType,
        name: buffDetails.name,
        remainingTurns: buffDetails.turnLimit,
        targets: buffDetails.targets,
        flat: buffDetails.flat || false,
      };
      if (Array.isArray(target)) {
        for (let trgt of target) {
          if (!trgt.statuses.buffs) {
            trgt.statuses.buffs = [];
          }
          (buffDetails as any).value_amount[(buffDetails as any).value_name] = {
            ...(buffDetails as any).value_amount[
              (buffDetails as any).value_name
            ], // Existing properties of invincible
            ...specialBuff, // New properties from specialBuff
          };
          trgt.statuses.buffs.push((buffDetails as any).value_amount);
          this.battleLogs.push(
            `${user.name} applied ${buffDetails.name} to ${trgt.name} for ${buffDetails.turnLimit} turns.`
          );
        }
      } else {
        (buffDetails as any).value_amount[(buffDetails as any).value_name] = {
          ...(buffDetails as any).value_amount[(buffDetails as any).value_name], // Existing properties of invincible
          ...specialBuff, // New properties from specialBuff
        };

        user.statuses.buffs.push((buffDetails as any).value_amount);
      }
    } else {
      // Normal case: buff application
      const buffTemplate = {
        buffType: buffDetails.buffType,
        name: buffDetails.name,
        remainingTurns: buffDetails.turnLimit,
        value_amount: buffDetails.value_amount,
        flat: buffDetails.flat || false,
        turnLimit: buffDetails.turnLimit,
      };

      if (Array.isArray(buffDetails.targets)) {
        for (let target of buffDetails.targets) {
          const buff = { ...buffTemplate, targets: target };
          target.statuses.buffs.push(buff);
          console.log(`Buff applied to ${user.name}:`, buff);
        }
      } else {
        const buff = { ...buffTemplate, targets: buffDetails.targets };
        buffDetails.targets.statuses.buffs.push(buff);
        console.log(`Buff applied to ${user.name}:`, buff);
      }
    }
  }

  // Method to remove a buff
  async removeBuff(
    user: ExtendedPlayer,
    target: ExtendedPlayer,
    buffType: string,
    isTrue: boolean
  ): Promise<void> {
    target.statuses.buffs = await target.statuses.buffs.filter(
      (buff) => buff.buffType !== buffType
    );
    if (isTrue) {
      this.battleLogs.push(
        `${user.name} removed ${buffType} buff from ${target.name}.`
      );
    }
  }
}

export { BuffDebuffManager };
