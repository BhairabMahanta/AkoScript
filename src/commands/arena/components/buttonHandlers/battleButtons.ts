import { ExtendedClient } from "../../../..";
import { PlayerModal } from "../../../../data/mongo/playerschema";
import Battle, { BattleMode } from "../../../adv/action/battle/battle";
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } from "discord.js";

export async function handleOpponentSelection(interaction: any, client: ExtendedClient): Promise<void> {
  try {
    const attackerId = interaction.user.id;
    const defenderId = interaction.values[0]; // Selected opponent ID

    console.log(`Arena Battle Setup: ${attackerId} vs ${defenderId}`);

    // Fetch both players' data
    const [attackerData, defenderData] = await Promise.all([
      PlayerModal.findById(attackerId),
      PlayerModal.findById(defenderId)
    ]);

    // Validate attacker exists
    if (!attackerData) {
      await interaction.followUp({
        content: '❌ Your player data not found!',
        ephemeral: true
      });
      return;
    }

    // Validate defender exists
    if (!defenderData) {
      await interaction.followUp({
        content: '❌ Opponent data not found! They may have been removed from the arena.',
        ephemeral: true
      });
      return;
    }

    // Validate attacker has required setup
    const attackerValidation = validateArenaPlayer(attackerData, 'You');
    if (!attackerValidation.valid) {
      await interaction.followUp({
        content: `❌ ${attackerValidation.error}`,
        ephemeral: true
      });
      return;
    }

    // Validate defender has required setup
    const defenderValidation = validateArenaPlayer(defenderData, 'Opponent');
    if (!defenderValidation.valid) {
      await interaction.followUp({
        content: `❌ ${defenderValidation.error}`,
        ephemeral: true
      });
      return;
    }

    // Check if attacker has attacks remaining
    if (attackerData.arena.attacksToday >= 30) {
      await interaction.followUp({
        content: '❌ You have used all your attacks for today!',
        ephemeral: true
      });
      return;
    }

    // Create battle preview embed
    const battlePreviewEmbed = await createBattlePreviewEmbed(attackerData, defenderData);
    const battleComponents = await createBattlePreviewComponents(attackerData, defenderData);

    // Update the interaction with battle preview
    await interaction.editReply({ 
      embeds: [battlePreviewEmbed], 
      components: battleComponents 
    });

  } catch (error) {
    console.error('Error in handleOpponentSelection:', error);
    await interaction.followUp({
      content: '❌ Failed to load battle preview. Please try again.',
      ephemeral: true
    });
  }
}

async function createBattlePreviewEmbed(attackerData: any, defenderData: any): Promise<EmbedBuilder> {
  const attackerDeck = attackerData.deck || [];
  const defenderDeck = defenderData.arena?.defenseDeck?.filter((slot: any) => slot.name !== 'empty') || [];
  
  const attackerDeckPreview = await createDeckPreviewString(attackerDeck, attackerData.collectionInv);
  const defenderDeckPreview = await createDeckPreviewString(defenderDeck, defenderData.collectionInv);

  const ratingDiff = defenderData.arena?.rating - attackerData.arena?.rating;
  const diffText = ratingDiff > 0 ? `+${ratingDiff}` : `${ratingDiff}`;
  const difficulty = ratingDiff > 50 ? '🔴 HARD' : ratingDiff > 0 ? '🟡 MEDIUM' : '🟢 EASY';

  const description = `
🥊 **ARENA SHOWDOWN** • ${difficulty} • Rating Stakes: ±15-30 pts

▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬

**🗡️ ATTACKER: ${attackerData.name}**
🏆 ${attackerData.arena?.rating || 1000} • 🎖️ ${attackerData.arena?.rank || 'Unranked'} • ⚔️ ${30 - (attackerData.arena?.attacksToday || 0)} attacks left

**🛡️ DEFENDER: ${defenderData.name}** 🤖
🏆 ${defenderData.arena?.rating || 1000} (${diffText}) • 🎖️ ${defenderData.arena?.rank || 'Unranked'} • 🏰 AI Defense

▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬

**👥 YOUR BATTLE TEAM (${attackerDeck.length}/4)**
${attackerDeckPreview || '❌ *No battle deck configured*'}

**🏰 ENEMY DEFENSE (${defenderDeck.length}/4)**
${defenderDeckPreview || '❌ *No defense team found*'}

▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬

🎁 **WIN REWARDS:** Rating Points • EXP • Arena Tokens • Rank Progress
`;

  return new EmbedBuilder()
    .setTitle('⚔️ **ARENA BATTLE PREVIEW**')
    .setDescription(description)
    .setColor(ratingDiff > 0 ? 0xff6b6b : ratingDiff < -20 ? 0x4ecdc4 : 0x45b7d1)
    .setFooter({ text: 'Select opponent • View details • Start battle!' })
    .setTimestamp();
}



