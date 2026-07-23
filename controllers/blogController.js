/**
 * controllers/blogController.js
 * ------------------------------------------------------------
 * Member-side blog operations: the personal dashboard, AI
 * generation, manual writing (rich-text), editing and deleting.
 * All content (AI or manual) is sanitised before being stored,
 * and every operation is restricted to the blog's owner.
 * ------------------------------------------------------------
 */

const Blog = require("../models/Blog");
const Category = require("../models/Category");
const { generateBlog } = require("../services/groqService");
const { fetchAndStoreImage, deleteImage } = require("../services/imageService");
const { uniqueSlug } = require("../services/seoService");
const { cleanHtml, makeExcerpt } = require("../services/sanitizeService");

// Personal dashboard — the logged-in user's own blogs, optionally
// filtered by status (all / published / draft / trash).
exports.dashboard = async (req, res) => {
  const statusFilter = ["published", "draft", "trash"].includes(
    req.query.status,
  )
    ? req.query.status
    : "all";
  try {
    const query = { author: req.currentUser._id };
    if (statusFilter !== "all") query.status = statusFilter;

    const [blogs, counts] = await Promise.all([
      Blog.find(query)
        .populate("category", "name")
        .sort({ updatedAt: -1 })
        .lean(),
      Blog.aggregate([
        { $match: { author: req.currentUser._id } },
        { $group: { _id: "$status", n: { $sum: 1 } } },
      ]),
    ]);
    const countMap = Object.fromEntries(counts.map((c) => [c._id, c.n]));
    res.render("member/dashboard", {
      title: "My Dashboard",
      hideFooter: true,
      blogs,
      statusFilter,
      counts: {
        all:
          (countMap.published || 0) +
          (countMap.draft || 0) +
          (countMap.trash || 0),
        published: countMap.published || 0,
        draft: countMap.draft || 0,
        trash: countMap.trash || 0,
      },
    });
  } catch (err) {
    console.error("Dashboard error:", err.message);
    res.render("member/dashboard", {
      title: "My Dashboard",
      hideFooter: true,
      blogs: [],
      statusFilter: "all",
      counts: { all: 0, published: 0, draft: 0, trash: 0 },
    });
  }
};

// Change the status of an owned blog (publish / draft / trash / restore).
exports.changeStatus = async (req, res) => {
  const allowed = ["published", "draft", "trash"];
  const status = allowed.includes(req.body.status) ? req.body.status : null;
  try {
    if (!status) {
      req.flash("error", "Invalid status.");
      return res.redirect("/dashboard");
    }
    const blog = await Blog.findOneAndUpdate(
      { _id: req.params.id, author: req.currentUser._id },
      { status },
    );
    if (!blog) {
      req.flash("error", "Blog not found or permission denied.");
      return res.redirect("/dashboard");
    }
    req.flash("success", `Blog moved to ${status}.`);
    res.redirect(req.get("Referer") || "/dashboard");
  } catch (err) {
    console.error("Change status error:", err.message);
    req.flash("error", "Could not change the status.");
    res.redirect("/dashboard");
  }
};

// Show the AI generation form.
exports.showGenerate = async (req, res) => {
  const categories = await Category.find().sort({ name: 1 }).lean();
  res.render("member/generate", { title: "Generate with AI", categories });
};

// Handle AI generation.
exports.generate = async (req, res) => {
  const { topic, tone, length, categoryId } = req.body;
  if (!topic || topic.trim().length < 3) {
    req.flash("error", "Please enter a topic of at least 3 characters.");
    return res.redirect("/blogs/generate");
  }
  try {
    // 1. Generate content + SEO via Groq.
    const ai = await generateBlog(topic.trim(), { tone, length });
    // 2. Sanitise the AI HTML before storing.
    const safeContent = cleanHtml(ai.contentHtml);
    // 3. Fetch + optimise a cover image (best-effort).
    const cover = await fetchAndStoreImage(ai.keywords[0] || topic.trim());
    // 4. Build a unique slug and save.
    const slug = await uniqueSlug(ai.title);

    const blog = await Blog.create({
      author: req.currentUser._id,
      title: ai.title,
      slug,
      content: safeContent,
      excerpt: makeExcerpt(safeContent),
      coverImage: cover || "",
      category: categoryId || null,
      keywords: ai.keywords,
      metaDescription: ai.metaDescription || makeExcerpt(safeContent),
      source: "ai",
      status: "published",
    });

    req.flash("success", "AI blog generated and published!");
    res.redirect(`/blog/${blog.slug}`);
  } catch (err) {
    console.error("Generate error:", err.message);
    req.flash("error", err.message || "Failed to generate the blog.");
    res.redirect("/blogs/generate");
  }
};

