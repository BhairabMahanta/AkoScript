import mongoose from "mongoose";
import AchievementModel from "../../../data/mongo/achieveschema";
import { AchievementRarity } from "../../../data/mongo/achieveschema";

interface CreateAchievementOptions {
  id: string;
  name: string;
  description: string;
  reward?: {
    coins?: number;
    gems?: number;
    xp?: number;
  };
  hidden?: boolean;
  classRestriction?: string[];
  raceRestriction?: string[];
  repeatable?: boolean;
  secretCondition?: string;
  rarity?: AchievementRarity;
  series?: {
    name: string;
    current: number;
    total: number;
  };
  unlockEffects?: {
    title?: string;
    cosmetic?: string;
    skill?: string;
  };
  progressSteps?: number;
}

export async function createAchievement(
  options: CreateAchievementOptions
): Promise<any> {
  const {
    id,
    name,
    description,
    reward = {},
    hidden = false,
    classRestriction = [],
    raceRestriction = [],
    repeatable = false,
    secretCondition = "",
    rarity = AchievementRarity.COMMON,
    series,
    unlockEffects,
    progressSteps,
  } = options;

  // Validate required fields
  if (!id || !name || !description) {
    throw new Error("Missing required fields: id, name, or description");
  }

  // Validate series if provided
  if (series && series.current > series.total) {
    throw new Error("Series current number cannot exceed total");
  }

  // Validate progress steps
  if (progressSteps && progressSteps < 1) {
    throw new Error("Progress steps must be at least 1");
  }

  // Create the achievement document
  const newAchievement = new AchievementModel({
    id,
    name,
    description,
    reward: {
      coins: reward.coins || 0,
      gems: reward.gems || 0,
      xp: reward.xp || 0,
    },
    hidden,
    firstAchieved: 0,
    achievedBy: 0,
    classRestriction,
    raceRestriction,
    repeatable,
    secretCondition,
    rarity,
    series,
    unlockEffects,
    progressSteps,
    firstThree: [],
  });

  try {
    // Save to database
    const savedAchievement = await newAchievement.save();

    // Log success
    console.log("Achievement created successfully:", {
      id: savedAchievement.id,
      name: savedAchievement.name,
      rarity: savedAchievement.rarity,
    });

    return savedAchievement;
  } catch (err: any) {
    // Handle specific MongoDB errors
    if (err instanceof mongoose.Error.ValidationError) {
      throw new Error(`Validation error: ${err.message}`);
    }
    if (err.code === 11000) {
      // Duplicate key error
      throw new Error(`Achievement with ID "${id}" already exists`);
    }

    // Log and rethrow other errors
    console.error("Error creating achievement:", {
      id,
      error: err.message,
      stack: err.stack,
    });
    throw new Error("Failed to create achievement due to a database error");
  }
}
