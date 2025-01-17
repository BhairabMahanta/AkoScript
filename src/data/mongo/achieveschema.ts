import mongoose, { Schema, Document, Model } from "mongoose";

interface Reward {
  coins?: number;
  gems?: number;
  xp?: number;
}

interface Achievement extends Document {
  id: string;
  name: string;
  description: string;
  reward: Reward;
  firstAchieved: number; // Unix timestamp when the achievement was first achieved
  achievedBy: number; // Number of players who achieved it
  hidden: boolean; // Whether the achievement is hidden
  firstThree?: string[]; // IDs of the first three players to achieve it
}

const achievementSchema = new Schema<Achievement>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    reward: {
      coins: { type: Number, default: 0 },
      gems: { type: Number, default: 0 },
      xp: { type: Number, default: 0 },
    },
    firstAchieved: { type: Number, default: 0 },
    achievedBy: { type: Number, default: 0 },
    hidden: { type: Boolean, default: false },
    firstThree: { type: [String], default: [] },
  },
  { strict: false }
);

const AchievementModel: Model<Achievement> = mongoose.model<Achievement>(
  "Achievement",
  achievementSchema
);

export default AchievementModel;
