// backend/controllers/list.controller.js

const fs = require('fs');
const path = require('path');
const csvParser = require('csv-parser');
const xlsx = require('xlsx');
const ListItem = require('../models/ListItem');
const Agent = require('../models/Agent');

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Upload CSV/XLSX/XLS, validate, distribute equally among 5 agents
// @route   POST /api/lists/upload
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const uploadAndDistribute = async (req, res) => {
  // Multer attaches the file to req.file — if it's missing, nothing was uploaded
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded.' });
  }

  try {
    const ext = path.extname(req.file.originalname).toLowerCase();

    // Fetch agents sorted by creation date ASC — this order determines which
    // agents receive the "extra" items when N is not divisible by 5
    const agents = await Agent.find()
      .select('name _id')
      .sort({ createdAt: 1 })
      .limit(5);

    if (agents.length < 5) {
      fs.unlinkSync(req.file.path); // clean up temp file before early return
      return res.status(400).json({
        message: `Exactly 5 agents required before uploading. Currently have ${agents.length} agent(s). Please add ${5 - agents.length} more.`,
      });
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    // Case-insensitive check that all 3 required columns are present
    const validateColumns = (rows) => {
      if (rows.length === 0) return false;
      const keys = Object.keys(rows[0]).map((k) => k.toLowerCase());
      return (
        keys.includes('firstname') &&
        keys.includes('phone') &&
        keys.includes('notes')
      );
    };

    // Normalise a row: handle any casing of header names
    const normalizeRow = (row) => {
      const lower = {};
      Object.keys(row).forEach((k) => {
        lower[k.toLowerCase()] = row[k];
      });
      return {
        firstName: (lower['firstname'] || '').toString().trim(),
        phone: (lower['phone'] || '').toString().trim(),
        notes: (lower['notes'] || '').toString().trim(),
      };
    };

    // Unique batch ID — groups all items from this single upload
    const uploadBatchId = Date.now().toString();

    // ── Distribution Algorithm ────────────────────────────────────────────────
    // base = Math.floor(N / 5)  →  every agent gets at least this many
    // remainder = N % 5         →  the FIRST `remainder` agents each get +1
    // Result is deterministic and sequential (never random)
    const buildDocs = (items) => {
      const N = items.length;
      const base = Math.floor(N / 5);
      const remainder = N % 5;
      const docs = [];
      const summary = [];
      let cursor = 0;

      for (let i = 0; i < 5; i++) {
        const count = base + (i < remainder ? 1 : 0);
        const slice = items.slice(cursor, cursor + count);
        cursor += count;
        summary.push({ agentName: agents[i].name, count });

        slice.forEach((item) => {
          docs.push({
            firstName: item.firstName,
            phone: item.phone,
            notes: item.notes,
            agentId: agents[i]._id,
            // Store agentName directly to avoid a populate() call on every read
            agentName: agents[i].name,
            uploadBatchId,
          });
        });
      }

      return { docs, summary };
    };

    // ── Parse ─────────────────────────────────────────────────────────────────

    if (ext === '.csv') {
      // Stream the CSV — avoids loading large files entirely into memory
      const results = [];

      fs.createReadStream(req.file.path)
        .pipe(csvParser())
        .on('data', (row) => results.push(row))
        .on('end', async () => {
          try {
            if (results.length === 0) {
              fs.unlinkSync(req.file.path);
              return res.status(400).json({ message: 'The CSV file has no data rows.' });
            }
            if (!validateColumns(results)) {
              fs.unlinkSync(req.file.path);
              return res.status(400).json({
                message: 'Invalid CSV format. Required columns: FirstName, Phone, Notes.',
              });
            }

            const { docs, summary } = buildDocs(results.map(normalizeRow));

            // insertMany = ONE MongoDB round-trip vs N individual save() calls
            await ListItem.insertMany(docs);
            fs.unlinkSync(req.file.path); // remove temp file after success

            return res.status(200).json({
              success: true,
              totalItems: results.length,
              batchId: uploadBatchId,
              distribution: summary,
            });
          } catch (innerErr) {
            if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            console.error('CSV processing error:', innerErr);
            return res.status(500).json({ message: 'Failed to process CSV file.' });
          }
        })
        .on('error', (parseErr) => {
          if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
          console.error('CSV parse error:', parseErr);
          return res.status(400).json({ message: 'Failed to parse CSV. Check file format.' });
        });

    } else if (ext === '.xlsx' || ext === '.xls') {
      // xlsx.readFile is synchronous — fine for files ≤ 5 MB (our multer limit)
      const workbook = xlsx.readFile(req.file.path);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const results = xlsx.utils.sheet_to_json(sheet);

      if (results.length === 0) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: 'The spreadsheet has no data rows.' });
      }
      if (!validateColumns(results)) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({
          message: 'Invalid spreadsheet format. Required columns: FirstName, Phone, Notes.',
        });
      }

      const { docs, summary } = buildDocs(results.map(normalizeRow));
      await ListItem.insertMany(docs);
      fs.unlinkSync(req.file.path);

      return res.status(200).json({
        success: true,
        totalItems: results.length,
        batchId: uploadBatchId,
        distribution: summary,
      });

    } else {
      // Safety net — multer fileFilter should have already blocked this
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Unsupported file type.' });
    }

  } catch (err) {
    // Always attempt temp file cleanup before returning 500
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error('uploadAndDistribute error:', err);
    return res.status(500).json({ message: 'Server error during file upload.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Return all list items grouped by agent
// @route   GET /api/lists
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const getLists = async (req, res) => {
  try {
    // Newest uploads appear first within each agent's list
    const items = await ListItem.find().sort({ uploadedAt: -1 });

    // Group in JS rather than MongoDB $group — simpler to read for a test dataset.
    // For production-scale (millions of rows) use the aggregation pipeline instead.
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
  } catch (err) {
    console.error('getLists error:', err);
    return res.status(500).json({ message: 'Server error fetching lists.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Delete ALL list items — admin and agents are NOT touched
// @route   DELETE /api/lists
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const clearLists = async (req, res) => {
  try {
    // deleteMany({}) with an empty filter is intentional — we want a full wipe
    // of the ListItem collection only. Admin and Agent collections are untouched.
    const result = await ListItem.deleteMany({});

    return res.status(200).json({
      success: true,
      message: 'All list items cleared successfully.',
      deletedCount: result.deletedCount,
    });
  } catch (err) {
    console.error('clearLists error:', err);
    return res.status(500).json({ message: 'Server error while clearing lists.' });
  }
};

module.exports = { uploadAndDistribute, getLists, clearLists };