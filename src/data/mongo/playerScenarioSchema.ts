import mongoose, { Schema, model, Document } from "mongoose";
import { Model } from "mongoose";
import { Enemy } from "../../commands/data/monsterInfo/allEnemies";

// Interfaces
export interface EntityInteraction {
  name: string;
  position: { x: number; y: number };
  interactionFinished: boolean;
}
export interface Floor {
  floorNumber: number;
  miniboss: boolean;
  boss: boolean; // If this floor has a boss
  cleared: boolean;
  quests?: string[]; // Optional quests for the floor
  rewarded: boolean;
}

export interface BossFloor {
  floorNumber: number;
  unlocked: boolean;
  cleared: boolean;
  playerPos: { x: number; y: number };
  entityInteractions: EntityInteraction[];
}

export interface Scenario {
  id: string; // Unique ID for the scenario
  name: string; // Scenario name
  floors: Floor[] | BossFloor[]; // List of floors
  difficulties: string[]; // Available difficulties for the scenario
  claimedReward: boolean;
  number: number; // Scenario number
}

export interface PlayerScenarioData extends Document {
  playerId: string;
  scenarios: Scenario[];
}

// Mongoose Schemas
const EntityInteractionSchema = new Schema<EntityInteraction>({
  name: { type: String, required: true },
  position: {
    x: { type: Number, required: true },
    y: { type: Number, required: true },
  },
  interactionFinished: { type: Boolean, default: false },
});

const BossFloorSchema = new Schema<BossFloor>({
  floorNumber: { type: Number, required: true },
  unlocked: { type: Boolean, default: false },
  cleared: { type: Boolean, default: false },
  playerPos: {
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
  },
  entityInteractions: [EntityInteractionSchema],
});

const ScenarioSchema = new Schema<Scenario>({
  name: { type: String, required: true },
});

const PlayerScenarioDataSchema = new Schema<PlayerScenarioData>({
  playerId: { type: String, required: true, unique: true },
  scenarios: [ScenarioSchema],
});

// Mongoose Model
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
