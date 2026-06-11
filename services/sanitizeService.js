/**
 * services/sanitizeService.js
 * ------------------------------------------------------------
 * Cleans user-submitted (and AI-generated) HTML before it is
 * stored, so that blog content can be rendered safely without
 * the risk of cross-site scripting (XSS).
 *
 * Only a safe set of formatting tags and attributes is allowed;
 * <script>, event handlers (onclick, etc.) and other dangerous
 * markup are stripped automatically by sanitize-html.
 *
 * It also derives a plain-text excerpt from the cleaned HTML.
 * ------------------------------------------------------------
 */

const sanitizeHtml = require("sanitize-html");

// Tags permitted in blog content (rich text + structure).
const ALLOWED_TAGS = [
  "h1",
  "h2",
  "h3",
  "h4",
  "p",
  "br",
  "hr",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "blockquote",
  "ul",
  "ol",
  "li",
  "a",
  "img",
  "pre",
  "code",
  "span",
  "figure",
  "figcaption",
];

const ALLOWED_ATTRIBUTES = {
  a: ["href", "title", "target", "rel"],
  img: ["src", "alt", "title"],
  span: ["style"],
  "*": ["class"],
};

/** Returns a cleaned, safe version of the supplied HTML. */
function cleanHtml(dirty) {
  return sanitizeHtml(dirty || "", {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    // Only allow http/https/relative links and images.
    allowedSchemes: ["http", "https", "mailto"],
    // Force external links to open safely.
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }),
    },
    // Restrict inline styles to harmless text styling only.
    allowedStyles: {
      "*": {
        "text-align": [/^left$/, /^right$/, /^center$/, /^justify$/],
        color: [/^#(0x)?[0-9a-f]+$/i, /^rgb\(/i],
      },
    },
  });
}

/** Produces a short plain-text excerpt (no HTML) from content. */
function makeExcerpt(html, length = 160) {
  const text = sanitizeHtml(html || "", {
    allowedTags: [],
    allowedAttributes: {},
  })
    .replace(/\s+/g, " ")
    .trim();
  return text.length > length ? text.slice(0, length).trim() + "…" : text;
}

module.exports = { cleanHtml, makeExcerpt };
