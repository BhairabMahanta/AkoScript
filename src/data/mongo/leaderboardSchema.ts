import { Schema, model, Document, Types } from "mongoose";
interface ILeaderboardEntry {
  playerId: Types.ObjectId;
  playerName: string;
  timeTaken: number;
  movesUsed: number;
  itemless: boolean;
  score: number;
}

interface ILeaderboard extends Document {
  scenarioId: Types.ObjectId;
  floor: number;
  difficulty: string;
  leaderboardType: string; // e.g., Fastest, Least Moves
  entries: ILeaderboardEntry[];
}

const LeaderboardEntrySchema = new Schema<ILeaderboardEntry>({
  playerId: { type: Schema.Types.ObjectId, required: true },
  playerName: { type: String, required: true },
  timeTaken: { type: Number, required: true },
  movesUsed: { type: Number, required: true },
  itemless: { type: Boolean, required: true },
  score: { type: Number, required: true },
});

const LeaderboardSchema = new Schema<ILeaderboard>({
  scenarioId: { type: Schema.Types.ObjectId, ref: "Scenario", required: true },
  floor: { type: Number, required: true },
  difficulty: { type: String, required: true },
  leaderboardType: { type: String, required: true },
  entries: { type: [LeaderboardEntrySchema], default: [] },
});

const LeaderboardModel = model<ILeaderboard>("Leaderboard", LeaderboardSchema);
export default LeaderboardModel;
