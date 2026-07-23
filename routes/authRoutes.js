/**
 * routes/authRoutes.js — registration, login, logout and
 * password reset. Public POST forms are protected by Cloudflare
 * Turnstile verification.
 */

const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { redirectIfAuth, requireLogin } = require("../middleware/auth");
const { verifyTurnstile } = require("../middleware/turnstile");

router.get("/register", redirectIfAuth, authController.showRegister);
router.post(
  "/register",
  redirectIfAuth,
  verifyTurnstile,
  authController.register,
);

router.get("/login", redirectIfAuth, authController.showLogin);
router.post("/login", redirectIfAuth, verifyTurnstile, authController.login);

router.post(
  "/forgot-password",
  redirectIfAuth,
  verifyTurnstile,
  authController.forgotPassword,
);
router.get("/reset-password/:token", redirectIfAuth, authController.showReset);
router.post(
  "/reset-password/:token",
  redirectIfAuth,
  verifyTurnstile,
  authController.resetPassword,
);

router.post("/logout", requireLogin, authController.logout);

module.exports = router;
