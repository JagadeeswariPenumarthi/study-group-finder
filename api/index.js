// Vercel serverless entry point.
// Vercel builds everything in the api/ directory into functions regardless
// of the project's framework preset, and vercel.json rewrites all traffic
// here. Express receives the original request path (e.g. /api/groups),
// so all routes in server.js match as written.
const app = require('../server');

module.exports = app;
