/**
 * models/Setting.js
 * ------------------------------------------------------------
 * A single (singleton) document that stores system settings an
 * administrator can change at run time from the Admin panel —
 * principally the API keys and the AI model. When a value is
 * present here it overrides the corresponding value from .env,
 * which lets an admin update an expired key without editing
 * files or restarting the server.
 *
 * The fixed key field ensures there is only ever one settings
 * document.
 * ------------------------------------------------------------
 */

const mongoose = require("mongoose");

const settingSchema = new mongoose.Schema(
  {
    key: { type: String, default: "global", unique: true },
    groqApiKey: { type: String, default: "" },
    aiModel: { type: String, default: "" },
    imageProvider: { type: String, default: "" }, // "pexels" or "pixabay"
    imageApiKey: { type: String, default: "" },
    turnstileSiteKey: { type: String, default: "" },
    turnstileSecretKey: { type: String, default: "" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Setting", settingSchema);
