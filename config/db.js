/**
 * config/db.js
 * ------------------------------------------------------------
 * Opens the MongoDB connection using Mongoose. The connection
 * string is read from the MONGODB_URI environment variable.
 *
 * The connection is cached and reused. On a normal server this
 * simply means we connect once. On a serverless host (Vercel)
 * the same running instance can handle many requests, so the
 * cache stops us from opening a new connection every time.
 * ------------------------------------------------------------
 */

const mongoose = require("mongoose");

// Keep the connection on the global object so it survives
// between requests on the same instance.
let cache = global.__mongooseCache;
if (!cache) cache = global.__mongooseCache = { conn: null, promise: null };

async function connectDB() {
  if (cache.conn) return cache.conn;

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set.");

  if (!cache.promise) {
    cache.promise = mongoose
      .connect(uri, { serverSelectionTimeoutMS: 8000 })
      .then((m) => {
        console.log("MongoDB connected successfully.");
        return m;
      })
      .catch((err) => {
        cache.promise = null; // allow a retry on the next request
        throw err;
      });
  }

  cache.conn = await cache.promise;
  return cache.conn;
}

module.exports = connectDB;
