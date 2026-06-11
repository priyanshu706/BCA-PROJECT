/**
 * middleware/auth.js
 * ------------------------------------------------------------
 * Authentication middleware.
 *
 *  loadUser       — loads the logged-in user from the database
 *                   on every request and exposes it to views as
 *                   res.locals.currentUser. Also logs out a user
 *                   who has been banned since their last request.
 *  requireLogin   — blocks access unless a user is logged in.
 *  redirectIfAuth — sends logged-in users away from login/register.
 * ------------------------------------------------------------
 */

const User = require("../models/User");

async function loadUser(req, res, next) {
  res.locals.currentUser = null;
  try {
    if (req.session && req.session.userId) {
      const user = await User.findById(req.session.userId).lean();
      // If the account was deleted or banned, end the session.
      if (!user || user.isBanned) {
        req.session.destroy(() => {});
        return next();
      }
      req.currentUser = user;
      res.locals.currentUser = user;
    }
  } catch (err) {
    console.error("loadUser error:", err.message);
  }
  next();
}

function requireLogin(req, res, next) {
  if (req.currentUser) return next();
  req.flash("error", "Please log in to continue.");
  return res.redirect("/login");
}

function redirectIfAuth(req, res, next) {
  if (req.currentUser) return res.redirect("/dashboard");
  return next();
}

module.exports = { loadUser, requireLogin, redirectIfAuth };
