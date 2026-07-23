/**
 * routes/blogRoutes.js
 * ------------------------------------------------------------
 * Member-only routes for creating and managing blogs. All are
 * protected by requireLogin. Mounted under /blogs.
 * ------------------------------------------------------------
 */

const express = require("express");
const router = express.Router();
const blogController = require("../controllers/blogController");
const { requireLogin } = require("../middleware/auth");

router.use(requireLogin); // every route below requires login

router.get("/generate", blogController.showGenerate);
router.post("/generate", blogController.generate);

router.get("/write", blogController.showWrite);
router.post("/write", blogController.createManual);

router.get("/:id/edit", blogController.showEdit);
router.put("/:id", blogController.update);
router.post("/:id/status", blogController.changeStatus);
router.delete("/:id", blogController.remove);

module.exports = router;
