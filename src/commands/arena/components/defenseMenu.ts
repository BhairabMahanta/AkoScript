import { ComponentType } from "discord.js";
import { ExtendedClient } from "../../..";
import { PlayerModal } from "../../../data/mongo/playerschema";
import { DefenseMenuState } from "./defenseComponents/defenseTypes";
import { DefenseMenuBuilder } from "./defenseComponents/defenseMenuBuilder";
import { DefenseHandlers } from "./defenseComponents/defenseHandlers";
import { DefenseModalHandlers } from "./defenseComponents/defenseModals";

export async function showDefenseMenu(interaction: any, client: ExtendedClient): Promise<void> {
  try {
    const playerId = interaction.user.id;
    const playerData = await PlayerModal.findById(playerId);
    
    if (!playerData) {
      const method = interaction.deferred || interaction.replied ? 'editReply' : 'reply';
      await interaction[method]({ 
        content: '❌ Player data not found!', 
        embeds: [], 
        components: [] 
      });
      return;
    }

    const state: DefenseMenuState = {
      currentView: 'main'
    };

    // ✅ CRITICAL FIX: Determine the correct method based on interaction state
    const mainMenu = await DefenseMenuBuilder.createDefenseMainMenu(playerId);
    
    let response;
    if (interaction.deferred) {
      response = await interaction.editReply(mainMenu);
    } else if (interaction.replied) {
      response = await interaction.editReply(mainMenu);
    } else {
      // This is a fresh interaction, we need to reply first
      response = await interaction.reply({
        ...mainMenu,
        ephemeral: false
      });
    }

    // Set up collectors
    const collector = response.createMessageComponentCollector({
      time: 300000 // 5 minutes
    });

    // Modal handler
    const modalHandler = async (modalInteraction: any) => {
      if (!modalInteraction.isModalSubmit() || modalInteraction.user.id !== playerId) return;

      try {
        if (modalInteraction.customId === 'deck_modal_fast_select') {
          await DefenseModalHandlers.handleFastInput(modalInteraction, state);
        } else if (modalInteraction.customId.startsWith('deck_modal_')) {
          await DefenseModalHandlers.handleSlotInput(modalInteraction, state);
        }
      } catch (error) {
        console.error('Error handling defense modal submission:', error);
      }
    };

    client.on('interactionCreate', modalHandler);

    collector.on('collect', async (componentInteraction: any) => {
      if (componentInteraction.user.id !== playerId) {
        await componentInteraction.reply({ 
          content: '❌ This defense menu belongs to someone else!',
          ephemeral: true 
        });
        return;
      }

      try {
        // ✅ FIXED: Handle back button with proper acknowledgment
        if (componentInteraction.customId === 'arena_back') {

          collector.stop();
          client.off('interactionCreate', modalHandler);
          return;
        }

        // ✅ FIXED: Only defer if not already handled
        if (!componentInteraction.deferred && !componentInteraction.replied) {
          await componentInteraction.deferUpdate();
        }

        // Route to appropriate handlers
        if (componentInteraction.isButton()) {
          await DefenseHandlers.handleButtons(componentInteraction, state, playerId, client);
        } else if (componentInteraction.isStringSelectMenu()) {
          await DefenseHandlers.handleSelectMenu(componentInteraction, state);
        }
      } catch (error) {
        console.error('Error handling defense interaction:', error);
        
        // ✅ IMPROVED: Better error handling
        try {
          if (!componentInteraction.replied && !componentInteraction.deferred) {
            await componentInteraction.reply({
              content: '❌ An error occurred while processing your request.',
              ephemeral: true
            });
          } else if (componentInteraction.deferred) {
            await componentInteraction.followUp({
              content: '❌ An error occurred while processing your request.',
              ephemeral: true
            });
          }
        } catch (e) {
          console.error('Failed to send error message:', e);
        }
      }
    });

    collector.on('end', () => {
      client.off('interactionCreate', modalHandler);
    });

  } catch (error) {
    console.error('Error in showDefenseMenu:', error);
    try {
      // ✅ IMPROVED: Better error response handling
      if (interaction.deferred) {
        await interaction.editReply({ 
          content: '❌ Failed to load defense menu.', 
          embeds: [], 
          components: [] 
        });
      } else if (!interaction.replied) {
        await interaction.reply({ 
          content: '❌ Failed to load defense menu.', 
          embeds: [], 
          components: [],
          ephemeral: true
        });
      }
    } catch (e) {
      console.error('Failed to send error message:', e);
    }
  }
}
