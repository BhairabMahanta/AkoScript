import { ButtonInteraction, EmbedBuilder } from "discord.js";
import { ExtendedClient } from "../../../..";
import { PlayerModal } from "../../../../data/mongo/playerschema";
import { showDefenseMenu } from "../defenseMenu";
import Battle, { BattleMode } from "../../../adv/action/battle/battle";

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
    
    if (defenseTeam.length === 0) {
      await interaction.followUp({
        content: '❌ No familiars in your defense team to test!',
        ephemeral: true
      });
      return;
    }

    if (!playerData.deck || playerData.deck.length === 0) {
      await interaction.followUp({
        content: '❌ You need a battle deck to test your defense! Use `!deck` to set it up.',
        ephemeral: true
      });
      return;
    }

    // Show test starting message
    const testStartEmbed = new EmbedBuilder()
      .setTitle('🧪 **Defense Test Starting...**')
      .setDescription('**You will attack your own defense team!**')
      .addFields(
        {
          name: '⚔️ **Your Attack Deck**',
          value: playerData.deck.map((slot: any, index: number) => 
            `**${index + 1}.** ${slot.name} ${slot.serialId === 'player' ? '(You)' : `\`${slot.serialId}\``}`
          ).join('\n'),
          inline: true
        },
        {
          name: '🛡️ **Your Defense Team (AI)**',
          value: defenseTeam.map((slot: any, index: number) => 
            `**${index + 1}.** ${slot.name} ${slot.serialId === 'player' ? '(You)' : `\`${slot.serialId}\``}`
          ).join('\n'),
          inline: true
        },
        {
          name: '🎯 **Test Mode**',
          value: '**Type:** Defense Test\n**Your Role:** Attacker\n**Defense Role:** AI Controlled\n**Rating Impact:** None',
          inline: false
        }
      )
      .setColor(0xffaa00)
      .setFooter({ text: 'Battle starting...' });

    await interaction.editReply({ embeds: [testStartEmbed], components: [] });

    // Wait 2 seconds
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Create mock message object for the battle system
    const mockMessage = {
      channel: interaction.channel,
      user: interaction.user, // Add user property that Battle.ts expects
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

    // Prepare attacker data (user's normal deck)
    const attackerData = {
      ...playerData.toObject(),
      name: `${playerData.name} (Attacker)`
    };

    // Prepare defense data (user's defense deck, will be AI controlled)
    const defenseTestData = {
      ...playerData.toObject(),
      _id: `${playerData._id}_defense_test`,
      playerId: `${playerId}_defense`,
      deck: defenseTeam,
      name: `${playerData.name}'s Defense`,
      isDefenseTest: true
    };

    // Start the defense test battle
    const testBattle = new Battle(
      attackerData,         // Player's normal deck (human controlled)
      defenseTestData,      // Player's defense team (AI controlled)
      mockMessage as any,   // Mock message object
      null,                 // No scenario
      'pvp_afk' as BattleMode // Defense will be AI controlled
    );

    // Start the battle - let it handle itself with your existing battle system
    await testBattle.startEmbed();

    // The battle will now run normally and complete using your existing systems
    // User can manually return to defense menu after battle, or we can add a button

  } catch (error) {
    console.error('Error in handleTestDefense:', error);
    
    await interaction.editReply({
      content: '❌ Failed to start defense test. Please try again.',
      embeds: [],
      components: []
    });

    setTimeout(async () => {
      try {
        await showDefenseMenu(interaction, client);
      } catch (menuError) {
        console.error('Error showing defense menu after error:', menuError);
      }
    }, 3000);
  }
}
