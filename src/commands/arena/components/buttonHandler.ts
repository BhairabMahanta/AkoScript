import { ExtendedClient } from "../../..";
import { showAttackMenu } from "./attackMenu";
import { showDefenseMenu } from "./defenseMenu";
import { showLeaderboardMenu } from "./otherButtons";
import { showStatsMenu } from "./otherButtons";
import { showRewardsMenu } from "./otherButtons";
import { returnToArenaMenu } from "../arena";
import { PlayerModal } from "../../../data/mongo/playerschema";
import { DeckManager, createSlotModal, createFastInputModal } from '../../player/selection/deckUtils';
import { DefenseMenuBuilder } from "./defenseComponents/defenseMenuBuilder";
import { handleTestDefense } from "./defenseComponents/defenseTest";
// Add this import at the top with your other imports
import Battle, { BattleMode } from "../../adv/action/battle/battle";
import { EmbedBuilder } from "discord.js";
// Global state for defense operations
const defenseStates = new Map();

export async function handleArenaButtonClick(
  interaction: any, 
  client: ExtendedClient
): Promise<void> {
  try {
    console.log(`Handling button click: ${interaction.customId}`);
    
    switch (interaction.customId) {
      // Main Arena Navigation
      case 'arena_attack':
        await showAttackMenu(interaction, client);
        break;
        
      case 'arena_defense':
        await showDefenseMenu(interaction, client);
        break;
        
      case 'arena_leaderboard':
        await showLeaderboardMenu(interaction, client);
        break;
        
      case 'arena_stats':
        await showStatsMenu(interaction, client);
        break;
        
      case 'arena_rewards':
        await showRewardsMenu(interaction, client);
        break;
        
      case 'arena_refresh':
      case 'arena_back':
        await returnToArenaMenu(interaction);
        break;
        
      case 'arena_refresh_opponents':
        await showAttackMenu(interaction, client);
        break;
        
      case 'arena_refresh_leaderboard':
        await showLeaderboardMenu(interaction, client);
        break;

      // ✅ DEFENSE SPECIFIC BUTTONS - These were missing!
      case 'arena_configure_defense':
        await handleConfigureDefense(interaction, client);
        break;
        
      case 'arena_auto_defense':
        await handleAutoDefense(interaction, client);
        break;
        
      case 'arena_test_defense':
        await handleTestDefense(interaction, client);
        break;
        
      case 'arena_clear_defense':
        await handleClearDefense(interaction, client);
        break;

      // ✅ DECK MANAGEMENT BUTTONS - These were missing too!
      case 'deck_save':
        await handleSaveDeck(interaction, client);
        break;
        
      case 'deck_reset':
      case 'deck_clear':
        await handleResetDeck(interaction, client);
        break;
        
      case 'deck_auto':
        await handleAutoFillDeck(interaction, client);
        break;
        
      case 'deck_back':
        await showDefenseMenu(interaction, client);
        break;

      // ✅ SELECT MENU HANDLING
      case 'arena_select_opponent':
        await handleOpponentSelection(interaction, client);
        break;

      // ✅ REWARD BUTTONS
      case 'arena_claim_daily':
      case 'arena_claim_weekly':
      case 'arena_claim_achievements':
        await handleRewardClaim(interaction, client);
        break;

      // ✅ OTHER ARENA BUTTONS
      case 'arena_view_rank_rewards':
      case 'arena_detailed_history':
      case 'arena_compare_stats':
      case 'arena_export_stats':
        await handleOtherFeatures(interaction, client);
        break;
        
      default:
        // ✅ HANDLE DECK SLOTS AND UNKNOWN BUTTONS
        if (interaction.customId.startsWith('deck_slot')) {
          await handleDeckSlot(interaction, client);
        } else if (interaction.customId.startsWith('arena_')) {
          console.log(`Unhandled arena button: ${interaction.customId}`);
          await interaction.followUp({
            content: '🔧 This feature is still being developed!',
            ephemeral: true
          });
        } else {
          console.log(`Completely unhandled button: ${interaction.customId}`);
          await interaction.followUp({
            content: '❌ Unknown button interaction.',
            ephemeral: true
          });
        }
    }
  } catch (error) {
    console.error('Error in handleArenaButtonClick:', error);
    
    try {
      await interaction.followUp({
        content: '❌ An error occurred while processing your request.',
        ephemeral: true
      });
    } catch (responseError) {
      console.error('Failed to send error response (interaction likely expired):', responseError);
    }
  }
}

