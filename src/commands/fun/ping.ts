import { Client, Message, TextChannel, NewsChannel } from "discord.js";
import { Command } from "../../@types/command";
import { ExtendedClient } from "../..";

const pingCommand: Command = {
  name: "ping",
  description: "Check the bot's latency",
  aliases: ["pong"],
  cooldown: 5,
  async execute(
    client: ExtendedClient,
    message: Message,
    args: string[]
  ): Promise<void> {
    const latency = Date.now() - message.createdTimestamp;

    // Check if the channel is a TextChannel or NewsChannel
    await (message.channel as TextChannel).send(`Pong! Latency: ${latency}ms`);
  },
};

export default pingCommand;
