import { ButtonInteraction, StringSelectMenuInteraction } from "discord.js";
import { ExtendedClient } from "../../../..";
import { PlayerModal } from "../../../../data/mongo/playerschema";
import { DeckManager, createSlotModal, createFastInputModal } from '../../../player/selection/deckUtils';
import { DefenseMenuState } from "./defenseTypes";
import { DefenseMenuBuilder } from "./defenseMenuBuilder";
import { handleTestDefense } from "./defenseTest";

export class DefenseHandlers {
  static async handleButtons(
    interaction: ButtonInteraction,
    state: DefenseMenuState,
    playerId: string,
    client: ExtendedClient
  ): Promise<void> {
    switch (interaction.customId) {
      case 'arena_configure_defense':
        await this.initializeDeckManager(interaction, state, playerId);
        break;
      case 'arena_auto_defense':
        await this.handleAutoSetup(interaction, state, playerId);
        break;
      case 'arena_test_defense':
        await handleTestDefense(interaction, client);
        break;
      case 'arena_clear_defense':
        await this.handleClearDefense(interaction, state, playerId);
        break;
      case 'deck_save':
        await this.saveDeck(interaction, state, playerId);
        break;
      case 'deck_reset':
      case 'deck_clear':
        await this.resetDeck(interaction, state);
        break;
      case 'deck_auto':
        await this.autoFillDeck(interaction, state);
        break;
      case 'deck_back':
        state.currentView = 'main';
        const mainMenu = await DefenseMenuBuilder.createDefenseMainMenu(playerId);
        await interaction.editReply(mainMenu);
        break;
      default:
        if (interaction.customId.startsWith('deck_slot')) {
          await this.handleSlot(interaction, state);
        }
    }
  }

  static async handleSelectMenu(
    interaction: StringSelectMenuInteraction,
    state: DefenseMenuState
  ): Promise<void> {
    if (!state.deckManager) return;
    
    const value = interaction.values[0];
    
    switch (value) {
      case 'select_deck_fast':
        const config = state.deckManager.getConfig();
        const modal = createFastInputModal(config.name, config.maxSlots);
        await interaction.showModal(modal);
        break;
      
      case 'auto_select':
        const autoSuccess = await state.deckManager.autoFillDeck();
        if (autoSuccess) {
          const embed = state.deckManager.createDeckEmbed();
          const components = state.deckManager.createComponents();
          await interaction.editReply({ embeds: [embed], components });
        } else {
          await interaction.followUp({
            content: '❌ Failed to auto-fill defense team.',
            ephemeral: true
          });
        }
        break;
      
      case 'copy_battle':
        const result = await state.deckManager.copyFromBattleDeck();
        if (result.success) {
          const embed = state.deckManager.createDeckEmbed();
          const components = state.deckManager.createComponents();
          await interaction.editReply({ embeds: [embed], components });
        } else {
          await interaction.followUp({
            content: `❌ ${result.error}`,
            ephemeral: true
          });
        }
        break;
    }
  }

  private static async initializeDeckManager(
    interaction: ButtonInteraction,
    state: DefenseMenuState,
    playerId: string
  ): Promise<void> {
    state.currentView = 'configure';
    state.deckManager = new DeckManager(playerId, 'arena');
    
    const success = await state.deckManager.loadDeck();
    if (!success) {
      await interaction.followUp({
        content: '❌ Failed to load defense deck data. Please try again.',
        ephemeral: true
      });
      return;
    }

    const embed = state.deckManager.createDeckEmbed();
    const components = state.deckManager.createComponents();
    await interaction.editReply({ embeds: [embed], components });
  }

  private static async handleAutoSetup(
    interaction: ButtonInteraction,
    state: DefenseMenuState,
    playerId: string
  ): Promise<void> {
    state.deckManager = new DeckManager(playerId, 'arena');
    await state.deckManager.loadDeck();
    
    const autoFillSuccess = await state.deckManager.autoFillDeck();
    
    if (autoFillSuccess) {
      const saveSuccess = await state.deckManager.saveDeck();
      
      if (saveSuccess) {
        await interaction.followUp({
          content: '✅ **Auto-defense setup complete!** Your defense team has been automatically configured and saved.',
          ephemeral: true
        });
        
        state.currentView = 'main';
        const mainMenu = await DefenseMenuBuilder.createDefenseMainMenu(playerId);
        await interaction.editReply(mainMenu);
      } else {
        await interaction.followUp({
          content: '❌ Failed to save auto-generated defense team.',
          ephemeral: true
        });
      }
    } else {
      await interaction.followUp({
        content: '❌ Failed to auto-generate defense team. Make sure you have familiars available.',
        ephemeral: true
      });
    }
  }

  private static async handleClearDefense(
    interaction: ButtonInteraction,
    state: DefenseMenuState,
    playerId: string
  ): Promise<void> {
    await PlayerModal.findByIdAndUpdate(playerId, {
      $set: { 'arena.defenseDeck': [] }
    });

    await interaction.followUp({
      content: '🗑️ **Defense team cleared!** Your base is now vulnerable.',
      ephemeral: true
    });

    state.currentView = 'main';
    const mainMenu = await DefenseMenuBuilder.createDefenseMainMenu(playerId);
    await interaction.editReply(mainMenu);
  }

  private static async saveDeck(
    interaction: ButtonInteraction,
    state: DefenseMenuState,
    playerId: string
  ): Promise<void> {
    if (!state.deckManager) return;
    
    const success = await state.deckManager.saveDeck();
    
    if (success) {
      await interaction.followUp({
        content: '✅ **Defense team saved successfully!** Your base is now protected.',
        ephemeral: true
      });
      
      state.currentView = 'main';
      const mainMenu = await DefenseMenuBuilder.createDefenseMainMenu(playerId);
      await interaction.editReply(mainMenu);
    } else {
      await interaction.followUp({
        content: '❌ Failed to save defense team. Please try again.',
        ephemeral: true
      });
    }
  }

  private static async resetDeck(
    interaction: ButtonInteraction,
    state: DefenseMenuState
  ): Promise<void> {
    if (!state.deckManager) return;
    
    state.deckManager.resetDeck();
    const embed = state.deckManager.createDeckEmbed();
    const components = state.deckManager.createComponents();
    
    await interaction.editReply({ embeds: [embed], components });
  }

  private static async autoFillDeck(
    interaction: ButtonInteraction,
    state: DefenseMenuState
  ): Promise<void> {
    if (!state.deckManager) return;
    
    const success = await state.deckManager.autoFillDeck();
    
    if (success) {
      const embed = state.deckManager.createDeckEmbed();
      const components = state.deckManager.createComponents();
      await interaction.editReply({ embeds: [embed], components });
    } else {
      await interaction.followUp({
        content: '❌ Failed to auto-fill defense team. Make sure you have familiars in your collection.',
        ephemeral: true
      });
    }
  }

  private static async handleSlot(
    interaction: ButtonInteraction,
    state: DefenseMenuState
  ): Promise<void> {
    if (!state.deckManager) return;
    
    const slotNumber = parseInt(interaction.customId.replace('deck_slot', ''), 10);
    const config = state.deckManager.getConfig();
    const modal = createSlotModal(slotNumber, config.name);
    
    await interaction.showModal(modal);
  }
}
