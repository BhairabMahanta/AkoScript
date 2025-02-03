import {
  Client,
  Collection,
  Message,
  CommandInteraction,
  PermissionsBitField,
  EmbedBuilder,
  TextChannel,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";

// Database model for server-specific settings
interface GuildSettings extends mongoose.Document {
  guildId: string;
  prefix: string;
  allowedRoles: string[];
}

const guildSettingsSchema = new mongoose.Schema<GuildSettings>({
  guildId: { type: String, required: true, unique: true },
  prefix: { type: String, default: "a!" },
  allowedRoles: { type: [String], default: [] },
});

export const GuildSettingsModel = mongoose.model<GuildSettings>(
  "GuildSettings",
  guildSettingsSchema
);

// Configuration interface
export interface BotConfig {
  defaultPrefix: string;
  defaultCooldown: number;
  ownerId: string;
  colorTheme: string;
}

// Command structure
export interface Command {
  name: string;
  description: string;
  category?: string;
  aliases?: string[];
  cooldown?: number;
  permissions?: (keyof typeof PermissionsBitField.Flags)[];
  requiredRoles?: string[];
  syntax?: string;
  execute: (
    client: ExtendedClient,
    message: Message,
    args: string[]
  ) => Promise<void>;
}

// Extended client type
export interface ExtendedClient extends Client {
  config: BotConfig;
  commands: Collection<string, Command>;
  commandCategories: Map<string, Command[]>;
  interactions: Collection<string, Command>;
  safemode: boolean;
  generateHelpEmbed: (command: Command, message: Message) => EmbedBuilder;
  db: {
    GuildSettings: typeof GuildSettingsModel;
  };
  reloadCommand: (commandName: string) => Promise<void>;
}

export class CommandHandler {
  private client: ExtendedClient;
  private cooldowns: Collection<string, Collection<string, number>>;
  private globalCooldowns = new Collection<string, number>();
  private spamCache = new Collection<string, number>();
  constructor(client: ExtendedClient, config: BotConfig) {
    this.client = client;
    this.client.config = config;
    this.client.commands = new Collection();
    this.client.commandCategories = new Map();
    this.client.generateHelpEmbed = this.generateHelpEmbed.bind(this);
    this.client.interactions = new Collection();
    this.client.db = { GuildSettings: GuildSettingsModel };
    this.cooldowns = new Collection();
    this.client.safemode = false;

    // Add reload command method
    this.client.reloadCommand = async (commandName: string) => {
      const commandPath = path.join(
        __dirname,
        "..",
        "commands",
        `${commandName}.ts`
      );
      delete require.cache[require.resolve(commandPath)];
      const command = (await import(commandPath)).default;
      this.client.commands.set(command.name, command);
      this.organizeCategories();
    };
  }

  // Load commands with categories
  async loadCommands(): Promise<void> {
    const commandsPath = path.join(__dirname, "..", "..", "commands");

    await this.walkDirectory(commandsPath);
    this.organizeCategories();
  }

  private async walkDirectory(dir: string): Promise<void> {
    const files = fs.readdirSync(dir);

    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        await this.walkDirectory(filePath);
      } else if (/\.(js|ts)$/.test(file)) {
        await this.loadCommandFile(filePath);
      }
    }
  }

  private async loadCommandFile(filePath: string): Promise<void> {
    try {
      const commandModule = await import(filePath);
      const command: Command = commandModule.default;

      if (!command?.name) {
        // console.warn(`Skipping invalid command file: ${filePath}`);
        return;
      }

      if (this.client.commands.has(command.name)) {
        console.warn(`Duplicate command name: ${command.name}`);
        return;
      }

      this.client.commands.set(command.name, {
        ...command,
        cooldown: command.cooldown ?? this.client.config.defaultCooldown,
        category: command.category ?? "General",
      });

      console.log(
        `Loaded command: ${command.name} (${
          command.category ? command.category : "general"
        })`
      );
    } catch (error) {
      console.error(`Error loading command ${filePath}:`, error);
    }
  }

  private organizeCategories(): void {
    this.client.commandCategories.clear();
    this.client.commands.forEach((command) => {
      const category = command.category || "General";
      const commands = this.client.commandCategories.get(category) || [];
      commands.push(command);
      this.client.commandCategories.set(category, commands);
    });
  }

  // Get prefix for a guild
  private async getPrefix(guildId?: string): Promise<string> {
    if (!guildId) return this.client.config.defaultPrefix;

    const settings = await this.client.db.GuildSettings.findOne({ guildId });
    return settings?.prefix || this.client.config.defaultPrefix;
  }

  // Generate help embed
  public generateHelpEmbed(): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setColor("Aqua")
      .setTitle("Command Help")
      .setDescription(
        `Use ${this.client.config.defaultPrefix}help [command] for more info`
      );

    this.client.commandCategories.forEach((commands, category) => {
      const commandList = commands
        .filter((cmd) => !cmd.requiredRoles)
        .map((cmd) => `• \`${cmd.name}\` - ${cmd.description}`)
        .join("\n");

      if (commandList.length > 0) {
        embed.addFields({ name: `**${category}**`, value: commandList });
      }
    });

    return embed;
  }

  // Handle commands with enhanced features
  async handleCommand(message: Message): Promise<void> {
    if (!message.content || message.author.bot || !message.guild) return;

    // Get guild-specific prefix
    const prefix = await this.getPrefix(message.guild.id);
    if (!message.content.startsWith(prefix)) return;

    // Parse command arguments
    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift()?.toLowerCase();
    if (!commandName) return;

    // Find command
    const command =
      this.client.commands.get(commandName) ||
      this.client.commands.find((c) => c.aliases?.includes(commandName));

    if (!command) return;

    // Permission checks
    if (command.permissions && message.member) {
      const missingPermissions = message.member.permissions.missing(
        command.permissions
      );
      if (missingPermissions.length > 0) {
        message.reply(`Missing permissions: ${missingPermissions.join(", ")}`);
        return;
      }
    }

    // Role-based access
    if (command.requiredRoles && message.member) {
      const hasRole = command.requiredRoles.some((roleId) =>
        message.member!.roles.cache.has(roleId)
      );

      if (!hasRole) {
        message.reply("You don't have the required roles for this command.");
        return;
      }
    }

    // Cooldown handling
    const cooldownKey = `${message.author.id}-${command.name}`;
    const now = Date.now();
    const cooldownTime =
      (command.cooldown ?? this.client.config.defaultCooldown) * 1000;

    if (!this.cooldowns.has(cooldownKey)) {
      this.cooldowns.set(cooldownKey, new Collection());
    }

    const timestamps = this.cooldowns.get(cooldownKey)!;
    if (timestamps.has(message.author.id)) {
      const expiration = timestamps.get(message.author.id)! + cooldownTime;
      if (now < expiration) {
        const remaining = ((expiration - now) / 1000).toFixed(1);
        message.reply(
          `Please wait ${remaining}s before using \`${command.name}\` again.`
        );
        return;
      }
    }

    timestamps.set(message.author.id, now);
    setTimeout(() => timestamps.delete(message.author.id), cooldownTime);

    // Global rate limiting (5 commands/10 seconds)
    const globalCooldownKey = message.author.id;
    const globalUsage = this.globalCooldowns.get(globalCooldownKey) || 0;

    if (Date.now() - globalUsage < 10000) {
      const remaining = (10000 - (Date.now() - globalUsage)) / 1000;
      message.reply(`Global cooldown: Wait ${remaining.toFixed(1)}s`);
      return;
    }
    this.globalCooldowns.set(globalCooldownKey, Date.now());

    // Command spam protection
    const spamKey = `${message.author.id}-${commandName}`;
    const spamCount = this.spamCache.get(spamKey) || 0;

    if (spamCount >= 3) {
      message.reply("Command spam detected. Please slow down.");
      return;
    }
    this.spamCache.set(spamKey, spamCount + 1);
    setTimeout(() => {
      const current = this.spamCache.get(spamKey) || 0;
      if (current > 0) this.spamCache.set(spamKey, current - 1);
    }, 5000);

    // Execute command
    // Update execute section
    try {
      // Add validation check
      const validation = this.validateInput(command, args, message);
      if (!validation.valid) {
        await message.reply(validation.message || "Invalid command usage");
        return;
      }

      // Add confirmation for dangerous commands
      if (command.name.match(/ban|kick|purge|delete/i)) {
        const confirmed = await this.sendConfirmationDialog(
          message,
          `Are you sure you want to execute **${command.name}**?`
        );

        if (!confirmed) {
          await message.reply("Command cancelled");
          return;
        }
      }

      await command.execute(this.client, message, args);
    } catch (error) {
      console.error(`Command Error [${command.name}]:`, error);
      message
        .reply("An error occurred while executing this command.")
        .catch(console.error);
    }
  }

  // Handle interactions
  async handleInteraction(interaction: CommandInteraction): Promise<void> {
    if (!interaction.isCommand() || this.client.safemode) return;

    const command = this.client.interactions.get(interaction.commandName);
    if (!command) return;

    try {
      // await command.execute(this.client, Message, interaction);
    } catch (error) {
      console.error(`Interaction Error [${command.name}]:`, error);
      interaction.reply({
        content: "An error occurred while executing this interaction!",
        ephemeral: true,
      });
    }
  }
  private validateInput(
    command: Command,
    args: string[],
    message: Message
  ): { valid: boolean; message?: string } {
    // Example validation for dangerous commands
    if (command.name === "ban" || command.name === "kick") {
      if (!message.mentions.members?.first()) {
        return { valid: false, message: "Please mention a valid user" };
      }
      if (args.length < 2) {
        return { valid: false, message: "Please provide a reason" };
      }
    }

    if (command.name === "purge" && parseInt(args[0]) > 100) {
      return { valid: false, message: "Cannot delete more than 100 messages" };
    }

    return { valid: true };
  }

  // Confirmation dialog method
  private async sendConfirmationDialog(
    message: Message,
    question: string
  ): Promise<boolean> {
    const confirmEmbed = new EmbedBuilder()
      .setColor("Yellow")
      .setDescription(question)
      .setFooter({ text: "You have 30 seconds to confirm" });

    const confirmation = await message.reply({
      embeds: [confirmEmbed],
      components: [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId("confirm")
            .setLabel("Confirm")
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId("cancel")
            .setLabel("Cancel")
            .setStyle(ButtonStyle.Secondary)
        ),
      ],
    });

    try {
      const response = await confirmation.awaitMessageComponent({
        filter: (i) => i.user.id === message.author.id,
        time: 30000,
      });

      await response.deferUpdate();
      return response.customId === "confirm";
    } catch {
      return false;
    }
  }
}
