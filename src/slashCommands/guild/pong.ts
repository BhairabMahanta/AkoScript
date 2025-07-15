import { SlashCommand } from "../../@types/command";
import { SlashCommandBuilder, CommandInteraction } from "discord.js";
import { ExtendedClient } from "../..";

const pingCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("pong")
    .setDescription("Replies with Pingg!"),

  async execute(client: ExtendedClient, interaction: CommandInteraction) {
    console.log("✅ Pong command executed");
    await interaction.reply("Ping!");
  },
};

export default pingCommand;
