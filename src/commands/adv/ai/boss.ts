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
  ability: Ability;
  static indexMap: Record<string, number> = {}; // Shared index map for tracking boss moves

  constructor(that: any, boss: any) {
    this.name = boss.name;
    this.abilities = bosses[boss.name]?.abilities || {};
    this.ability = new Ability(this);
  }

  async normalAttack(
    boss: BossDetails,
    target: TargetDetails
  ): Promise<number> {
    const damage = calculateDamage(boss.stats.attack, target.stats.defense);
    console.log(
      `${this.name} performs a normal attack on ${target.name}, dealing ${damage} damage.`
    );
    return damage;
  }

  async abilityUse(
    boss: BossDetails,
    target: TargetDetails,
    moveIndex: number
  ): Promise<void> {
    const attackPattern = bosses[boss.name]?.attackPattern || [];
    const abilityName = attackPattern[moveIndex];
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

  async move(boss: BossDetails, target: TargetDetails): Promise<number | void> {
    // Initialize index for this boss if not already done
    if (!(boss.name in BossAI.indexMap)) {
      BossAI.indexMap[boss.name] = 0;
    }
    const attackPattern = bosses[boss.name]?.attackPattern || [];

    const currentIndex = BossAI.indexMap[boss.name];

    if (currentIndex >= attackPattern.length) {
      BossAI.indexMap[boss.name] = 0; // Reset index if it exceeds attackPattern length
    }

    for (
      ;
      BossAI.indexMap[boss.name] < attackPattern.length;
      BossAI.indexMap[boss.name]++
    ) {
      const moveIndex = BossAI.indexMap[boss.name];
      const move = attackPattern[moveIndex];
      console.log(`${this.name} prepares move: ${move}`);

      if (move === "Basic Attack") {
        BossAI.indexMap[boss.name]++;
        return this.normalAttack(boss, target);
      } else {
        BossAI.indexMap[boss.name]++;
        return this.abilityUse(boss, target, moveIndex);
      }
    }
  }
}

export { BossAI };
