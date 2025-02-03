import { Schema, model, Document, Types } from "mongoose";

// Guild System
interface IGuild extends Document {
  name: string;
  leader: Types.ObjectId;
  officers: Types.ObjectId[];
  members: Types.ObjectId[];
  level: number;
  created: Date;
}

const GuildSchema = new Schema<IGuild>({
  name: { type: String, required: true, unique: true },
  leader: { type: Schema.Types.ObjectId, ref: "Player", required: true },
  officers: [{ type: Schema.Types.ObjectId, ref: "Player" }],
  members: [{ type: Schema.Types.ObjectId, ref: "Player" }],
  level: { type: Number, default: 1 },
  created: { type: Date, default: Date.now },
});

// Base Leaderboard Entry
interface IBaseEntry {
  rank: number;
  updatedAt: Date;
}

// Scenario-specific Leaderboard Entry
interface IScenarioEntry extends IBaseEntry {
  player: Types.ObjectId;
  timeTaken: number;
  movesUsed: number;
  damageDealt: number;
  itemless: boolean;
  teamComposition: Types.ObjectId[];
}

// Arena-specific Leaderboard Entry
interface IArenaEntry extends IBaseEntry {
  player: Types.ObjectId;
  rating: number;
  defenseTeam: Types.ObjectId[];
  wins: number;
  losses: number;
}

// Guild-specific Leaderboard Entry
interface IGuildEntry extends IBaseEntry {
  guild: Types.ObjectId;
  guildLevel: number;
  memberCount: number;
  totalContribution: number;
}

// Monetary Leaderboard Entry
interface IMonetaryEntry extends IBaseEntry {
  player: Types.ObjectId;
  currencies: {
    crystals: number;
    gold: number;
    mana: number;
  };
}

type LeaderboardEntry =
  | IScenarioEntry
  | IArenaEntry
  | IGuildEntry
  | IMonetaryEntry;

// Main Leaderboard Document
interface ILeaderboard extends Document {
  boardType: "scenario" | "arena" | "guild" | "monetary";
  season?: number; // For arena seasons
  scenarioId?: Types.ObjectId; // Only for scenario boards
  floor?: number; // Only for scenario boards
  difficulty?: "normal" | "hard" | "hell";
  criteria: "time" | "moves" | "damage" | "rating" | "level" | "total";
  entries: LeaderboardEntry[];
  updatedAt: Date;
}

export const BaseEntrySchema = new Schema<IBaseEntry>(
  {
    rank: { type: Number, required: true },
    updatedAt: { type: Date, default: Date.now },
  },
  { discriminatorKey: "kind" }
);

export const ScenarioEntrySchema = new Schema<IScenarioEntry>({
  player: { type: Schema.Types.ObjectId, ref: "Player", required: true },
  timeTaken: Number,
  movesUsed: Number,
  damageDealt: Number,
  itemless: Boolean,
  teamComposition: [{ type: Schema.Types.ObjectId, ref: "Monster" }],
});

export const ArenaEntrySchema = new Schema<IArenaEntry>({
  player: { type: Schema.Types.ObjectId, ref: "Player", required: true },
  rating: { type: Number, required: true },
  defenseTeam: [{ type: Schema.Types.ObjectId, ref: "Monster" }],
  wins: Number,
  losses: Number,
});

export const GuildEntrySchema = new Schema<IGuildEntry>({
  guild: { type: Schema.Types.ObjectId, ref: "Guild", required: true },
  guildLevel: Number,
  memberCount: Number,
  totalContribution: Number,
});

export const MonetaryEntrySchema = new Schema<IMonetaryEntry>({
  player: { type: Schema.Types.ObjectId, ref: "Player", required: true },
  currencies: {
    crystals: Number,
    gold: Number,
    mana: Number,
  },
});

const LeaderboardSchema = new Schema<ILeaderboard>({
  boardType: {
    type: String,
    enum: ["scenario", "arena", "guild", "monetary"],
    required: true,
  },
  season: Number,
  scenarioId: { type: Schema.Types.ObjectId, ref: "Scenario" },
  floor: Number,
  difficulty: String,
  criteria: {
    type: String,
    required: true,
    enum: ["time", "moves", "damage", "rating", "level", "total"],
  },
  entries: [
    {
      type: Schema.Types.ObjectId,
      refPath: "entries.kind",
    },
  ],
  updatedAt: { type: Date, default: Date.now },
});

// Indexes for faster querying
LeaderboardSchema.index({
  boardType: 1,
  scenarioId: 1,
  floor: 1,
  difficulty: 1,
  criteria: 1,
});

// Compile models
const GuildModel = model<IGuild>("Guild", GuildSchema);
const LeaderboardModel = model<ILeaderboard>("Leaderboard", LeaderboardSchema);

export { GuildModel, LeaderboardModel };
