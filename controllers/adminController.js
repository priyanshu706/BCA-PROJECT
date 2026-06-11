/**
 * controllers/adminController.js
 * ------------------------------------------------------------
 * The administrative panel (admin role only). Provides:
 *   - a statistics dashboard,
 *   - user management (list, ban/un-ban, delete, create admin),
 *   - blog moderation (list, delete any blog),
 *   - settings (update API keys and AI model).
 * Every route that reaches this controller has already passed
 * the requireAdmin middleware.
 * ------------------------------------------------------------
 */

const User = require("../models/User");
const Blog = require("../models/Blog");
const { deleteImage } = require("../services/imageService");
const {
  getEffectiveSettings,
  updateSettings,
} = require("../services/settingsService");

// --- Dashboard with platform-wide statistics ---
exports.dashboard = async (req, res) => {
  try {
    const [
      userCount,
      adminCount,
      bannedCount,
      blogCount,
      aiCount,
      manualCount,
      viewsAgg,
      recentBlogs,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "admin" }),
      User.countDocuments({ isBanned: true }),
      Blog.countDocuments(),
      Blog.countDocuments({ source: "ai" }),
      Blog.countDocuments({ source: "manual" }),
      Blog.aggregate([{ $group: { _id: null, total: { $sum: "$views" } } }]),
      Blog.find()
        .populate("author", "name")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

    // Build a 14-day series for the charts (posts created and views gained).
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    since.setDate(since.getDate() - 13);
    const perDay = await Blog.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          posts: { $sum: 1 },
          views: { $sum: "$views" },
        },
      },
    ]);
    const dayMap = Object.fromEntries(perDay.map((d) => [d._id, d]));
    const chart = { labels: [], posts: [], views: [] };
    for (let i = 0; i < 14; i++) {
      const d = new Date(since);
      d.setDate(since.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      const row = dayMap[key];
      chart.labels.push(
        d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      );
      chart.posts.push(row ? row.posts : 0);
      chart.views.push(row ? row.views : 0);
    }

    res.render("admin/dashboard", {
      title: "Admin Dashboard",
      activeNav: "dashboard",
      stats: {
        userCount,
        adminCount,
        bannedCount,
        blogCount,
        aiCount,
        manualCount,
        totalViews: viewsAgg[0]?.total || 0,
      },
      chart,
      recentBlogs,
    });
  } catch (err) {
    console.error("Admin dashboard error:", err.message);
    res.status(500).render("error", {
      title: "Error",
      message: "Could not load the admin dashboard.",
    });
  }
};

// --- List all users with their blog counts ---
exports.users = async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 }).lean();
    // Count blogs per user (one aggregate, then map onto users).
    const counts = await Blog.aggregate([
      { $group: { _id: "$author", n: { $sum: 1 } } },
    ]);
    const countMap = Object.fromEntries(
      counts.map((c) => [c._id.toString(), c.n]),
    );
    users.forEach((u) => {
      u.blogCount = countMap[u._id.toString()] || 0;
    });

    res.render("admin/users", {
      title: "Manage Users",
      activeNav: "users",
      users,
    });
  } catch (err) {
    console.error("Admin users error:", err.message);
    res
      .status(500)
      .render("error", { title: "Error", message: "Could not load users." });
  }
};

// --- Ban / un-ban a user (toggle) ---
exports.toggleBan = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      req.flash("error", "User not found.");
      return res.redirect("/admin/users");
    }
    if (user._id.toString() === req.currentUser._id.toString()) {
      req.flash("error", "You cannot ban your own account.");
      return res.redirect("/admin/users");
    }
    if (user.isSuperAdmin) {
      req.flash("error", "The super administrator cannot be banned.");
      return res.redirect("/admin/users");
    }
    if (user.role === "admin" && !req.currentUser.isSuperAdmin) {
      req.flash(
        "error",
        "Only the super administrator can manage other administrators.",
      );
      return res.redirect("/admin/users");
    }
    user.isBanned = !user.isBanned;
    await user.save();
    req.flash("success", `User ${user.isBanned ? "banned" : "un-banned"}.`);
    res.redirect("/admin/users");
  } catch (err) {
    console.error("Toggle ban error:", err.message);
    req.flash("error", "Could not update the user.");
    res.redirect("/admin/users");
  }
};

