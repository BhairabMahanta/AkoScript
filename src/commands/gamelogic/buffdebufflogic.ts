// gamelogic/buffdebufflogic.ts
import { Player, Stats } from "../../data/mongo/playerschema";
import { critOrNot } from "../util/glogic";

interface Buff {
  name: string;
  description: string;
  effect: string;
}

export interface ExtendedPlayer extends Player {
  statuses: {
    buffs: BuffDetails[];
    debuffs: DebuffDetails[];
  };
  attackBarEmoji?: string;
  hpBar: number;
  atkBar: number;
  hpBarEmoji?: string;
  maxHp: number;
  speedBuff?: boolean;
  isNPC?: boolean;
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
  type: string;
  name: string;
  value_amount: {
    attack?: number;
    speed?: number;
    defense?: number;
  };
  flat?: boolean;
  unique?: boolean;
  turnLimit: number;
  targets: ExtendedPlayer | ExtendedPlayer[];
}

export interface DebuffDetails {
  type: string;
  name: string;
  value_amount: {
    attack?: number;
    speed?: number;
    defense?: number;
  };
  flat?: boolean;
  unique?: boolean;
  turnLimit: number;
  targets: ExtendedPlayer | ExtendedPlayer[];
}

class BuffDebuffLogic {
  private battle: any;

  constructor(battle: any) {
    this.battle = battle;
  }