// ✅ DEFENSE HANDLER FUNCTIONS
async function handleConfigureDefense(interaction: any, client: ExtendedClient): Promise<void> {
  const playerId = interaction.user.id;
  
  try {
    const deckManager = new DeckManager(playerId, 'arena');
    const success = await deckManager.loadDeck();
    
    if (!success) {
      await interaction.followUp({
        content: '❌ Failed to load defense deck data. Please try again.',
        ephemeral: true
      });
      return;
    }

    // Store deck manager in state
    defenseStates.set(playerId, { deckManager, currentView: 'configure' });

    const embed = deckManager.createDeckEmbed();
    const components = deckManager.createComponents();
    await interaction.editReply({ embeds: [embed], components });
  } catch (error) {
    console.error('Error in handleConfigureDefense:', error);
    await interaction.followUp({
      content: '❌ Failed to configure defense. Please try again.',
      ephemeral: true
    });
  }
}

async function handleAutoDefense(interaction: any, client: ExtendedClient): Promise<void> {
  const playerId = interaction.user.id;
  
  try {
    const deckManager = new DeckManager(playerId, 'arena');
    await deckManager.loadDeck();
    
    const autoFillSuccess = await deckManager.autoFillDeck();
    
    if (autoFillSuccess) {
      const saveSuccess = await deckManager.saveDeck();
      
      if (saveSuccess) {
        await interaction.followUp({
          content: '✅ **Auto-defense setup complete!** Your defense team has been automatically configured and saved.',
          ephemeral: true
        });
        
        await showDefenseMenu(interaction, client);
      } else {
        await interaction.followUp({
          content: '❌ Failed to save auto-generated defense team.',
          ephemeral: true
        });
      }
    } else {
      await interaction.followUp({
        content: '❌ Failed to auto-generate defense team. Make sure you have familiars available.',
        ephemeral: true
      });
    }
  } catch (error) {
    console.error('Error in handleAutoDefense:', error);
    await interaction.followUp({
      content: '❌ Failed to auto-setup defense. Please try again.',
      ephemeral: true
    });
  }
}

async function handleClearDefense(interaction: any, client: ExtendedClient): Promise<void> {
  const playerId = interaction.user.id;
  
  try {
    await PlayerModal.findByIdAndUpdate(playerId, {
      $set: { 'arena.defenseDeck': [] }
    });

    await interaction.followUp({
      content: '🗑️ **Defense team cleared!** Your base is now vulnerable.',
      ephemeral: true
    });

    await showDefenseMenu(interaction, client);
  } catch (error) {
    console.error('Error in handleClearDefense:', error);
    await interaction.followUp({
      content: '❌ Failed to clear defense team. Please try again.',
      ephemeral: true
    });
  }
}

async function handleSaveDeck(interaction: any, client: ExtendedClient): Promise<void> {
  const playerId = interaction.user.id;
  const state = defenseStates.get(playerId);
  
  if (!state?.deckManager) {
    await interaction.followUp({
      content: '❌ No deck manager found. Please try configuring defense again.',
      ephemeral: true
    });
    return;
  }
  
  try {
    const success = await state.deckManager.saveDeck();
    
    if (success) {
      await interaction.followUp({
        content: '✅ **Defense team saved successfully!** Your base is now protected.',
        ephemeral: true
      });
      
      defenseStates.delete(playerId);
      await showDefenseMenu(interaction, client);
    } else {
      await interaction.followUp({
        content: '❌ Failed to save defense team. Please try again.',
        ephemeral: true
      });
    }
  } catch (error) {
    console.error('Error in handleSaveDeck:', error);
    await interaction.followUp({
      content: '❌ Failed to save deck. Please try again.',
      ephemeral: true
    });
  }
}

