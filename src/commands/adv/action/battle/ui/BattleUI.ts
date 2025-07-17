// ui/BattleUI.ts
import {
  ActionRowBuilder,
  ButtonBuilder,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ModalSubmitInteraction,
} from "discord.js";
import { getAbilities, getPlayerMoves, cycleCooldowns } from '../../../../util/glogic';
import classes from "../../../../../data/classes/allclasses";
import abilities from "../../../../../data/abilities";

export class BattleUI {
  private battle: any;
  private interactionManager: DiscordInteractionManager;

  constructor(battle: any) {
    this.battle = battle;
    this.interactionManager = new DiscordInteractionManager(battle);
  }

  async createActionRows(): Promise<any[]> {
    const state = this.battle.stateManager.getState();
    
    const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("action_normal")
        .setLabel("Basic Attack")
        .setStyle(3),
      new ButtonBuilder()
        .setCustomId("action_dodge")
        .setLabel("Dodge")
        .setStyle(3)
    );

    const abilityOptions = await this.getAbilityOptions();
    const enemyOptions = this.getEnemyOptions();

    const stringMenu = new StringSelectMenuBuilder()
      .setCustomId("starter")
      .setPlaceholder("Pick Ability!")
      .addOptions(abilityOptions);

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId("action_select")
      .setPlaceholder("Select the target")
      .addOptions(enemyOptions);

    const stringMenuRow = new ActionRowBuilder().addComponents(stringMenu);
    const selectMenuRow = new ActionRowBuilder().addComponents(selectMenu);

