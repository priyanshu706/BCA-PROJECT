const axios = require("axios");
const { getEffectiveSettings } = require("./settingsService");

async function searchImageUrl(query, settings) {
  if (!settings.imageApiKey) return null;

  try {
    if (settings.imageProvider === "pixabay") {
      const res = await axios.get("https://pixabay.com/api/", {
        params: {
          key: settings.imageApiKey,
          q: query,
          image_type: "photo",
          per_page: 3,
          safesearch: true,
        },
      });

      return res.data?.hits?.[0]?.largeImageURL || null;
    }

    const res = await axios.get("https://api.pexels.com/v1/search", {
      headers: {
        Authorization: settings.imageApiKey,
      },
      params: {
        query,
        per_page: 1,
        orientation: "landscape",
      },
    });

    return res.data?.photos?.[0]?.src?.large || null;
  } catch (err) {
    console.error("Image search failed:", err.message);
    return null;
  }
}

async function fetchAndStoreImage(query) {
  const settings = await getEffectiveSettings();
  return searchImageUrl(query, settings);
}

function deleteImage() {
  // nothing to delete when using remote URLs
}

module.exports = {
  fetchAndStoreImage,
  deleteImage,
};