// --- Delete a user and all their blogs ---
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      req.flash("error", "User not found.");
      return res.redirect("/admin/users");
    }
    if (user._id.toString() === req.currentUser._id.toString()) {
      req.flash("error", "You cannot delete your own account.");
      return res.redirect("/admin/users");
    }
    if (user.isSuperAdmin) {
      req.flash(
        "error",
        "The super administrator account is protected and cannot be deleted.",
      );
      return res.redirect("/admin/users");
    }
    if (user.role === "admin" && !req.currentUser.isSuperAdmin) {
      req.flash(
        "error",
        "Only the super administrator can remove other administrators.",
      );
      return res.redirect("/admin/users");
    }
    // Remove their blogs (and cover images) too.
    const blogs = await Blog.find({ author: user._id });
    blogs.forEach((b) => deleteImage(b.coverImage));
    await Blog.deleteMany({ author: user._id });
    await user.deleteOne();

    req.flash("success", "User and their blogs were deleted.");
    res.redirect("/admin/users");
  } catch (err) {
    console.error("Delete user error:", err.message);
    req.flash("error", "Could not delete the user.");
    res.redirect("/admin/users");
  }
};

// --- Create a new administrator account ---
exports.createAdmin = async (req, res) => {
  const { name, email, password } = req.body;
  try {
    if (!name || !email || !password || password.length < 6) {
      req.flash(
        "error",
        "Provide a name, email and a password of at least 6 characters.",
      );
      return res.redirect("/admin/settings");
    }
    if (await User.findOne({ email: email.toLowerCase() })) {
      req.flash("error", "A user with this email already exists.");
      return res.redirect("/admin/settings");
    }
    await User.register(name, email, password, "admin");
    req.flash("success", `New administrator "${name}" created.`);
    res.redirect("/admin/settings");
  } catch (err) {
    console.error("Create admin error:", err.message);
    req.flash("error", "Could not create the administrator.");
    res.redirect("/admin/settings");
  }
};

// --- List all blogs for moderation ---
exports.blogs = async (req, res) => {
  try {
    const blogs = await Blog.find()
      .populate("author", "name email")
      .sort({ createdAt: -1 })
      .lean();
    res.render("admin/blogs", {
      title: "Manage Blogs",
      activeNav: "blogs",
      blogs,
    });
  } catch (err) {
    console.error("Admin blogs error:", err.message);
    res
      .status(500)
      .render("error", { title: "Error", message: "Could not load blogs." });
  }
};

// --- Delete any blog (moderation) ---
exports.deleteBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      req.flash("error", "Blog not found.");
      return res.redirect("/admin/blogs");
    }
    deleteImage(blog.coverImage);
    await blog.deleteOne();
    req.flash("success", "Blog deleted.");
    res.redirect("/admin/blogs");
  } catch (err) {
    console.error("Delete blog error:", err.message);
    req.flash("error", "Could not delete the blog.");
    res.redirect("/admin/blogs");
  }
};

// --- Settings page (API keys, model, create-admin form) ---
exports.showSettings = async (req, res) => {
  const settings = await getEffectiveSettings();
  const admins = await User.find({ role: "admin" })
    .select("name email createdAt")
    .lean();
  res.render("admin/settings", {
    title: "Settings",
    activeNav: "settings",
    settings,
    admins,
  });
};

// --- Change the status of any blog (publish / draft / trash) ---
exports.changeBlogStatus = async (req, res) => {
  const allowed = ["published", "draft", "trash"];
  const status = allowed.includes(req.body.status) ? req.body.status : null;
  try {
    if (!status) {
      req.flash("error", "Invalid status.");
      return res.redirect("/admin/blogs");
    }
    const blog = await Blog.findByIdAndUpdate(req.params.id, { status });
    if (!blog) {
      req.flash("error", "Blog not found.");
      return res.redirect("/admin/blogs");
    }
    req.flash("success", `Blog moved to ${status}.`);
    res.redirect("/admin/blogs");
  } catch (err) {
    console.error("Change status error:", err.message);
    req.flash("error", "Could not change the blog status.");
    res.redirect("/admin/blogs");
  }
};

// --- Save updated settings ---
exports.updateSettings = async (req, res) => {
  try {
    await updateSettings({
      groqApiKey: req.body.groqApiKey,
      aiModel: req.body.aiModel,
      imageProvider: req.body.imageProvider,
      imageApiKey: req.body.imageApiKey,
      turnstileSiteKey: req.body.turnstileSiteKey,
      turnstileSecretKey: req.body.turnstileSecretKey,
    });
    req.flash("success", "Settings updated.");
    res.redirect("/admin/settings");
  } catch (err) {
    console.error("Update settings error:", err.message);
    req.flash("error", "Could not update settings.");
    res.redirect("/admin/settings");
  }
};
