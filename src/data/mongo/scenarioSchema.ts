import mongoose, { Schema, model, Document, Types, Model } from "mongoose";

interface IPlayerScenarioProgress extends Document {
  playerId: String;
  progress: Array<{
    scenarioId: string;
    completedFloors: number;
    bestDifficulty: string;
    unlocked: boolean;
  }>;
}

const PlayerScenarioProgressSchema = new Schema<IPlayerScenarioProgress>({
  playerId: { type: String, required: true },
  progress: [
    {
      scenarioId: { type: String, required: true }, // The ID of the scenario (e.g., "forest-region")
      completedFloors: { type: Number, default: 0 }, // The number of completed floors
      bestDifficulty: {
        type: String,
        enum: ["Easy", "Medium", "Hard", "Hidden"],
        default: "Easy",
      }, // Best difficulty the player has completed
      unlocked: { type: Boolean, default: false }, // If the scenario is unlocked or not
    },
  ],
});

const worldMapModel: Model<IPlayerScenarioProgress> =
  mongoose.model<IPlayerScenarioProgress>(
    "PlayerScenarioProgress",
    PlayerScenarioProgressSchema,
    "PlayerScenarioProgress"
  );

export { worldMapModel, IPlayerScenarioProgress };
