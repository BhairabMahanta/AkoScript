import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  StringSelectMenuBuilder,
  TextChannel,
} from "discord.js";
import allFamiliars from "../../data/information/allfamiliars";
import { Command } from "../../@types/command";
import { ExtendedClient } from "../.."; // Ensure the correct path
import { Message } from "discord.js";

let tier: string = "Tier1";
let keys: string[] = [];
const FAMILIARS_PER_PAGE = 5;

const viewFamiliarsCommand: Command = {
  name: "viewfamiliars",
  description: "View information about all familiars",
  aliases: ["vf", "famview"],
  async execute(
    client: ExtendedClient,
    message: Message<boolean>,
    args: string[]
  ): Promise<void> {
    const page = args[0] ? parseInt(args[0], 10) : 1;
    if (isNaN(page) || page <= 0) {
      message.reply("Invalid page number.");
      return;
    }
    let newPage = page;
    const startIndex = (page - 1) * FAMILIARS_PER_PAGE;
    const endIndex = startIndex + FAMILIARS_PER_PAGE;

    const embed = new EmbedBuilder().setColor("#FFA500");
    keys = Object.keys(allFamiliars[tier]);

    const familiars = keys.slice(startIndex, endIndex);
    familiars.forEach((theFamiliar) => {
      const familiar = allFamiliars[tier][theFamiliar];
      const stats = familiar.stats;

      embed.setTitle(
        `Tier ${familiar.tier} Familiars Information - Page ${page}`
      );

      const statsString = `⚔️ ${stats.attack} | 🛡️ ${stats.defense} | 💨 ${stats.speed} | ♥️ ${stats.hp}`;
      embed.addFields({
        name: `**__${familiar.id}.)__** • ${familiar.name}`,
        value: `Element: **${familiar.element}**   •   Tier: **${familiar.tier}**  •  Stats: **${statsString}**`,
        inline: false,
      });
    });

    const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("fam_first").setLabel("◀️").setStyle(2),
      new ButtonBuilder().setCustomId("fam_prev").setLabel("←").setStyle(1),
      new ButtonBuilder().setCustomId("fam_next").setLabel("→").setStyle(1),
      new ButtonBuilder().setCustomId("fam_last").setLabel("▶️").setStyle(2)
    );

    const tierSelectMenu = new StringSelectMenuBuilder()
      .setCustomId("fam_tier_select")
      .setPlaceholder("View Different Tiers");

    Object.keys(allFamiliars).forEach((tierName, index) => {
      tierSelectMenu.addOptions({
        label: `Tier ${index + 1}`,
        value: tierName,
      });
    });

    const tierRow =
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        tierSelectMenu
      );

    embed.setFooter({
      text: `Page ${page} | Use the "Next Page" button to view more familiars.`,
    });

    const thatMessage = await (message.channel as TextChannel).send({
      embeds: [embed],
      components: [actionRow, tierRow],
    });

    const filter = (i: any) =>
      (i.customId.startsWith("fam_") || i.customId === "fam_tier_select") &&
      i.user.id === message.author.id;

    const collector = thatMessage.createMessageComponentCollector({
      filter,
      time: 300000,
    });

    collector.on("collect", async (i) => {
      if (i.isButton()) {
        await i.deferUpdate();
        const [action, direction] = i.customId.split("_");

        if (direction === "first") newPage = 1;
        else if (direction === "prev") newPage = Math.max(1, newPage - 1);
        else if (direction === "next") newPage++;
        else if (direction === "last")
          newPage = Math.ceil(keys.length / FAMILIARS_PER_PAGE);
      } else if (i.isStringSelectMenu()) {
        await i.deferUpdate();
        tier = i.values[0];
        newPage = 1;
        keys = Object.keys(allFamiliars[tier]);
      }

      if (newPage > Math.ceil(keys.length / FAMILIARS_PER_PAGE)) {
        newPage = Math.ceil(keys.length / FAMILIARS_PER_PAGE);
      }

      const newStartIndex = (newPage - 1) * FAMILIARS_PER_PAGE;
      const newEndIndex = newStartIndex + FAMILIARS_PER_PAGE;
      const newFamiliars = keys.slice(newStartIndex, newEndIndex);

      const newEmbed = new EmbedBuilder().setColor("#FFA500");
      newFamiliars.forEach((theFamiliar) => {
        const familiar = allFamiliars[tier][theFamiliar];
        const stats = familiar.stats;

        newEmbed.setTitle(
          `Tier ${familiar.tier} Familiars Information - Page ${newPage}`
        );

        const statsString = `⚔️ ${stats.attack} | 🛡️ ${stats.defense} | 💨 ${stats.speed} | ♥️ ${stats.hp}`;
        newEmbed.addFields({
          name: `**__${familiar.id}.)__** • ${familiar.name}`,
          value: `Element: **${familiar.element}**   •   Tier: **${familiar.tier}**  •  Stats: **${statsString}**`,
          inline: false,
        });
      });

      newEmbed.setFooter({
        text: `Page ${newPage} | Use the "Next Page" button to view more familiars.`,
      });

      await thatMessage.edit({ embeds: [newEmbed] });
    });
  },
};

export default viewFamiliarsCommand;
