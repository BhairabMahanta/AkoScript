import mongoose, { Schema, Document, Model } from "mongoose";

interface Reward {
  coins?: number;
  gems?: number;
  xp?: number;
  items?: string[]; // Array of item IDs
}

interface Mail extends Document {
  id: string;
  recipientId: string; // Player ID
  subject: string;
  message: string;
  rewards?: Reward;
  read: boolean; // Whether the mail has been read
  sentAt: number; // Unix timestamp
  expiresAt?: number; // Optional expiration timestamp
  mailTrigger?: string; // Reason or trigger for the mail
  numberClaimed?: number; // Tracks how many times the reward was claimed (if applicable)
  achievement?: boolean; // Indicates if this mail is related to an achievement
  autoClaim?: boolean; // Whether rewards are automatically claimed
  date?: Date; // Optional additional date field
  targetGroup?: string[]; // Array of player IDs (null for global)
}

const mailSchema = new Schema<Mail>({
  id: { type: String, required: true },
  recipientId: { type: String },
  subject: { type: String, required: true },
  message: { type: String, required: true },
  rewards: {
    coins: { type: Number, default: 0 },
    gems: { type: Number, default: 0 },
    xp: { type: Number, default: 0 },
    items: { type: [String], default: [] },
  },
  read: { type: Boolean, default: false },
  sentAt: { type: Number, required: true },
  expiresAt: { type: Number },
  mailTrigger: { type: String }, // Describes why this mail was sent (e.g., "achievement", "event")
  numberClaimed: { type: Number, default: 0 }, // Defaults to 0, increment when claimed
  achievement: { type: Boolean, default: false }, // Related to achievement
  autoClaim: { type: Boolean, default: false }, // Whether to auto-claim rewards
  date: { type: Date }, // Optional date field for additional context
  targetGroup: { type: [String], default: null },
});

const MailModel: Model<Mail> = mongoose.model<Mail>(
  "Mail",
  mailSchema,
  "mails"
);

export default MailModel;
