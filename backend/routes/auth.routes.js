const express = require('express');
const router = express.Router();
const { seedAdmin, loginAdmin } = require('../controllers/auth.controller');

/**
 * Auth Routes — mounted at /api/auth in server.js
 *
 * Neither route uses verifyToken middleware because:
 * - /seed-admin must work before any token exists (bootstrap step)
 * - /login IS the authentication step — the token is generated here,
 *   so it cannot also be the thing required to access this route
 */

// POST /api/auth/seed-admin
// Creates the admin user in MongoDB. Call once during initial setup.
router.post('/seed-admin', seedAdmin);

// POST /api/auth/login
// Accepts { email, password }, returns { token, admin: { email } }
router.post('/login', loginAdmin);

module.exports = router;
