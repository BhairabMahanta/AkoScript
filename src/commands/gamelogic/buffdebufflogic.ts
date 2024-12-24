import { Player, Stats } from "../../data/mongo/playerschema";
import { critOrNot } from "../util/glogic";

interface Buff {
  name: string;
  description: string;
  effect: string;
}
interface ExtendedPlayer extends Player {
  statuses: {
    buffs: BuffDetails[];
    debuffs: DebuffDetails[];
  };
}

export const buffs: Record<string, Buff> = {
  "Attack Boost": {
    name: "Attack Boost",
    description: "Boosts your attack power.",
    effect: "increase_attack",
  },
  "Defense Boost": {
    name: "Defense Boost",
    description: "Boosts your defense power.",
    effect: "increase_defense",
  },
  "Speed Boost": {
    name: "Speed Boost",
    description: "Boosts your speed.",
    effect: "increase_speed",
  },
};

export const debuffs: Record<string, Buff> = {
  "Attack Break": {
    name: "Attack Break",
    description: "Reduces your attack power.",
    effect: "decrease_attack",
  },
  "Defense Break": {
    name: "Defense Break",
    description: "Reduces your defense power.",
    effect: "decrease_defense",
  },
  Slow: {
    name: "Slow",
    description: "Reduces your speed.",
    effect: "decrease_speed",
  },
  Stun: {
    name: "Stun",
    description: "Stuns you, preventing any action.",
    effect: "stun",
  },
};
export interface BuffDetails {
  buffType: string;
  name: string;
  value_amount: {
    attack: number;
    speed: number;
    defense: number;
  };
  flat?: boolean;
  unique?: boolean;
  turnLimit: number;
  targets: ExtendedPlayer | ExtendedPlayer[];
}

export interface DebuffDetails {
  debuffType: string;
  name: string;
  value_amount: {
    attack: number;
    speed: number;
    defense: number;
  };
  flat?: boolean;
  unique?: boolean;
  turnLimit: number;
  targets: ExtendedPlayer | ExtendedPlayer[];
}

let that2: any;

class BuffDebuffLogic {
  battleLogs: string[];

  constructor(that: any) {
    that2 = that;
    this.battleLogs = that.battleLogs;
  }

  async overLogic(
    turnEnder: ExtendedPlayer,
    buff: any,
    i: number,
    what: boolean
  ) {
    const types = buff.effect.split("_and_");
    types.forEach((type: String) => {
      if (type.startsWith("increase_") || type.startsWith("decrease_")) {
        const attribute = type.split("_")[1];
        console.log("type:", type);
        if (buff.effect === "flat") {
          turnEnder.stats[attribute as keyof Stats] -= buff[attribute];
        } else {
          turnEnder.stats[attribute as keyof Stats] -=
            (turnEnder.stats[attribute as keyof Stats] *
              (buff.effect as unknown as number)) /
            100;
        }
      }
    });

    console.log("what:", what);
    if (what === true) {
      turnEnder.statuses.debuffs.splice(i, 1); // Remove debuff
    } else {
      turnEnder.statuses.buffs.splice(i, 1); // Remove buff
    }
  }

  // Example for increasing/decreasing various stats
  async increaseAttack(target: Player, amount: number, flat: boolean) {
    target.stats.attack += flat ? amount : target.stats.attack * (amount / 100);
  }

  async decreaseAttack(target: Player, amount: number, flat: boolean) {
    target.stats.attack -= flat ? amount : target.stats.attack * (amount / 100);
  }

  async increaseSpeed(target: Player, amount: number, flat: boolean) {
    target.stats.speed += flat ? amount : target.stats.speed * (amount / 100);
  }

  async decreaseSpeed(target: Player, amount: number, flat: boolean) {
    target.stats.speed -= flat ? amount : target.stats.speed * (amount / 100);
  }

  async increaseDefense(target: Player, amount: number, flat: boolean) {
    target.stats.defense += flat
      ? amount
      : target.stats.defense * (amount / 100);
  }

