// ui/managers/AbilityManager.ts
import { getAbilities, getPlayerMoves } from '../../../../../util/glogic';
import classes from "../../../../../../data/classes/allclasses";
import { CharacterIdentifier } from "./CharacterIdentifier";

export class AbilityManager {
  private battle: any;
  private characterIdentifier: CharacterIdentifier;

  constructor(battle: any) {
    this.battle = battle;
    this.characterIdentifier = new CharacterIdentifier(battle);
  }

  async getAbilityOptions(): Promise<any[]> {
    const state = this.battle.stateManager.getState();
    let abilityOptions: any[] = [];

    console.log(`[AbilityManager] Getting ability options for: ${state.currentTurn?.name}`);

    if (!state.currentTurn) {
      console.error("[AbilityManager] No current turn found");
      return this.getDefaultAbilityOptions();
    }

    const isFamiliar = this.isFamiliarTurn(state.currentTurn);
    
    if (isFamiliar) {
      abilityOptions = await this.getFamiliarAbilities(state.currentTurn);
    } else if (this.characterIdentifier.isPlayerCharacter(state.currentTurn)) {
      abilityOptions = await this.getPlayerAbilities(state.currentTurn);
    } else {
      abilityOptions = await this.getEnemyAbilities(state.currentTurn);
    }

    return this.finalizeAbilityOptions(abilityOptions);
  }

  private isFamiliarTurn(currentTurn: any): boolean {
    return this.battle.familiarInfo.some((familiar: any) => 
      familiar.serialId === currentTurn.serialId || 
      familiar.name === currentTurn.name
    );
  }

  private async getFamiliarAbilities(currentTurn: any): Promise<any[]> {
    console.log("[AbilityManager] Current turn is a familiar");
    
    if (currentTurn.ability && Array.isArray(currentTurn.ability)) {
      const moveFinder = currentTurn.ability.map((abilityName: string) =>
        getAbilities(abilityName)
      );
      return this.processAbilities(moveFinder);
    } else {
      console.warn(`[AbilityManager] Familiar ${currentTurn.name} has no abilities or abilities is not an array`);
      return [];
    }
  }

  private async getPlayerAbilities(currentTurn: any): Promise<any[]> {
    console.log("[AbilityManager] Current turn is a player");
    
    const playerClass = this.characterIdentifier.getPlayerClass(currentTurn);
    if (playerClass && classes[playerClass] && classes[playerClass].abilities) {
      const playerAbility = classes[playerClass].abilities;
      const moveFinder = playerAbility.map((abilityName: string) =>
        getPlayerMoves(abilityName)
      );
      return this.processAbilities(moveFinder);
    } else {
      console.warn(`[AbilityManager] Player ${currentTurn.name} has no valid class or abilities`);
      return [];
    }
  }

  private async getEnemyAbilities(currentTurn: any): Promise<any[]> {
    console.log("[AbilityManager] Current turn is an enemy/opponent");
    
    if (currentTurn.ability && Array.isArray(currentTurn.ability)) {
      const moveFinder = currentTurn.ability.map((abilityName: string) =>
        getAbilities(abilityName)
      );
      return this.processAbilities(moveFinder);
    } else if (currentTurn.class && classes[currentTurn.class]) {
      const playerAbility = classes[currentTurn.class].abilities;
      const moveFinder = playerAbility.map((abilityName: string) =>
        getPlayerMoves(abilityName)
      );
      return this.processAbilities(moveFinder);
    }
    
    return [];
  }

  private processAbilities(abilities: any[]): any[] {
    const state = this.battle.stateManager.getState();
    
    return abilities
      .map((ability: any) => {
        if (!ability || (state.cooldowns && state.cooldowns.some((cooldown: any) => cooldown.name === ability.name))) {
          return null;
        }

        if (ability.selection !== undefined) {
          return {
            label: ability.name,
            description: ability.description,
            value: `selection-${ability.name}`,
          };
        } else if (ability.description) {
          return {
            label: ability.name,
            description: ability.description,
            value: `ability-${ability.name}`,
          };
        }
        return null;
      })
      .filter(Boolean);
  }

  private getDefaultAbilityOptions(): any[] {
    return [{
      label: "No Abilities",
      description: "No abilities available.",
      value: "no_ability",
    }, {
      label: "Cooldowns",
      description: "There are no cooldowns currently.",
      value: "cooldowns",
    }];
  }

  private finalizeAbilityOptions(abilityOptions: any[]): any[] {
    const state = this.battle.stateManager.getState();
    
    const cooldownDescriptions = state.cooldowns && state.cooldowns.length > 0
      ? "Click here to see your cooldowns"
      : "There are no cooldowns currently.";
    
    abilityOptions.push({
      label: "Cooldowns",
      description: cooldownDescriptions,
      value: "cooldowns",
    });

    return abilityOptions.length > 1 ? abilityOptions : this.getDefaultAbilityOptions();
  }
}
