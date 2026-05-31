const bcrypt = require('bcryptjs');
const Agent = require('../models/Agent');

/**
 * getAgents
 * Returns all agents sorted by createdAt ASC.
 *
 * Sort order is CRITICAL for Part 3 (CSV distribution): agents are sorted
 * oldest-first so the distribution is deterministic — the first agent created
 * always gets the first batch of items. -passwordHash strips the hash from
 * every document before it leaves the server.
 */
const getAgents = async (req, res) => {
  try {
    const agents = await Agent.find()
      .select('-passwordHash') // Never expose password hashes in API responses
      .sort({ createdAt: 1 }); // ASC — oldest agent first (matters for distribution)

    return res.status(200).json({ agents });
  } catch (error) {
    console.error('getAgents error:', error.message);
    return res.status(500).json({ message: 'Server error while fetching agents' });
  }
};

/**
 * createAgent
 * Validates input, checks for duplicate email, hashes the password,
 * saves the agent, and returns the created record without the password hash.
 *
 * Design decision — hash in controller, not model hook:
 * Explicit is better than implicit. Any developer reading createAgent()
 * immediately sees `bcrypt.hash(password, 10)` — the security step is
 * right there, not hidden inside a Mongoose pre-save hook. This makes
 * the code more auditable and the intent clearer for the whole team.
 */
const createAgent = async (req, res) => {
  try {
    const { name, email, mobile, countryCode, password } = req.body;

    // Validate all required fields are present
    if (!name) return res.status(400).json({ message: 'Name is required' });
    if (!email) return res.status(400).json({ message: 'Email is required' });
    if (!mobile) return res.status(400).json({ message: 'Mobile number is required' });
    if (!countryCode) return res.status(400).json({ message: 'Country code is required' });
    if (!password) return res.status(400).json({ message: 'Password is required' });
    if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' });

    // Check for duplicate email (normalized)
    const normalizedEmail = email.toLowerCase().trim();
    const existing = await Agent.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(400).json({ message: 'An agent with this email already exists' });
    }

    // Hash password explicitly — cost factor 10 is industry standard
    const passwordHash = await bcrypt.hash(password, 10);

    const agent = new Agent({
      name: name.trim(),
      email: normalizedEmail,
      mobile,
      countryCode,
      passwordHash,
    });

    await agent.save();

    // Return only safe fields — passwordHash is excluded from the response
    return res.status(201).json({
      agent: {
        _id: agent._id,
        name: agent.name,
        email: agent.email,
        mobile: agent.mobile,
        countryCode: agent.countryCode,
        createdAt: agent.createdAt,
      },
      message: `Agent ${agent.name} created successfully`,
    });
  } catch (error) {
    console.error('createAgent error:', error.message);
    return res.status(500).json({ message: 'Server error while creating agent' });
  }
};

module.exports = { getAgents, createAgent };