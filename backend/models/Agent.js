const mongoose = require('mongoose');

/**
 * Agent Schema
 *
 * Design decision — no pre-save hook for password hashing:
 * Hashing is done explicitly in the createAgent controller with
 * `bcrypt.hash(password, 10)` before passing `passwordHash` to the model.
 * This keeps the model as a pure data shape — anyone reading the controller
 * immediately sees the security step without needing to know about hooks.
 *
 * Design decision — mobile stored as String (not Number):
 * Phone numbers can have leading zeros and country code variations.
 * Storing as String preserves the exact digits entered and avoids
 * silent truncation or scientific notation for large numbers.
 *
 * timestamps: true adds createdAt and updatedAt automatically.
 * createdAt is CRITICAL — agents are sorted by createdAt ASC when
 * distributing uploaded list items, so the order they were added matters.
 */
const agentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Agent name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    mobile: {
      type: String,
      required: [true, 'Mobile number is required'],
      // Store digits only — display formatting is handled on the frontend
    },
    countryCode: {
      type: String,
      required: [true, 'Country code is required'],
      default: '+91',
    },
    passwordHash: {
      type: String,
      required: [true, 'Password is required'],
    },
  },
  {
    timestamps: true, // Auto-injects createdAt + updatedAt
  }
);

module.exports = mongoose.model('Agent', agentSchema);
