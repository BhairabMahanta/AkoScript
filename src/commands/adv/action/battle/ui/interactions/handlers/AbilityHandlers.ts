// ui/interactions/handlers/AbilityHandlers.ts
import { cycleCooldowns } from '../../../../../../util/glogic';
import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ModalSubmitInteraction } from "discord.js";
import abilities from "../../../../../../../data/abilities";
import { TargetManager } from "../../managers/TargetManager";
import { CharacterIdentifier } from "../../managers/CharacterIdentifier";

export class AbilityHandlers {
  private battle: any;
  private targetManager: TargetManager;
  private characterIdentifier: CharacterIdentifier;

  constructor(battle: any) {
    this.battle = battle;
    this.targetManager = new TargetManager(battle);
    this.characterIdentifier = new CharacterIdentifier(battle);
  }

  async handleNoAbility(i: any): Promise<void> {
    await i.deferUpdate();
    await i.followUp({
      content: "No abilities available for this character.",
      ephemeral: true,
    });
  }

  async handleAbilitySelection(i: any, selectedValue: string): Promise<void> {
    const state = this.battle.stateManager.getState();
    const currentPlayerId = this.characterIdentifier.getCurrentPlayerIdFromUserId(i.user.id);
    await i.deferUpdate();
    
    const target = await this.getOrSetTarget(i, currentPlayerId);
    if (!target) return;

    this.battle.stateManager.updateState({
      enemyToHit: target,
      pickedChoice: true
    });
    
    const abilityName = selectedValue.replace("ability-", "");
    
    await this.battle.ability.executeAbility(
      state.currentTurn,
      target,
      state.aliveEnemies,
      state.aliveTeam,
      abilityName
    );
    
    await cycleCooldowns(state.cooldowns);
    await this.battle.turnManager.completeTurnAndContinue();
  }

  async handleModalSelection(i: any, selectedValue: string): Promise<void> {
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

    const modal = this.createAbilityModal(ability, abilityName);
    await i.showModal(modal);
    
    await this.handleModalSubmission(i, abilityName, ability);
  }

  private async getOrSetTarget(i: any, currentPlayerId: string): Promise<any> {
    let target = this.battle.stateManager.getPlayerTarget(currentPlayerId);
    
    if (!target) {
      const availableTargets = this.targetManager.getCurrentTargetList();
      
      if (availableTargets.length === 0) {
        await i.followUp({
          content: "No valid targets available!",
          ephemeral: true,
        });
        return null;
      }
      
      if (availableTargets.length === 1) {
        target = availableTargets[0];
        this.battle.stateManager.setPlayerTarget(currentPlayerId, target, true);
      } else {
        await i.followUp({
          content: "Please select a target first using the dropdown menu.",
          ephemeral: true,
        });
        return null;
      }
    }
    
    return target;
  }

  private createAbilityModal(ability: any, abilityName: string): ModalBuilder {
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
      await this.battle.turnManager.completeTurnAndContinue();
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
}
