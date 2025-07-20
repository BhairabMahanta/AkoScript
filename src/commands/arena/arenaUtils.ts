import { PlayerModal } from "../../data/mongo/playerschema";
import { 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle
} from 'discord.js';

// ✅ Create arena menu data
export async function createArenaMenuData(playerId: string) {
  const playerArenaData = await getPlayerArenaData(playerId);
  
  if (!playerArenaData.exists) {
    const noPlayerEmbed = new EmbedBuilder()
      .setTitle('❌ **Player Not Found**')
      .setDescription('You need to register first! Use `!register` to create your account.')
      .setColor('#FF0000');
    
    return { embeds: [noPlayerEmbed], components: [] };
  }

  // Calculate progress percentage
  const progressPercent = getProgressPercentage(playerArenaData.rating);
  const progressBars = Math.floor(progressPercent / 10);
  const progressBar = '█'.repeat(progressBars) + '░'.repeat(10 - progressBars);

  // Calculate global rank
  const globalRank = await calculateGlobalRank(playerArenaData.rating);

  // Calculate energy bars for attacks remaining
  const attacksRemaining = Math.max(0, 30 - playerArenaData.attacksToday);
  const energyBars = Math.floor(attacksRemaining / 3);
  const energyBar = '█'.repeat(Math.min(energyBars, 10)) + '░'.repeat(Math.max(0, 10 - energyBars));

  // Check if defense team is set up
  const hasDefenseTeam = playerArenaData.defenseDeck && 
                        playerArenaData.defenseDeck.length > 0 && 
                        playerArenaData.defenseDeck.some((slot: any) => slot.name !== 'empty');

  // Beautiful main embed with actual data
  const embed = new EmbedBuilder()
    .setTitle('⚔️ **ARENA BATTLEFIELD** ⚔️')
    .setDescription('**Welcome to the Arena! Climb the ranks and prove your worth in battle!**')
    .addFields(
      {
        name: '🗿 **Arena Rating**',
        value: `\`\`\`yaml\n🏆 Rating: ${playerArenaData.rating}\n🎖️ Rank: ${playerArenaData.rank}\n📈 Progress: ${progressBar} ${progressPercent}%\`\`\``,
        inline: true
      },
      {
        name: '🥊 **Battle Record**',
        value: `\`\`\`diff\n+ Wins: ${playerArenaData.totalWins}\n- Losses: ${playerArenaData.totalLosses}\n+ Defense: ${playerArenaData.defenseWins} victories\n- Defense: ${playerArenaData.defenseLosses} defeats\`\`\``,
        inline: true
      },
      {
        name: '👑 **Season Status**', 
        value: `\`\`\`fix\nGlobal Rank: #${globalRank}\nMax Rating: ${playerArenaData.maxRating}\nSeason: ${getCurrentSeason()}\nRewards Available: ${playerArenaData.totalWins > 0 ? '🎁' : '❌'}\`\`\``,
        inline: true
      }
    )
    .addFields({
      name: '🛡️ **Defense Team Status**',
      value: hasDefenseTeam ? 
        `\`\`\`css\n✅ Defense Team: ACTIVE\n🛡️ Team Size: ${playerArenaData.defenseDeck.filter((slot: any) => slot.name !== 'empty').length}/4\n📊 Defense Record: ${playerArenaData.defenseWins}W/${playerArenaData.defenseLosses}L\`\`\`` : 
        `\`\`\`fix\n❌ Defense Team: NOT SET\n⚠️  You need to configure your defense team!\n🔧 Click DEFENSE to set up your team\`\`\``,
      inline: false
    })
    .addFields({
      name: '⚔️ **Daily Arena Activity**',
      value: `\`\`\`ini\n[Attacks Used] ${playerArenaData.attacksToday}/30\n[Energy] ${energyBar} ${attacksRemaining} remaining\n[Reset] Next reset in ${getTimeUntilReset()}\n[Last Battle] ${getTimeSinceLastBattle(playerArenaData.lastBattleAt)}\`\`\``,
      inline: false
    })
    .setColor(getRankColor(playerArenaData.rank))
    .setFooter({ 
      text: `🌟 Arena Champion • ${hasDefenseTeam ? 'Defense Ready' : 'Setup Defense'} • Last Updated: ${new Date().toLocaleTimeString()} 🌟`,
    })
    .setTimestamp();

  // Add warning if player is in battle
  if (playerArenaData.inBattle) {
    embed.addFields({
      name: '⚠️ **Battle Status**',
      value: '``````',
      inline: false
    });
  }

  // Stylish primary action buttons with dynamic states
  const primaryRow = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('arena_attack')
        .setLabel('⚔️ BATTLE')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🔥')
        .setDisabled(playerArenaData.attacksToday >= 30),
      new ButtonBuilder()
        .setCustomId('arena_defense')
        .setLabel('🛡️ DEFENSE')
        .setStyle(hasDefenseTeam ? ButtonStyle.Primary : ButtonStyle.Secondary)
        .setEmoji(hasDefenseTeam ? '⚔️' : '🔧'),
      new ButtonBuilder()
        .setCustomId('arena_leaderboard')
        .setLabel('👑 RANKINGS')
        .setStyle(ButtonStyle.Success)
        .setEmoji('🏆')
    );

  // Secondary utility buttons
  const secondaryRow = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('arena_stats')
        .setLabel('Analytics')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('📊'),
      new ButtonBuilder()
        .setCustomId('arena_rewards')
        .setLabel('Rewards')
        .setStyle(ButtonStyle.Success)  
        .setEmoji('🎁')
        .setDisabled(playerArenaData.totalWins === 0),
      new ButtonBuilder()
        .setCustomId('arena_shop')
        .setLabel('Arena Shop')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🏪'),
      new ButtonBuilder()
        .setCustomId('arena_refresh')
        .setLabel('Refresh')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🔄')
    );

  return {
    embeds: [embed],
    components: [primaryRow, secondaryRow]
  };
}

