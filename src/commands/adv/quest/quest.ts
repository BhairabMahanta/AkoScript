import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  AttachmentBuilder,
  ButtonStyle,
} from "discord.js";
import { ObjectId } from "mongodb";

import { QuestLogic } from "./questLogic";
import { QuestInterface, quests } from "./quests";
import fs from "fs";
import path from "path";
import { mongoClient } from "../../../data/mongo/mongo";
import createMockMessage from "../../util/mockMessage";
import { mockDb, mockEmbed, mockInteraction } from "../../util/utility";
import { Player } from "../../../data/mongo/playerschema";

// MongoDB setup
const db = mongoClient.db("Akaimnky");
const collection = db.collection("akaillection");

const placeholder = "placeholder";
const mockMessage = createMockMessage("This is a mock message.");
export class Quest {
  private player: Player;
  private playerId: string;
  private filter: { _id: ObjectId };
  private questName: string;
  private questDetails: QuestInterface | null;
  private questLogic: QuestLogic;
  private embed: EmbedBuilder;
  private row: ActionRowBuilder<ButtonBuilder>[];
  private message: string;
  private collectorMessage: any;
  private yesNoButton: boolean;

  constructor(that: any) {
    this.player = that.player;
    this.playerId = that.player._id;
    this.filter = { _id: that.player._id };
    this.questName = that.questName;
    this.questDetails = null;
    this.questLogic = new QuestLogic(
      mockMessage,
      mockInteraction,
      mockMessage,
      mockEmbed,
      placeholder,
      placeholder,
      this.player,
      mockDb
    );
    this.embed = that.embed;
    this.row = that.row;
    this.message = that.message;
    this.collectorMessage = that.collectorMessage;
    this.yesNoButton = that.yesNoButton;
  }

  private async editFields(): Promise<void> {
    this.embed = new EmbedBuilder()
      .setTitle(`Quest Details: ${quests[this.questName].title}`)
      .setDescription("Have something like {dialogueindex}")
      .setColor("#0099ff");
  }

  public async showQuestDetails(): Promise<void> {
    try {
      const questDetails = quests[this.questName];
      this.questDetails = questDetails;
      console.log("questDetails:", questDetails);
      await this.editFields();
      this.embed.setDescription(
        `### - Description: ${questDetails.description}`
      );

      const rewardFields = questDetails.rewards.map((reward) => ({
        name: "- **Rewards:**",
        value: `- **Experience: ${
          reward.experience
        }** \n\n **Items: ${reward.items.join(", ")}**`,
        inline: false,
      }));

      this.embed.addFields(...rewardFields);

      const acceptCancel = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setStyle(ButtonStyle.Primary)
          .setLabel("Accept")
          .setCustomId("Accept"),
        new ButtonBuilder()
          .setStyle(ButtonStyle.Danger)
          .setLabel("Decline")
          .setCustomId("Decline")
      );

      this.row = [acceptCancel];
      await this.collectorMessage.edit({
        embeds: [this.embed],
        components: this.row,
      });
    } catch (error) {
      console.error("Error showing quest details:", error);
    }
  }

  public async acceptQuest(): Promise<void> {
    try {
      const playerData = await collection.findOne<Player>({
        _id: this.filter,
      });
      if (!playerData) {
        throw new Error("Player data not found.");
      }

      await this.editFields();
      this.embed.setDescription(
        `### - You have accepted the quest ${this.questDetails?.title}.\n- Objective: ${this.questDetails?.objectives}\n- You can view your selected quests by typing a!myquests`
      );

      if (!playerData.quests) {
        playerData.quests = [];
      }

      if (playerData.quests.includes(this.questDetails!.title)) {
        this.embed.setDescription(
          "### - You already have that quest pending, clear it first dumbass."
        );
      } else {
        playerData.quests.push(this.questDetails!.title);
        await collection.updateOne(this.filter, {
          $set: { quests: playerData.quests },
        });
      }

      await this.collectorMessage.edit({
        embeds: [this.embed],
        components: [],
      });
    } catch (error) {
      console.error("Error accepting quest:", error);
    }
  }

  public async declineQuest(): Promise<void> {
    try {
      await this.editFields();
      this.embed.setDescription(
        `### - You have declined the quest ${this.questDetails?.title}.\n- Objective: ${this.questDetails?.objectives}\n- You can view your selected quests by typing a!myquests`
      );
      await this.collectorMessage.edit({
        embeds: [this.embed],
        components: [],
      });
    } catch (error) {
      console.error("Error declining quest:", error);
    }
  }
}
