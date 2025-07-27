// src/gameLogic.ts
import {
  CommandInteraction,
  StringSelectMenuBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  StringSelectMenuOptionBuilder,
  TextChannel,
} from "discord.js";
import abilities from "../../data/abilities";
import { BuffDebuffLogic } from "../gamelogic/buffdebufflogic";
import { mongoClient } from "../../data/mongo/mongo";

import allFamiliars from "../../data/information/allfamiliars";
import { Cooldown } from "../adv/action/battle/managers/BattleStateManager";
const {
  calculateDamage,
  calculateCritDamage,
  calculateAbilityDamage,
} = require("../../../rust_lib/rust_lib.node");
// Type for a card's stats
interface CardStats {
  attack: number;
  defense: number;
  hp: number;
  [key: string]: any;
}

// Type for a move
interface Move {
  name: string;
  power: number;
  onCd: number;
  cooldown: number;
  [key: string]: any;
}

// Type for a quest
interface Quest {
  objectives: { current: number; required: number }[];
  timeLimit: { daysLeft: number };
  questStatus: string;
}
const Placeholder = Symbol("placeholder");

const buffDebuffLogic = new BuffDebuffLogic(Placeholder);

// Function to get the index of the maximum value among three

// Define base stats

function calculateDamageOld(
  authorAttack: number,
  opponentDefense: number
): number {
  return Math.floor(
    Math.pow(
      Math.sqrt(authorAttack),
      Math.pow(
        Math.sqrt(3),
        Math.sqrt((850 + authorAttack) / (450 + 1.26 * opponentDefense))
      )
    )
  );
}
const baseAttack = 1340;
const baseDefense = 50;
export function parseQuotedArgs(input: string): string[] {
  const args: string[] = [];
  let currentArg = "";
  let insideQuotes = false;
  let escapeNext = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (escapeNext) {
      currentArg += char;
      escapeNext = false;
      continue;
    }

    if (char === "\\") {
      escapeNext = true;
      continue;
    }

    if (char === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === " " && !insideQuotes) {
      if (currentArg) {
        args.push(currentArg);
        currentArg = "";
      }
      continue;
    }

    currentArg += char;
  }

  if (currentArg) {
    args.push(currentArg);
  }

  return args;
}

// Loop for incrementing attack
function runCalcDamageTest(): void {
  console.log("Incrementing Attack by 50:");
  for (let i = 1; i <= 2; i++) {
    const newAttack = baseAttack + i * 10;
    const newBaseDefense = 528;
    const damage = calculateDamage(newAttack, newBaseDefense);
    console.log(`New Attack: ${newAttack}, Damage: ${damage}`);
  }
  console.log("\nIncrementing Attack by 50 and Defense by 20:");
  for (let i = 1; i <= 90; i++) {
    const newAttack = baseAttack + i * 11;
    const newDefense = baseDefense + i * 5;
    const damage = calculateDamage(newAttack, newDefense);
    // console.log(
    //   `New Attack: ${newAttack}, New Defense: ${newDefense}, Damage: ${damage}`
    // );
  }
}

function calculateAbilityDamageOld(abilityPower: number): number {
  return Math.floor(abilityPower);
}

// Function to check the results of the duel
function checkResults(myhp: number[], ohp: number[]): number {
  const userLost = myhp.every((hp) => hp <= 0);
  const opponentLost = ohp.every((hp) => hp <= 0);

  if (userLost && opponentLost) {
    return 3; // Draw
  } else if (userLost) {
    return 2; // User loses
  } else if (opponentLost) {
    return 1; // Opponent loses
  } else {
    return 0; // Duel continues
  }
}

function getPlayerMoves(cardName: string): any | null {
  const card = abilities[cardName];
  if (card && card.description) {
    return card;
  }
  return null;
}
function getAbilities(abilityName: string): any | null {
  const ability = abilities[abilityName];
  if (ability && ability.description) {
    return ability;
  }
  return null;
}

// Function to update the cooldown of moves
function updateMovesOnCd(moves: Move[]): Move[] {
  moves.forEach((move) => {
    if (move.onCd !== 0) {
      move.onCd--;
    }
  });
  return moves;
}

// Handle turn effects
async function handleTurnEffects(turnEnder: any): Promise<void> {
  // Handle debuffs
  for (let i = turnEnder.statuses.debuffs.length - 1; i >= 0; i--) {
    const remainingTurns = turnEnder.statuses.debuffs[i].remainingTurns--;
    console.log("turnEnder1", turnEnder.name, remainingTurns);
    if (turnEnder.statuses.debuffs[i].remainingTurns <= 0) {
      console.log("turnEnde2r", turnEnder.name, turnEnder.statuses.debuffs[i]);
      buffDebuffLogic.overLogic(
        turnEnder,
        turnEnder.statuses.debuffs[i],
        i,
        true
      );
      console.log(`Debuff removed from ${turnEnder.name}`);
    }
  }

  // Handle buffs
  for (let i = turnEnder.statuses.buffs.length - 1; i >= 0; i--) {
    const remainingTurns = turnEnder.statuses.buffs[i].remainingTurns--;
    console.log("turnEnder1buff", turnEnder.name, remainingTurns);
    if (turnEnder.statuses.buffs[i].remainingTurns <= 0) {
      console.log(
        "turnEnde2rBuff",
        turnEnder.name,
        turnEnder.statuses.buffs[i]
      );
      buffDebuffLogic.overLogic(
        turnEnder,
        turnEnder.statuses.buffs[i],
        i,
        false
      );
      console.log(`Buff removed from ${turnEnder.name}`);
    }
  }
}

