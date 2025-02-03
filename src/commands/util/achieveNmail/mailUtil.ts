import { EmbedBuilder } from "discord.js";
import { Collection } from "mongodb";

export async function fetchPlayerData(playerCollection: any, userId: string) {
  console.log("Fetching player data...");
  const playerData = await playerCollection.findOne({ _id: userId });
  console.log("Player data fetched.");
  return playerData;
}

export async function fetchAllMails(mailCollection: any) {
  console.log("Fetching all mail data...");
  const allMails = await mailCollection.find({}).toArray();
  console.log("All mail data fetched.");
  return allMails;
}

export async function fetchSpecificMail(
  mailCollection: any,
  mailId: string,
  recipientId: string
) {
  console.log("Fetching specific mail...");
  const selectedMail = await mailCollection.findOne({
    id: mailId,
    recipientId: recipientId,
  });
  console.log("Specific mail fetched.");
  return selectedMail;
}

export function createMailEmbed(
  title: string,
  description: string,
  footer?: string
) {
  return new EmbedBuilder()
    .setTitle(title)
    .setColor("Blue")
    .setDescription(description)
    .setFooter(footer ? { text: footer } : null);
}

export function paginate(array: any[], page: number, itemsPerPage: number) {
  const startIndex = (page - 1) * itemsPerPage;
  return array.slice(startIndex, startIndex + itemsPerPage);
}

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Message,
  TextChannel,
} from "discord.js";
export const handlePagination = async (
  message: Message<boolean>,
  allMails: any[],
  currentPage: number,
  mailsPerPage: number
) => {
  const paginatedMails = paginate(allMails, currentPage, mailsPerPage);
  const mailOptions = paginatedMails.map((mail: any) => ({
    label: mail.subject,
    description: `Received: ${new Date(mail.receivedAt).toLocaleDateString()}`,
    value: mail.id,
  }));

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId("select-mail")
    .setPlaceholder("Select a mail to view")
    .addOptions(mailOptions);

  const mailEmbed = createMailEmbed(
    "Your Inbox",
    paginatedMails
      .map(
        (mail: any, index: number) =>
          `**${index + (currentPage - 1) * mailsPerPage + 1}.** ${mail.subject}`
      )
      .join("\n"),
    `Page ${currentPage} of ${Math.ceil(allMails.length / mailsPerPage)}`
  );

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`prev-${currentPage}`)
      .setLabel("◀ Previous")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(currentPage <= 1),
    new ButtonBuilder()
      .setCustomId(`next-${currentPage}`)
      .setLabel("Next ▶")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(currentPage >= Math.ceil(allMails.length / mailsPerPage))
  );
  const row2 = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    selectMenu
  );
  const msg = await (message.channel as TextChannel).send({
    embeds: [mailEmbed],
    components: [row, row2],
  });

  const filter = (i: any) => i.user.id === message.author.id;
  const collector = msg.createMessageComponentCollector({
    filter,
    time: 60000,
  });

  collector.on("collect", async (interaction: any) => {
    if (interaction.customId === "select-mail") {
      try {
        const selectedMailId = interaction.values[0]; // Get the selected mail ID from the values
        const selectedMail = allMails.find(
          (mail: any) => mail.id === selectedMailId
        );

        if (!selectedMail) {
          await interaction.reply({
            content: "Mail not found.",
            ephemeral: true,
          });
          return;
        }

        const embed = createMailEmbed(
          `Mail - ${selectedMail.subject}`,
          selectedMail.message,
          `Sent At: ${new Date(selectedMail.receivedAt).toLocaleString()}`
        );
        console.log("embedL:", embed);
        await interaction.update({
          embeds: [embed],
        });
      } catch (error) {
        console.error(error);
        await interaction.reply({
          content: "Failed to fetch the selected mail. Please try again.",
          ephemeral: true,
        });
      }
    } else {
      const [action, pageStr] = interaction.customId.split("-");
      let newPage = parseInt(pageStr);

      if (action === "next") newPage += 1;
      if (action === "prev") newPage -= 1;

      await handlePagination(message, allMails, newPage, mailsPerPage);
      await interaction.deferUpdate(); // Prevents "interaction already acknowledged" error
    }
  });

  collector.on("end", () => {
    row.setComponents(
      row.components.map((component) => component.setDisabled(true))
    );
    msg.edit({ components: [row] });
  });
};

import { StringSelectMenuBuilder, Interaction } from "discord.js";
