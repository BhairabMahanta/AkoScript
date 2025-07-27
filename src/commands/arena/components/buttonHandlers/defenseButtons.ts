import { ExtendedClient } from "../../../..";
import { PlayerModal } from "../../../../data/mongo/playerschema";
import { DeckManager } from '../../../player/selection/deckUtils';
import { showDefenseMenu } from "../defenseMenu";

// Global state for defense operations
export const defenseStates = new Map();

export async function handleConfigureDefense(interaction: any, client: ExtendedClient): Promise<void> {
  const playerId = interaction.user.id;
  
  try {
    const deckManager = new DeckManager(playerId, 'arena');
    const success = await deckManager.loadDeck();
    
    if (!success) {
      await interaction.followUp({
        content: '❌ Failed to load defense deck data. Please try again.',
        ephemeral: true
      });
      return;
    }

    // Store deck manager in state
    defenseStates.set(playerId, { deckManager, currentView: 'configure' });

    const embed = deckManager.createDeckEmbed();
    const components = deckManager.createComponents();
    await interaction.editReply({ embeds: [embed], components });
  } catch (error) {
    console.error('Error in handleConfigureDefense:', error);
    await interaction.followUp({
      content: '❌ Failed to configure defense. Please try again.',
      ephemeral: true
    });
  }
}

export async function handleAutoDefense(interaction: any, client: ExtendedClient): Promise<void> {
  const playerId = interaction.user.id;
  
  try {
    const deckManager = new DeckManager(playerId, 'arena');
    await deckManager.loadDeck();
    
    const autoFillSuccess = await deckManager.autoFillDeck();
    
    if (autoFillSuccess) {
      const saveSuccess = await deckManager.saveDeck();
      
      if (saveSuccess) {
        await interaction.followUp({
          content: '✅ **Auto-defense setup complete!** Your defense team has been automatically configured and saved.',
          ephemeral: true
        });
        
        await showDefenseMenu(interaction, client);
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
  } catch (error) {
    console.error('Error in handleAutoDefense:', error);
    await interaction.followUp({
      content: '❌ Failed to auto-setup defense. Please try again.',
      ephemeral: true
    });
  }
}

export async function handleClearDefense(interaction: any, client: ExtendedClient): Promise<void> {
  const playerId = interaction.user.id;
  
  try {
    await PlayerModal.findByIdAndUpdate(playerId, {
      $set: { 'arena.defenseDeck': [] }
    });

    await interaction.followUp({
      content: '🗑️ **Defense team cleared!** Your base is now vulnerable.',
      ephemeral: true
    });

    await showDefenseMenu(interaction, client);
  } catch (error) {
    console.error('Error in handleClearDefense:', error);
    await interaction.followUp({
      content: '❌ Failed to clear defense team. Please try again.',
      ephemeral: true
    });
  }
}
