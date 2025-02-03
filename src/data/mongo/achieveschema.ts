import mongoose, { Schema, Document, Model } from "mongoose";

interface Reward {
  coins?: number;
  gems?: number;
  xp?: number;
}

interface UnlockEffects {
  title?: string;
  cosmetic?: string;
  skill?: string;
}

interface SeriesInfo {
  name: string;
  current: number;
  total: number;
}

export enum AchievementRarity {
  COMMON = "Common",
  RARE = "Rare",
  EPIC = "Epic",
  LEGENDARY = "Legendary",
}

interface Achievement extends Document {
  id: string;
  name: string;
  description: string;
  reward: Reward;
  firstAchieved: number;
  achievedBy: number;
  hidden: boolean;
  firstThree: string[];
  // RPG-specific fields
  classRestriction: string[];
  raceRestriction: string[];
  repeatable: boolean;
  secretCondition?: string;
  rarity: AchievementRarity;
  series?: SeriesInfo;
  unlockEffects?: UnlockEffects;
  progressSteps?: number;
}

const achievementSchema = new Schema<Achievement>(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    reward: {
      coins: { type: Number, default: 0, min: 0 },
      gems: { type: Number, default: 0, min: 0 },
      xp: { type: Number, default: 0, min: 0 },
    },
    firstAchieved: { type: Number, default: 0 },
    achievedBy: { type: Number, default: 0, min: 0 },
    hidden: { type: Boolean, default: false },
    firstThree: { type: [String], default: [], maxlength: 3 },
    // RPG-specific fields
    classRestriction: { type: [String], default: [] },
    raceRestriction: { type: [String], default: [] },
    repeatable: { type: Boolean, default: false },
    secretCondition: { type: String },
    rarity: {
      type: String,
      enum: Object.values(AchievementRarity),
      default: AchievementRarity.COMMON,
    },
    series: {
      name: { type: String },
      current: { type: Number, min: 1 },
      total: { type: Number, min: 1 },
    },
    unlockEffects: {
      title: { type: String },
      cosmetic: { type: String },
      skill: { type: String },
    },
    progressSteps: { type: Number, min: 1 },
  },
  {
    strict: false,
    timestamps: true,
  }
);

// Indexes Explained:
// 1. Unique index for fast ID lookups
// 2. Compound index for common filters
achievementSchema.index({ id: 1 });
achievementSchema.index({
  rarity: 1,
  classRestriction: 1,
  raceRestriction: 1,
});

// Validation Explained (using .path()):
achievementSchema.path("firstThree").validate(function (value: string[]) {
  return value.length <= 3;
}, "FirstThree cannot exceed 3 players");

const AchievementModel: Model<Achievement> = mongoose.model<Achievement>(
  "Achievement",
  achievementSchema,
  "achievements"
);

export default AchievementModel;
