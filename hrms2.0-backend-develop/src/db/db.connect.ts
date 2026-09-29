import mongoose from "mongoose";

const connectToMongoDB = async () => {
  try {
    const uri = process.env.MONGO_DB_URI as string;
    const maskedUri = uri.replace(/\/\/.*:.*@/, "//<credentials>@");
    console.log(`Connecting to MongoDB at: ${maskedUri}`);
    await mongoose.connect(uri);
    console.log("Connected to MongoDB");
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.log("Error connecting to MongoDB:", error.message);
    } else {
      console.log("Unknown error connecting to MongoDB");
    }
  }
};

export default connectToMongoDB;
