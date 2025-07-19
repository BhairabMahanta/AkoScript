import {
  Client,
  Message,
  EmbedBuilder,
  ButtonInteraction,
  ButtonBuilder,
  ActionRowBuilder,
  TextChannel,
  ButtonStyle,
  Interaction,
} from "discord.js";
import { mongoClient } from "../../data/mongo/mongo";
import mongoose from "mongoose";
import { PlayerModal, playerModel, IdGenerator } from "../../data/mongo/playerschema";
import { Tutorial } from "./tutorial.js";
import { locations } from "../../data/locations";
import allFamiliars from "../../data/information/allfamiliars";
import { ExtendedClient } from "../..";
import { Command } from "../../@types/command";
import { capitalizeFirstLetter } from "./glogic";
import { addScenario } from "../player/scenarioUpdate/scenarioFunctions";
import { interfaceScenario } from "../../data/mongo/scenarioInterface";
import { TutorialManager } from "./tutorialManager";

const db = mongoClient.db("Akaimnky");
const scenarioCollection: any = db.collection("scenarioData");
const collectionName = "akaillection";

// Player Registration State Management
export interface RegistrationState {
  tutorialState: Map<string, 'pending' | 'accepted' | 'denied'>;
  registrationAttempts: Map<string, number>;
}

const registrationState: RegistrationState = {
  tutorialState: new Map(),
  registrationAttempts: new Map()
};

// Validation functions
class RegistrationValidator {
  static validateCharacterName(name: string): { isValid: boolean; error?: string; name?: string } {
    if (!name) {
      return { isValid: false, error: "Please provide a character name." };
    }
    
    if (name.length < 3) {
      return { isValid: false, error: "Character name must be at least 3 characters long." };
    }
    
    if (name.length > 20) {
      return { isValid: false, error: "Character name must be no more than 20 characters long." };
    }
    
    // Check for invalid characters
    const validNameRegex = /^[a-zA-Z0-9_\- ]+$/;
    if (!validNameRegex.test(name)) {
      return { isValid: false, error: "Character name can only contain letters, numbers, spaces, hyphens, and underscores." };
    }
    
    return { isValid: true, name: capitalizeFirstLetter(name.trim()) };
  }

  static async checkNameAvailability(name: string): Promise<{ isAvailable: boolean; error?: string }> {
    try {
      // Now TypeScript recognizes the findByName method
      const existingPlayer = await PlayerModal.findByName(name);
      if (existingPlayer) {
        return { isAvailable: false, error: "A character with this name already exists." };
      }
      return { isAvailable: true };
    } catch (error) {
      console.error('Error checking name availability:', error);
      return { isAvailable: false, error: "Unable to verify name availability. Please try again." };
    }
  }

  static checkRegistrationAttempts(userId: string): { canRegister: boolean; error?: string } {
    const attempts = registrationState.registrationAttempts.get(userId) || 0;
    if (attempts >= 3) {
      return { canRegister: false, error: "Too many registration attempts. Please wait before trying again." };
    }
    return { canRegister: true };
  }
}




class CharacterCreator  {

static getRandomStarterFamiliar() {
    const tier1Familiars = Object.keys(allFamiliars.Tier1);
    const randomFamiliarName = tier1Familiars[Math.floor(Math.random() * tier1Familiars.length)];
    const randomFamiliar = (allFamiliars as any).Tier1[randomFamiliarName];
    return { name: randomFamiliarName, data: randomFamiliar };
  }

