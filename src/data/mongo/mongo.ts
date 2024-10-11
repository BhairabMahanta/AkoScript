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

export async function connectToDB(): Promise<Connection | undefined> {
  try {
    // Connect using MongoClient
    await mongoClient.connect();
    console.log("Connected to MongoDB (Client)");

    // Connect using Mongoose
    const db: Connection = mongoose.createConnection(mongoURI, {
      dbName: "Akaimnky",
    });

    // Handle connection events
    db.on("error", console.error.bind(console, "MongoDB connection error:"));
    db.once("open", () => {
      console.log("Connected to MongoDB (Mongoose)");
    });
    return db;
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
}

export { mongoClient };
