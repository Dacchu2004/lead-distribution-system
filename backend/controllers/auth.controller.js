const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

/**
 * seedAdmin
 *
 * Creates the single admin user in MongoDB if one doesn't exist yet.
 * This is a bootstrap utility — call it once via:
 *   POST /api/auth/seed-admin
 *
 * Design decision — idempotent by design:
 * If the admin already exists, we return 400 (not 500 or 200).
 * This makes it safe to call multiple times in setup scripts without
 * accidentally creating duplicates or throwing cryptic errors.
 * The 400 response is informative — "already done" is a client-correctable state.
 *
 * Credentials hardcoded here intentionally for the machine test:
 *   email: admin@cstch.com
 *   password: Admin@123
 */
const seedAdmin = async (req, res) => {
  try {
    // Check if admin already exists (idempotency check)
    const existingAdmin = await Admin.findOne({ email: 'admin@cstch.com' });

    if (existingAdmin) {
      return res.status(400).json({
        message: 'Admin already seeded. Use POST /api/auth/login to authenticate.',
      });
    }

    // Hash the default password with bcrypt cost factor 10
    // Cost 10 is the industry standard: strong enough for production,
    // fast enough to not time out during a test setup
    const passwordHash = await bcrypt.hash('Admin@123', 10);

    const admin = new Admin({
      email: 'admin@cstch.com',
      passwordHash,
    });

    await admin.save();

    return res.status(201).json({
      message: 'Admin seeded successfully. You can now log in.',
      email: admin.email,
    });
  } catch (error) {
    console.error('seedAdmin error:', error.message);
    return res.status(500).json({
      message: 'Server error while seeding admin',
    });
  }
};

/**
 * loginAdmin
 *
 * Authenticates the admin by verifying email + password against MongoDB.
 * Returns a signed JWT (7-day expiry) on success.
 *
 * Security design — same error message for "not found" and "wrong password":
 * Both cases return 401 { message: 'Invalid credentials' }.
 * If "email not found" returned a distinct message, an attacker could probe
 * the API to enumerate which email addresses are registered — an email
 * enumeration attack. Using the same message for both cases prevents this.
 */
const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate both fields are present before hitting the DB
    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are both required',
      });
    }

    // Find admin by normalized email
    const admin = await Admin.findOne({ email: email.toLowerCase().trim() });

    if (!admin) {
      // Same response as wrong password — prevents email enumeration
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Compare plaintext password against the stored bcrypt hash
    const isMatch = await admin.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Sign JWT with admin identifiers and a 7-day expiry
    // 7 days is long enough for comfortable test use without being insecure
    const token = jwt.sign(
      { adminId: admin._id, email: admin.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      token,
      admin: {
        email: admin.email, // Only return safe fields — never passwordHash
      },
    });
  } catch (error) {
    console.error('loginAdmin error:', error.message);
    return res.status(500).json({
      message: 'Server error during login',
    });
  }
};

module.exports = { seedAdmin, loginAdmin };
