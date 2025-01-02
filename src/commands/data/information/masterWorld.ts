import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Message,
  StringSelectMenuBuilder,
  TextChannel,
} from "discord.js";
import { Command } from "../../../@types/command";
import { ExtendedClient } from "../../..";
import { Scenario, scenarios } from "../../../data/information/scenarios";
import { mongoClient } from "../../../data/mongo/mongo";
import {
  createFloorSelectMenu,
  generateEmbed,
  generateFloorDetailsEmbed,
} from "./mapFunctions";
import Battle from "../../adv/action/battle/battle";
import { Enemy } from "../../adv/action/battle/battle";

const db = mongoClient.db("Akaimnky");
const collection: any = db.collection("worldMapCollection");
const collection2: any = db.collection("akaillection");
const masterCommand: Command = {
  name: "masterCommand",
  description: "Configure/fight most things about the scenarios.",
  aliases: ["mc"],
  async execute(
    client: ExtendedClient,
    message: Message<boolean>,
    args: string[]
  ): Promise<void> {
    const playerId = message.author.id;
    let playerProgress = await collection.findOne({
      playerId,
    });
    let playerData = await collection2.findOne({
      playerId,
    });

    const scenario = scenarios[0]; // Default first scenario
    const progress = playerProgress?.progress.find(
      (p: any) => p.scenarioId === scenario.id
    );

    const embed = generateEmbed(scenario, progress, 0x00ff00);

    const regionSelectMenu =
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("select-region")
          .setPlaceholder("Select a region")
          .addOptions(
            scenarios.map((s: Scenario) => ({
              label: s.name,
              description: s.description,
              value: s.id,
            }))
          )
      );

    const firstFloorSelectMenu = createFloorSelectMenu(scenarios[0]);

    const floorButtons = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("start-floor")
        .setLabel("Start Floor")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("floor-strategies")
        .setLabel("Floor Strategies")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("leaderboards")
        .setLabel("Leaderboards")
        .setStyle(ButtonStyle.Primary)
    );

    const sentMessage = await (message.channel as TextChannel).send({
      embeds: [embed],
      components: [regionSelectMenu, firstFloorSelectMenu, floorButtons],
    });

    const filter = (interaction: any) =>
      interaction.user.id === message.author.id;
    const collector = sentMessage.createMessageComponentCollector({
      filter,
      time: 600000,
    });
    let selectedScenario: any;
    collector.on("collect", async (interaction) => {
      if (interaction.isStringSelectMenu()) {
        if (interaction.customId === "select-region") {
          const selectedScenarioId = interaction.values[0];
          selectedScenario = scenarios.find(
            (s: Scenario) => s.id === selectedScenarioId
          );
          console.log("scenario", selectedScenario.id);
          const selectedProgress = playerProgress?.progress.find(
            (p: any) => p.scenarioId === selectedScenarioId
          );
          const selectedFloorSelectMenu = createFloorSelectMenu(
            selectedScenario ? selectedScenario : scenarios[0]
          );
          const updatedEmbed = generateEmbed(
            selectedScenario ? selectedScenario : scenarios[0],
            selectedProgress,
            selectedProgress ? 0x00ff00 : 0xff0000
          );

          await interaction.update({
            embeds: [updatedEmbed],
            components: [
              regionSelectMenu,
              selectedFloorSelectMenu,
              floorButtons,
            ],
          });
        } else if (interaction.customId === "select-floor") {
          const selectedFloor = parseInt(
            interaction.values[0].split("-")[1],
            10
          );
          console.log("selected scenario", selectedScenario.id);
          console.log("selectedFloor", selectedFloor);
          const updatedEmbed = generateFloorDetailsEmbed(
            selectedScenario,
            selectedFloor
          );

          await interaction.update({
            embeds: [updatedEmbed],
            components: [regionSelectMenu, firstFloorSelectMenu, floorButtons],
          });
        }
      }

      if (interaction.isButton()) {
        switch (interaction.customId) {
          case "start-floor":
            setTimeout(async () => {
              const battle = new Battle(playerData, thatArray, interaction);
              console.log("Starting battle...");
              await battle.startEmbed();
            }, 1000);
            setTimeout(async () => {
              await sentMessage.delete();
            }, 1000);
            break;
          case "view-floor":
            await interaction.reply("Displaying floor details...");
            break;
          case "floor-strategies":
            await interaction.reply("Showing floor strategies...");
            break;
          case "leaderboards":
            await interaction.reply("Viewing leaderboards...");
            break;
        }
      }
    });

    collector.on("end", () => {
      console.log("Interaction collection ended.");
    });
  },
};

export default masterCommand;
