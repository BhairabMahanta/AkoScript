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
import { CommandHandler } from "./events/handlers/commandHandler";
// import { loadCommands } from "./handler.js";
import path from "path";
import fs from "fs";
import { MongoClient } from "mongodb";

export class ExtendedClient extends Client {
  commands: Collection<string, any>;
  interactions: Collection<string, any>;
  safemode: boolean;
  db: any;

  constructor() {
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
    });
    this.commands = new Collection();
    this.interactions = new Collection();
    this.safemode = false;
    this.db = null;
  }
}

const client = new ExtendedClient();

const db = mongoClient.db("Akaimnky");
const collection = db.collection("akaillection");

// client.db = null;

const BOT_PREFIX = "a!";
const commandHandler = new CommandHandler(client);
commandHandler.loadCommands();

// Interaction handler
import interactionHandler from "./events/handlers/interactionHandler";
import { checkQuestCompletion } from "./commands/util/glogic";

client.on(Events.InteractionCreate, interactionHandler);
interface Command {
  name: string;
  execute: (message: Message, args: string[]) => void;
}

interface Event {
  name: string;
  once?: boolean;
  execute: (client: Client, ...args: any[]) => void;
}
client.on("messageCreate", async (message: Message): Promise<void> => {
  try {
    if (message.content.toLowerCase().startsWith(`${BOT_PREFIX}`)) {
      const args: string[] = message.content.slice(2).trim().split(/ +/);
      const commandName: string | undefined = args.shift()?.toLowerCase();

      console.log(`Received command: ${commandName}`);

      commandHandler.handleCommand(message);
    }
  } catch (error) {
    console.log("Error handling command:", error);
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
  const db = await connectToDB(); // Connect to MongoDB when the bot is ready
  updateStatus("Akai is breaking stuff again.");

  client.db = db;
});

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
  // Optionally log to a file or notify the owner
});
process.on("InteractionAlreadyReplied", (reason, promise) => {
  console.error("[INTERACTION REPLIED]", reason);
  // Optionally log to a file or notify the owner
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

// Export client if necessary
export { client };
