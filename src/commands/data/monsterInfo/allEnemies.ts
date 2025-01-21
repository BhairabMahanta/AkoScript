import { Stats } from "./mobs";
interface Boss {
  name: string;
  element: ElementData[];
}
export interface Mob {
  name: string;
  element: ElementData[];
}
// Define BossStats interface, extending Stats for additional properties like mana
export interface BossStats extends Stats {
  mana: number;
}
// Define a type for elemental properties
export interface ElementData {
  type: string; // Element type (e.g., "Fire", "Water")
  stats: Stats | BossStats;
  abilities: string[];
  attackPattern: string[];
  index: number;
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
    element: [
      {
        type: "Fire",
        stats: {
          hp: 1000,
          attack: 100,
          defense: 40,
          speed: 95,
          magic: 200,
        },
        abilities: ["Fire Breath", "Tail Swipe"],
        attackPattern: [
          "Basic Attack",
          "Fire Breath",
          "Tail Swipe",
          "Fire Breath",
        ],
        index: 0,
      },
    ],
  },
  {
    type: "mob",
    name: "monsterB",
    element: [
      {
        type: "Fire",
        stats: {
          hp: 800,
          attack: 70,
          defense: 30,
          speed: 99,
          magic: 100,
        },
        abilities: ["Venom Strike", "Web Trap"],
        attackPattern: [
          "Basic Attack",
          "Venom Strike",
          "Web Trap",
          "Venom Strike",
        ],
        index: 1,
      },
    ],
  },
  {
    type: "mob",
    name: "Goblin",
    element: [
      {
        type: "Wind",
        stats: {
          hp: 1000,
          attack: 40,
          defense: 40,
          speed: 65,
          magic: 200,
        },
        abilities: ["Wind Spear", "Spear Swipe"],
        attackPattern: [
          "Basic Attack",
          "Basic Attack",
          "Basic Attack",
          "Basic Attack",
        ],
        index: 2,
      },
    ],
  },
  {
    type: "mob",
    name: "Wolf",
    element: [
      {
        type: "Terra",
        stats: {
          hp: 1000,
          attack: 50,
          defense: 40,
          speed: 55,
          magic: 200,
        },
        abilities: ["Stinky Breath", "Sharp Bite"],
        attackPattern: [
          "Basic Attack",
          "Basic Attack",
          "Basic Attack",
          "Sharp Bite",
        ],
        index: 3,
      },
      {
        type: "Fire",
        stats: {
          hp: 1000,
          attack: 50,
          defense: 40,
          speed: 55,
          magic: 200,
        },
        abilities: ["Stinky Breath", "Sharp Bite"],
        attackPattern: [
          "Basic Attack",
          "Basic Attack",
          "Basic Attack",
          "Sharp Bite",
        ],
        index: 3,
      },
    ],
  },
  {
    type: "mob",
    name: "Treant",
    element: [
      {
        type: "Fire",
        stats: {
          hp: 1000,
          attack: 40,
          defense: 40,
          speed: 95,
          magic: 200,
        },
        abilities: ["Splinter Attack"],
        attackPattern: ["Basic Attack", "Splinter Attack"],
        index: 4,
      },
      {
        type: "Wind",
        stats: {
          hp: 1000,
          attack: 100,
          defense: 40,
          speed: 95,
          magic: 200,
        },
        abilities: ["Splinter Attack"],
        attackPattern: ["Basic Attack", "Splinter Attack"],
        index: 4,
      },
      {
        type: "Water",
        stats: {
          hp: 1000,
          attack: 100,
          defense: 40,
          speed: 95,
          magic: 200,
        },
        abilities: ["Splinter Attack"],
        attackPattern: ["Basic Attack", "Splinter Attack"],
        index: 4,
      },
    ],
  },
  {
    type: "mob",
    name: "Imp",
    element: [
      {
        type: "Fire",
        stats: {
          hp: 1000,
          attack: 100,
          defense: 40,
          speed: 95,
          magic: 200,
        },
        abilities: ["Fire Spear", "Tail Swipe"],
        attackPattern: [
          "Basic Attack",
          "Fire Spear",
          "Tail Swipe",
          "Fire Spear",
        ],
        index: 5,
      },
    ],
  },
  {
    type: "mob",
    name: "Lava Pup",
    element: [
      {
        type: "Fire",
        stats: {
          hp: 1000,
          attack: 100,
          defense: 40,
          speed: 95,
          magic: 200,
        },
        abilities: ["Fire Spit"],
        attackPattern: ["Basic Attack", "Fire Spit", "Fire Spit", "Fire Spit"],
        index: 6,
      },
    ],
  },
  // Bosses
  {
    type: "boss",
    name: "Dragon Lord",
    ofScenario: "volcano-region",
    element: [
      {
        type: "Fire",
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
    ],
  },
  {
    type: "boss",
    name: "Giant Spider",
    ofScenario: "forest-region",
    element: [
      {
        type: "Fire",
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
    ],
  },
  // Add other bosses as needed
];
