import {
  Client,
  Message,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  TextChannel,
  Interaction,
  StringSelectMenuBuilder,
  ComponentType,
  ButtonInteraction,
  StringSelectMenuInteraction,
} from "discord.js";
import { ExtendedClient } from "../..";
import { Command } from "../../@types/command";

// Helper functions with improved formatting
function createCategoryOptions(client: ExtendedClient) {
  const categories = Array.from(client.commandCategories.keys()).filter(Boolean);
  const options = categories.map((category) => ({
    label: `📁 ${category}`,
    value: category,
    description: `View ${category} commands`,
  }));

  options.unshift({
    label: "📋 All Commands",
    value: "all",
    description: "View all available commands",
  });

  return options;
}

function createCommandOptions(commands: Command[]) {
  const validCommands = commands.filter(cmd => 
    cmd && 
    cmd.name && 
    typeof cmd.name === 'string' && 
    cmd.name.trim().length > 0
  );

  return validCommands
    .slice(0, 25)
    .map((cmd) => ({
      label: cmd.name,
      value: cmd.name,
      description: (cmd.description && typeof cmd.description === 'string') 
        ? cmd.description.slice(0, 100) 
        : "No description",
    }));
}

function createNavigationButtons() {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("help_previous")
      .setLabel("◀ Previous")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("help_next")
      .setLabel("Next ▶")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("help_compact")
      .setLabel("📝 Compact View")
      .setStyle(ButtonStyle.Primary)
  );
}

function createCategoryDropdown(client: ExtendedClient) {
  const options = createCategoryOptions(client);
  
  if (options.length === 0) return null;
  
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("help_category")
      .setPlaceholder("🗂️ Select a category...")
      .addOptions(options)
  );
}

function createCommandDropdown(commands: Command[]) {
  const options = createCommandOptions(commands);
  
  if (options.length === 0) return null;
  
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("help_command_detail")
      .setPlaceholder("🔍 Select a command for details...")
      .addOptions(options)
  );
}

function createBaseEmbed(client: ExtendedClient, page: number, totalPages: number) {
  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("🤖 Bot Commands")
    .setDescription("Navigate through commands using the buttons and dropdowns below")
    .setFooter({ 
      text: `Page ${page}/${totalPages} • Select dropdowns for more info`,
      iconURL: client.user?.displayAvatarURL()
    })
    .setTimestamp();
}

function createCategoryEmbed(client: ExtendedClient, category: string, commands: Command[]) {
  const validCommands = commands.filter(cmd => 
    cmd && 
    cmd.name && 
    typeof cmd.name === 'string' && 
    !cmd.requiredRoles
  );

  const embed = new EmbedBuilder()
    .setColor(0x57f287)
    .setTitle(`📁 ${category} Commands`)
    .setDescription(`**${validCommands.length}** command${validCommands.length !== 1 ? 's' : ''} found in this category`)
    .setFooter({ 
      text: `Select a command below for detailed information`,
      iconURL: client.user?.displayAvatarURL()
    })
    .setTimestamp();

  if (validCommands.length > 0) {
    // Create better formatted command list with consistent spacing
    const commandList = validCommands
      .map(cmd => {
        const name = `**${cmd.name}**`;
        const desc = (cmd.description || 'No description').slice(0, 50);
        const aliases = cmd.aliases?.length ? ` • *${cmd.aliases.join(', ')}*` : '';
        return `${name} - ${desc}${aliases}`;
      })
      .join('\n');

    embed.addFields({
      name: `Available Commands`,
      value: commandList.slice(0, 1024),
    });
  } else {
    embed.addFields({
      name: `Available Commands`,
      value: "No commands found in this category",
    });
  }

  return embed;
}