async function createDeckPreviewString(deck: any[], collectionInv: any[]): Promise<string> {
  if (!deck || deck.length === 0) return 'No familiars in deck';
  
  const deckPreview = deck.slice(0, 4).map((slot: any, index: number) => {
    let familiar;
    
    if (slot.serialId === 'player') {
      // Player character
      familiar = { name: slot.name, level: 1, rarity: 'Player' };
    } else {
      // Find in collection inventory
      familiar = collectionInv?.find((inv: any) => inv.serialId === slot.serialId);
    }
    
    if (familiar) {
      return `${index + 1}. **${familiar.name}** (Lv.${familiar.level || 1})`;
    }
    return `${index + 1}. **${slot.name}** (Unknown)`;
  });
  
  const preview = deckPreview.join('\n');
  return preview;
}

async function createBattlePreviewComponents(
  attackerData: any, 
  defenderData: any
): Promise<ActionRowBuilder<any>[]> {
  const minRating = Math.max(1000, attackerData.arena.rating - 100);
  const maxRating = attackerData.arena.rating + 100;
  
  const opponents = await PlayerModal.find({
    _id: { $ne: attackerData._id }, // Fixed: should be _id not id
    'arena.rating': { $gte: minRating, $lte: maxRating },
    'arena.defenseDeck': { $exists: true, $not: { $size: 0 } }
  })
  .select('name arena.rating arena.rank arena.totalWins arena.totalLosses')
  .limit(8)
  .sort({ 'arena.rating': -1 });

  // Add null filter as you mentioned
  const validOpponents = opponents.filter(opp => opp && opp.name);

  if (validOpponents.length === 0) {
    // Return just the action buttons if no opponents
    const actionRow = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('arena_refresh_opponents')
          .setLabel('🔄 Refresh Opponents')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('arena_back')
          .setLabel('↩️ Back to Arena')
          .setStyle(ButtonStyle.Primary)
      );
    return [actionRow];
  }

  // Separate ActionRowBuilder for StringSelectMenu
  const opponentSelect = new StringSelectMenuBuilder()
    .setCustomId('arena_select_opponent')
    .setPlaceholder(`🎯 Currently: ${defenderData.name} - Change opponent?`)
    .addOptions(
      validOpponents.map((opp) => ({
        label: `${opp.name} (${opp.arena.rating})`,
        description: `${opp.arena.rank} • Win Rate: ${Math.round((opp.arena.totalWins / (opp.arena.totalWins + opp.arena.totalLosses || 1)) * 100)}%`,
        value: opp._id.toString(),
        emoji: opp._id.toString() === defenderData._id.toString() ? '🎯' : '⚔️'
      }))
    );

  const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>()
    .addComponents(opponentSelect);

  // Separate ActionRowBuilder for Buttons
  const battleRow = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`arena_view_own_deck`)
        .setLabel('📋 View My Deck')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`arena_view_opponent_deck:${defenderData._id}`) // Fixed: should be _id
        .setLabel('🔍 View Their Defense')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`arena_start_fight:${defenderData._id}`) // Fixed: should be _id
        .setLabel('⚔️ FIGHT!')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('arena_back')
        .setLabel('↩️ Back to Arena')
        .setStyle(ButtonStyle.Primary)
    );

  return [selectRow, battleRow];
}


