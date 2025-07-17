// commands/pvp.ts
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Message,
  StringSelectMenuBuilder,
  TextChannel,
  User,
} from "discord.js";
import { Command } from "../../@types/command";
import { ExtendedClient } from "../..";
import { mongoClient } from "../../data/mongo/mongo";
import Battle, { BattleMode } from "../adv/action/battle/battle";

const db = mongoClient.db("Akaimnky");
const collection = db.collection("akaillection");

const pvpCommand: Command = {
  name: "pvp",
  description: "Challenge another player to a PvP battle",
  aliases: ["duel", "fight"],
  cooldown: 10,
  async execute(
    client: ExtendedClient,
    message: Message,
    args: string[]
  ): Promise<void> {
    try {
      // Validate arguments
      if (args.length === 0) {
        await (message.channel as TextChannel).send({
          content: "❌ Please mention a player or provide their user ID!\nUsage: `!pvp <@user>` or `!pvp <userId>`"
        });
        return;
      }

      // Parse target user ID
      const targetUserId = parseUserId(args[0]);
      if (!targetUserId) {
        await (message.channel as TextChannel).send({
          content: "❌ Invalid user mention or ID format!"
        });
        return;
      }

      // Prevent self-challenge
      if (targetUserId === message.author.id) {
        await (message.channel as TextChannel).send({
          content: "❌ You cannot challenge yourself to a PvP battle!"
        });
        return;
      }

      // Fetch both players' data
const [player1Data, player2Data] = await Promise.all([
  collection.findOne({ _id: message.author.id } as any),
  collection.findOne({ _id: targetUserId } as any)
]);


      // Validate player 1 exists
      if (!player1Data) {
        await (message.channel as TextChannel).send({
          content: "❌ You need to create a character first! Use `!start` to begin your adventure."
        });
        return;
      }

      // Validate player 2 exists
      if (!player2Data) {
        await (message.channel as TextChannel).send({
          content: "❌ The challenged player doesn't have a character! They need to use `!start` first."
        });
        return;
      }

      // Validate both players have required data
      const player1Validation = validatePlayerData(player1Data, message.author.username);
      const player2Validation = validatePlayerData(player2Data, "Opponent");

      if (!player1Validation.valid) {
        await (message.channel as TextChannel).send({
          content: `❌ ${player1Validation.error}`
        });
        return;
      }

      if (!player2Validation.valid) {
        await (message.channel as TextChannel).send({
          content: `❌ Opponent ${player2Validation.error}`
        });
        return;
      }

      // Get target user object
      let targetUser: User;
      try {
        targetUser = await client.users.fetch(targetUserId);
      } catch (error) {
        await (message.channel as TextChannel).send({
          content: "❌ Could not find the target user. Please check the user ID."
        });
        return;
      }

      // Create PvP challenge embed
      const challengeEmbed = await createPvPChallengeEmbed(
        message.author,
        targetUser,
        player1Data,
        player2Data
      );

      // Create interaction components
      const components = createPvPComponents();

      // Send challenge message
      const challengeMessage = await (message.channel as TextChannel).send({
        content: `<@${targetUserId}> You have been challenged to a PvP battle!`,
        embeds: [challengeEmbed],
        components: components
      });

      // Set up interaction collector
      const collector = challengeMessage.createMessageComponentCollector({
        time: 300000, // 5 minutes
      });

      collector.on("collect", async (interaction) => {
        try {
          // Only allow the challenged player or challenger to respond
          if (interaction.user.id !== targetUserId && interaction.user.id !== message.author.id) {
            await interaction.reply({
              content: "❌ This PvP challenge is not for you!",
              ephemeral: true
            });
            return;
          }

          if (interaction.customId === "pvp_accept") {
            // Only the challenged player can accept
            if (interaction.user.id !== targetUserId) {
              await interaction.reply({
                content: "❌ Only the challenged player can accept the battle!",
                ephemeral: true
              });
              return;
            }

            await interaction.deferUpdate();
            collector.stop("accepted");

            // Start PvP battle
            await startPvPBattle(
              message,
              player1Data,
              player2Data,
              'pvp_realtime',
              challengeMessage
            );

          } else if (interaction.customId === "pvp_accept_afk") {
            // Only the challenged player can accept AFK
            if (interaction.user.id !== targetUserId) {
              await interaction.reply({
                content: "❌ Only the challenged player can accept the battle!",
                ephemeral: true
              });
              return;
            }

            await interaction.deferUpdate();
            collector.stop("accepted_afk");

            // Start AFK PvP battle
            await startPvPBattle(
              message,
              player1Data,
              player2Data,
              'pvp_afk',
              challengeMessage
            );

          } else if (interaction.customId === "pvp_decline") {
            // Only the challenged player can decline
            if (interaction.user.id !== targetUserId) {
              await interaction.reply({
                content: "❌ Only the challenged player can decline the battle!",
                ephemeral: true
              });
              return;
            }

            await interaction.deferUpdate();
            collector.stop("declined");

            await challengeMessage.edit({
              content: `❌ ${targetUser.username} declined the PvP challenge.`,
              embeds: [],
              components: []
            });

          } else if (interaction.customId === "pvp_cancel") {
            // Only the challenger can cancel
            if (interaction.user.id !== message.author.id) {
              await interaction.reply({
                content: "❌ Only the challenger can cancel the battle!",
                ephemeral: true
              });
              return;
            }

            await interaction.deferUpdate();
            collector.stop("cancelled");

            await challengeMessage.edit({
              content: `❌ ${message.author.username} cancelled the PvP challenge.`,
              embeds: [],
              components: []
            });
          }
        } catch (error) {
          console.error("Error handling PvP interaction:", error);
          await interaction.followUp({
            content: "❌ An error occurred while processing your response.",
            ephemeral: true
          });
        }
      });

      collector.on("end", async (collected, reason) => {
        if (reason === "time") {
          await challengeMessage.edit({
            content: "⏰ PvP challenge timed out.",
            embeds: [],
            components: []
          });
        }
      });

    } catch (error) {
      console.error("Error in PvP command:", error);
      await (message.channel as TextChannel).send({
        content: "❌ An error occurred while setting up the PvP challenge. Please try again."
      });
    }
  },
};

