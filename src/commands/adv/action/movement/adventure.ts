import {
  Client,
  Message,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  StringSelectMenuBuilder,
  Interaction,
  TextChannel,
} from "discord.js";

import { quests } from "../../quest/quests";
import { bosses } from "../../../data/monsterInfo/bosses";
// import { mobs } from './mobs'; // Import mob data

import sharp from "sharp";
import { handleNavigation, navigationRow } from "./navigation";
import {
  Location,
  Floor,
  floor1,
  floor2,
  allFloors,
} from "../../../data/information/loc";
import { Command } from "../../../../@types/command";
import { mongoClient } from "../../../../data/mongo/mongo";

const areaImage = "src/commands/data/information/area2.png";
import { ExtendedClient } from "../../../..";
const adventureCommand: Command = {
  name: "adventure",
  description: "Start an adventure!",
  aliases: ["a", "adv"],
  async execute(
    client: ExtendedClient,
    message: Message<boolean>,
    args: string[]
  ): Promise<void> {
    const db = mongoClient.db("Akaimnky");
    const collection: any = db.collection("akaillection");
    // Define the filter based on the _id
    const dbFilter = { _id: message.author.id };
    const player = await collection.findOne(dbFilter);
    if (!player) {
      (message.channel as TextChannel).send("You have to register first!");
      return;
    }

    const playerName = player.name;

    const playerFloorIndex = 0; // Replace with the actual floor index for the player
    const playerLocationIndex = 0; // Replace with the actual location index for the player

    const selectedFloor = allFloors[playerFloorIndex];
    const selectedLocation = selectedFloor.locations[playerLocationIndex];

    const adventureConfirmEmbed = new EmbedBuilder()
      .setTitle("Adventure Confirmation")
      .setDescription("Would you like to start an adventure?");

    const confirmationRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("start_adventure")
        .setLabel("Yes")
        .setStyle(3),
      new ButtonBuilder()
        .setCustomId("cancel_adventure")
        .setLabel("No")
        .setStyle(4)
    );

    const confirmationRowTwo =
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("go_in")
          .setLabel("Let’s Dive into it")
          .setStyle(1)
      );
    const optionSelectMenu = new StringSelectMenuBuilder()
      .setCustomId("option_select")
      .setPlaceholder("Select an option")
      .addOptions([
        { label: "Quests", value: "klik_quests" },
        { label: "Bosses", value: "klik_bosses" },
        { label: "Mobs", value: "klik_mobs" },
        { label: "Go into the Adventure", value: "klik_adventure" },
      ]);
    const stringMenuRow =
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        optionSelectMenu
      );
    const initialMessage = await (message.channel as TextChannel).send({
      embeds: [adventureConfirmEmbed],
      components: [confirmationRow],
    });

    const adventureEmbed = new EmbedBuilder()
      .setTitle(selectedLocation.name)
      .setDescription("Know what this journey of yours has to offer!")
      .addFields(
        {
          name: "**Quests**",
          value: selectedLocation.quests
            .map((quest) => `'${quest}'`)
            .join(", "),
          inline: false,
        },
        {
          name: "**Bosses**",
          value: selectedLocation.bosses
            .map((boss) => `\`${boss}\``)
            .join(", "),
          inline: false,
        },
        {
          name: "**Mobs**",
          value: `${selectedLocation.mobs.join("\n")}`,
          inline: false,
        },
        {
          name: "**Adventure**",
          value: "Go on the Adventure Lad!",
          inline: false,
        },
        {
          name: "**Difficulty**",
          value: `${selectedLocation.difficulty}`,
          inline: false,
        }
      );

    const adventureIntoEmbedConfirmation = new EmbedBuilder()
      .setTitle(selectedLocation.name)
      .setDescription(
        "Do you want to go in? If you had any saved progress, you will spawn right there!"
      )
      .addFields(
        {
          name: "**Player Level**",
          value: ` \`\`Level: ${player.exp.level}\`\`, Username: __${player.name}__ `,
          inline: false,
        },
        {
          name: "**Level Restriction and Level Suggestion**",
          value: `Area only for \`\`Level ${selectedLocation.requiredLevel}\`\` and Above!\n Suggested Level for this area is 'makeLevelSuggestion'`,
          inline: false,
        },
        {
          name: "**Party recommended**",
          value: `${selectedLocation.mobs.join("\n")}`,
          inline: false,
        },
        {
          name: "**Automate this adventure?**",
          value:
            "You can automatically finish an adventure if you reach 100% discovery in that area and fulfill a few other requirements!!",
          inline: false,
        },
        {
          name: "**Start Adventuring?**",
          value: 'To start, click on the "Let’s Dive into it" button!!',
          inline: false,
        },
        {
          name: "**Difficulty**",
          value: `${selectedLocation.difficulty}`,
          inline: false,
        }
      );

    const filter = (i: any) =>
      [
        "start_adventure",
        "cancel_adventure",
        "option_select",
        "go_in",
      ].includes(i.customId);

    const collector = initialMessage.createMessageComponentCollector({
      filter,
      time: 300000, // 5 minutes
    });

    collector.on("collect", async (i) => {
      try {
        if (!i.isButton() && !i.isStringSelectMenu()) return;
        i.deferUpdate();
        if (i.customId === "start_adventure") {
          await initialMessage.edit({
            embeds: [adventureEmbed],
            components: [stringMenuRow],
          });
        } else if (i.customId === "go_in") {
          collector.stop();
          handleNavigation(
            allFloors,
            i,
            adventureIntoEmbedConfirmation,
            initialMessage,
            areaImage,
            player
          );
        } else if (i.isStringSelectMenu()) {
          const selectedValue = i.values[0];
          if (selectedValue === "klik_quests") {
            await i.reply({
              content: `Here are the quests available: ${selectedLocation.quests.join(
                ", "
              )}`,
              ephemeral: true,
            });
          } else if (selectedValue === "klik_bosses") {
            await i.reply({
              content: `These are the bosses in this area: ${selectedLocation.bosses.join(
                ", "
              )}`,
              ephemeral: true,
            });
          } else if (selectedValue === "klik_mobs") {
            await i.reply({
              content: `Mobs in this area include: ${selectedLocation.mobs.join(
                ", "
              )}`,
              ephemeral: true,
            });
          } else if (selectedValue === "klik_adventure") {
            await initialMessage.edit({
              embeds: [adventureIntoEmbedConfirmation],
              components: [confirmationRowTwo],
            });
          }
        } else if (i.customId === "cancel_adventure") {
          await i.update({
            content: "Adventure canceled!",
            embeds: [],
            components: [],
          });
          collector.stop();
        }
      } catch (error) {
        console.error("An error occurred:", error);
        await i.reply({
          content:
            "An error occurred while processing your action. Please try again.",
          ephemeral: true,
        });
      }
    });

    collector.on("end", async () => {
      if (initialMessage.components.length > 0) {
        await initialMessage.edit({ components: [] });
      }
    });
  },
};

export default adventureCommand;