export async function handleViewOwnDeck(interaction: any, client: ExtendedClient): Promise<void> {
  try {
    const playerId = interaction.user.id;
    const playerData = await PlayerModal.findById(playerId);
    
    if (!playerData) {
      await interaction.followUp({
        content: '❌ Player data not found!',
        ephemeral: true
      });
      return;
    }
    
    const deck = playerData.deck || [];
    const collectionInv = playerData.collectionInv || [];
    
    let deckDisplay = '';
    
    for (let i = 0; i < 6; i++) {
      const slot = deck[i];
      if (slot && slot.name !== 'empty') {
        let familiar;
        
        if (slot.serialId === 'player') {
          const stats = {level: playerData.exp.level || 1,
            rarity: 'Player',
            hp: playerData.stats?.hp || 100,
            attack: playerData.stats?.attack || 10,
            defense: playerData.stats?.defense || 10}
          familiar = {
            name: playerData.name,
            stats
          };
        } else {
          familiar = collectionInv.find((inv: any) => inv.serialId === slot.serialId);
        }
        
        if (familiar) {
          const stats = familiar.stats || {};
          deckDisplay += `**${i + 1}.** ${familiar.name} (Lv.${familiar.stats?.level})\n`;
          deckDisplay += `   ❤️ HP: ${familiar.stats?.hp || 'N/A'} | ⚔️ ATK: ${familiar.stats?.attack || 'N/A'} | 🛡️ DEF: ${familiar.stats?.defense || 'N/A'}\n\n`;
        } else {
          deckDisplay += `**${i + 1}.** ${slot.name} (Data not found)\n\n`;
        }
      } else {
        deckDisplay += `**${i + 1}.** Empty Slot\n\n`;
      }
    }
    
    const embed = new EmbedBuilder()
      .setTitle('📋 **Your Battle Deck**')
      .setDescription(deckDisplay || 'Your deck is empty!')
      .setColor(0x00ff00)
      .setFooter({ text: 'This is the deck you\'ll use in battle!' });
    
    await interaction.followUp({
      embeds: [embed],
      ephemeral: true
    });
    
  } catch (error) {
    console.error('Error in handleViewOwnDeck:', error);
    await interaction.followUp({
      content: '❌ Failed to load your deck.',
      ephemeral: true
    });
  }
}

export async function handleViewOpponentDeck(interaction: any, client: ExtendedClient): Promise<void> {
  try {
    const defenderId = interaction.customId.split(':')[1];
    const defenderData = await PlayerModal.findById(defenderId);
    
    if (!defenderData) {
      await interaction.followUp({
        content: '❌ Opponent data not found!',
        ephemeral: true
      });
      return;
    }
    
    const defenseDeck = defenderData.arena?.defenseDeck?.filter((slot: any) => slot.name !== 'empty') || [];
    const collectionInv = defenderData.collectionInv || [];
    
    let deckDisplay = '';
    
    for (let i = 0; i < 4; i++) {
      const slot = defenseDeck[i];
      if (slot && slot.name !== 'empty') {
        let familiar;
        
        if (slot.serialId === 'player') {
          familiar = {
            name: defenderData.name,
            level: defenderData.exp.level || 1,
            rarity: 'Player',
            hp: defenderData.stats?.hp || 100,
            attack: defenderData.stats?.attack || 10,
            defense: defenderData.stats?.defense || 10
          };
        } else {
          familiar = collectionInv.find((inv: any) => inv.serialId === slot.serialId);
        }
        
        if (familiar) {
          deckDisplay += `**${i + 1}.** ${familiar.name} (Lv.${familiar.stats?.level})\n`;
          deckDisplay += `   ❤️ HP: ${familiar.stats?.hp || 'N/A'} | ⚔️ ATK: ${familiar.stats?.attack || 'N/A'} | 🛡️ DEF: ${familiar.stats?.defense || 'N/A'}\n\n`;
        } else {
          deckDisplay += `**${i + 1}.** ${slot.name} (Data not found)\n\n`;
        }
      } else {
        deckDisplay += `**${i + 1}.** Empty Slot\n\n`;
      }
    }
    
    const embed = new EmbedBuilder()
      .setTitle(`🏰 **${defenderData.name}'s Defense Team**`)
      .setDescription(deckDisplay || 'No defense team set!')
      .setColor(0xff4444)
      .setFooter({ text: 'This is what you\'ll be fighting against!' });
    
    await interaction.followUp({
      embeds: [embed],
      ephemeral: true
    });
    
  } catch (error) {
    console.error('Error in handleViewOpponentDeck:', error);
    await interaction.followUp({
      content: '❌ Failed to load opponent\'s defense team.',
      ephemeral: true
    });
  }
}

