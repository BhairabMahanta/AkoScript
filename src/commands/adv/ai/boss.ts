import { bosses } from "../../data/monsterInfo/bosses";
import abilities from "../../../data/abilities";
import { Ability } from "../../gamelogic/abilitiesFunction";
import { calculateDamage } from "../../util/glogic";

interface BossDetails {
  name: string;
  stats: {
    attack: number;
    defense: number;
  };
}

interface TargetDetails {
  name: string;
  stats: {
    attack: number;
    defense: number;
  };
}

class BossAI {
  name: string;
  abilities: Record<string, any>;
  attackPattern: string[];
  ability: Ability;

  constructor(that: any, boss: any) {
    this.name = boss.name;
    this.abilities = bosses[boss.name]?.abilities || {};
    this.attackPattern = bosses[boss.name]?.attackPattern || [];
    this.ability = new Ability(this);
  }

  async normalAttack(
    boss: BossDetails,
    target: TargetDetails
  ): Promise<number> {
    const damage = calculateDamage(boss.stats.attack, target.stats.defense);
    // Boss's logic for normal attack
    return damage;
  }

  async abilityUse(
    boss: BossDetails,
    target: TargetDetails,
    nextMove: number
  ): Promise<void> {
    const abilityName = this.attackPattern[nextMove];
    const ability = this.abilities[abilityName];

    if (!ability) {
      console.log(
        `${this.name} tried to use ${abilityName}, but it does not exist.`
      );
      return;
    }

    console.log(`${this.name} uses ${abilityName} on ${target.name}!`);
    // Boss's logic for using the specified ability on the target
  }
}

export { BossAI };
