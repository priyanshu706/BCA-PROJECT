/**
 * models/User.js
 * ------------------------------------------------------------
 * Schema and model for application users.
 *
 *  - role     : "user" (member) or "admin" — drives role-based
 *               access control throughout the application.
 *  - isBanned : when true the user cannot log in or post.
 *
 * Passwords are never stored in plain text; only a bcrypt hash
 * is kept in the passwordHash field.
 * ------------------------------------------------------------
 */

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Name is required"], trim: true },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
    },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    isSuperAdmin: { type: Boolean, default: false },
    isBanned: { type: Boolean, default: false },

    // Password-reset (hashed token + expiry). Never store the raw token.
    resetTokenHash: { type: String, default: null },
    resetTokenExpiry: { type: Date, default: null },
  },
  { timestamps: true },
);

/**
 * Registers a new user, hashing the plain password first.
 * @param {string} role - "user" or "admin"
 */
userSchema.statics.register = async function (
  name,
  email,
  password,
  role = "user",
) {
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);
  return this.create({ name, email, passwordHash, role });
};

/** Verifies a plain password against the stored hash. */
userSchema.methods.verifyPassword = function (password) {
  return bcrypt.compare(password, this.passwordHash);
};

/** Hashes and sets a new password (used by the reset flow). */
userSchema.methods.setPassword = async function (password) {
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(password, salt);
};

module.exports = mongoose.model("User", userSchema);
