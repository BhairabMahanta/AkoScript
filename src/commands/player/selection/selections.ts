import {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  EmbedBuilder,
  Message,
  Interaction,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { PlayerModal } from "../../../data/mongo/playerschema";
import { Command } from "../../../@types/command";
import { ExtendedClient } from "../../../index";
import { SelectionManager } from "./selectionUtils";
import { DeckManager, createSlotModal, createFastInputModal } from "./deckUtils";

interface SelectAllState {
  currentView: 'main' | 'race' | 'class' | 'deck';
  selectionManager: SelectionManager;
  deckManager?: DeckManager;
  messageCollector?: any;
}

const selectAllCommand: Command = {
  name: "selectAll",
  description: "Select your race, class, and configure your battle decks!",
  aliases: ["sa", "selectall", "config", "configure"],
  async execute(
    client: ExtendedClient,
    message: Message<boolean>,
    args: string[]
  ): Promise<void> {
    try {
      // Check if player exists
      const playerData = await PlayerModal.findById(message.author.id);
      if (!playerData) {
        await message.reply("❌ You don't have a player account. Use `!register` to create one.");
        return;
      }

      const state: SelectAllState = {
        currentView: 'main',
        selectionManager: new SelectionManager(message.author.id)
      };

      // Helper function to get familiar names safely from deck
      const getFamiliarNamesFromDeck = (deck: any[] | undefined) => {
        if (!deck || !Array.isArray(deck)) return [];
        
        return deck
          .filter(item => item && item.name && item.name !== "empty" && item.serialId !== "player")
          .map(item => item.name)
          .slice(0, 3); // Limit to 3 for display
      };

      // Create main menu
      const createMainMenu = async () => {
        // Refresh player data to get latest info
        const currentPlayerData = await PlayerModal.findById(message.author.id);
        if (!currentPlayerData) {
          throw new Error("Player data not found");
        }
        
        // Helper function to count deck slots safely
        const countDeckSlots = (deck: any[] | undefined) => {
          if (!deck || !Array.isArray(deck)) return 0;
          return deck.filter(item => item && item.name && item.name !== 'empty').length;
        };

        // Get current familiar names from battle deck
        const battleDeckFamiliars = getFamiliarNamesFromDeck(currentPlayerData.deck);
        const familiarText = battleDeckFamiliars.length > 0 
          ? battleDeckFamiliars.join(', ') 
          : 'None selected';

        const embed = new EmbedBuilder()
          .setTitle("🎮 Character & Deck Configuration")
          .setDescription("Configure your character's race, class, and battle decks for different game modes.")
          .setColor('#7289DA')
          .addFields([
            {
              name: "👤 Character Setup",
              value: [
                `**Race:** ${currentPlayerData.race || 'Not Selected'}`,
                `**Class:** ${currentPlayerData.class || 'Not Selected'}`
              ].join('\n'),
              inline: true
            },
            {
              name: "🎴 Deck Status",
              value: [
                `**Battle:** ${countDeckSlots(currentPlayerData.deck)}/4 slots`,
                `**Arena:** ${countDeckSlots(currentPlayerData.arena?.defenseDeck)}/4 slots`,
                `**Dungeon:** ${countDeckSlots(currentPlayerData.dungeonDeck)}/6 slots`
              ].join('\n'),
              inline: true
            },
            {
              name: "🦋 Current Battle Familiars",
              value: familiarText,
              inline: false
            }
          ])
          .setFooter({ text: "Select an option below to configure • Session expires in 5 minutes" });

        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId("main_select")
          .setPlaceholder("🎯 Choose what to configure")
          .addOptions([
            { 
              label: "🏰 Race Selection", 
              value: "select_race", 
              description: "Choose your character's race and base stats",
              emoji: "🏰"
            },
            { 
              label: "⚔️ Class Selection", 
              value: "select_class", 
              description: "Choose your character's class and abilities",
              emoji: "⚔️"
            },
            { 
              label: "🎴 Battle Deck", 
              value: "select_battle_deck", 
              description: "Configure your main 4-slot combat deck",
              emoji: "🎴"
            },
            { 
              label: "🛡️ Arena Deck", 
              value: "select_arena_deck", 
              description: "Configure your 4-slot PvP defense deck",
              emoji: "🛡️"
            },
            { 
              label: "🏰 Dungeon Deck", 
              value: "select_dungeon_deck", 
              description: "Configure your 6-slot dungeon exploration deck",
              emoji: "🏰"
            }
          ]);

        return {
          embeds: [embed],
          components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu)]
        };
      };

      // Send initial message
      const sentMessage = await message.reply(await createMainMenu());

      // Create interaction collector
      const collector = sentMessage.createMessageComponentCollector({
        filter: (i: Interaction) => i.user.id === message.author.id,
        time: 300000 // 5 minutes
      });

      state.messageCollector = collector;

      // Handle interactions
      collector.on('collect', async (interaction) => {
        try {
          if (interaction.isStringSelectMenu()) {
            await handleSelectMenuInteraction(interaction, state, sentMessage);
          } else if (interaction.isButton()) {
            await handleButtonInteraction(interaction, state, sentMessage);
          }
        } catch (error) {
          console.error('Error handling interaction:', error);
          
          const errorMessage = '❌ An error occurred while processing your selection. Please try again.';
          
          if (interaction.deferred) {
            await interaction.followUp({ content: errorMessage, ephemeral: true });
          } else if (interaction.replied) {
            await interaction.followUp({ content: errorMessage, ephemeral: true });
          } else {
            try {
              await interaction.reply({ content: errorMessage, ephemeral: true });
            } catch (replyError) {
              console.error('Could not reply to interaction:', replyError);
            }
          }
        }
      });

      // Handle modal submissions separately using client event
      const modalHandler = async (interaction: any) => {
        if (!interaction.isModalSubmit() || interaction.user.id !== message.author.id) return;

        try {
          if (interaction.customId === 'deck_modal_fast_select') {
            await handleFastDeckInput(interaction, state, sentMessage);
          } else if (interaction.customId.startsWith('deck_modal_')) {
            await handleSlotInput(interaction, state, sentMessage);
          }
        } catch (error) {
          console.error('Error handling modal submission:', error);
          await interaction.reply({
            content: '❌ An error occurred while processing your input.',
            ephemeral: true
          });
        }
      };

      client.on('interactionCreate', modalHandler);

      // Handle collector end
      collector.on('end', async () => {
        // Remove modal handler
        client.off('interactionCreate', modalHandler);
        
        try {
          const timeoutEmbed = new EmbedBuilder()
            .setTitle("⏰ Configuration Session Expired")
            .setDescription("Your configuration session has timed out. Use `!selectall` to start a new session.")
            .setColor('#FFA500');

          await sentMessage.edit({
            embeds: [timeoutEmbed],
            components: []
          });
        } catch (error) {
          console.log('Could not update message after collector end');
        }
      });

      // All the helper functions remain the same but with proper error handling...
      // [Rest of the helper functions from the previous version remain the same]
      // I'll include them but they're unchanged except for the array safety checks

async function handleSelectMenuInteraction(
  interaction: any,
  state: SelectAllState,
  sentMessage: Message
) {
  const value = interaction.values[0];

  switch (interaction.customId) {
    case 'main_select':
      await handleMainMenuSelection(interaction, value, state, sentMessage);
      break;
    case 'race_select':
      // ✅ FIX: Update the selection state AND update the view
      state.selectionManager.setSelectedRace(value);
      await updateRaceView(interaction, state); // This was missing or not working
      break;
    case 'class_select':
      state.selectionManager.setSelectedClass(value);
      await updateClassView(interaction, state);
      break;
    case 'deck_fast_select':
      await handleDeckFastSelect(interaction, value, state, sentMessage);
      break;
  }
}


      async function handleButtonInteraction(
        interaction: any,
        state: SelectAllState,
        sentMessage: Message
      ) {
        switch (interaction.customId) {
          case 'back_to_main':
            state.currentView = 'main';
            await interaction.update(await createMainMenu());
            break;
          case 'confirm_race':
            await confirmRace(interaction, state, sentMessage);
            break;
          case 'confirm_class':
            await confirmClass(interaction, state, sentMessage);
            break;
          case 'deck_save':
            await saveDeck(interaction, state, sentMessage);
            break;
          case 'deck_reset':
            await resetDeck(interaction, state);
            break;
          case 'deck_auto':
            await autofillDeck(interaction, state);
            break;
          case 'deck_clear':
            await clearDeck(interaction, state);
            break;
          case 'deck_back':
            state.currentView = 'main';
            await interaction.update(await createMainMenu());
            break;
          default:
            if (interaction.customId.startsWith('deck_slot')) {
              await handleDeckSlot(interaction, state);
            }
        }
      }

      async function handleMainMenuSelection(
        interaction: any,
        value: string,
        state: SelectAllState,
        sentMessage: Message
      ) {
        await interaction.deferUpdate();

        switch (value) {
          case 'select_race':
            state.currentView = 'race';
            const raceData = state.selectionManager.createRaceComponents();
            await sentMessage.edit(raceData);
            break;
          case 'select_class':
            state.currentView = 'class';
            const classData = state.selectionManager.createClassComponents();
            await sentMessage.edit(classData);
            break;
          case 'select_battle_deck':
            await initializeDeck('battle', state, sentMessage);
            break;
          case 'select_arena_deck':
            await initializeDeck('arena', state, sentMessage);
            break;
          case 'select_dungeon_deck':
            await initializeDeck('dungeon', state, sentMessage);
            break;
        }
      }

      async function initializeDeck(
        deckType: string,
        state: SelectAllState,
        sentMessage: Message
      ) {
        state.currentView = 'deck';
        state.deckManager = new DeckManager(message.author.id, deckType);
        
        const success = await state.deckManager.loadDeck();
        if (!success) {
          await sentMessage.edit({
            embeds: [new EmbedBuilder()
              .setTitle('❌ Error')
              .setDescription('Failed to load deck data. Please try again.')
              .setColor('#FF0000')],
            components: []
          });
          return;
        }

        const embed = state.deckManager.createDeckEmbed();
        const components = state.deckManager.createComponents();

        await sentMessage.edit({
          embeds: [embed],
          components
        });
      }

async function updateRaceView(interaction: any, state: SelectAllState) {
  const raceData = state.selectionManager.createRaceComponents();
  await interaction.update({
    embeds: [raceData.embed],    // ✅ Convert to array
    components: raceData.components
  });
}

async function updateClassView(interaction: any, state: SelectAllState) {
  const classData = state.selectionManager.createClassComponents();
  await interaction.update({
    embeds: [classData.embed],   // ✅ Convert to array
    components: classData.components
  });
}


      async function confirmRace(interaction: any, state: SelectAllState, sentMessage: Message) {
        await interaction.deferUpdate();
        const result = await state.selectionManager.saveRace();
        
        if (result.success) {
          const raceState = state.selectionManager.getState();
          const raceName = raceState.selectedRace?.replace('race-', '') || '';
          
          const successEmbed = new EmbedBuilder()
            .setTitle('✅ Race Selected Successfully!')
            .setDescription(`You have selected the **${raceName}** race. Your base stats have been updated.`)
            .setColor('#00FF00');

          await interaction.followUp({ embeds: [successEmbed], ephemeral: true });
          
          state.currentView = 'main';
          await sentMessage.edit(await createMainMenu());
        } else {
          await interaction.followUp({
            content: `❌ ${result.error}`,
            ephemeral: true
          });
        }
      }

      async function confirmClass(interaction: any, state: SelectAllState, sentMessage: Message) {
        await interaction.deferUpdate();
        const result = await state.selectionManager.saveClass();
        
        if (result.success) {
          const classState = state.selectionManager.getState();
          const className = classState.selectedClass?.replace('class-', '') || '';
          
          const successEmbed = new EmbedBuilder()
            .setTitle('✅ Class Selected Successfully!')
            .setDescription(`You have selected the **${className}** class. Your character abilities have been updated.`)
            .setColor('#00FF00');

          await interaction.followUp({ embeds: [successEmbed], ephemeral: true });
          
          state.currentView = 'main';
          await sentMessage.edit(await createMainMenu());
        } else {
          await interaction.followUp({
            content: `❌ ${result.error}`,
            ephemeral: true
          });
        }
      }

      async function saveDeck(interaction: any, state: SelectAllState, sentMessage: Message) {
        if (!state.deckManager) return;
        
        await interaction.deferUpdate();
        const success = await state.deckManager.saveDeck();
        
        if (success) {
          const config = state.deckManager.getConfig();
          const successEmbed = new EmbedBuilder()
            .setTitle('✅ Deck Saved Successfully!')
            .setDescription(`Your ${config.name.toLowerCase()} has been saved and is ready for use.`)
            .setColor('#00FF00');

          await interaction.followUp({ embeds: [successEmbed], ephemeral: true });
          
          state.currentView = 'main';
          await sentMessage.edit(await createMainMenu());
        } else {
          await interaction.followUp({
            content: '❌ Failed to save deck. Please try again.',
            ephemeral: true
          });
        }
      }

      async function resetDeck(interaction: any, state: SelectAllState) {
        if (!state.deckManager) return;
        
        state.deckManager.resetDeck();
        const embed = state.deckManager.createDeckEmbed();
        const components = state.deckManager.createComponents();
        
        await interaction.update({
          embeds: [embed],
          components
        });
      }

      async function clearDeck(interaction: any, state: SelectAllState) {
        if (!state.deckManager) return;
        
        state.deckManager.clearDeck();
        const embed = state.deckManager.createDeckEmbed();
        const components = state.deckManager.createComponents();
        
        await interaction.update({
          embeds: [embed],
          components
        });
      }

      async function autofillDeck(interaction: any, state: SelectAllState) {
        if (!state.deckManager) return;
        
        await interaction.deferUpdate();
        const success = await state.deckManager.autoFillDeck();
        
        if (success) {
          const embed = state.deckManager.createDeckEmbed();
          const components = state.deckManager.createComponents();
          
          await interaction.editReply({
            embeds: [embed],
            components
          });
        } else {
          await interaction.followUp({
            content: '❌ Failed to auto-fill deck. Make sure you have familiars in your collection.',
            ephemeral: true
          });
        }
      }

      async function handleDeckSlot(interaction: any, state: SelectAllState) {
        if (!state.deckManager) return;
        
        const slotNumber = parseInt(interaction.customId.replace('deck_slot', ''), 10);
        const config = state.deckManager.getConfig();
        const modal = createSlotModal(slotNumber, config.name);
        
        await interaction.showModal(modal);
      }

      async function handleDeckFastSelect(
        interaction: any,
        value: string,
        state: SelectAllState,
        sentMessage: Message
      ) {
        if (!state.deckManager) return;
        
        if (value === 'select_deck_fast') {
          const config = state.deckManager.getConfig();
          const modal = createFastInputModal(config.name, config.maxSlots);
          await interaction.showModal(modal);
        } else if (value === 'auto_select') {
          await interaction.deferUpdate();
          const success = await state.deckManager.autoFillDeck();
          
          if (success) {
            const embed = state.deckManager.createDeckEmbed();
            const components = state.deckManager.createComponents();
            
            await interaction.editReply({
              embeds: [embed],
              components
            });
          } else {
            await interaction.followUp({
              content: '❌ Failed to auto-fill deck.',
              ephemeral: true
            });
          }
        } else if (value === 'copy_battle') {
          await interaction.deferUpdate();
          const result = await state.deckManager.copyFromBattleDeck();
          
          if (result.success) {
            const embed = state.deckManager.createDeckEmbed();
            const components = state.deckManager.createComponents();
            
            await interaction.editReply({
              embeds: [embed],
              components
            });
          } else {
            await interaction.followUp({
              content: `❌ ${result.error}`,
              ephemeral: true
            });
          }
        }
      }

      async function handleFastDeckInput(
        interaction: any,
        state: SelectAllState,
        sentMessage: Message
      ) {
        if (!state.deckManager) return;
        
        const inputValues = interaction.fields.getTextInputValue("deck_input_fast_select");
        const inputs = inputValues.trim().split(/\s+/);
        
        const result = await state.deckManager.handleFastInput(inputs);
        
        if (result.success) {
          const embed = state.deckManager.createDeckEmbed();
          const components = state.deckManager.createComponents();
          
          await interaction.update({
            embeds: [embed],
            components
          });
        } else {
          await interaction.reply({
            content: `❌ ${result.error}`,
            ephemeral: true
          });
        }
      }

      async function handleSlotInput(
        interaction: any,
        state: SelectAllState,
        sentMessage: Message
      ) {
        if (!state.deckManager) return;
        
        const slotNumber = parseInt(interaction.customId.replace('deck_modal_', ''), 10);
        const input = interaction.fields.getTextInputValue(`deck_input_${slotNumber}`);
        
        const result = await state.deckManager.handleSlotInput(slotNumber, input);
        
        if (result.success) {
          const embed = state.deckManager.createDeckEmbed();
          const components = state.deckManager.createComponents();
          
          await interaction.update({
            embeds: [embed],
            components
          });
        } else {
          await interaction.reply({
            content: `❌ ${result.error}`,
            ephemeral: true
          });
        }
      }

    } catch (error) {
      console.error('SelectAll command error:', error);
      await message.reply({
        embeds: [new EmbedBuilder()
          .setTitle('❌ Configuration Error')
          .setDescription('An error occurred while loading the configuration menu. Please try again in a moment.')
          .setColor('#FF0000')]
      });
    }
  },
};

export default selectAllCommand;
