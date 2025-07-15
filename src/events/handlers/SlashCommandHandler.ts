import {
    Collection,
    REST,
    Routes,
    SlashCommandBuilder,
    CommandInteraction,
    Interaction,
  } from "discord.js";
  import fs from "fs";
  import path from "path";
  import { SlashCommand } from "../../@types/command";
  import { ExtendedClient } from "../..";
  
  export class SlashCommandHandler {
    private client: ExtendedClient;
    private commandData: SlashCommandBuilder[] = [];
  
    constructor(client: ExtendedClient) {
      this.client = client;
      this.client.interactions = new Collection();
    }
  
    // Load slash commands from all folders inside slashCommands directory
    async loadSlashCommands(): Promise<void> {
      const commandsPath = path.join(__dirname, "..", "..", "slashCommands");
      await this.walkDirectory(commandsPath);
      await this.registerToDiscord();
    }
  
    // Walk through all directories and load command files
    private async walkDirectory(dir: string): Promise<void> {
      const files = fs.readdirSync(dir);
  
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
  
        if (stat.isDirectory()) {
          await this.walkDirectory(fullPath); // Recurse into subdirectories
        } else if (file.endsWith(".ts") || file.endsWith(".js")) {
          await this.loadCommand(fullPath);
        }
      }
    }
  
    // Load a single command from the file
    private async loadCommand(filePath: string): Promise<void> {
      try {
        const cmdModule = await import(filePath);
        const command: SlashCommand = cmdModule.default;
  
        if (!command?.data?.name || typeof command.execute !== "function") return;
  
        // Add the command to the interactions collection and commandData array
        this.client.interactions.set(command.data.name, command);
        this.commandData.push(command.data);
  
        console.log(`✅ Loaded slash command: ${command.data.name}`);
      } catch (err) {
        console.error(`❌ Error loading slash command: ${filePath}`, err);
      }
    }
  
    // Register the commands with Discord API
    private async registerToDiscord(): Promise<void> {
      const rest = new REST({ version: "10" }).setToken(this.client.token as string);
  
      try {
        const appId = this.client.user?.id;
        if (!appId) throw new Error("Client application ID not found");
  
        // Fetch current commands registered in Discord
        const existingCommands = await rest.get(Routes.applicationCommands(appId)) as SlashCommandBuilder[];
  
        // Compare commands - only update if there are changes
        const newCommands = this.commandData.filter((newCommand) => {
          return !existingCommands.some(
            (existingCommand) => existingCommand.name === newCommand.name
          );
        });
  
        if (newCommands.length > 0) {
          // Register only new commands
          await rest.put(Routes.applicationCommands(appId), {
            body: newCommands,
          });
          console.log(`✅ Registered new or updated slash commands.`);
        } else {
          console.log(`No changes in slash commands. Skipping registration.`);
        }
  
      } catch (err) {
        console.error("❌ Failed to register slash commands", err);
      }
    }
  
    // Handle interaction (Slash command execution)
    async handleInteraction(interaction: Interaction): Promise<void> {
      if (!interaction.isCommand() || this.client.safemode) return;
  
      const command = this.client.interactions.get(interaction.commandName);
      if (!command) return;
  
      try {
        await command.execute(this.client, interaction as CommandInteraction);
      } catch (error) {
        console.error(`❌ Interaction Error [${command.data.name}]:`, error);
  
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({
            content: "Something went wrong while executing this command.",
            ephemeral: true,
          });
        } else {
          await interaction.reply({
            content: "Something went wrong while executing this command.",
            ephemeral: true,
          });
        }
      }
    }
  }
  