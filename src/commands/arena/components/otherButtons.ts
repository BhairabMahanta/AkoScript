import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, StringSelectMenuBuilder } from "discord.js";
import { ExtendedClient } from "../../..";
import { PlayerModal } from "../../../data/mongo/playerschema";

// ✅ SMART RESPONSE UTILITY - Add this at the top
class SmartResponder {
  static async update(interaction: any, content: any): Promise<any> {
    if (interaction.deferred || interaction.replied) {
      console.log('📝 Using editReply for acknowledged interaction');
      return await interaction.editReply(content);
    } else {
      console.log('🔄 Using update for fresh interaction');
      return await interaction.update(content);
    }
  }

  static async reply(interaction: any, content: any): Promise<any> {
    if (interaction.deferred) {
      console.log('📝 Using editReply for deferred interaction');
      return await interaction.editReply(content);
    } else if (interaction.replied) {
      console.log('🔄 Using followUp for replied interaction');
      return await interaction.followUp(content);
    } else {
      console.log('✨ Using reply for fresh interaction');
      return await interaction.reply(content);
    }
  }
}

// Leaderboard Menu - Show arena rankings
export async function showLeaderboardMenu(interaction: any, client: ExtendedClient): Promise<void> {
  try {
    const playerId = interaction.user.id;
    const playerData = await PlayerModal.findById(playerId);
    
    // Get top 10 players
    const topPlayers = await PlayerModal.find({
      'arena.isInitialized': true,
      'arena.rating': { $gte: 1000 }
    })
    .select('name arena.rating arena.rank arena.totalWins arena.totalLosses arena.maxRating')
    .sort({ 'arena.rating': -1 })
    .limit(10);

    // Find player's rank
    const playerRank = await PlayerModal.countDocuments({
      'arena.rating': { $gt: playerData?.arena.rating || 1000 },
      'arena.isInitialized': true
    }) + 1;

    // Format leaderboard
    const leaderboardText = topPlayers.map((player, index) => {
      const winRate = player.arena.totalWins + player.arena.totalLosses > 0 ? 
        Math.round((player.arena.totalWins / (player.arena.totalWins + player.arena.totalLosses)) * 100) : 0;
      
      const rankEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
      const isCurrentPlayer = player._id.toString() === playerId;
      
      return `${rankEmoji} ${isCurrentPlayer ? '**' : ''}${player.name}${isCurrentPlayer ? '**' : ''}\n🏆 ${player.arena.rating} | 🎖️ ${player.arena.rank} | 📊 ${winRate}%`;
    }).join('\n\n');

    const embed = new EmbedBuilder()
      .setTitle('🏆 **Arena Championship Rankings**')
      .setDescription('**Current season leaderboard - Compete for glory and exclusive rewards!**')
      .addFields(
        {
          name: '👑 **Top Champions**',
          value: leaderboardText || 'No rankings available',
          inline: false
        },
        {
          name: '📊 **Your Ranking**',
          value: playerData ? 
            `**Rank:** #${playerRank}\n**Rating:** ${playerData.arena.rating}\n**Tier:** ${playerData.arena.rank}\n**Record:** ${playerData.arena.totalWins}W/${playerData.arena.totalLosses}L` :
            'Player data not found',
          inline: true
        },
        {
          name: '🎯 **Season Info**',
          value: `**Season:** ${getCurrentSeason()}\n**Total Players:** ${await PlayerModal.countDocuments({ 'arena.isInitialized': true })}\n**Reset:** ${getTimeUntilReset()}\n**Rewards:** Active`,
          inline: true
        }
      )
      .setColor('#FFD700')
      .setFooter({ text: 'Rankings update in real-time • Season rewards based on final placement' });

    const leaderboardButtons = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('arena_view_rank_rewards')
          .setLabel('🎁 Rank Rewards')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('arena_refresh_leaderboard')
          .setLabel('🔄 Refresh')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('arena_back')
          .setLabel('⬅️ Back to Arena')
          .setStyle(ButtonStyle.Secondary)
      );

    // ✅ FIXED: Use smart responder instead of direct update
    await SmartResponder.update(interaction, {
      embeds: [embed],
      components: [leaderboardButtons]
    });

  } catch (error) {
    console.error('Error in showLeaderboardMenu:', error);
    const errorEmbed = new EmbedBuilder()
      .setTitle('❌ **Error**')
      .setDescription('Failed to load leaderboard. Please try again.')
      .setColor('#FF0000');
    
    // ✅ FIXED: Use smart responder for error handling too
    await SmartResponder.update(interaction, { embeds: [errorEmbed], components: [] });
  }
}

