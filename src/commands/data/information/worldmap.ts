import { worldMapModel } from "../../../data/mongo/scenarioSchema";
import {
  ActionRowBuilder,
  ButtonBuilder,
  EmbedBuilder,
  Message,
} from "discord.js";
import { Scenario, scenarios } from "../../../data/information/scenarios";
import { Command } from "../../../@types/command";
import { ExtendedClient } from "../../..";
import { mongoClient } from "../../../data/mongo/mongo";
const db = mongoClient.db("Akaimnky");
const collection: any = db.collection("worldMapCollection");
const worldMapCommand: Command = {
  name: "viewworldmap",
  description: "Displays the current world map with available scenarios.",
  aliases: ["vwm"],
  async execute(
    client: ExtendedClient,
    message: any,
    args: string[]
  ): Promise<void> {
    try {
      // Get player ID
      const playerId: String = message.author.id;

      // Check if player exists in the database
      let playerProgress = await collection.findOne({
        playerId,
      });

      // If no entry exists, create a new one with default values
      if (!playerProgress) {
        // Create a new player progress document
        playerProgress = new worldMapModel({
          playerId,
          progress: [
            {
              scenarioId: "forest-region", // Replace with actual default scenario ID
              completedFloors: 0, // Default number of completed floors
              bestDifficulty: "Easy", // Default difficulty
              unlocked: true, // Default to unlocked
            },
          ],
        });

        await playerProgress.save();
        console.log(`Created new player progress for user: ${playerId}`);
      }

      let currentPage = 0;

      // Function to generate the embed for a given scenario
      const generateEmbed = (
        scenario: Scenario,
        playerProgress: any,
        color: any
      ) => {
        const progress = playerProgress;

        const isUnlocked = progress ? progress.unlocked : false;
        const completedFloors = progress ? progress.completedFloors : 0;
        const bestDifficulty = progress ? progress.bestDifficulty : "None";

        return {
          color: color,
          title: `World Map Progression - ${scenario.name}`,
          description: ` ### Explore the world! Select a region to view its details
                    **Description**: ${scenario.description}
                    **Unlocked**: ${isUnlocked ? "✅ Yes" : "🔒 No"}
                    **Best Difficulty Completed**: ${bestDifficulty}
                    **Completed Floors**: ${completedFloors}
                    **Difficulties**: ${scenario.difficulties.join(", ")}
                    **Rewards**: ${scenario.rewards.join(", ")}
      
                   **Floors**: 
      ${scenario.floors
        .map((floor, index) => {
          let floorDescription = `${index + 1}.) `;

          // Extract enemies with name and allies
          const enemiesDescription = floor.enemies
            .map(
              (enemy) =>
                `${enemy.name} ${
                  enemy.hasAllies.length > 0
                    ? `(Allies: ${enemy.hasAllies
                        .map((ally) => ally.name)
                        .join(", ")})`
                    : ""
                }`
            )
            .join(", ");

          floorDescription += `${enemiesDescription} `;

          // Add miniboss or boss status
          if (floor.miniboss && !floor.boss) {
            floorDescription += `| Miniboss`;
          }
          if (floor.boss) {
            floorDescription += `| Boss`;
          }

          return floorDescription;
        })
        .join("\n")}`,
        };
      };
      // Function to create navigation buttons
      const generateButtons = (isUnlocked: any) => {
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("previous")
            .setLabel("Previous")
            .setStyle(2)
            .setDisabled(currentPage === 0), // Disable if we're on the first page

          new ButtonBuilder()
            .setCustomId("next")
            .setLabel("Next")
            .setStyle(2)
            .setDisabled(!isUnlocked || currentPage === scenarios.length - 1) // Disable if not unlocked or last page
        );
        return row;
      };

      // Send the first page
      const sendPage = async () => {
        const scenario = scenarios[currentPage];
        const progress = playerProgress.progress.find(
          (p: any) => p.scenarioId === scenario.id
        );

        const embed = generateEmbed(scenario, progress, 0x0099ff);
        const buttons = generateButtons(progress?.unlocked);

        const sentMessage = await message.channel.send({
          embeds: [embed],
          components: [buttons],
        });

        // Handle button interactions
        const filter = (interaction: any) =>
          interaction.user.id === message.author.id;
        const collector = sentMessage.createMessageComponentCollector({
          filter,
          time: 60000, // Collect for 60 seconds
        });

        collector.on("collect", async (interaction: any) => {
          if (
            interaction.customId === "next" &&
            currentPage < scenarios.length - 1
          ) {
            currentPage++;
          } else if (interaction.customId === "previous" && currentPage > 0) {
            currentPage--;
          }

          await interaction.update({
            embeds: [
              generateEmbed(scenarios[currentPage], playerProgress, 0x0099ff),
            ],
            components: [generateButtons(progress?.unlocked)],
          });
        });

        collector.on("end", () => {
          // Disable buttons after collection ends
          sentMessage.edit({
            components: [
              new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                  .setLabel("Previous")
                  .setStyle(2)
                  .setDisabled(true),
                new ButtonBuilder()
                  .setLabel("Next")
                  .setStyle(2)
                  .setDisabled(true)
              ),
            ],
          });
        });
      };

      // Initial page load
      await sendPage();
    } catch (error) {
      console.error("Error in worldmap command:", error);
      await message.channel.send(
        "An error occurred while fetching the world map."
      );
    }
  },
};

export default worldMapCommand;