async function handleResetDeck(interaction: any, client: ExtendedClient): Promise<void> {
  const playerId = interaction.user.id;
  const state = defenseStates.get(playerId);
  
  if (!state?.deckManager) {
    await interaction.followUp({
      content: '❌ No deck manager found. Please try configuring defense again.',
      ephemeral: true
    });
    return;
  }
  
  try {
    state.deckManager.resetDeck();
    const embed = state.deckManager.createDeckEmbed();
    const components = state.deckManager.createComponents();
    
    await interaction.editReply({ embeds: [embed], components });
  } catch (error) {
    console.error('Error in handleResetDeck:', error);
    await interaction.followUp({
      content: '❌ Failed to reset deck. Please try again.',
      ephemeral: true
    });
  }
}

async function handleAutoFillDeck(interaction: any, client: ExtendedClient): Promise<void> {
  const playerId = interaction.user.id;
  const state = defenseStates.get(playerId);
  
  if (!state?.deckManager) {
    await interaction.followUp({
      content: '❌ No deck manager found. Please try configuring defense again.',
      ephemeral: true
    });
    return;
  }
  
  try {
    const success = await state.deckManager.autoFillDeck();
    
    if (success) {
      const embed = state.deckManager.createDeckEmbed();
      const components = state.deckManager.createComponents();
      await interaction.editReply({ embeds: [embed], components });
    } else {
      await interaction.followUp({
        content: '❌ Failed to auto-fill defense team. Make sure you have familiars in your collection.',
        ephemeral: true
      });
    }
  } catch (error) {
    console.error('Error in handleAutoFillDeck:', error);
    await interaction.followUp({
      content: '❌ Failed to auto-fill deck. Please try again.',
      ephemeral: true
    });
  }
}

async function handleDeckSlot(interaction: any, client: ExtendedClient): Promise<void> {
  const playerId = interaction.user.id;
  const state = defenseStates.get(playerId);
  
  if (!state?.deckManager) {
    await interaction.followUp({
      content: '❌ No deck manager found. Please try configuring defense again.',
      ephemeral: true
    });
    return;
  }
  
  try {
    const slotNumber = parseInt(interaction.customId.replace('deck_slot', ''), 10);
    const config = state.deckManager.getConfig();
    const modal = createSlotModal(slotNumber, config.name);
    
    await interaction.showModal(modal);
  } catch (error) {
    console.error('Error in handleDeckSlot:', error);
    await interaction.followUp({
      content: '❌ Failed to open slot modal. Please try again.',
      ephemeral: true
    });
  }
}


async function handleOpponentSelection(interaction: any, client: ExtendedClient): Promise<void> {
  try {
    const attackerId = interaction.user.id;
    const defenderId = interaction.values[0]; // Selected opponent ID

    console.log(`Arena Battle: ${attackerId} attacking ${defenderId}`);

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

    // Check if defender is not in battle
    // if (defenderData.arena.inBattle) {
    //   await interaction.followUp({
    //     content: '❌ This opponent is currently in another battle!',
    //     ephemeral: true
    //   });
    //   return;
    // }

    // Mark both players as in battle
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

    // ✅ FIXED: Use editReply instead of update since interaction was already deferred
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
    console.error('Error in handleOpponentSelection:', error);
    
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
function validateArenaPlayer(playerData: any, playerName: string): { valid: boolean; error?: string } {
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



async function handleRewardClaim(interaction: any, client: ExtendedClient): Promise<void> {
  await interaction.followUp({
    content: '🎁 Reward claiming system coming soon!',
    ephemeral: true
  });
}

async function handleOtherFeatures(interaction: any, client: ExtendedClient): Promise<void> {
  await interaction.followUp({
    content: '🔧 This feature is under development!',
    ephemeral: true
  });
}


// Export defense states for modal handling
export { defenseStates };
