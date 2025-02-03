import { MongoClient, ServerApiVersion } from "mongodb";
import mongoose, { Connection } from "mongoose";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Get the MongoDB URI from the environment variables
const mongoURI: string = process.env.MONGO_URI || "";

const mongoClient = new MongoClient(mongoURI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
const MONGO_URI =
  process.env.MONGO_URI || "your_mongodb_connection_string_here";

export async function connectToDB(): Promise<void> {
  try {
    // Connect using MongoClient
    await mongoClient.connect();
    console.log("Connected to MongoDB (Client)");

    mongoose.connect(MONGO_URI, {
      dbName: "Akaimnky",
    } as mongoose.ConnectOptions);
    mongoose.connection.on("connected", () => {
      console.log("MongoDB connected successfully!");
    });
    mongoose.connection.on("error", (err) => {
      console.error("MongoDB connection error:", err);
    });
    mongoose.set("debug", true); // Log MongoDB queries
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
}

export { mongoClient };
