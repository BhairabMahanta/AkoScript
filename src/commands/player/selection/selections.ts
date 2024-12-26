import {
  ActionRowBuilder,
  ButtonBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  EmbedBuilder,
  Message,
  Interaction,
  TextChannel,
} from "discord.js";
import mongoose from "mongoose";
import { playerModel } from "../../../data/mongo/playerschema";
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
      ]);

    const initialRow = new ActionRowBuilder().addComponents(initialSelectMenu);

    const initialEmbed = new EmbedBuilder()
      .setTitle("Select Your Race, Class, and Familiars")
      .setDescription("Choose an option to start:");

    let sentMessage = await (message.channel as any).send({
      embeds: [initialEmbed],
      components: [initialRow],
    });

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
      ].includes(i.customId) && i.user.id === message.author.id;

    const collector = sentMessage.createMessageComponentCollector({
      filter: filterInteraction,
      time: 300000,
    });

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
