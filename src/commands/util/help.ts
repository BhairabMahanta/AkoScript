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
  StringSelectMenuBuilder,
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
      // console.log("commands:", commands);
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

      const { fields, row } = await getFieldsForPage(commands, page, perPage);
      helpEmbed.addFields(fields);

      const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
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
        components: [row2, row],
      });

      const collector = sentMessage.createMessageComponentCollector({
        filter: (interaction) =>
          ["previous", "compact", "next", "help_category"].includes(
            interaction.customId
          ),
        time: 300000, // 300 seconds
        dispose: true,
      });

      collector.on("collect", async (interaction: Interaction) => {
        if (interaction.isButton()) {
          if (interaction.customId === "previous") {
            page = Math.max(page - 1, 1);
            const { fields } = await getFieldsForPage(commands, page, perPage);
            helpEmbed.setFields(fields);
            await interaction.update({ embeds: [helpEmbed] });
          } else if (interaction.customId === "next") {
            page = Math.min(page + 1, totalPages);
            const { fields } = await getFieldsForPage(commands, page, perPage);
            helpEmbed.setFields(fields);
            await interaction.update({
              embeds: [helpEmbed],
              components: [row2, row],
            });
          } else if (interaction.customId === "compact") {
            const compactFields = await getCompactFields(commands);
            helpEmbed.spliceFields(0, helpEmbed.data.fields?.length || 0); // Clear all fields
            let description = "";
            compactFields.forEach((field) => {
              description += `${field.name}, `;
            });
            helpEmbed.setDescription(description);
            await interaction.update({
              embeds: [helpEmbed],
              components: [row2, row],
            });
          }
        } else if (interaction.isStringSelectMenu()) {
          const selected = interaction.values[0];
          let embed: EmbedBuilder;

          if (selected === "all") {
            // Regenerate base embed
            embed = client.generateHelpEmbed();
          } else {
            // Create category-specific embed
            const commands = client.commandCategories.get(selected) || [];
            embed = new EmbedBuilder()
              .setColor("Aqua")
              .setTitle(`${selected} Commands`)
              .setDescription(
                `Use ${client.config.defaultPrefix}help [command] for more info`
              );

            const commandList = commands
              .filter((cmd) => !cmd.requiredRoles)
              .map((cmd) => `• \`${cmd.name}\` - ${cmd.description}`)
              .join("\n");

            embed.addFields({
              name: `**${selected}**`,
              value: commandList || "No commands in this category",
            });
          }

          await interaction.update({
            embeds: [embed],
            components: [row], // Keep the selector
          });
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
      const categories = Array.from(client.commandCategories.keys());
      const options = categories.map((category) => ({
        label: category,
        value: category,
        description: `View ${category} commands`,
      }));

      // Add "All Commands" option
      options.unshift({
        label: "All Commands",
        value: "all",
        description: "View all available commands",
      });

      const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("help_category")
          .setPlaceholder("Select a category")
          .addOptions(options)
      );

      commandsArray.forEach((command, index) => {
        console.log("index:", index);
        if (
          index >= startIndex &&
          index < endIndex &&
          command.name != undefined
        ) {
          console.log("happened:", command.name);
          const field = {
            name: `**__${command.name}__**`,
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

      return { fields, row };
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
