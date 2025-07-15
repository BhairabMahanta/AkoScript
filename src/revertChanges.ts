//index.ts
/*
import * as dotenv from "dotenv";
dotenv.config();

import {
  LoggingService,
  GuildLogConfigModel,
} from "./events/handlers/loggingService";
import {
  Client,
  Message,
  TextChannel,
  IntentsBitField,
  ActivityType,
  ChannelType,
  Events,
  GatewayIntentBits,
  Collection,
  Partials,
  EmbedBuilder,
  Interaction,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  MessageActionRowComponentBuilder,
} from "discord.js";
import { connectToDB, mongoClient } from "./data/mongo/mongo";
import {
  Command,
  CommandHandler,
  GuildSettingsModel,
} from "./events/handlers/commandHandler";
// import { loadCommands } from "./handler.js";
import path from "path";
import fs from "fs";
import { MongoClient } from "mongodb";
import { BotConfig } from "./events/handlers/commandHandler";
export class ExtendedClient extends Client {
  config: BotConfig;
  commands: Collection<string, Command>;
  commandCategories: Map<string, Command[]>;
  interactions: Collection<string, Command>;
  generateHelpEmbed: any;
  safemode: boolean;
  db: {
    GuildSettings: typeof GuildSettingsModel;
    LogConfig: typeof GuildLogConfigModel; // Add this
  };
  logger: LoggingService; // Add this

  constructor(config: BotConfig) {
    super({
      shards: "auto",
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMembers,
      ],
      partials: [Partials.Message, Partials.Channel, Partials.Reaction],
      rest: {
        timeout: 30000, // 30 seconds timeout
      },
    });

    this.config = config;
    this.commands = new Collection();
    this.commandCategories = new Map();
    this.generateHelpEmbed = null;
    this.interactions = new Collection();
    this.safemode = false;
    this.db = {
      GuildSettings: GuildSettingsModel,
      LogConfig: GuildLogConfigModel, // Add this
    };
    this.logger = LoggingService.getInstance(); // Initialize logger
  }
  async reloadCommand(commandName: string): Promise<void> {
    try {
      console.log(`Reloading command: ${commandName}`);
      // Add your reload command logic here
    } catch (error) {
      console.error(`Failed to reload command ${commandName}:`, error);
    }
  }
}
import { CONFIG } from "./config";

const client = new ExtendedClient(CONFIG);

const BOT_PREFIX = "a!";
const commandHandler = new CommandHandler(client, CONFIG);
commandHandler.loadCommands();

// Interaction handler
import interactionHandler from "./events/handlers/interactionHandler";
import { checkQuestCompletion } from "./commands/util/glogic";

client.on(Events.InteractionCreate, interactionHandler);

interface Event {
  name: string;
  once?: boolean;
  execute: (client: Client, ...args: any[]) => void;
}
client.on("messageCreate", async (message: Message): Promise<void> => {
  try {
    commandHandler.handleCommand(message);
    //  }
  } catch (error) {
    console.log("Error handling command:", error);
    // Log the error using the new system
    client.logger.logCommand({
      userId: message.author.id,
      guildId: message.guild?.id,
      command: "UNKNOWN",
      args: [],
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Fix for loading events with args
const eventsPath = path.join(__dirname, "events");
const eventFiles: string[] = fs
  .readdirSync(eventsPath)
  .filter((file) => file.endsWith(".js") || file.endsWith(".ts"));

for (const file of eventFiles) {
  const event: Event = require(path.join(eventsPath, file));
  const eventMethod = event.once ? "once" : "on";

  // Ensure proper typing for spreading the arguments and passing the client
  client[eventMethod](event.name, (...args: any[]) =>
    event.execute(client, ...args)
  );
}

client.on("ready", async () => {
  console.log(`${client.user?.tag} is ready! 🚀`);
  console.log("db issue?");
  await connectToDB();
  console.log("notDBissue");
  updateStatus("Akai is breaking stuff again.");
});

// setInterval(checkQuestCompletion, 10000 * 60);

process.on("SIGINT", () => {
  updateStatus("Bot is restarting...")
    .then(() => process.exit())
    .catch((err) => {
      console.error("Error sending status update on restart:", err);
    });
});

process.on("uncaughtException", async (err) => {
  console.error("[UNCAUGHT EXCEPTION]", err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("[UNHANDLED REJECTION]", reason);
  // Optionally log to a file or notify the owner
});
process.on("InteractionAlreadyReplied", (reason, promise) => {
  console.error("[INTERACTION REPLIED]", reason);
  // Optionally log to a file or notify the owner
});

client.on(Events.GuildCreate, () => updateStatus("Bot joined a new server."));
client.on(Events.GuildDelete, () => updateStatus("Bot left a server."));

async function updateStatus(message: string) {
  console.log("HIIIIIII");
  if (!client.user) {
    console.log("Client user is not available");
    return;
  }

  const guildCount = client.guilds.cache.size;
  const statusMessage = ` ${guildCount} server${guildCount !== 1 ? "s" : ""} `;

  try {
    client.user.setPresence({
      activities: [
        {
          name: `Watching myself being coded in ${statusMessage}`,
          type: ActivityType.Watching,
        },
      ],
      status: "online",
    });

    const channel = await client.channels.fetch(
      process.env.STATUS_CHANNEL_ID || ""
    );
    if (
      channel &&
      channel.type === ChannelType.GuildText &&
      channel.guild.id === process.env.SERVER_ID
    ) {
      (channel as TextChannel).send(message);
    }
  } catch (error) {
    console.error("Error updating status:", error);
  }
}
client.login(process.env.TOKEN);

// Export client if necessary
export { client };
*/

