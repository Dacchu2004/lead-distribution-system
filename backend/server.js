// ─── Load environment variables FIRST ─────────────────────────────────────────
// Must be the very first line before any other module reads process.env.
// dotenv reads .env from the current working directory (the backend/ folder).
require('dotenv').config();

const express = require('express');
const cors = require('cors');

// Database connection utility
const connectDB = require('./config/db');

// Route modules
const authRoutes = require('./routes/auth.routes');
const agentRoutes = require('./routes/agent.routes');
const listRoutes = require('./routes/list.routes');

const app = express();
const PORT = process.env.PORT || 5000;

/**
 * Connect to MongoDB at startup — before any routes are registered.
 *
 * Design decision — connect once at startup, not per request:
 * mongoose.connect() creates a connection POOL that Express reuses
 * for every incoming request. If we called it inside a route handler,
 * we'd open a new connection on every HTTP request — extremely expensive
 * and a common cause of "too many connections" errors in production.
 * Calling it here ensures one pool is ready before the server starts accepting traffic.
 */
connectDB();

// ─── Global Middleware ─────────────────────────────────────────────────────────

/**
 * CORS — Cross-Origin Resource Sharing
 * Allows the React frontend (localhost:5173 — Vite's default port) to send
 * requests to this Express API (localhost:5000).
 * Without this header, browsers block cross-origin requests entirely.
 * credentials: true enables sending cookies/auth headers cross-origin if needed.
 */
app.use(
  cors({
    origin: 'http://localhost:5173',
    credentials: true,
  })
);

// Parse JSON bodies — required to read req.body in controllers
app.use(express.json());

// ─── Routes ────────────────────────────────────────────────────────────────────

// Health check — evaluators can hit GET / to confirm the API is running
app.get('/', (req, res) => {
  res.json({ message: 'CSTech MERN API running ✅' });
});

// Feature routes
app.use('/api/auth', authRoutes);     // Login + admin seed
app.use('/api/agents', agentRoutes);  // Agent CRUD (protected)
app.use('/api/lists', listRoutes);    // CSV upload + distribution (protected)

// ─── 404 Handler ───────────────────────────────────────────────────────────────
// Catches any request that didn't match a route above.
// Important: must be placed AFTER all route registrations.
app.use((req, res) => {
  res.status(404).json({
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// ─── Global Error Handler ──────────────────────────────────────────────────────
// Express identifies error-handling middleware by its 4-parameter signature.
// Controllers can pass errors here via next(error) instead of writing
// try/catch in every route. Also catches errors thrown by middleware (e.g. multer).
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
  });
});

// ─── Start Server ──────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
});
