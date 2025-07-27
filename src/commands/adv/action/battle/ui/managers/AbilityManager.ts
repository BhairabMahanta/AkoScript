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
    
    if (currentTurn.ability && Array.isArray(currentTurn.ability)) {
      const moveFinder = currentTurn.ability.map((abilityName: string) =>
        getAbilities(abilityName)
      );
      return this.processAbilities(moveFinder, currentTurn);
    } else {
      console.warn(`[AbilityManager] Familiar ${currentTurn.name} has no abilities or abilities is not an array`);
      return [];
    }
  }

  private async getPlayerAbilities(currentTurn: any): Promise<any[]> {

    
    const playerClass = this.characterIdentifier.getPlayerClass(currentTurn);
    if (playerClass && classes[playerClass] && classes[playerClass].abilities) {
      const playerAbility = classes[playerClass].abilities;
      const moveFinder = playerAbility.map((abilityName: string) =>
        getPlayerMoves(abilityName)
      );
      return this.processAbilities(moveFinder, currentTurn);
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
      return this.processAbilities(moveFinder, currentTurn);
    } else if (currentTurn.class && classes[currentTurn.class]) {
      const playerAbility = classes[currentTurn.class].abilities;
      const moveFinder = playerAbility.map((abilityName: string) =>
        getPlayerMoves(abilityName)
      );
      return this.processAbilities(moveFinder, currentTurn);
    }
    
    return [];
  }

  // FIXED: Now takes currentTurn parameter to check character-specific cooldowns
  private processAbilities(abilities: any[], currentTurn: any): any[] {
    const characterId = currentTurn._id || currentTurn.id || currentTurn.serialId;
    
    return abilities
      .map((ability: any) => {
        if (!ability) {
          return null;
        }

        // FIXED: Check if THIS specific character has the ability on cooldown
        const isOnCooldown = this.battle.stateManager.isAbilityOnCooldown(ability.name, currentTurn.name);
        
        if (isOnCooldown) {

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
    const currentTurn = state.currentTurn;
    const characterId = currentTurn?._id || currentTurn?.id || currentTurn?.serialId;
    
    // FIXED: Show character-specific cooldowns
    const characterCooldowns = characterId ? 
      this.battle.stateManager.getCharacterCooldowns(characterId) : [];
    
    const cooldownDescriptions = characterCooldowns.length > 0
      ? `${currentTurn?.name} has ${characterCooldowns.length} abilities on cooldown`
      : `${currentTurn?.name} has no cooldowns currently.`;
    
    abilityOptions.push({
      label: "Cooldowns",
      description: cooldownDescriptions,
      value: "cooldowns",
    });

    return abilityOptions.length > 1 ? abilityOptions : this.getDefaultAbilityOptions();
  }
}
