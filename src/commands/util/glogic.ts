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
import { BuffDebuffLogic } from "../adv/action/buffdebufflogic";
import { mongoClient } from "../../data/mongo/mongo";

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

const buffDebuffLogic = new BuffDebuffLogic();

// Function to get the index of the maximum value among three

// Define base stats
const baseAttack = 50;
const baseDefense = 50;

// Function to calculate damage
// TypeScript equivalent functions
function calculateDamage(authorAtk: number, opponentDefense: number): number {
  const damage = Math.floor(
    Math.sqrt(authorAtk) **
      (Math.sqrt(3) **
        ((850 + authorAtk) / (450 + 1.26 * opponentDefense) ** 0.5))
  );

  return damage;
}

function calculateCritDamage(
  authorAtk: number,
  authorCritDamage: number,
  opponentDefense: number
): number {
  const damage = Math.floor(
    Math.sqrt(authorAtk * 1.5 ** ((authorCritDamage + 50) / 100)) **
      (Math.sqrt(3) **
        ((850 + authorAtk) / (450 + 1.26 * opponentDefense) ** 0.5))
  );

  return damage;
}

function calculateAbilityDamage(
  authorAtk: number,
  authorCritDamage: number,
  opponentDefense: number,
  authorAbilityPower: number
): number {
  const damage =
    Math.floor(
      Math.sqrt(authorAtk * 1.5 ** ((authorCritDamage + 50) / 100)) **
        (Math.sqrt(3) **
          ((850 + authorAtk) / (450 + 1.26 * opponentDefense) ** 0.5)) *
        authorAbilityPower
    ) / 100;
  return damage;
}

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

// Loop for incrementing attack
function runCalcDamageTest(): void {
  console.log("Incrementing Attack by 50:");
  for (let i = 1; i <= 90; i++) {
    const newAttack = baseAttack + i * 50;
    const newBaseDefense = 150;
    const damage = calculateDamage(newAttack, newBaseDefense);
    console.log(`New Attack: ${newAttack}, Damage: ${damage}`);
  }
  console.log("\nIncrementing Attack by 50 and Defense by 20:");
  for (let i = 1; i <= 90; i++) {
    const newAttack = baseAttack + i * 50;
    const newDefense = baseDefense + i * 23;
    const damage = calculateDamage(newAttack, newDefense);
    console.log(
      `New Attack: ${newAttack}, New Defense: ${newDefense}, Damage: ${damage}`
    );
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
    turnEnder.statuses.debuffs[i].remainingTurns--;
    if (turnEnder.statuses.debuffs[i].remainingTurns <= 0) {
      buffDebuffLogic.overLogic(
        turnEnder,
        turnEnder.statuses.buffs[i],
        i,
        true
      );
      console.log(`Debuff removed from ${turnEnder.name}`);
    }
  }

  // Handle buffs
  for (let i = turnEnder.statuses.buffs.length - 1; i >= 0; i--) {
    turnEnder.statuses.buffs[i].remainingTurns--;
    if (turnEnder.statuses.buffs[i].remainingTurns <= 0) {
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

  return `[${emoji.repeat(filledBars)}${" ".repeat(emptyBars)}]`;
}

// Generate HP bar emoji
async function generateHPBarEmoji(
  currentHP: number,
  maxHP: number
): Promise<string> {
  const emoji = "■";
  let filledBars = Math.floor((currentHP / maxHP) * 17);
  if (currentHP < 0) filledBars = 0;

  return `[${emoji.repeat(filledBars)}${" ".repeat(17 - filledBars)}]`;
}

// MongoDB setup
const db = mongoClient.db("Akaimnky");
const collection = db.collection("akaillection");
interface Objective {
  current: number | string; // You can refine this based on your actual data type
  required: number | string;
}
// Function to periodically check quest completion
async function checkQuestCompletion(): Promise<void> {
  const currentTime = Math.floor(Date.now() / 1000);
  const playersDb = await collection.find({}).toArray();

  playersDb.forEach(async (player) => {
    const playerQuests = player.activeQuests;
    let questSuccess = false;
    let questFailure = false;

    for (const questId in playerQuests) {
      const quest = playerQuests[questId];
      const questList = player.quests;
      const timeLimit = quest.timeLimit.daysLeft;

      if (currentTime > timeLimit) {
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
      : (calculateDamage(authorAttack, enemyDefense) * fomiliarPower) / 100;
  }
}

function capitalizeFirstLetter(string: string): string {
  if (string.length === 0) return string;
  return string.charAt(0).toUpperCase() + string.slice(1);
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
};
