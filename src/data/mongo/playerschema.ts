import mongoose, { Document, Schema, Model } from "mongoose";

// Define interfaces for your data structure
export interface Tokens {
  commonScroll: number;
  rareScroll: number;
  legendaryScroll: number;
}
// move.interface.ts

interface Move {
  id: number;
  name: string;
  power: number;
  cooldown: number;
  level: number;
}

export interface Stats {
  attack: number;
  tactics: number;
  magic: number;
  training: number;
  defense: number;
  magicDefense: number;
  speed: number;
  hp: number;
  intelligence: number;
  critRate: number;
  critDamage: number;
  wise: number;
  luck: number;
  devotion: number;
  potential: number;
}

interface Balance {
  coins: number;
  gems: number;
}

interface Experience {
  xp: number;
  level: number;
}

interface Card {
  name: string[];
}

interface Stuff {
  generatedRandomElements: boolean;
  generatedRandomElements2: boolean;
}

interface PlayerPosition {
  x: number;
  y: number;
}

interface CollectionItemStats {
  level: number;
  xp: number;
  attack: number;
  defense: number;
  speed: number;
  hp: number;
  tier: number;
  evolution: number;
  critRate: number;
  critDamage: number;
  magic: number;
  magicDefense: number;
}

interface CollectionItem {
  serialId: string;
  globalId: string;
  name: string;
  element: string;
  stats: CollectionItemStats;
  moves: string[]; // Adjust type if needed
}

export interface DeckItem {
  serialId: string;
  globalId: string;
  name: string;
  stats: Stats;
}

interface SelectedFamiliar {
  name: string;
  serialId: number;
  tier: number;
}

interface Player extends Document {
  _id: string;
  name: string;
  location: string;
  inventory: {
    active: string[];
    backpack: string[];
    tokens: Tokens;
  };
  stats: Stats;
  balance: Balance;
  exp: Experience;
  cards: Card;
  class: string;
  race: string;
  stuff: Stuff;
  playerpos: PlayerPosition;
  collectionInv: CollectionItem[];
  deck: DeckItem[];
  selectedFamiliars: {
    name: SelectedFamiliar[];
  };
  quests: string[]; // Array of quest names
  activeQuests: {
    [key: string]: {
      objectives: {
        id: string;
        target: string;
        description: string;
        current: number;
        required: number;
      }[];
      timeLimit: {
        totalDays: String;
        daysLeft: String;
      };
      questChannel: string;
      questStatus: string;
    };
  };
  gainExperience(exp: number): void;
  gainItems(items: string[]): void;
}

const MoveSchema = new Schema<Move>({
  id: { type: Number, required: true },
  name: { type: String, required: true },
  power: { type: Number, required: true },
  cooldown: { type: Number, required: true },
  level: { type: Number, required: true },
});
// Define the player schema
const playerSchema: Schema<Player> = new Schema<Player>(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true },
    location: { type: String, required: true },
    inventory: {
      active: { type: [String], required: true },
      backpack: { type: [String], required: true },
      tokens: {
        commonScroll: { type: Number, required: true },
        rareScroll: { type: Number, required: true },
        legendaryScroll: { type: Number, required: true },
      },
    },
    stats: {
      attack: { type: Number, required: true },
      tactics: { type: Number, required: true },
      magic: { type: Number, required: true },
      training: { type: Number, required: true },
      defense: { type: Number, required: true },
      magicDefense: { type: Number, required: true },
      speed: { type: Number, required: true },
      hp: { type: Number, required: true },
      intelligence: { type: Number, required: true },
      critRate: { type: Number, required: true },
      critDamage: { type: Number, required: true },
      wise: { type: Number, required: true },
      luck: { type: Number, required: true },
      devotion: { type: Number, required: true },
      potential: { type: Number, required: true },
    },
    balance: {
      coins: { type: Number, required: true },
      gems: { type: Number, required: true },
    },
    exp: {
      xp: { type: Number, required: true },
      level: { type: Number, required: true },
    },
    cards: {
      name: { type: [String], required: true },
    },
    class: { type: String, required: true },
    race: { type: String, required: true },
    stuff: {
      generatedRandomElements: { type: Boolean, required: true },
      generatedRandomElements2: { type: Boolean, required: true },
    },
    playerpos: {
      x: { type: Number, required: true },
      y: { type: Number, required: true },
    },
    collectionInv: [
      {
        serialId: { type: String, required: true },
        globalId: { type: String, required: true },
        name: { type: String, required: true },
        element: { type: String, required: true },
        stats: {
          level: { type: Number, required: true },
          xp: { type: Number, required: true },
          attack: { type: Number, required: true },
          defense: { type: Number, required: true },
          speed: { type: Number, required: true },
          hp: { type: Number, required: true },
          tier: { type: Number, required: true },
          evolution: { type: Number, required: true },
          critRate: { type: Number, required: true },
          critDamage: { type: Number, required: true },
          magic: { type: Number, required: true },
          magicDefense: { type: Number, required: true },
        },
        moves: [MoveSchema],
      },
    ],
    deck: [
      {
        slot: { type: Number, required: true },
        serialId: { type: String, required: true },
        globalId: { type: String, required: true },
        name: { type: String, required: true },
      },
    ],
    selectedFamiliars: {
      name: [
        {
          name: { type: String, required: true },
          serialId: { type: Number, required: true },
          tier: { type: Number, required: true },
        },
      ],
    },
    quests: {
      type: [String],
      default: [],
    },
    activeQuests: {
      type: Map,
      of: {
        objectives: [
          {
            id: String,
            target: String,
            description: String,
            current: Number,
            required: Number,
          },
        ],
        timeLimit: {
          totalDays: String,
          daysLeft: String,
        },
        questChannel: String,
        questStatus: String,
      },
      default: {},
    },
  },

  { strict: false }
);
playerSchema.methods.gainExperience = function (exp: number) {
  this.exp.xp += exp;
  console.log(`Gained ${exp} experience. Total XP: ${this.exp.xp}`);
};

playerSchema.methods.gainItems = function (items: string[]) {
  this.inventory.backpack.push(...items);
  console.log(`Gained items: ${items.join(", ")}`);
};

// Create a model using the player schema
async function playerModel(
  db: mongoose.Connection,
  collectionName: string
): Promise<Model<Player>> {
  return db.model<Player>("Player", playerSchema, collectionName);
}

export { playerModel, Player };
