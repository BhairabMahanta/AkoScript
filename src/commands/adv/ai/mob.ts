import { mobs } from "../../data/monsterInfo/mobs";
import { allEnemies } from "../../data/monsterInfo/allEnemies";
import abilities from "../../../data/abilities";
import { calculateDamage } from "../../util/glogic";
import { Ability } from "../../gamelogic/abilitiesFunction";

interface MobDetails {
  name: string;
  stats: {
    attack: number;
    defense: number;
  };
  allies: string[];
  index: number;
  hasAllies: string[];
}

interface TargetDetails {
  name: string;
  stats: {
    attack: number;
    defense: number;
  };
}

class MobAI {
  name: string;
  enemyDetails: MobDetails;
  static indexMap: Record<string, number> = {}; // Shared index map for all enemies
  battleLogs: string[];
  ability: Ability;
  allies?: string[];

  constructor(that: any, mob: any) {
    this.name = mob.name;
    this.enemyDetails = mob;

    this.battleLogs = that.battleLogs;
    this.ability = new Ability(this);
  }

  async move(mob: any, target: TargetDetails): Promise<number | void> {
    // Initialize index for this mob if not already done
    if (!(mob.name in MobAI.indexMap)) {
      MobAI.indexMap[mob.name] = 0;
    }
    const attackPattern = mob.attackPattern || [];
    const currentIndex = MobAI.indexMap[mob.name]; // Access the specific index for this mob

    if (currentIndex >= attackPattern.length) {
      MobAI.indexMap[mob.name] = 0; // Reset index if it exceeds attackPattern length
    }

    for (
      ;
      MobAI.indexMap[mob.name] < attackPattern.length;
      MobAI.indexMap[mob.name]++
    ) {
      console.log("i: ", MobAI.indexMap[mob.name]);
      const move = attackPattern[MobAI.indexMap[mob.name]];
      console.log("move: ", move);

      if (move === "Basic Attack") {
        console.log("moveTrue?: ", move);
        MobAI.indexMap[mob.name]++;
        return this.normalAttack(mob, target);
      } else {
        console.log("moveFalse?: ", move);
        MobAI.indexMap[mob.name]++;
        return this.abilityUse(mob, target, move);
      }
    }
  }

  async normalAttack(mob: MobDetails, target: TargetDetails): Promise<number> {
    let damage = await calculateDamage(mob.stats.attack, target.stats.defense);
    console.log("damage: ", damage);

    if (damage < 0) {
      damage = 0;
      this.battleLogs.push(
        `${target.name}'s defense was too strong ${mob.name}'s attack nullified!`
      );
    }

    return damage;
  }

  private async toCamelCase(str: string): Promise<string> {
    const words = str.split(" ");
    if (words.length === 1) {
      return words[0].toLowerCase();
    }
    if (words.length === 2) {
      return words[0].toLowerCase() + words[1];
    }
    return str
      .replace(/\s(.)/g, (match, group1) => group1.toUpperCase())
      .replace(/\s/g, ""); // Remove any remaining spaces
  }

  async abilityUse(
    mob: MobDetails,
    target: TargetDetails,
    nextMove: string
  ): Promise<void> {
    const abilityName = nextMove;
    const abilityNameCamel = await this.toCamelCase(abilityName);
    console.log("abilityName:a", abilityNameCamel);

    if (typeof (this.ability as any)[abilityNameCamel] === "function") {
      (this.ability as any)[abilityNameCamel](mob, target);
    } else {
      console.log(`Ability ${abilityName} not found.`);
    }

    console.log(`${this.name} uses ${abilityName} on ${target.name}!`);
  }
}

export { MobAI };
