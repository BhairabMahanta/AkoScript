import { Enemy } from "../../commands/adv/action/battle/types/BattleTypes";

export interface Floor {
  floorNumber: number;
  enemies: Enemy[]; // Enemies now contain a list of Enemy objects
  miniboss: boolean;
  boss: boolean;
  bosses?: string[];
  quests?: string[];
  mobs?: { [key: string]: any }[];
  waves: number;
  rewards: string[];
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  floors: Floor[];
  difficulties: string[];
  rewards: string[];
}

export const scenarios: Scenario[] = [
  {
    id: "forest-region",
    name: "Forest Region",
    description: "A lush green forest filled with magical creatures.",
    floors: [
      {
        floorNumber: 1,
        enemies: [
          {
            type: "mob",
            name: "Goblin",
            element: "Wind",
            waves: [
              {
                waveNumber: 1,
                enemies: ["Goblin", "Wolf"],
              },
              {
                waveNumber: 2,
                enemies: ["Goblin"],
              },
            ],
            hasAllies: [{ name: "Wolf", element: "Terra" }],

            rewards: { gold: 100, xp: 50 },
          },
        ],
        miniboss: false,
        boss: false,
        waves: 2,
        rewards: ["Gold", "XP"],
      },
      {
        floorNumber: 2,
        enemies: [
          {
            type: "mob",
            name: "Goblin",
            element: "Wind",
            waves: [
              {
                waveNumber: 1,
                enemies: ["Goblin", "Treant"],
              },
              {
                waveNumber: 2,
                enemies: ["Goblin"],
              },
            ],
            hasAllies: [{ name: "Treant", element: "Wind" }],

            rewards: { gold: 100, xp: 50 },
          },
        ],
        miniboss: true,
        bosses: ["Giant Spider"],
        boss: false,
        waves: 2,
        rewards: ["Gold", "Rune"],
      },
      {
        floorNumber: 3,
        enemies: [
          {
            type: "mob",
            name: "Treant",
            element: "Water",
            waves: [
              {
                waveNumber: 1,
                enemies: ["Treant", "Wolf"],
              },
              {
                waveNumber: 2,
                enemies: ["Treant"],
              },
            ],
            hasAllies: [{ name: "Wolf", element: "Fire" }],

            rewards: { gold: 100, xp: 50 },
          },
        ],
        miniboss: false,
        boss: false,
        waves: 2,
        rewards: ["Rare Equipment"],
      },

      {
        floorNumber: 4,
        enemies: [
          {
            type: "mob",
            name: "Treant",
            element: "Water",
            waves: [
              {
                waveNumber: 1,
                enemies: ["Treant", "Wolf"],
              },
              {
                waveNumber: 2,
                enemies: ["Treant"],
              },
            ],
            hasAllies: [{ name: "Wolf", element: "Fire" }],

            rewards: { gold: 100, xp: 50 },
          },
        ],
        quests: ["gather_ingredients"],
        bosses: ["Giant Spider"],
        mobs: [
          { name: "Wolf", element: "Fire" },
          { name: "Treant", element: "Water" },
        ],
        miniboss: false,
        boss: true,
        waves: 2,
        rewards: ["Rare Equipment"],
      },
    ],
    difficulties: ["Easy", "Medium", "Hard", "???"],
    rewards: ["Gold", "XP", "Runes", "Equipment"],
  },
  {
    id: "volcano-region",
    name: "Volcano Region",
    description: "A fiery land where only the brave dare to venture.",
    floors: [
      {
        floorNumber: 1,
        enemies: [
          {
            type: "mob",
            name: "Imp",
            element: "Fire",
            waves: [
              {
                waveNumber: 1,
                enemies: ["Imp", "Wolf"],
              },
              {
                waveNumber: 2,
                enemies: ["Imp"],
              },
            ],
            hasAllies: [{ name: "Wolf", element: "Fire" }],

            rewards: { gold: 100, xp: 50 },
          },
        ],
        miniboss: false,
        boss: false,
        waves: 2,
        rewards: ["Gold", "XP"],
      },
      {
        floorNumber: 2,
        enemies: [
          {
            type: "mob",
            name: "Lava Beast",
            element: "Fire",
            waves: [
              {
                waveNumber: 1,
                enemies: ["Lava Beast", "Wolf"],
              },
              {
                waveNumber: 2,
                enemies: ["Lava Beast"],
              },
            ],
            hasAllies: [{ name: "Wolf", element: "Wind" }],

            rewards: { gold: 100, xp: 50 },
          },
        ],
        miniboss: true,
        boss: false,
        waves: 2,
        rewards: ["Rune", "Gold"],
      },
      {
        floorNumber: 3,
        enemies: [
          {
            type: "mob",
            name: "Imp",
            element: "Fire",
            waves: [
              {
                waveNumber: 1,
                enemies: ["Imp", "Wolf"],
              },
              {
                waveNumber: 2,
                enemies: ["Imp"],
              },
            ],
            hasAllies: [{ name: "Wolf", element: "Fire" }],

            rewards: { gold: 100, xp: 50 },
          },
        ],
        miniboss: false,
        boss: true,
        waves: 2,
        rewards: ["Legendary Equipment"],
      },
    ],
    difficulties: ["Easy", "Medium", "Hard", "???"],
    rewards: ["Gold", "XP", "Runes", "Equipment"],
  },
];
