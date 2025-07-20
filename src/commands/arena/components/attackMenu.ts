import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, StringSelectMenuBuilder } from "discord.js";
import { ExtendedClient } from "../../..";
import { PlayerModal } from "../../../data/mongo/playerschema";
import { getTimeUntilReset } from "./timeUtils";

export async function showAttackMenu(interaction: any, client: ExtendedClient): Promise<void> {
  try {
    const playerId = interaction.user.id;
    const playerData = await PlayerModal.findById(playerId);
    
    if (!playerData || playerData.arena.attacksToday >= 30) {
      const embed = new EmbedBuilder()
        .setTitle('❌ **Attack Unavailable**')
        .setDescription(playerData ? 
          'You have used all your attacks for today! Reset in: ' + getTimeUntilReset() :
          'Player data not found!')
        .setColor('#FF0000');
      
      const backButton = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('arena_back')
            .setLabel('⬅️ Back to Arena')
            .setStyle(ButtonStyle.Secondary)
        );
      
      await interaction.editReply({ embeds: [embed], components: [backButton] });
      return;
    }

    const minRating = Math.max(1000, playerData.arena.rating - 100);
    const maxRating = playerData.arena.rating + 100;
    // addlater'arena.inBattle': false,
    const opponents = await PlayerModal.find({
      _id: { $ne: playerId },
      'arena.rating': { $gte: minRating, $lte: maxRating },
      
      'arena.defenseDeck': { $exists: true, $not: { $size: 0 } }
    })
    .select('name arena.rating arena.rank arena.totalWins arena.totalLosses')
    .limit(8)
    .sort({ 'arena.rating': -1 });

    if (opponents.length === 0) {
      const embed = new EmbedBuilder()
        .setTitle('🔍 **No Opponents Found**')
        .setDescription('No suitable opponents found in your rating range. Try again later!')
        .setColor('#FFA500');
      
      const backButton = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('arena_back')
            .setLabel('⬅️ Back to Arena')
            .setStyle(ButtonStyle.Secondary)
        );

      await interaction.editReply({ embeds: [embed], components: [backButton] });
      return;
    }

    const opponentList = opponents.map((opp, index) => {
      const winRate = opp.arena.totalWins + opp.arena.totalLosses > 0 ? 
        Math.round((opp.arena.totalWins / (opp.arena.totalWins + opp.arena.totalLosses)) * 100) : 0;
      
      const ratingDiff = opp.arena.rating - playerData.arena.rating;
      const diffText = ratingDiff > 0 ? `+${ratingDiff}` : `${ratingDiff}`;
      
      return `**${index + 1}.** ${opp.name}\n🏆 ${opp.arena.rating} (${diffText}) | 🎖️ ${opp.arena.rank} | 📊 ${winRate}% WR`;
    }).join('\n\n');

    const embed = new EmbedBuilder()
      .setTitle('⚔️ **Arena Battle - Select Opponent**')
      .setDescription('**Choose your opponent wisely! Higher rated opponents give more rating on victory.**')
      .addFields(
        {
          name: '🎯 **Available Opponents**',
          value: opponentList,
          inline: false
        },
        {
          name: '⚡ **Battle Info**',
          value: `**Your Rating:** ${playerData.arena.rating} (${playerData.arena.rank})\n**Attacks Remaining:** ${30 - playerData.arena.attacksToday}/30\n**Rating Range:** ${minRating} - ${maxRating}`,
          inline: false
        }
      )
      .setColor('#FF0000')
      .setFooter({ text: 'Select an opponent to start battle!' });

    const opponentSelect = new StringSelectMenuBuilder()
      .setCustomId('arena_select_opponent')
      .setPlaceholder('🎯 Choose your opponent...')
      .addOptions(
        opponents.map((opp) => ({
          label: `${opp.name} (${opp.arena.rating})`,
          description: `${opp.arena.rank} • Win Rate: ${Math.round((opp.arena.totalWins / (opp.arena.totalWins + opp.arena.totalLosses || 1)) * 100)}%`,
          value: opp._id.toString(),
          emoji: '⚔️'
        }))
      );

    const components = [
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(opponentSelect),
      new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('arena_refresh_opponents')
            .setLabel('🔄 Refresh List')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('arena_back')
            .setLabel('⬅️ Back to Arena')
            .setStyle(ButtonStyle.Secondary)
        )
    ];

    await interaction.editReply({
      embeds: [embed],
      components: components
    });

  } catch (error) {
    console.error('Error in showAttackMenu:', error);
    
    const errorEmbed = new EmbedBuilder()
      .setTitle('❌ **Error**')
      .setDescription('Failed to load attack menu.')
      .setColor('#FF0000');
    
    await interaction.editReply({ embeds: [errorEmbed], components: [] });
  }
}
