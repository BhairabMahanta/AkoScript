import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
  Message,
  Interaction,
  ButtonStyle,
  ComponentType,
} from "discord.js";
import { PlayerModal } from "../../../data/mongo/playerschema";
import { Command } from "../../../@types/command";
import { ExtendedClient } from "../../../index";

const deckCommand: Command = {
  name: "deck",
  description: "Configure your deck and placement of your familiars and yourself.",
  aliases: ["d"],
  async execute(
    client: ExtendedClient,
    message: Message<boolean>,
    args: string[]
  ): Promise<void> {
    try {
      // Get player data using the proper model
      const playerData = await PlayerModal.findById(message.author.id);

      if (!playerData) {
        await message.reply("❌ You don't have a player account. Use `!register` to create one.");
        return;
      }

      // Determine which deck to edit based on args
      const deckType = args[0]?.toLowerCase();
      let currentDeck: any[];
      let maxSlots: number;
      let deckName: string;

      switch (deckType) {
        case 'dungeon':
        case 'dung':
          currentDeck = [...playerData.dungeonDeck];
          maxSlots = 6;
          deckName = "Dungeon Deck";
          break;
        case 'arena':
        case 'defense':
          currentDeck = [...(playerData.arena.defenseDeck || [])];
          maxSlots = 4;
          deckName = "Arena Defense Deck";
          break;
        default:
          currentDeck = [...playerData.deck];
          maxSlots = 4;
          deckName = "Battle Deck";
      }

      // Ensure deck has the right number of slots
      while (currentDeck.length < maxSlots) {
        currentDeck.push({
          slot: currentDeck.length + 1,
          serialId: "empty",
          globalId: "empty",
          name: "empty"
        });
      }

      // Create initial embed
      const createDeckEmbed = (deck: any[]) => {
        const formattedDescription = deck.map((item, index) => {
          const name = item?.name !== "empty" ? `(${item.name})` : "__empty__";
          const serialId = item?.serialId || "e";
          return `**${index + 1}.** ${name} \`${serialId}\``;
        });

        let description: string;
        if (maxSlots === 6) {
          const topRow = formattedDescription.slice(0, 3).join("  |  ");
          const bottomRow = formattedDescription.slice(3, 6).join("  |  ");
          description = `**Front Row:**\n${topRow}\n\n**Back Row:**\n${bottomRow}`;
        } else {
          const topRow = formattedDescription.slice(0, 2).join("  |  ");
          const bottomRow = formattedDescription.slice(2, 4).join("  |  ");
          description = `**Front Row:**\n${topRow}\n\n**Back Row:**\n${bottomRow}`;
        }

        return new EmbedBuilder()
          .setTitle(`⚔️ ${deckName} Configuration`)
          .setDescription(description)
          .setColor('#00AE86')
          .addFields({
            name: '📋 **Deck Rules**',
            value: `• Max ${maxSlots} slots\n• Front row takes more damage\n• Back row has reduced damage\n• Use 'p' for player, 'e' for empty, or familiar serial IDs`,
            inline: false
          })
          .setFooter({ text: `${deckName} • Use buttons to configure slots` });
      };

      let embed = createDeckEmbed(currentDeck);

      // Create buttons with proper typing
      const createButtons = () => {
        if (maxSlots === 6) {
          const buttons1 = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
              new ButtonBuilder().setCustomId("slot1").setLabel("1").setStyle(ButtonStyle.Secondary),
              new ButtonBuilder().setCustomId("slot2").setLabel("2").setStyle(ButtonStyle.Secondary),
              new ButtonBuilder().setCustomId("slot3").setLabel("3").setStyle(ButtonStyle.Secondary),
              new ButtonBuilder().setCustomId("save").setLabel("💾 Save").setStyle(ButtonStyle.Success)
            );

          const buttons2 = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
              new ButtonBuilder().setCustomId("slot4").setLabel("4").setStyle(ButtonStyle.Secondary),
              new ButtonBuilder().setCustomId("slot5").setLabel("5").setStyle(ButtonStyle.Secondary),
              new ButtonBuilder().setCustomId("slot6").setLabel("6").setStyle(ButtonStyle.Secondary),
              new ButtonBuilder().setCustomId("reset").setLabel("🔄 Reset").setStyle(ButtonStyle.Danger)
            );

          return [buttons1, buttons2];
        } else {
          const buttons1 = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
              new ButtonBuilder().setCustomId("slot1").setLabel("1").setStyle(ButtonStyle.Secondary),
              new ButtonBuilder().setCustomId("slot2").setLabel("2").setStyle(ButtonStyle.Secondary),
              new ButtonBuilder().setCustomId("save").setLabel("💾 Save").setStyle(ButtonStyle.Success),
              new ButtonBuilder().setCustomId("reset").setLabel("🔄 Reset").setStyle(ButtonStyle.Danger)
            );

          const buttons2 = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
              new ButtonBuilder().setCustomId("slot3").setLabel("3").setStyle(ButtonStyle.Secondary),
              new ButtonBuilder().setCustomId("slot4").setLabel("4").setStyle(ButtonStyle.Secondary),
              new ButtonBuilder().setCustomId("auto").setLabel("🎲 Auto Fill").setStyle(ButtonStyle.Primary),
              new ButtonBuilder().setCustomId("clear").setLabel("🗑️ Clear").setStyle(ButtonStyle.Secondary)
            );

          return [buttons1, buttons2];
        }
      };

      const [buttons1, buttons2] = createButtons();

      // Fast select menu with proper typing
      const optionSelectRow = new ActionRowBuilder<StringSelectMenuBuilder>()
        .addComponents(
          new StringSelectMenuBuilder()
            .setCustomId("fast_select")
            .setPlaceholder("🚀 Quick Actions")
            .addOptions([
              {
                label: "Fast Input",
                description: `Enter ${maxSlots} values separated by spaces`,
                value: "select_deck_fast",
                emoji: "⚡"
              },
              {
                label: "Auto Select",
                description: "Randomly fill deck with available familiars",
                value: "auto_select",
                emoji: "🎲"
              },
              {
                label: "Copy from Battle Deck",
                description: "Copy configuration from your battle deck",
                value: "copy_battle",
                emoji: "📋"
              }
            ])
        );

      const components = [buttons1, buttons2, optionSelectRow];

      // Send message and create collector on the message object
      const deckMessage = await message.reply({
        embeds: [embed],
        components: components
      });

      // Create collector on message (not channel) - this fixes the TypeScript error
      const collector = deckMessage.createMessageComponentCollector({
        filter: (i: Interaction) => i.user.id === message.author.id,
        time: 300000 // 5 minutes
      });

      collector.on('collect', async (interaction: Interaction) => {
        if (interaction.isButton()) {
          const customId = interaction.customId;

          if (customId === "save") {
            await interaction.deferUpdate();
            
            // Save the appropriate deck
            try {
              if (deckType === 'dungeon' || deckType === 'dung') {
                await PlayerModal.findByIdAndUpdate(message.author.id, {
                  dungeonDeck: currentDeck
                });
              } else if (deckType === 'arena' || deckType === 'defense') {
                await PlayerModal.findByIdAndUpdate(message.author.id, {
                  'arena.defenseDeck': currentDeck
                });
              } else {
                await PlayerModal.findByIdAndUpdate(message.author.id, {
                  deck: currentDeck
                });
              }

              const successEmbed = new EmbedBuilder()
                .setTitle('✅ **Deck Saved Successfully!**')
                .setDescription(`Your ${deckName.toLowerCase()} has been saved.`)
                .setColor('#00FF00')
                .setTimestamp();

              await interaction.followUp({ embeds: [successEmbed], ephemeral: true });
              collector.stop();

            } catch (error) {
              console.error('Error saving deck:', error);
              await interaction.followUp({ 
                content: '❌ Failed to save deck. Please try again.', 
                ephemeral: true 
              });
            }

          } else if (customId === "reset") {
            // Reset deck to empty
            for (let i = 0; i < maxSlots; i++) {
              currentDeck[i] = {
                slot: i + 1,
                serialId: "empty",
                globalId: "empty",
                name: "empty"
              };
            }

            embed = createDeckEmbed(currentDeck);
            await interaction.update({
              embeds: [embed],
              components: components
            });

          } else if (customId === "auto") {
            await interaction.deferUpdate();
            
            // Auto-fill deck
            const updatedPlayer = await PlayerModal.findById(message.author.id);
            if (!updatedPlayer) return;

            // Clear current deck
            for (let i = 0; i < maxSlots; i++) {
              currentDeck[i] = {
                slot: i + 1,
                serialId: "empty",
                globalId: "empty",
                name: "empty"
              };
            }

            // Add player in first slot
            currentDeck[0] = {
              slot: 1,
              serialId: "player",
              globalId: message.author.id,
              name: updatedPlayer.name
            };

            // Add random familiars
            const availableFamiliars = updatedPlayer.collectionInv.filter(f => 
              f.name && f.name !== "empty"
            );
            
            const shuffled = availableFamiliars.sort(() => Math.random() - 0.5);
            const maxFamiliars = Math.min(maxSlots - 1, shuffled.length);
            
            for (let i = 0; i < maxFamiliars && i + 1 < maxSlots; i++) {
              const familiar = shuffled[i];
              currentDeck[i + 1] = {
                slot: i + 2,
                serialId: familiar.serialId,
                globalId: familiar.globalId,
                name: familiar.name
              };
            }

            embed = createDeckEmbed(currentDeck);
            await interaction.editReply({
              embeds: [embed],
              components: components
            });

          } else if (customId === "clear") {
            // Clear all slots
            for (let i = 0; i < maxSlots; i++) {
              currentDeck[i] = {
                slot: i + 1,
                serialId: "empty",
                globalId: "empty",
                name: "empty"
              };
            }

            embed = createDeckEmbed(currentDeck);
            await interaction.update({
              embeds: [embed],
              components: components
            });

          } else if (customId.startsWith("slot")) {
            const slotNumber = parseInt(customId.replace("slot", ""), 10);
            
            const modal = new ModalBuilder()
              .setCustomId(`modal-${slotNumber}`)
              .setTitle(`Configure Slot ${slotNumber}`)
              .addComponents(
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                  new TextInputBuilder()
                    .setCustomId(`input-${slotNumber}`)
                    .setLabel("Enter familiar serial ID, 'player', or 'empty'")
                    .setPlaceholder("e.g., 'p' for player, 'e' for empty, or serial ID")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                )
              );

            await interaction.showModal(modal);
          }

        } else if (interaction.isStringSelectMenu()) {
          if (interaction.customId === "fast_select") {
            const selectedValue = interaction.values[0];
            
            if (selectedValue === "select_deck_fast") {
              const modal = new ModalBuilder()
                .setCustomId("modal-fast_select")
                .setTitle(`Fast ${deckName} Configuration`)
                .addComponents(
                  new ActionRowBuilder<TextInputBuilder>().addComponents(
                    new TextInputBuilder()
                      .setCustomId("input-fast_select")
                      .setLabel(`Enter ${maxSlots} values separated by spaces`)
                      .setPlaceholder("e.g., p 1234 5678 e e e (p=player, e=empty, numbers=serial IDs)")
                      .setStyle(TextInputStyle.Paragraph)
                      .setRequired(true)
                  )
                );
              await interaction.showModal(modal);

            } else if (selectedValue === "auto_select") {
              await interaction.deferUpdate();
              
              const updatedPlayer = await PlayerModal.findById(message.author.id);
              if (!updatedPlayer) return;

              // Auto-select logic (same as auto button)
              for (let i = 0; i < maxSlots; i++) {
                currentDeck[i] = {
                  slot: i + 1,
                  serialId: "empty",
                  globalId: "empty",
                  name: "empty"
                };
              }

              currentDeck[0] = {
                slot: 1,
                serialId: "player",
                globalId: message.author.id,
                name: updatedPlayer.name
              };

              const availableFamiliars = updatedPlayer.collectionInv.filter(f => 
                f.name && f.name !== "empty"
              );
              
              const shuffled = availableFamiliars.sort(() => Math.random() - 0.5);
              const maxFamiliars = Math.min(maxSlots - 1, shuffled.length);
              
              for (let i = 0; i < maxFamiliars && i + 1 < maxSlots; i++) {
                const familiar = shuffled[i];
                currentDeck[i + 1] = {
                  slot: i + 2,
                  serialId: familiar.serialId,
                  globalId: familiar.globalId,
                  name: familiar.name
                };
              }

              embed = createDeckEmbed(currentDeck);
              await interaction.editReply({
                embeds: [embed],
                components: components
              });

            } else if (selectedValue === "copy_battle") {
              await interaction.deferUpdate();
              
              const updatedPlayer = await PlayerModal.findById(message.author.id);
              if (!updatedPlayer) return;

              // Copy from battle deck, adjusting for slot differences
              const sourceDeck = updatedPlayer.deck;
              for (let i = 0; i < maxSlots; i++) {
                if (i < sourceDeck.length) {
                  currentDeck[i] = {
                    slot: i + 1,
                    serialId: sourceDeck[i].serialId,
                    globalId: sourceDeck[i].globalId,
                    name: sourceDeck[i].name
                  };
                } else {
                  currentDeck[i] = {
                    slot: i + 1,
                    serialId: "empty",
                    globalId: "empty",
                    name: "empty"
                  };
                }
              }

              embed = createDeckEmbed(currentDeck);
              await interaction.editReply({
                embeds: [embed],
                components: components
              });
            }
          }
        }
      });

      // Handle modal submissions using client event
      const modalHandler = async (interaction: any) => {
        if (!interaction.isModalSubmit() || interaction.user.id !== message.author.id) return;

        if (interaction.customId === "modal-fast_select") {
          const inputValues = interaction.fields.getTextInputValue("input-fast_select");
          const inputs = inputValues.trim().split(/\s+/);

          if (inputs.length !== maxSlots) {
            await interaction.reply({
              content: `❌ Please provide exactly ${maxSlots} values separated by spaces.`,
              ephemeral: true
            });
            return;
          }

          const updatedPlayer = await PlayerModal.findById(message.author.id);
          if (!updatedPlayer) return;

          let hasError = false;
          const newDeck = [];

          for (let i = 0; i < maxSlots; i++) {
            const input = inputs[i].toLowerCase();
            
            if (input === "e" || input === "empty") {
              newDeck.push({
                slot: i + 1,
                serialId: "empty",
                globalId: "empty",
                name: "empty"
              });
            } else if (input === "p" || input === "player") {
              newDeck.push({
                slot: i + 1,
                serialId: "player",
                globalId: message.author.id,
                name: updatedPlayer.name
              });
            } else {
              const foundFamiliar = updatedPlayer.collectionInv.find(
                (item: any) => item.serialId === input
              );

              if (foundFamiliar) {
                newDeck.push({
                  slot: i + 1,
                  serialId: foundFamiliar.serialId,
                  globalId: foundFamiliar.globalId,
                  name: foundFamiliar.name
                });
              } else {
                await interaction.reply({
                  content: `❌ Familiar with serial ID '${input}' not found.`,
                  ephemeral: true
                });
                hasError = true;
                break;
              }
            }
          }

          if (!hasError) {
            currentDeck.splice(0, maxSlots, ...newDeck);
            embed = createDeckEmbed(currentDeck);
            
            await interaction.update({
              embeds: [embed],
              components: components
            });
          }

        } else if (interaction.customId.startsWith("modal-")) {
          const slotNumber = parseInt(interaction.customId.replace("modal-", ""), 10);
          const input = interaction.fields.getTextInputValue(`input-${slotNumber}`).toLowerCase();

          const updatedPlayer = await PlayerModal.findById(message.author.id);
          if (!updatedPlayer) return;

          let newItem;

          if (input === "e" || input === "empty") {
            newItem = {
              slot: slotNumber,
              serialId: "empty",
              globalId: "empty",
              name: "empty"
            };
          } else if (input === "p" || input === "player") {
            newItem = {
              slot: slotNumber,
              serialId: "player",
              globalId: message.author.id,
              name: updatedPlayer.name
            };
          } else {
            const foundFamiliar = updatedPlayer.collectionInv.find(
              (item: any) => item.serialId === input
            );

            if (foundFamiliar) {
              newItem = {
                slot: slotNumber,
                serialId: foundFamiliar.serialId,
                globalId: foundFamiliar.globalId,
                name: foundFamiliar.name
              };
            } else {
              await interaction.reply({
                content: `❌ Familiar with serial ID '${input}' not found.`,
                ephemeral: true
              });
              return;
            }
          }

          currentDeck[slotNumber - 1] = newItem;
          embed = createDeckEmbed(currentDeck);

          await interaction.update({
            embeds: [embed],
            components: components
          });
        }
      };

      // Add modal handler
      client.on("interactionCreate", modalHandler);

      // Handle collector end
      collector.on('end', async () => {
        // Remove modal handler
        client.off("interactionCreate", modalHandler);

        try {
          // Create disabled components with proper typing
          const disabledButtons1 = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
              ...buttons1.components.map(button => 
                ButtonBuilder.from(button).setDisabled(true)
              )
            );

          const disabledButtons2 = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
              ...buttons2.components.map(button => 
                ButtonBuilder.from(button).setDisabled(true)
              )
            );

          const disabledSelect = new ActionRowBuilder<StringSelectMenuBuilder>()
            .addComponents(
              StringSelectMenuBuilder.from(optionSelectRow.components[0]).setDisabled(true)
            );

          await deckMessage.edit({ 
            components: [disabledButtons1, disabledButtons2, disabledSelect] 
          });
        } catch (error) {
          console.log('Could not disable deck command components');
        }
      });

    } catch (error) {
      console.error('Deck command error:', error);
      await message.reply('❌ An error occurred while loading the deck configuration. Please try again.');
    }
  }
};

export default deckCommand;
