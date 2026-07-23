/**
 * routes/publicRoutes.js
 * ------------------------------------------------------------
 * Public, no-login-required pages: home feed, search, sitemap,
 * category listing and individual blog pages.
 * ------------------------------------------------------------
 */

const express = require("express");
const router = express.Router();
const publicController = require("../controllers/publicController");

router.get("/", publicController.home);
router.get("/search", publicController.search);
router.get("/api/search", publicController.apiSearch);
router.get("/about", publicController.about);
router.get("/contact", publicController.contact);
router.get("/documentation", publicController.documentation);
router.get("/privacy", publicController.privacy);
router.get("/terms", publicController.terms);
router.get("/sitemap.xml", publicController.sitemap);
router.get("/category/:slug", publicController.byCategory);
router.get("/blog/:slug", publicController.viewBlog);

module.exports = router;
