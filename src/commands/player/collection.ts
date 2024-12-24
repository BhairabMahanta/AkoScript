import { mongoClient } from "../../data/mongo/mongo";
import {
  EmbedBuilder,
  ButtonBuilder,
  ActionRowBuilder,
  Message,
  Interaction,
} from "discord.js";
import { Command } from "../../@types/command";

const db = mongoClient.db("Akaimnky");
const collectionh: any = db.collection("akaillection");
import { ExtendedClient } from "../../index";
const collectionCommand: Command = {
  name: "collection",
  description: "View your collection of familiars.",
  aliases: ["col"],
  async execute(
    client: ExtendedClient,
    message: Message<boolean>,
    args: string[]
  ): Promise<void> {
    const playerId = message.author.id;

    const filterr = { _id: playerId };
    const playerData = await collectionh.findOne(filterr);

    if (!playerData) {
      return (message.channel as any).send("You are not registered yet.");
    }

    // Ensure collection is an array
    const collection = Array.isArray(playerData.collectionInv)
      ? playerData.collectionInv
      : [];

    if (collection.length === 0) {
      return (message.channel as any).send("Your collection is empty.");
    }

    // Pagination variables
    const itemsPerPage = 15;
    let currentPage = parseInt(args[0]) || 1;
    const totalPages = Math.ceil(collection.length / itemsPerPage);

    if (currentPage > totalPages) {
      currentPage = totalPages;
    } else if (currentPage < 1) {
      currentPage = 1;
    }

    // Slice the collection for the current page
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedCollection = collection.slice(startIndex, endIndex);

    // Create the embed
    const embed = new EmbedBuilder()
      .setTitle(
        `Your Collection (${
          endIndex < collection.length
            ? `${startIndex} - ${endIndex}`
            : `${startIndex} - ${collection.length}`
        }/${collection.length})`
      )
      .setColor(0x00ae86)
      .setDescription(
        paginatedCollection
          .map(
            (item: any) =>
              `• \`\`(ID: ${item.serialId
                .toString()
                .padStart(4, " ")})\`\`   \`\` T• ${item.stats.tier
                .toString()
                .padStart(2, " ")}\`\`   **${item.name}**`
          )
          .join("\n")
      )
      .setFooter({ text: `Page ${currentPage} of ${totalPages}` });

    const firstButton = new ButtonBuilder()
      .setCustomId("first")
      .setLabel("◀️")
      .setStyle(1)
      .setDisabled(currentPage === 1);
    const previousButton = new ButtonBuilder()
      .setCustomId("previous")
      .setLabel("←")
      .setStyle(2)
      .setDisabled(currentPage === 1);

    const nextButton = new ButtonBuilder()
      .setCustomId("next")
      .setLabel("→")
      .setStyle(2)
      .setDisabled(currentPage === totalPages);
    const lastButton = new ButtonBuilder()
      .setCustomId("last")
      .setLabel("▶️")
      .setStyle(1)
      .setDisabled(currentPage === totalPages);

    const row = new ActionRowBuilder().addComponents(
      firstButton,
      previousButton,
      nextButton,
      lastButton
    );

    const msg = await (message.channel as any).send({
      embeds: [embed],
      components: [row],
    });

    // Create a collector for the buttons
    const filter = (interaction: Interaction) =>
      interaction.user.id === message.author.id;
    const collector = msg.createMessageComponentCollector({
      filter,
      time: 300000,
    });

    collector.on("collect", async (interaction: any) => {
      if (interaction.customId === "previous") {
        currentPage--;
      } else if (interaction.customId === "next") {
        currentPage++;
      }

      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      const paginatedCollection = collection.slice(startIndex, endIndex);

      const embed = new EmbedBuilder()
        .setTitle(
          `Your Collection (${
            endIndex < collection.length
              ? `${startIndex} - ${endIndex}`
              : `${startIndex} - ${collection.length}`
          }/${collection.length})`
        )
        .setColor(0x00ae86)
        .setDescription(
          paginatedCollection
            .map(
              (item: any) =>
                `• \`\`(ID: ${item.serialId
                  .toString()
                  .padStart(4, " ")})\`\`   \`\` T• ${item.stats.tier
                  .toString()
                  .padStart(2, " ")}\`\`   **${item.name}**`
            )
            .join("\n")
        )
        .setFooter({ text: `Page ${currentPage} of ${totalPages}` });

      const firstButton = new ButtonBuilder()
        .setCustomId("first")
        .setLabel("◀️")
        .setStyle(1)
        .setDisabled(currentPage === 1);
      const previousButton = new ButtonBuilder()
        .setCustomId("previous")
        .setLabel("←")
        .setStyle(2)
        .setDisabled(currentPage === 1);

      const nextButton = new ButtonBuilder()
        .setCustomId("next")
        .setLabel("→")
        .setStyle(2)
        .setDisabled(currentPage === totalPages);
      const lastButton = new ButtonBuilder()
        .setCustomId("last")
        .setLabel("▶️")
        .setStyle(1)
        .setDisabled(currentPage === totalPages);

      const row = new ActionRowBuilder().addComponents(
        firstButton,
        previousButton,
        nextButton,
        lastButton
      );

      await interaction.update({ embeds: [embed], components: [row] });
    });

    collector.on("end", () => {
      msg.edit({ components: [] });
    });
  },
};
export default collectionCommand;
