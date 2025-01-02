import { Boss } from "./bosses";
import { Mob, Stats } from "./mobs";

// Define BossStats interface, extending Stats for additional properties like mana
export interface BossStats extends Stats {
  mana: number;
}

// Define Mob interface, using Stats for the mob stats
export interface MobEnemy extends Mob {
  type: "mob";
}

// Define Boss interface, using BossStats for the boss stats
export interface BossEnemy extends Boss {
  type: "boss";
  ofScenario: string;
}

// Define a type for all possible enemies, which can either be a Mob or Boss
export type Enemy = MobEnemy | BossEnemy;

// Create an array that contains all enemies, with each object having a type to distinguish Mob from Boss
export const allEnemies: Enemy[] = [
  // Mobs
  {
    type: "mob",
    name: "monsterA",
    stats: {
      hp: 1000,
      attack: 100,
      defense: 40,
      speed: 95,
      magic: 200,
    },
    abilities: ["Fire Breath", "Tail Swipe"],
    attackPattern: ["Basic Attack", "Fire Breath", "Tail Swipe", "Fire Breath"],
    index: 0,
  },
  {
    type: "mob",
    name: "monsterB",
    stats: {
      hp: 800,
      attack: 70,
      defense: 30,
      speed: 99,
      magic: 100,
    },
    abilities: ["Venom Strike", "Web Trap"],
    attackPattern: ["Basic Attack", "Venom Strike", "Web Trap", "Venom Strike"],
    index: 1,
  },
  {
    type: "mob",
    name: "Goblin",
    stats: {
      hp: 1000,
      attack: 100,
      defense: 40,
      speed: 95,
      magic: 200,
    },
    abilities: ["Fire Breath", "Tail Swipe"],
    attackPattern: ["Basic Attack", "Fire Breath", "Tail Swipe", "Fire Breath"],
    index: 2,
  },
  {
    type: "mob",
    name: "Wolf",
    stats: {
      hp: 1000,
      attack: 100,
      defense: 40,
      speed: 95,
      magic: 200,
    },
    abilities: ["Fire Breath", "Tail Swipe"],
    attackPattern: ["Basic Attack", "Fire Breath", "Tail Swipe", "Fire Breath"],
    index: 3,
  },
  {
    type: "mob",
    name: "Treant",
    stats: {
      hp: 1000,
      attack: 100,
      defense: 40,
      speed: 95,
      magic: 200,
    },
    abilities: ["Fire Breath", "Tail Swipe"],
    attackPattern: ["Basic Attack", "Fire Breath", "Tail Swipe", "Fire Breath"],
    index: 4,
  },
  {
    type: "mob",
    name: "Fire Imp",
    stats: {
      hp: 1000,
      attack: 100,
      defense: 40,
      speed: 95,
      magic: 200,
    },
    abilities: ["Fire Breath", "Tail Swipe"],
    attackPattern: ["Basic Attack", "Fire Breath", "Tail Swipe", "Fire Breath"],
    index: 5,
  },
  {
    type: "mob",
    name: "Lava Beast",
    stats: {
      hp: 1000,
      attack: 100,
      defense: 40,
      speed: 95,
      magic: 200,
    },
    abilities: ["Fire Breath", "Tail Swipe"],
    attackPattern: ["Basic Attack", "Fire Breath", "Tail Swipe", "Fire Breath"],
    index: 6,
  },
  // Bosses
  {
    type: "boss",
    name: "Dragon Lord",
    ofScenario: "volcano-region",
    stats: {
      hp: 1000,
      attack: 150,
      defense: 100,
      speed: 80,
      mana: 200,
    },
    abilities: ["Fire Breath", "Tail Swipe"],
    attackPattern: ["Basic Attack", "Fire Breath", "Tail Swipe"],
    index: 0,
  },
  {
    type: "boss",
    name: "Giant Spider",
    ofScenario: "forest-region",
    stats: {
      hp: 800,
      attack: 120,
      defense: 80,
      speed: 120,
      mana: 100,
    },
    abilities: ["Venom Strike", "Web Trap"],
    attackPattern: ["Basic Attack", "Venom Strike", "Web Trap"],
    index: 1,
  },
  // Add other bosses as needed
];
