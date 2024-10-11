import { CommandInteraction, Interaction } from "discord.js";
import { mongoClient } from "../../data/mongo/mongo";
import { ExtendedClient } from "../..";

const db = mongoClient.db("Akaimnky");
const collection = db.collection("akaillection");

interface Command {
  execute: (interaction: CommandInteraction) => Promise<void>;
}

const interactionHandler = async (interaction: Interaction) => {
  if (!interaction.isCommand()) return;
  const client = interaction.client as ExtendedClient;
  const command = client.commands.get(interaction.commandName) as
    | Command
    | undefined;
  if (!command) return;

  try {
    if (interaction.commandName !== "register") {
      const user = await collection.findOne({ discordId: interaction.user.id });

      if (!user) {
        await interaction.reply({
          content: "Please run the `register` command to get started.",
          ephemeral: true,
        });
        return;
      }
    }

    await command.execute(interaction as CommandInteraction);
  } catch (error) {
    console.error("Error executing command:", error);
    await interaction.reply({
      content: "There was an error executing that command!",
      ephemeral: true,
    });
  }
};

export default interactionHandler;