//logging service.ts
/*
import mongoose from "mongoose";

// Add to your interfaces
interface CommandLog {
  userId: string;
  guildId?: string;
  command: string;
  args: string[];
  timestamp: Date;
  success: boolean;
  error?: string;
}

interface GuildLogConfig extends mongoose.Document {
  guildId: string;
  loggingEnabled: boolean;
  logChannel?: string;
}

// Logging schema
const guildLogConfigSchema = new mongoose.Schema<GuildLogConfig>({
  guildId: { type: String, required: true, unique: true },
  loggingEnabled: { type: Boolean, default: false },
  logChannel: { type: String },
});

export const GuildLogConfigModel = mongoose.model<GuildLogConfig>(
  "GuildLogConfig",
  guildLogConfigSchema
);

// Logging Service Class
// Add to your existing schemas

const commandLogSchema = new mongoose.Schema<CommandLog>({
  userId: { type: String, required: true },
  guildId: String,
  command: { type: String, required: true },
  args: { type: [String], default: [] },
  timestamp: { type: Date, default: Date.now },
  success: Boolean,
  error: String,
});

export const CommandLogModel = mongoose.model<CommandLog>(
  "CommandLog",
  commandLogSchema
);
export class LoggingService {
  private static instance: LoggingService;
  private constructor() {}

  static getInstance(): LoggingService {
    if (!LoggingService.instance) {
      LoggingService.instance = new LoggingService();
    }
    return LoggingService.instance;
  }

  async logCommand(entry: Omit<CommandLog, "timestamp">): Promise<void> {
    const logEntry = new CommandLogModel({ ...entry, timestamp: new Date() });
    await logEntry.save();
  }

  async getLogs(guildId: string, limit = 100): Promise<CommandLog[]> {
    return CommandLogModel.find({ guildId })
      .sort({ timestamp: -1 })
      .limit(limit);
  }

  async isLoggingEnabled(guildId: string): Promise<boolean> {
    const config = await GuildLogConfigModel.findOne({ guildId });
    return config?.loggingEnabled || false;
  }
}
*/
