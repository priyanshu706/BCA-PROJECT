/**
 * config/db.js
 * ------------------------------------------------------------
 * Establishes the MongoDB connection using Mongoose. The
 * connection string is read from the MONGODB_URI environment
 * variable. The application cannot run without a database, so
 * the process exits if the connection fails.
 * ------------------------------------------------------------
 */

const mongoose = require("mongoose");

async function connectDB() {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGODB_URI is not defined in the .env file.");

    await mongoose.connect(uri);
    console.log("✅  MongoDB connected successfully.");
  } catch (error) {
    console.error("❌  MongoDB connection error:", error.message);
    process.exit(1);
  }
}

module.exports = connectDB;