// ✅ Get player arena data from database
export async function getPlayerArenaData(playerId: string): Promise<any> {
  try {
    const player = await PlayerModal.findById(playerId);
    
    if (!player) {
      return { exists: false };
    }

    // Initialize arena data if it doesn't exist or isn't properly set up
    if (!player.arena || !player.arena.isInitialized) {
      await PlayerModal.findByIdAndUpdate(playerId, {
        $set: {
          'arena.rating': 1000,
          'arena.rank': 'Bronze',
          'arena.totalWins': 0,
          'arena.totalLosses': 0,
          'arena.defenseWins': 0,
          'arena.defenseLosses': 0,
          'arena.attacksToday': 0,
          'arena.defenseDeck': [],
          'arena.recentOpponents': [],
          'arena.lastBattleAt': new Date(),
          'arena.inBattle': false,
          'arena.isInitialized': true,
          'arena.maxRating': 1000
        }
      });

      return {
        exists: true,
        rating: 1000,
        rank: 'Bronze',
        totalWins: 0,
        totalLosses: 0,
        defenseWins: 0,
        defenseLosses: 0,
        attacksToday: 0,
        defenseDeck: [],
        recentOpponents: [],
        lastBattleAt: new Date(),
        inBattle: false,
        maxRating: 1000
      };
    }

    // Check if daily attacks need to reset
    const now = new Date();
    const lastBattle = new Date(player.arena.lastBattleAt);
    const isNewDay = now.getDate() !== lastBattle.getDate() || 
                     now.getMonth() !== lastBattle.getMonth() || 
                     now.getFullYear() !== lastBattle.getFullYear();

    if (isNewDay && player.arena.attacksToday > 0) {
      await PlayerModal.findByIdAndUpdate(playerId, {
        $set: { 'arena.attacksToday': 0 }
      });
      player.arena.attacksToday = 0;
    }

    return {
      exists: true,
      rating: player.arena.rating,
      rank: player.arena.rank,
      totalWins: player.arena.totalWins,
      totalLosses: player.arena.totalLosses,
      defenseWins: player.arena.defenseWins,
      defenseLosses: player.arena.defenseLosses,
      attacksToday: player.arena.attacksToday,
      defenseDeck: player.arena.defenseDeck || [],
      recentOpponents: player.arena.recentOpponents || [],
      lastBattleAt: player.arena.lastBattleAt,
      inBattle: player.arena.inBattle,
      maxRating: player.arena.maxRating
    };

  } catch (error) {
    console.error('Error fetching player arena data:', error);
    return { exists: false, error: error };
  }
}

// ✅ Calculate global rank
export async function calculateGlobalRank(playerRating: number): Promise<number> {
  try {
    const higherRatedPlayers = await PlayerModal.countDocuments({
      'arena.rating': { $gt: playerRating },
      'arena.isInitialized': true
    });
    return higherRatedPlayers + 1;
  } catch (error) {
    console.error('Error calculating global rank:', error);
    return 999;
  }
}

// ✅ Utility Functions
export function getProgressPercentage(rating: number): number {
  if (rating < 1200) return Math.floor(((rating - 1000) / 200) * 100);
  if (rating < 1500) return Math.floor(((rating - 1200) / 300) * 100);
  if (rating < 2000) return Math.floor(((rating - 1500) / 500) * 100);
  return 100;
}

export function getCurrentSeason(): string {
  const now = new Date();
  const year = now.getFullYear();
  const weekOfYear = Math.ceil((now.getTime() - new Date(year, 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
  return `${year} Week ${weekOfYear}`;
}

export function getRankColor(rank: string): number {
  const colors: any = {
    'Bronze': 0xCD7F32,
    'Silver': 0xC0C0C0, 
    'Gold': 0xFFD700,
    'Platinum': 0xE5E4E2,
    'Diamond': 0xB9F2FF,
    'Master': 0xFF6B35,
    'Grandmaster': 0x8A2BE2,
    'Challenger': 0xFF1493
  };
  return colors[rank] || 0xCD7F32;
}

export function getTimeUntilReset(): string {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  
  const timeDiff = tomorrow.getTime() - now.getTime();
  const hours = Math.floor(timeDiff / (1000 * 60 * 60));
  const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
  
  return `${hours}h ${minutes}m`;
}

export function getTimeSinceLastBattle(lastBattleAt: Date): string {
  const now = new Date();
  const timeDiff = now.getTime() - new Date(lastBattleAt).getTime();
  
  const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) return `${days}d ${hours}h ago`;
  if (hours > 0) return `${hours}h ${minutes}m ago`;
  return `${minutes}m ago`;
}
