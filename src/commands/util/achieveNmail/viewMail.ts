import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Message,
  TextChannel,
} from "discord.js";
import { ExtendedClient } from "../../..";
import { Command } from "../../../@types/command";
import { mongoClient } from "../../../data/mongo/mongo";

import {
  fetchPlayerData,
  fetchAllMails,
  fetchSpecificMail,
  createMailEmbed,
  paginate,
  handlePagination,
} from "./mailUtil";

const db = mongoClient.db("Akaimnky");
const playerCollection: any = db.collection("akaillection");
const mailCollection: any = db.collection("mails");

const viewMailCommand: Command = {
  name: "viewmail",
  description: "View your mail inbox.",
  aliases: ["vm"],
  async execute(
    client: ExtendedClient,
    message: Message<boolean>,
    args: string[]
  ): Promise<void> {
    try {
      const playerData = await fetchPlayerData(
        playerCollection,
        message.author.id
      );

      if (!playerData || !playerData.mail || playerData.mail.length === 0) {
        message.reply("Your inbox is empty.");
        return;
      }

      // Developer View
      if (args[0] === "--dev") {
        const allMails = await fetchAllMails(mailCollection);

        if (allMails.length === 0) {
          message.reply("No mail data found in the database.");
          return;
        }

        const devEmbed = createMailEmbed(
          "Your Inbox - Dev View",
          allMails
            .map(
              (mail: any, index: number) =>
                `**${index + 1}.** ID: ${mail.id}, Subject: ${mail.subject}`
            )
            .join("\n")
        );

        (message.channel as TextChannel).send({ embeds: [devEmbed] });
        return;
      }

      // Find Specific Mail
      if (args.length > 0 && !args[0].startsWith("--")) {
        const selectedMail = await fetchSpecificMail(
          mailCollection,
          args[0],
          message.author.id
        );

        if (!selectedMail) {
          message.reply("Mail not found.");
          return;
        }

        const mailEmbed = createMailEmbed(
          `Mail - ${selectedMail.subject}`,
          selectedMail.message,
          `Sent At: ${new Date(selectedMail.receivedAt).toLocaleString()}`
        );

        (message.channel as TextChannel).send({ embeds: [mailEmbed] });
        return;
      }

      // Paginated Normal View
      const mailsPerPage = 6;
      const currentPage = parseInt(args[0]) || 1;
      const mailIds = playerData.mail.map((mail: { id: any }) => mail.id);
      const allMails = await mailCollection
        .find({ id: { $in: mailIds.map(String) } })
        .toArray();

      await handlePagination(message, allMails, currentPage, mailsPerPage);
    } catch (error) {
      console.error(error);
      message.reply("Failed to view your inbox. Please try again.");
    }
  },
};

export default viewMailCommand;
