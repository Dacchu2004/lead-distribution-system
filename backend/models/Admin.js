const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * Admin Schema
 *
 * Design decision — passwordHash vs password:
 * We store ONLY the hash, never the plaintext. By naming the field
 * `passwordHash` (not `password`), it becomes nearly impossible to
 * accidentally return it in a JSON response — the name itself signals
 * "this is not human-readable, don't expose this."
 *
 * We do NOT use a pre-save hook to auto-hash here. The seedAdmin controller
 * sets passwordHash directly after calling bcrypt.hash(), which is explicit
 * and readable. A hook would hide the hashing from anyone reading the controller,
 * making the code harder to audit.
 *
 * No timestamps — there is exactly one admin and they never change.
 */
const adminSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true, // Normalize on write so lookups are case-insensitive
    trim: true,
  },
  passwordHash: {
    type: String,
    required: [true, 'Password hash is required'],
  },
});

/**
 * comparePassword (instance method)
 * Wraps bcrypt.compare() so controllers don't need to import bcrypt themselves.
 * Returns Promise<boolean> — true if plaintext matches the stored hash.
 *
 * @param {string} plainTextPassword - The raw password from the login form
 * @returns {Promise<boolean>}
 */
adminSchema.methods.comparePassword = async function (plainTextPassword) {
  return bcrypt.compare(plainTextPassword, this.passwordHash);
};

module.exports = mongoose.model('Admin', adminSchema);
