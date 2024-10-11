// src/types/command.d.ts
import { Client, Message, TextChannel, NewsChannel } from "discord.js";
import { ExtendedClient } from "..";

export interface Command {
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
