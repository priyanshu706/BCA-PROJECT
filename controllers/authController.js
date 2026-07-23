/**
 * controllers/authController.js
 * ------------------------------------------------------------
 * User registration, login and logout.
 * New sign-ups are always created with the "user" role; banned
 * users are prevented from logging in.
 * ------------------------------------------------------------
 */

const User = require("../models/User");
const crypto = require("crypto");
const {
  sendPasswordReset,
  sendWelcome,
  sendLoginAlert,
} = require("../services/mailService");

// Builds the absolute site URL for links in emails.
const siteUrl = (req) => `${req.protocol}://${req.get("host")}`;

exports.showRegister = (req, res) =>
  res.render("auth/auth", { title: "Create Account", mode: "register" });
exports.showLogin = (req, res) =>
  res.render("auth/auth", { title: "Login", mode: "login" });

exports.register = async (req, res) => {
  const { name, email, password, confirmPassword } = req.body;
  try {
    if (!name || !email || !password) {
      req.flash("error", "All fields are required.");
      return res.redirect("/register");
    }
    if (password.length < 6) {
      req.flash("error", "Password must be at least 6 characters long.");
      return res.redirect("/register");
    }
    if (password !== confirmPassword) {
      req.flash("error", "Passwords do not match.");
      return res.redirect("/register");
    }
    if (await User.findOne({ email: email.toLowerCase() })) {
      req.flash("error", "An account with this email already exists.");
      return res.redirect("/register");
    }

    const user = await User.register(name, email, password, "user");
    req.session.userId = user._id;

    // Send a welcome email (fire-and-forget; never block sign-up on it).
    sendWelcome(user.email, user.name, siteUrl(req)).catch((e) =>
      console.error("Welcome email failed:", e.message),
    );

    req.flash("success", `Welcome, ${user.name}! Your account is ready.`);
    res.redirect("/dashboard");
  } catch (err) {
    console.error("Registration error:", err.message);
    req.flash("error", "Something went wrong during registration.");
    res.redirect("/register");
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email: (email || "").toLowerCase() });
    if (!user || !(await user.verifyPassword(password))) {
      req.flash("error", "Invalid email or password.");
      return res.redirect("/login");
    }
    if (user.isBanned) {
      req.flash(
        "error",
        "This account has been banned. Please contact the administrator.",
      );
      return res.redirect("/login");
    }

    req.session.userId = user._id;

    // Send a login-alert email (fire-and-forget).
    sendLoginAlert(user.email, user.name, {
      time: new Date().toLocaleString(),
      ip:
        (req.headers["x-forwarded-for"] || req.ip || "")
          .toString()
          .split(",")[0]
          .trim() || "Unknown",
      device: req.get("user-agent") || "Unknown",
      siteUrl: siteUrl(req),
    }).catch((e) => console.error("Login alert email failed:", e.message));

    req.flash("success", `Welcome back, ${user.name}!`);
    // Admins land in the admin panel; members on their dashboard.
    res.redirect(user.role === "admin" ? "/admin" : "/dashboard");
  } catch (err) {
    console.error("Login error:", err.message);
    req.flash("error", "Something went wrong during login.");
    res.redirect("/login");
  }
};

// --- Forgot password: email a hashed reset link ---
exports.forgotPassword = async (req, res) => {
  const email = (req.body.email || "").toLowerCase().trim();
  try {
    const user = await User.findOne({ email });
    if (!user) {
      req.flash("error", "No account exists with that email address.");
      return res.redirect("/login");
    }

    // Raw token goes in the email; only its hash is stored.
    const rawToken = crypto.randomBytes(32).toString("hex");
    user.resetTokenHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");
    user.resetTokenExpiry = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save();

    const link = `${req.protocol}://${req.get("host")}/reset-password/${rawToken}`;
    try {
      await sendPasswordReset(user.email, user.name, link);
    } catch (mailErr) {
      console.error("Email send failed:", mailErr.message);
      req.flash(
        "error",
        "Could not send the email. Please check the mail settings or try again later.",
      );
      return res.redirect("/login");
    }

    req.flash("success", "A password reset link has been sent to your email.");
    res.redirect("/login");
  } catch (err) {
    console.error("Forgot password error:", err.message);
    req.flash("error", "Something went wrong. Please try again.");
    res.redirect("/login");
  }
};

// Helper: find a user by a valid (unexpired) reset token.
async function findByToken(rawToken) {
  const hash = crypto.createHash("sha256").update(rawToken).digest("hex");
  return User.findOne({
    resetTokenHash: hash,
    resetTokenExpiry: { $gt: Date.now() },
  });
}

// --- Show the "set a new password" page ---
exports.showReset = async (req, res) => {
  try {
    const user = await findByToken(req.params.token);
    if (!user) {
      req.flash(
        "error",
        "This reset link is invalid or has expired. Please request a new one.",
      );
      return res.redirect("/login");
    }
    res.render("auth/reset", {
      title: "Set New Password",
      token: req.params.token,
    });
  } catch (err) {
    console.error("Show reset error:", err.message);
    res.redirect("/login");
  }
};

// --- Save the new password ---
exports.resetPassword = async (req, res) => {
  const { password, confirmPassword } = req.body;
  const backToForm = () => res.redirect(`/reset-password/${req.params.token}`);
  try {
    const user = await findByToken(req.params.token);
    if (!user) {
      req.flash("error", "This reset link is invalid or has expired.");
      return res.redirect("/login");
    }
    if (!password || password.length < 6) {
      req.flash("error", "Password must be at least 6 characters long.");
      return backToForm();
    }
    if (password !== confirmPassword) {
      req.flash("error", "Passwords do not match.");
      return backToForm();
    }
    await user.setPassword(password);
    user.resetTokenHash = null;
    user.resetTokenExpiry = null;
    await user.save();

    req.flash("success", "Your password has been updated. Please log in.");
    res.redirect("/login");
  } catch (err) {
    console.error("Reset password error:", err.message);
    req.flash("error", "Could not reset the password. Please try again.");
    res.redirect("/login");
  }
};

exports.logout = (req, res) => {
  req.session.destroy(() => res.redirect("/"));
};
