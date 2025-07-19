import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, EmbedBuilder, Interaction, Message, TextChannel } from "discord.js";
import { Tutorial } from "./tutorial";
import { RegistrationState } from "./register";

export class TutorialManager {
  static async showTutorialOptions(message: Message, playerData: any, registrationState:RegistrationState): Promise<void> {
    const tutorialEmbed = new EmbedBuilder()
      .setColor('#4A90E2')
      .setTitle('🎓 **Welcome to the Adventure!**')
      .setDescription(`Welcome, **${playerData.name}**! Your journey begins now.`)
      .addFields(
        {
          name: '🌟 **Tutorial Available**',
          value: 'Would you like to take a guided tour of your new world?',
          inline: false
        },
        {
          name: '🎯 **Your Starter**',
          value: `You received: **${playerData.collectionInv[0].name}**\nElement: ${playerData.collectionInv[0].element}`,
          inline: true
        },
        {
          name: '💰 **Starting Resources**',
          value: `**Coins:** ${playerData.balance.coins}\n**Gems:** ${playerData.balance.gems}\n**Scrolls:** ${playerData.inventory.tokens.commonScroll}`,
          inline: true
        }
      )
      .setFooter({ text: 'Choose your path wisely!' })
      .setTimestamp();

    const tutorialButtons = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('tutorial_accept')
          .setLabel('🎓 Start Tutorial')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('tutorial_maybe')
          .setLabel('🤔 Maybe Later')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('tutorial_decline')
          .setLabel('❌ Skip Tutorial')
          .setStyle(ButtonStyle.Danger)
      );

    const sentMessage = await (message.channel as TextChannel).send({
      embeds: [tutorialEmbed],
      components: [tutorialButtons],
    });

    const filter = (i: Interaction) => {
      return i.isButton() && 
             i.customId.startsWith('tutorial_') && 
             i.user.id === message.author.id;
    };

    const collector = sentMessage.createMessageComponentCollector({
      filter,
      time: 300000, // 5 minutes
    });

    collector.on('collect', async (interaction: ButtonInteraction) => {
      try {
        await interaction.deferUpdate();

        switch (interaction.customId) {
          case 'tutorial_accept':
            registrationState.tutorialState.set(message.author.id, 'accepted');
            const acceptEmbed = new EmbedBuilder()
              .setColor('#00FF00')
              .setTitle('🎉 **Tutorial Starting!**')
              .setDescription('Excellent choice! Let\'s begin your adventure...')
              .setFooter({ text: 'Tutorial will begin shortly' });
            
            await interaction.followUp({ embeds: [acceptEmbed], ephemeral: false });
            await sentMessage.delete();
            
            // Start tutorial
            const tutorial = new Tutorial(playerData, "Adventure Tutorial", message);
            tutorial.initiateTutorial();
            break;

          case 'tutorial_maybe':
            registrationState.tutorialState.set(message.author.id, 'pending');
            const maybeEmbed = new EmbedBuilder()
              .setColor('#FFA500')
              .setTitle('📝 **Registration Complete**')
              .setDescription('You can start the tutorial anytime with `!tutorial`')
              .addFields({
                name: '🚀 **Quick Start Commands**',
                value: '`!profile` - View your character\n`!collection` - See your familiars\n`!help` - Get command help'
              });
            
            await interaction.followUp({ embeds: [maybeEmbed], ephemeral: false });
            await sentMessage.delete();
            break;

          case 'tutorial_decline':
            registrationState.tutorialState.set(message.author.id, 'denied');
            const declineEmbed = new EmbedBuilder()
              .setColor('#FF6B6B')
              .setTitle('⚡ **Ready for Adventure!**')
              .setDescription('You\'re all set! Jump right into the action.')
              .addFields({
                name: '🎮 **Get Started**',
                value: 'Use `!help` to explore available commands\nYour adventure awaits!'
              });
            
            await interaction.followUp({ embeds: [declineEmbed], ephemeral: false });
            await sentMessage.delete();
            break;
        }
      } catch (error) {
        console.error('Tutorial interaction error:', error);
        await interaction.followUp({ 
          content: '❌ Something went wrong with the tutorial selection.', 
          ephemeral: true 
        });
      }
    });

    collector.on('end', async () => {
      if (sentMessage.deletable) {
        try {
          // Disable buttons if message still exists
          const disabledButtons = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
              new ButtonBuilder()
                .setCustomId('tutorial_accept')
                .setLabel('🎓 Start Tutorial')
                .setStyle(ButtonStyle.Success)
                .setDisabled(true),
              new ButtonBuilder()
                .setCustomId('tutorial_maybe')
                .setLabel('🤔 Maybe Later')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
              new ButtonBuilder()
                .setCustomId('tutorial_decline')
                .setLabel('❌ Skip Tutorial')
                .setStyle(ButtonStyle.Danger)
                .setDisabled(true)
            );

          await sentMessage.edit({ components: [disabledButtons] });
        } catch (error) {
          console.log('Could not update tutorial message buttons');
        }
      }
    });
  }
}