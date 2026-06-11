/**
 * controllers/publicController.js
 * ------------------------------------------------------------
 * The public-facing side of the website that any visitor can
 * use without logging in: the blog feed (home), individual blog
 * pages, search, category listing and the XML sitemap.
 * Only blogs with status "published" are shown publicly.
 * ------------------------------------------------------------
 */

const Blog = require("../models/Blog");
const Category = require("../models/Category");
const { buildMeta, buildSitemap } = require("../services/seoService");

// Helper to build the absolute base URL of the current request.
const baseUrl = (req) => `${req.protocol}://${req.get("host")}`;

// Home page — paginated feed of published blogs.
exports.home = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const perPage = 9;
    const filter = { status: "published" };

    const [blogs, total, categories, recent] = await Promise.all([
      Blog.find(filter)
        .populate("author", "name")
        .populate("category", "name slug")
        .sort({ createdAt: -1 })
        .skip((page - 1) * perPage)
        .limit(perPage)
        .lean(),
      Blog.countDocuments(filter),
      Category.find().sort({ name: 1 }).lean(),
      Blog.find({ status: "published" })
        .select("title slug")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

    res.render("public/home", {
      title: "Home",
      blogs,
      categories,
      page,
      totalPages: Math.ceil(total / perPage),
      sidebarCategories: categories,
      sidebarRecent: recent,
    });
  } catch (err) {
    console.error("Home error:", err.message);
    res
      .status(500)
      .render("error", {
        title: "Error",
        message: "Could not load the home page.",
      });
  }
};

// Single public blog page (by slug).
exports.viewBlog = async (req, res) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug })
      .populate("author", "name")
      .populate("category", "name slug")
      .lean();

    if (!blog) {
      return res
        .status(404)
        .render("error", { title: "Not Found", message: "Blog not found." });
    }

    const isOwner =
      req.currentUser &&
      blog.author._id.toString() === req.currentUser._id.toString();
    const isAdmin = req.currentUser && req.currentUser.role === "admin";

    // Unpublished blogs are visible only to their author or an admin.
    if (blog.status !== "published" && !isOwner && !isAdmin) {
      return res
        .status(404)
        .render("error", { title: "Not Found", message: "Blog not found." });
    }

    // Only count a view on a genuinely public read.
    if (blog.status === "published" && !isOwner) {
      await Blog.updateOne({ _id: blog._id }, { $inc: { views: 1 } });
      blog.views += 1;
    }

    const [categories, recent] = await Promise.all([
      Category.find().sort({ name: 1 }).lean(),
      Blog.find({ status: "published", _id: { $ne: blog._id } })
        .select("title slug")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

    res.render("public/blog", {
      title: blog.title,
      blog,
      meta: buildMeta(blog, baseUrl(req)),
      isOwner,
      sidebarCategories: categories,
      sidebarRecent: recent,
    });
  } catch (err) {
    console.error("View blog error:", err.message);
    res
      .status(500)
      .render("error", { title: "Error", message: "Could not load the blog." });
  }
};

// Full-text-style search with advanced filters (category, source, sort).
exports.search = async (req, res) => {
  const q = (req.query.q || "").trim();
  const categoryId = (req.query.category || "").trim();
  const source = (req.query.source || "").trim(); // '', 'ai', 'manual'
  const sort = (req.query.sort || "newest").trim();
  try {
    const categories = await Category.find().sort({ name: 1 }).lean();

    // Build the filter only when at least one criterion is supplied.
    const hasCriteria = q || categoryId || source;
    let blogs = [];
    if (hasCriteria) {
      const filter = { status: "published" };
      if (q) {
        const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
        filter.$or = [
          { title: regex },
          { excerpt: regex },
          { keywords: regex },
        ];
      }
      if (categoryId) filter.category = categoryId;
      if (source === "ai" || source === "manual") filter.source = source;

      const sortMap = {
        newest: { createdAt: -1 },
        oldest: { createdAt: 1 },
        popular: { views: -1 },
      };
      blogs = await Blog.find(filter)
        .populate("author", "name")
        .sort(sortMap[sort] || sortMap.newest)
        .limit(50)
        .lean();
    }

    res.render("public/search", {
      title: q ? `Search: ${q}` : "Advanced Search",
      q,
      categoryId,
      source,
      sort,
      categories,
      blogs,
      hasCriteria,
    });
  } catch (err) {
    console.error("Search error:", err.message);
    res
      .status(500)
      .render("error", { title: "Error", message: "Search failed." });
  }
};

// --- Live search API (returns JSON for as-you-type search) ---
exports.apiSearch = async (req, res) => {
  const q = (req.query.q || "").trim();
  try {
    if (q.length < 2) return res.json([]);
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const blogs = await Blog.find({
      status: "published",
      $or: [{ title: regex }, { excerpt: regex }, { keywords: regex }],
    })
      .select("title slug excerpt")
      .sort({ createdAt: -1 })
      .limit(6)
      .lean();
    res.json(
      blogs.map((b) => ({ title: b.title, slug: b.slug, excerpt: b.excerpt })),
    );
  } catch (err) {
    console.error("API search error:", err.message);
    res.json([]);
  }
};

// --- Static content pages ---
exports.about = (req, res) => res.render("public/about", { title: "About Us" });
exports.contact = (req, res) =>
  res.render("public/contact", { title: "Contact" });
exports.documentation = (req, res) =>
  res.render("public/documentation", { title: "Documentation" });
exports.privacy = (req, res) =>
  res.render("public/legal", {
    title: "Privacy Policy",
    heading: "Privacy Policy",
    body: "This website is an academic project. It stores only the information you provide (name, email and the blogs you create) in order to operate the service. Passwords are stored only as secure hashes. Data is not sold or shared with third parties, and is used solely to run the platform.",
  });
exports.terms = (req, res) =>
  res.render("public/legal", {
    title: "Terms of Use",
    heading: "Terms of Use",
    body: "This platform is provided for educational and demonstration purposes as part of a BCA final-semester project. By using it you agree to publish only lawful content. AI-generated content should be reviewed before publishing. The author is not liable for any content created by users of the platform.",
  });

// Blogs filtered by category slug.
exports.byCategory = async (req, res) => {
  try {
    const category = await Category.findOne({ slug: req.params.slug }).lean();
    if (!category) {
      return res
        .status(404)
        .render("error", {
          title: "Not Found",
          message: "Category not found.",
        });
    }
    const blogs = await Blog.find({
      status: "published",
      category: category._id,
    })
      .populate("author", "name")
      .sort({ createdAt: -1 })
      .lean();
    res.render("public/category", { title: category.name, category, blogs });
  } catch (err) {
    console.error("Category error:", err.message);
    res
      .status(500)
      .render("error", {
        title: "Error",
        message: "Could not load the category.",
      });
  }
};

// XML sitemap for search engines.
exports.sitemap = async (req, res) => {
  try {
    const xml = await buildSitemap(baseUrl(req));
    res.header("Content-Type", "application/xml").send(xml);
  } catch (err) {
    console.error("Sitemap error:", err.message);
    res.status(500).send("Could not generate sitemap.");
  }
};
