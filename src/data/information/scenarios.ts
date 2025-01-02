import { Enemy } from "../../commands/adv/action/battle/battle";

interface Floor {
  floorNumber: number;
  enemies: Enemy[]; // Enemies now contain a list of Enemy objects
  miniboss: boolean;
  boss: boolean;
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
            waves: ["wave1", "wave2"],
            hasAllies: ["Wolf"],
            rewards: { gold: 100, xp: 50 },
          },
          {
            type: "mob",
            name: "Wolf",
            waves: ["wave1"],
            hasAllies: [],
            rewards: { gold: 150, xp: 70 },
          },
        ],
        miniboss: false,
        boss: false,
        rewards: ["Gold", "XP"],
      },
      {
        floorNumber: 2,
        enemies: [
          {
            type: "mob",
            name: "Goblin",
            waves: ["wave1", "wave2"],
            hasAllies: ["Wolf"],
            rewards: { gold: 100, xp: 50 },
          },
          {
            type: "mob",
            name: "Treant",
            waves: ["wave1"],
            hasAllies: [],
            rewards: { gold: 150, xp: 70 },
          },
        ],
        miniboss: true,
        boss: false,
        rewards: ["Gold", "Rune"],
      },
      {
        floorNumber: 3,
        enemies: [
          {
            type: "mob",
            name: "Treant",
            waves: ["wave1", "wave2"],
            hasAllies: ["Wolf"],
            rewards: { gold: 100, xp: 50 },
          },
          {
            type: "mob",
            name: "Wolf",
            waves: ["wave1"],
            hasAllies: [],
            rewards: { gold: 150, xp: 70 },
          },
        ],
        miniboss: false,
        boss: true,
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
            name: "Fire Imp",
            waves: ["wave1", "wave2"],
            hasAllies: ["Wolf"],
            rewards: { gold: 100, xp: 50 },
          },
          {
            type: "mob",
            name: "Lava Beast",
            waves: ["wave1"],
            hasAllies: [],
            rewards: { gold: 150, xp: 70 },
          },
        ],
        miniboss: false,
        boss: false,
        rewards: ["Gold", "XP"],
      },
      {
        floorNumber: 2,
        enemies: [
          {
            type: "mob",
            name: "Lava Beast",
            waves: ["wave1", "wave2"],
            hasAllies: ["Wolf"],
            rewards: { gold: 100, xp: 50 },
          },
          {
            type: "mob",
            name: "Fire Elemental",
            waves: ["wave1"],
            hasAllies: [],
            rewards: { gold: 150, xp: 70 },
          },
        ],
        miniboss: true,
        boss: false,
        rewards: ["Rune", "Gold"],
      },
      {
        floorNumber: 3,
        enemies: [
          {
            type: "mob",
            name: "Fire Imp",
            waves: ["wave1", "wave2"],
            hasAllies: ["Wolf"],
            rewards: { gold: 100, xp: 50 },
          },
          {
            type: "mob",
            name: "Fire Elemental",
            waves: ["wave1"],
            hasAllies: [],
            rewards: { gold: 150, xp: 70 },
          },
        ],
        miniboss: false,
        boss: true,
        rewards: ["Legendary Equipment"],
      },
    ],
    difficulties: ["Easy", "Medium", "Hard", "???"],
    rewards: ["Gold", "XP", "Runes", "Equipment"],
  },
];