  static async createPlayerData(userId: string, characterName: string) {
    const starterFamiliar = this.getRandomStarterFamiliar();
    const familiarSerialId = "1"
    const familiarGlobalId = IdGenerator.generateUniqueGlobalId();
    
    // Create collection item for starter familiar
    const collectionItem = {
      serialId: familiarSerialId,
      globalId: familiarGlobalId,
      name: starterFamiliar.name,
      element: starterFamiliar.data.element,
      stats: {
        level: starterFamiliar.data.experience.level,
        xp: starterFamiliar.data.experience.current,
        attack: starterFamiliar.data.stats.attack,
        defense: starterFamiliar.data.stats.defense,
        speed: starterFamiliar.data.stats.speed,
        hp: starterFamiliar.data.stats.hp,
        tier: starterFamiliar.data.tier,
        evolution: 0,
        critRate: starterFamiliar.data.stats.critRate || 0,
        critDamage: starterFamiliar.data.stats.critDamage || 0,
        magic: starterFamiliar.data.stats.magic || 0,
        magicDefense: starterFamiliar.data.stats.magicDefense || 0,
        divinePower: starterFamiliar.data.stats.divinePower || 0,
      },
      ability: starterFamiliar.data.ability || [],
      moves: starterFamiliar.data.moves || [],
    };

    // Create player data
    const playerData = new PlayerModal({
      _id: userId,
      name: characterName,
      location: locations[0] || "Starting Area",
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
        hp: 2000,
        luck: 1,
        divinePower: 0,
        potential: 1,
        critRate: 15,
        critDamage: 50,
      },
      balance: { coins: 100, gems: 10 },
      exp: { xp: 0, level: 1 },
      cards: { name: [starterFamiliar.name] },
      class: "Knight",
      race: "Human",
      stuff: {
        generatedRandomElements: false,
        generatedRandomElements2: false,
      },
      playerpos: { x: 100, y: 50 },
      collectionInv: [collectionItem],
      deck: [
        {
          slot: 1,
          serialId: familiarSerialId,
          globalId: familiarGlobalId,
          name: starterFamiliar.name,
        },
        {
          slot: 2,
          serialId: "player",
          globalId: userId,
          name: characterName,
        },
        { slot: 3, serialId: "empty", globalId: "empty", name: "empty" },
        { slot: 4, serialId: "empty", globalId: "empty", name: "empty" },
      ],
      dungeonDeck: [
        {
          slot: 1,
          serialId: familiarSerialId,
          globalId: familiarGlobalId,
          name: starterFamiliar.name,
        },
        {
          slot: 2,
          serialId: "player",
          globalId: userId,
          name: characterName,
        },
        { slot: 3, serialId: "empty", globalId: "empty", name: "empty" },
        { slot: 4, serialId: "empty", globalId: "empty", name: "empty" },
        { slot: 5, serialId: "empty", globalId: "empty", name: "empty" },
        { slot: 6, serialId: "empty", globalId: "empty", name: "empty" },
      ],
      selectedFamiliars: {
        name: [{
          name: starterFamiliar.name,
          serialId: familiarSerialId,
          tier: starterFamiliar.data.tier,
        }],
      },
      quests: [],
      activeQuests: new Map(),
 // ✅ In CharacterCreator.createPlayerData()
arena: {
  rating: 1000,
  rank: 'Bronze',
  totalWins: 0,
  totalLosses: 0,
  defenseWins: 0,
  defenseLosses: 0,
  attacksToday: 0,
  defenseDeck: [], // ✅ Empty deck initially, player sets it later
  recentOpponents: [],
  lastBattleAt: new Date(),
  inBattle: false,
  seasonStats: {
    seasonId: IdGenerator.generateArenaSeasonId(),
    startRating: 1000,
    highestRating: 1000,
    battlesWon: 0,
    battlesLost: 0
  },
  isInitialized: false,
  maxRating: 1000
}

    });

    return { playerData, starterFamiliar };
  }
}

