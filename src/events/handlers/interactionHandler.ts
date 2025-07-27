// events/handlers/interactionHandler.ts - COMPREHENSIVE TRACKING
import { CommandInteraction, Interaction } from "discord.js";
import { mongoClient } from "../../data/mongo/mongo";
import { ExtendedClient } from "../..";

const db = mongoClient.db("Akaimnky");
const collection = db.collection("akaillection");

interface Command {
  execute: (interaction: CommandInteraction) => Promise<void>;
}

const interactionHandler = async (interaction: Interaction) => {
  const client = interaction.client as ExtendedClient;
  const startTime = Date.now();

  // Track ALL interactions
  console.log(`[InteractionHandler] ${getInteractionType(interaction)} - ${getInteractionIdentifier(interaction)} from ${interaction.user.username}`);

  // Handle SLASH COMMANDS
  if (interaction.isCommand()) {
    const command = client.commands.get(interaction.commandName) as Command | undefined;
    if (!command) return;

    try {
      // Registration check (except for register command)
      if (interaction.commandName !== "register") {
        const user = await collection.findOne({ discordId: interaction.user.id });
        if (!user) {
          await interaction.reply({
            content: "Please run the `register` command to get started.",
            ephemeral: true,
          });
          return;
        }
      }

      await command.execute(interaction as CommandInteraction);
      
      // Log successful slash command
      const executionTime = Date.now() - startTime;
      await logInteraction('slash_command', interaction.commandName, interaction.user.id, executionTime, true, interaction.guildId);
      
    } catch (error) {
      console.error("Error executing command:", error);
      
      const executionTime = Date.now() - startTime;
      await logInteraction('slash_command', interaction.commandName, interaction.user.id, executionTime, false, interaction.guildId);
      
      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({
            content: "There was an error executing that command!",
            ephemeral: true,
          });
        } else {
          await interaction.reply({
            content: "There was an error executing that command!",
            ephemeral: true,
          });
        }
      } catch (replyError) {
        console.error("Failed to send error message:", replyError);
      }
    }
  }
  
  // Handle BUTTON CLICKS (battle actions)
  else if (interaction.isButton()) {
    const executionTime = Date.now() - startTime;
    await logInteraction('button', interaction.customId, interaction.user.id, executionTime, true, interaction.guildId);
    
    // Special tracking for battle buttons
    if (isBattleButton(interaction.customId)) {
      await logBattleInteraction('button_click', interaction.customId, interaction.user.id, executionTime);
    }
    
    console.log(`[InteractionHandler] Button click: ${interaction.customId} - Handled by battle system`);
  }
  
  // Handle SELECT MENU selections
  else if (interaction.isStringSelectMenu()) {
    const executionTime = Date.now() - startTime;
    await logInteraction('select_menu', interaction.customId, interaction.user.id, executionTime, true, interaction.guildId);
    
    // Special tracking for battle selects
    if (isBattleSelect(interaction.customId)) {
      await logBattleInteraction('select_menu', interaction.customId, interaction.user.id, executionTime, interaction.values[0]);
    }
    
    console.log(`[InteractionHandler] Select menu: ${interaction.customId} with values: ${interaction.values.join(', ')}`);
  }
  
  // Handle MODAL submissions
  else if (interaction.isModalSubmit()) {
    const executionTime = Date.now() - startTime;
    await logInteraction('modal', interaction.customId, interaction.user.id, executionTime, true, interaction.guildId);
    
    // Special tracking for battle modals
    if (isBattleModal(interaction.customId)) {
      await logBattleInteraction('modal_submit', interaction.customId, interaction.user.id, executionTime);
    }
    
    console.log(`[InteractionHandler] Modal submit: ${interaction.customId}`);
  }
  
  // Handle OTHER interaction types
  else {
    console.log(`[InteractionHandler] Unhandled interaction type: ${interaction.type}`);
    const executionTime = Date.now() - startTime;
    await logInteraction('other', 'unknown', interaction.user.id, executionTime, true, interaction.guildId);
  }
};

// Helper functions
function getInteractionType(interaction: Interaction): string {
  if (interaction.isCommand()) return 'SLASH_COMMAND';
  if (interaction.isButton()) return 'BUTTON';
  if (interaction.isStringSelectMenu()) return 'SELECT_MENU';
  if (interaction.isModalSubmit()) return 'MODAL';
  return 'OTHER';
}

function getInteractionIdentifier(interaction: Interaction): string {
  if (interaction.isCommand()) return interaction.commandName;
  if ('customId' in interaction) return interaction.customId;
  return 'unknown';
}

function isBattleButton(customId: string): boolean {
  return customId.startsWith('action_') || ['starter'].includes(customId);
}

function isBattleSelect(customId: string): boolean {
  return customId === 'starter' || customId === 'action_select';
}

function isBattleModal(customId: string): boolean {
  return customId.startsWith('modal_');
}

// Log all interactions
async function logInteraction(
  type: string,
  identifier: string,
  userId: string,
  executionTime: number,
  success: boolean,
  guildId?: string | null
): Promise<void> {
  try {
    await db.collection('interaction_analytics').insertOne({
      type,
      identifier,
      userId,
      guildId,
      executionTime,
      success,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Failed to log interaction:', error);
  }
}

// Log battle-specific interactions
async function logBattleInteraction(
  actionType: string,
  identifier: string,
  userId: string,
  executionTime: number,
  extraData?: string
): Promise<void> {
  try {
    await db.collection('battle_interactions').insertOne({
      actionType,
      identifier,
      userId,
      executionTime,
      extraData,
      timestamp: new Date()
    });
    
    console.log(`🎮 Battle Action: ${actionType} - ${identifier} by ${userId} (${executionTime}ms)`);
  } catch (error) {
    console.error('Failed to log battle interaction:', error);
  }
}

export default interactionHandler;
