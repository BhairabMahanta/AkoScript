import { Command } from "../../@types/command";
import { ExtendedClient } from '../../events/handlers/commandHandler';
import { Message } from 'discord.js';
import { handleArenaButtonClick } from "./components/buttonHandler";
import { createArenaMenuData } from "./arenaUtils";

import { 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle,
  ComponentType
} from 'discord.js';

const arenaCommand: Command = {
  name: "arena",
  description: "Access the PvP Arena system",
  aliases: ["ar"],
  async execute(
    client: ExtendedClient,
    message: Message<boolean>,
    args: string[]
  ): Promise<void> {
    await showArenaMainMenu(client, message);
  }
};

// ✅ Main arena menu function - only for initial creation
export async function showArenaMainMenu(
  client: ExtendedClient,
  messageOrInteraction: Message | any
): Promise<void> {
  try {
    const isInteraction = !!messageOrInteraction.user;
    const playerId = isInteraction ? messageOrInteraction.user.id : messageOrInteraction.author.id;
    
    console.log(`showArenaMainMenu called - isInteraction: ${isInteraction}`);
    
    const arenaMenuData = await createArenaMenuData(playerId);
    let response;
    
    if (isInteraction) {
      if (messageOrInteraction.deferred || messageOrInteraction.replied) {
        response = await messageOrInteraction.editReply(arenaMenuData);
      } else {
        response = await messageOrInteraction.reply(arenaMenuData);
      }
    } else {
      response = await messageOrInteraction.reply(arenaMenuData);
    }

    // ✅ Always setup collector for initial menu
    await setupArenaCollector(response, playerId, client);

  } catch (error) {
    console.error('Arena menu error:', error);
    
    const errorEmbed = new EmbedBuilder()
      .setTitle('⚠️ **Arena System Error**')
      .setDescription('Failed to load arena menu. Please try again.')
      .setColor('#FF0000')
      .setTimestamp();

    const isInteraction = !!messageOrInteraction.user;
    
    try {
      if (isInteraction) {
        try {
          await messageOrInteraction.editReply({ embeds: [errorEmbed], components: [] });
        } catch (editError) {
          await messageOrInteraction.followUp({ embeds: [errorEmbed], components: [], ephemeral: true });
        }
      } else {
        await messageOrInteraction.reply({ embeds: [errorEmbed] });
      }
    } catch (responseError) {
      console.error('Failed to send error response:', responseError);
    }
  }
}

// ✅ NEW: Simple helper function to return to arena menu (NO new collectors)
export async function returnToArenaMenu(interaction: any): Promise<void> {
  try {
    console.log('Returning to arena menu via helper function');
    
    const playerId = interaction.user.id;
    const arenaMenuData = await createArenaMenuData(playerId);
    
    // ✅ Simply update the message content - that's it!
    await interaction.editReply(arenaMenuData);
    
  } catch (error) {
    console.error('Error returning to arena menu:', error);
    
    const errorEmbed = new EmbedBuilder()
      .setTitle('⚠️ **Arena System Error**')
      .setDescription('Failed to load arena menu. Please try again.')
      .setColor('#FF0000')
      .setTimestamp();
    
    try {
      await interaction.editReply({ embeds: [errorEmbed], components: [] });
    } catch (editError) {
      await interaction.followUp({ embeds: [errorEmbed], components: [], ephemeral: true });
    }
  }
}

// ✅ Collector setup function (unchanged)
async function setupArenaCollector(response: any, playerId: string, client: ExtendedClient) {
  if (response.collector) {
    response.collector.stop('new_collector');
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  const collector = response.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 600000
  });

  response.collector = collector;
  const processingInteractions = new Set();

  collector.on('collect', async (interaction: any) => {
    const interactionKey = `${interaction.id}_${interaction.customId}`;
    if (processingInteractions.has(interactionKey)) {
      console.log(`Duplicate interaction blocked: ${interaction.customId}`);
      return;
    }
    processingInteractions.add(interactionKey);

    setTimeout(() => {
      processingInteractions.delete(interactionKey);
    }, 5000);

    if (interaction.user.id !== playerId) {
      await interaction.reply({ 
        content: '❌ **Access Denied!** This arena interface belongs to someone else.',
        ephemeral: true 
      });
      processingInteractions.delete(interactionKey);
      return;
    }

    try {
      console.log(`Collector handling interaction: ${interaction.customId}`);
      
      if (!interaction.deferred && !interaction.replied) {
        try {
          await interaction.deferUpdate();
          console.log(`✅ Acknowledged interaction: ${interaction.customId}`);
        } catch (ackError) {
          console.error(`Failed to acknowledge ${interaction.customId}:`, ackError);
          processingInteractions.delete(interactionKey);
          return;
        }
      }

      await handleArenaButtonClick(interaction, client);

    } catch (error) {
      console.error('Error in arena collector:', error);
      
      try {
        if (interaction.deferred) {
          await interaction.followUp({
            content: '❌ An error occurred while processing your request.',
            ephemeral: true
          });
        }
      } catch (responseError) {
        console.error('Cannot send error response:', responseError);
      }
    } finally {
      processingInteractions.delete(interactionKey);
    }
  });

  collector.on('end', async (collected: any, reason: any) => {
    console.log(`Arena collector ended: ${reason}`);
    processingInteractions.clear();
    
    try {
      const disabledEmbed = new EmbedBuilder()
        .setTitle('⚔️ **ARENA BATTLEFIELD** ⚔️')
        .setDescription('**Session Expired**')
        .setColor('#666666')
        .setFooter({ text: '⏰ Arena interface expired - Use !arena to open a new session' });

      const disabledRow = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('expired')
            .setLabel('Session Expired')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true)
        );

      await response.edit({ 
        embeds: [disabledEmbed],
        components: [disabledRow] 
      });
    } catch (error) {
      console.log('Could not update expired message (normal behavior)');
    }
  });
}

export default arenaCommand;
