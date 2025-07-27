// gamelogic/buffdebufflogic.ts
import { Player, Stats } from "../../data/mongo/playerschema";

export interface ExtendedPlayer extends Player {
  statuses: {
    buffs: StatusEffect[];
    debuffs: StatusEffect[];
  };
  attackBarEmoji?: string;
  hpBar: number;
  atkBar: number;
  hpBarEmoji?: string;
  maxHp: number;
  speedBuff?: boolean;
  isNPC?: boolean;
}

// Unified interface for both buffs and debuffs
export interface StatusEffect {
  type: string;
  name: string;
  value_amount: {
    attack?: number;
    speed?: number;
    defense?: number;
    heal?: number;
  };
  flat?: boolean;
  unique?: boolean;
  turnLimit: number;
  targets: ExtendedPlayer | ExtendedPlayer[];
}

// Deprecated - keeping for backward compatibility
export interface BuffDetails extends StatusEffect {}
export interface DebuffDetails extends StatusEffect {}

interface Buff {
  name: string;
  description: string;
  effect: string;
}

export const buffs: Record<string, Buff> = {
  "Attack Boost": { name: "Attack Boost", description: "Boosts your attack power.", effect: "increase_attack" },
  "Defense Boost": { name: "Defense Boost", description: "Boosts your defense power.", effect: "increase_defense" },
  "Speed Boost": { name: "Speed Boost", description: "Boosts your speed.", effect: "increase_speed" },
};

export const debuffs: Record<string, Buff> = {
  "Attack Break": { name: "Attack Break", description: "Reduces your attack power.", effect: "decrease_attack" },
  "Defense Break": { name: "Defense Break", description: "Reduces your defense power.", effect: "decrease_defense" },
  "Slow": { name: "Slow", description: "Reduces your speed.", effect: "decrease_speed" },
  "Stun": { name: "Stun", description: "Stuns you, preventing any action.", effect: "stun" },
};

type StatType = 'attack' | 'speed' | 'defense';
type SpecialEffectType = 'immunity' | 'stun' | 'invincibility' | 'freeze' | 'invisibility' | 'block_buffs' | 'cleanse';

class BuffDebuffLogic {
  private battle: any;

  constructor(battle: any) {
    this.battle = battle;
  }

  // Unified method to modify stats (replaces 6 separate methods)
  private modifyStat(target: Player, stat: StatType, amount: number, flat: boolean, increase: boolean): void {
    const multiplier = increase ? 1 : -1;
    if (flat) {
      target.stats[stat] += amount * multiplier;
    } else {
      target.stats[stat] += (target.stats[stat] * amount * multiplier) / 100;
    }
  }

  // Unified method for applying special effects
  private async applySpecialEffect(target: Player, effect: SpecialEffectType, turns: number): Promise<void> {
    // Placeholder implementations - extend as needed
    switch (effect) {
      case 'immunity':
      case 'stun':
      case 'invincibility':
      case 'freeze':
      case 'invisibility':
      case 'block_buffs':
        // Implementation would go here
        break;
      case 'cleanse':
        // Implementation would go here
        break;
    }
  }

  // Optimized AOE damage calculation
  async aoeDamage(user: Player, targets: Player[], ability: any): Promise<{ damageArray: number[]; enemyNameArray: string[] }> {
    const damageArray: number[] = [];
    const enemyNameArray: string[] = [];
    const power = ability.power || 150;

    // Process all targets in parallel for better performance
    const results = await Promise.all(
      targets.map(async (target) => {
        const damage = await this.battle.combatResolver.critOrNotHandler(
          user.stats.critRate,
          user.stats.critDamage,
          user.stats.attack,
          target.stats.defense,
          target,
          power,
          ability.name
        );
        return { damage, name: target.name };
      })
    );

    results.forEach(result => {
      damageArray.push(result.damage);
      enemyNameArray.push(result.name);
    });

    return { damageArray, enemyNameArray };
  }

  // Unified method for processing status effects
  async processStatusEffect(
    targets: ExtendedPlayer | ExtendedPlayer[], 
    effect: StatusEffect, 
    isIncrease: boolean = true
  ): Promise<string[]> {
    const targetArray = Array.isArray(targets) ? targets : [targets];
    const effectTypes = effect.type.split("_and_");
    const targetNames: string[] = [];
    const statChanges: string[] = [];

    for (const target of targetArray) {
      for (const effectType of effectTypes) {
        const flat = effect.flat || false;
        
        if (effectType.startsWith("apply_")) {
          const specialEffect = effectType.replace("apply_", "") as SpecialEffectType;
          await this.applySpecialEffect(target, specialEffect, effect.turnLimit);
        } else if (effectType.includes("_")) {
          const [action, stat] = effectType.split("_");
          const shouldIncrease = action === "increase";
          const amount = effect.value_amount[stat as StatType] || 0;
          
          if (stat in target.stats) {
            this.modifyStat(target, stat as StatType, amount, flat, shouldIncrease);
            statChanges.push(`${stat} by ${amount}${flat ? "" : "%"}`);
          }
        }
      }
      targetNames.push(target.name);
    }

    return targetNames;
  }

