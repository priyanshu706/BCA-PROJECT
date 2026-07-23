/**
 * middleware/roles.js
 * ------------------------------------------------------------
 * Role-Based Access Control (RBAC).
 *
 * requireAdmin — allows the request to proceed only if the
 * logged-in user has the "admin" role; otherwise it blocks
 * access. This guards every route in the admin panel.
 * ------------------------------------------------------------
 */

function requireAdmin(req, res, next) {
  if (req.currentUser && req.currentUser.role === "admin") return next();
  if (!req.currentUser) {
    req.flash("error", "Please log in as an administrator.");
    return res.redirect("/login");
  }
  // Logged in but not an admin.
  return res.status(403).render("error", {
    title: "Access Denied",
    message: "You do not have permission to access the admin area.",
  });
}

function requireSuperAdmin(req, res, next) {
  if (req.currentUser && req.currentUser.role === "admin" && req.currentUser.isSuperAdmin)
    return next();
  return res.status(403).render("error", {
    title: "Access Denied",
    message: "Only the super administrator can access this page.",
  });
}

module.exports = { requireAdmin, requireSuperAdmin };
