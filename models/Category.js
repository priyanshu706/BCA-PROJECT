/**
 * models/Category.js
 * ------------------------------------------------------------
 * Schema and model for blog categories. Each blog may belong to
 * one category, and each category can contain many blogs
 * (a one-to-many relationship).
 * ------------------------------------------------------------
 */

const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, required: true, unique: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Category", categorySchema);
