const mongoose = require('mongoose');

/**
 * ListItem Schema
 * Represents a single row from an uploaded CSV/XLSX file,
 * distributed to a specific agent.
 *
 * Design decision — agentName denormalization:
 * We store agentName directly on each ListItem instead of referencing only agentId.
 * This is a deliberate performance trade-off: reading the distributed lists (GET /api/lists)
 * requires grouping items by agent and showing the agent's name. With only agentId stored,
 * we'd need a .populate('agentId', 'name') call on every read — an extra DB round-trip.
 * Since agent names rarely change (they don't in this app), the denormalized copy is safe
 * and makes reads significantly cheaper.
 *
 * Design decision — uploadBatchId as a timestamp string:
 * Every upload session generates a unique batchId = Date.now().toString().
 * This lets us group items by upload (for the "Total Batches" dashboard stat)
 * and display "by batch" views without a separate UploadSession collection.
 */
const listItemSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
  },
  notes: {
    type: String,
    default: '', // Notes column is optional in the CSV
  },
  // Reference to the Agent document — used for relational integrity
  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent',
    required: [true, 'Agent ID is required'],
  },
  // Denormalized agent name — avoids populate() on every list read
  agentName: {
    type: String,
    required: [true, 'Agent name is required'],
  },
  // Groups all items from the same CSV upload together
  // Format: Date.now().toString() — e.g. "1717142400000"
  uploadBatchId: {
    type: String,
    required: [true, 'Upload batch ID is required'],
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('ListItem', listItemSchema);
