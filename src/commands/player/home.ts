import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  CommandInteraction,
  EmbedBuilder,
  Message,
  TextChannel,
} from "discord.js";
import { ExtendedClient } from "../..";
import { Command } from "../../@types/command";

const homeCommand: Command = {
  name: "home",
  description: "Displays your home screen with key features.",
  async execute(
    client: ExtendedClient,
    message: Message<boolean>,
    args: string[]
  ): Promise<void> {
    const embed = new EmbedBuilder()
      .setTitle("🏠 Home")
      .setDescription(
        "Welcome to your home screen! Use the buttons or dropdown below to navigate."
      )
      .setImage("attachment://homescreenimg.png") // Attach your image here
      .setColor("#3498db");

    // Buttons for key features
    const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("events")
        .setLabel("Events")
        .setStyle(ButtonStyle.Success)
        .setEmoji("🎉"), // Events Button

      new ButtonBuilder()
        .setCustomId("shop")
        .setLabel("Shop")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("🛒"), // Shop Button

      new ButtonBuilder()
        .setCustomId("profile")
        .setLabel("Profile")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("👤") // Profile Button
    );

    // Dropdown menu for additional features
    const selectMenuRow =
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("home_menu")
          .setPlaceholder("More Options")
          .addOptions([
            {
              label: "Monsters",
              description: "Manage your monsters and teams.",
              value: "monsters",
              emoji: "🐲",
            },
            {
              label: "World Map",
              description: "Explore the game world.",
              value: "worldmap",
              emoji: "🌍",
            },
            {
              label: "Summon",
              description: "Perform gacha summons.",
              value: "gacha",
              emoji: "✨",
            },
            {
              label: "Inbox",
              description: "View your mail and rewards.",
              value: "inbox",
              emoji: "📬",
            },
            {
              label: "Tutorial",
              description: "Learn game mechanics.",
              value: "tutorial",
              emoji: "📖",
            },
            {
              label: "Guild",
              description: "Manage or join a guild.",
              value: "guild",
              emoji: "🏰",
            },
          ])
      );

    await (message.channel as TextChannel).send({
      embeds: [embed],
      components: [buttonRow, selectMenuRow],
      files: ["./src/commands/player/images/homescreenimg.png"], // Update with the correct image path
    });
  },
};

export default homeCommand;
