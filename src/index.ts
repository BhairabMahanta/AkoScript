// index.ts - CLEAN VERSION
import * as dotenv from "dotenv";
dotenv.config();
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
  BotConfig,
  CommandHandler,
  GuildSettingsModel,
} from "./events/handlers/commandHandler";
import path from "path";
import fs from "fs";
import { MongoClient } from "mongodb";
import { Command } from "./events/handlers/commandHandler";
// ONLY IMPORT APIMonitor
import { APIMonitor } from "./monitoring/APIMonitor";

export class ExtendedClient extends Client {
  config: BotConfig;
  commands: Collection<string, Command>;
  commandCategories: Map<string, Command[]>;
  interactions: Collection<string, SlashCommand>;
  safemode: boolean;
  db: {
    GuildSettings: typeof GuildSettingsModel;
  };
  
  // ONLY API monitoring - no battle tracker
  apiMonitor: APIMonitor;

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
        timeout: 30000,
      },
    });

    this.config = config;
    this.commands = new Collection();
    this.commandCategories = new Map();
    this.interactions = new Collection();
    this.safemode = false;
    this.db = {
      GuildSettings: GuildSettingsModel,
    };
    
    // ONLY initialize basic API monitoring
    this.apiMonitor = new APIMonitor();
    this.setupAPIMonitoring();
  }

private setupAPIMonitoring(): void {
  // Monitor rate limits
  this.rest.on('rateLimited', (rateLimitData) => {
    console.warn(`🚨 Rate Limited - Route: ${rateLimitData.route}`);
    this.apiMonitor.trackRateLimit(rateLimitData);
  });

  // Monitor API responses with enhanced header parsing
  this.rest.on('response', (request, response) => {
    const rateLimitHeaders = {
      limit: response.headers.get('x-ratelimit-limit'),
      remaining: response.headers.get('x-ratelimit-remaining'),
      resetAfter: response.headers.get('x-ratelimit-reset-after'),
      bucket: response.headers.get('x-ratelimit-bucket'),
      global: response.headers.get('x-ratelimit-global') === 'true',
      scope: response.headers.get('x-ratelimit-scope')
    };
    
    // Pass headers to tracking
    this.apiMonitor.trackAPICall(request.method, request.path, rateLimitHeaders);
  });
}
  
  async reloadCommand(commandName: string): Promise<void> {
    try {
      console.log(`Reloading command: ${commandName}`);
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

// Keep your existing interaction handler import
import interactionHandler from "./events/handlers/interactionHandler";
import { checkQuestCompletion } from "./commands/util/glogic";
import { SlashCommand } from "./@types/command";
import { SlashCommandHandler } from "./events/handlers/SlashCommandHandler";

client.on(Events.InteractionCreate, interactionHandler);

client.on("messageCreate", async (message: Message): Promise<void> => {
  try {
    if (message.content.toLowerCase().startsWith(`${BOT_PREFIX}`)) {
      const args: string[] = message.content.slice(2).trim().split(/ +/);
      const commandName: string | undefined = args.shift()?.toLowerCase();

      console.log(`Received command: ${commandName}`);
      
      // Simple command tracking
      const startTime = Date.now();
      await commandHandler.handleCommand(message);
      const executionTime = Date.now() - startTime;
      
      // Log basic command metrics
      await logCommandUsage(commandName, message.guildId, executionTime, message.author.id);
    }
  } catch (error) {
    console.log("Error handling command:", error);
  }
});

async function logCommandUsage(
  commandName: string | undefined, 
  guildId: string | null, 
  executionTime: number,
  userId: string
): Promise<void> {
  try {
    const db = mongoClient.db("Akaimnky");
    const collection = db.collection('command_usage');
    
    await collection.insertOne({
      command: commandName,
      guildId,
      userId,
      executionTime,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Failed to log command usage:', error);
  }
}

// Rest of your existing code stays the same...
const eventsPath = path.join(__dirname, "events");
const eventFiles: string[] = fs
  .readdirSync(eventsPath)
  .filter((file) => file.endsWith(".js") || file.endsWith(".ts"));

for (const file of eventFiles) {
  const event: any = require(path.join(eventsPath, file));
  const eventMethod = event.once ? "once" : "on";
  client[eventMethod](event.name, (...args: any[]) =>
    event.execute(client, ...args)
  );
}

client.on("ready", async () => {
  console.log(`${client.user?.tag} is ready! 🚀`);
  const db = await connectToDB();
  const slashHandler = new SlashCommandHandler(client);
  await slashHandler.loadSlashCommands();
  updateStatus("Akai is breaking stuff again.");
  
  // Detailed monitoring reports every 2 minutes
  setInterval(() => {
    client.apiMonitor.printDetailedStats();
  }, 120000); // Every 2 minutes
  
  // Quick status every 30 seconds
  setInterval(() => {
    const metrics = client.apiMonitor.getMetrics();
    console.log(`🚀 Quick Stats: ${metrics.callsLast60Seconds} calls/60s | ${metrics.globalCallsPerSecond.toFixed(1)} RPS | ${metrics.rateLimitHits} rate limits`);
  }, 30000); // Every 30 seconds
  
  // Reset daily to prevent memory buildup
  setInterval(() => {
    console.log("🔄 Daily API monitoring reset");
    client.apiMonitor.reset();
  }, 24 * 60 * 60 * 1000); // Every 24 hours
});

// All your existing functions stay the same...
setInterval(checkQuestCompletion, 10000 * 60);

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
});

client.on(Events.GuildCreate, () => updateStatus("Bot joined a new server."));
client.on(Events.GuildDelete, () => updateStatus("Bot left a server."));

async function updateStatus(message: string) {
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

export { client };