function createCommandDetailEmbed(client: ExtendedClient, command: Command) {
  return new EmbedBuilder()
    .setColor(0xfee75c)
    .setTitle(`🔍 ${command.name}`)
    .setDescription(command.description || "No description provided")
    .addFields(
      {
        name: "📝 Aliases",
        value: (command.aliases && command.aliases.length > 0) 
          ? `\`${command.aliases.join('`, `')}\`` 
          : "`None`",
        inline: true
      },
      {
        name: "⏱️ Cooldown",
        value: command.cooldown ? `\`${command.cooldown}s\`` : "`None`",
        inline: true
      },
      {
        name: "📋 Usage",
        value: `\`${command.name}\`${command.aliases?.length ? ` or \`${command.aliases[0]}\`` : ''}`,
        inline: false
      }
    )
    .setFooter({ 
      text: "Use the dropdowns to navigate back",
      iconURL: client.user?.displayAvatarURL()
    })
    .setTimestamp();
}

function getPageCommands(commands: Map<string, Command>, page: number, perPage: number) {
  const startIndex = (page - 1) * perPage;
  const commandsArray = Array.from(commands.values())
    .filter(cmd => cmd && cmd.name && typeof cmd.name === 'string')
    .sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically
  
  return commandsArray.slice(startIndex, startIndex + perPage);
}

function formatCommandField(cmd: Command, index: number): { name: string; value: string; inline: boolean } {
  const number = `${(index + 1).toString().padStart(2, '0')}.`;
  const name = `${number} **${cmd.name}**`;
  
  const description = (cmd.description || 'No description available').slice(0, 80);
  const aliases = cmd.aliases?.length 
    ? `\n*Aliases: ${cmd.aliases.slice(0, 3).join(', ')}${cmd.aliases.length > 3 ? '...' : ''}*`
    : '\n*No aliases*';
  
  return {
    name: name,
    value: `${description}${aliases}`,
    inline: true
  };
}

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
      
      // Filter and validate commands
      const validCommands = new Map();
      for (const [key, cmd] of commands.entries()) {
        if (cmd && cmd.name && typeof cmd.name === 'string' && cmd.name.trim().length > 0) {
          validCommands.set(key, cmd);
        }
      }

      if (validCommands.size === 0) {
        await message.reply("❌ No valid commands found.");
        return;
      }

      const perPage = 9; // Reduced for better visual balance
      let page = Math.max(parseInt(args[0]) || 1, 1);
      const totalPages = Math.ceil(validCommands.size / perPage);
      
      page = Math.min(page, totalPages);

      let currentEmbed = createBaseEmbed(client, page, totalPages);
      let currentCommands: Command[] = [];
      let currentCategory = "all";

      // Add initial page commands with improved formatting
      const pageCommands = getPageCommands(validCommands, page, perPage);
      if (pageCommands.length > 0) {
        const commandFields = pageCommands.map((cmd, index) => 
          formatCommandField(cmd, (page - 1) * perPage + index)
        );
        
        currentEmbed.addFields(commandFields);
        currentCommands = pageCommands;
      }

      // Build components
      const components: ActionRowBuilder<any>[] = [];
      
      components.push(createNavigationButtons());
      
      const categoryDropdown = createCategoryDropdown(client);
      if (categoryDropdown) {
        components.push(categoryDropdown);
      }

      const commandDropdown = createCommandDropdown(currentCommands);
      if (commandDropdown) {
        components.push(commandDropdown);
      }

      const sentMessage = await (message.channel as TextChannel).send({
        embeds: [currentEmbed],
        components
      });

      const collector = sentMessage.createMessageComponentCollector({
        filter: (interaction) => interaction.user.id === message.author.id,
        time: 300000,
      });

      collector.on("collect", async (interaction: ButtonInteraction | StringSelectMenuInteraction) => {
        try {
          if (interaction.isButton()) {
            if (interaction.customId === "help_previous") {
              page = Math.max(page - 1, 1);
            } else if (interaction.customId === "help_next") {
              page = Math.min(page + 1, totalPages);
            } else if (interaction.customId === "help_compact") {
              // Improved compact view with better organization
              const categories = client.commandCategories;
              const fields = [];
              
              // Group by categories for better organization
              for (const [category, commands] of categories.entries()) {
                const validCmds = commands.filter(cmd => cmd && cmd.name);
                if (validCmds.length > 0) {
                  const commandList = validCmds
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map(cmd => `\`${cmd.name}\``)
                    .join(' • ');
                  
                  fields.push({
                    name: `📁 **${category}** (${validCmds.length})`,
                    value: commandList,
                    inline: false
                  });
                }
              }
              
              // Add uncategorized commands
              const allCategorizedCommands = new Set();
              categories.forEach(cmds => cmds.forEach(cmd => cmd.name && allCategorizedCommands.add(cmd.name)));
              
              const uncategorized = Array.from(validCommands.values())
                .filter(cmd => cmd.name && !allCategorizedCommands.has(cmd.name));
              
              if (uncategorized.length > 0) {
                const uncatList = uncategorized
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map(cmd => `\`${cmd.name}\``)
                  .join(' • ');
                
                fields.push({
                  name: `📂 **Other Commands** (${uncategorized.length})`,
                  value: uncatList,
                  inline: false
                });
              }
              
              currentEmbed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setTitle("📋 All Commands by Category")
                .setDescription(`**${validCommands.size}** total commands organized by category`)
                .addFields(fields)
                .setFooter({ text: "Use category dropdown to explore specific sections" })
                .setTimestamp();

              const newComponents: ActionRowBuilder<any>[] = [createNavigationButtons()];
              const catDropdown = createCategoryDropdown(client);
              if (catDropdown) newComponents.push(catDropdown);

              await interaction.update({
                embeds: [currentEmbed],
                components: newComponents
              });
              return;
            }

            // Update pagination with improved formatting
            currentCommands = getPageCommands(validCommands, page, perPage);
            currentEmbed = createBaseEmbed(client, page, totalPages);
            
            if (currentCommands.length > 0) {
              const commandFields = currentCommands.map((cmd, index) => 
                formatCommandField(cmd, (page - 1) * perPage + index)
              );
              currentEmbed.addFields(commandFields);
            }

            const newComponents: ActionRowBuilder<any>[] = [createNavigationButtons()];
            const catDropdown = createCategoryDropdown(client);
            if (catDropdown) newComponents.push(catDropdown);
            
            const cmdDropdown = createCommandDropdown(currentCommands);
            if (cmdDropdown) newComponents.push(cmdDropdown);

            await interaction.update({
              embeds: [currentEmbed],
              components: newComponents
            });

          } else if (interaction.isStringSelectMenu()) {
            if (interaction.customId === "help_category") {
              const selected = interaction.values[0];
              currentCategory = selected;

              if (selected === "all") {
                page = 1;
                currentCommands = getPageCommands(validCommands, page, perPage);
                currentEmbed = createBaseEmbed(client, page, totalPages);
                
                if (currentCommands.length > 0) {
                  const commandFields = currentCommands.map((cmd, index) => 
                    formatCommandField(cmd, (page - 1) * perPage + index)
                  );
                  currentEmbed.addFields(commandFields);
                }

                const newComponents: ActionRowBuilder<any>[] = [createNavigationButtons()];
                const catDropdown = createCategoryDropdown(client);
                if (catDropdown) newComponents.push(catDropdown);
                
                const cmdDropdown = createCommandDropdown(currentCommands);
                if (cmdDropdown) newComponents.push(cmdDropdown);

                await interaction.update({
                  embeds: [currentEmbed],
                  components: newComponents
                });
              } else {
                const categoryCommands = client.commandCategories.get(selected) || [];
                currentCommands = categoryCommands.filter(cmd => 
                  cmd && cmd.name && typeof cmd.name === 'string'
                );
                currentEmbed = createCategoryEmbed(client, selected, currentCommands);

                const newComponents: ActionRowBuilder<any>[] = [createNavigationButtons()];
                const catDropdown = createCategoryDropdown(client);
                if (catDropdown) newComponents.push(catDropdown);
                
                const cmdDropdown = createCommandDropdown(currentCommands);
                if (cmdDropdown) newComponents.push(cmdDropdown);

                await interaction.update({
                  embeds: [currentEmbed],
                  components: newComponents
                });
              }
            } else if (interaction.customId === "help_command_detail") {
              const commandName = interaction.values[0];
              const command = validCommands.get(commandName);
              
              if (command) {
                currentEmbed = createCommandDetailEmbed(client, command);
                
                const newComponents: ActionRowBuilder<any>[] = [createNavigationButtons()];
                const catDropdown = createCategoryDropdown(client);
                if (catDropdown) newComponents.push(catDropdown);
                
                await interaction.update({
                  embeds: [currentEmbed],
                  components: newComponents
                });
              }
            }
          }
        } catch (error) {
          console.error("Error handling interaction:", error);
          if ('followUp' in interaction) {
            await interaction.followUp({ 
              content: "❌ An error occurred while processing your request.", 
              ephemeral: true 
            }).catch(() => {});
          }
        }
      });

      collector.on("end", () => {
        sentMessage.edit({ components: [] }).catch(() => {});
      });

    } catch (error) {
      console.error("Error in help command:", error);
      message.reply("❌ An error occurred while displaying the help menu.").catch(() => {});
    }
  },
};

export default helpCommand;
