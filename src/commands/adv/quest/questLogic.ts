import { quests } from "./quests";
import { mongoClient } from "../../../data/mongo/mongo";
import { Collection, Db } from "mongodb";
import { Interaction, Message, EmbedBuilder, Embed } from "discord.js";
import { ObjectId } from "mongodb";
import { Player } from "../../../data/mongo/playerschema";
import { CompletedQuestDetails } from "./myquests";
type Objective = {
  id: string;
  target: string;
  description: string;
  current: number;
  required: number;
};

type Reward = {
  experience: number;
  items: string[];
};

type Quest = {
  id: string;
  title: string;
  description: string;
  type: string;
  objectives: Objective[];
  rewards: Reward[];
  timeLimit: number;
};

export type ActiveQuest = {
  objectives: Objective[];
  timeLimit: {
    totalDays: string;
    daysLeft: string;
  };
  questChannel: string;
  questStatus: string;
};

interface PlayerData extends Player {
  completedQuests?: Record<string, CompletedQuestDetails>;
}

class QuestLogic {
  private quests: { [key: string]: Quest };
  private message: Message;
  private embed: EmbedBuilder;
  private row: any; // Replace with appropriate type if using custom Discord.js components
  private row2: any;
  private interaction: Interaction;
  private sentMessage: Message;
  private player: PlayerData;
  private collection: any;

  constructor(
    message: Message,
    interaction: Interaction,
    sentMessage: Message,
    embed: EmbedBuilder,
    row: any,
    row2: any,
    dbData: PlayerData,
    collection: any
  ) {
    this.player = dbData;
    this.collection = collection;
    this.quests = quests;
    this.message = message;
    this.embed = embed;
    this.row = row;
    this.row2 = row2;
    this.interaction = interaction;
    this.sentMessage = sentMessage;
  }

  async startQuest(questId: string): Promise<void> {
    const quest = this.quests[questId];
    if (!quest) {
      this.embed.setFooter({ text: "Quest not found." });
      await this.sentMessage.edit({
        embeds: [this.embed],
        components: [this.row, this.row2],
      });
      return;
    }

    if (questId in this.player.activeQuests) {
      console.log("something");
      this.embed.setFooter({
        text: "You already started the quest, view your progress through a!myquests.",
      });
      this.embed.setTitle("Already Started!");
      this.embed.setDescription(
        "### - You already started the quest, view your progress through a!myquests."
      );
      this.embed.setFields([
        {
          name: "Quest Name:",
          value: this.quests[questId].title,
          inline: true,
        },
      ]);
      await this.sentMessage.edit({
        embeds: [this.embed],
        components: [this.row2],
      });
      return;
    }

    const timeLeft = Math.floor(
      Date.now() / 1000 + quest.timeLimit * 24 * 60 * 60
    );

    const newQuest: ActiveQuest = {
      objectives: quest.objectives.map((objective) => ({
        id: objective.id,
        target: objective.target,
        description: objective.description,
        current: 0,
        required: objective.required,
      })),
      timeLimit: {
        totalDays: quest.timeLimit.toString(),
        daysLeft: timeLeft.toString(),
      },
      questChannel: "newChannelId",
      questStatus: "incomplete",
    };

    this.player.activeQuests[questId] = newQuest;
    console.log("Updated this.player.activeQuests:", this.player.activeQuests);

    try {
      const playerId = this.message.author.id;
      // Update player data
      await this.collection.updateOne(
        { _id: playerId }, // Use string here
        { $set: { activeQuests: this.player.activeQuests } }
      );
      console.log("Player data updated successfully!");
    } catch (error) {
      console.error("Error updating player data:", error);
    }
  }

  completeQuest(questId: string): string {
    const quest = this.quests[questId];
    if (!quest) return "Quest not found.";

    if (!this.player.activeQuests[questId]) {
      return "You don't have this quest.";
    }

    const activeQuest = this.player.activeQuests[questId];
    for (const objective of activeQuest.objectives) {
      if (objective.current < objective.required) {
        return "Quest objectives not met.";
      }
    }

    delete this.player.activeQuests[questId];
    const rewards = quest.rewards[0]; // Assuming a single rewards structure
    this.player.gainExperience(rewards.experience);
    this.player.gainItems(rewards.items);

    return `Completed quest: ${quest.title}`;
  }

  failQuest(questId: string): string {
    const quest = this.quests[questId];
    if (!quest) return "Quest not found.";

    if (!this.player.activeQuests[questId]) {
      return "You don't have this quest.";
    }

    delete this.player.activeQuests[questId];
    return `Quest failed: ${quest.title}`;
  }
}

export { QuestLogic };