  async overLogic(
    turnEnder: ExtendedPlayer,
    buff: any,
    i: number,
    what: boolean
  ): Promise<void> {
    let types: any;
    if (buff.type.includes("_and_")) types = buff.type.split("_and_");
    else types = [buff.type];
    
    types.forEach((type: string) => {
      if (type.startsWith("increase_") || type.startsWith("decrease_")) {
        const attribute = type.split("_")[1];
        console.log("type:", type);
        if (buff.flat) {
          turnEnder.stats[attribute as keyof Stats] -= buff.value_amount[attribute];
        } else {
          turnEnder.stats[attribute as keyof Stats] -=
            (turnEnder.stats[attribute as keyof Stats] *
              (buff.value_amount as unknown as number)) / 100;
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
  async increaseAttack(target: Player, amount: number, flat: boolean): Promise<void> {
    target.stats.attack += flat ? amount : target.stats.attack * (amount / 100);
  }

  async decreaseAttack(target: Player, amount: number, flat: boolean): Promise<void> {
    target.stats.attack -= flat ? amount : target.stats.attack * (amount / 100);
  }

  async increaseSpeed(target: Player, amount: number, flat: boolean): Promise<void> {
    target.stats.speed += flat ? amount : target.stats.speed * (amount / 100);
  }

  async decreaseSpeed(target: Player, amount: number, flat: boolean): Promise<void> {
    target.stats.speed -= flat ? amount : target.stats.speed * (amount / 100);
  }

  async increaseDefense(target: Player, amount: number, flat: boolean): Promise<void> {
    target.stats.defense += flat ? amount : target.stats.defense * (amount / 100);
  }

  async decreaseDefense(target: Player, amount: number, flat: boolean): Promise<void> {
    target.stats.defense -= flat ? amount : target.stats.defense * (amount / 100);
  }

  // Placeholder functions for debuff effects
  async immunity(target: Player, turns: number): Promise<void> {}
  async stun(target: Player, turns: number): Promise<void> {}
  async invincibility(target: Player, turns: number): Promise<void> {}
  async freeze(target: Player, turns: number): Promise<void> {}
  async invisibility(target: Player, turns: number): Promise<void> {}
  async blockBuffs(target: Player, turns: number): Promise<void> {}
  async cleanse(target: Player): Promise<void> {}

  async aoeDamage(user: Player, targets: Player[], thang: any): Promise<{ damageArray: number[]; enemyNameArray: string[] }> {
    let damageArray: number[] = [];
    let enemyNameArray: string[] = [];

    await Promise.all(
      targets.map(async (target) => {
        // Use the refactored battle system's combat resolver
        const damage = await this.battle.combatResolver.critOrNotHandler(
          user.stats.critRate,
          user.stats.critDamage,
          user.stats.attack,
          target.stats.defense,
          target,
          thang.power || 150,
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
      type: string;
      flat?: boolean;
      turnLimit: number;
      name: string;
    }
  ): Promise<void> {
    const debuffTypes = debuffDetails.type.split("_and_");
    let targetNames: string[] = [];

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
    
    const logMessage = `${targetNames.join(", ")} received ${debuffDetails.name} debuff.`;
    this.battle.addBattleLog(logMessage);
  }

  async increaseWhat(target: Player | Player[], buffDetails: BuffDetails): Promise<void> {
    const buffs = buffDetails.type.split("_and_");
    let derArray: string[] = [];
    let statChanges: string[] = [];

    for (const unit of Array.isArray(target) ? target : [target]) {
      for (const buffType of buffs) {
        const flat = buffDetails.flat || false;

        switch (buffType) {
          case "increase_attack":
            await this.increaseAttack(
              unit,
              buffDetails.value_amount.attack || 0,
              flat
            );
            statChanges.push(
              `attack by ${buffDetails.value_amount.attack}${flat ? "" : "%"}`
            );
            break;
          case "increase_speed":
            await this.increaseSpeed(
              unit,
              buffDetails.value_amount.speed || 0,
              flat
            );
            statChanges.push(
              `speed by ${buffDetails.value_amount.speed}${flat ? "" : "%"}`
            );
            break;
          case "increase_defense":
            await this.increaseDefense(
              unit,
              buffDetails.value_amount.defense || 0,
              flat
            );
            statChanges.push(
              `defense by ${buffDetails.value_amount.defense}${flat ? "" : "%"}`
            );
            break;
          case "decrease_attack":
            await this.decreaseAttack(
              unit,
              buffDetails.value_amount.attack || 0,
              flat
            );
            break;
          case "decrease_speed":
            await this.decreaseSpeed(
              unit,
              buffDetails.value_amount.speed || 0,
              flat
            );
            break;
          case "decrease_defense":
            await this.decreaseDefense(
              unit,
              buffDetails.value_amount.defense || 0,
              flat
            );
            break;
          default:
            throw new Error(`Unknown buff type: ${buffType}`);
        }
      }
      derArray.push(unit.name);
    }

    const logMessage = `${derArray.join(", ")} received ${buffDetails.name} buff, increasing ${statChanges.join(" and ")}.`;
    this.battle.addBattleLog(logMessage);
  }

  async decreaseWhat(
    target: ExtendedPlayer | ExtendedPlayer[],
    debuffDetails: DebuffDetails
  ): Promise<void> {
    const debuffs = debuffDetails.type.split("_and_");
    let derArray: string[] = [];
    let statChanges: string[] = [];

    for (const unit of Array.isArray(target) ? target : [target]) {
      for (const debuffType of debuffs) {
        const flat = debuffDetails.flat || false;

        switch (debuffType) {
          case "decrease_attack":
            await this.decreaseAttack(
              unit,
              debuffDetails.value_amount.attack || 0,
              flat
            );
            statChanges.push(
              `attack by ${debuffDetails.value_amount.attack}${flat ? "" : "%"}`
            );
            break;
          case "decrease_speed":
            await this.decreaseSpeed(
              unit,
              debuffDetails.value_amount.speed || 0,
              flat
            );
            statChanges.push(
              `speed by ${debuffDetails.value_amount.speed}${flat ? "" : "%"}`
            );
            break;
          case "decrease_defense":
            await this.decreaseDefense(
              unit,
              debuffDetails.value_amount.defense || 0,
              flat
            );
            statChanges.push(
              `defense by ${debuffDetails.value_amount.defense}${flat ? "" : "%"}`
            );
            break;
          default:
            throw new Error(`Unknown debuff type: ${debuffType}`);
        }
      }
      derArray.push(unit.name);
    }

    const logMessage = `${derArray.join(", ")} received ${debuffDetails.name} debuff, decreasing ${statChanges.join(" and ")}.`;
    this.battle.addBattleLog(logMessage);
  }

  async increaseAttackNSpeed(
    target: ExtendedPlayer | ExtendedPlayer[],
    buffDetails: BuffDetails
  ): Promise<void> {
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
          unit.stats.attack += buff.attack_amount || 0;
          unit.stats.speed += buff.speed_amount || 0;
        } else {
          unit.stats.attack += unit.stats.attack * ((buff.attack_amount || 0) / 100);
          unit.stats.speed += unit.stats.speed * ((buff.speed_amount || 0) / 100);
        }
        derArray.push(unit.name);
      }

      this.battle.addBattleLog(
        ` ${derArray.join(", ")} received ${buffDetails.name} buff, increasing attack by ${buff.attack_amount}${
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
        (target as Player).stats.attack += buff.attack_amount || 0;
        (target as Player).stats.speed += buff.speed_amount || 0;
      } else {
        (target as Player).stats.attack +=
          (target as Player).stats.attack * ((buff.attack_amount || 0) / 100);
        (target as Player).stats.speed +=
          (target as Player).stats.speed * ((buff.speed_amount || 0) / 100);
      }

      this.battle.addBattleLog(
        `${(target as Player).name} received ${buffDetails.name} buff, increasing attack by ${buff.attack_amount}${
          buff.flat ? "" : "%"
        } and speed by ${buff.speed_amount}${buff.flat ? "" : "%"}.`
      );
    }
  }
}

export { BuffDebuffLogic };
