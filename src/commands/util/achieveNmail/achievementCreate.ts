import { Command } from "../../../@types/command";
import { ExtendedClient } from "../../..";
import { Message } from "discord.js";
import { createAchievement } from "./achievUtil";
import { AchievementRarity } from "../../../data/mongo/achieveschema";
import { parseQuotedArgs } from "../glogic";
const createAchievementCommand: Command = {
  name: "createachievement",
  description: "Creates a new game achievement",
  async execute(
    client: ExtendedClient,
    message: Message<boolean>,
    args: string[]
  ): Promise<void> {
    try {
      const input = args.join(" ");
      const parsedArgs = parseQuotedArgs(input);
      // Basic argument parsing (you might want a more robust parser)
      const [
        id,
        name,
        description,
        coins = "0",
        gems = "0",
        xp = "0",
        hidden = "false",
        classRestrictions = "",
        raceRestrictions = "",
        rarity = "Common",
      ] = parsedArgs;

      const achievement = await createAchievement({
        id,
        name: decodeURIComponent(name),
        description: decodeURIComponent(description),
        reward: {
          coins: parseInt(coins),
          gems: parseInt(gems),
          xp: parseInt(xp),
        },
        hidden: hidden.toLowerCase() === "true",
        classRestriction: classRestrictions.split(",").filter(Boolean),
        raceRestriction: raceRestrictions.split(",").filter(Boolean),
        rarity: rarity as AchievementRarity,
      });

      message.reply(
        `Created ${achievement.rarity} achievement: "${achievement.name}"`
      );

      message.reply(
        `Created achievement: **${achievement.name}** (ID: ${achievement.id})`
      );
    } catch (error: any) {
      console.error(error);
      message.reply(
        `Failed to create achievement: use syntax syntax: '"<id>" "<name>" "<description>" "[coins]" "[gems]" "[xp]" "[hidden]" "[classRestrictions]" "[raceRestrictions]" "[rarity]"`
      );
    }
  },
};

export default createAchievementCommand;