// Stats Menu - Detailed arena statistics
export async function showStatsMenu(interaction: any, client: ExtendedClient): Promise<void> {
  try {
    const playerId = interaction.user.id;
    const playerData = await PlayerModal.findById(playerId);
    
    if (!playerData) {
      // ✅ FIXED: Use smart responder
      await SmartResponder.reply(interaction, { 
        content: '❌ Player data not found!', 
        ephemeral: true 
      });
      return;
    }

    const arena = playerData.arena;
    const totalBattles = arena.totalWins + arena.totalLosses;
    const winRate = totalBattles > 0 ? Math.round((arena.totalWins / totalBattles) * 100) : 0;
    const defenseTotal = arena.defenseWins + arena.defenseLosses;
    const defenseWinRate = defenseTotal > 0 ? Math.round((arena.defenseWins / defenseTotal) * 100) : 0;
    
    // Calculate rating gain/loss potential
    const ratingChange = arena.rating - 1000; // Assuming 1000 is starting rating
    
    const embed = new EmbedBuilder()
      .setTitle('📊 **Arena Analytics Dashboard**')
      .setDescription(`**Detailed performance statistics for ${playerData.name}**`)
      .addFields(
        {
          name: '🏆 **Rating & Rank**',
          value: `**Current Rating:** ${arena.rating}\n**Rank:** ${arena.rank}\n**Peak Rating:** ${arena.maxRating}\n**Rating Change:** ${ratingChange >= 0 ? '+' : ''}${ratingChange}`,
          inline: true
        },
        {
          name: '⚔️ **Attack Statistics**',
          value: `**Total Attacks:** ${totalBattles}\n**Wins:** ${arena.totalWins}\n**Losses:** ${arena.totalLosses}\n**Win Rate:** ${winRate}%`,
          inline: true
        },
        {
          name: '🛡️ **Defense Statistics**',
          value: `**Total Defenses:** ${defenseTotal}\n**Successful:** ${arena.defenseWins}\n**Failed:** ${arena.defenseLosses}\n**Success Rate:** ${defenseWinRate}%`,
          inline: true
        },
        {
          name: '📈 **Daily Activity**',
          value: `**Today's Attacks:** ${arena.attacksToday}/30\n**Attacks Remaining:** ${30 - arena.attacksToday}\n**Last Battle:** ${getTimeSinceLastBattle(arena.lastBattleAt)}\n**Status:** ${arena.inBattle ? '🔴 In Battle' : '🟢 Available'}`,
          inline: true
        },
        {
          name: '🎯 **Performance Metrics**',
          value: `**Avg Rating/Win:** ${arena.totalWins > 0 ? Math.round(ratingChange / arena.totalWins) : 0}\n**Battle Frequency:** ${totalBattles > 0 ? Math.round(totalBattles / Math.max(1, Math.floor((Date.now() - playerData.createdAt.getTime()) / (1000 * 60 * 60 * 24)))) : 0}/day\n**Defense Setup:** ${arena.defenseDeck?.length > 0 ? '✅ Active' : '❌ Not Set'}\n**Recent Opponents:** ${arena.recentOpponents?.length || 0}`,
          inline: true
        },
        {
          name: '🏅 **Season Progress**',
          value: `**Season:** ${getCurrentSeason()}\n**Global Rank:** #${await calculateGlobalRank(arena.rating)}\n**Next Rank:** ${getNextRank(arena.rank)}\n**Rating Needed:** ${getRatingForNextRank(arena.rank) - arena.rating > 0 ? getRatingForNextRank(arena.rank) - arena.rating : 'MAX'}`,
          inline: true
        }
      )
      .setColor('#9932CC')
      .setFooter({ text: 'Statistics update in real-time • Use analytics to improve your strategy!' })
      .setTimestamp();

    const statsButtons = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('arena_detailed_history')
          .setLabel('📜 Battle History')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('arena_compare_stats')
          .setLabel('⚖️ Compare')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('arena_export_stats')
          .setLabel('📊 Export')
          .setStyle(ButtonStyle.Secondary)
      );

    const backButton = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('arena_back')
          .setLabel('⬅️ Back to Arena')
          .setStyle(ButtonStyle.Secondary)
      );

    // ✅ FIXED: Use smart responder
    await SmartResponder.reply(interaction, { 
      embeds: [embed], 
      components: [statsButtons, backButton],
      ephemeral: true 
    });

  } catch (error) {
    console.error('Error in showStatsMenu:', error);
    // ✅ FIXED: Use smart responder for error handling
    await SmartResponder.reply(interaction, { 
      content: '❌ Failed to load statistics. Please try again.', 
      ephemeral: true 
    });
  }
}

