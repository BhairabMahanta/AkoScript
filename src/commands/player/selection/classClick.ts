import {
  ActionRowBuilder,
  EmbedBuilder,
  StringSelectMenuBuilder,
} from "discord.js";
import classesData from "../../../data/classes/allclasses";
import abilitiesData from "../../../data/abilities";
import { Interaction, Message } from "discord.js";

export const handleClassSelection2 = async (
  i: any,
  classesData: any,
  abilitiesData: any,
  sentMessage: any,
  selectRow: any,
  classRow: any,
  initialRow: any
) => {
  console.log("🔍 handleClassSelection2 called");
  console.log("🔍 Interaction values:", i.values);
  
  const selectedClassValue = i.values[0];
  console.log("Selected class value from class_select:", selectedClassValue);

  if (selectedClassValue.startsWith("class-")) {
    const className = selectedClassValue.replace("class-", "");
    console.log("Class name:", className);

    const classData = classesData[className];
    if (!classData) {
      console.error(`Class data not found for ${className}`);
      return;
    }

    console.log("🎯 Class data found:", classData);

    const { description, abilities } = classData;

    const embedFields = [
      {
        name: `⚔️ **${className} Class**`,
        value: description || "A powerful class with unique combat abilities.",
        inline: false,
      }
    ];

    // Add abilities if they exist
    if (abilities && abilities.length > 0) {
      const abilityText = abilities.map((ability: string) => {
        const abilityInfo = abilitiesData[ability];
        return `**${ability}:** ${abilityInfo?.description || 'Powerful class ability'}`;
      }).join('\n\n');

      embedFields.push({
        name: '⚡ **Class Abilities**',
        value: abilityText,
        inline: false
      });
    }

    const updateEmbed = new EmbedBuilder()
      .setTitle(`Pick ${className} Class?`)
      .setDescription(`**Selected:** ${className}\nConfirm your selection to update your character class.`)
      .addFields(embedFields)
      .setColor('#4ECDC4')
      .setFooter({
        text: "Use the buttons to navigate through the options."
      });

    console.log("🎯 Updating embed with class details:", className);

    try {
      await sentMessage.edit({
        embeds: [updateEmbed],
        components: [selectRow, classRow, initialRow],
      });
      console.log("✅ Embed updated successfully");
    } catch (error) {
      console.error("❌ Error updating embed:", error);
    }
  }
};

export async function handleSelectClass(
  interaction: Interaction,
  sentMessage: Message,
  classRow: any
): Promise<void> {
  console.log("🔍 handleSelectClass called");
  
  const classOptions = Object.entries(classesData)
    .filter(([className, classData]) => classData.state !== "locked")
    .map(([className]) => ({
      label: className,
      value: `class-${className}`,
    }));

  const classFields = classOptions.slice(0, 8).map((classOption) => { // Limit to 8 to avoid embed limits
    const className = classOption.value.replace("class-", "");
    return {
      name: `⚔️ **${className}**`,
      value: classesData[className]?.description || "A powerful combat class.",
      inline: false,
    };
  });

  const switchSelectMenu = new StringSelectMenuBuilder()
    .setCustomId("initial_select")
    .setPlaceholder("Switch to another selection")
    .addOptions([
      { label: "Select Race", value: "select_race" },
      { label: "Select Familiar", value: "select_familiar" },
      { label: "Set Deck", value: "select_deck" },
    ]);

  const switchRow = new ActionRowBuilder().addComponents(switchSelectMenu);

  const classEmbed = new EmbedBuilder()
    .setTitle("⚔️ Class Selection")
    .setDescription("Choose your class to define your combat role and abilities.\n**Select a class from the dropdown below to see detailed information.**")
    .addFields(...classFields)
    .setColor('#4ECDC4')
    .setFooter({
      text: "Select a class from the dropdown to see detailed information"
    });

  console.log("🎯 Updating to class selection embed");

  await sentMessage.edit({
    embeds: [classEmbed],
    components: [classRow, switchRow],
  });
}
