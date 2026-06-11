/**
 * services/seoService.js
 * ------------------------------------------------------------
 * SEO helper utilities used across the platform:
 *   slugify()    — create a clean, URL-friendly slug
 *   uniqueSlug() — guarantee the slug is unique in the database
 *   buildMeta()  — assemble per-page SEO metadata (title,
 *                  description, keywords, Open Graph fields)
 *   buildSitemap() — build the XML sitemap of published blogs
 * ------------------------------------------------------------
 */

const Blog = require("../models/Blog");

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

async function uniqueSlug(title) {
  const base = slugify(title) || "post";
  let slug = base;
  while (await Blog.exists({ slug })) {
    slug = `${base}-${Math.random().toString(36).substring(2, 6)}`;
  }
  return slug;
}

/** Builds the SEO/Open Graph meta object used by the head partial. */
function buildMeta(blog, baseUrl) {
  const description = blog.metaDescription || blog.excerpt || blog.title;
  return {
    title: blog.title,
    description,
    keywords: (blog.keywords || []).join(", "),
    ogTitle: blog.title,
    ogDescription: description,
    ogImage: blog.coverImage ? baseUrl + blog.coverImage : "",
    ogType: "article",
    canonical: `${baseUrl}/blog/${blog.slug}`,
  };
}

/** Generates an XML sitemap string for all published blogs. */
async function buildSitemap(baseUrl) {
  const blogs = await Blog.find({ status: "published" })
    .select("slug updatedAt")
    .lean();
  const urls = blogs
    .map(
      (b) =>
        `  <url><loc>${baseUrl}/blog/${b.slug}</loc><lastmod>${new Date(b.updatedAt).toISOString()}</lastmod></url>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${baseUrl}/</loc></url>
${urls}
</urlset>`;
}

module.exports = { slugify, uniqueSlug, buildMeta, buildSitemap };
