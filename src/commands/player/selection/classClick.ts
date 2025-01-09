import {
  ActionRowBuilder,
  EmbedBuilder,
  StringSelectMenuBuilder,
} from "@discordjs/builders";
import classesData from "../../../data/classes/allclasses";
import { Interaction, Message } from "discord.js";
export async function handleSelectClass(
  interaction: Interaction,
  sentMessage: Message,
  classRow: any
): Promise<void> {
  const classOptions = Object.keys(classesData).map((className) => ({
    label: className,
    value: `class-${className}`,
  }));

  const classFields = classOptions.map((classOption) => {
    const className = classOption.value.replace("class-", "");
    return {
      name: `Class: ${className}`,
      value: classesData[className]?.description || "Description not available",
      inline: false,
    };
  });

  const switchSelectMenu = new StringSelectMenuBuilder()
    .setCustomId("initial_select")
    .setPlaceholder("Switch to another selection")
    .addOptions([
      { label: "Select Race", value: "select_race" },
      { label: "Select Familiar", value: "select_familiar" },
    ]);

  const switchRow = new ActionRowBuilder().addComponents(switchSelectMenu);

  const classEmbed = new EmbedBuilder()
    .setTitle("Select Your Class")
    .setDescription("Use the buttons to navigate through the options.")
    .addFields(...classFields);

  await sentMessage.edit({
    embeds: [classEmbed],
    components: [classRow, switchRow],
  });
}
