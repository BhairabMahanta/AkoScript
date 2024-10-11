import { Client, Collection, Message, CommandInteraction } from "discord.js";
import fs from "fs";
import path from "path";
const PREFIXES = ["a!"];
// Define the command structure with TypeScript
interface Command {
  name: string;
  description: string;
  aliases?: string[];
  cooldown?: number;
  execute: (
    client: ExtendedClient,
    message: Message,
    args: string[]
  ) => Promise<void>;
}

// Define a type for the client, including commands and interactions
interface ExtendedClient extends Client {
  commands: Collection<string, Command>;
  interactions: Collection<string, Command>;
  safemode: boolean;
  db: any;
}

export class CommandHandler {
  private client: ExtendedClient;
  private cooldowns: Collection<string, Collection<string, number>>;
  private db: any;
  constructor(client: ExtendedClient) {
    this.client = client;
    this.client.commands = new Collection();
    this.client.interactions = new Collection();
    this.db;
    this.cooldowns = new Collection();
    this.client.safemode = false; // Track safemode state
  }

  // Load commands from a specific folder
  loadCommandsFromFolder(folderPath: string): void {
    console.log(`Loading commands from ${folderPath}...`);

    if (!fs.existsSync(folderPath)) {
      console.log(`Folder ${folderPath} does not exist.`);
      return;
    }

    const files = fs.readdirSync(folderPath);
    for (const file of files) {
      const filePath = path.join(folderPath, file);
      const fileStat = fs.statSync(filePath);
      if (fileStat.isDirectory()) {
        // If it's a directory, recursively load commands
        this.loadCommandsFromFolder(filePath);
      } else if (file.endsWith(".js") || file.endsWith(".ts")) {
        // Load JS files
        const commandModule = require(filePath);
        const command: Command = commandModule.default; // Access the default export
        if (command && typeof command.name === "string") {
          this.client.commands.set(command.name, command);
          console.log(`Command added: ${command.name}`);
        } else {
          console.log(`Non command File, skipped ${filePath}`);
        }
      } else {
        console.log(`Skipped non-command file: ${filePath}`);
      }
    }
  }

  // Load commands from the root directory
  loadCommands(): void {
    const commandsPath = path.join(__dirname, "..", "..", "commands");
    this.loadCommandsFromFolder(commandsPath);
  }

  // Load interactions similarly
  loadInteractions(): void {
    const interactionsPath = path.join(__dirname, "..", "..", "interactions");
    const interactionFiles = fs
      .readdirSync(interactionsPath)
      .filter((file) => file.endsWith(".js"));

    for (const file of interactionFiles) {
      const filePath = path.join(interactionsPath, file);
      const interaction = require(filePath);
      this.client.interactions.set(interaction.name, interaction);
      console.log(`Loaded interaction: ${interaction.name}`);
    }
  }

  // Handle a command
  async handleCommand(message: Message): Promise<void> {
    if (!message.content) return;
    if (this.client.safemode) {
      message.reply("Commands are disabled due to safemode.");
      return;
    }

    const prefix = PREFIXES.find((p) => message.content.startsWith(p));
    if (!prefix || message.author.bot) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift()?.toLowerCase();

    if (!commandName) return;
    const command =
      this.client.commands.get(commandName) ||
      this.client.commands.find((c) => c.aliases?.includes(commandName));

    if (!command) return;

    // Cooldown logic
    const now = Date.now();
    const cooldownAmount = (command.cooldown || 3) * 1000;
    const cooldowns = this.cooldowns.get(command.name) || new Collection();

    if (cooldowns.has(message.author.id)) {
      const expirationTime = cooldowns.get(message.author.id)! + cooldownAmount;
      if (now < expirationTime) {
        const timeLeft = (expirationTime - now) / 1000;
        message.reply(
          `Please wait ${timeLeft.toFixed(
            1
          )} more seconds before reusing the \`${command.name}\` command.`
        );
        return;
      }
    }

    cooldowns.set(message.author.id, now);
    this.cooldowns.set(command.name, cooldowns);
    setTimeout(() => cooldowns.delete(message.author.id), cooldownAmount);

    try {
      await command.execute(this.client, message, args);
    } catch (error) {
      console.error("Error executing command:", error);
      message.reply("There was an error executing that command!");
    }
  }

  // Handle interactions
  async handleInteraction(interaction: CommandInteraction): Promise<void> {
    let message: String = "gay";
    if (!interaction.isCommand()) return;
    if (this.client.safemode) {
      interaction.reply({
        content: "Commands are disabled due to safemode.",
        ephemeral: true,
      });
      return;
    }

    const interactionCommand = this.client.interactions.get(
      interaction.commandName
    );
    if (!interactionCommand) return;

    try {
      // await interactionCommand.execute(this.client, interaction, message );
      console.log("will fix later");
    } catch (error) {
      console.error("Error executing interaction:", error);
      interaction.reply({
        content: "There was an error executing that interaction!",
        ephemeral: true,
      });
    }
  }
}
