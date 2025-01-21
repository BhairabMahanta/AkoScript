import {
  ActionRowBuilder,
  EmbedBuilder,
  StringSelectMenuBuilder,
} from "discord.js";
import { Scenario } from "../../../data/information/scenarios";
import { allEnemies } from "../monsterInfo/allEnemies";
import { bosses } from "../monsterInfo/bosses";
import { Enemy } from "../../adv/action/battle/battle";
import { iconMap } from "../../adv/action/battle/sendEmbed";
export const generateEmbed = (
  scenario: Scenario,
  playerProgress: any,
  color: any
) => {
  const progress = playerProgress;

  const isUnlocked = progress ? true : false;
  const completedFloors = progress ? progress.floors.length - 1 : 0;
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
interface FloorDetailsEmbedReturn {
  embed: EmbedBuilder;
  thatArray: Enemy[]; // Or any other type depending on your requirements
  uhNumber: number;
  bossFloorBoolean: boolean;
}

export const generateFloorDetailsEmbed = (
  scenario: Scenario,
  floorNumber: number,
  thatTrue: Boolean
): FloorDetailsEmbedReturn => {
  const floor = scenario.floors[floorNumber - 1];

  // Fetch enemy details
  const enemiesDetails = floor.enemies
    .map((enemy) => {
      const mob = allEnemies.find((m) => m.name === enemy.name);
      if (mob) {
        // Extract the main enemy and allies from the `element` array

        // Main enemy stats
        const mainMob: any =
          mob.element.find((el) => el.type === enemy.element) || {};
        const mainIcon = iconMap[enemy.element] || "❓";
        const mainStats = mainMob.stats;
        const mainAbilities = mainMob.abilities;

        const mainAttackPattern = mainMob.attackPattern;
        // Allies stats
        // Allies stats
        const allies = enemy.hasAllies
          .filter((allyName) => allyName.name !== "none") // Skip "none" entries
          .map((allyName, index) => {
            const yanemi: any =
              allEnemies.find((ella) => ella.name === allyName.name) || {};
            const allyElement = allyName.element;
            const allyIcon = iconMap[allyElement] || "❓";
            const allyDetails = yanemi.element.find((el: any) => {
              console.log("el.type", el.type, "allyElement:", allyElement);
              return el.type === allyElement;
            });

            if (allyDetails) {
              console.log("hahaBROOOOOO");
              const { stats } = allyDetails;
              return `${allyName.name} (${allyIcon}): 💚 ${
                stats.hp ?? "?"
              } ⚔️ ${stats.attack ?? "?"} 🛡️ ${stats.defense ?? "?"} 🌬️ ${
                stats.speed ?? "?"
              }`;
            }
            console.log("allyName:", allyName);
            return `${allyName} (${allyIcon}): No stats available`;
          });

        return `**${mob.name}** (${mainIcon}) : 💚 ${mainStats.hp ?? "?"} ⚔️ ${
          mainStats.attack ?? "?"
        } 🛡️ ${mainStats.defense ?? "?"} 🌬️ ${mainStats.speed ?? "?"}
      🧎‍♂️ **Abilities:** ${mainAbilities.join(", ") || "None"}
      🌊 **Waves:** ${enemy.waves
        .map(
          (wave) =>
            `\n __Wave ${wave.waveNumber}:__ **${wave.enemies.join(", ")}**`
        )
        .join(" ")}
      👥 **Allies:** ${allies.length ? allies.join("\n") : "None"}
      🌀 **Attack Pattern:** ${mainAttackPattern.join(" > ") || "None"}
      `;
      }
      return `**${enemy.name}**: Details not available.`;
    })
    .join("\n\n");

  // Fetch miniboss or boss details
  const bossDetails =
    floor.miniboss || floor.boss
      ? floor.bosses?.join(",") ?? "No MiniBoss on this floor."
      : "No miniboss found";

  return {
    embed: new EmbedBuilder()
      .setTitle(`Floor ${floorNumber} Details - __${scenario.name}__`)
      .setDescription(
        `
      **🏞️ Floor ${floorNumber} - ${thatTrue ? "🔒Locked" : "✅ Unlocked"}**  
      
      **👾 __Enemies__:**  ${enemiesDetails}
      **👑 MiniBoss:**  
      ${bossDetails}

      **🎁 Rewards:**  
      ${floor.rewards.join(", ")}
    `
      )
      .setColor(0x00bfff),
    thatArray: floor.enemies,
    uhNumber: floor.floorNumber,
    bossFloorBoolean: floor.boss,
  };
};
