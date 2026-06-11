/**
 * routes/adminRoutes.js
 * ------------------------------------------------------------
 * Admin panel routes. Every route is guarded by requireLogin
 * and then requireAdmin, so only authenticated administrators
 * can reach them. Mounted under /admin.
 * ------------------------------------------------------------
 */

const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { requireLogin } = require("../middleware/auth");
const { requireAdmin, requireSuperAdmin } = require("../middleware/roles");

router.use(requireLogin, requireAdmin);

router.get("/", adminController.dashboard);

// Users
router.get("/users", adminController.users);
router.post("/users/:id/ban", adminController.toggleBan);
router.delete("/users/:id", adminController.deleteUser);
router.post("/admins", requireSuperAdmin, adminController.createAdmin);

// Blogs
router.get("/blogs", adminController.blogs);
router.post("/blogs/:id/status", adminController.changeBlogStatus);
router.delete("/blogs/:id", adminController.deleteBlog);

// Settings (super administrator only)
router.get("/settings", requireSuperAdmin, adminController.showSettings);
router.post("/settings", requireSuperAdmin, adminController.updateSettings);

module.exports = router;
