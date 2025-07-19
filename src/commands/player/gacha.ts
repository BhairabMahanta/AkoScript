import { pullGacha, GACHA_TYPES } from "../util/glogic";
import {
  ActionRowBuilder,
  ButtonBuilder,
  StringSelectMenuBuilder,
  EmbedBuilder,
  Message,
  ButtonStyle,
} from "discord.js";
import { mongoClient } from "../../data/mongo/mongo";
import { Player, Tokens, PlayerModal, IdGenerator } from "../../data/mongo/playerschema";
import { Command } from "../../@types/command";
import { ExtendedClient } from "../..";

const db = mongoClient.db("Akaimnky");
const collection: any = db.collection<Player>("akaillection");

// ✅ Map GACHA_TYPES (API) to database fields
const GACHA_TO_DB_MAPPING: Record<string, keyof Tokens> = {
  [GACHA_TYPES.COMMON_TOKEN]: "commonScroll",
  [GACHA_TYPES.RARE_TOKEN]: "rareScroll",
  [GACHA_TYPES.LEGENDARY_TOKEN]: "legendaryScroll",
};

// ✅ Reverse mapping for display purposes
const DB_TO_GACHA_MAPPING: Record<keyof Tokens, string> = {
  "commonScroll": GACHA_TYPES.COMMON_TOKEN,
  "rareScroll": GACHA_TYPES.RARE_TOKEN, 
  "legendaryScroll": GACHA_TYPES.LEGENDARY_TOKEN,
};

// ✅ Type for valid gacha types (what pullGacha expects)
type ValidGachaType = typeof GACHA_TYPES[keyof typeof GACHA_TYPES];

// Helper function to validate gacha type
const isValidGachaType = (type: string): type is ValidGachaType => {
  return Object.values(GACHA_TYPES).includes(type as ValidGachaType);
};