async function toCamelCase(str: string): Promise<string> {
  const words = str.split(" ");
  if (words.length === 1) {
    return words[0].toLowerCase();
  }
  if (words.length === 2) {
    return words[0].toLowerCase() + words[1];
  }
  return str
    .replace(/\s(.)/g, function (match, group1) {
      return group1.toUpperCase();
    })
    .replace(/\s/g, ""); // Remove remaining spaces
}

// Function to generate attack bar emoji
async function generateAttackBarEmoji(atkBar: number): Promise<string> {
  const emoji = "■";
  let emptyBars = 0;
  if (atkBar >= 100) atkBar = 100;
  const filledBars = Math.floor(atkBar / 10);
  emptyBars = 10 - filledBars;

  return `[${emoji.repeat(filledBars)}${"□".repeat(emptyBars)}]`;
}
// Generate HP bar emoji
async function generateHPBarEmoji(
  currentHP: number,
  maxHP: number
): Promise<string> {
  const emoji = "■";
  let filledBars = Math.floor((currentHP / maxHP) * 17);
  if (currentHP < 0) filledBars = 0;

  return `[${emoji.repeat(filledBars)}${"□".repeat(17 - filledBars)}]`;
}

// MongoDB setup
const db = mongoClient.db("Akaimnky");
const collection: any = db.collection("akaillection");
interface Objective {
  current: number | string; // You can refine this based on your actual data type
  required: number | string;
}
// Function to periodically check quest completion
async function checkQuestCompletion(): Promise<void> {
  const currentTime = Math.floor(Date.now() / 1000);
  const playersDb = await collection.find({}).toArray();

  playersDb.forEach(async (player: any) => {
    //fix any later cuz times are string not number
    const playerQuests = player.activeQuests;
    let questSuccess = false;
    let questFailure = false;

    for (const questId in playerQuests) {
      const quest = playerQuests[questId];
      const questList = player.quests;
      const timeLimit = quest.timeLimit.daysLeft;

      if (currentTime > timeLimit) {
        //here
        questFailure = true;
        quest.questStatus = "timeout";
        player.completedQuests[questId] = quest;
        delete playerQuests[questId];
        const questIndex = questList.indexOf(questId);
        if (questIndex !== -1) questList.splice(questIndex, 1);
        console.log(`Quest '${questId}' has failed for ${player.name}`);
      } else {
        const objectives: any = quest.objectives;
        const allObjectivesMet = objectives.every(
          (objective: Objective) =>
            Number(objective.current) >= Number(objective.required)
        );

        if (allObjectivesMet) {
          questSuccess = true;
          quest.questStatus = "completed";
          player.completedQuests[questId] = quest;
          delete playerQuests[questId];
          const questIndex = questList.indexOf(questId);
          if (questIndex !== -1) questList.splice(questIndex, 1);
          console.log(
            `Quest '${questId}' completed successfully for ${player.name}`
          );
        }
      }
    }

    if (questSuccess || questFailure) {
      await updatePlayer(player);
    }
  });
}

// Function to update player data
async function updatePlayer(player: any): Promise<void> {
  const query = { name: player.name };
  const update = { $set: player };
  await collection.updateOne(query, update);
  console.log(`Player ${player.name}'s data has been updated.`);
}

// Assuming these are your existing damage calculation functions.
// You may need to define their types as well if they don't already exist.

async function critOrNot(
  attackerCritRate: number | undefined,
  critDamage: number,
  authorAttack: number,
  enemyDefense: number,
  familiarPower: Promise<number | undefined> // Assuming familiarPower is a Promise
): Promise<number> {
  // Assuming the function returns a number
  const fomiliarPower = await familiarPower;
  const critChance = Math.random() * 100;

  if (attackerCritRate === undefined && fomiliarPower === undefined) {
    console.log("normal damage");
    return calculateDamage(authorAttack, enemyDefense);
  } else if (critChance <= (attackerCritRate ?? 0)) {
    // Handle undefined attackerCritRate
    console.log("crit damage");
    return fomiliarPower === undefined
      ? calculateCritDamage(authorAttack, critDamage, enemyDefense)
      : calculateAbilityDamage(
          authorAttack,
          critDamage,
          enemyDefense,
          fomiliarPower
        );
  } else {
    console.log("normal damage");
    return fomiliarPower === undefined
      ? calculateDamage(authorAttack, enemyDefense)
      : Math.floor(
          (calculateDamage(authorAttack, enemyDefense) * fomiliarPower) / 100
        );
  }
}