// Helper function to parse user ID from mention or plain ID
function parseUserId(input: string): string | null {
  // Handle mention format: <@!123456789> or <@123456789>
  const mentionMatch = input.match(/^<@!?(\d+)>$/);
  if (mentionMatch) {
    return mentionMatch[1];
  }

  // Handle plain ID format
  if (/^\d+$/.test(input)) {
    return input;
  }

  return null;
}

// Helper function to validate player data
function validatePlayerData(playerData: any, playerName: string): { valid: boolean; error?: string } {
  if (!playerData.class) {
    return {
      valid: false,
      error: `${playerName} needs to select a class first! Use \`!selectclass\``
    };
  }

  if (!playerData.race) {
    return {
      valid: false,
      error: `${playerName} needs to select a race first! Use \`!selectrace\``
    };
  }

  if (!playerData.deck || playerData.deck.length === 0) {
    return {
      valid: false,
      error: `${playerName} needs to set up a deck first! Use \`!deck\``
    };
  }

  if (!playerData.stats || !playerData.stats.hp) {
    return {
      valid: false,
      error: `${playerName} has invalid character stats! Please contact an administrator.`
    };
  }

  return { valid: true };
}

// Helper function to create PvP challenge embed
async function createPvPChallengeEmbed(
  challenger: User,
  target: User,
  player1Data: any,
  player2Data: any
): Promise<EmbedBuilder> {
  const embed = new EmbedBuilder()
    .setTitle("⚔️ PvP Battle Challenge!")
    .setColor(0xff6b6b)
    .setThumbnail("https://cdn.discordapp.com/emojis/749363718320799936.png") // Optional: battle icon
    .addFields(
      {
        name: "🏹 Challenger",
        value: `**${challenger.username}**\nLevel: ${player1Data.exp?.level || 1}\nClass: ${player1Data.class || "None"}\nRace: ${player1Data.race || "None"}`,
        inline: true
      },
      {
        name: "🛡️ Challenged",
        value: `**${target.username}**\nLevel: ${player2Data.exp?.level || 1}\nClass: ${player2Data.class || "None"}\nRace: ${player2Data.race || "None"}`,
        inline: true
      },
      {
        name: "⚡ Battle Options",
        value: `**Real-time PvP**: Both players take turns actively\n**AFK Mode**: ${target.username} will be controlled by AI\n\nChoose your response below!`,
        inline: false
      }
    )
    .setFooter({ text: "Challenge expires in 5 minutes" })
    .setTimestamp();

  return embed;
}

// Helper function to create PvP interaction components
function createPvPComponents(): ActionRowBuilder<ButtonBuilder>[] {
  const acceptButton = new ButtonBuilder()
    .setCustomId("pvp_accept")
    .setLabel("⚔️ Accept (Real-time)")
    .setStyle(ButtonStyle.Success);

  const acceptAFKButton = new ButtonBuilder()
    .setCustomId("pvp_accept_afk")
    .setLabel("🤖 Accept (AFK Mode)")
    .setStyle(ButtonStyle.Primary);

  const declineButton = new ButtonBuilder()
    .setCustomId("pvp_decline")
    .setLabel("❌ Decline")
    .setStyle(ButtonStyle.Danger);

  const cancelButton = new ButtonBuilder()
    .setCustomId("pvp_cancel")
    .setLabel("🚫 Cancel")
    .setStyle(ButtonStyle.Secondary);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    acceptButton,
    acceptAFKButton,
    declineButton,
    cancelButton
  );

  return [row];
}

// Helper function to start PvP battle
// Helper function to start PvP battle - FIXED: Remove intermediate embed
async function startPvPBattle(
  message: Message,
  player1Data: any,
  player2Data: any,
  mode: BattleMode,
  challengeMessage: Message
): Promise<void> {
  try {
    // ✅ FIXED: Delete challenge message and go directly to battle
    await challengeMessage.delete();

    // ✅ FIXED: Start battle immediately without intermediate message
    const pvpBattle = new Battle(
      player1Data,    // Player 1 (challenger)
      player2Data,    // Player 2 (opponent)
      message,        // Discord message
      null,          // No scenario for PvP
      mode           // PvP mode (realtime or afk)
    );

    // Start the battle directly
    await pvpBattle.startEmbed();

  } catch (error) {
    console.error("Error starting PvP battle:", error);
    
    // Only show error if something goes wrong
    await (message.channel as TextChannel).send({
      content: "❌ Failed to start PvP battle. Please try again."
    });
  }
}


export default pvpCommand;
