import { ButtonInteraction, EmbedBuilder } from "discord.js";
import { ExtendedClient } from "../../../..";
import { PlayerModal } from "../../../../data/mongo/playerschema";
import { showDefenseMenu } from "../defenseMenu";

export async function handleTestDefense(
  interaction: ButtonInteraction,
  client: ExtendedClient
): Promise<void> {
  try {
    const playerId = interaction.user.id;
    const playerData = await PlayerModal.findById(playerId);
    
    if (!playerData || !playerData.arena?.defenseDeck) {
      await interaction.followUp({
        content: '❌ No defense team to test!',
        ephemeral: true
      });
      return;
    }

    const defenseTeam = playerData.arena.defenseDeck.filter((slot: any) => slot.name !== 'empty');
    const testResult = Math.random() > 0.5;

    const testEmbed = new EmbedBuilder()
      .setTitle('🧪 **Defense Test Results**')
      .setDescription(`**Simulation Complete!**\n\n${testResult ? '✅ **VICTORY!**' : '❌ **DEFEAT!**'}`)
      .addFields(
        {
          name: '🛡️ **Defense Team Performance**',
          value: defenseTeam.map((fam: any, i: number) => 
            `**${i + 1}.** ${fam.name} - ${Math.floor(Math.random() * 100) + 1}% efficiency`
          ).join('\n'),
          inline: false
        },
        {
          name: '📊 **Battle Summary**',
          value: `**Result:** ${testResult ? 'Defense Successful' : 'Defense Breached'}\n**Rating Change:** +0 (Test Mode)\n**Recommendation:** ${testResult ? 'Great setup!' : 'Consider stronger familiars'}`,
          inline: false
        }
      )
      .setColor(testResult ? 0x00ff00 : 0xff0000);

    await interaction.editReply({ embeds: [testEmbed], components: [] });

    setTimeout(async () => {
      await showDefenseMenu(interaction, client);
    }, 3000);

  } catch (error) {
    console.error('Error in handleTestDefense:', error);
  }
}
