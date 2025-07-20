import { ExtendedClient } from "../../..";
import { PlayerModal } from "../../../data/mongo/playerschema";
import { DefenseMenuBuilder } from "./defenseComponents/defenseMenuBuilder";

export async function showDefenseMenu(interaction: any, client: ExtendedClient): Promise<void> {
  try {
    const playerId = interaction.user.id;
    const playerData = await PlayerModal.findById(playerId);
    
    if (!playerData) {
      await interaction.editReply({ 
        content: '❌ Player data not found!', 
        embeds: [], 
        components: [] 
      });
      return;
    }

    const mainMenu = await DefenseMenuBuilder.createDefenseMainMenu(playerId);
    await interaction.editReply(mainMenu);

  } catch (error) {
    console.error('Error in showDefenseMenu:', error);
    await interaction.editReply({ 
      content: '❌ Failed to load defense menu.', 
      embeds: [], 
      components: [] 
    });
  }
}