// Rewards Menu - Season and achievement rewards
export async function showRewardsMenu(interaction: any, client: ExtendedClient): Promise<void> {
  try {
    const playerId = interaction.user.id;
    const playerData = await PlayerModal.findById(playerId);
    
    if (!playerData) {
      // ✅ FIXED: Use smart responder
      await SmartResponder.reply(interaction, { 
        content: '❌ Player data not found!', 
        ephemeral: true 
      });
      return;
    }

    const arena = playerData.arena;
    
    // Calculate available rewards based on performance
    const availableRewards = [];
    
    // Daily rewards
    if (arena.totalWins > 0) {
      availableRewards.push({
        type: 'Daily Victory',
        reward: '100 Coins + 1 Arena Token',
        claimable: true
      });
    }
    
    // Weekly rewards based on rank
    const weeklyReward = getWeeklyReward(arena.rank);
    availableRewards.push({
      type: 'Weekly Rank Reward',
      reward: weeklyReward,
      claimable: arena.totalWins >= 5 // Need at least 5 wins
    });
    
    // Achievement rewards
    if (arena.totalWins >= 10) {
      availableRewards.push({
        type: 'Champion Achievement',
        reward: '500 Coins + Rare Scroll',
        claimable: true
      });
    }
    
    if (arena.defenseWins >= 5) {
      availableRewards.push({
        type: 'Defender Achievement',
        reward: '300 Coins + Defense Token',
        claimable: true
      });
    }

    const rewardsText = availableRewards.map(reward => 
      `${reward.claimable ? '✅' : '❌'} **${reward.type}**\n🎁 ${reward.reward}`
    ).join('\n\n') || 'No rewards available yet. Keep battling to earn rewards!';

    const embed = new EmbedBuilder()
      .setTitle('🎁 **Arena Reward Center**')
      .setDescription('**Claim your hard-earned rewards and achievements!**')
      .addFields(
        {
          name: '🏆 **Available Rewards**',
          value: rewardsText,
          inline: false
        },
        {
          name: '📊 **Reward Progress**',
          value: `**Current Rank:** ${arena.rank}\n**Weekly Battles:** ${arena.totalWins + arena.totalLosses}\n**Defense Victories:** ${arena.defenseWins}\n**Season Points:** ${arena.totalWins * 10 + arena.defenseWins * 5}`,
          inline: true
        },
        {
          name: '⏰ **Season Timer**',
          value: `**Current Season:** ${getCurrentSeason()}\n**Season Ends:** ${getTimeUntilReset()}\n**Final Rewards:** Based on rank\n**Next Season:** Auto-start`,
          inline: true
        }
      )
      .setColor('#FFD700')
      .setFooter({ text: 'Rewards refresh weekly • Season rewards distributed at season end' });

    const rewardButtons = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('arena_claim_daily')
          .setLabel('🎯 Claim Daily')
          .setStyle(ButtonStyle.Success)
          .setDisabled(arena.totalWins === 0),
        new ButtonBuilder()
          .setCustomId('arena_claim_weekly')
          .setLabel('📅 Claim Weekly')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(arena.totalWins < 5),
        new ButtonBuilder()
          .setCustomId('arena_claim_achievements')
          .setLabel('🏅 Achievements')
          .setStyle(ButtonStyle.Secondary)
      );

    const backButton = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('arena_back')
          .setLabel('⬅️ Back to Arena')
          .setStyle(ButtonStyle.Secondary)
      );

    // ✅ FIXED: Use smart responder
    await SmartResponder.reply(interaction, { 
      embeds: [embed], 
      components: [rewardButtons, backButton],
      ephemeral: true 
    });

  } catch (error) {
    console.error('Error in showRewardsMenu:', error);
    // ✅ FIXED: Use smart responder for error handling
    await SmartResponder.reply(interaction, { 
      content: '🎁 **Reward Center Error** - Please try again later!', 
      ephemeral: true 
    });
  }
}

