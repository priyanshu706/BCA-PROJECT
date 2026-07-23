/**
 * services/settingsService.js
 * ------------------------------------------------------------
 * Central place to read and update system settings (API keys
 * and AI model). Values stored in the database (set by an admin
 * from the Settings page) take precedence over the defaults in
 * the .env file. This lets an administrator rotate an expired
 * key at run time without editing files.
 * ------------------------------------------------------------
 */

const Setting = require("../models/Setting");

/** Returns the singleton settings document, creating it if needed. */
async function getSettingDoc() {
  let doc = await Setting.findOne({ key: "global" });
  if (!doc) doc = await Setting.create({ key: "global" });
  return doc;
}

/**
 * Returns the effective settings: a DB value if present,
 * otherwise the corresponding .env default.
 */
async function getEffectiveSettings() {
  const doc = await getSettingDoc();
  return {
    groqApiKey: doc.groqApiKey || process.env.GROQ_API_KEY || "",
    aiModel: doc.aiModel || process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
    imageProvider: (
      doc.imageProvider ||
      process.env.IMAGE_PROVIDER ||
      "pexels"
    ).toLowerCase(),
    imageApiKey: doc.imageApiKey || process.env.IMAGE_API_KEY || "",
    turnstileSiteKey:
      doc.turnstileSiteKey || process.env.TURNSTILE_SITE_KEY || "",
    turnstileSecretKey:
      doc.turnstileSecretKey || process.env.TURNSTILE_SECRET_KEY || "",
  };
}

/** Updates the settings document with the admin-provided values. */
async function updateSettings(values) {
  const doc = await getSettingDoc();
  if (values.groqApiKey !== undefined)
    doc.groqApiKey = values.groqApiKey.trim();
  if (values.aiModel !== undefined) doc.aiModel = values.aiModel.trim();
  if (values.imageProvider !== undefined)
    doc.imageProvider = values.imageProvider.trim();
  if (values.imageApiKey !== undefined)
    doc.imageApiKey = values.imageApiKey.trim();
  if (values.turnstileSiteKey !== undefined)
    doc.turnstileSiteKey = values.turnstileSiteKey.trim();
  if (values.turnstileSecretKey !== undefined)
    doc.turnstileSecretKey = values.turnstileSecretKey.trim();
  await doc.save();
  return doc;
}

module.exports = { getSettingDoc, getEffectiveSettings, updateSettings };
