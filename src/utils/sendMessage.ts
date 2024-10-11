// src/utils/messageUtils.ts
import { TextChannel, NewsChannel, Channel } from "discord.js";

export async function sendMessage(channel: Channel, content: any) {
  if (channel instanceof TextChannel || channel instanceof NewsChannel) {
    await channel.send(content);
  } else {
    console.error(
      "The command was sent in a channel that doesn't support sending messages."
    );
  }
}
