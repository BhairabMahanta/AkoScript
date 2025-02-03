import fs from "fs";
import {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  Message,
  TextChannel,
  Interaction,
  ButtonInteraction,
  StringSelectMenuInteraction,
} from "discord.js";
import { quests } from "./quests";
import path from "path";
import { QuestLogic } from "./questLogic";
import { Command } from "../../../@types/command";

// Define types for player data and active/completed quests
interface PlayerData extends Player {
  completedQuests?: Record<string, CompletedQuestDetails>;
}

import { ActiveQuest } from "./questLogic";
export interface CompletedQuestDetails extends ActiveQuest {
  questStatus: "completed" | "failed";
}

const playersFilePath: string = path.join(
  __dirname,
  "..",
  "..",
  "..",
  "data",
  "players.json"
);

import { ExtendedClient } from "../../..";
import { Player } from "../../../data/mongo/playerschema";
import { mongoClient } from "../../../data/mongo/mongo";
let startingThisQuest: any | null = null;
let embed: any | undefined;
let row: any | undefined;
let row2: any | undefined;
let sentMessage: any;
const backRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
  new ButtonBuilder().setStyle(1).setLabel("Go back").setCustomId("back")
);
const db = mongoClient.db("Akaimnky");
const myQuestsCommand: Command = {
  name: "myquests",
  description: "View your selected quests",
  aliases: ["mq", "mqs"],
  async execute(
    client: ExtendedClient,
    message: Message<boolean>,
    args: string[]
  ): Promise<void> {
    const playerId = message.author.id;
    const collection: any = db.collection("akaillection");
    const dbFilter = { _id: playerId };
    const dbData: PlayerData = await collection.findOne(dbFilter);
    let actionRow: any | undefined;

    if (!dbData || !dbData.quests) {
      await (message.channel as TextChannel).send("You have no quests yet.");
      return;
    }

    const datEmbed = new EmbedBuilder()
      .setTitle("Quest Menu")
      .setDescription("This is the mooltiverse of quests boi");

    // Create a select menu with quest options
    const selectMainMenu = new StringSelectMenuBuilder()
      .setCustomId("select_menu")
      .setPlaceholder("Select An Option")
      .addOptions([
        { label: "Available Quests", value: "klik_my" },
        { label: "Active Quests", value: "klik_active" },
        { label: "Expired Quests", value: "klik_expire" },
        { label: "Finished Quests", value: "klik_finished" },
      ]);

    const questList = dbData.quests;
    console.log("questLIST: ", questList);
    const activeQuestList = dbData.activeQuests || {};
    const completeList = dbData.completedQuests || {};

    console.log("activeQuestList:", activeQuestList);
    console.log("completedQuests:", completeList);

    // Function to build the "My Quests" embed
    async function buildMyQuestsEmbed(
      questList: string[],
      quests: Record<string, any>
    ) {
      embed = new EmbedBuilder()
        .setTitle("My Quests")
        .setDescription(
          "### Select a quest from the list below to view details:"
        );

      // Populate the fields with the list of quests
      questList.forEach((questName, index) => {
        const questDetails = quests[questName];
        embed.addFields({
          name: `${index + 1}. ${questDetails.title}`,
          value: `>>> ${questDetails.description}`,
          inline: false,
        });
      });

      return embed;
    }

    const mainEmbed = new EmbedBuilder()
      .setTitle("Quest Menu")
      .setDescription("Select a category to proceed.");
    questList.map((quest, index) => {
      console.log("Quest:", quest);
    });

    const questSelectMenu = new StringSelectMenuBuilder()
      .setCustomId("select_quest")
      .setPlaceholder("Select a Quest")

      .addOptions(
        questList.map((quest, index) => ({
          label: `${index + 1}. ${quests[quest].title}`,
          value: quest,
        }))
      );

    const activeQuestOptions = Object.keys(activeQuestList).length
      ? Object.keys(activeQuestList).map((quest, index) => ({
          label: `${index + 1}. ${quests[quest].title}`,
          value: quest,
        }))
      : [
          {
            label: "No Active Quests",
            value: "none",
          },
        ];

    const activeQuestSelectMenu = new StringSelectMenuBuilder()
      .setCustomId("select_active")
      .setPlaceholder("Select to view further details")
      .addOptions(activeQuestOptions);

    actionRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      selectMainMenu
    );

    // Send the initial embed with the select menu
    sentMessage = await (message.channel as TextChannel).send({
      embeds: [mainEmbed],
      components: [actionRow],
    });

    console.log("Quest menu sent successfully.");

    // Collector to handle user interactions
    const filter = (i: Interaction) => i.user.id === playerId;
    const collector = sentMessage.createMessageComponentCollector({
      filter,
      time: 300000, // 5 minutes
    });

    collector.on(
      "collect",
      async (interaction: StringSelectMenuInteraction) => {
        await interaction.deferUpdate();
        const click = interaction.values ? interaction.values[0] : "none";
        console.log("click", click);
        const selectedOption = click.replace("klik_", "");
        if (selectedOption === "my") {
          console.log("Building 'My Quests' menu...");
          const myQuestsEmbed = await buildMyQuestsEmbed(questList, quests);
          const row =
            new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
              questSelectMenu
            );
          const backButton =
            new ActionRowBuilder<ButtonBuilder>().addComponents(
              new ButtonBuilder()
                .setStyle(1)
                .setLabel("Go Back")
                .setCustomId("back")
            );

          sentMessage.edit({
            embeds: [myQuestsEmbed],
            components: [row, backButton],
          });
        } else if (selectedOption === "active") {
          console.log("Displaying active quests...");
          const activeQuestsEmbed = new EmbedBuilder()
            .setTitle("Active Quests")
            .setDescription("These are your active quests!");

          if (Object.keys(activeQuestList).length === 0) {
            activeQuestsEmbed.addFields({
              name: "No Active Quests",
              value: "You don't have any active quests at the moment.",
              inline: false,
            });
          } else {
            Object.keys(activeQuestList).forEach((questName, index) => {
              const questDetails = quests[questName];
              activeQuestsEmbed.addFields({
                name: `${index + 1}. ${questDetails.title}`,
                value: `>>> ${questDetails.description}`,
                inline: false,
              });
            });
          }

          const row =
            new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
              activeQuestSelectMenu
            );
          const backButton =
            new ActionRowBuilder<ButtonBuilder>().addComponents(
              new ButtonBuilder()
                .setStyle(1)
                .setLabel("Go Back")
                .setCustomId("back")
            );

          sentMessage.edit({
            embeds: [activeQuestsEmbed],
            components: [row, backButton],
          });
        } else if (selectedOption === "expired") {
          console.log("Displaying expired quests...");
          const expiredQuestsEmbed = new EmbedBuilder()
            .setTitle("Expired Quests")
            .setDescription(
              "These quests have expired. You missed completing them!"
            );

          let questCount = 1;
          let hasExpiredQuests = false;

          Object.keys(completeList).forEach((questName) => {
            const questDetails = completeList[questName];
            const questData = quests[questName];

            if (questDetails.questStatus === "failed") {
              expiredQuestsEmbed.addFields({
                name: `${questCount}. ${questData.title}`,
                value: `>>> ${questData.description}`,
                inline: false,
              });
              questCount++;
              hasExpiredQuests = true;
            }
          });

          if (!hasExpiredQuests) {
            expiredQuestsEmbed.addFields({
              name: "No Expired Quests",
              value: "You have not failed any quests yet.",
              inline: true,
            });
          }
          const backButton = new ButtonBuilder()
            .setStyle(1)
            .setLabel("Go back")
            .setCustomId("back");

          row2 = backButton;

          const failedMenuOptions = Object.keys(completeList)
            .map((quest, index) => {
              if (completeList[quest].questStatus === "failed") {
                return {
                  label: `${index + 1}. ${quests[quest].title}`,
                  value: quest,
                };
              }
            })
            .filter(
              (option): option is { label: string; value: string } =>
                option !== undefined
            );

          const failedMenu = new StringSelectMenuBuilder()
            .setCustomId("select_failed")
            .setPlaceholder("Select to view further details.");

          if (failedMenuOptions.length > 0) {
            failedMenu.addOptions(failedMenuOptions);
          } else {
            failedMenu.addOptions({
              label: "None",
              value: "nonexistent",
            });
          }

          row = new ActionRowBuilder().addComponents(failedMenu);
          row2 = new ActionRowBuilder().addComponents(backButton);

          await sentMessage.edit({
            embeds: [expiredQuestsEmbed],
            components: [row, row2],
          });
        } else if (click === "finished") {
          const completedEmbed = new EmbedBuilder()
            .setTitle("Finished Quests")
            .setDescription(
              "Here are the quests you have successfully completed."
            );

          const completedMenuOptions = Object.keys(completeList)
            .map((quest, index) => {
              if (completeList[quest].questStatus === "completed") {
                return {
                  label: `${index + 1}. ${quests[quest].title}`,
                  value: quest,
                };
              }
            })
            .filter(
              (option): option is { label: string; value: string } =>
                option !== undefined
            );

          const completedMenu = new StringSelectMenuBuilder()
            .setCustomId("select_completed")
            .setPlaceholder("Select to view further details.");

          if (completedMenuOptions.length > 0) {
            completedMenu.addOptions(completedMenuOptions);
          } else {
            completedMenu.addOptions({
              label: "None",
              value: "nonexistent",
            });
          }

          const backButton = new ButtonBuilder()
            .setStyle(1)
            .setLabel("Go back")
            .setCustomId("back");

          row = new ActionRowBuilder().addComponents(completedMenu);
          row2 = new ActionRowBuilder().addComponents(backButton);

          await sentMessage.edit({
            embeds: [completedEmbed],
            components: [row, row2],
          });
        } else if (interaction.customId === "select_quest") {
          const selectedQuest = interaction.values[0];
          const questDetails = quests[selectedQuest];
          startingThisQuest = questDetails;
          embed.setFields(
            {
              name: "Quest Name:",
              value: questDetails.title,
              inline: false,
            },
            {
              name: "Quest Objective:",
              value: questDetails.description,
              inline: false,
            },
            {
              name: "Quest Time Limit:",
              value: `${questDetails.timeLimit} Days`,
              inline: false,
            }
          );

          const backButton = new ButtonBuilder()
            .setStyle(1)
            .setLabel("Go back")
            .setCustomId("back");

          const startButton = new ButtonBuilder()
            .setStyle(1)
            .setLabel("Start Quest")
            .setCustomId("start_quest");

          row2 = new ActionRowBuilder().addComponents(backButton, startButton);

          await sentMessage.edit({ embeds: [embed], components: [row2] });
        } else if (
          interaction.isStringSelectMenu() &&
          interaction.customId === "select_active"
        ) {
          const selectedQuest = interaction.values[0];
          const questDetails = activeQuestList[selectedQuest];
          const questDetails2 = quests[selectedQuest];

          const activeEmbed = new EmbedBuilder()
            .setTitle("Active Quest Details")
            .setDescription(`### ${questDetails2.title}'s Details`);

          questDetails.objectives.forEach((objective: any, index: number) => {
            activeEmbed.addFields({
              name: `Objective ${index + 1}:`,
              value: `>>> Objective Description:\n **${objective.description}**\nObjective Target - **${objective.target}**\nObjective Required: **${objective.required}**\nObjective Current: **${objective.current}**`,
              inline: true,
            });
          });

          activeEmbed.addFields(
            {
              name: "Quest Name:",
              value: `>>> ${questDetails2.title}`,
              inline: false,
            },
            {
              name: "Quest Time Limit vs Time Left:",
              value: `>>> Time limit: ${questDetails.timeLimit.totalDays} Days\n Time left: <t:${questDetails.timeLimit.daysLeft}:R>`,
              inline: false,
            }
          );

          await sentMessage.edit({
            embeds: [activeEmbed],
            components: [backRow],
          });
        }

        if (interaction.customId === "start_quest") {
          const embed = new EmbedBuilder()
            .setTitle("Started Quest!")
            .setDescription(
              '### You can view quest details and real-time information through "a!myquest" '
            );
          await sentMessage.edit({ embeds: [embed], components: [backRow] });

          const startQuest = new QuestLogic(
            message,
            interaction,
            sentMessage,
            embed,
            row,
            backRow,
            dbData,
            collection
          );
          startQuest.startQuest(startingThisQuest.id);
        } else if (interaction.customId === "back") {
          await sentMessage.edit({
            embeds: [mainEmbed],
            components: [actionRow],
          });
        }
      }
    );

    collector.on("end", () => {
      sentMessage.edit({ components: [] });
    });
  },
};
export default myQuestsCommand;
