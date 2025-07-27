import { ExtendedClient } from "../../../..";
import { createSlotModal } from '../../../player/selection/deckUtils';
import { showDefenseMenu } from "../defenseMenu";
import { defenseStates } from "./defenseButtons";

export async function handleSaveDeck(interaction: any, client: ExtendedClient): Promise<void> {
  const playerId = interaction.user.id;
  const state = defenseStates.get(playerId);
  
  if (!state?.deckManager) {
    await interaction.followUp({
      content: '❌ No deck manager found. Please try configuring defense again.',
      ephemeral: true
    });
    return;
  }
  
  try {
    const success = await state.deckManager.saveDeck();
    
    if (success) {
      await interaction.followUp({
        content: '✅ **Defense team saved successfully!** Your base is now protected.',
        ephemeral: true
      });
      
      defenseStates.delete(playerId);
      await showDefenseMenu(interaction, client);
    } else {
      await interaction.followUp({
        content: '❌ Failed to save defense team. Please try again.',
        ephemeral: true
      });
    }
  } catch (error) {
    console.error('Error in handleSaveDeck:', error);
    await interaction.followUp({
      content: '❌ Failed to save deck. Please try again.',
      ephemeral: true
    });
  }
}

export async function handleResetDeck(interaction: any, client: ExtendedClient): Promise<void> {
  const playerId = interaction.user.id;
  const state = defenseStates.get(playerId);
  
  if (!state?.deckManager) {
    await interaction.followUp({
      content: '❌ No deck manager found. Please try configuring defense again.',
      ephemeral: true
    });
    return;
  }
  
  try {
    state.deckManager.resetDeck();
    const embed = state.deckManager.createDeckEmbed();
    const components = state.deckManager.createComponents();
    
    await interaction.editReply({ embeds: [embed], components });
  } catch (error) {
    console.error('Error in handleResetDeck:', error);
    await interaction.followUp({
      content: '❌ Failed to reset deck. Please try again.',
      ephemeral: true
    });
  }
}

export async function handleAutoFillDeck(interaction: any, client: ExtendedClient): Promise<void> {
  const playerId = interaction.user.id;
  const state = defenseStates.get(playerId);
  
  if (!state?.deckManager) {
    await interaction.followUp({
      content: '❌ No deck manager found. Please try configuring defense again.',
      ephemeral: true
    });
    return;
  }
  
  try {
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
  } catch (error) {
    console.error('Error in handleAutoFillDeck:', error);
    await interaction.followUp({
      content: '❌ Failed to auto-fill deck. Please try again.',
      ephemeral: true
    });
  }
}

export async function handleDeckSlot(interaction: any, client: ExtendedClient): Promise<void> {
  const playerId = interaction.user.id;
  const state = defenseStates.get(playerId);
  
  if (!state?.deckManager) {
    await interaction.followUp({
      content: '❌ No deck manager found. Please try configuring defense again.',
      ephemeral: true
    });
    return;
  }
  
  try {
    const slotNumber = parseInt(interaction.customId.replace('deck_slot', ''), 10);
    const config = state.deckManager.getConfig();
    const modal = createSlotModal(slotNumber, config.name);
    
    await interaction.showModal(modal);
  } catch (error) {
    console.error('Error in handleDeckSlot:', error);
    await interaction.followUp({
      content: '❌ Failed to open slot modal. Please try again.',
      ephemeral: true
    });
  }
}
