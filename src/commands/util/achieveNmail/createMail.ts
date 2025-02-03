import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  EmbedBuilder,
  Message,
  TextChannel,
} from "discord.js";
import { ExtendedClient } from "../../..";
import { Command } from "../../../@types/command";
import { MailTo } from "./mailClass";
import { mongoClient } from "../../../data/mongo/mongo";

const db = mongoClient.db("Akaimnky");
const collection: any = db.collection("akaillection");
const createMailCommand: Command = {
  name: "createmail",
  description: "Create a mail template.",
  async execute(
    client: ExtendedClient,
    message: Message<boolean>,
    args: string[]
  ): Promise<void> {
    try {
      const input = args.join(" "); // Combine all arguments into a single string
      const match = input.match(/"([^"]+)"\s+"([^"]+)"\s+"([^"]+)"/);

      if (!match) {
        message.reply(
          'Usage: `!createmail "<mailId>" "<subject>" "<message>"`'
        );
        return;
      }

      const [, mailId, subject, messageContent] = match; // Extract mailId, subject, and message
      if (!mailId || !subject || !messageContent) {
        message.reply(
          'Usage: `!createmail "<mailId>" "<subject>" "<message>"`'
        );
        return;
      }

      console.log(`Creating mail with ID: ${mailId}, Subject: ${subject}`);

      await MailTo.createMail({
        mailId,
        subject,
        message: messageContent,
        mailTrigger: "admin-command",
      });

      message.reply(`Mail created successfully! Mail ID: ${mailId}`);
    } catch (error) {
      console.error(error);
      message.reply("Failed to create mail. Please try again.");
    }
  },
};

export default createMailCommand;