const registerCommand: Command = {
  name: "register",
  description: "Create your character and begin your adventure",
  aliases: ["reg", "create"],
  cooldown: 10,
  async execute(
    client: ExtendedClient,
    message: Message<boolean>,
    args: string[]
  ): Promise<void> {
    const userId = message.author.id;

    try {
      // Check if already registered
      const existingPlayer = await PlayerModal.findById(userId);
      if (existingPlayer) {
        const alreadyRegisteredEmbed = new EmbedBuilder()
          .setColor('#FFA500')
          .setTitle('⚠️ **Already Registered**')
          .setDescription(`Welcome back, **${existingPlayer.name}**!`)
          .addFields({
            name: '📊 **Your Stats**',
            value: `**Level:** ${existingPlayer.exp.level}\n**Rating:** ${existingPlayer.arena.rating}\n**Location:** ${existingPlayer.location}`
          })
          .setFooter({ text: 'Use !profile to see your full character info' });

        await (message.channel as TextChannel).send({ embeds: [alreadyRegisteredEmbed] });
        return;
      }

      // Check registration attempts
      const attemptCheck = RegistrationValidator.checkRegistrationAttempts(userId);
      if (!attemptCheck.canRegister) {
        const errorEmbed = new EmbedBuilder()
          .setColor('#FF0000')
          .setDescription(`❌ ${attemptCheck.error}`);
        await (message.channel as TextChannel).send({ embeds: [errorEmbed] });
        return;
      }

      // Validate character name
      const nameValidation = RegistrationValidator.validateCharacterName(args[0]);
      if (!nameValidation.isValid) {
        // Increment registration attempts
        const attempts = registrationState.registrationAttempts.get(userId) || 0;
        registrationState.registrationAttempts.set(userId, attempts + 1);

        const errorEmbed = new EmbedBuilder()
          .setColor('#FF0000')
          .setTitle('❌ **Invalid Character Name**')
          .setDescription(nameValidation.error!)
          .addFields({
            name: '📝 **Name Requirements**',
            value: '• 3-20 characters long\n• Letters, numbers, spaces, hyphens, underscores only\n• Cannot be blank'
          })
          .setFooter({ text: 'Example: !register MyHero' });

        await (message.channel as TextChannel).send({ embeds: [errorEmbed] });
        return;
      }

      // Check name availability
      const nameAvailability = await RegistrationValidator.checkNameAvailability(nameValidation.name!);
      if (!nameAvailability.isAvailable) {
        const errorEmbed = new EmbedBuilder()
          .setColor('#FF0000')
          .setTitle('❌ **Name Unavailable**')
          .setDescription(nameAvailability.error!)
          .addFields({
            name: '💡 **Suggestion**',
            value: 'Try adding numbers or modifying the name slightly'
          });

        await (message.channel as TextChannel).send({ embeds: [errorEmbed] });
        return;
      }

      // Create character
      console.log(`Creating character: ${nameValidation.name} for user: ${userId}`);
      const { playerData, starterFamiliar } = await CharacterCreator.createPlayerData(userId, nameValidation.name!);

      // Give starting experience and items
      playerData.gainExperience(50);
      playerData.gainItems(["Starter Sword", "Basic Shield"]);

      // Save player to database
      await playerData.save();
      console.log(`Successfully saved player: ${nameValidation.name}`);

      // Add scenario
      const forestRegion: interfaceScenario = {
        id: "forest-region",
        name: "Forest Region",
        selected: true,
        number: 1,
        difficulties: ["Easy", "Normal", "Hard"],
        claimedReward: false,
        floors: [{
          floorNumber: 1,
          miniboss: false,
          boss: false,
          cleared: false,
          rewarded: false,
        }],
      };

      await addScenario(userId, forestRegion);

      // Clear registration attempts on success
      registrationState.registrationAttempts.delete(userId);

      // Show tutorial options
      await TutorialManager.showTutorialOptions(message, playerData, registrationState);

    } catch (error) {
      console.error('Registration error:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('⚠️ **Registration Failed**')
        .setDescription('An error occurred during registration. Please try again.')
        .addFields({
          name: '🔧 **Troubleshooting**',
          value: '• Wait a moment and try again\n• Make sure your name follows the requirements\n• Contact support if the issue persists'
        })
        .setFooter({ text: 'If this continues, please contact an administrator' });

      await (message.channel as TextChannel).send({ embeds: [errorEmbed] });

      // Increment failed attempts
      const attempts = registrationState.registrationAttempts.get(userId) || 0;
      registrationState.registrationAttempts.set(userId, attempts + 1);
    }
  },
};

export default registerCommand;
 