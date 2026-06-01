const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { verifyToken } = require('../middleware/auth.middleware');
const { uploadAndDistribute, getLists } = require('../controllers/list.controller');

// ─── Ensure uploads directory exists ────────────────────────────────────────
// fs.mkdirSync with recursive:true is a no-op if the dir already exists —
// safe to call on every server start.
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// ─── Multer storage config ───────────────────────────────────────────────────
// diskStorage keeps files on disk (not in memory) which is correct for
// large CSV files. The unique filename prevents collisions between concurrent uploads.
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    // timestamp + random suffix + original extension
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

// ─── File type filter ────────────────────────────────────────────────────────
// We check the file extension (not just mimetype) because mimetype is easily
// spoofed — a user can rename file.pdf to file.csv and upload it.
// Checking the extension is the primary guard; both together = defense-in-depth.
const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.csv', '.xlsx', '.xls'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedExtensions.includes(ext)) {
    cb(null, true); // Accept file
  } else {
    // Pass an Error to multer — we catch it in the error handler below
    cb(
      new Error(
        `Invalid file type "${ext}". Only .csv, .xlsx, and .xls files are accepted. You uploaded: ${file.originalname}`
      ),
      false
    );
  }
};

// ─── Multer instance ─────────────────────────────────────────────────────────
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB hard limit
});

// ─── Routes ──────────────────────────────────────────────────────────────────

// POST /api/lists/upload
// verifyToken runs first, then multer processes the multipart body,
// then uploadAndDistribute handles the business logic.
router.post(
  '/upload',
  verifyToken,
  upload.single('file'), // 'file' must match the FormData field name on the frontend
  uploadAndDistribute
);

// GET /api/lists
// Returns all list items grouped by agent.
router.get('/', verifyToken, getLists);

// ─── Multer error handler ─────────────────────────────────────────────────────
// Multer throws a MulterError (wrong file type, size exceeded) before the
// controller runs. Without this handler, Express's default error handler
// returns HTML — this converts it to clean JSON.
// The 4-parameter signature is required for Express to recognise it as an
// error-handling middleware.
// eslint-disable-next-line no-unused-vars
router.use((err, req, res, next) => {
  if (err) {
    return res.status(400).json({
      message: err.message || 'File upload error',
    });
  }
  next();
});

module.exports = router;
