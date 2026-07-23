/**
 * api/index.js
 * ------------------------------------------------------------
 * Entry point used when the project is deployed on Vercel.
 * Vercel does not run a long-lived server, so instead of
 * listening on a port it calls this exported Express app for
 * every incoming request.
 * ------------------------------------------------------------
 */

module.exports = require("../server.js");
