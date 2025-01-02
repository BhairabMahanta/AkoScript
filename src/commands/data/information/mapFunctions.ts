import {
  ActionRowBuilder,
  EmbedBuilder,
  StringSelectMenuBuilder,
} from "discord.js";
import { Scenario } from "../../../data/information/scenarios";
import { allEnemies } from "../monsterInfo/allEnemies";
import { bosses } from "../monsterInfo/bosses";
export const generateEmbed = (
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
                  let floorDescription = `${index + 1}.)`;
                  floorDescription += `${floor.enemies.join(", ")} `;
                  if (floor.miniboss && !floor.boss) {
                    floorDescription += ` | Miniboss`;
                  }
                  if (floor.boss) {
                    floorDescription += ` | Boss`;
                  }
                  return floorDescription;
                })
                .join("\n")}
            `,
  };
};

export const createFloorSelectMenu = (scenario: Scenario) => {
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("select-floor")
      .setPlaceholder("Select a floor")
      .addOptions(
        scenario.floors.map((floor, index) => ({
          label: `Floor ${index + 1}`,
          value: `floor-${index + 1}`,
        }))
      )
  );
};

export const generateFloorDetailsEmbed = (
  scenario: Scenario,
  floorNumber: number
) => {
  const floor = scenario.floors[floorNumber - 1];

  if (!floor) {
    return new EmbedBuilder()
      .setTitle("Error")
      .setDescription("Floor not found.")
      .setColor(0xff0000);
  }

  // Fetch enemy details
  const enemiesDetails = floor.enemies
    .map((enemy) => {
      const mob = allEnemies.find((m) => m.name === enemy.name);
      if (mob) {
        return `**${mob.name}**  
          **Stats:**  💚 ${mob.stats.hp} ⚔️ ${mob.stats.attack}  🛡️ ${
          mob.stats.defense
        } 🌬️ ${mob.stats.speed} 
          🧎‍♂️ **Abilities:** ${mob.abilities.join(", ")}  
          🌀 **Attack Pattern:** ${mob.attackPattern.join(" > ")}
        `;
      }
      return `**${enemy}**: Details not available.`;
    })
    .join("\n\n");

  // Fetch miniboss or boss details
  const bossDetails =
    floor.miniboss || floor.boss
      ? floor.boss
        ? allEnemies.find(
            (b) => b.type === "boss" && b.ofScenario === scenario.id
          )?.name || "Boss details not available"
        : floor.miniboss
        ? allEnemies.find(
            (b) => b.type === "boss" && b.ofScenario === scenario.id
          )?.name || "Miniboss details not available"
        : "No boss on this floor."
      : "No miniboss or boss on this floor.";

  return new EmbedBuilder()
    .setTitle(`Floor ${floorNumber} Details - ${scenario.name}`)
    .setDescription(
      `
      **🏞️ Floor ${floorNumber} - **  
      
      **👾 __Enemies__:**  
      ${enemiesDetails}

      **👑 Boss/Miniboss:**  
      ${bossDetails}

      **🎁 Rewards:**  
      ${floor.rewards.join(", ")}
    `
    )
    .setColor(0x00bfff);
};