function capitalizeFirstLetter(string: string): string {
  if (string.length === 0) return string;
  return string.charAt(0).toUpperCase() + string.slice(1);
}
// Define the types for Gacha Types and Drop Rates
export const GACHA_TYPES = {
  COMMON_TOKEN: "COMMON_TOKEN",
  RARE_TOKEN: "RARE_TOKEN", 
  LEGENDARY_TOKEN: "LEGENDARY_TOKEN",
} as const;

// Define types for the drop rates
export interface DropRates {
  tier1: number;
  tier2: number;
  tier3: number;
}

// Define allFamiliars as an object where the keys are "Tier1", "Tier2", "Tier3"
interface AllFamiliars {
  [tier: string]: { [key: string]: any }; // 'any' can be replaced with the actual familiar type
}

// ✅ UPDATE: Use GACHA_TYPES keys instead of database field names
const DROP_RATES: Record<string, DropRates> = {
  [GACHA_TYPES.COMMON_TOKEN]: { tier1: 80, tier2: 18, tier3: 2 },
  [GACHA_TYPES.RARE_TOKEN]: { tier1: 50, tier2: 40, tier3: 10 },
  [GACHA_TYPES.LEGENDARY_TOKEN]: { tier1: 20, tier2: 50, tier3: 30 },
};

export async function pullGacha(
  playerId: string,
  gachaType: keyof typeof GACHA_TYPES
): Promise<any> {
  // ✅ Now this will work because DROP_RATES uses the same keys as GACHA_TYPES
  const rates = DROP_RATES[gachaType];
  
  // ✅ Add error checking for undefined rates
  if (!rates) {
    throw new Error(`Invalid gacha type: ${gachaType}. Available types: ${Object.keys(DROP_RATES).join(', ')}`);
  }

  // Get the tier based on the rates
  const tier = getTier(rates);
  const tierKey = `Tier${tier}` as keyof AllFamiliars;

  // ✅ Add error checking for missing tier data
  if (!allFamiliars[tierKey]) {
    throw new Error(`No familiars found for ${tierKey}`);
  }

  // Assuming allFamiliars is defined somewhere in your code
  const characters = Object.keys(allFamiliars[tierKey]);
  
  // ✅ Add error checking for empty character list
  if (characters.length === 0) {
    throw new Error(`No characters available in ${tierKey}`);
  }

  // Randomly select a character from the tier
  const selectedCharacter = characters[Math.floor(Math.random() * characters.length)];

  // Update the player's card collection in the database
  const filter = { _id: playerId };
  const update = { $addToSet: { "cards.name": selectedCharacter } };

  await collection.updateOne(filter, update);

  // ✅ Add the tier information to the returned character
  const characterData = allFamiliars[tierKey][selectedCharacter];
  return {
    ...characterData,
    tier: tier, // Ensure tier is included in the returned data
    name: selectedCharacter // Ensure name is included
  };
}

export function getTier(rates: DropRates): number {
  // ✅ Add error checking for undefined rates
  if (!rates || typeof rates.tier1 === 'undefined' || typeof rates.tier2 === 'undefined') {
    throw new Error('Invalid drop rates provided');
  }

  const rand = Math.random() * 100;
  if (rand < rates.tier1) return 1;
  if (rand < rates.tier1 + rates.tier2) return 2;
  return 3;
}

async function cycleCooldowns(cooldownArray: any[], currentCharacterName: string): Promise<void> {
  try {
    if (cooldownArray.length === 0) {
      console.log("No moves on cooldown");
      return;
    }

    // Only cycle cooldowns for the character whose turn just ended
    for (let i = cooldownArray.length - 1; i >= 0; i--) {
      const cooldown = cooldownArray[i];
      
      // Only reduce cooldown if it belongs to the character who just acted
      if (cooldown.characterName === currentCharacterName) {
        
        if (cooldown.cooldown > 0) {
          cooldown.cooldown--;
          
          if (cooldown.cooldown === 0) {
            console.log(`${cooldown.name} is no longer on cooldown for ${cooldown.characterName}.`);
            cooldownArray.splice(i, 1);
          } else {
            console.log(`${cooldown.name} cooldown: ${cooldown.cooldown} turns remaining for ${cooldown.characterName}`);
          }
        }
      }
    }
    
    console.log(`Active cooldowns remaining: ${cooldownArray.length}`);
  } catch (error) {
    console.error("Error cycling cooldowns:", error);
  }
}




// Export functions for use in other files
export {
  calculateDamage,
  checkResults,
  getPlayerMoves,
  runCalcDamageTest,
  updateMovesOnCd,
  handleTurnEffects,
  toCamelCase,
  generateAttackBarEmoji,
  generateHPBarEmoji,
  checkQuestCompletion,
  capitalizeFirstLetter,
  critOrNot,
  cycleCooldowns,
  getAbilities,
};
