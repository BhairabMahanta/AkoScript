import mongoose, { Document, Schema, Model } from "mongoose";
import { v4 as uuidv4 } from 'uuid';

// Define interfaces for your data structure
export interface Tokens {
  commonScroll: number;
  rareScroll: number;
  legendaryScroll: number;
}

interface Move {
  id: number;
  name: string;
  power: number;
  cooldown: number;
  level: number;
}

export interface Stats {
  attack: number;
  magic: number;
  defense: number;
  magicDefense: number;
  speed: number;
  hp: number;
  divinePower: number;
  critRate: number;
  critDamage: number;
  luck: number;
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
  divinePower: number;
}

interface CollectionItem {
  serialId: string;
  globalId: string;
  name: string;
  element: string;
  stats: CollectionItemStats;
  ability: string[];
  moves: Move[];
}

export interface DeckItem {
  slot: number;
  serialId: string;
  globalId: string;
  name: string;
}

export interface DungeonDeckItem {
  slot: number;
  serialId: string;
  globalId: string;
  name: string;
}

interface SelectedFamiliar {
  name: string;
  serialId: string;
  tier: number;
}

interface Mail {
  id: string;
  read: boolean;
  sentAt: number;
  expiresAt?: number;
  rewardClaimed: boolean;
}

// Arena-specific interfaces
export interface ArenaDefenseItem {
  slot: number;
  serialId: string;
  globalId: string;
  name: string;
}

interface ArenaSeasonStats {
  seasonId: string;
  startRating: number;
  highestRating: number;
  battlesWon: number;
  battlesLost: number;
  rewardsClaimedAt?: Date;
}

interface ArenaData {
  rating: number;
  rank: string;
  totalWins: number;
  totalLosses: number;
  defenseWins: number;
  defenseLosses: number;
  attacksToday: number;
  defenseDeck: ArenaDefenseItem[]; // ✅ Now it's a deck like others
  recentOpponents: string[];
  lastBattleAt: Date;
  inBattle: boolean;
  seasonStats: ArenaSeasonStats;
  isInitialized: boolean;
  maxRating: number;
}

// Player Document Interface
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
  dungeonDeck: DungeonDeckItem[];
  selectedFamiliars: {
    name: SelectedFamiliar[];
  };
  mail: Mail[];
  quests: string[];
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
        totalDays: string;
        daysLeft: string;
      };
      questChannel: string;
      questStatus: string;
    };
  };
  arena: ArenaData;
  createdAt: Date;
  updatedAt: Date;
  gainExperience(exp: number): void;
  gainItems(items: string[]): void;
}

// Static Methods Interface
export interface PlayerModel extends Model<Player> {
  findByName(name: string): Promise<Player | null>;
  getArenaLeaderboard(limit?: number): Promise<Player[]>;
  findArenaOpponents(playerId: string, ratingRange?: number): Promise<Player[]>;
}

// Unique ID Generation System
export class IdGenerator {
  static generateUniqueGlobalId(): string {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substr(2, 9);
    const uuid = uuidv4().split('-')[0];
    return `global_${timestamp}_${randomPart}_${uuid}`;
  }

  static generateUniqueSerialId(): string {
    return uuidv4();
  }

