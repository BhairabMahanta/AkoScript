import {
  Client,
  Message,
  EmbedBuilder,
  ButtonInteraction,
  ButtonBuilder,
  ActionRowBuilder,
  TextChannel,
  Embed,
  ButtonStyle,
  StringSelectMenuInteraction,
  Interaction,
} from "discord.js";
import { mongoClient } from "../../data/mongo/mongo";
import mongoose from "mongoose";
import { PlayerModal, playerModel } from "../../data/mongo/playerschema"; // Adjust the path to match your schema file location
import { Tutorial } from "./tutorial.js";
import * as fs from "fs";
import players from "../../data/players.json";
import { locations } from "../../data/locations";
import allFamiliars from "../../data/information/allfamiliars";
import { ExtendedClient } from "../..";
import { Command } from "../../@types/command";
import { capitalizeFirstLetter } from "./glogic";
import { addScenario } from "../player/scenarioUpdate/scenarioFunctions";
import { interfaceScenario } from "../../data/mongo/scenarioInterface";
const db = mongoClient.db("Akaimnky");
const scenarioCollection: any = db.collection("scenarioData");

const collectionName = "akaillection";
const story = require("./story.json"); // Load the story from the JSON file

let startedTutorial: string[] = ["a"];
let deniedTutorial: string[] = [];
let collectionCounter = 0; // Initialize the collection counter
// import { client } from "../../index";

