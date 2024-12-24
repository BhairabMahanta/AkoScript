import { mobs } from "../../data/monsterInfo/mobs";
import abilities from "../../../data/abilities";
import { calculateDamage } from "../../util/glogic";
import { Ability } from "./AbilitiesFunction";

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
  i: number;
  abilities: string[];
  attackPattern: string[];
  battleLogs: string[];
  ability: Ability;
  allies?: string[];

  constructor(that: { battleLogs: string[] }, mob: MobDetails) {
    this.name = mob.name;
    this.enemyDetails = mob;
    this.i = 0;
    console.log("mobaBility: ", mobs[mob.name]?.abilities);
    this.abilities = mobs[mob.name]?.abilities || [];
    this.attackPattern = mobs[mob.name]?.attackPattern || [];
    this.battleLogs = that.battleLogs;
    this.ability = new Ability(this);

    if (mob.hasAllies && !mob.hasAllies.includes("none")) {
      this.allies = mob.allies;
    }
  }

  async move(mob: MobDetails, target: TargetDetails): Promise<number | void> {
    if (mob.index >= this.attackPattern.length) {
      mob.index = 0;
    }

    for (; mob.index < this.attackPattern.length; mob.index++) {
      console.log("i: ", mob.index);
      const move = this.attackPattern[mob.index];
      console.log("move: ", move);

      if (move === "Basic Attack") {
        console.log("moveTrue?: ", move);
        mob.index++;
        return this.normalAttack(mob, target);
      } else {
        console.log("moveFalse?: ", move);
        mob.index++;
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

export default MobAI;
