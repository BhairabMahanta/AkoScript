import {
  ActionRowBuilder,
  EmbedBuilder,
  StringSelectMenuBuilder,
} from "discord.js";
import racesData from "../../../data/races/races";
import abilitiesData from "../../../data/abilities";
import { Interaction, Message } from "discord.js";

export const handleRaceSelection2 = async (
  i: any,
  racesData: any,
  abilitiesData: any,
  sentMessage: any,
  selectRow: any,
  raceRow: any,
  initialRow: any
) => {
  console.log("🔍 handleRaceSelection2 called");
  console.log("🔍 Interaction values:", i.values);
  
  const selectedRaceValue = i.values[0];
  console.log("Selected race value from race_select:", selectedRaceValue);

  if (selectedRaceValue.startsWith("race-")) {
    const raceName = selectedRaceValue.replace("race-", "");
    console.log("Race name:", raceName);

    const race = racesData[raceName];
    if (!race) {
      console.error(`Race data not found for ${raceName}`);
      return;
    }

    console.log("🎯 Race data found:", race);

    const { stats, description, abilities } = race;

    // Create detailed stats display
    const statsDisplay = [
      `**HP**: ${stats.hp}`,
      `**Attack**: ${stats.attack}`,
      `**Defense**: ${stats.defense}`,
      `**Magic**: ${stats.magic}`,
      `**Magic Defense**: ${stats.magicDefense}`,
      `**Speed**: ${stats.speed}`,
      `**Divine Power**: ${stats.divinePower}`
    ].join('\n');

    const embedFields = [
      {
        name: `🏰 **${raceName} Race**`,
        value: description || "A powerful race with unique abilities.",
        inline: false,
      },
      {
        name: "📊 **Base Stats**",
        value: statsDisplay,
        inline: true,
      }
    ];

    // Add abilities if they exist
    if (abilities && abilities.length > 0) {
      abilities.forEach((abilityName: string, index: number) => {
        if (abilityName && abilitiesData[abilityName]) {
          embedFields.push({
            name: `✨ **${abilityName}**`,
            value: abilitiesData[abilityName]?.description || "Powerful racial ability",
            inline: false,
          });
        }
      });
    }

    const updateEmbed = new EmbedBuilder()
      .setTitle(`Pick ${raceName} Race?`)
      .setDescription(`**Selected:** ${raceName}\nConfirm your selection to update your character stats.`)
      .addFields(embedFields)
      .setColor('#FF6B35')
      .setFooter({
        text: "Selecting a race will replace your current stats with the race's stats."
      });

    console.log("🎯 Updating embed with race details:", raceName);

    try {
      await sentMessage.edit({
        embeds: [updateEmbed],
        components: [selectRow, raceRow, initialRow],
      });
      console.log("✅ Embed updated successfully");
    } catch (error) {
      console.error("❌ Error updating embed:", error);
    }
  }
};

export async function handleSelectRace(
  interaction: Interaction,
  sentMessage: Message,
  raceOptions: any,
  raceRow: any
): Promise<void> {
  console.log("🔍 handleSelectRace called");
  
  // Create fields showing all available races
  const raceFields = raceOptions.slice(0, 8).map((raceOption: any) => { // Limit to 8 to avoid embed limits
    const raceName = raceOption.value.replace("race-", "");
    return {
      name: `🏰 **${raceName}**`,
      value: racesData[raceName]?.description || "A unique race with special abilities.",
      inline: false,
    };
  });

  const switchSelectMenu = new StringSelectMenuBuilder()
    .setCustomId("initial_select")
    .setPlaceholder("Switch to another selection")
    .addOptions([
      { label: "Select Class", value: "select_class" },
      { label: "Select Familiar", value: "select_familiar" },
      { label: "Set Deck", value: "select_deck" },
    ]);

  const switchRow: any = new ActionRowBuilder().addComponents(switchSelectMenu);

  const raceEmbed = new EmbedBuilder()
    .setTitle("🏰 Race Selection")
    .setDescription("Choose your race to determine your base stats and abilities.\n**Select a race from the dropdown below to see detailed information.**")
    .addFields(...raceFields)
    .setColor('#FF6B35')
    .setFooter({
      text: "Selecting a race will replace your current stats with the race's stats."
    });

  console.log("🎯 Updating to race selection embed");

  await sentMessage.edit({
    embeds: [raceEmbed],
    components: [raceRow, switchRow],
  });
}