  async decreaseDefense(target: Player, amount: number, flat: boolean) {
    target.stats.defense -= flat
      ? amount
      : target.stats.defense * (amount / 100);
  }
  // Placeholder functions for debuff effects
  async immunity(target: Player, turns: number) {}
  async stun(target: Player, turns: number) {}
  async invincibility(target: Player, turns: number) {}
  async freeze(target: Player, turns: number) {}
  async invisibility(target: Player, turns: number) {}
  async blockBuffs(target: Player, turns: number) {}
  async cleanse(target: Player) {}

  async aoeDamage(user: Player, targets: Player[], thang: any) {
    let damageArray: number[] = [];
    let enemyNameArray: string[] = [];

    await Promise.all(
      targets.map(async (target) => {
        const damage = await that2.critOrNotHandler(
          user.stats.critRate,
          user.stats.critDamage,
          user.stats.attack,
          target.stats.defense,
          target,
          thang.power,
          thang.name
        );
        damageArray.push(damage / targets.length);
        enemyNameArray.push(target.name);
      })
    );

    return { damageArray, enemyNameArray };
  }

  async applyWhat(
    target: Player | Player[],
    debuffDetails: {
      debuffType: string;
      flat?: boolean;
      turnLimit: number;
      name: string;
    }
  ) {
    const debuffTypes = debuffDetails.debuffType.split("_and_");
    let targetNames: string[] = [];
    let statChanges: string[] = [];

    for (const unit of Array.isArray(target) ? target : [target]) {
      for (const debuffType of debuffTypes) {
        const flat = debuffDetails.flat || false;

        switch (debuffType) {
          case "apply_immunity":
            await this.immunity(unit, debuffDetails.turnLimit);
            break;
          case "apply_stun":
            await this.stun(unit, debuffDetails.turnLimit);
            break;
          case "apply_invincibility":
            await this.invincibility(unit, debuffDetails.turnLimit);
            break;
          case "apply_freeze":
            await this.freeze(unit, debuffDetails.turnLimit);
            break;
          case "apply_invisibility":
            await this.invisibility(unit, debuffDetails.turnLimit);
            break;
          case "apply_block_buffs":
            await this.blockBuffs(unit, debuffDetails.turnLimit);
            break;
          case "apply_cleanse":
            await this.cleanse(unit);
            break;
          default:
            throw new Error(`Unknown debuff type: ${debuffType}`);
        }
      }
      targetNames.push(unit.name);
    }
    const logMessage = `${targetNames.join(", ")} received ${
      debuffDetails.name
    } debuff.`;
    this.battleLogs.push(logMessage);
  }

  async increaseWhat(target: Player | Player[], buffDetails: BuffDetails) {
    const buffs = buffDetails.buffType.split("_and_");
    let derArray: string[] = [];
    let statChanges: string[] = [];

    for (const unit of Array.isArray(target) ? target : [target]) {
      for (const buffType of buffs) {
        const flat = buffDetails.flat || false;

        switch (buffType) {
          case "increase_attack":
            await this.increaseAttack(
              unit,
              buffDetails.value_amount.attack,
              flat
            );
            statChanges.push(
              `attack by ${buffDetails.value_amount.attack}${flat ? "" : "%"}`
            );
            break;
          case "increase_speed":
            await this.increaseSpeed(
              unit,
              buffDetails.value_amount.speed,
              flat
            );
            statChanges.push(
              `speed by ${buffDetails.value_amount.speed}${flat ? "" : "%"}`
            );
            break;
          case "increase_defense":
            await this.increaseDefense(
              unit,
              buffDetails.value_amount.defense,
              flat
            );
            statChanges.push(
              `defense by ${buffDetails.value_amount.defense}${flat ? "" : "%"}`
            );
            break;
          case "decrease_attack":
            await this.decreaseAttack(
              unit,
              buffDetails.value_amount.attack,
              flat
            );
            break;
          case "decrease_speed":
            await this.decreaseSpeed(
              unit,
              buffDetails.value_amount.speed,
              flat
            );
            break;
          case "decrease_defense":
            await this.decreaseDefense(
              unit,
              buffDetails.value_amount.defense,
              flat
            );
            break;
          default:
            throw new Error(`Unknown buff type: ${buffType}`);
        }
      }
      derArray.push(unit.name);
    }

    const logMessage = `${derArray.join(", ")} received ${
      buffDetails.name
    } buff, increasing ${statChanges.join(" and ")}.`;
    this.battleLogs.push(logMessage);
  }

