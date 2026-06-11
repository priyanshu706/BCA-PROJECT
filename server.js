/**
 * server.js
 * ------------------------------------------------------------
 * Application entry point.
 *
 * Responsibilities:
 *   - load configuration and connect to MongoDB,
 *   - configure Express, the EJS view engine, sessions (stored
 *     in MongoDB), flash messages and static files,
 *   - seed a bootstrap administrator and default categories on
 *     first run,
 *   - mount the public, auth, member and admin routes,
 *   - provide 404 and centralised error handling.
 * ------------------------------------------------------------
 */

require("dotenv").config();

const express = require("express");
const path = require("path");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const flash = require("connect-flash");
const methodOverride = require("method-override");

const connectDB = require("./config/db");
const User = require("./models/User");
const Category = require("./models/Category");
const { loadUser } = require("./middleware/auth");
const { slugify } = require("./services/seoService");

const app = express();
const PORT = process.env.PORT || 3000;

// ---- Database ----
connectDB();

// ---- View engine ----
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ---- Core middleware ----
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method")); // enables PUT/DELETE from forms
app.use(express.static(path.join(__dirname, "public")));

// ---- Sessions (stored in MongoDB; no Redis needed) ----
app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev-secret",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      collectionName: "sessions",
    }),
    cookie: { httpOnly: true, maxAge: 1000 * 60 * 60 * 24 * 7 }, // 7 days
  }),
);

// ---- Flash messages ----
app.use(flash());

// ---- Load the current user and expose flash to every view ----
app.use(loadUser);
app.use(async (req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.query = req.query;
  try {
    const { getEffectiveSettings } = require("./services/settingsService");
    res.locals.turnstileSiteKey = (await getEffectiveSettings()).turnstileSiteKey;
  } catch (e) {
    res.locals.turnstileSiteKey = process.env.TURNSTILE_SITE_KEY || "";
  }
  next();
});

// ---- Routes ----
app.use("/", require("./routes/publicRoutes"));
app.use("/", require("./routes/authRoutes"));
app.get(
  "/dashboard",
  require("./middleware/auth").requireLogin,
  require("./controllers/blogController").dashboard,
);
app.use("/blogs", require("./routes/blogRoutes"));
app.use("/admin", require("./routes/adminRoutes"));

// ---- 404 ----
app.use((req, res) => {
  res
    .status(404)
    .render("error", { title: "Not Found", message: "Page not found (404)." });
});

// ---- Centralised error handler ----
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res
    .status(500)
    .render("error", {
      title: "Server Error",
      message: "Something went wrong on the server.",
    });
});

/**
 * Seeds a bootstrap administrator (from .env) and a set of
 * default categories the first time the application runs.
 */
async function seedInitialData() {
  try {
    const adminEmail = (
      process.env.ADMIN_EMAIL || "admin@blogplatform.local"
    ).toLowerCase();
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (!existingAdmin) {
      const admin = await User.register(
        process.env.ADMIN_NAME || "Super Admin",
        adminEmail,
        process.env.ADMIN_PASSWORD || "Admin@12345",
        "admin",
      );
      admin.isSuperAdmin = true;
      await admin.save();
      console.log(`👑  Bootstrap super admin created: ${adminEmail}`);
    } else if (!existingAdmin.isSuperAdmin) {
      // Upgrade the original bootstrap admin to protected super admin.
      existingAdmin.isSuperAdmin = true;
      existingAdmin.role = "admin";
      await existingAdmin.save();
      console.log(`👑  Existing admin upgraded to super admin: ${adminEmail}`);
    }

    const defaults = [
      "Technology",
      "Business",
      "Education",
      "Lifestyle",
      "General",
    ];
    for (const name of defaults) {
      if (!(await Category.findOne({ name }))) {
        await Category.create({ name, slug: slugify(name) });
      }
    }
  } catch (err) {
    console.error("Seed error:", err.message);
  }
}

// ---- Start ----
app.listen(PORT, async () => {
  await seedInitialData();
  console.log(`🚀  Server running at http://localhost:${PORT}`);
});
