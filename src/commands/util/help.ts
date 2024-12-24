import {
  Client,
  Message,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  CommandInteraction,
  ButtonStyle,
  TextChannel,
  Interaction,
} from "discord.js";
import { ExtendedClient } from "../..";
import { Command } from "../../@types/command";

const helpCommand: Command = {
  name: "help",
  description: "Displays a list of available commands and their descriptions.",
  aliases: ["commands", "cmds"],
  cooldown: 5,
  async execute(
    client: ExtendedClient,
    message: Message<boolean>,
    args: string[]
  ): Promise<void> {
    try {
      const commands = client.commands as Map<string, Command>;
      const perPage = 12; // Number of commands to display per page
      let page = parseInt(args[0]) || 1; // Get the requested page from arguments

      const totalPages = Math.ceil(commands.size / perPage);

      if (page < 1 || page > totalPages) {
        message.reply(
          "Invalid page number. Please provide a valid page number."
        );
        return;
      }

      const helpEmbed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle("Command List")
        .setDescription(
          "Here is a list of available commands and their descriptions:"
        )
        .setTimestamp();

      const fields = await getFieldsForPage(commands, page, perPage);
      helpEmbed.addFields(fields);

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("previous")
          .setLabel("Previous")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId("next")
          .setLabel("Next")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId("compact")
          .setLabel("All Commands")
          .setStyle(ButtonStyle.Primary)
      );

      const sentMessage = await (message.channel as TextChannel).send({
        embeds: [helpEmbed],
        components: [row],
      });

      const collector = sentMessage.createMessageComponentCollector({
        filter: (interaction) =>
          ["previous", "compact", "next"].includes(interaction.customId),
        time: 300000, // 300 seconds
        dispose: true,
      });

      collector.on("collect", async (interaction: Interaction) => {
        if (!interaction.isButton()) return;

        if (interaction.customId === "previous") {
          page = Math.max(page - 1, 1);
          const updatedFields = await getFieldsForPage(commands, page, perPage);
          helpEmbed.setFields(updatedFields);
          await interaction.update({ embeds: [helpEmbed] });
        } else if (interaction.customId === "next") {
          page = Math.min(page + 1, totalPages);
          const updatedFields = await getFieldsForPage(commands, page, perPage);
          helpEmbed.setFields(updatedFields);
          await interaction.update({ embeds: [helpEmbed] });
        } else if (interaction.customId === "compact") {
          const compactFields = await getCompactFields(commands);
          helpEmbed.spliceFields(0, helpEmbed.data.fields?.length || 0); // Clear all fields
          let description = "";
          compactFields.forEach((field) => {
            description += `${field.name}, `;
          });
          helpEmbed.setDescription(description);
          await interaction.update({ embeds: [helpEmbed] });
        }
      });
    } catch (error) {
      console.error("An error occurred:", error);
    }

    async function getFieldsForPage(
      commands: Map<string, Command>,
      page: number,
      perPage: number
    ) {
      const startIndex = (page - 1) * perPage;
      const endIndex = startIndex + perPage;
      const fields: { name: string; value: string; inline: boolean }[] = [];

      const commandsArray = Array.from(commands.values());

      commandsArray.forEach((command, index) => {
        if (index >= startIndex && index < endIndex) {
          const field = {
            name: `**__${index + 1}. ${command.name}__**`,
            value: `**Description:** ${
              command.description || "No description provided"
            }\n**Aliases:** ${
              command.aliases?.length
                ? `${command.aliases.join(", ")}\n--------------------- `
                : "None\n ---------------------"
            }`,
            inline: true,
          };

          fields.push(field);
        }
      });

      return fields;
    }

    async function getCompactFields(commands: Map<string, Command>) {
      const fields: { name: string }[] = [];
      const commandsArray = Array.from(commands.values());

      commandsArray.forEach((command) => {
        fields.push({ name: `${command.name}` });
      });

      return fields;
    }
  },
};
export default helpCommand;