  static generateArenaSeasonId(): string {
    const now = new Date();
    const year = now.getFullYear();
    const week = Math.ceil((now.getTime() - new Date(year, 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
    return `season_${year}_w${week}`;
  }
}

// Validation functions
function arrayLimit(val: number) {
  return function(arr: any[]) {
    return arr.length <= val;
  };
}

function validateDeckSlots(deck: DeckItem[]) {
  const slots = deck.map(item => item.slot);
  const uniqueSlots = [...new Set(slots)];
  return uniqueSlots.length === slots.length && Math.max(...slots) <= 4;
}

function validateDungeonDeckSlots(deck: DungeonDeckItem[]) {
  const slots = deck.map(item => item.slot);
  const uniqueSlots = [...new Set(slots)];
  return uniqueSlots.length === slots.length && Math.max(...slots) <= 6;
}

const MoveSchema = new Schema<Move>({
  id: { type: Number, required: true },
  name: { type: String, required: true },
  power: { type: Number, required: true },
  cooldown: { type: Number, required: true },
  level: { type: Number, required: true },
});


const ArenaSeasonStatsSchema = new Schema({
  seasonId: { type: String, required: true },
  startRating: { type: Number, default: 1000 },
  highestRating: { type: Number, default: 1000 },
  battlesWon: { type: Number, default: 0 },
  battlesLost: { type: Number, default: 0 },
  rewardsClaimedAt: { type: Date }
});

const ArenaSchema = new Schema({
  rating: { type: Number, default: 1000 },
  rank: { type: String, default: 'Bronze' },
  totalWins: { type: Number, default: 0 },
  totalLosses: { type: Number, default: 0 },
  defenseWins: { type: Number, default: 0 },
  defenseLosses: { type: Number, default: 0 },
  attacksToday: { type: Number, default: 0 },
  defenseDeck: {
    type: [{
      slot: { type: Number, required: true, min: 1, max: 4 },
      serialId: { type: String, required: true },
      globalId: { type: String, required: true },
      name: { type: String, required: true },
    }],
    validate: [arrayLimit(4), 'Arena defense deck can have maximum 4 items'],
    default: []
  },
  recentOpponents: { type: [String], default: [] },
  lastBattleAt: { type: Date, default: Date.now },
  inBattle: { type: Boolean, default: false },
  seasonStats: { type: ArenaSeasonStatsSchema, default: () => ({}) },
  isInitialized: { type: Boolean, default: false },
  maxRating: { type: Number, default: 1000 }
});

// Define the player schema
const playerSchema: Schema<Player> = new Schema<Player>(
  {
    _id: { type: String, required: true },
    name: { 
      type: String, 
      required: true,
      minlength: 3,
      maxlength: 20,
      trim: true
    },
    location: { type: String, required: true },
    inventory: {
      active: { type: [String], default: [] },
      backpack: { type: [String], default: [] },
      tokens: {
        commonScroll: { type: Number, default: 0 },
        rareScroll: { type: Number, default: 0 },
        legendaryScroll: { type: Number, default: 0 },
      },
    },
    stats: {
      attack: { type: Number, required: true, min: 0 },
      magic: { type: Number, required: true, min: 0 },
      defense: { type: Number, required: true, min: 0 },
      magicDefense: { type: Number, required: true, min: 0 },
      speed: { type: Number, required: true, min: 0 },
      hp: { type: Number, required: true, min: 1 },
      critRate: { type: Number, required: true, min: 0 },
      critDamage: { type: Number, required: true, min: 0 },
      luck: { type: Number, required: true, min: 0 },
      divinePower: { type: Number, required: true, min: 0 },
      potential: { type: Number, required: true, min: 0 },
    },
    mail: [{
      id: { type: String, required: true },
      read: { type: Boolean, default: false },
      sentAt: { type: Number, required: true },
      expiresAt: { type: Number },
      rewardClaimed: { type: Boolean, default: false },
    }],
    balance: {
      coins: { type: Number, default: 0, min: 0 },
      gems: { type: Number, default: 0, min: 0 },
    },
    exp: {
      xp: { type: Number, default: 0, min: 0 },
      level: { type: Number, default: 1, min: 1 },
    },
    cards: {
      name: { type: [String], default: [] },
    },
    class: { type: String, required: true },
    race: { type: String, required: true },
    stuff: {
      generatedRandomElements: { type: Boolean, default: false },
      generatedRandomElements2: { type: Boolean, default: false },
    },
    playerpos: {
      x: { type: Number, required: true },
      y: { type: Number, required: true },
    },
    collectionInv: [{
      serialId: { type: String, required: true },
      globalId: { type: String, required: true },
      name: { type: String, required: true },
      element: { type: String, required: true },
      stats: {
        level: { type: Number, required: true, min: 1 },
        xp: { type: Number, default: 0, min: 0 },
        attack: { type: Number, required: true, min: 0 },
        defense: { type: Number, required: true, min: 0 },
        speed: { type: Number, required: true, min: 0 },
        hp: { type: Number, required: true, min: 1 },
        tier: { type: Number, required: true, min: 1 },
        evolution: { type: Number, default: 0, min: 0 },
        critRate: { type: Number, default: 0, min: 0 },
        critDamage: { type: Number, default: 0, min: 0 },
        magic: { type: Number, default: 0, min: 0 },
        magicDefense: { type: Number, default: 0, min: 0 },
        divinePower: { type: Number, default: 0, min: 0 },
      },
      ability: { type: [String], default: [] },
      moves: [MoveSchema],
    }],
    deck: {
      type: [{
        slot: { type: Number, required: true, min: 1, max: 4 },
        serialId: { type: String, required: true },
        globalId: { type: String, required: true },
        name: { type: String, required: true },
      }],
      validate: [arrayLimit(4), 'Deck can have maximum 4 items'],
      default: []
    },
    dungeonDeck: {
      type: [{
        slot: { type: Number, required: true, min: 1, max: 6 },
        serialId: { type: String, required: true },
        globalId: { type: String, required: true },
        name: { type: String, required: true },
      }],
      validate: [arrayLimit(6), 'Dungeon deck can have maximum 6 items'],
      default: []
    },
    selectedFamiliars: {
      name: [{
        name: { type: String, required: true },
        serialId: { type: String, required: true },
        tier: { type: Number, required: true, min: 1 },
      }],
    },
    quests: {
      type: [String],
      default: [],
    },
    activeQuests: {
      type: Map,
      of: {
        objectives: [{
          id: String,
          target: String,
          description: String,
          current: { type: Number, default: 0 },
          required: { type: Number, default: 1 },
        }],
        timeLimit: {
          totalDays: String,
          daysLeft: String,
        },
        questChannel: String,
        questStatus: String,
      },
      default: new Map(),
    },
    arena: { type: ArenaSchema, default: () => ({}) },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  },
  { 
    strict: true,
    timestamps: true
  }
);

// Pre-save middleware to ensure unique globalIds
playerSchema.pre('save', async function(next) {
  if (this.isNew) {
    // Ensure all globalIds are unique when creating new player
    const existingGlobalIds = new Set();
    
    // Check collection inventory globalIds
    for (const item of this.collectionInv) {
      while (existingGlobalIds.has(item.globalId) || await checkGlobalIdExists(item.globalId)) {
        item.globalId = IdGenerator.generateUniqueGlobalId();
      }
      existingGlobalIds.add(item.globalId);
    }
    
    // Check deck globalIds
    for (const item of this.deck) {
      if (item.serialId !== 'player' && item.serialId !== 'empty') {
        while (existingGlobalIds.has(item.globalId) || await checkGlobalIdExists(item.globalId)) {
          item.globalId = IdGenerator.generateUniqueGlobalId();
        }
        existingGlobalIds.add(item.globalId);
      }
    }
    
    // Check dungeon deck globalIds
    for (const item of this.dungeonDeck) {
      if (item.serialId !== 'player' && item.serialId !== 'empty') {
        while (existingGlobalIds.has(item.globalId) || await checkGlobalIdExists(item.globalId)) {
          item.globalId = IdGenerator.generateUniqueGlobalId();
        }
        existingGlobalIds.add(item.globalId);
      }
    }
  }
  
  this.updatedAt = new Date();
  next();
});

// Helper function to check if globalId exists
async function checkGlobalIdExists(globalId: string): Promise<boolean> {
  try {
    const exists = await mongoose.models.Player?.exists({
      $or: [
        { 'collectionInv.globalId': globalId },
        { 'deck.globalId': globalId },
        { 'dungeonDeck.globalId': globalId }
      ]
    });
    return !!exists;
  } catch (error) {
    console.error('Error checking globalId existence:', error);
    return false;
  }
}

// Custom validation for deck slots
playerSchema.path('deck').validate(function(deck: DeckItem[]) {
  return validateDeckSlots(deck);
}, 'Invalid deck configuration: duplicate slots or invalid slot numbers');

// Custom validation for dungeon deck slots
playerSchema.path('dungeonDeck').validate(function(deck: DungeonDeckItem[]) {
  return validateDungeonDeckSlots(deck);
}, 'Invalid dungeon deck configuration: duplicate slots or invalid slot numbers');

// Add indexes for performance
playerSchema.index({ _id: 1 });
playerSchema.index({ name: 1 });
playerSchema.index({ 'collectionInv.serialId': 1 });
playerSchema.index({ 'collectionInv.globalId': 1 });
playerSchema.index({ 'deck.serialId': 1 });
playerSchema.index({ 'deck.globalId': 1 });
playerSchema.index({ 'dungeonDeck.serialId': 1 });
playerSchema.index({ 'dungeonDeck.globalId': 1 });
playerSchema.index({ 'arena.rating': -1 });
playerSchema.index({ 'arena.rank': 1 });
playerSchema.index({ 'arena.inBattle': 1 });
playerSchema.index({ createdAt: 1 });

// Instance methods
playerSchema.methods.gainExperience = function(exp: number) {
  this.exp.xp += exp;
  console.log(`${this.name} gained ${exp} experience. Total XP: ${this.exp.xp}`);
};

playerSchema.methods.gainItems = function(items: string[]) {
  this.inventory.backpack.push(...items);
  console.log(`${this.name} gained items: ${items.join(", ")}`);
};

// Static methods - Fixed TypeScript integration
playerSchema.statics.findByName = function(name: string) {
  return this.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
};

playerSchema.statics.getArenaLeaderboard = function(limit: number = 100) {
  return this.find({ 'arena.isInitialized': true })
    .sort({ 'arena.rating': -1 })
    .limit(limit)
    .select('name arena.rating arena.rank arena.totalWins arena.totalLosses');
};

// ✅ Fix the arena opponent finder
playerSchema.statics.findArenaOpponents = function(playerId: string, ratingRange: number = 100) {
  return this.findById(playerId).then((player:Player) => {
    if (!player) return [];
    
    const minRating = player.arena.rating - ratingRange;
    const maxRating = player.arena.rating + ratingRange;
      
    // addlater 'arena.inBattle': false,
    return this.find({
      _id: { $ne: playerId },
      'arena.rating': { $gte: minRating, $lte: maxRating },
      'arena.defenseDeck': { $exists: true, $not: { $size: 0 } } // ✅ Check defenseDeck instead
    })
    .sort({ 'arena.rating': -1 })
    .limit(20);
  });
};


// Create model function
async function playerModel(
  db: mongoose.Connection,
  collectionName: string
): Promise<PlayerModel> {
  return db.model<Player, PlayerModel>("akaillection", playerSchema, collectionName);
}

// Export the model with proper typing
export const PlayerModal = mongoose.model<Player, PlayerModel>(
  "Player",
  playerSchema,
  "akaillection"
);

export { playerModel, Player };
