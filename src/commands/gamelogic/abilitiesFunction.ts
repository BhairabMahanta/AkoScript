import {
  checkResults,
  updateMovesOnCd,
  getPlayerMoves,
  critOrNot,
} from "../util/glogic.js";
import { BuffDebuffManager } from "./buffDebuffManager.js";
import { BuffDebuffLogic } from "./buffdebufflogic.js";
import abilities from "../../data/abilities.js";
import allFamiliars from "../../data/information/allfamiliars.js";
// import { calculateDamage } from "../../../my_rust_library/my_rust_library.node";
// import { some } from "../../../data/locations.js";

type Stats = {
  critRate: number;
  critDamage: number;
  attack: number;
  defense: number;
  speed?: number;
};

type Character = {
  stats: Stats;
};

type DebuffDetails = {
  name: string;
  debuffType: string;
  unique: boolean;
  value_amount: Record<string, number>;
  targets: Character;
  turnLimit: number;
  flat: boolean;
};

type BuffDetails = {
  name: string;
  buffType: string;
  unique: boolean;
  value_amount: Record<string, number>;
  targets: Character;
  turnLimit: number;
  flat: boolean;
};

let that2: any;

export class Ability {
  private battleLogs: any;
  private enemyToHit: any;
  private cooldowns: { name: string; cooldown: Promise<number> }[];
  private buffDebuffManager: BuffDebuffManager;
  private buffDebuffLogic: BuffDebuffLogic;

  constructor(that: any) {
    that2 = that;
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

  // PLAYER ABILITIES

  async shieldBash(user: Character, target: Character): Promise<void> {
    const damage = await that2.critOrNotHandler(
      user.stats.critRate,
      user.stats.critDamage,
      user.stats.attack,
      target.stats.defense,
      target,
      150,
      "Shield Bash"
    );

    const debuffDetails: DebuffDetails = {
      name: "Shield Bash",
      debuffType: "decrease_speed",
      unique: true,
      value_amount: { speed: 20 },
      targets: target,
      turnLimit: 2,
      flat: true,
    };

    this.buffDebuffManager.applyDebuff(user, target, debuffDetails);
    await this.buffDebuffLogic.decreaseWhat(target, debuffDetails);

    this.cooldowns.push({
      name: "Shield Bash",
      cooldown: this.cooldownFinder("Shield Bash"),
    });
  }

  async defend(user: Character): Promise<void> {
    const buffDetails: BuffDetails = {
      name: "Defend",
      buffType: "increase_defense",
      unique: true,
      value_amount: { defense: 110 },
      targets: user,
      turnLimit: 2,
      flat: true,
    };

    this.buffDebuffManager.applyBuff(user, user, buffDetails);
    await this.buffDebuffLogic.increaseWhat(user, buffDetails);

    this.cooldowns.push({
      name: "Defend",
      cooldown: this.cooldownFinder("Defend"),
    });
  }

  async bloodlust(user: Character, target: Character): Promise<void> {
    const buffDetails: BuffDetails = {
      name: "Bloodlust",
      buffType: "increase_attack_and_increase_speed",
      unique: true,
      value_amount: { attack: 110, speed: 20 },
      targets: target,
      turnLimit: 1,
      flat: true,
    };

    this.buffDebuffManager.applyBuff(user, target, buffDetails);
    await this.buffDebuffLogic.increaseWhat(user, buffDetails);

    this.cooldowns.push({
      name: "Bloodlust",
      cooldown: this.cooldownFinder("Bloodlust"),
    });
  }
}
