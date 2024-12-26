import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  InteractionType,
  StringSelectMenuBuilder,
  Message,
  Interaction,
} from "discord.js";
import { mongoClient } from "../../../data/mongo/mongo";
import { Command } from "../../../@types/command";

const db = mongoClient.db("Akaimnky");
const collection: any = db.collection("akaillection");
import { DeckItem, Player } from "../../../data/mongo/playerschema";
import { Familiar } from "../../../data/information/allfamiliars";

import { ExtendedClient } from "../../../index";
const deckCommand: Command = {
  name: "deck",
  description:
    "Configure your deck and placement of your familiars and yourself.",
  aliases: ["d"],
  async execute(
    client: ExtendedClient,
    message: Message<boolean>,
    args: string[]
  ): Promise<void> {
    const filter = { _id: message.author.id };
    let playerData: Player = await collection.findOne(filter);

    if (!playerData) {
      (message.channel as any).send(
        "You don't have a player account but what tf."
      );
    }
    let deckEmbed: any;
    const empty: any = { name: "empty" };
    const formattedDescription = playerData.deck.map((item, index) => {
      const name = item?.name != "empty" ? `(${item.name})` : "__empty__";
      const serialId = item?.serialId || "e";
      return `${name} \`${serialId}\``;
    });

    const topRow = formattedDescription.slice(0, 3).join("   |   ");
    const bottomRow = formattedDescription.slice(3, 6).join("   |   ");

    const embed = new EmbedBuilder()
      .setTitle("Deck Configuration")
      .setDescription(`**__FR__**:   ${topRow}\n\n**__BR__**:   ${bottomRow}`)
      .setColor(0x00ae86)
      .setFooter({
        text: `FrontRow elements are hit more often and BackRow are hit less often/reduced dmg`,
      });

    const buttons1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("slot1").setLabel("1").setStyle(3),
      new ButtonBuilder().setCustomId("slot2").setLabel("2").setStyle(3),
      new ButtonBuilder().setCustomId("slot3").setLabel("3").setStyle(3),
      new ButtonBuilder().setCustomId("save").setLabel("Save").setStyle(1)
    );

    const buttons2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("slot4").setLabel("4").setStyle(3),
      new ButtonBuilder().setCustomId("slot5").setLabel("5").setStyle(3),
      new ButtonBuilder().setCustomId("slot6").setLabel("6").setStyle(3),
      new ButtonBuilder().setCustomId("reset").setLabel("Reset").setStyle(4)
    );

    const optionSelectRow =
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("fast_select")
          .setPlaceholder("Select fast options")
          .addOptions([
            {
              label: "Select Deck Fast",
              description:
                "Input 6 responses, with 'e' for empty, 'p' for player and numbers as serial IDs.",
              value: "select_deck_fast",
            },
            {
              label: "Auto Select",
              description: "Randomly select familiar IDs for the deck",
              value: "auto_select",
            },
          ])
      );

    deckEmbed = await (message.channel as any).send({
      embeds: [embed],
      components: [buttons1, buttons2, optionSelectRow],
    });

    const filterInteraction = (i: Interaction) =>
      i.user.id === message.author.id;
    const collector = (message.channel as any).createMessageComponentCollector({
      filter: filterInteraction,
      time: 120000,
    });

    collector.on("collect", async (i: Interaction) => {
      if (i.isButton()) {
        const slotNumber = i.customId.replace("slot", "");

        if (i.customId === "save") {
          await i.deferUpdate();
          await collection.updateOne(filter, {
            $set: { deck: playerData.deck },
          });
          await (message.channel as any).send("Deck configuration saved!");
          collector.stop();
        } else if (i.customId === "reset") {
          playerData.deck = Array(6).fill(empty);
          await collection.updateOne(filter, {
            $set: { deck: playerData.deck },
          });

          const resetDescription = playerData.deck
            .map((item, index) => `${index + 1}) ${item ? item.name : "empty"}`)
            .join("\n");
          embed.setDescription(resetDescription);

          await i.update({
            embeds: [embed],
            content: "Deck reset successfully!",
            components: [buttons1, buttons2, optionSelectRow],
          });
        } else {
          const modal = new ModalBuilder()
            .setCustomId(`modal-${slotNumber}`)
            .setTitle(`Configure Slot ${slotNumber}`)
            .addComponents(
              new ActionRowBuilder<TextInputBuilder>().addComponents(
                new TextInputBuilder()
                  .setCustomId(`input-${slotNumber}`)
                  .setLabel("Enter the familiar ID or type 'player'")
                  .setStyle(TextInputStyle.Short)
              )
            );

          await i.showModal(modal);
        }
      } else if (i.isStringSelectMenu()) {
        if (i.customId === "fast_select") {
          const selectedValue = i.values[0];
          if (selectedValue === "select_deck_fast") {
            const modal = new ModalBuilder()
              .setCustomId("modal-fast_select")
              .setTitle("Fast Deck Selection")
              .addComponents(
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                  new TextInputBuilder()
                    .setCustomId("input-fast_select")
                    .setLabel("Enter 6 values (e for empty, numbers for IDs)")
                    .setStyle(TextInputStyle.Paragraph)
                )
              );
            await i.showModal(modal);
          } else if (selectedValue === "auto_select") {
            const extraPlayerDataNonUpdating = await collection.findOne(filter);

            if (!extraPlayerDataNonUpdating) return;

            // Ensure playerData.deck is reset
            playerData.deck = [];

            // Always include the player
            const playerSlot = {
              serialId: "player",
              globalId: i.user.id,
              name: i.user.username,
              stats: extraPlayerDataNonUpdating.stats,
            };
            playerData.deck.push(playerSlot);

            // Shuffle and pick up to 4 familiars
            const shuffledFamiliars =
              extraPlayerDataNonUpdating.collectionInv.sort(
                () => Math.random() - 0.5
              );

            const selectedFamiliars = shuffledFamiliars.slice(
              0,
              Math.min(4, shuffledFamiliars.length)
            );
            playerData.deck.push(...selectedFamiliars);

            // Fill remaining slots with empty
            while (playerData.deck.length < 6) {
              playerData.deck.push(empty);
            }

            // Update the database
            await collection.updateOne(filter, {
              $set: { deck: playerData.deck },
            });

            // Create the updated description using the new padding system
            const formattedDescription = playerData.deck.map((item) => {
              const name =
                item?.name != "empty" ? `(${item.name})` : "__empty__";
              const serialId = item?.serialId || "e";
              return `${name} \`${serialId}\``;
            });

            const topRow = formattedDescription.slice(0, 3).join("   |   ");
            const bottomRow = formattedDescription.slice(3, 6).join("   |   ");

            embed.setDescription(
              `**__FR__**:   ${topRow}\n\n**__BR__**:   ${bottomRow}`
            );

            await i.update({
              content: "Deck auto-selected successfully!",
              embeds: [embed],
              components: [buttons1, buttons2, optionSelectRow],
            });
          }
        }
      }
    });

    client.on("interactionCreate", async (interaction: any) => {
      if (!interaction.isModalSubmit()) return;

      const inputValues: string = interaction.fields.getTextInputValue(
        `input-${interaction.customId.split("-")[1]}`
      );

      if (interaction.customId === "modal-fast_select") {
        const inputs = inputValues.split(" ");
        playerData.deck = [];
        for (let i = 0; i < 6; i++) {
          const input = inputs[i];
          if (input.toLowerCase() === "e") {
            playerData.deck.push(empty);
          } else {
            const extraPlayerDataNonUpdating = await collection.findOne(filter);
            if (!extraPlayerDataNonUpdating) continue;

            const foundItem = extraPlayerDataNonUpdating.collectionInv.find(
              (item: { serialId: string }) => item.serialId === input
            );

            if (foundItem) {
              const existingFamiliar = playerData.deck.find(
                (item: { name?: string }) =>
                  item && item.name === foundItem.name
              );

              if (existingFamiliar) {
                await interaction.reply({
                  content: `You can't add two of the same familiars (${foundItem.name}) to your deck.`,
                  ephemeral: true,
                });
                return;
              }

              const filledSlotsCount = playerData.deck.filter(
                (item: { name?: string }) => item && item.name !== "empty"
              ).length;

              if (filledSlotsCount >= 4) {
                await interaction.reply({
                  content: `You can only have 4 familiars in your deck. Please ensure 2 slots remain empty. Taking player slot or not is up to you.`,
                  ephemeral: true,
                });
                return;
              }
            }
            playerData.deck.push(foundItem || empty);
          }
        }
      } else {
        const slotNumber = parseInt(
          interaction.customId.replace("modal-", ""),
          10
        );
        const input = interaction.fields.getTextInputValue(
          `input-${slotNumber}`
        );
        console.log("ithinknormalbuttons");
        let updateText: any = input;

        const extraPlayerDataNonUpdating = await collection.findOne(filter);
        if (!extraPlayerDataNonUpdating) return;

        if (input.toLowerCase() === "p" || input.toLowerCase() === "player") {
          updateText = {
            serialId: "player",
            globalId: interaction.user.id,
            name: interaction.user.username,
            stats: {},
          };
        } else if (
          input.toLowerCase() === "e" ||
          input.toLowerCase() === "empty"
        ) {
          updateText = empty;
        } else {
          const foundItem = extraPlayerDataNonUpdating.collectionInv.find(
            (item: { serialId: string }) => item.serialId === input
          );
          console.log("foundItem", foundItem);
          let theElement: any;
          if (foundItem) {
            const existingFamiliar = playerData.deck.find(
              (item: { name?: string }) => item && item.name === foundItem.name
            );

            if (existingFamiliar) {
              await interaction.reply({
                content: `You can't add two of the same familiars (${foundItem.name}) to your deck.`,
                ephemeral: true,
              });
              return;
            }

            const filledSlotsCount = playerData.deck.filter(
              (item: { name?: string }) => item && item.name !== "empty"
            ).length;

            if (filledSlotsCount >= 4) {
              await interaction.reply({
                content: `You can only have 4 familiars in your deck. Please ensure 2 slots remain empty. Taking player slot or not is up to you.`,
                ephemeral: true,
              });
              return;
            }
            theElement = foundItem;
          } else {
            await interaction.reply({
              content: `The familiar ID (${input}) doesn't exist.`,
              ephemeral: true,
            });
            return;
          }

          updateText = {
            serialId: input,
            globalId: `${theElement.globalId}`,
            name: theElement.name,
            stats: theElement.stats,
          };
        }

        playerData.deck = playerData.deck || [];
        playerData.deck[slotNumber - 1] = updateText;
      }

      console.log("updating?");
      const updatedDescription = playerData.deck
        .map(
          (item: { name?: string }) =>
            `${
              item
                ? `\`\`${item.name?.toString().padStart(14, " ")}\`\``
                : `\`\`${empty.toString().padStart(7, " ")}\`\``
            }`
        )
        .join("\n");

      const formattedDescription = playerData.deck.map((item, index) => {
        const name = item?.name != "empty" ? `(${item.name})` : "__empty__";
        const serialId = item?.serialId || "e";
        return `${name} \`${serialId}\``;
      });

      const topRow = formattedDescription.slice(0, 3).join("   |   ");
      const bottomRow = formattedDescription.slice(3, 6).join("   |   ");

      embed.setDescription(
        `**__FR__**:   ${topRow}\n\n**__BR__**:   ${bottomRow}`
      );

      await collection.updateOne(filter, { $set: { deck: playerData.deck } });

      await interaction.update({
        embeds: [embed],
        components: [buttons1, buttons2, optionSelectRow],
      });
    });
  },
};

export default deckCommand;
