import {
  Message,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  StringSelectMenuBuilder,
  TextChannel,
} from "discord.js";
import { mongoClient } from "../../../../data/mongo/mongo";
import { Location, Floor, allFloors } from "../../../data/information/loc";
import { handleNavigation } from "./navigation";
import { quests } from "../../quest/quests";
import { bosses } from "../../../data/monsterInfo/bosses";

const areaImage = "src/commands/data/information/area2.png";

export class Adventure {
  private client: any;

  constructor(client: any) {
    this.client = client;
  }

  setupCollector(
    message: Message<boolean>,
    initialMessage: any,
    player: any,
    selectedLocation: Location,
    selectedFloor: Floor,
    stringMenuRow: any
  ) {
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
    const confirmationRowTwo = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("go_in")
        .setLabel("Lets Dive into it")
        .setStyle(1)
    );

    const filter = (i: any) =>
      [
        "start_adventure",
        "cancel_adventure",
        "go_in",
        "option_select",
      ].includes(i.customId) || i.customId.startsWith("klik_");

    const collector = initialMessage.createMessageComponentCollector({
      filter,
      time: 300000,
    });

    collector.on("collect", async (i: any) => {
      try {
        if (!i.isButton()) return;
        await i.deferUpdate();
        if (i.customId === "start_adventure") {
          await initialMessage.edit({
            embeds: [adventureIntoEmbedConfirmation],
            components: [stringMenuRow, confirmationRowTwo],
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
          content: "An error occurred while processing your action.",
          ephemeral: true,
        });
      }
    });
    collector.on("collect", async (i: any) => {
      try {
        if (!i.isStringSelectMenu()) return;
        let selectedValue: any;
        if (i.customId.startsWith("option_select")) {
          i.deferUpdate();
          selectedValue = i.values[0]; // Get the selected value // gae shit

          if (selectedValue.startsWith("klik_")) {
            console.log("bro clicked fr??:", selectedValue);
            const selectedValueName = selectedValue.replace("klik_", "");
            if (selectedValueName === "quests") {
              // Create options for classes
              const questEmbed = new EmbedBuilder()
                .setColor(0x992e22)
                .setDescription(
                  "More info About the available quests in this area!"
                );

              const availableQuests = selectedLocation.quests.map(
                (questName) => quests[questName]
              );

              // Iterate over the available quests and modify the embed fields
              availableQuests.forEach((quest, index) => {
                // Modify the existing fields or add new ones to the embedBuilder
                questEmbed.addFields({
                  name: ` ${index + 1} • ${quest.title}`,
                  value: `Objective: ${quest.objectives}\nRewards: ${
                    quest.rewards[0].experience
                  } XP, ${quest.rewards[0].items.join(", ")}`,
                  inline: false,
                });
              });

              // Now, you can edit the original message with the updated embedBuilder
              initialMessage.edit({
                content: "",
                embeds: [questEmbed],
                components: [stringMenuRow], // Assuming you have navigationRow defined
              });
            } else if (selectedValueName === "bosses") {
              // Create options for classes
              const questEmbed = new EmbedBuilder()
                .setColor(0x992e22)
                .setDescription(
                  "More info About the available Bosses in this area!"
                );

              const availableBosses = selectedLocation.bosses.map(
                (bossName) => bosses[bossName]
              );

              // Iterate over the available quests and modify the embed fields
              availableBosses.forEach((boss, index) => {
                // Modify the existing fields or add new ones to the embedBuilder
                questEmbed.addFields({
                  name: ` ${index + 1} • ${boss.name}`,
                  value: `> Physical Stats:\n > HP: ${boss.stats.hp} • ATK: ${
                    boss.stats.attack
                  } • DEF: ${boss.stats.defense} • SPD: ${
                    boss.stats.speed
                  }\n > Magial Stats: \n > MANA: ${
                    boss.stats.mana
                  }\n > Abilities: ${boss.abilities
                    .map((abil) => `\`${abil}\``)
                    .join(",  ")}\n > Attack Pattern: ${boss.attackPattern
                    .map((atakPat) => `\'${atakPat}\'`)
                    .join(",  ")}`,
                  inline: false,
                });
              });
              // \n  Rewards: ${boss.rewards[0].experience} XP, ${boss.rewards[0].items.join(', ')}
              // Now, you can edit the original message with the updated embedBuilder
              initialMessage.edit({
                content: "",
                embeds: [questEmbed],
                components: [stringMenuRow], // Assuming you have navigationRow defined
              });
            } else if (selectedValueName === "adventure") {
              initialMessage.edit({
                content: `You are at: ${selectedLocation.name}\nDescription: ${selectedLocation.description}`,
                embeds: [adventureIntoEmbedConfirmation],
                components: [stringMenuRow, confirmationRowTwo],
              });
            }
          }
        }
      } catch (error) {
        console.error("An error occurred:", error);
        await i.reply({
          content: "An error occurred while processing your action.",
          ephemeral: true,
        });
      }
    });

    collector.on("end", async () => {
      if (initialMessage.components.length > 0) {
        await initialMessage.edit({ components: [] });
      }
    });
  }
}
