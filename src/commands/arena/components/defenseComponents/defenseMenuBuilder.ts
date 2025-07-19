import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { PlayerModal } from "../../../../data/mongo/playerschema";
import { DefenseTeamData, DefenseStats } from "./defenseTypes";

export class DefenseMenuBuilder {
  static async getDefenseTeamData(playerId: string): Promise<DefenseTeamData> {
    const playerData = await PlayerModal.findById(playerId);
    if (!playerData) throw new Error("Player data not found");

    const defenseDeck = playerData.arena?.defenseDeck || [];
    const hasDefenseSet = defenseDeck.length > 0 && defenseDeck.some((slot: any) => slot.name !== 'empty');
    
    const defenseWins = playerData.arena?.defenseWins || 0;
    const defenseLosses = playerData.arena?.defenseLosses || 0;
    const defenseStats: DefenseStats = {
      wins: defenseWins,
      losses: defenseLosses,
      winRate: defenseWins + defenseLosses > 0 ? Math.round((defenseWins / (defenseWins + defenseLosses)) * 100) : 0,
      total: defenseWins + defenseLosses
    };

    return { defenseDeck, hasDefenseSet, defenseStats };
  }

  static formatDefenseTeamText(defenseDeck: any[], hasDefenseSet: boolean): string {
    if (hasDefenseSet) {
      return defenseDeck
        .map((slot: any, index: number) => {
          if (slot.name === 'empty') {
            return `**${index + 1}.** _Empty Slot_`;
          }
          return `**${index + 1}.** ${slot.name} ${slot.serialId === 'player' ? '(You)' : `\`${slot.serialId}\``}`;
        })
        .join('\n');
    }
    return '❌ **No defense team set!**\nYour base will be defenseless without a team.';
  }

  static createDefenseEmbed(teamData: DefenseTeamData): EmbedBuilder {
    const { defenseDeck, hasDefenseSet, defenseStats } = teamData;
    const defenseTeamText = this.formatDefenseTeamText(defenseDeck, hasDefenseSet);

    return new EmbedBuilder()
      .setTitle('🛡️ **Arena Defense Management**')
      .setDescription('**Configure your defense team to protect your rating while offline!**')
      .addFields(
        {
          name: '👥 **Current Defense Team**',
          value: defenseTeamText,
          inline: false
        },
        {
          name: '📊 **Defense Statistics**',
          value: `**Wins:** ${defenseStats.wins}\n**Losses:** ${defenseStats.losses}\n**Success Rate:** ${defenseStats.winRate}%\n**Total Defenses:** ${defenseStats.total}`,
          inline: true
        },
        {
          name: '⚡ **Defense Status**',
          value: hasDefenseSet ? 
            '✅ **ACTIVE** - Your base is protected!' : 
            '❌ **VULNERABLE** - Set up defense team!',
          inline: true
        }
      )
      .setColor(hasDefenseSet ? 0x00FF00 : 0xFF6600)
      .setFooter({ text: 'A strong defense earns records even when you\'re offline!' });
  }

  static createActionButtons(hasDefenseSet: boolean): ActionRowBuilder<ButtonBuilder>[] {
    const defenseButtons = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('arena_configure_defense')
          .setLabel('⚙️ Configure Team')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('arena_auto_defense')
          .setLabel('🎲 Auto Setup')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('arena_test_defense')
          .setLabel('🧪 Test Defense')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(!hasDefenseSet)
      );

    const navigationButtons = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('arena_clear_defense')
          .setLabel('🗑️ Clear Team')
          .setStyle(ButtonStyle.Danger)
          .setDisabled(!hasDefenseSet),
        new ButtonBuilder()
          .setCustomId('arena_back')
          .setLabel('⬅️ Back to Arena')
          .setStyle(ButtonStyle.Secondary)
      );

    return [defenseButtons, navigationButtons];
  }

  static async createDefenseMainMenu(playerId: string) {
    const teamData = await this.getDefenseTeamData(playerId);
    const embed = this.createDefenseEmbed(teamData);
    const components = this.createActionButtons(teamData.hasDefenseSet);

    return { embeds: [embed], components };
  }
}
