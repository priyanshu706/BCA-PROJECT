/**
 * services/groqService.js
 * ------------------------------------------------------------
 * Handles AI content generation through the Groq API.
 *
 * Given a topic (plus tone, length and an optional category), it
 * asks the model to return a blog as structured JSON:
 *   { title, metaDescription, keywords[], contentHtml }
 *
 * The API key and model are read from settingsService, so an
 * administrator can change them at run time. Long-form output
 * (2000+ words) is supported by raising the token limit.
 * ------------------------------------------------------------
 */

const Groq = require("groq-sdk");
const { getEffectiveSettings } = require("./settingsService");

// Map a friendly length choice to an approximate word target and token cap.
const LENGTH_PRESETS = {
  short: { words: "400-500 words", maxTokens: 1500 },
  medium: { words: "700-900 words", maxTokens: 3000 },
  long: { words: "1300-1600 words", maxTokens: 5000 },
  xlong: { words: "2000 words or more", maxTokens: 8000 },
};

function buildPrompt(topic, tone, words) {
  return `You are an expert SEO content writer. Write a complete, original, well-structured blog article on the topic: "${topic}".

Requirements:
- Tone: ${tone || "informative and engaging"}.
- Target length: ${words}.
- Use clean HTML for the body: <h2> and <h3> subheadings, <p> paragraphs, <ul><li> lists and <blockquote> where useful. Do NOT include <html>, <head>, <body> or <h1> tags (the title is returned separately).
- Make it genuinely helpful, accurate, and easy to read, with a clear introduction and conclusion.

Return ONLY valid JSON (no markdown, no backticks, no extra text) in exactly this shape:
{
  "title": "A catchy, SEO-friendly blog title",
  "metaDescription": "A compelling meta description under 160 characters",
  "keywords": ["keyword1","keyword2","keyword3","keyword4","keyword5"],
  "contentHtml": "<h2>...</h2><p>...</p> ... the full article body as HTML ..."
}`;
}

/**
 * Generates a blog article using Groq.
 * @param {string} topic
 * @param {object} options - { tone, length: 'short'|'medium'|'long'|'xlong' }
 * @returns {Promise<{title, metaDescription, keywords, contentHtml}>}
 */
async function generateBlog(topic, options = {}) {
  const settings = await getEffectiveSettings();
  if (!settings.groqApiKey) {
    throw new Error(
      "No Groq API key configured. An administrator can add one in Admin → Settings.",
    );
  }

  const preset = LENGTH_PRESETS[options.length] || LENGTH_PRESETS.medium;
  const groq = new Groq({ apiKey: settings.groqApiKey });

  const completion = await groq.chat.completions.create({
    model: settings.aiModel,
    temperature: 0.7,
    max_tokens: preset.maxTokens,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are a professional blog writer that always responds with a single valid JSON object and nothing else.",
      },
      { role: "user", content: buildPrompt(topic, options.tone, preset.words) },
    ],
  });

  const raw = completion.choices?.[0]?.message?.content || "";

  let data;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    // Recover JSON if the model added stray text around it.
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match)
      throw new Error(
        "The AI returned an unexpected response. Please try again.",
      );
    data = JSON.parse(match[0]);
  }

  return {
    title: (data.title || topic).toString().trim(),
    metaDescription: (data.metaDescription || "")
      .toString()
      .trim()
      .slice(0, 160),
    keywords: Array.isArray(data.keywords)
      ? data.keywords
          .map((k) => k.toString().trim())
          .filter(Boolean)
          .slice(0, 10)
      : [],
    contentHtml: (data.contentHtml || "").toString().trim(),
  };
}

module.exports = { generateBlog };
