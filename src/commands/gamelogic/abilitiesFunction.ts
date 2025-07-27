// gamelogic/abilitiesFunction.ts
import { BuffDebuffManager } from "./buffDebuffManager";
import { BuffDebuffLogic, StatusEffect, ExtendedPlayer } from "./buffdebufflogic";
import abilities, { AbilityInterface } from "../../data/abilities";

// Strategy pattern for ability types
interface AbilityStrategy {
  execute(
    user: ExtendedPlayer,
    targets: ExtendedPlayer | ExtendedPlayer[],
    allTargets: ExtendedPlayer[],
    allAllies: ExtendedPlayer[],
    ability: AbilityInterface
  ): Promise<void>;
}

class Ability {
  private battle: any;
  private buffDebuffManager: BuffDebuffManager;
  private buffDebuffLogic: BuffDebuffLogic;
  private strategies: Map<string, AbilityStrategy>;

  constructor(battle: any) {
    this.battle = battle;
    this.buffDebuffManager = new BuffDebuffManager(battle);
    this.buffDebuffLogic = new BuffDebuffLogic(battle);
    this.strategies = this.initializeStrategies();
  }

  private initializeStrategies(): Map<string, AbilityStrategy> {
    const strategies = new Map<string, AbilityStrategy>();
    
    // Attack strategies
    strategies.set("attack", new AttackStrategy(this));
    strategies.set("attack_many", new AttackManyStrategy(this));
    
    // Buff strategies
    strategies.set("increase_self", new BuffSelfStrategy(this));
    strategies.set("buff_self", new BuffSelfStrategy(this));
    strategies.set("buff_many", new BuffManyStrategy(this));
    strategies.set("increase_hit", new BuffAttackStrategy(this));
    strategies.set("buff_hit", new BuffAttackStrategy(this));
    strategies.set("hit_buff", new AttackBuffStrategy(this));
    
    // Debuff strategies
    strategies.set("decrease", new DebuffStrategy(this));
    strategies.set("debuff", new DebuffStrategy(this));
    strategies.set("debuff_many", new DebuffManyStrategy(this));
    strategies.set("decrease_hit", new DebuffAttackStrategy(this));
    strategies.set("debuff_hit", new DebuffAttackStrategy(this));
    
    // Heal strategies
    strategies.set("heal", new HealStrategy(this));
    strategies.set("heal_many", new HealManyStrategy(this));
    strategies.set("heal_hit", new HealAttackStrategy(this));

    return strategies;
  }

  getCooldown(ability: string): number {
    return abilities[ability]?.cooldown || 0;
  }

  async executeAbility(
    user: ExtendedPlayer,
    target: ExtendedPlayer | ExtendedPlayer[],
    allTargets: ExtendedPlayer[],
    allAllies: ExtendedPlayer[],
    abilityName: string
  ): Promise<void> {
    const ability = abilities[abilityName];
    
    if (!ability) {
      console.error(`Ability ${abilityName} not found`);
      return;
    }

    try {
      const strategy = this.strategies.get(ability.type);
      if (strategy) {
        await strategy.execute(user, target, allTargets, allAllies, ability);
      } else {
        console.log(`Ability type ${ability.type} is not handled.`);
      }
    } catch (error) {
      console.error(`Error executing ability ${abilityName}:`, error);
      this.battle.addBattleLog(`${user.name} failed to use ${abilityName}.`);
    }
  }

  // Utility methods accessible by strategies
  async addCooldown(user: ExtendedPlayer, abilityName: string): Promise<void> {
    this.battle.stateManager.addCooldown({
      name: abilityName,
      characterId: user._id,
      characterName: user.name,
      cooldown: this.getCooldown(abilityName),
    });
  }

  async performAttack(
    user: ExtendedPlayer,
    targets: ExtendedPlayer | ExtendedPlayer[],
    ability: AbilityInterface
  ): Promise<void> {
    if (Array.isArray(targets)) {
      try {
        const { damageArray, enemyNameArray } = await this.buffDebuffLogic.aoeDamage(user, targets, ability);
        this.battle.addBattleLog(
          `+ ${user.name} performs ${ability.name}, hitting ${enemyNameArray.join(", ")} for ${damageArray.join(", ")} damage respectively`
        );
      } catch (error) {
        console.error("AOE damage error:", error);
        // Fallback to individual attacks
        for (const target of targets) {
          await this.battle.combatResolver.critOrNotHandler(
            user.stats.critRate,
            user.stats.critDamage,
            user.stats.attack,
            target.stats.defense,
            target,
            150,
            ability.name
          );
        }
      }
    } else {
      await this.battle.combatResolver.critOrNotHandler(
        user.stats.critRate,
        user.stats.critDamage,
        user.stats.attack,
        targets.stats.defense,
        targets,
        150,
        ability.name
      );
    }
  }

