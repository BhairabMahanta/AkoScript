import { ExtendedClient } from "../../..";
import { showAttackMenu } from "./attackMenu";
import { showDefenseMenu } from "./defenseMenu";
import { showLeaderboardMenu } from "./otherButtons";
import { showStatsMenu } from "./otherButtons";
import { showRewardsMenu } from "./otherButtons";
import { returnToArenaMenu } from "../arena"; // ✅ Import the simple helper

export async function handleArenaButtonClick(
  interaction: any, 
  client: ExtendedClient
): Promise<void> {
  try {
    console.log(`Handling button click: ${interaction.customId}`);
    
    switch (interaction.customId) {
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
        
      default:
        console.log(`Unhandled button: ${interaction.customId}`);
        try {
          await interaction.followUp({
            content: '🔧 This feature is still being developed!',
            ephemeral: true
          });
        } catch (followUpError) {
          console.log('Could not send followUp, interaction may be expired');
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
