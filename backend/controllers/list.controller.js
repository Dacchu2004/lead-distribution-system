const fs = require('fs');
const path = require('path');
const csvParser = require('csv-parser');
const xlsx = require('xlsx');
const Agent = require('../models/Agent');
const ListItem = require('../models/ListItem');

/**
 * uploadAndDistribute
 *
 * Accepts a CSV/XLSX/XLS file, validates it, parses every row,
 * distributes rows equally among exactly 5 agents, bulk-inserts to MongoDB,
 * deletes the temp file, and returns a distribution summary.
 *
 * Distribution algorithm:
 *   base      = Math.floor(N / 5)   — guaranteed items per agent
 *   remainder = N % 5               — extra items for the first `remainder` agents
 *
 * Agents are sorted by createdAt ASC so the first agent created always
 * gets index 0, making distribution deterministic and reproducible.
 */
const uploadAndDistribute = async (req, res) => {
  // Helper: safely delete the temp upload file without crashing if it's gone
  const cleanupFile = (filePath) => {
    try {
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (e) {
      console.warn('Could not delete temp file:', e.message);
    }
  };

  // Guard: multer puts the file on req.file — if missing, nothing was uploaded
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const filePath = req.file.path;
  const ext = path.extname(req.file.originalname).toLowerCase();

  try {
    // ── Step 1: Fetch agents (exactly 5 required) ───────────────────────
    const agents = await Agent.find()
      .select('name _id')
      .sort({ createdAt: 1 }) // ASC — distribution order matches creation order
      .limit(5);

    if (agents.length < 5) {
      cleanupFile(filePath);
      return res.status(400).json({
        message: `Exactly 5 agents required before uploading. Currently have ${agents.length} agent(s). Please add ${5 - agents.length} more.`,
      });
    }

    // ── Step 2: Parse file based on extension ───────────────────────────
    let rows = [];

    if (ext === '.csv') {
      // Stream-based CSV parsing — handles large files without loading all into memory
      rows = await new Promise((resolve, reject) => {
        const results = [];
        fs.createReadStream(filePath)
          .pipe(csvParser())
          .on('data', (row) => results.push(row))
          .on('end', () => resolve(results))
          .on('error', (err) => reject(err));
      });
    } else if (ext === '.xlsx' || ext === '.xls') {
      // xlsx.readFile is synchronous — fine for files up to the 5MB multer limit
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0]; // Always use the first sheet
      const sheet = workbook.Sheets[sheetName];
      rows = xlsx.utils.sheet_to_json(sheet);
    } else {
      // This branch is a safety net — multer's fileFilter should catch bad types first
      cleanupFile(filePath);
      return res.status(400).json({
        message: `Unsupported file type: ${ext}. Only .csv, .xlsx, and .xls are accepted.`,
      });
    }

    // ── Step 3: Validate file is not empty ──────────────────────────────
    if (!rows || rows.length === 0) {
      cleanupFile(filePath);
      return res.status(400).json({ message: 'The uploaded file has no data rows' });
    }

    // ── Step 4: Validate required columns (case-insensitive) ────────────
    // Check the first row's keys against expected column names.
    // We support both "FirstName" and "firstname" to be lenient.
    const firstRow = rows[0];
    const rowKeys = Object.keys(firstRow).map((k) => k.toLowerCase().trim());

    const missingCols = [];
    if (!rowKeys.includes('firstname')) missingCols.push('FirstName');
    if (!rowKeys.includes('phone')) missingCols.push('Phone');
    if (!rowKeys.includes('notes')) missingCols.push('Notes');

    if (missingCols.length > 0) {
      cleanupFile(filePath);
      return res.status(400).json({
        message: `Missing required column(s): ${missingCols.join(', ')}. The file must have exactly: FirstName, Phone, Notes`,
      });
    }

    // ── Step 5: Normalize rows ──────────────────────────────────────────
    // Handles case-insensitive column names and ensures phone is always a string.
    const items = rows.map((row) => {
      // Build a lowercased key map for case-insensitive access
      const lc = {};
      Object.keys(row).forEach((k) => { lc[k.toLowerCase().trim()] = row[k]; });

      return {
        firstName: String(lc['firstname'] || '').trim(),
        phone: String(lc['phone'] || '').trim(),
        notes: String(lc['notes'] || '').trim(),
      };
    });

    // ── Step 6: Distribution algorithm ─────────────────────────────────
    const N = items.length;
    const base = Math.floor(N / 5);
    const remainder = N % 5;

    /*
     * Sequential front-loading:
     * - Agents 0..(remainder-1) get (base + 1) items each
     * - Agents remainder..4 get base items each
     *
     * Example — 27 items:
     *   base=5, remainder=2
     *   Agent 0 → 6 items (indices 0-5)
     *   Agent 1 → 6 items (indices 6-11)
     *   Agent 2 → 5 items (indices 12-16)
     *   Agent 3 → 5 items (indices 17-21)
     *   Agent 4 → 5 items (indices 22-26)
     */
    const uploadBatchId = Date.now().toString();
    const listItemDocs = [];
    const distributionSummary = []; // For the response payload
    let startIndex = 0;

    for (let i = 0; i < 5; i++) {
      const count = base + (i < remainder ? 1 : 0);
      const agentItems = items.slice(startIndex, startIndex + count);
      startIndex += count;

      distributionSummary.push({ agentName: agents[i].name, count });

      // Build ListItem documents for bulk insert
      agentItems.forEach((item) => {
        listItemDocs.push({
          firstName: item.firstName,
          phone: item.phone,
          notes: item.notes,
          agentId: agents[i]._id,
          agentName: agents[i].name,   // Denormalized for fast reads
          uploadBatchId,
        });
      });
    }

    // ── Step 7: Bulk insert to MongoDB ──────────────────────────────────
    // insertMany is a single round-trip — far faster than looping .save()
    // which would make N separate database calls for N rows.
    await ListItem.insertMany(listItemDocs);

    // ── Step 8: Delete temp file ────────────────────────────────────────
    // File has been fully processed — clean up so /uploads/ stays empty.
    cleanupFile(filePath);

    return res.status(200).json({
      success: true,
      totalItems: N,
      batchId: uploadBatchId,
      distribution: distributionSummary,
    });

  } catch (error) {
    // Always try to clean up the temp file even if processing failed
    cleanupFile(filePath);
    console.error('uploadAndDistribute error:', error.message);
    return res.status(500).json({ message: 'Server error during file processing' });
  }
};

/**
 * getLists
 *
 * Returns all ListItems grouped by agent.
 * Grouped in JavaScript (not MongoDB $group) because for small datasets
 * the JS approach is simpler to read and debug. In production at scale,
 * the aggregation pipeline with $group would be more efficient.
 */
const getLists = async (req, res) => {
  try {
    // Fetch all items, newest first (most recent upload batch on top)
    const items = await ListItem.find().sort({ uploadedAt: -1 });

    // Group by agentId in a single JS pass
    const grouped = {};
    items.forEach((item) => {
      const key = item.agentId.toString();
      if (!grouped[key]) {
        grouped[key] = {
          agentId: key,
          agentName: item.agentName,
          items: [],
        };
      }
      grouped[key].items.push({
        firstName: item.firstName,
        phone: item.phone,
        notes: item.notes,
        uploadedAt: item.uploadedAt,
        batchId: item.uploadBatchId,
      });
    });

    return res.status(200).json({ agents: Object.values(grouped) });
  } catch (error) {
    console.error('getLists error:', error.message);
    return res.status(500).json({ message: 'Server error while fetching lists' });
  }
};

module.exports = { uploadAndDistribute, getLists };
