import {
  ActionRowBuilder,
  EmbedBuilder,
  StringSelectMenuBuilder,
} from "@discordjs/builders";
import racesData from "../../../data/races/races";
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

    const { stats, description, abilities } = race;

    const embedFields = [
      {
        name: `Race: ${raceName}`,
        value: description || "Description not available",
        inline: false,
      },
      {
        name: "Stats",
        value: `
          **HP**: ${stats.hp}
          **Attack**: ${stats.attack}
          **Defense**: ${stats.defense}
          **Magic**: ${stats.magic}
          **Magic Defense**: ${stats.magicDefense}
          **Speed**: ${stats.speed}
          **Divine Power**: ${stats.divinePower}
          `,
        inline: false,
      },
      {
        name: `${abilities[0]}:`,
        value: abilitiesData[abilities[0]]?.description || "Weak, no ability",
        inline: false,
      },
      {
        name: `${abilities[1]}:`,
        value: abilitiesData[abilities[1]]?.description || "Weak, no ability",
        inline: false,
      },
    ];

    const updateEmbed = new EmbedBuilder()
      .setTitle(`Pick ${raceName} Race?`)
      .setDescription("Use the buttons to navigate through the options.")
      .addFields(embedFields);

    await sentMessage.edit({
      embeds: [updateEmbed],
      components: [selectRow, raceRow, initialRow],
    });

    console.log("Updated embed with race details:", raceName);
  }
};

export async function handleSelectRace(
  interaction: Interaction,
  sentMessage: Message,
  raceOptions: any,
  raceRow: any
): Promise<void> {
  const raceFields = raceOptions.map((raceOption: any) => {
    const raceName = raceOption.value.replace("race-", "");
    return {
      name: `Race: ${raceName}`,
      value: racesData[raceName]?.description || "Description not available",
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

  const switchRow: any = new ActionRowBuilder().addComponents(switchSelectMenu);

  const raceEmbed = new EmbedBuilder()
    .setTitle("Pick a Race to advance forward!")
    .setDescription("Use the buttons to navigate through the options.")
    .addFields(...raceFields)
    .setFooter({
      text: "Selecing a race will replace your current stats with the race's stats.",
    });

  await sentMessage.edit({
    embeds: [raceEmbed],
    components: [raceRow, switchRow],
  });
}
