import { ExtendedClient } from "../../..";
import { showAttackMenu } from "./attackMenu";
import { showDefenseMenu } from "./defenseMenu";
import { showLeaderboardMenu } from "./otherButtons";
import { showStatsMenu } from "./otherButtons";
import { showRewardsMenu } from "./otherButtons";
import { returnToArenaMenu } from "../arena";
import { handleTestDefense } from "./defenseComponents/defenseTest";

// Import modular button handlers
import {
  handleConfigureDefense,
  handleAutoDefense,
  handleClearDefense,
  defenseStates
} from "./buttonHandlers/defenseButtons";
import {
  handleSaveDeck,
  handleResetDeck,
  handleAutoFillDeck,
  handleDeckSlot
} from "./buttonHandlers/deckButtons";
import {
  handleOpponentSelection,
  handleStartFight,
  handleViewOpponentDeck,
  handleViewOwnDeck
} from "./buttonHandlers/battleButtons";
import {
  handleRewardClaim,
  handleOtherFeatures
} from "./buttonHandlers/miscButtons";

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

      // Defense Specific Buttons
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

      // Deck Management Buttons
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

      // Battle/Selection Handling
      case 'arena_select_opponent':
        await handleOpponentSelection(interaction, client);
        break;

      // Reward Buttons
      case 'arena_claim_daily':
      case 'arena_claim_weekly':
      case 'arena_claim_achievements':
        await handleRewardClaim(interaction, client);
        break;

      // Other Arena Buttons
      case 'arena_view_rank_rewards':
      case 'arena_detailed_history':
      case 'arena_compare_stats':
      case 'arena_export_stats':
        await handleOtherFeatures(interaction, client);
        break;
        case 'arena_view_own_deck':
  await handleViewOwnDeck(interaction, client);
  break;

      default:
          if (interaction.customId.startsWith('arena_view_opponent_deck:')) {
    await handleViewOpponentDeck(interaction, client);
  } else if (interaction.customId.startsWith('arena_start_fight:')) {
    await handleStartFight(interaction, client);
  }else if (interaction.customId.startsWith('deck_slot')) {
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

// Export defense states for modal handling
export { defenseStates };
