import {
  Client,
  Message,
  Interaction,
  EmbedBuilder,
  TextChannel,
} from "discord.js";
import { Collection, Db } from "mongodb";

// Mock Discord.js Client
const client = new Client({ intents: [] });

// Mock Discord Message
export const mockMessage: Message = {
  id: "mock-message-id",
  content: "Default message content",
  author: {
    id: "mock-author-id",
    username: "MockUser",
    bot: false,
  },
  channel: {
    id: "mock-channel-id",
    send: async () => Promise.resolve(null),
  } as unknown as TextChannel,
  client,
  delete: async () => Promise.resolve(),
  edit: async () => Promise.resolve(),
  guild: null,
} as unknown as Message;

// Mock Discord Interaction
export const mockInteraction: Interaction = {
  id: "mock-interaction-id",
  user: {
    id: "mock-user-id",
    username: "MockInteractionUser",
  },
  guild: null,
} as unknown as Interaction;

// Mock EmbedBuilder
export const mockEmbed = new EmbedBuilder().setTitle("Default Embed");

// Mock Database Objects
export const mockDb = {} as unknown as Db;
export const mockCollection = {} as unknown as Collection;

// Mock Player Data
export const mockPlayerData = {
  activeQuests: {},
  gainExperience: (exp: number) => console.log(`Gained ${exp} experience`),
  gainItems: (items: string[]) =>
    console.log(`Gained items: ${items.join(", ")}`),
};
