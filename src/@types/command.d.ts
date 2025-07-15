// src/types/command.d.ts
import { Client, Message, TextChannel, NewsChannel, SlashCommandBuilder, CommandInteraction } from "discord.js";
import { ExtendedClient } from "..";
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
export interface SlashCommand {
  data: SlashCommandBuilder;
  execute: (
    client: ExtendedClient,
    interaction: CommandInteraction
  ) => Promise<void>;
}
