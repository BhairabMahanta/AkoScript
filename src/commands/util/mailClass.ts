import MailModel from "../../data/mongo/mailingSchema";
import mongoose from "mongoose";

interface Reward {
  coins?: number;
  gems?: number;
  xp?: number;
  items?: string[];
}

class MailTo {
  /**
   * Sends a global mail.
   * @param subject Title of the mail.
   * @param message Content of the mail.
   * @param rewards Optional rewards.
   * @param expiresAt Optional expiration timestamp.
   * @param targetGroup Optional group of target recipients.
   * @returns Created global mail.
   */
  async sendGlobalMail(
    subject: string,
    message: string,
    rewards: Reward = {},
    expiresAt?: number,
    targetGroup: string[] | null = null
  ) {
    const mail = new MailModel({
      id: new mongoose.Types.ObjectId().toString(),
      recipientId: null, // Global mail
      subject,
      message,
      rewards,
      read: false,
      sentAt: Date.now(),
      expiresAt,
      mailTrigger: "global",
      numberClaimed: 0,
      achievement: false,
      autoClaim: false,
      targetGroup,
    });

    return await mail.save();
  }

  /**
   * Sends a personalized mail.
   * @param recipientId ID of the recipient.
   * @param subject Title of the mail.
   * @param message Content of the mail.
   * @param rewards Optional rewards.
   * @param mailTrigger Reason for sending the mail.
   * @returns Created mail.
   */
  async sendMail(
    recipientId: string,
    subject: string,
    message: string,
    rewards: Reward = {},
    mailTrigger: string = "default"
  ) {
    const mail = new MailModel({
      id: new mongoose.Types.ObjectId().toString(),
      recipientId,
      subject,
      message,
      rewards,
      read: false,
      sentAt: Date.now(),
      mailTrigger,
      numberClaimed: 0,
      achievement: mailTrigger === "achievement",
      autoClaim: false,
    });

    return await mail.save();
  }

  /**
   * Sends a pre-made mail for specific triggers like clearing a scenario.
   * @param recipientId ID of the recipient.
   * @param triggerType Type of trigger (e.g., "scenarioClear", "achievementComplete").
   * @param additionalInfo Additional context or rewards for the trigger.
   * @returns Created mail.
   */
  async sendPreMadeMail(
    recipientId: string,
    triggerType: string,
    additionalInfo: { subject: string; message: string; rewards?: Reward }
  ) {
    const { subject, message, rewards } = additionalInfo;

    return await this.sendMail(
      recipientId,
      subject,
      message,
      rewards,
      triggerType
    );
  }
}

export default MailTo;