  async applyStatusEffect(
    user: ExtendedPlayer,
    targets: ExtendedPlayer | ExtendedPlayer[],
    ability: AbilityInterface,
    isBuff: boolean
  ): Promise<void> {
    if (!ability.value_amount) return;

    const statusEffect: StatusEffect = {
      name: ability.name,
      type: ability.logicType || (isBuff ? 'buff' : 'debuff'),
      unique: ability.unique || false,
      value_amount: ability.value_amount,
      targets: targets,
      turnLimit: ability.turnLimit || 1,
      flat: ability.flat || false,
    };

    if (isBuff) {
      await this.buffDebuffManager.applyBuff(user, targets, statusEffect);
      if (statusEffect.type.includes("increase_") || statusEffect.type.includes("decrease_")) {
        await this.buffDebuffLogic.increaseWhat(targets, statusEffect);
      }
    } else {
      await this.buffDebuffManager.applyDebuff(user, targets, statusEffect);
      if (statusEffect.type.includes("apply_") || statusEffect.type.includes("remove_")) {
        await this.buffDebuffLogic.decreaseWhat(targets, statusEffect);
      }
    }
  }

  async performHeal(
    user: ExtendedPlayer,
    targets: ExtendedPlayer | ExtendedPlayer[],
    ability: AbilityInterface
  ): Promise<void> {
    const healAmount = ability.value_amount && typeof ability.value_amount === 'object' 
      ? (ability.value_amount as any)["heal"] || 0 
      : 0;
    
    const targetArray = Array.isArray(targets) ? targets : [targets];
    
    for (const target of targetArray) {
      const currentHp = typeof target.stats.hp === 'number' ? target.stats.hp : 0;
      const maxHp = target.maxHp || currentHp;
      target.stats.hp = Math.min(currentHp + healAmount, maxHp);
    }

    this.battle.addBattleLog(
      `${user.name} heals ${targetArray.map(t => t.name).join(", ")} with ${ability.name}, restoring ${healAmount} HP${targetArray.length > 1 ? ' each' : ''}.`
    );
  }

  // Getters for strategies to access private members
  get manager() { return this.buffDebuffManager; }
  get logic() { return this.buffDebuffLogic; }
}

// Strategy implementations
class AttackStrategy implements AbilityStrategy {
  constructor(private ability: Ability) {}

  async execute(user: ExtendedPlayer, targets: ExtendedPlayer | ExtendedPlayer[], allTargets: ExtendedPlayer[], allAllies: ExtendedPlayer[], abilityData: AbilityInterface): Promise<void> {
    await this.ability.performAttack(user, targets, abilityData);
    await this.ability.addCooldown(user, abilityData.name);
  }
}

class AttackManyStrategy implements AbilityStrategy {
  constructor(private ability: Ability) {}

  async execute(user: ExtendedPlayer, targets: ExtendedPlayer | ExtendedPlayer[], allTargets: ExtendedPlayer[], allAllies: ExtendedPlayer[], abilityData: AbilityInterface): Promise<void> {
    const actualTargets = Array.isArray(targets) ? targets : allTargets;
    await this.ability.performAttack(user, actualTargets, abilityData);
    await this.ability.addCooldown(user, abilityData.name);
  }
}

class BuffSelfStrategy implements AbilityStrategy {
  constructor(private ability: Ability) {}

  async execute(user: ExtendedPlayer, targets: ExtendedPlayer | ExtendedPlayer[], allTargets: ExtendedPlayer[], allAllies: ExtendedPlayer[], abilityData: AbilityInterface): Promise<void> {
    await this.ability.applyStatusEffect(user, user, abilityData, true);
    await this.ability.addCooldown(user, abilityData.name);
  }
}

class BuffManyStrategy implements AbilityStrategy {
  constructor(private ability: Ability) {}

