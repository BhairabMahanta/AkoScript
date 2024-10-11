import { Client, Message, TextChannel } from "discord.js";
import { sendMessage } from "../../utils/sendMessage";

export default {
  name: "safemode",
  description: "Activate safemode to disable all commands temporarily.",
  cooldown: 10, // Optional cooldown for the safemode command
  async execute(client: Client, message: Message, args: string[]) {
    const allowedUsers = ["537619455409127442"];
    const clienta = message.client;
    const specificGuildId = "782101934952677437";
    const specificChannelId = "984382901716148234";

    // Check if the user is allowed to activate safemode
    if (!allowedUsers.includes(message.author.id)) {
      return;
    }

    // If safemode is already active, return a message
    if ((clienta as any).safemode) {
      return message.reply("Safemode is already active.");
    }

    // Default duration of 5 minutes if no duration is provided
    const durationInMinutes = parseFloat(args[0]) || 5; // 5 minutes default
    const durationInMilliseconds = durationInMinutes * 60 * 1000; // Convert minutes to milliseconds

    // Activate safemode
    (clienta as any).safemode = true;

    // Notify in the specific channel
    const guild = clienta.guilds.cache.get(specificGuildId);
    const channel = guild?.channels.cache.get(specificChannelId);

    await sendMessage(
      channel as any,
      `⚠️ Safemode has been activated for ${durationInMinutes} minute(s). All commands are disabled.`
    );

    message.reply(
      `Safemode activated for ${durationInMinutes} minute(s). All commands are disabled.`
    );

    // Deactivate safemode after the specified duration
    setTimeout(async () => {
      (clienta as any).safemode = false;

      await sendMessage(
        channel as any,
        "✅ Safemode has been deactivated. Commands are now enabled."
      );

      (message.channel as any).send(
        "Safemode has been deactivated. Commands are now enabled."
      );
    }, durationInMilliseconds);
  },
};
