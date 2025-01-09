import {
  ActionRowBuilder,
  ButtonBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  EmbedBuilder,
  Message,
  Interaction,
  TextChannel,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import mongoose from "mongoose";
import { DeckItem, playerModel } from "../../../data/mongo/playerschema";
import { mongoClient } from "../../../data/mongo/mongo";
const db = mongoClient.db("Akaimnky");
const collection: any = db.collection("akaillection");
import classesData from "../../../data/classes/allclasses";
import racesData from "../../../data/races/races";
import abilitiesData from "../../../data/abilities";
import { Command } from "../../../@types/command";

let selectMenu: StringSelectMenuBuilder;
let raceOptions: Array<{ label: string; value: string }>;
let classOptions: Array<{ label: string; value: string }>;
let classRow: any;
let raceRow: any;
let familiars: any; // Replace with proper type if known
let playerData: any = null; // Replace with proper type
let selectedRaceValue: string;
let selectedClassValue: string;

const selectButton = new ButtonBuilder() // Add a new button for selecting
  .setCustomId("select_race_button")
  .setLabel("Select")
  .setStyle(1);

const selectRow = new ActionRowBuilder().addComponents(
  selectButton // Add the new "Select" button
);

const selectButton2 = new ButtonBuilder() // Add a new button for selecting
  .setCustomId("select_class_button")
  .setLabel("Select")
  .setStyle(1);

const selectRow2 = new ActionRowBuilder().addComponents(
  selectButton2 // Add the new "Select" button
);
import { ExtendedClient } from "../../../index";
const selectAllCommand: Command = {
  name: "selectAll",
  description: "Select your race, class, and up to 3 familiars!",
  aliases: ["sa", "selectall"],
  async execute(
    client: ExtendedClient,
    message: Message<boolean>,
    args: string[]
  ): Promise<void> {
    const { db } = client;
    const filter = { _id: message.author.id };
    playerData = await collection.findOne(filter);
    // CLASS
    classOptions = Object.keys(classesData)
      .filter((className) => classesData[className].state !== "locked")
      .map((className) => ({
        label: className,
        value: `class-${className}`,
      }));

    const classSelectMenu = new StringSelectMenuBuilder()
      .setCustomId("class_select")
      .setPlaceholder("Select your class")
      .addOptions(classOptions);
    classRow = new ActionRowBuilder().addComponents(classSelectMenu);
    // RACE
    raceOptions = Object.keys(racesData).map((raceName) => ({
      label: raceName,
      value: `race-${raceName}`,
    }));
    const raceSelectMenu = new StringSelectMenuBuilder()
      .setCustomId("race_select")
      .setPlaceholder("Select your race")
      .addOptions(raceOptions);
    raceRow = new ActionRowBuilder().addComponents(raceSelectMenu);

    // Initial Select Menu for selecting between Race, Class, and Familiar
    const initialSelectMenu = new StringSelectMenuBuilder()
      .setCustomId("initial_select")
      .setPlaceholder("Select an option")
      .addOptions([
        { label: "Select Race", value: "select_race" },
        { label: "Select Class", value: "select_class" },
        { label: "Select Familiar", value: "select_familiar" },
        { label: "Set Deck", value: "select_deck" },
      ]);

    const initialRow = new ActionRowBuilder().addComponents(initialSelectMenu);

    const initialEmbed = new EmbedBuilder()
      .setTitle("Select Your Race, Class, and Familiars")
      .setDescription("Choose an option to start:");

    let sentMessage = await (message.channel as any).send({
      embeds: [initialEmbed],
      components: [initialRow],
    });

    // DECK

    let deckEmbedMessage: any;
    const empty: DeckItem = {
      name: "empty",
      serialId: "",
      globalId: "69420haha",
      stats: {
        attack: 0,
        tactics: 0,
        magic: 0,
        training: 0,
        defense: 0,
        magicDefense: 0,
        speed: 0,
        hp: 0,
        intelligence: 0,
        critRate: 0,
        critDamage: 0,
        wise: 0,
        luck: 0,
        devotion: 0,
        potential: 0,
      },
    };
    const deckButtons = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("slot1").setLabel("1").setStyle(3),
      new ButtonBuilder().setCustomId("slot2").setLabel("2").setStyle(3),
      new ButtonBuilder().setCustomId("slot3").setLabel("3").setStyle(3),
      new ButtonBuilder().setCustomId("slot4").setLabel("4").setStyle(3),
      new ButtonBuilder().setCustomId("save").setLabel("Save").setStyle(1)
    );

    const deckOptionSelectRow =
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("fast_select")
          .setPlaceholder("Select fast options")
          .addOptions([
            {
              label: "Select Deck Fast",
              description:
                "Input 4 responses, with 'e' for empty, 'p' for player and numbers as serial IDs.",
              value: "select_deck_fast",
            },
            {
              label: "Auto Select",
              description: "Randomly select familiar IDs for the deck",
              value: "auto_select",
            },
            {
              label: "Go Back",
              description: "Go back to the main menu",
              value: "go_back",
            },
          ])
      );
    const formattedDescription = playerData.deck.map((item: any) => {
      const name = item?.name != "empty" ? `(${item.name})` : "__empty__";
      const serialId = item?.serialId || "e";
      return `${name} \`${serialId}\``;
    });

    const embedDeck = new EmbedBuilder()
      .setTitle("Deck Configuration")
      .setDescription(`**__DECK__**: ${formattedDescription.join("   |   ")}`)
      .setColor(0x00ae86);

    // INTERACTION

    const filterInteraction = (i: any) =>
      [
        "initial_select",
        "race_select",
        "select_race_button",
        "select_class_button",
        "select_race",
        "select_class",
        "class_select",
        "familiar_select",
        "select_deck",
        "fast_select",
        "slot1",
        "slot2",
        "slot3",
        "slot4",
        "select_deck_fast",
        "auto_select",
        "save",
        "go_back",
      ].includes(i.customId) && i.user.id === message.author.id;

    let collector = sentMessage.createMessageComponentCollector({
      filter: filterInteraction,
      time: 300000,
    });
    let collector2: any;

    collector.on("collect", async (i: any) => {
      try {
        await i.deferUpdate();
        let abilityOne: string;
        let abilityTwo: string;
        console.log("Interaction custom ID:", i.customId);
        let updateEmbed: EmbedBuilder;

        if (i.customId === "initial_select") {
          const selectedOption = i.values[0];
          if (selectedOption === "select_race") {
            await handleSelectRace(i, sentMessage);
          } else if (selectedOption === "select_class") {
            await handleSelectClass(i, sentMessage);
          } else if (selectedOption === "select_familiar") {
            await handleSelectFamiliar(i, sentMessage);
          } else if (selectedOption === "select_deck") {
            console.log("select_deck");
            sentMessage.edit({
              embeds: [initialEmbed],
              components: [],
            });
            deckEmbedMessage = await (message.channel as any).send({
              embeds: [embedDeck],
              components: [deckButtons, deckOptionSelectRow],
            });
            collector2 = deckEmbedMessage.createMessageComponentCollector({
              filter: filterInteraction,
              time: 300000,
            });
            collector2?.on("collect", async (i: any) => {
              if (i.isButton()) {
                const slotNumber = i.customId.replace("slot", "");

                if (i.customId === "save") {
                  await i.deferUpdate();
                  await collection.updateOne(filter, {
                    $set: { deck: playerData.deck },
                  });
                  await (message.channel as any).send(
                    "Deck configuration saved!"
                  );
                  collector.stop();
                } else if (i.customId === "reset") {
                  playerData.deck = Array(4).fill(empty);
                  await collection.updateOne(filter, {
                    $set: { deck: playerData.deck },
                  });

                  const resetDescription = playerData.deck
                    .map(
                      (item: any, index: any) =>
                        `${index + 1}) ${item ? item.name : "empty"}`
                    )
                    .join("\n");
                  embedDeck.setDescription(resetDescription);

                  await deckEmbedMessage.edit({
                    embeds: [embedDeck],
                    content: "Deck reset successfully!",
                    components: [deckButtons, deckOptionSelectRow],
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
                console.log("what");
                console.log("customId", i.customId);
                if (i.customId === "fast_select") {
                  const selectedValue = i.values[0];
                  console.log("selectedvalue", selectedValue);
                  if (selectedValue === "select_deck_fast") {
                    const modal = new ModalBuilder()
                      .setCustomId("modal-fast_select")
                      .setTitle("Fast Deck Selection")
                      .addComponents(
                        new ActionRowBuilder<TextInputBuilder>().addComponents(
                          new TextInputBuilder()
                            .setCustomId("input-fast_select")
                            .setLabel(
                              "Enter 4 values (e for empty, numbers for IDs)"
                            )
                            .setStyle(TextInputStyle.Paragraph)
                        )
                      );
                    await i.showModal(modal);
                  } else if (selectedValue === "auto_select") {
                    i.deferUpdate();
                    const extraPlayerDataNonUpdating = await collection.findOne(
                      filter
                    );

                    if (!extraPlayerDataNonUpdating) return;

                    // Ensure playerData.deck is reset
                    playerData.deck = [];

                    // Always include the player
                    const playerSlot = {
                      serialId: "player",
                      globalId: i.user.id,
                      name: playerData.name,
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
                      Math.min(3, shuffledFamiliars.length)
                    );
                    playerData.deck.push(...selectedFamiliars);

                    // Fill remaining slots with empty
                    while (playerData.deck.length < 4) {
                      playerData.deck.push(empty);
                    }

                    // Update the database
                    await collection.updateOne(filter, {
                      $set: { deck: playerData.deck },
                    });

                    // Create the updated description using the new padding system
                    const formattedDescription = playerData.deck.map(
                      (item: any) => {
                        const name =
                          item?.name != "empty"
                            ? `(${item.name})`
                            : "__empty__";
                        const serialId = item?.serialId || "e";
                        return `${name} \`${serialId}\``;
                      }
                    );

                    embedDeck.setDescription(
                      `**__DECK__**:${formattedDescription.join("   |   ")}`
                    );

                    await deckEmbedMessage.edit({
                      content: "Deck auto-selected successfully!",
                      embeds: [embedDeck],
                      components: [deckButtons, deckOptionSelectRow],
                    });
                  } else if (selectedValue === "go_back") {
                    deckEmbedMessage.delete();
                    sentMessage.edit({
                      embeds: [initialEmbed],
                      components: [initialRow],
                    });
                  }
                }
              }
            });
          }
        } else if (i.customId.startsWith("race_select")) {
          selectedRaceValue = i.values[0];
          console.log(
            "Selected race value from race_select:",
            selectedRaceValue
          );
          if (selectedRaceValue.startsWith("race-")) {
            const raceName = selectedRaceValue.replace("race-", "");
            console.log("Race name:", raceName);
            console.log("Race description:", racesData[raceName]?.description);
            const raceFields = {
              name: `Race: ${raceName}`,
              value:
                racesData[raceName]?.description || "Description not available",
              inline: false,
            };

            abilityOne = racesData[raceName]?.abilities[0];
            abilityTwo = racesData[raceName]?.abilities[1];
            const abilityDescFieldOne = {
              name: `${racesData[raceName]?.abilities[0]}:`,
              value:
                abilitiesData[abilityOne]?.description || "weak, no ability",
              inline: false,
            };
            const abilityDescFieldTwo = {
              name: `${racesData[raceName]?.abilities[1]}:`,
              value:
                abilitiesData[abilityTwo]?.description || "weak, no ability",
              inline: false,
            };
            updateEmbed = new EmbedBuilder()
              .setTitle(`Pick ${raceName} Race?`)
              .setDescription(
                "Use the buttons to navigate through the options."
              )
              .addFields(raceFields, abilityDescFieldOne, abilityDescFieldTwo);
            await sentMessage.edit({
              embeds: [updateEmbed],
              components: [selectRow, raceRow, initialRow],
            });
          }
        } else if (i.customId === "select_race_button") {
          if (selectedRaceValue.startsWith("race-")) {
            const raceName = selectedRaceValue.replace("race-", "");
            playerData.race = raceName;
            await updateRace("race-updated", raceName);
            await (message.channel as any).send(
              `You've selected the race: ${raceName}`
            );
            sentMessage.edit({ components: [initialRow] });
          }
        } else if (i.customId.startsWith("class_select")) {
          selectedClassValue = i.values[0];
          console.log("Selected class value:", selectedClassValue);
          if (selectedClassValue.startsWith("class-")) {
            const className = selectedClassValue.replace("class-", "");
            console.log("Class name:", className);
            updateEmbed = new EmbedBuilder()
              .setTitle(`Pick ${className} Class?`)
              .setDescription(
                "Use the buttons to navigate through the options."
              );
            await sentMessage.edit({
              embeds: [updateEmbed],
              components: [selectRow2, classRow, initialRow],
            });
          }
        } else if (i.customId === "select_class_button") {
          if (selectedClassValue.startsWith("class-")) {
            const className = selectedClassValue.replace("class-", "");
            playerData.class = className;
            await updateClass("class-updated", className);
            await (message.channel as any).send(
              `You've selected the class: ${className}`
            );
            sentMessage.edit({ components: [initialRow] });
          }
        }
      } catch (error) {
        console.error("An error occurred:", error);
        (message.channel as any).send(
          "An error occurred while processing your selection."
        );
      }
    });

    async function handleSelectRace(
      interaction: Interaction,
      sentMessage: Message
    ): Promise<void> {
      const raceFields = raceOptions.map((raceOption) => {
        const raceName = raceOption.value.replace("race-", "");
        return {
          name: `Race: ${raceName}`,
          value:
            racesData[raceName]?.description || "Description not available",
          inline: false,
        };
      });

      const switchSelectMenu = new StringSelectMenuBuilder()
        .setCustomId("initial_select")
        .setPlaceholder("Switch to another selection")
        .addOptions([
          { label: "Select Class", value: "select_class" },
          { label: "Select Familiar", value: "select_familiar" },
        ]);

      const switchRow: any = new ActionRowBuilder().addComponents(
        switchSelectMenu
      );

      const raceEmbed = new EmbedBuilder()
        .setTitle("Pick a Race to advance forward!")
        .setDescription("Use the buttons to navigate through the options.")
        .addFields(...raceFields);

      await sentMessage.edit({
        embeds: [raceEmbed],
        components: [raceRow, switchRow],
      });
    }

    async function handleSelectClass(
      interaction: Interaction,
      sentMessage: Message
    ): Promise<void> {
      const classOptions = Object.keys(classesData).map((className) => ({
        label: className,
        value: `class-${className}`,
      }));

      const classFields = classOptions.map((classOption) => {
        const className = classOption.value.replace("class-", "");
        return {
          name: `Class: ${className}`,
          value:
            classesData[className]?.description || "Description not available",
          inline: false,
        };
      });

      const switchSelectMenu = new StringSelectMenuBuilder()
        .setCustomId("initial_select")
        .setPlaceholder("Switch to another selection")
        .addOptions([
          { label: "Select Race", value: "select_race" },
          { label: "Select Familiar", value: "select_familiar" },
        ]);

      const switchRow = new ActionRowBuilder().addComponents(switchSelectMenu);

      const classEmbed = new EmbedBuilder()
        .setTitle("Select Your Class")
        .setDescription("Use the buttons to navigate through the options.")
        .addFields(...classFields);

      await sentMessage.edit({
        embeds: [classEmbed],
        components: [classRow, switchRow],
      });
    }

    async function handleSelectFamiliar(
      interaction: Interaction,
      sentMessage: Message
    ): Promise<void> {
      let messageja;
      const familiars = playerData.cards.name;

      if (familiars.length === 0) {
        console.log("You have no familiars to select.");
        (message.channel as any).send("You have no familiars to select.");
        return;
      }
      const options = familiars.map((familiar: any) => {
        if (familiar) {
          return {
            label: familiar,
            value: familiar,
          };
        }
      });

      let selectMenu;
      if (familiars.length < 2) {
        selectMenu = new StringSelectMenuBuilder()
          .setCustomId("select_familiars")
          .setMinValues(1)
          .setPlaceholder("Select up to 3 familiars")
          .addOptions(options);
      } else if (familiars.length < 3 && familiars.length > 1) {
        selectMenu = new StringSelectMenuBuilder()
          .setCustomId("select_familiars")
          .setMinValues(1)
          .setMaxValues(2)
          .setPlaceholder("Select up to 3 familiars")
          .addOptions(options);
      } else {
        selectMenu = new StringSelectMenuBuilder()
          .setCustomId("select_familiars")
          .setMinValues(1)
          .setMaxValues(3)
          .setPlaceholder("Select up to 3 familiars")
          .addOptions(options);
      }

      const row = new ActionRowBuilder().addComponents(selectMenu);

      const switchSelectMenu = new StringSelectMenuBuilder()
        .setCustomId("initial_select")
        .setPlaceholder("Switch to another selection")
        .addOptions([
          { label: "Select Race", value: "select_race" },
          { label: "Select Class", value: "select_class" },
        ]);

      const switchRow: any = new ActionRowBuilder().addComponents(
        switchSelectMenu
      );

      let embed = new EmbedBuilder()
        .setTitle("Select up to 3 familiars:")
        .setDescription("Select up to 3 familiars to help you on your journey.")
        .setColor("#00FFFF");

      await sentMessage.edit({
        components: [switchRow],
      });
      messageja = await (message.channel as any).send({
        embeds: [embed],
        components: [row],
      });

      const filterr = (interaction: any) => {
        return (
          interaction.customId === "select_familiars" &&
          interaction.user.id === message.author.id
        );
      };

      const collector = messageja.createMessageComponentCollector({
        filter: filterr,
        time: 60000,
      });

      collector.on("collect", async (interaction: any) => {
        try {
          let selectedFamiliars: string[] = [];
          const selectedValues = interaction.values;
          selectedFamiliars = selectedValues;

          selectMenu.setOptions(
            familiars.map((familiar: any) => {
              const isSelected = selectedValues.includes(familiar);
              return { label: familiar, value: familiar, default: false };
            })
          );
          console.log("selectedFamiliars:", selectedFamiliars);
          const selectedFamiliarsArray: string[][] = [];
          selectedFamiliarsArray.push(selectedFamiliars);
          console.log("sfArray:", selectedFamiliarsArray);

          (message.channel as any).send(
            `You have selected: ${selectedFamiliars.join(
              ", "
            )} as your familiars!`
          );
          await updateFamiliar("adyuga", selectedFamiliarsArray);

          interaction.update({
            embeds: [embed],
            components: [new ActionRowBuilder().addComponents(selectMenu)],
          });
          setTimeout(() => {
            messageja.delete();
          }, 5000);
        } catch (err) {
          console.error("Error updating player data:", err);
        }
      });

      collector.on("end", () => {
        // Update the player's data with the selected familiars
      });
    }

    async function updateFamiliar(
      playerIdee: string,
      className: string[][]
    ): Promise<void> {
      const selektFam = className;
      console.log("selectfam:", selektFam);

      try {
        if (!playerData.selectedFamiliars) {
          playerData.selectedFamiliars = { name: selektFam.flat() };
        } else if (playerData.selectedFamiliars.name) {
          playerData.selectedFamiliars.name = selektFam.flat();
        }
        if (playerData) {
          console.log("playerData:", playerData);
          const updates = {
            $set: { selectedFamiliars: playerData.selectedFamiliars },
          };
          console.log("rewards.xpereince:", playerData.selectedFamiliars);
          await collection.updateOne(filter, updates);
        }
      } catch (error) {
        console.error("An error occurred:", error);
        (message.channel as any).send(
          "An error occurred while processing your selection."
        );
      }
    }

    //interactionCreate!

    client.on("interactionCreate", async (interaction: any) => {
      if (!interaction.isModalSubmit()) return;

      const inputValues: string = interaction.fields.getTextInputValue(
        `input-${interaction.customId.split("-")[1]}`
      );

      if (interaction.customId === "modal-fast_select") {
        const inputs = inputValues.split(" ");
        playerData.deck = [];
        for (let i = 0; i < 4; i++) {
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

              if (filledSlotsCount >= 3) {
                await interaction.reply({
                  content: `You can only have 3 familiars in your deck. Please ensure the remaining is the player.`,
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

            if (filledSlotsCount >= 3) {
              await interaction.reply({
                content: `You can only have 3 familiars in your deck. Please ensure the remaining is the player.`,
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
            element: theElement.element,
            stats: theElement.stats,
            move: theElement.move,
            ability: theElement.ability,
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

      const formattedDescription = playerData.deck.map((item: any) => {
        const name = item?.name != "empty" ? `(${item.name})` : "__empty__";
        const serialId = item?.serialId || "e";
        return `${name} \`${serialId}\``;
      });

      embedDeck.setDescription(
        `**__DECK__**: ${formattedDescription.join("   |   ")}`
      );

      await collection.updateOne(filter, { $set: { deck: playerData.deck } });

      await interaction.update({
        embeds: [embedDeck],
        components: [deckButtons, deckOptionSelectRow],
      });
    });

    async function updateRace(status: string, raceName: string) {
      await collection.updateOne(
        { _id: message.author.id },
        {
          $set: { race: raceName, raceStatus: status },
        }
      );
    }

    async function updateClass(status: string, className: string) {
      await collection.updateOne(
        { _id: message.author.id },
        {
          $set: { class: className, classStatus: status },
        }
      );
    }
  },
};
export default selectAllCommand;
