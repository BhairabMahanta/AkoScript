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
import Battle, { ExtendedEnemy } from "../../adv/action/battle/battle";
import { Enemy } from "../../adv/action/battle/battle";
import {
  PlayerScenarioData,
  interfaceScenario,
} from "../../../data/mongo/scenarioInterface";
import { handleAdventure } from "../../adv/action/movement/advClass";

const db = mongoClient.db("Akaimnky");
const scenarioCollection: any = db.collection("scenarioData");
const collection2: any = db.collection("akaillection");
const masterCommand: Command = {
  name: "worldmap",
  description: "Configure/fight most things about the scenarios.",
  aliases: ["wm"],
  async execute(
    client: ExtendedClient,
    message: Message<boolean>,
    args: string[]
  ): Promise<void> {
    const playerId = { _id: message.author.id };
    let playerProgress = await scenarioCollection.findOne(playerId);
    let playerData = await collection2.findOne(playerId);
    let isTrue: boolean;
    let floorNum: number = 1;
    let bossFloorBooleanReal: boolean = false;
    let existScenario: interfaceScenario = {
      id: "forest-region",
      name: "Forest Region",
      selected: true,
      number: 1,
      difficulties: ["Easy", "Normal", "Hard"],
      claimedReward: false,
      floors: [
        {
          floorNumber: 1,
          miniboss: false,
          boss: false,
          rewarded: false,
          cleared: false,
        },
      ],
    };
    const scenario = scenarios[0]; // Default first scenario
    const progress = playerProgress?.scenarios.find((p: interfaceScenario) => {
      return p.id === scenario.id;
    });

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
    let thatArrayy: any;
    collector.on("collect", async (interaction) => {
      if (interaction.isStringSelectMenu()) {
        if (interaction.customId === "select-region") {
          const selectedScenarioId = interaction.values[0];
          selectedScenario = scenarios.find(
            (s: Scenario) => s.id === selectedScenarioId
          );
          const selectedProgress = playerProgress?.scenarios.find(
            (p: interfaceScenario) => p.id === selectedScenarioId
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
          if (!selectedScenario) selectedScenario = scenarios[0];
          existScenario = playerProgress.scenarios.find(
            (scenario: interfaceScenario) => scenario.id === selectedScenario.id
          );
          let isFloorExisting;
          console.log("selectedFlor:", selectedFloor);
          console.log("existScen.flor:", existScenario.floors);
          if (existScenario)
            isFloorExisting = existScenario.floors[selectedFloor - 1];
          console.log("existFkiir", existScenario.floors);
          if (!isFloorExisting) isTrue = true;
          else isTrue = false;
          const thatTrue = existScenario.floors.length! < selectedFloor;
          console.log("selected scenario", selectedScenario);
          console.log("selectedFloor", selectedFloor);

          const { embed, thatArray, uhNumber, bossFloorBoolean } =
            generateFloorDetailsEmbed(
              selectedScenario,
              selectedFloor,
              thatTrue
            );
          bossFloorBooleanReal = bossFloorBoolean;
          floorNum = uhNumber;
          thatArrayy = thatArray[0];
          console.log("thatArray:", thatArrayy);
          await interaction.update({
            embeds: [embed],
            components: [regionSelectMenu, firstFloorSelectMenu, floorButtons],
          });
        }
      }

      if (interaction.isButton()) {
        switch (interaction.customId) {
          case "start-floor":
            if (isTrue) {
              interaction.reply({
                content:
                  "You have not unlocked that floor. please beat the previous floor to unlock this floor.",
                ephemeral: true,
              });
              return;
            }
            if (bossFloorBooleanReal) {
              await handleAdventure(
                client,
                message,
                playerData,
                selectedScenario
              );
              return;
            }
            setTimeout(async () => {
              if (!thatArrayy) thatArrayy = scenarios[0].floors[0].enemies[0];

              thatArrayy = { ...thatArrayy, floorNum };
              const battle = new Battle(
                playerData,
                thatArrayy,
                interaction,
                existScenario
              );
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
