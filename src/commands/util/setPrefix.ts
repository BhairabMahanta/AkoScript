import { Command } from "../../@types/command";

// commands/system/setprefix.ts
const command: Command = {
  name: "setprefix",
  category: "System",
  description: "Change server prefix",
  permissions: ["ManageGuild"],
  async execute(client, message, args) {
    const newPrefix = args[0];
    await client.db.GuildSettings.updateOne(
      { guildId: message.guild!.id },
      { $set: { prefix: newPrefix } },
      { upsert: true }
    );
    message.reply(`Prefix updated to \`${newPrefix}\``);
  },
};
export default command;
