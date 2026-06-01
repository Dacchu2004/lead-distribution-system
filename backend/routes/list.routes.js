// backend/routes/list.routes.js

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { verifyToken } = require('../middleware/auth.middleware');
const {
  uploadAndDistribute,
  getLists,
  clearLists,
} = require('../controllers/list.controller');

// ─── Ensure /uploads directory exists at startup ──────────────────────────────
// multer will throw an ENOENT if the destination folder is missing
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// ─── Multer: disk storage ─────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    // Timestamp + random suffix prevents filename collisions
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(
      file.originalname
    )}`;
    cb(null, unique);
  },
});

// ─── Multer: file type guard ──────────────────────────────────────────────────
// Extension check is the primary guard — mimetype can be spoofed by renaming
// a .pdf to .csv. Checking both is defense-in-depth.
const fileFilter = (req, file, cb) => {
  const allowed = ['.csv', '.xlsx', '.xls'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type "${ext}". Only .csv, .xlsx, and .xls files are accepted.`
      ),
      false
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB hard limit
});

// ─── Routes (all protected by JWT) ───────────────────────────────────────────

// GET /api/lists — fetch all items grouped by agent
router.get('/', verifyToken, getLists);

// POST /api/lists/upload — parse, validate, distribute, save
router.post('/upload', verifyToken, upload.single('file'), uploadAndDistribute);

// DELETE /api/lists — wipe all list items, keep agents + admin intact
router.delete('/', verifyToken, clearLists);

// ─── Multer-specific error handler ───────────────────────────────────────────
// multer errors bypass Express's default error handler and would otherwise
// return an HTML stack trace. This turns them into clean JSON responses.
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: `Upload error: ${err.message}` });
  }
  if (err) {
    return res.status(400).json({ message: err.message });
  }
  next();
});

module.exports = router;