// Show the manual rich-text editor.
exports.showWrite = async (req, res) => {
  const categories = await Category.find().sort({ name: 1 }).lean();
  res.render("member/write", { title: "Write a Blog", categories });
};

// Handle manual blog creation.
exports.createManual = async (req, res) => {
  const { title, content, metaDescription, keywords, categoryId, status } =
    req.body;
  if (
    !title ||
    !content ||
    content.replace(/<[^>]*>/g, "").trim().length < 10
  ) {
    req.flash("error", "Please provide a title and some content.");
    return res.redirect("/blogs/write");
  }
  try {
    const safeContent = cleanHtml(content); // sanitise user HTML
    const slug = await uniqueSlug(title);
    const keywordArr = (keywords || "")
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);

    // Use the title as the image query for a relevant cover.
    const cover = await fetchAndStoreImage(keywordArr[0] || title);

    const blog = await Blog.create({
      author: req.currentUser._id,
      title: title.trim(),
      slug,
      content: safeContent,
      excerpt: makeExcerpt(safeContent),
      coverImage: cover || "",
      category: categoryId || null,
      keywords: keywordArr,
      metaDescription: (metaDescription || makeExcerpt(safeContent)).slice(
        0,
        160,
      ),
      source: "manual",
      status: status === "draft" ? "draft" : "published",
    });

    req.flash("success", "Your blog has been saved.");
    res.redirect(`/blog/${blog.slug}`);
  } catch (err) {
    console.error("Create manual error:", err.message);
    req.flash("error", "Could not save the blog.");
    res.redirect("/blogs/write");
  }
};

// Show the edit form for an owned blog.
exports.showEdit = async (req, res) => {
  try {
    const blog = await Blog.findOne({
      _id: req.params.id,
      author: req.currentUser._id,
    }).lean();
    if (!blog) {
      req.flash(
        "error",
        "Blog not found or you do not have permission to edit it.",
      );
      return res.redirect("/dashboard");
    }
    const categories = await Category.find().sort({ name: 1 }).lean();
    res.render("member/edit", { title: "Edit Blog", blog, categories });
  } catch (err) {
    console.error("Edit form error:", err.message);
    res.redirect("/dashboard");
  }
};

// Handle blog update (owner only).
exports.update = async (req, res) => {
  const { title, content, metaDescription, keywords, categoryId, status } =
    req.body;
  try {
    const blog = await Blog.findOne({
      _id: req.params.id,
      author: req.currentUser._id,
    });
    if (!blog) {
      req.flash("error", "Blog not found or permission denied.");
      return res.redirect("/dashboard");
    }
    const safeContent = cleanHtml(content);
    blog.title = title?.trim() || blog.title;
    blog.content = safeContent;
    blog.excerpt = makeExcerpt(safeContent);
    blog.metaDescription = (metaDescription || makeExcerpt(safeContent)).slice(
      0,
      160,
    );
    blog.keywords = (keywords || "")
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
    blog.category = categoryId || null;
    blog.status = ["draft", "published", "trash"].includes(status)
      ? status
      : blog.status;
    await blog.save();

    req.flash("success", "Blog updated.");
    res.redirect(`/blog/${blog.slug}`);
  } catch (err) {
    console.error("Update error:", err.message);
    req.flash("error", "Could not update the blog.");
    res.redirect("/dashboard");
  }
};

// Handle blog deletion (owner only).
exports.remove = async (req, res) => {
  try {
    const blog = await Blog.findOne({
      _id: req.params.id,
      author: req.currentUser._id,
    });
    if (!blog) {
      req.flash("error", "Blog not found or permission denied.");
      return res.redirect("/dashboard");
    }
    deleteImage(blog.coverImage);
    await blog.deleteOne();
    req.flash("success", "Blog deleted.");
    res.redirect("/dashboard");
  } catch (err) {
    console.error("Delete error:", err.message);
    req.flash("error", "Could not delete the blog.");
    res.redirect("/dashboard");
  }
};
