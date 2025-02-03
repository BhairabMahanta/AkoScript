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

const sendMailCommand: Command = {
  name: "sendmail",
  description: "Send mail to a player or group of players.",
  async execute(
    client: ExtendedClient,
    message: Message<boolean>,
    args: string[]
  ): Promise<void> {
    try {
      const input = args.join(" "); // Combine all arguments into a single string
      const match = input.match(
        /"([^"]+)"\s+"([^"]+)"\s+"([^"]+)"(?:\s+"([^"]+)")?/
      );

      if (!match) {
        message.reply(
          'Usage: `!sendmail "<mailId>" "<recipientId|everyone>" "<rewardClaimed (true/false)>" ["<expiresAt (timestamp)>"]`'
        );
        return;
      }

      const [, mailId, recipientId, rewardClaimedStr, expiresAtStr] = match; // Extract arguments
      const rewardClaimed = rewardClaimedStr.toLowerCase() === "true";
      const expiresAt = expiresAtStr ? parseInt(expiresAtStr, 10) : undefined;

      if (!mailId || !recipientId) {
        message.reply(
          'Usage: `!sendmail "<mailId>" "<recipientId|everyone>" "<rewardClaimed (true/false)>" ["<expiresAt (timestamp)>"]`'
        );
        return;
      }

      console.log(
        `Sending mail with ID: ${mailId} to: ${recipientId}, Reward Claimed: ${rewardClaimed}, Expires At: ${expiresAt}`
      );
      await MailTo.sendMail(
        mailId,
        {
          recipientId:
            recipientId === "everyone" ? "everyone" : recipientId.split(","),
          rewardClaimed,
          expiresAt,
        },
        collection
      );

      message.reply("Mail sent successfully!");
    } catch (error) {
      console.error(error);
      message.reply(
        "Failed to send mail. Please check the inputs and try again."
      );
    }
  },
};

export default sendMailCommand;
