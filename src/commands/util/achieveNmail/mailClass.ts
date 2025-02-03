import MailModel from "../../../data/mongo/mailingSchema";
import mongoose from "mongoose";

interface Reward {
  coins?: number;
  gems?: number;
  xp?: number;
  items?: string[];
}

interface MailOptions {
  subject: string;
  message: string;
  rewards?: Reward;
  mailTrigger?: string;
  recipientId?: string; // Null for global or group mails
  targetGroup?: string[]; // Group of recipients
  expiresAt?: number; // Optional expiration
}

export class MailTo {
  static async createMail(options: {
    mailId: string;
    subject: string;
    message: string;
    rewards?: Reward;
    mailTrigger?: string;
    expiresAt?: number;
  }): Promise<any> {
    const {
      mailId,
      subject,
      message,
      rewards = {},
      mailTrigger = "default",
      expiresAt = null,
    } = options;
    const id = mailId;
    if (!subject || !message) {
      throw new Error("Missing required fields: subject or message.");
    }

    const newMail = new MailModel({
      id,
      subject,
      message,
      rewards,
      mailTrigger,
      expiresAt,
      sentAt: Date.now(),
    });

    try {
      const savedMail = await newMail.save();
      console.log("Mail saved successfully:", savedMail);
      return savedMail;
    } catch (err) {
      console.error("Error saving mail:", err);
      throw err;
    }
  }

  static async sendMail(
    mailId: string,
    options: {
      recipientId: string | string[] | "everyone";
      rewardClaimed: Boolean;
      expiresAt?: number;
    },
    collection: any
  ): Promise<void> {
    const { recipientId, expiresAt = null, rewardClaimed = false } = options;

    if (!recipientId || !mailId) {
      throw new Error("Missing required fields: recipientId or mailId.");
    }

    const mailEntry = {
      id: mailId, // Reference to the mail in the mailing database
      read: false,
      receivedAt: Date.now(),
      expiresAt,
      rewardClaimed,
    };

    if (recipientId === "everyone") {
      // Send to all players
      const players = await collection.find({}).toArray();
      for (const player of players) {
        if (!player.mail) player.mail = [];
        player.mail.push(mailEntry);
        await collection.updateOne(
          { _id: player._id },
          { $set: { mail: player.mail } },
          { upsert: true }
        );
      }
    } else if (Array.isArray(recipientId)) {
      // Send to multiple specific players
      for (const id of recipientId) {
        const player = await collection.findOne({ _id: id });
        if (!player) continue; // Skip if player doesn't exist
        if (!player.mail) player.mail = [];
        player.mail.push(mailEntry);
        await collection.updateOne(
          { _id: id },
          { $set: { mail: player.mail } },
          { upsert: true }
        );
      }
    } else {
      // Send to a single player
      const player = await collection.findOne({ _id: recipientId });
      if (!player) {
        throw new Error(`Player with ID ${recipientId} not found.`);
      }
      if (!player.mail) player.mail = [];
      player.mail.push(mailEntry);
      await collection.updateOne(
        { _id: recipientId },
        { $set: { mail: player.mail } },
        { upsert: true }
      );
    }
  }

  static async sendOldMail(
    options: {
      recipientId: string | string[] | "everyone";
      subject: string;
      message: string;
      rewards?: Reward;
      expiresAt?: number;
      mailTrigger?: string;
    },
    collection: any
  ): Promise<void> {
    const {
      recipientId,
      subject,
      message,
      rewards = {},
      expiresAt = null,
      mailTrigger = "default",
    } = options;

    if (!recipientId || !subject || !message) {
      throw new Error(
        "Missing required fields: recipientId, subject, or message."
      );
    }

    const mail = {
      id: new mongoose.Types.ObjectId().toString(),
      read: false,
      subject,
      message,
      rewards,
      sentAt: Date.now(),
      expiresAt,
      mailTrigger,
    };

    if (recipientId === "everyone") {
      // Send to all players
      const players = await collection.find({}).toArray();
      for (const player of players) {
        if (!player.mail) player.mail = [];
        player.mail.push(mail);
        await collection.updateOne(
          { _id: player._id },
          { $set: { mail: player.mail } },
          { upsert: true }
        );
      }
    } else if (Array.isArray(recipientId)) {
      // Send to multiple specific players
      for (const id of recipientId) {
        const player = await collection.findOne({ _id: id });
        if (!player) continue; // Skip if player doesn't exist
        if (!player.mail) player.mail = [];
        player.mail.push(mail);
        await collection.updateOne(
          { _id: id },
          { $set: { mail: player.mail } },
          { upsert: true }
        );
      }
    } else {
      // Send to a single player
      const player = await collection.findOne({ _id: recipientId });
      if (!player) {
        throw new Error(`Player with ID ${recipientId} not found.`);
      }
      if (!player.mail) player.mail = [];
      player.mail.push(mail);
      await collection.updateOne(
        { _id: recipientId },
        { $set: { mail: player.mail } },
        { upsert: true }
      );
    }
  }
}
