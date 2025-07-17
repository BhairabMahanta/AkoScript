// effects/StatusEffectManager.ts
import { ExtendedPlayer } from "../../../../gamelogic/buffdebufflogic";

export abstract class StatusEffect {
  abstract name: string;
  abstract apply(target: ExtendedPlayer, battle: any): Promise<boolean>;
}

export class FreezeEffect extends StatusEffect {
  name = 'freeze';
  
  async apply(target: ExtendedPlayer, battle: any): Promise<boolean> {
    battle.stateManager.addBattleLog(`- ${target.name} is frozen and cannot act this turn.`);
    return true; // Turn is skipped
  }
}

export class StunEffect extends StatusEffect {
  name = 'stun';
  
  async apply(target: ExtendedPlayer, battle: any): Promise<boolean> {
    battle.stateManager.addBattleLog(`- ${target.name} is stunned and cannot act this turn.`);
    return true; // Turn is skipped
  }
}

export class SleepEffect extends StatusEffect {
  name = 'sleep';
  
  async apply(target: ExtendedPlayer, battle: any): Promise<boolean> {
    battle.stateManager.addBattleLog(`- ${target.name} is asleep and cannot act this turn.`);
    return true; // Turn is skipped
  }
}

export class BurnEffect extends StatusEffect {
  name = 'burn';
  
  async apply(target: ExtendedPlayer, battle: any): Promise<boolean> {
    target.stats.hp -= Math.floor(target.stats.hp * 0.05);
    battle.stateManager.addBattleLog(`- ${target.name} is burning and lost 5% of HP.`);
    return false; // Turn is not skipped
  }
}

export class TauntEffect extends StatusEffect {
  name = 'taunt';
  
  async apply(target: ExtendedPlayer, battle: any): Promise<boolean> {
    battle.stateManager.updateState({ taunted: true });
    battle.stateManager.addBattleLog(`- ${target.name} is taunted and must target the taunter.`);
    return false; // Turn is not skipped, but actions are restricted
  }
}

export class StatusEffectManager {
  private effects: Map<string, StatusEffect>;

  constructor() {
    this.effects = new Map([
      ['freeze', new FreezeEffect()],
      ['stun', new StunEffect()],
      ['sleep', new SleepEffect()],
      ['burn', new BurnEffect()],
      ['taunt', new TauntEffect()],
    ]);
  }

  async applyPreTurnEffects(target: ExtendedPlayer, type: "debuffs" | "buffs", battle: any): Promise<boolean> {
    const statuses = type === "debuffs" ? target.statuses.debuffs : target.statuses.buffs;
    
    if (!statuses || Object.keys(statuses).length === 0) {
      return false;
    }

    for (const status of Object.values(statuses) as any) {
      for (const effectName of Object.keys(status)) {
        const effect = this.effects.get(effectName);
        if (effect && status[effectName] && await effect.apply(target, battle)) {
          return true;
        }
      }
    }

    return false;
  }

  async applyOnDamageEffects(target: any, damage: number, attacker: any, battle: any): Promise<{ damage: number; effectApplied: boolean }> {
    const statusEffectsOnDamage = {
      invincible: () => {
        battle.stateManager.addBattleLog(`- ${target.name}'s invincibility nullifies the attack.`);
        return { damage: 0, effectApplied: true };
      },
      reflect: () => {
        const reflectDamage = Math.floor(damage * 0.4);
        attacker.stats.hp -= reflectDamage;
        battle.stateManager.addBattleLog(`- ${target.name} reflects ${reflectDamage} damage back to the attacker.`);
        return { damage, effectApplied: true };
      },
      endure: () => {
        if (target.stats.hp - damage <= 0) {
          target.stats.hp = 1;
          battle.stateManager.addBattleLog(`- ${target.name} endures the hit and stays at 1 HP.`);
          return { damage: 0, effectApplied: true };
        }
        return { damage, effectApplied: false };
      },
    };

    const statuses = target.statuses.buffs || [];
    
    if (!statuses || statuses.length === 0) {
      return { damage, effectApplied: false };
    }

    for (const status of statuses) {
      for (const [effectName, effectFn] of Object.entries(statusEffectsOnDamage)) {
        if (status[effectName]) {
          const result = effectFn();
          if (result.effectApplied) {
            return result;
          }
        }
      }
    }

    return { damage, effectApplied: false };
  }
}