    return [buttonRow, stringMenuRow, selectMenuRow];
  }

  private async getAbilityOptions(): Promise<any[]> {
    const state = this.battle.stateManager.getState();
    let abilityOptions: any[] = [];

    console.log(`[BattleUI] Getting ability options for: ${state.currentTurn?.name}`);

    // FIXED: Add null checks and better error handling
    if (!state.currentTurn) {
      console.error("[BattleUI] No current turn found");
      return this.getDefaultAbilityOptions();
    }

    // Check if current turn is a familiar
    const isFamiliar = this.battle.familiarInfo.some((familiar: any) => 
      familiar.serialId === state.currentTurn.serialId || 
      familiar.name === state.currentTurn.name
    );

    if (isFamiliar) {
      console.log("[BattleUI] Current turn is a familiar");
      
      // FIXED: Add null check for ability property
      if (state.currentTurn.ability && Array.isArray(state.currentTurn.ability)) {
        const moveFinder = state.currentTurn.ability.map((abilityName: string) =>
          getAbilities(abilityName)
        );
        abilityOptions = this.processAbilities(moveFinder);
      } else {
        console.warn(`[BattleUI] Familiar ${state.currentTurn.name} has no abilities or abilities is not an array`);
      }
    } 
    // Check if current turn is a player
    else if (this.isPlayerCharacter(state.currentTurn)) {
      console.log("[BattleUI] Current turn is a player");
      
      const playerClass = this.getPlayerClass(state.currentTurn);
      if (playerClass && classes[playerClass] && classes[playerClass].abilities) {
        const playerAbility = classes[playerClass].abilities;
        const moveFinder = playerAbility.map((abilityName: string) =>
          getPlayerMoves(abilityName)
        );
        abilityOptions = this.processAbilities(moveFinder);
      } else {
        console.warn(`[BattleUI] Player ${state.currentTurn.name} has no valid class or abilities`);
      }
    }
    // Check if current turn is an enemy (for PvP)
    else {
      console.log("[BattleUI] Current turn is an enemy/opponent");
      
      // For PvP opponents, check if they have abilities
      if (state.currentTurn.ability && Array.isArray(state.currentTurn.ability)) {
        const moveFinder = state.currentTurn.ability.map((abilityName: string) =>
          getAbilities(abilityName)
        );
        abilityOptions = this.processAbilities(moveFinder);
      } else if (state.currentTurn.class && classes[state.currentTurn.class]) {
        const playerAbility = classes[state.currentTurn.class].abilities;
        const moveFinder = playerAbility.map((abilityName: string) =>
          getPlayerMoves(abilityName)
        );
        abilityOptions = this.processAbilities(moveFinder);
      }
    }

    return this.finalizeAbilityOptions(abilityOptions);
  }

  private isPlayerCharacter(character: any): boolean {
    return character.name === this.battle.player.name || 
           (this.battle.player2 && character.name === this.battle.player2.name);
  }

  private getPlayerClass(character: any): string | null {
    if (character.name === this.battle.player.name) {
      return this.battle.player.class;
    } else if (this.battle.player2 && character.name === this.battle.player2.name) {
      return this.battle.player2.class;
    }
    return null;
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
    
    // Add cooldowns option
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

  private processAbilities(abilities: any[]): any[] {
    const state = this.battle.stateManager.getState();
    
    return abilities
      .map((ability: any) => {
        if (!ability || (state.cooldowns && state.cooldowns.some((cooldown:any) => cooldown.name === ability.name))) {
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

// Add a method to get the current target list (shared by both display and selection)
private getCurrentTargetList(): any[] {
  const state = this.battle.stateManager.getState();
  let availableTargets: any[] = [];
  
  if (this.battle.mode === 'pve') {
    // For PvE, targets are always the enemies
    availableTargets = state.aliveEnemies || [];
  } else {
    // For PvP, determine opponents based on whose turn it is
    const currentTurn = state.currentTurn;
    
    if (this.isPlayer1TeamCharacter(currentTurn)) {
      // If it's Player 1's team turn, they can attack Player 2's team
      availableTargets = this.getPlayer2Team().filter(target => 
        target && target.stats && target.stats.hp > 0
      );
    } else if (this.isPlayer2TeamCharacter(currentTurn)) {
      // If it's Player 2's team turn, they can attack Player 1's team
      availableTargets = this.getPlayer1Team().filter(target => 
        target && target.stats && target.stats.hp > 0
      );
    }
  }
  
  console.log(`[BattleUI] Current target list: ${availableTargets.map(t => t.name).join(', ')}`);
  return availableTargets;
}

// Updated getEnemyOptions to use the shared target list
private getEnemyOptions(): any[] {
  const availableTargets = this.getCurrentTargetList();
  
  console.log(`[BattleUI] Creating dropdown options for targets: ${availableTargets.map(t => t.name).join(', ')}`);
  
  const options = availableTargets.map((target: any, index: number) => ({
    label: target.name,
    description: `Attack ${target.name}`,
    value: `enemy_${index}`,
  }));

  return options.length > 0 ? options : [{
    label: "No Targets",
    description: "No enemies available to attack.",
    value: "no_target",
  }];
}

// Helper method to check if character belongs to Player 1's team
private isPlayer1TeamCharacter(character: any): boolean {
  if (!character) return false;
  
  const player1Id = this.battle.player.id || this.battle.player._id;
  
  // Check if it's Player 1 themselves
  if (character.id === player1Id || character._id === player1Id) {
    return true;
  }
  
  // Check if it's Player 1's familiar using BOTH serialId AND name
  const isPlayer1Familiar = this.battle.familiarInfo.some((f: any) => 
    f.serialId === character.serialId && f.name === character.name
  );
  
  return isPlayer1Familiar;
}

// Helper method to check if character belongs to Player 2's team
private isPlayer2TeamCharacter(character: any): boolean {
  if (!character) return false;
  
  const player2Id = this.battle.player2.id || this.battle.player2._id;
  
  // Check if it's Player 2 themselves
  if (character.id === player2Id || character._id === player2Id) {
    return true;
  }
  
  // Check if it's Player 2's familiar using BOTH serialId AND name
  const isPlayer2Familiar = this.battle.player2FamiliarInfo.some((f: any) => 
    f.serialId === character.serialId && f.name === character.name
  );
  
  return isPlayer2Familiar;
}

// Helper method to get Player 1's team (player + familiars)
private getPlayer1Team(): any[] {
  return [this.battle.player, ...this.battle.familiarInfo];
}

// Helper method to get Player 2's team (player + familiars)
private getPlayer2Team(): any[] {
  return [this.battle.player2, ...this.battle.player2FamiliarInfo];
}



  private isPlayerTeam(character: any): boolean {
    if (!character) return false;
    
    // Check if character is player 1 or their familiar
    if (character.name === this.battle.player.name) return true;
    if (this.battle.familiarInfo.some((f: any) => f.serialId === character.serialId)) return true;
    
    return false;
  }

  async handleInteraction(interaction: any): Promise<void> {
    await this.interactionManager.handleInteraction(interaction);
  }
}

export class DiscordInteractionManager {
  private battle: any;

  constructor(battle: any) {
    this.battle = battle;
  }

  async handleInteraction(i: any): Promise<void> {
    console.log(`[DiscordInteractionManager] Handling interaction: ${i.customId} from ${i.user.username}`);
    
    // Check if current player can interact (PvP mode)
    if (this.battle.mode !== 'pve') {
      const isCurrentPlayersTurn = this.isCurrentPlayersTurn(i.user.id);
      
      if (!isCurrentPlayersTurn) {
        await i.reply({ 
          content: "It's not your turn! Wait for your opponent to finish their turn.", 
          ephemeral: true 
        });
        return;
      }
    }

    // Check if current turn character is alive before processing any action
    const state = this.battle.stateManager.getState();
    if (state.currentTurn?.stats.hp <= 0) {
      await i.reply({
        content: `${state.currentTurn.name} is dead and cannot take actions!`,
        ephemeral: true,
      });
      return;
    }

    try {
      if (!["starter"].includes(i.customId)) {
        await i.deferUpdate();
      }

      switch (i.customId) {
        case "action_normal":
          await this.handleActionNormal(i);
          break;
        case "action_select":
          await this.handleActionSelect(i);
          break;
        case "starter":
          await this.handleStarterSelection(i);
          break;
        case "action_dodge":
          await this.handleDodgeAction(i);
          break;
        default:
          console.error(`[DiscordInteractionManager] Unhandled customId: ${i.customId}`);
      }
    } catch (error) {
      console.error("[DiscordInteractionManager] Error handling interaction:", error);
      await i.followUp({
        content: "An error occurred. Please try again later.",
        ephemeral: true,
      });
    }
  }
private isAICharacterTurn(currentTurn: any): boolean {
  if (!currentTurn) return false;
  
  const player2Id = this.battle.player2.id || this.battle.player2._id;
  
  // Check if it's player2 themselves
  if (currentTurn.id === player2Id || currentTurn._id === player2Id) {
    return true;
  }
  
  // Check if it's player2's familiar
  const isPlayer2Familiar = this.battle.player2FamiliarInfo.some((f: any) => 
    f.serialId === currentTurn.serialId && f.name === currentTurn.name
  );
  
  return isPlayer2Familiar;
}
  // FIXED: Proper turn-based interaction checking
private isCurrentPlayersTurn(userId: string): boolean {
  const state = this.battle.stateManager.getState();
  const currentTurn = state.currentTurn;
  
if (!currentTurn) {
    console.log("[DiscordInteractionManager] No current turn found");
    return false;
  }
  
  // If it's an AI player's turn in AFK mode, don't allow human interactions
  if (this.battle.mode === 'pvp_afk' && this.isAICharacterTurn(currentTurn)) {
    console.log("[DiscordInteractionManager] AI turn - blocking human interaction");
    return false;
  }
  
  console.log(`[DiscordInteractionManager] Checking turn for user: ${userId}`);
  console.log(`[DiscordInteractionManager] Current turn character: ${currentTurn.name}`);
  
  // Get player IDs
  const player1Id = this.battle.player.id || this.battle.player._id;
  const player2Id = this.battle.player2.id || this.battle.player2._id;
  
  console.log(`[DiscordInteractionManager] Player 1 ID: ${player1Id}, Player 2 ID: ${player2Id}`);
  
  // Determine which player owns the current turn character
  const isPlayer1Character = this.isPlayer1Character(currentTurn);
  const isPlayer2Character = this.isPlayer2Character(currentTurn);
  
  console.log(`[DiscordInteractionManager] Is Player 1 character: ${isPlayer1Character}, Is Player 2 character: ${isPlayer2Character}`);
  
  // IMPORTANT: A character should only belong to one player
  if (isPlayer1Character && isPlayer2Character) {
    console.error(`[DiscordInteractionManager] ERROR: Character ${currentTurn.name} belongs to both players! This should not happen.`);
    return false;
  }
  
  // Check if the current Discord user can control the current turn character
  if (isPlayer1Character && userId === player1Id) {
    console.log("[DiscordInteractionManager] Player 1's turn - allowing Player 1 to interact");
    return true;
  }
  
  if (isPlayer2Character && userId === player2Id) {
    console.log("[DiscordInteractionManager] Player 2's turn - allowing Player 2 to interact");
    return true;
  }
  
  console.log("[DiscordInteractionManager] Not this player's turn");
  return false;
}



// Helper method to check if character belongs to Player 1
// Helper method to check if character belongs to Player 1
private isPlayer1Character(character: any): boolean {
  if (!character) return false;
  
  const player1Id = this.battle.player.id || this.battle.player._id;
  
  console.log(`[DiscordInteractionManager] Checking if ${character.name} belongs to Player 1`);
  
  // Check if it's Player 1 themselves
  if (character.id === player1Id || character._id === player1Id) {
    console.log(`[DiscordInteractionManager] ${character.name} is Player 1 themselves`);
    return true;
  }
  
  // Check if it's Player 1's familiar using BOTH serialId AND name
  const isPlayer1Familiar = this.battle.familiarInfo.some((f: any) => {
    const matches = f.serialId === character.serialId && f.name === character.name;
    console.log(`[DiscordInteractionManager] Checking familiar ${f.name} (${f.serialId}) against ${character.name} (${character.serialId}): ${matches}`);
    return matches;
  });
  
  console.log(`[DiscordInteractionManager] ${character.name} is Player 1's familiar: ${isPlayer1Familiar}`);
  return isPlayer1Familiar;
}

// Helper method to check if character belongs to Player 2
private isPlayer2Character(character: any): boolean {
  if (!character) return false;
  
  const player2Id = this.battle.player2.id || this.battle.player2._id;
  
  console.log(`[DiscordInteractionManager] Checking if ${character.name} belongs to Player 2`);
  
  // Check if it's Player 2 themselves
  if (character.id === player2Id || character._id === player2Id) {
    console.log(`[DiscordInteractionManager] ${character.name} is Player 2 themselves`);
    return true;
  }
  
  // Check if it's Player 2's familiar using BOTH serialId AND name
  const isPlayer2Familiar = this.battle.player2FamiliarInfo.some((f: any) => {
    const matches = f.serialId === character.serialId && f.name === character.name;
    console.log(`[DiscordInteractionManager] Checking familiar ${f.name} (${f.serialId}) against ${character.name} (${character.serialId}): ${matches}`);
    return matches;
  });
  
  console.log(`[DiscordInteractionManager] ${character.name} is Player 2's familiar: ${isPlayer2Familiar}`);
  return isPlayer2Familiar;
}



  private async handleActionNormal(i: any): Promise<void> {
    const state = this.battle.stateManager.getState();
    
    // Additional death check before executing action
    if (state.currentTurn?.stats.hp <= 0) {
      await i.followUp({
        content: `${state.currentTurn.name} is dead and cannot attack!`,
        ephemeral: true,
      });
      return;
    }
    
    // FIXED: Always require target selection for proper targeting
    if (!state.enemyToHit) {
      await i.followUp({
        content: "Please select a target first using the Select Menu",
        ephemeral: true,
      });
      return;
    }

    this.battle.stateManager.updateState({ pickedChoice: true });
    
    await this.battle.turnManager.performPlayerTurn();
    await cycleCooldowns(state.cooldowns);
    await this.battle.turnManager.getNextTurn();
  }

private async handleActionSelect(i: any): Promise<void> {
  const targetIndex = i.values[0];
  
  if (targetIndex === "no_target") {
    await i.followUp({
      content: "No valid targets available!",
      ephemeral: true,
    });
    return;
  }
  
  const realTarget = targetIndex.replace("enemy_", "");
  const targetIndexNumber = parseInt(realTarget, 10);
  
  // FIXED: Use the SAME target list that was used to create the dropdown
  const availableTargets = this.getCurrentTargetList();
  
  console.log(`[DiscordInteractionManager] Available targets: ${availableTargets.map(t => t.name).join(', ')}`);
  console.log(`[DiscordInteractionManager] Selected index: ${targetIndexNumber}`);
  
  // Validate index bounds
  if (targetIndexNumber < 0 || targetIndexNumber >= availableTargets.length) {
    await i.followUp({
      content: `Invalid target index! Available targets: ${availableTargets.length}`,
      ephemeral: true,
    });
    return;
  }
  
  const enemyToHit = availableTargets[targetIndexNumber];
  
  if (!enemyToHit) {
    await i.followUp({
      content: "Invalid target selected!",
      ephemeral: true,
    });
    return;
  }
  
  console.log(`[DiscordInteractionManager] Target selected: ${enemyToHit.name}`);
  
  this.battle.stateManager.updateState({
    enemyToHit,
    pickedChoice: true
  });

  await i.followUp({
    content: `Target selected: ${enemyToHit.name}`,
    ephemeral: true,
  });
}

// Add the same getCurrentTargetList method to DiscordInteractionManager
private getCurrentTargetList(): any[] {
  const state = this.battle.stateManager.getState();
  let availableTargets: any[] = [];
  
  if (this.battle.mode === 'pve') {
    availableTargets = state.aliveEnemies || [];
  } else {
    // For PvP, determine opponents based on whose turn it is
    const currentTurn = state.currentTurn;
    const isPlayer1Turn = this.isPlayer1Character(currentTurn);
    
    if (isPlayer1Turn) {
      // Player 1's team can attack Player 2's team
      availableTargets = [this.battle.player2, ...this.battle.player2FamiliarInfo]
        .filter(target => target && target.stats && target.stats.hp > 0);
    } else {
      // Player 2's team can attack Player 1's team
      availableTargets = [this.battle.player, ...this.battle.familiarInfo]
        .filter(target => target && target.stats && target.stats.hp > 0);
    }
  }
  
  return availableTargets;
}



  private async handleStarterSelection(i: any): Promise<void> {
    const selectedValue = i.values[0];

    if (selectedValue === "no_ability") {
      await i.deferUpdate();
      await i.followUp({
        content: "No abilities available for this character.",
        ephemeral: true,
      });
      return;
    }

    if (selectedValue.startsWith("selection-")) {
      await this.handleModalSelection(i, selectedValue);
    } else if (selectedValue === "cooldowns") {
      await this.handleCooldownsDisplay(i);
    } else if (selectedValue.startsWith("ability-")) {
      await this.handleAbilitySelection(i, selectedValue);
    }
  }

  private async handleModalSelection(i: any, selectedValue: string): Promise<void> {
    const abilityName = selectedValue.replace("selection-", "");
    const ability = abilities[abilityName];

    if (!ability || !ability.selection) {
      console.error("Ability not found or has no selection property");
      await i.deferUpdate();
      await i.followUp({
        content: "Ability not found or invalid.",
        ephemeral: true,
      });
      return;
    }

    const modal = await this.createAbilityModal(ability, abilityName);
    await i.showModal(modal);
    
    await this.handleModalSubmission(i, abilityName, ability);
  }

  private async handleCooldownsDisplay(i: any): Promise<void> {
    await i.deferUpdate();
    const state = this.battle.stateManager.getState();
    
    const filteredCooldowns = state.cooldowns ? state.cooldowns.filter(
      (cooldown: any) => cooldown.cooldown > 0
    ) : [];
    
    if (filteredCooldowns.length === 0) {
      await i.followUp({
        content: "**Cooldowns**\nNo active cooldowns.",
        ephemeral: true,
      });
      return;
    }
    
    const cooldownDescriptions = filteredCooldowns.map(
      (cooldown: any) => `**${cooldown.name}**: ${cooldown.cooldown} turns left`
    );

    await i.followUp({
      content: `**Cooldowns**\n${cooldownDescriptions.join("\n")}`,
      ephemeral: true,
    });
  }

  private async handleAbilitySelection(i: any, selectedValue: string): Promise<void> {
    const state = this.battle.stateManager.getState();
    await i.deferUpdate();
    
    // FIXED: Always require target selection for abilities
    if (!state.enemyToHit) {
      await i.followUp({
        content: "Please select a target first using the Select Menu",
        ephemeral: true,
      });
      return;
    }

    this.battle.stateManager.updateState({ pickedChoice: true });
    
    const abilityName = selectedValue.replace("ability-", "");
    
    await this.battle.ability.executeAbility(
      state.currentTurn,
      state.enemyToHit,
      state.aliveEnemies,
      state.aliveTeam,
      abilityName
    );
    
    await cycleCooldowns(state.cooldowns);
    await this.battle.turnManager.getNextTurn();
  }

  private async createAbilityModal(ability: any, abilityName: string): Promise<ModalBuilder> {
    const state = this.battle.stateManager.getState();
    const selectionType = ability.selection;
    const requiredCount = parseInt(selectionType.replace("modal_", ""), 10);
    
    const teamTargets = state.aliveTeam;
    const enemyTargets = state.aliveEnemies;
    const maxTargets = ability.type.includes("buff") ? teamTargets.length : enemyTargets.length;
    const actualRequiredCount = Math.min(requiredCount, maxTargets);

    const modal = new ModalBuilder()
      .setCustomId(`modal_${abilityName}`)
      .setTitle(`Select ${actualRequiredCount} Target(s)`);

    const textInput = new TextInputBuilder()
      .setCustomId("target_input")
      .setLabel(`Enter exactly ${actualRequiredCount} target(s)`)
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setPlaceholder(`Enter numbers (e.g., 1,2,3). Max: ${actualRequiredCount}`);

    const modalRow = new ActionRowBuilder<TextInputBuilder>().addComponents(textInput);
    modal.addComponents(modalRow);

    return modal;
  }

  private async handleModalSubmission(i: any, abilityName: string, ability: any): Promise<void> {
    const filter = (modalInteraction: ModalSubmitInteraction) =>
      modalInteraction.customId === `modal_${abilityName}` &&
      modalInteraction.user.id === i.user.id;

    try {
      const modalInteraction = await i.awaitModalSubmit({ filter, time: 60000 });
      const input = modalInteraction.fields.getTextInputValue("target_input");
      
      const selectedTargets = this.parseModalInput(input, ability);
      
      if (!selectedTargets) {
        await modalInteraction.reply({
          content: "Invalid input. Please try again.",
          ephemeral: true,
        });
        return;
      }

      await modalInteraction.deferUpdate();
      
      const state = this.battle.stateManager.getState();
      await this.battle.ability.executeAbility(
        state.currentTurn,
        selectedTargets,
        state.aliveEnemies,
        state.aliveTeam,
        abilityName
      );

      await cycleCooldowns(state.cooldowns);
      await this.battle.turnManager.getNextTurn();
    } catch (error) {
      console.error("Modal submission error:", error);
      await i.followUp({
        content: "Time ran out or submission was invalid. Please try again.",
        ephemeral: true,
      });
    }
  }

  private parseModalInput(input: string, ability: any): any[] | null {
    const state = this.battle.stateManager.getState();
    const selectedIndices = input
      .split(",")
      .map((index: any) => parseInt(index.trim(), 10))
      .filter((index: any) => !isNaN(index));

    const selectedTargets = ability.type.includes("buff")
      ? selectedIndices.map((index: number) => state.aliveTeam[index - 1])
      : selectedIndices.map((index: number) => state.aliveEnemies[index - 1]);

    return selectedTargets.some((target: any) => !target) ? null : selectedTargets;
  }

  private async handleDodgeAction(i: any): Promise<void> {
    const dodgeOptions = [
      "dodge_and_increase_attack_bar",
      "dodge",
      "reduce_damage",
      "take_hit",
      "take_1.5x_damage",
    ];
    
    const randomDodge = dodgeOptions[Math.floor(Math.random() * dodgeOptions.length)];
    
    this.battle.stateManager.updateState({
      dodge: { option: randomDodge, id: this.battle.stateManager.getState().currentTurn?._id }
    });

    await this.battle.turnManager.performPlayerTurn();
    await cycleCooldowns(this.battle.stateManager.getState().cooldowns);
    await this.battle.turnManager.getNextTurn();

    await i.followUp({
      content: `Dodge result: ${randomDodge}`,
      ephemeral: true,
    });
  }
}
