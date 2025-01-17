import { Command } from "../../../../@types/command";
import { Adventure } from "./advClass";
import { ExtendedClient } from "../../../..";
import { mongoClient } from "../../../../data/mongo/mongo";
import {
  ActionRowBuilder,
  ButtonBuilder,
  EmbedBuilder,
  StringSelectMenuBuilder,
  TextChannel,
} from "discord.js";
import { allFloors } from "../../../data/information/loc";
const adventureCommand: Command = {
  name: "adventure",
  description: "Start an adventure!",
  aliases: ["a", "adv"],
  async execute(client: ExtendedClient, message, args): Promise<void> {
    const adventure = new Adventure(client);
    const db = mongoClient.db("Akaimnky");
    const playerCollection: any = db.collection("akaillection");
    const scenarioCollection: any = db.collection("scenarioData");
    const dbFilter = { _id: message.author.id };
    const player = await playerCollection.findOne(dbFilter);

    if (!player) {
      (message.channel as TextChannel).send("You have to register first!");
      return;
    }

    const playerName = player.name;
    const playerFloorIndex = 0; // Replace with the actual floor index
    const playerLocationIndex = 0; // Replace with the actual location index

    const selectedFloor = allFloors[playerFloorIndex];
    const selectedLocation = selectedFloor.locations[playerLocationIndex];

    const adventureConfirmEmbed = new EmbedBuilder()
      .setTitle(selectedLocation.name)
      .setDescription("Know what this journey of yours has to offer!")
      .addFields(
        {
          name: "**Quests**",
          value: selectedLocation.quests
            .map((quest) => `'${quest}'`)
            .join(", "),
          inline: false,
        },
        {
          name: "**Bosses**",
          value: selectedLocation.bosses
            .map((boss) => `\`${boss}\``)
            .join(", "),
          inline: false,
        },
        {
          name: "**Mobs**",
          value: `${selectedLocation.mobs.join("\n")}`,
          inline: false,
        },
        {
          name: "**Adventure**",
          value: "Go on the Adventure Lad!",
          inline: false,
        },
        {
          name: "**Difficulty**",
          value: `${selectedLocation.difficulty}`,
          inline: false,
        }
      );
    const optionSelectMenu = new StringSelectMenuBuilder()
      .setCustomId("option_select")
      .setPlaceholder("Select an option")
      .addOptions([
        { label: "Quests", value: "klik_quests" },
        { label: "Bosses", value: "klik_bosses" },
        { label: "Mobs", value: "klik_mobs" },
      ]);
    const stringMenuRow =
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        optionSelectMenu
      );
    const confirmationRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("start_adventure")
        .setLabel("Start")
        .setStyle(3),
      new ButtonBuilder()
        .setCustomId("cancel_adventure")
        .setLabel("Go Back")
        .setStyle(4)
    );

    const initialMessage = await (message.channel as TextChannel).send({
      embeds: [adventureConfirmEmbed],
      components: [stringMenuRow, confirmationRow],
    });

    adventure.setupCollector(
      message,
      initialMessage,
      player,
      selectedLocation,
      selectedFloor,
      stringMenuRow
    );
  },
};

export default adventureCommand;
