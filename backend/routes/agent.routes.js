const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');
const { getAgents, createAgent } = require('../controllers/agent.controller');

/**
 * Agent Routes — mounted at /api/agents in server.js
 * Both routes are protected: verifyToken middleware runs first.
 * An invalid/missing token returns 401 before the controller is ever called.
 */

// GET /api/agents — returns all agents sorted by createdAt ASC (order matters for CSV distribution)
router.get('/', verifyToken, getAgents);

// POST /api/agents — creates a new agent
router.post('/', verifyToken, createAgent);

module.exports = router;