  // Simplified increase method
  async increaseWhat(targets: ExtendedPlayer | ExtendedPlayer[], effect: StatusEffect): Promise<void> {
    const targetNames = await this.processStatusEffect(targets, effect, true);
    const statChanges = this.getStatChangesDescription(effect);
    
    this.battle.addBattleLog(
      `${targetNames.join(", ")} received ${effect.name} buff${statChanges ? `, increasing ${statChanges}` : ""}.`
    );
  }

  // Simplified decrease method
  async decreaseWhat(targets: ExtendedPlayer | ExtendedPlayer[], effect: StatusEffect): Promise<void> {
    const targetNames = await this.processStatusEffect(targets, effect, false);
    const statChanges = this.getStatChangesDescription(effect);
    
    this.battle.addBattleLog(
      `${targetNames.join(", ")} received ${effect.name} debuff${statChanges ? `, decreasing ${statChanges}` : ""}.`
    );
  }

  // Helper method to generate stat change descriptions
  private getStatChangesDescription(effect: StatusEffect): string {
    const changes: string[] = [];
    const flat = effect.flat || false;
    
    Object.entries(effect.value_amount).forEach(([stat, amount]) => {
      if (amount && stat !== 'heal') {
        changes.push(`${stat} by ${amount}${flat ? "" : "%"}`);
      }
    });
    
    return changes.join(" and ");
  }

  // Simplified apply method for special effects
  async applyWhat(targets: ExtendedPlayer | ExtendedPlayer[], effect: StatusEffect): Promise<void> {
    const targetNames = await this.processStatusEffect(targets, effect);
    this.battle.addBattleLog(`${targetNames.join(", ")} received ${effect.name} effect.`);
  }

  // Optimized overLogic method
  async processStatusRemoval(
    player: ExtendedPlayer,
    statusEffect: StatusEffect,
    index: number,
    isDebuff: boolean
  ): Promise<void> {
    const effectTypes = statusEffect.type.split("_and_");
    
    effectTypes.forEach((type: string) => {
      if (type.startsWith("increase_") || type.startsWith("decrease_")) {
        const [action, attribute] = type.split("_");
        const amount = statusEffect.value_amount[attribute as StatType] || 0;
        const shouldReverse = action === "increase";
        
        if (attribute in player.stats) {
          this.modifyStat(player, attribute as StatType, amount, statusEffect.flat || false, !shouldReverse);
        }
      }
    });

    // Remove the status effect
    if (isDebuff) {
      player.statuses.debuffs.splice(index, 1);
    } else {
      player.statuses.buffs.splice(index, 1);
    }
  }

  // Legacy method for backward compatibility
  async overLogic(turnEnder: ExtendedPlayer, effect: any, index: number, isDebuff: boolean): Promise<void> {
    await this.processStatusRemoval(turnEnder, effect, index, isDebuff);
  }

  // Legacy methods for backward compatibility - now using unified logic
  async increaseAttack(target: Player, amount: number, flat: boolean): Promise<void> {
    this.modifyStat(target, 'attack', amount, flat, true);
  }

  async decreaseAttack(target: Player, amount: number, flat: boolean): Promise<void> {
    this.modifyStat(target, 'attack', amount, flat, false);
  }

  async increaseSpeed(target: Player, amount: number, flat: boolean): Promise<void> {
    this.modifyStat(target, 'speed', amount, flat, true);
  }

  async decreaseSpeed(target: Player, amount: number, flat: boolean): Promise<void> {
    this.modifyStat(target, 'speed', amount, flat, false);
  }

  async increaseDefense(target: Player, amount: number, flat: boolean): Promise<void> {
    this.modifyStat(target, 'defense', amount, flat, true);
  }

  async decreaseDefense(target: Player, amount: number, flat: boolean): Promise<void> {
    this.modifyStat(target, 'defense', amount, flat, false);
  }

  // Legacy special effect methods
  async immunity(target: Player, turns: number): Promise<void> {
    await this.applySpecialEffect(target, 'immunity', turns);
  }
  async stun(target: Player, turns: number): Promise<void> {
    await this.applySpecialEffect(target, 'stun', turns);
  }
  async invincibility(target: Player, turns: number): Promise<void> {
    await this.applySpecialEffect(target, 'invincibility', turns);
  }
  async freeze(target: Player, turns: number): Promise<void> {
    await this.applySpecialEffect(target, 'freeze', turns);
  }
  async invisibility(target: Player, turns: number): Promise<void> {
    await this.applySpecialEffect(target, 'invisibility', turns);
  }
  async blockBuffs(target: Player, turns: number): Promise<void> {
    await this.applySpecialEffect(target, 'block_buffs', turns);
  }
  async cleanse(target: Player): Promise<void> {
    await this.applySpecialEffect(target, 'cleanse', 0);
  }

  // Legacy method - simplified
  async increaseAttackNSpeed(targets: ExtendedPlayer | ExtendedPlayer[], effect: StatusEffect): Promise<void> {
    await this.increaseWhat(targets, effect);
  }
}

export { BuffDebuffLogic };