export async function handleStartFight(interaction: any, client: ExtendedClient): Promise<void> {
  try {
    const attackerId = interaction.user.id;
    const defenderId = interaction.customId.split(':')[1] || interaction.customId.replace('arena_start_fight:', '');

    console.log(`Arena Battle: ${attackerId} attacking ${defenderId}`);

    // Fetch both players' data
    const [attackerData, defenderData] = await Promise.all([
      PlayerModal.findById(attackerId),
      PlayerModal.findById(defenderId)
    ]);

    // Validate data exists (quick check since we already validated in preview)
    if (!attackerData || !defenderData) {
      await interaction.followUp({
        content: '❌ Battle data not found!',
        ephemeral: true
      });
      return;
    }

    // Mark both players as in battle and increment attacks
    await Promise.all([
      PlayerModal.findByIdAndUpdate(attackerId, { 
        $set: { 'arena.inBattle': true },
        $inc: { 'arena.attacksToday': 1 }
      }),
      PlayerModal.findByIdAndUpdate(defenderId, { 
        $set: { 'arena.inBattle': true }
      })
    ]);

    // Show battle starting message
    const battleStartEmbed = new EmbedBuilder()
      .setTitle('⚔️ **Arena Battle Starting!**')
      .setDescription('**Preparing for combat...**')
      .addFields(
        {
          name: '🗡️ **Attacker**',
          value: `**${attackerData.name}**\n🏆 Rating: ${attackerData.arena.rating}\n🎖️ Rank: ${attackerData.arena.rank}`,
          inline: true
        },
        {
          name: '🛡️ **Defender**',
          value: `**${defenderData.name}**\n🏆 Rating: ${defenderData.arena.rating}\n🎖️ Rank: ${defenderData.arena.rank}`,
          inline: true
        },
        {
          name: '⚡ **Battle Mode**',
          value: `**Type:** Arena Battle\n**Format:** You vs AI Defense\n**Stakes:** Rating Points`,
          inline: false
        }
      )
      .setColor(0xff4444)
      .setFooter({ text: 'Battle starting in 3 seconds...' });

    await interaction.editReply({ 
      embeds: [battleStartEmbed], 
      components: [] 
    });

    // Wait 3 seconds for dramatic effect
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Create mock message object for the battle system
    const mockMessage = {
      channel: interaction.channel,
      user: interaction.user,
      reply: async (content: any) => {
        if (typeof content === 'string') {
          return await interaction.followUp({ content });
        }
        return await interaction.followUp(content);
      },
      edit: async (content: any) => {
        if (typeof content === 'string') {
          return await interaction.editReply({ content, embeds: [], components: [] });
        }
        return await interaction.editReply(content);
      }
    };

    // Prepare attacker data (uses their normal battle deck)
    const attackerBattleData = {
      ...attackerData.toObject(),
      name: attackerData.name,
      isArenaAttacker: true
    };

    // Prepare defender data (uses their defense deck, will be AI controlled)
    const defenderBattleData = {
      ...defenderData.toObject(),
      _id: `${defenderData._id}_arena_defense`,
      playerId: `${defenderId}_defense`,
      deck: defenderData.arena.defenseDeck.filter((slot: any) => slot.name !== 'empty'),
      name: `${defenderData.name} (Defense)`,
      isArenaDefender: true,
      originalPlayerId: defenderId // Keep track of original player for rating updates
    };

    console.log(`Starting arena battle: ${attackerData.name} vs ${defenderData.name}'s defense`);

    // Create the battle instance
    const arenaBattle = new Battle(
      attackerBattleData,   // Attacker (human controlled)
      defenderBattleData,   // Defender (AI controlled)
      mockMessage as any,   // Mock message object
      null,                 // No scenario for arena battles
      'pvp_afk' as BattleMode // Defender will be AI controlled
    );

    // Start the battle
    await arenaBattle.startEmbed();

  } catch (error) {
    console.error('Error in handleStartFight:', error);
    
    // Clean up battle flags in case of error
    try {
      await Promise.all([
        PlayerModal.findByIdAndUpdate(interaction.user.id, { 
          $set: { 'arena.inBattle': false }
        })
      ]);
    } catch (cleanupError) {
      console.error('Error cleaning up battle flags:', cleanupError);
    }

    await interaction.followUp({
      content: '❌ Failed to start arena battle. Please try again.',
      ephemeral: true
    });
  }
}

// Helper function to validate arena player setup
export function validateArenaPlayer(playerData: any, playerName: string): { valid: boolean; error?: string } {
  if (!playerData.class) {
    return {
      valid: false,
      error: `${playerName} need to select a class first! Use \`!selectclass\``
    };
  }

  if (!playerData.race) {
    return {
      valid: false,
      error: `${playerName} need to select a race first! Use \`!selectrace\``
    };
  }

  if (!playerData.deck || playerData.deck.length === 0) {
    return {
      valid: false,
      error: `${playerName} need to set up a battle deck first! Use \`!deck\``
    };
  }

  if (!playerData.stats || !playerData.stats.hp) {
    return {
      valid: false,
      error: `${playerName} have invalid character stats! Please contact an administrator.`
    };
  }

  // Additional arena-specific validations
  if (playerName === 'Opponent' && (!playerData.arena.defenseDeck || playerData.arena.defenseDeck.length === 0)) {
    return {
      valid: false,
      error: `Opponent has no defense team set up!`
    };
  }

  return { valid: true };
}
