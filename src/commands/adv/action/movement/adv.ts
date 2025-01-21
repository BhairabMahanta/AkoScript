import { Command } from "../../../../@types/command";
import { mongoClient } from "../../../../data/mongo/mongo";
import { TextChannel } from "discord.js";
import { handleAdventure } from "./advClass";
import { interfaceScenario } from "../../../../data/mongo/scenarioInterface";

const adventureCommand: Command = {
  name: "adventure",
  description: "Start an adventure!",
  aliases: ["a", "adv"],
  async execute(client, message, args): Promise<void> {
    const db = mongoClient.db("Akaimnky");
    const playerCollection: any = db.collection("akaillection");
    const scenarioCollection: any = db.collection("scenarioData");
    const dbFilter = { _id: message.author.id };

    const player = await playerCollection.findOne(dbFilter);
    if (!player) {
      (message.channel as TextChannel).send("You have to register first!");
      return;
    }

    const playerScenario = await scenarioCollection.findOne(dbFilter);
    console.log("playerScenario:", playerScenario);
    const selectedLocation = playerScenario.scenarios.find(
      (scenario: interfaceScenario) => scenario.selected === true
    );

    const isBossFloor = selectedLocation.floors.find(
      (floor: any) => floor.boss === true
    );
    if (!isBossFloor) {
      (message.channel as TextChannel).send(
        "You have not reached any boss floor and do not have saved data!"
      );
      return;
    }

    await handleAdventure(client, message, player, selectedLocation);
  },
};

export default adventureCommand;