// Helper functions remain the same...
function getCurrentSeason(): string {
  const now = new Date();
  const year = now.getFullYear();
  const weekOfYear = Math.ceil((now.getTime() - new Date(year, 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
  return `${year} Week ${weekOfYear}`;
}

function getTimeUntilReset(): string {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  
  const timeDiff = tomorrow.getTime() - now.getTime();
  const hours = Math.floor(timeDiff / (1000 * 60 * 60));
  const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
  
  return `${hours}h ${minutes}m`;
}

function getTimeSinceLastBattle(lastBattleAt: Date): string {
  const now = new Date();
  const timeDiff = now.getTime() - new Date(lastBattleAt).getTime();
  
  const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) return `${days}d ${hours}h ago`;
  if (hours > 0) return `${hours}h ${minutes}m ago`;
  return `${minutes}m ago`;
}

async function calculateGlobalRank(playerRating: number): Promise<number> {
  try {
    const higherRatedPlayers = await PlayerModal.countDocuments({
      'arena.rating': { $gt: playerRating },
      'arena.isInitialized': true
    });
    return higherRatedPlayers + 1;
  } catch (error) {
    return 999;
  }
}

function getNextRank(currentRank: string): string {
  const ranks = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master', 'Grandmaster', 'Challenger'];
  const currentIndex = ranks.indexOf(currentRank);
  return currentIndex < ranks.length - 1 ? ranks[currentIndex + 1] : 'MAX';
}

function getRatingForNextRank(currentRank: string): number {
  const rankRatings: any = {
    'Bronze': 1200,
    'Silver': 1500,
    'Gold': 1800,
    'Platinum': 2100,
    'Diamond': 2400,
    'Master': 2700,
    'Grandmaster': 3000,
    'Challenger': 9999
  };
  return rankRatings[getNextRank(currentRank)] || 9999;
}

function getWeeklyReward(rank: string): string {
  const rewards: any = {
    'Bronze': '50 Coins + 1 Common Scroll',
    'Silver': '100 Coins + 1 Rare Scroll',
    'Gold': '200 Coins + 2 Rare Scrolls',
    'Platinum': '400 Coins + 1 Legendary Scroll',
    'Diamond': '600 Coins + 2 Legendary Scrolls',
    'Master': '1000 Coins + 3 Legendary Scrolls',
    'Grandmaster': '1500 Coins + 5 Legendary Scrolls',
    'Challenger': '2500 Coins + 10 Legendary Scrolls'
  };
  return rewards[rank] || '50 Coins';
}
