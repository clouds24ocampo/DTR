import mongoose from "mongoose";

const connectToMongoDB = async () => {
  try {
    const uri = process.env.MONGO_DB_URI as string;
    if (!uri) {
      throw new Error("MONGO_DB_URI is not set in .env");
    }
    const maskedUri = uri.replace(/\/\/.*:.*@/, "//<credentials>@");
    console.log(`Connecting to MongoDB at: ${maskedUri}`);
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    console.log("Connected to MongoDB");
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.log("Error connecting to MongoDB:", error.message);
    } else {
      console.log("Unknown error connecting to MongoDB");
    }
    throw error;
  }
};

export default connectToMongoDB;