interface GachaSession {
  userId: string;
  totalPulls: any[];
  totalSpent: Tokens; // ✅ Use the actual Tokens interface
}

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
    
    // Initialize gacha session
    const session: GachaSession = {
      userId: playerId,
      totalPulls: [],
      totalSpent: {
        commonScroll: 0,
        rareScroll: 0,
        legendaryScroll: 0,
      }
    };

    // Get initial player data
    let playerData = await collection.findOne({ _id: playerId });
    if (!playerData) {
      await message.reply("❌ You need to register first! Use `!register <name>` to start your adventure.");
      return;
    }

    // Initialize tokens if needed
    if (!playerData.inventory.tokens) {
      playerData.inventory.tokens = {
        commonScroll: 1,
        rareScroll: 0,
        legendaryScroll: 0,
      };
      await collection.updateOne(
        { _id: playerId },
        { $set: { "inventory.tokens": playerData.inventory.tokens } }
      );
    }

    // Helper functions
    const getTokenEmoji = (gachaType: ValidGachaType): string => {
      switch (gachaType) {
        case GACHA_TYPES.COMMON_TOKEN: return "🎫";
        case GACHA_TYPES.RARE_TOKEN: return "🎟️";
        case GACHA_TYPES.LEGENDARY_TOKEN: return "🎗️";
        default: return "🎫";
      }
    };

    const getTokenDisplayName = (gachaType: ValidGachaType): string => {
      switch (gachaType) {
        case GACHA_TYPES.COMMON_TOKEN: return "Common";
        case GACHA_TYPES.RARE_TOKEN: return "Rare";
        case GACHA_TYPES.LEGENDARY_TOKEN: return "Legendary";
        default: return "Unknown";
      }
    };

    const getTierEmoji = (tier: number): string => {
      switch (tier) {
        case 1: return "⚪";
        case 2: return "🟡";
        case 3: return "🟠";
        case 4: return "🔴";
        case 5: return "🟣";
        default: return "⚪";
      }
    };

    const createMainMenu = async () => {
      // Get fresh player data for accurate token display
      const freshPlayerData = await collection.findOne({ _id: playerId });
      const tokens: Tokens = freshPlayerData?.inventory?.tokens || playerData.inventory.tokens;

      const embed = new EmbedBuilder()
        .setTitle("🎰 Gacha Summoning Portal")
        .setDescription("Welcome to the summoning portal! Choose your desired pull type and let fate decide your companions.")
        .setColor('#FFD700')
        .addFields([
          {
            name: "💰 Your Tokens",
            value: [
              `${getTokenEmoji(GACHA_TYPES.COMMON_TOKEN)} **Common:** ${tokens.commonScroll}`,
              `${getTokenEmoji(GACHA_TYPES.RARE_TOKEN)} **Rare:** ${tokens.rareScroll}`,
              `${getTokenEmoji(GACHA_TYPES.LEGENDARY_TOKEN)} **Legendary:** ${tokens.legendaryScroll}`
            ].join('\n'),
            inline: true
          },
          {
            name: "📊 Session Stats",
            value: [
              `**Total Pulls:** ${session.totalPulls.length}`,
              `**Tokens Spent:** ${Object.values(session.totalSpent).reduce((a, b) => a + b, 0)}`,
            ].join('\n'),
            inline: true
          }
        ])
        .setFooter({ text: "Select your desired pull type below • Session expires in 5 minutes" });

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId("gacha_select")
        .setPlaceholder("🎯 Choose your gacha pull")
        .addOptions([
          {
            label: "1x Common Pull",
            description: `${tokens.commonScroll >= 1 ? "✅" : "❌"} Cost: 1 Common Token`,
            value: `${GACHA_TYPES.COMMON_TOKEN}_1`,
            emoji: getTokenEmoji(GACHA_TYPES.COMMON_TOKEN)
          },
          {
            label: "10x Common Pull",
            description: `${tokens.commonScroll >= 10 ? "✅" : "❌"} Cost: 10 Common Tokens`,
            value: `${GACHA_TYPES.COMMON_TOKEN}_10`,
            emoji: getTokenEmoji(GACHA_TYPES.COMMON_TOKEN)
          },
          {
            label: "1x Rare Pull",
            description: `${tokens.rareScroll >= 1 ? "✅" : "❌"} Cost: 1 Rare Token`,
            value: `${GACHA_TYPES.RARE_TOKEN}_1`,
            emoji: getTokenEmoji(GACHA_TYPES.RARE_TOKEN)
          },
          {
            label: "10x Rare Pull",
            description: `${tokens.rareScroll >= 10 ? "✅" : "❌"} Cost: 10 Rare Tokens`,
            value: `${GACHA_TYPES.RARE_TOKEN}_10`,
            emoji: getTokenEmoji(GACHA_TYPES.RARE_TOKEN)
          },
          {
            label: "1x Legendary Pull",
            description: `${tokens.legendaryScroll >= 1 ? "✅" : "❌"} Cost: 1 Legendary Token`,
            value: `${GACHA_TYPES.LEGENDARY_TOKEN}_1`,
            emoji: getTokenEmoji(GACHA_TYPES.LEGENDARY_TOKEN)
          },
          {
            label: "10x Legendary Pull",
            description: `${tokens.legendaryScroll >= 10 ? "✅" : "❌"} Cost: 10 Legendary Tokens`,
            value: `${GACHA_TYPES.LEGENDARY_TOKEN}_10`,
            emoji: getTokenEmoji(GACHA_TYPES.LEGENDARY_TOKEN)
          }
        ]);

      const actionButtons = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setCustomId("view_collection")
            .setLabel("📚 View Collection")
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId("session_summary")
            .setLabel("📋 Session Summary")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(session.totalPulls.length === 0),
          new ButtonBuilder()
            .setCustomId("finish_session")
            .setLabel("✅ Finish Session")
            .setStyle(ButtonStyle.Success)
        );

      return {
        embeds: [embed],
        components: [
          new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu),
          actionButtons
        ]
      };
    };

    // ✅ FIXED performPull function with proper mapping
    const performPull = async (gachaType: ValidGachaType, amount: number) => {
      // ✅ Convert gacha type to database field
      const dbField = GACHA_TO_DB_MAPPING[gachaType];
      
      if (!dbField) {
        return {
          success: false,
          error: `Invalid gacha type: ${gachaType}`
        };
      }

      // Check if player has enough tokens
      const freshPlayerData = await collection.findOne({ _id: playerId });
      const tokens: Tokens = freshPlayerData?.inventory?.tokens || { commonScroll: 0, rareScroll: 0, legendaryScroll: 0 };
      
      if (tokens[dbField] < amount) {
        return {
          success: false,
          error: `Insufficient tokens! You need ${amount} ${getTokenDisplayName(gachaType)} token(s) but only have ${tokens[dbField]}.`
        };
      }

      // Deduct tokens using database field
      await collection.updateOne(
        { _id: playerId },
        { $inc: { [`inventory.tokens.${dbField}`]: -amount } }
      );

      // Update session tracking using database field
      session.totalSpent[dbField] += amount;

      const pulledFamiliars: any[] = [];

      // Perform pulls
      for (let i = 0; i < amount; i++) {
        // ✅ Pass the gacha type (what pullGacha expects) 
        const character = await pullGacha(playerId, gachaType);
        
        // Get current collection length for serialId
        const currentPlayerData = await collection.findOne({ _id: playerId });
        const currentCollectionLength = currentPlayerData?.collectionInv?.length || 0;
        const newSerialId = `${currentCollectionLength + 1}`;
        const newGlobalId = IdGenerator.generateUniqueGlobalId();

        const familiarToAdd = {
          serialId: newSerialId,
          globalId: newGlobalId,
          name: character.name,
          element: character.element,
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
            divinePower: character.stats.divinePower || 0,
          },
          ability: character.ability || [],
          moves: character.moves || [],
        };

        // Add to collection
        await collection.updateOne(
          { _id: playerId },
          { $push: { collectionInv: familiarToAdd } }
        );

        pulledFamiliars.push({
          ...character,
          serialId: newSerialId,
          globalId: newGlobalId
        });
      }

      // Add to session total
      session.totalPulls.push(...pulledFamiliars);

      return { success: true, familiars: pulledFamiliars };
    };

    const createPullResultEmbed = (familiars: any[], gachaType: ValidGachaType, amount: number) => {
      const typeDisplayName = getTokenDisplayName(gachaType);
      const embed = new EmbedBuilder()
        .setTitle(`🎊 Gacha Results - ${amount}x ${typeDisplayName.toUpperCase()} PULL`)
        .setColor(amount >= 10 ? '#FF6B35' : '#4ECDC4');

      if (familiars.length === 1) {
        const familiar = familiars[0];
        embed.setDescription([
          `**${getTierEmoji(familiar.tier)} ${familiar.name}**`,
          `**Tier:** ${familiar.tier} | **Element:** ${familiar.element || 'Unknown'}`,
          `**Serial ID:** ${familiar.serialId}`,
          "",
          `**Stats Preview:**`,
          `HP: ${familiar.stats?.hp || 'N/A'} | ATK: ${familiar.stats?.attack || 'N/A'}`,
          `DEF: ${familiar.stats?.defense || 'N/A'} | SPD: ${familiar.stats?.speed || 'N/A'}`
        ].join('\n'));
      } else {
        // Group by tier for better display
        const tierGroups: { [key: number]: any[] } = {};
        familiars.forEach(fam => {
          if (!tierGroups[fam.tier]) tierGroups[fam.tier] = [];
          tierGroups[fam.tier].push(fam);
        });

        let description = "**Your summons:**\n\n";
        Object.keys(tierGroups).sort((a, b) => parseInt(b) - parseInt(a)).forEach(tier => {
          const tierNum = parseInt(tier);
          description += `**${getTierEmoji(tierNum)} Tier ${tier} (${tierGroups[tierNum].length})**\n`;
          tierGroups[tierNum].forEach((fam, idx) => {
            description += `${idx + 1}. ${fam.name} \`${fam.serialId}\`\n`;
          });
          description += "\n";
        });

        embed.setDescription(description);
      }

      // Check for rare pulls in common gacha
      const highTierInCommon = familiars.filter(f => 
        gachaType === GACHA_TYPES.COMMON_TOKEN && f.tier >= 3
      );

      if (highTierInCommon.length > 0) {
        embed.addFields({
          name: "🌟 MIRACLE PULL!",
          value: `You got ${highTierInCommon.length} high-tier familiar(s) from common gacha!`,
          inline: false
        });
      }

      return embed;
    };

    const createSessionSummary = () => {
      if (session.totalPulls.length === 0) {
        return new EmbedBuilder()
          .setTitle("📋 Session Summary")
          .setDescription("No pulls made in this session yet.")
          .setColor('#FFA500');
      }

      // Group familiars by tier
      const tierStats: { [key: number]: number } = {};
      session.totalPulls.forEach(fam => {
        tierStats[fam.tier] = (tierStats[fam.tier] || 0) + 1;
      });

      const totalSpent = Object.values(session.totalSpent).reduce((a, b) => a + b, 0);

      const embed = new EmbedBuilder()
        .setTitle("📋 Gacha Session Summary")
        .setDescription(`**Total Pulls:** ${session.totalPulls.length}\n**Total Tokens Spent:** ${totalSpent}`)
        .setColor('#00FF00')
        .addFields([
          {
            name: "💸 Tokens Spent",
            value: [
              `${getTokenEmoji(GACHA_TYPES.COMMON_TOKEN)} Common: ${session.totalSpent.commonScroll}`,
              `${getTokenEmoji(GACHA_TYPES.RARE_TOKEN)} Rare: ${session.totalSpent.rareScroll}`,
              `${getTokenEmoji(GACHA_TYPES.LEGENDARY_TOKEN)} Legendary: ${session.totalSpent.legendaryScroll}`
            ].join('\n'),
            inline: true
          },
          {
            name: "🏆 Tier Distribution",
            value: Object.keys(tierStats).sort((a, b) => parseInt(b) - parseInt(a))
              .map(tier => `${getTierEmoji(parseInt(tier))} Tier ${tier}: ${tierStats[parseInt(tier)]}`)
              .join('\n') || 'No pulls yet',
            inline: true
          }
        ]);

      // Show last few pulls
      if (session.totalPulls.length > 0) {
        const recentPulls = session.totalPulls.slice(-5);
        embed.addFields({
          name: "🎯 Recent Pulls",
          value: recentPulls.map(fam => 
            `${getTierEmoji(fam.tier)} ${fam.name} \`${fam.serialId}\``
          ).join('\n'),
          inline: false
        });
      }

      return embed;
    };

    // Send initial menu
    const sentMessage = await message.reply(await createMainMenu());

    // Create collector
    const collector = sentMessage.createMessageComponentCollector({
      filter: (i) => i.user.id === playerId,
      time: 300000 // 5 minutes
    });

    collector.on('collect', async (interaction) => {
      try {
        if (interaction.isStringSelectMenu() && interaction.customId === 'gacha_select') {
          const selectedValue = interaction.values[0];
          console.log('🎰 Selected value:', selectedValue); // Debug log
          
          // ✅ Parse the selection value
          const parts = selectedValue.split('_');
          if (parts.length < 2) {
            await interaction.reply({
              content: '❌ Invalid selection format.',
              ephemeral: true
            });
            return;
          }
          
          // ✅ Handle multi-part gacha type (e.g., "COMMON_TOKEN")
          const amount = parseInt(parts[parts.length - 1]); // Last part is always the amount
          const gachaTypeRaw = parts.slice(0, -1).join('_'); // Everything except the last part
          
          console.log('🎰 Parsed gacha type:', gachaTypeRaw);
          console.log('🎰 Amount:', amount);

          // ✅ Validate the gacha type
          if (!isValidGachaType(gachaTypeRaw)) {
            console.log('❌ Available types:', Object.values(GACHA_TYPES));
            await interaction.reply({
              content: `❌ Invalid gacha type: "${gachaTypeRaw}"`,
              ephemeral: true
            });
            return;
          }

          if (isNaN(amount) || amount <= 0) {
            await interaction.reply({
              content: '❌ Invalid amount specified.',
              ephemeral: true
            });
            return;
          }

          const gachaType = gachaTypeRaw as ValidGachaType;

          await interaction.deferUpdate();

          // Show pulling animation
          const pullingEmbed = new EmbedBuilder()
            .setTitle("🎰 Summoning in Progress...")
            .setDescription("✨ The magic circle glows brightly...\n🌟 Mystical energies gather...\n⚡ A portal begins to open...")
            .setColor('#FFD700');

          await sentMessage.edit({ embeds: [pullingEmbed], components: [] });

          // Suspense delay
          await new Promise(resolve => setTimeout(resolve, amount >= 10 ? 2000 : 1500));

          // Perform the actual pull
          const result = await performPull(gachaType, amount);

          if (!result.success) {
            const errorEmbed = new EmbedBuilder()
              .setTitle("❌ Pull Failed")
              .setDescription(result.error!)
              .setColor('#FF0000');

            await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
            await sentMessage.edit(await createMainMenu());
            return;
          }

          // Show results with animation
          const resultEmbed = createPullResultEmbed(result.familiars!, gachaType, amount);
          
          const continueButton = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
              new ButtonBuilder()
                .setCustomId("continue_pulling")
                .setLabel("🎰 Pull Again")
                .setStyle(ButtonStyle.Primary),
              new ButtonBuilder()
                .setCustomId("view_details")
                .setLabel("📝 View Details")
                .setStyle(ButtonStyle.Secondary),
              new ButtonBuilder()
                .setCustomId("back_to_menu")
                .setLabel("🔙 Back to Menu")
                .setStyle(ButtonStyle.Secondary)
            );

          await sentMessage.edit({ 
            embeds: [resultEmbed], 
            components: [continueButton] 
          });

        } else if (interaction.isButton()) {
          switch (interaction.customId) {
            case 'continue_pulling':
            case 'back_to_menu':
              await interaction.update(await createMainMenu());
              break;

            case 'session_summary':
              const summaryEmbed = createSessionSummary();
              await interaction.reply({ embeds: [summaryEmbed], ephemeral: true });
              break;

            case 'view_collection':
              await interaction.reply({ 
                content: '📚 Collection view feature coming soon!', 
                ephemeral: true 
              });
              break;

            case 'view_details':
              if (session.totalPulls.length > 0) {
                const latestPulls = session.totalPulls.slice(-3);
                const detailsEmbed = new EmbedBuilder()
                  .setTitle("📊 Latest Pull Details")
                  .setColor('#4ECDC4');

                latestPulls.forEach((fam) => {
                  detailsEmbed.addFields({
                    name: `${getTierEmoji(fam.tier)} ${fam.name}`,
                    value: [
                      `**Serial ID:** ${fam.serialId}`,
                      `**Tier:** ${fam.tier} | **Element:** ${fam.element || 'Unknown'}`,
                      `**HP:** ${fam.stats?.hp || 'N/A'} | **ATK:** ${fam.stats?.attack || 'N/A'}`,
                      `**DEF:** ${fam.stats?.defense || 'N/A'} | **SPD:** ${fam.stats?.speed || 'N/A'}`
                    ].join('\n'),
                    inline: true
                  });
                });

                await interaction.reply({ embeds: [detailsEmbed], ephemeral: true });
              } else {
                await interaction.reply({ 
                  content: '❌ No pulls to show details for.', 
                  ephemeral: true 
                });
              }
              break;

            case 'finish_session':
              collector.stop('finished');
              const finalSummary = createSessionSummary();
              finalSummary.setTitle("🎊 Final Gacha Session Summary");
              finalSummary.setFooter({ text: "Thanks for playing! Use !gacha again anytime." });
              
              await interaction.update({ 
                embeds: [finalSummary], 
                components: [] 
              });
              break;
          }
        }
      } catch (error) {
        console.error('Gacha interaction error:', error);
        
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: '❌ An error occurred during the gacha pull. Please try again.',
            ephemeral: true
          });
        } else {
          await interaction.followUp({
            content: '❌ An error occurred during the gacha pull. Please try again.',
            ephemeral: true
          });
        }
      }
    });

    collector.on('end', async (collected, reason) => {
      if (reason === 'time') {
        const timeoutEmbed = new EmbedBuilder()
          .setTitle("⏰ Session Expired")
          .setDescription("Your gacha session has timed out.")
          .setColor('#FFA500');

        if (session.totalPulls.length > 0) {
          const summary = createSessionSummary();
          summary.setTitle("📋 Your Session Results");
          await sentMessage.edit({ embeds: [summary], components: [] });
        } else {
          await sentMessage.edit({ embeds: [timeoutEmbed], components: [] });
        }
      }
    });
  }
};

export default gachaCommand;
