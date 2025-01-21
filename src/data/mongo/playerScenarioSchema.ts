import mongoose, { Schema, model, Document, Model } from "mongoose";
import {
  BossFloor,
  PlayerScenarioData,
  interfaceScenario,
  Floor,
  EntityInteraction,
} from "./scenarioInterface";
import { bool } from "sharp";

// EntityInteraction Schema
const EntityInteractionSchema = new Schema<EntityInteraction>({
  name: { type: String, required: true },
  position: {
    x: { type: Number, required: true },
    y: { type: Number, required: true },
  },
  interactionFinished: { type: Boolean, default: false },
});

// BossFloor Schema
const BossFloorSchema = new Schema<BossFloor>({
  floorNumber: { type: Number, required: true },
  unlocked: { type: Boolean, default: false },
  cleared: { type: Boolean, default: false },
  playerPos: {
    x: { type: Number, required: true },
    y: { type: Number, required: true },
  },
  entityInteractions: { type: [EntityInteractionSchema], default: [] },
});

// Floor Schema
const FloorSchema = new Schema<Floor>({
  floorNumber: { type: Number, required: true },
  miniboss: { type: Boolean, default: false },
  boss: { type: Boolean, default: false },
  cleared: { type: Boolean, default: false },
  quests: { type: [String], default: [] }, // Optional quests
  rewarded: { type: Boolean, default: false },
});

// Scenario Schema
const ScenarioSchema = new Schema<interfaceScenario>({
  id: { type: String, required: true }, // Unique ID for the scenario
  name: { type: String, required: true }, // Scenario name
  floors: {
    type: [
      {
        type: Schema.Types.Mixed, // Allow both Floor and BossFloor
        required: true,
        validate: {
          validator: function (v: any[]) {
            return v.every(
              (item) =>
                item.hasOwnProperty("floorNumber") &&
                (item.hasOwnProperty("miniboss") ||
                  item.hasOwnProperty("unlocked"))
            );
          },
          message: "Floors must be valid Floor or BossFloor objects.",
        },
      },
    ],
  },
  difficulties: { type: [String], default: [] }, // Available difficulties
  selected: { type: Boolean },
  claimedReward: { type: Boolean, default: false },
  number: { type: Number, required: true }, // Scenario number
});

// PlayerScenarioData Schema
const PlayerScenarioDataSchema = new Schema<PlayerScenarioData>({
  playerId: { type: String, required: true, unique: true }, // Player ID
  scenarios: { type: [ScenarioSchema], default: [] }, // Array of scenarios
});

// Model
export const ScenarioData = model<PlayerScenarioData>(
  "ScenarioData",
  PlayerScenarioDataSchema
);

export async function playerScenarioModel(
  db: mongoose.Connection,
  collectionName: string
): Promise<Model<PlayerScenarioData>> {
  return db.model<PlayerScenarioData>(
    "ScenarioData",
    PlayerScenarioDataSchema,
    collectionName
  );
}
