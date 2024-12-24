import { pullGacha, GACHA_TYPES } from "../util/glogic";
import {
  ActionRowBuilder,
  ButtonBuilder,
  StringSelectMenuBuilder,
  EmbedBuilder,
  Message,
  Interaction,
} from "discord.js";
import { mongoClient } from "../../data/mongo/mongo";
import { Player, Tokens } from "../../data/mongo/playerschema";
import { Command } from "../../@types/command";

const db = mongoClient.db("Akaimnky");
const collection: any = db.collection<Player>("akaillection");

import { ExtendedClient } from "../..";

const gachaCommand: Command = {
  name: "gacha",
  description: "Perform a gacha pull to get a random familiar!",
  aliases: ["pull", "draw"],
  async execute(
    client: ExtendedClient,
    message: Message<boolean>,
    args: string[]
  ): Promise<void> {
    const playerId = message.author.id;
    const pulledFamiliars: any[] = [];
    const playerDataNonUpdating: Player | null = await collection.findOne({
      _id: playerId,
    });

    if (!playerDataNonUpdating) {
      throw new Error("Player not found");
    }

    // Function to check if player has enough tokens
    const checkTokens = async (
      playerData: Player,
      gachaType: keyof Tokens,
      amount: number
    ): Promise<boolean> => {
      if (!playerData.inventory.tokens) {
        playerData.inventory.tokens = {
          commonScroll: 1,
          rareScroll: 0,
          legendaryScroll: 0,
        };

        // Update the player data in the database
        await collection.updateOne(
          { _id: playerData._id },
          { $set: { "inventory.tokens": playerData.inventory.tokens } }
        );
      }

      console.log(playerData.inventory.tokens);
      return playerData.inventory.tokens[gachaType] >= amount;
    };

    // Function to deduct tokens
    const deductTokens = async (
      playerData: Player,
      gachaType: keyof Tokens,
      amount: number
    ): Promise<void> => {
      playerData.inventory.tokens[gachaType] -= amount;

      // Update the player data in the database
      await collection.updateOne(
        { _id: playerData._id },
        { $set: { "inventory.tokens": playerData.inventory.tokens } }
      );
    };

    // Create the select menu for gacha types
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId("gacha_select")
      .setPlaceholder("Choose your gacha type")
      .addOptions([
        {
          label: "1x Common",
          description: "Pull 1 from the common gacha pool",
          value: `${GACHA_TYPES.COMMON_TOKEN}_1`,
        },
        {
          label: "10x Common",
          description: "Pull 10 from the common gacha pool",
          value: `${GACHA_TYPES.COMMON_TOKEN}_10`,
        },
        {
          label: "1x Rare",
          description: "Pull 1 from the rare gacha pool",
          value: `${GACHA_TYPES.RARE_TOKEN}_1`,
        },
        {
          label: "10x Rare",
          description: "Pull 10 from the rare gacha pool",
          value: `${GACHA_TYPES.RARE_TOKEN}_10`,
        },
        {
          label: "1x Legendary",
          description: "Pull 1 from the legendary gacha pool",
          value: `${GACHA_TYPES.LEGENDARY_TOKEN}_1`,
        },
        {
          label: "10x Legendary",
          description: "Pull 10 from the legendary gacha pool",
          value: `${GACHA_TYPES.LEGENDARY_TOKEN}_10`,
        },
      ]);

    const selectRow = new ActionRowBuilder().addComponents(selectMenu);

    const finalizeButton = new ButtonBuilder()
      .setCustomId("finalize_button")
      .setLabel("Finalize")
      .setStyle(1);

    const finalizeRow = new ActionRowBuilder().addComponents(finalizeButton);

    const embed = new EmbedBuilder()
      .setTitle("Gacha Pull")
      .setDescription("Select the type of gacha pull you want to perform:")
      .setFields(
        {
          name: "Common Tokens",
          value: `${playerDataNonUpdating.inventory.tokens.commonScroll}`,
          inline: true,
        },
        {
          name: "Rare Tokens",
          value: `${playerDataNonUpdating.inventory.tokens.rareScroll}`,
          inline: true,
        },
        {
          name: "Legendary Tokens",
          value: `${playerDataNonUpdating.inventory.tokens.legendaryScroll}`,
          inline: true,
        }
      )
      .setColor(0x00ff00);

    // Send the embed with the select menu
    const sentMessage = await (message.channel as any).send({
      embeds: [embed],
      components: [selectRow, finalizeRow],
    });

    // Create a message collector to handle the interaction
    const filter = (i: any) =>
      (i.customId === "gacha_select" || i.customId === "finalize_button") &&
      i.user.id === playerId;
    const collector = await sentMessage.createMessageComponentCollector({
      filter,
      time: 150000,
    });

    collector.on("collect", async (i: any) => {
      try {
        if (i.customId === "finalize_button" && i.user.id === playerId) {
          await i.deferUpdate();
          const summary = pulledFamiliars
            .map(
              (fam, index) => `${index + 1}.) ${fam.name}, Tier: ${fam.tier}`
            )
            .join("\n");
          const summaryEmbed = new EmbedBuilder()
            .setTitle("Gacha Pull Summary")
            .setDescription(summary)
            .addFields(
              {
                name: "Common Tokens",
                value: `${playerDataNonUpdating.inventory.tokens.commonScroll}`,
                inline: true,
              },
              {
                name: "Rare Tokens",
                value: `${playerDataNonUpdating.inventory.tokens.rareScroll}`,
                inline: true,
              },
              {
                name: "Legendary Tokens",
                value: `${playerDataNonUpdating.inventory.tokens.legendaryScroll}`,
                inline: true,
              }
            )
            .setColor(0x00ff00);
          await sentMessage.delete();
          await (message.channel as any).send({ embeds: [summaryEmbed] });
          collector.stop();
        } else {
          const [gachaType, pullAmount] = i.values[0].split("_");
          const amount = parseInt(pullAmount, 10);

          const hasTokens = await checkTokens(
            playerDataNonUpdating,
            gachaType,
            amount
          );
          if (!hasTokens) {
            await i.reply({
              content: `You don't have enough tokens to pull ${amount} ${gachaType} familiar(s).`,
              ephemeral: true,
            });
            return;
          }

          // Deduct tokens
          await deductTokens(playerDataNonUpdating, gachaType, amount);

          // Simulate anticipation with initial message
          await i.deferUpdate();
          const anticipationMessage = await (message.channel as any).send(
            "Drawing your familiar..."
          );
          const resultEmbed = new EmbedBuilder()
            .setTitle("Gacha Pull Result")
            .setFields(
              {
                name: "Common Tokens",
                value: `${playerDataNonUpdating.inventory.tokens.commonScroll}`,
                inline: true,
              },
              {
                name: "Rare Tokens",
                value: `${playerDataNonUpdating.inventory.tokens.rareScroll}`,
                inline: true,
              },
              {
                name: "Legendary Tokens",
                value: `${playerDataNonUpdating.inventory.tokens.legendaryScroll}`,
                inline: true,
              }
            )
            .setColor(0xffd700);

          for (let j = 0; j < amount; j++) {
            await new Promise((resolve) => setTimeout(resolve, 500)); // Delay for anticipation
            const character = await pullGacha(playerId, gachaType);
            const gaeData: Player | null = await collection.findOne({
              _id: playerId,
            });
            const pushCharacter = {
              serialId: `${
                gaeData?.collectionInv.length
                  ? gaeData?.collectionInv.length + 1
                  : 1
              }`,
              globalId: `${Math.floor(Math.random() * 1000000)}`,
              name: character.name,
              stats: {
                level: character.experience.level,
                xp: character.experience.current,
                attack: character.stats.attack,
                defense: character.stats.defense,
                speed: character.stats.speed,
                hp: character.stats.hp,
                tier: character.tier,
                evolution: 0,
                critRate: character.stats.critRate || 0,
                critDamage: character.stats.critDamage || 0,
                magic: character.stats.magic || 0,
                magicDefense: character.stats.magicDefense || 0,
              },
            };
            pulledFamiliars.push(character);

            // Add familiar to player's collection
            await collection.updateOne(
              { _id: playerDataNonUpdating._id },
              { $push: { collectionInv: pushCharacter } }
            );

            if (
              gachaType === GACHA_TYPES.COMMON_TOKEN &&
              (character.tier === 2 || character.tier === 3)
            ) {
              resultEmbed.setDescription(
                "Huhh the ground is shaking!!!! ITS A MIRACLE!"
              );
              await anticipationMessage.edit({ embeds: [resultEmbed] });
              await new Promise((resolve) => setTimeout(resolve, 3000)); // Additional delay for suspense
            }

            resultEmbed.setDescription(
              `You received: ${character.name}\nIt's a tier ${character.tier} familiar!`
            );

            const ephemeralEmbed = new EmbedBuilder()
              .setTitle("Gacha Pull Details")
              .setDescription(
                `Here are the details of your new familiar:\n\nName: ${character.name}\nStats: ${character.stats}\nElements: ${character.element}\nTier: ${character.tier}`
              )
              .setColor(0x00ffff);

            await i.followUp({ embeds: [ephemeralEmbed], ephemeral: true });
          }

          await anticipationMessage.delete(); // Delete anticipation message after all pulls are completed
          await sentMessage.edit({
            embeds: [resultEmbed],
            components: [selectRow, finalizeRow],
          });
        }
      } catch (err) {
        console.error(err);
      }
    });

    collector.on("end", (collected: any) => {
      if (collected.size === 0) {
        (message.channel as any).send(
          "You did not select any gacha type in time!"
        );
      }
    });
  },
};
export default gachaCommand;