  async decreaseWhat(
    target: ExtendedPlayer | ExtendedPlayer[],
    debuffDetails: DebuffDetails
  ) {
    const debuffs = debuffDetails.debuffType.split("_and_");
    let derArray: string[] = [];
    let statChanges: string[] = [];

    for (const unit of Array.isArray(target) ? target : [target]) {
      for (const debuffType of debuffs) {
        const flat = debuffDetails.flat || false;

        switch (debuffType) {
          case "decrease_attack":
            await this.decreaseAttack(
              unit,
              debuffDetails.value_amount.attack,
              flat
            );
            statChanges.push(
              `attack by ${debuffDetails.value_amount.attack}${flat ? "" : "%"}`
            );
            break;
          case "decrease_speed":
            await this.decreaseSpeed(
              unit,
              debuffDetails.value_amount.speed,
              flat
            );
            statChanges.push(
              `speed by ${debuffDetails.value_amount.speed}${flat ? "" : "%"}`
            );
            break;
          case "decrease_defense":
            await this.decreaseDefense(
              unit,
              debuffDetails.value_amount.defense,
              flat
            );
            statChanges.push(
              `defense by ${debuffDetails.value_amount.defense}${
                flat ? "" : "%"
              }`
            );
            break;
          default:
            throw new Error(`Unknown debuff type: ${debuffType}`);
        }
      }
      derArray.push(unit.name);
    }

    const logMessage = `${derArray.join(", ")} received ${
      debuffDetails.name
    } debuff, decreasing ${statChanges.join(" and ")}.`;
    this.battleLogs.push(logMessage);
  }

  async increaseAttackNSpeed(
    target: ExtendedPlayer | ExtendedPlayer[],
    buffDetails: BuffDetails
  ) {
    const targetArray = Array.isArray(buffDetails.targets)
      ? buffDetails.targets
      : [buffDetails.targets];

    if (buffDetails.unique === true && targetArray.length > 1) {
      let derArray: string[] = [];
      let buff: any;

      for (const unit of Array.isArray(target) ? target : [target]) {
        buff = {
          type: "increase_attack_and_speed",
          name: buffDetails.name,
          remainingTurns: buffDetails.turnLimit,
          attack_amount: buffDetails.value_amount.attack,
          speed_amount: buffDetails.value_amount.speed,
          flat: buffDetails.flat || false,
        };

        if (buff.flat) {
          unit.stats.attack += buff.attack_amount;
          unit.stats.speed += buff.speed_amount;
        } else {
          unit.stats.attack += unit.stats.attack * (buff.attack_amount / 100);
          unit.stats.speed += unit.stats.speed * (buff.speed_amount / 100);
        }
        derArray.push(unit.name);
      }

      this.battleLogs.push(
        ` ${derArray.join(", ")} received ${
          buffDetails.name
        } buff, increasing attack by ${buff.attack_amount}${
          buff.flat ? "" : "%"
        } and speed by ${buff.speed_amount}${buff.flat ? "" : "%"}.`
      );
    } else {
      const buff = {
        type: "increase_attack_and_speed",
        name: buffDetails.name,
        remainingTurns: buffDetails.turnLimit,
        attack_amount: buffDetails.value_amount.attack,
        speed_amount: buffDetails.value_amount.speed,
        flat: buffDetails.flat || false,
      };

      if (buff.flat) {
        (target as Player).stats.attack += buff.attack_amount;
        (target as Player).stats.speed += buff.speed_amount;
      } else {
        (target as Player).stats.attack +=
          (target as Player).stats.attack * (buff.attack_amount / 100);
        (target as Player).stats.speed +=
          (target as Player).stats.speed * (buff.speed_amount / 100);
      }

      this.battleLogs.push(
        `${(target as Player).name} received ${
          buffDetails.name
        } buff, increasing attack by ${buff.attack_amount}${
          buff.flat ? "" : "%"
        } and speed by ${buff.speed_amount}${buff.flat ? "" : "%"}.`
      );
    }
  }
}

export { BuffDebuffLogic };
