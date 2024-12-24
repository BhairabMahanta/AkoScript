import { EmbedBuilder, Message, TextChannel } from "discord.js";
import { mongoClient } from "../../data/mongo/mongo";

const db = mongoClient.db("Akaimnky");
const collection: any = db.collection("akaillection");

import { Player } from "../../data/mongo/playerschema.js";
import { Command } from "../../@types/command.js";
import { ExtendedClient } from "../.."; // Ensure the correct path
const statuswindowCommand: Command = {
  name: "statuswindow",
  description: "Shows status window of the player",
  aliases: ["sw", "me", "status"],
  async execute(
    client: ExtendedClient,
    message: Message<boolean>,
    args: string[]
  ): Promise<void> {
    const filter = { _id: message.author.id };
    const player: Player = await collection.findOne(filter);

    if (!player) {
      (message.channel as TextChannel).send(
        "Player not found in the database."
      );
      return;
    }

    const charEmbed = new EmbedBuilder()
      .setColor(0x992e22)
      .setThumbnail(message.author.displayAvatarURL())
      .setAuthor({
        name: `${player.name}'s status window`,
        url: "https://discord.js.org",
      })
      .setDescription(
        `General Status:\n \`\`Level \`\` **${player.exp.level}**\n \`\`Exp   \`\`   **${player.exp.xp}**\n **__Physical Stats__**\n \`\`Attack      \`\` ➝ ⚔️ \u200b \u200b **${player.stats.attack}**\n \`\`Defense     \`\`  ➝  🛡️ \u200b \u200b **${player.stats.defense}**\n \`\`Speed       \`\`  ➝  💨 \u200b \u200b **${player.stats.speed}**\n \`\`HitPoints   \`\`  ➝  ❤️  \u200b \u200b**${player.stats.hp}**\n \`\`Tactics     \`\` ➝  🧠  \u200b \u200b  **${player.stats.tactics}**\n  \`\`Potential   \`\`  ➝  📶 \u200b \u200b **${player.stats.potential}**\n \`\`Training    \`\`  ➝  🧬 \u200b \u200b **${player.stats.training}**\n **__Magical Powers__**\n \`\`Magic       \`\`  ➝  🪄 \u200b \u200b **${player.stats.magic}**\n \`\`Intelligence\`\`  ➝  📚 \u200b \u200b **${player.stats.intelligence}**\n \`\`Wise        \`\`  ➝  👴 \u200b \u200b **${player.stats.wise}**\n \`\`Luck        \`\`  ➝  📶 \u200b \u200b **${player.stats.luck}**\n \`\`Devotion    \`\`  ➝  🙏 \u200b \u200b **${player.stats.devotion}**\n **__Currencies__**\n:coin:  **${player.balance.coins}** \u200b \u200b \u200b \u200b :gem:  **${player.balance.gems}**\nFamiliar:\n **${player.cards.name}** \nYour Location\n:round_pushpin: **${player.location}**`
      );

    (message.channel as TextChannel).send({ embeds: [charEmbed] });
  },
};
export default statuswindowCommand;