const registerCommand: Command = {
  name: "register",
  description: "Lets begin",
  aliases: ["reg", "r"],
  cooldown: 5,
  async execute(
    client: ExtendedClient,
    message: Message<boolean>,
    args: string[]
  ): Promise<void> {
    let player = await PlayerModal.findOne({ _id: message.author.id });
    if (player) {
      // If the player already exists, return a message indicating that they are already registered
      (message.channel as TextChannel).send("You are already registered");
      return;
    }

    if (!startedTutorial.includes(message.author.id)) {
      if (!args[0] || args[0].length > 20 || args[0].length < 3) {
        // Check character name validity
        const registerErrorEmbed = new EmbedBuilder()
          .setColor(0x992e22)
          .setDescription(
            "Provide a valid character name. (The name should be 3 < length < 20 characters)"
          );
        (message.channel as TextChannel).send({
          embeds: [registerErrorEmbed],
        });
        return;
      }
    }

    const characterName = capitalizeFirstLetter(args[0]);

    console.log("characterName:", characterName);

    // Check if the character name already exists
    const existingCharacter = PlayerModal.find(
      (player: any) => player.name.toLowerCase() === characterName.toLowerCase()
    );

    console.log("started:", startedTutorial);
    if (
      (await existingCharacter) &&
      !startedTutorial.includes(message.author.id)
    ) {
      const existingNameErrorEmbed = new EmbedBuilder()
        .setColor(0x992e22)
        .setDescription(
          "A character with the same name already exists. Inform them?"
        )
        .addFields(
          { name: "🇦", value: "You'll regret taking my name.", inline: false },
          { name: "🇧", value: "you're kinda fucked", inline: false },
          { name: "🇨", value: "It's fine I guess", inline: false },
          { name: "🇩", value: "Oh the name is all yours", inline: false }
        );
      (message.channel as TextChannel).send({
        embeds: [existingNameErrorEmbed],
      });
      return;
    }

    function getRandomCard() {
      const tier1Familiars = Object.keys(allFamiliars.Tier1);
      const randomFamiliarName =
        tier1Familiars[Math.floor(Math.random() * tier1Familiars.length)];
      const randomFamiliar = (allFamiliars as any).Tier1[randomFamiliarName];
      return { name: randomFamiliarName, card: randomFamiliar };
    }

    const randomCardData = getRandomCard();
    const randomCard = randomCardData.name;
    const randomCardName = {
      name: randomCard,
      serialId: 1,
      tier: randomCardData.card.tier,
    };
    console.log("randomCard:", randomCardName);

    const randomCardStats = randomCardData.card.stats;
    const randomCardExperience = randomCardData.card.experience;
    const randomCardMoves = randomCardData.card.moves;
    const playerId = message.author.id;
    // If the player does not exist, create a new player document

    const playerData2 = new PlayerModal({
      _id: playerId,
      name: characterName,
      location: locations[0],
      inventory: {
        active: [],
        backpack: [],
        tokens: {
          commonScroll: 2,
          rareScroll: 0,
          legendaryScroll: 0,
        },
      },
      stats: {
        attack: 100,
        magic: 100,
        defense: 100,
        magicDefense: 90,
        speed: 110,
        evolution: 1,
        hp: 2000,
        luck: 1,
        divinePower: 0,
        potential: 1,
        critRate: 15,
        critDamage: 50,
      },
      balance: { coins: 0, gems: 0 },
      exp: { xp: 0, level: 0 },
      cards: { name: [randomCard] },
      class: "Knight",
      race: "Human",
      stuff: {
        generatedRandomElements: false,
        generatedRandomElements2: false,
      },
      playerpos: { x: 100, y: 50 },
      collectionInv: [
        {
          serialId: `${collectionCounter + 1}`,
          globalId: `${Math.floor(Math.random() * 1000000)}`,
          name: randomCard,
          element: randomCardData.card.element,
          stats: {
            level: randomCardExperience.level,
            xp: randomCardExperience.current,
            attack: randomCardStats.attack,
            defense: randomCardStats.defense,
            speed: randomCardStats.speed,
            hp: randomCardStats.hp,
            tier: randomCardData.card.tier,
            evolution: 0,
            critRate:
              randomCardStats.critRate !== undefined
                ? randomCardStats.critRate
                : 0, // Set default if undefined
            critDamage:
              randomCardStats.critDamage !== undefined
                ? randomCardStats.critDamage
                : 0, // Set default if undefined
            magic: randomCardStats.magic || 0,
            magicDefense: randomCardStats.magicDefense || 0,
            divinePower: randomCardStats.divinePower || 0,
          },
          ability: randomCardData.card.ability,
          moves: randomCardMoves,
        },
      ],
      deck: [
        {
          slot: 1,
          serialId: `${collectionCounter + 1}`,
          globalId: `${Math.floor(Math.random() * 1000000)}`,
          name: randomCard,
        },
        {
          slot: 2,
          serialId: "player",
          globalId: message.author.id,
          name: characterName,
        },
        { slot: 3, serialId: "empty", globalId: "empty", name: "empty" },
        { slot: 4, serialId: "empty", globalId: "empty", name: "empty" },
      ],
      dungeonDeck: [
        {
          slot: 1,
          serialId: `${collectionCounter + 1}`,
          globalId: `${Math.floor(Math.random() * 1000000)}`,
          name: randomCard,
        },
        {
          slot: 2,
          serialId: "player",
          globalId: message.author.id,
          name: characterName,
        },
        { slot: 3, serialId: "empty", globalId: "empty", name: "empty" },
        { slot: 4, serialId: "empty", globalId: "empty", name: "empty" },
        { slot: 5, serialId: "empty", globalId: "empty", name: "empty" },
        { slot: 6, serialId: "empty", globalId: "empty", name: "empty" },
      ],
      selectedFamiliars: {
        name: [randomCardName],
      },
      quests: [],
      activeQuests: {},
    });
    playerData2.gainExperience(50);

    playerData2.gainItems(["Sword", "Shield"]);

    // Save the player data to the database
    try {
      if (!player) {
        await playerData2.save();
        console.log("saved player data");
      }
    } catch (error) {
      console.error("Error saving player data:", error);
    }
    const forestRegion: interfaceScenario = {
      id: "forest-region",
      name: "Forest Region",
      selected: true,
      number: 1, // Scenario number
      difficulties: ["Easy", "Normal", "Hard"],
      claimedReward: false,
      floors: [
        {
          floorNumber: 1,
          miniboss: false,
          boss: false,
          cleared: false,
          rewarded: false,
        },
      ],
    };

    // Add the "Forest Region" scenario
    await addScenario(playerData2.id, forestRegion);
    const wantTutorial = new EmbedBuilder()
      .setColor("DarkBlue")
      .setDescription(
        "Do you wish to proceed with a small tutorial? It is honestly quite unique af, just trust me."
      )
      .addFields(
        { name: "🇦", value: "Sus, but Sure!.", inline: false },
        { name: "🇧", value: "Eh? Okay.", inline: false },
        {
          name: "🇨",
          value: "You seem.... Stinky, I refuse to.",
          inline: false,
        }
      );

    const tutSelectA = new ButtonBuilder() // Add a new button for selecting
      .setCustomId("select_buttonA")
      .setLabel("🇦")
      .setStyle(ButtonStyle.Success);
    const tutSelectB = new ButtonBuilder() // Add a new button for selecting
      .setCustomId("select_buttonB")
      .setLabel("🇧")
      .setStyle(ButtonStyle.Success);
    const tutSelectC = new ButtonBuilder() // Add a new button for selecting
      .setCustomId("select_buttonC")
      .setLabel("🇨")
      .setStyle(ButtonStyle.Primary);
    const tutRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      tutSelectA,
      tutSelectB,
      tutSelectC // Add the new "Select" button
    );

    const sentMessage = await (message.channel as TextChannel).send({
      embeds: [wantTutorial],
      components: [tutRow],
    });

    const filter = (i: Interaction) => {
      // Check if the interaction is either a ButtonInteraction or a StringSelectMenuInteraction
      if (i.isButton()) {
        return (
          (i.customId.startsWith("select_button") ||
            i.customId === "select_button") &&
          i.user.id === message.author.id
        );
      }
      return false; // Return false for other interaction types
    };

    // Create the collector using the filter
    const collector = sentMessage.createMessageComponentCollector({
      filter,
      time: 300000, // Duration of the collector
    });

    collector.on("collect", async (interaction: ButtonInteraction) => {
      await interaction.deferUpdate(); // Acknowledge the button click
      console.log("collecting");
      if (interaction.customId === "select_buttonA") {
        startedTutorial.push(message.author.id);
        const tutorialEmbed = new EmbedBuilder()
          .setColor(0x22bb33)
          .setDescription("Welcome to the tutorial!");
        await interaction.followUp({ embeds: [tutorialEmbed] });
        const tutorial = new Tutorial(playerData2, "My Tutorial", message);
        sentMessage.delete();
        tutorial.initiateTutorial();
        // await interaction.followUp({ content: tutorialMessage });
      } else if (interaction.customId === "select_buttonB") {
        deniedTutorial.push(message.author.id);
        const deniedEmbed = new EmbedBuilder()
          .setColor(0x992e22)
          .setDescription("Alright! No tutorial for you!");
        await interaction.followUp({ embeds: [deniedEmbed] });
      } else if (interaction.customId === "select_buttonC") {
        const stinkEmbed = new EmbedBuilder()
          .setColor(0x992e22)
          .setDescription("I'm just trying to help. You'll be missing out.");
        await interaction.followUp({ embeds: [stinkEmbed] });
      }
    });
  },
};
export default registerCommand;