  async execute(user: ExtendedPlayer, targets: ExtendedPlayer | ExtendedPlayer[], allTargets: ExtendedPlayer[], allAllies: ExtendedPlayer[], abilityData: AbilityInterface): Promise<void> {
    const actualTargets = Array.isArray(targets) ? targets : allAllies;
    await this.ability.applyStatusEffect(user, actualTargets, abilityData, true);
    await this.ability.addCooldown(user, abilityData.name);
  }
}

class BuffAttackStrategy implements AbilityStrategy {
  constructor(private ability: Ability) {}

  async execute(user: ExtendedPlayer, targets: ExtendedPlayer | ExtendedPlayer[], allTargets: ExtendedPlayer[], allAllies: ExtendedPlayer[], abilityData: AbilityInterface): Promise<void> {
    await this.ability.applyStatusEffect(user, user, abilityData, true);
    await this.ability.performAttack(user, targets, abilityData);
    await this.ability.addCooldown(user, abilityData.name);
  }
}

class AttackBuffStrategy implements AbilityStrategy {
  constructor(private ability: Ability) {}

  async execute(user: ExtendedPlayer, targets: ExtendedPlayer | ExtendedPlayer[], allTargets: ExtendedPlayer[], allAllies: ExtendedPlayer[], abilityData: AbilityInterface): Promise<void> {
    await this.ability.performAttack(user, targets, abilityData);
    await this.ability.applyStatusEffect(user, user, abilityData, true);
    await this.ability.addCooldown(user, abilityData.name);
  }
}

class DebuffStrategy implements AbilityStrategy {
  constructor(private ability: Ability) {}

  async execute(user: ExtendedPlayer, targets: ExtendedPlayer | ExtendedPlayer[], allTargets: ExtendedPlayer[], allAllies: ExtendedPlayer[], abilityData: AbilityInterface): Promise<void> {
    await this.ability.applyStatusEffect(user, targets, abilityData, false);
    await this.ability.addCooldown(user, abilityData.name);
  }
}

class DebuffManyStrategy implements AbilityStrategy {
  constructor(private ability: Ability) {}

  async execute(user: ExtendedPlayer, targets: ExtendedPlayer | ExtendedPlayer[], allTargets: ExtendedPlayer[], allAllies: ExtendedPlayer[], abilityData: AbilityInterface): Promise<void> {
    const actualTargets = Array.isArray(targets) ? targets : allTargets;
    await this.ability.applyStatusEffect(user, actualTargets, abilityData, false);
    await this.ability.addCooldown(user, abilityData.name);
  }
}

class DebuffAttackStrategy implements AbilityStrategy {
  constructor(private ability: Ability) {}

  async execute(user: ExtendedPlayer, targets: ExtendedPlayer | ExtendedPlayer[], allTargets: ExtendedPlayer[], allAllies: ExtendedPlayer[], abilityData: AbilityInterface): Promise<void> {
    await this.ability.applyStatusEffect(user, targets, abilityData, false);
    await this.ability.performAttack(user, targets, abilityData);
    await this.ability.addCooldown(user, abilityData.name);
  }
}

class HealStrategy implements AbilityStrategy {
  constructor(private ability: Ability) {}

  async execute(user: ExtendedPlayer, targets: ExtendedPlayer | ExtendedPlayer[], allTargets: ExtendedPlayer[], allAllies: ExtendedPlayer[], abilityData: AbilityInterface): Promise<void> {
    await this.ability.performHeal(user, targets, abilityData);
    await this.ability.addCooldown(user, abilityData.name);
  }
}

class HealManyStrategy implements AbilityStrategy {
  constructor(private ability: Ability) {}

  async execute(user: ExtendedPlayer, targets: ExtendedPlayer | ExtendedPlayer[], allTargets: ExtendedPlayer[], allAllies: ExtendedPlayer[], abilityData: AbilityInterface): Promise<void> {
    const actualTargets = Array.isArray(targets) ? targets : allAllies;
    await this.ability.performHeal(user, actualTargets, abilityData);
    await this.ability.addCooldown(user, abilityData.name);
  }
}

class HealAttackStrategy implements AbilityStrategy {
  constructor(private ability: Ability) {}

  async execute(user: ExtendedPlayer, targets: ExtendedPlayer | ExtendedPlayer[], allTargets: ExtendedPlayer[], allAllies: ExtendedPlayer[], abilityData: AbilityInterface): Promise<void> {
    await this.ability.performAttack(user, targets, abilityData);
    await this.ability.performHeal(user, user, abilityData);
    await this.ability.addCooldown(user, abilityData.name);
  }
}

export { Ability };
