import { SlashCommand } from "../@types/command";
import { SlashCommandBuilder, CommandInteraction } from "discord.js";
import { ExtendedClient } from "..";

const pingCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Replies with Pong!"),

  async execute(client: ExtendedClient, interaction: CommandInteraction) {
    console.log("✅ Ping command executed");
    await interaction.reply("Pong!");
  },
};

export default pingCommand;
