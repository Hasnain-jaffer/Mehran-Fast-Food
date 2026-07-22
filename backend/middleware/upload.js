/**
 * Multer configuration for image uploads.
 *
 * Uses memory storage (not disk) — the file buffer is streamed straight to
 * Cloudinary (see services/upload.service.js) and never touches this
 * server's filesystem, which avoids needing to clean up temp files and
 * avoids disk-fill risk from unbounded uploads.
 */

const multer = require('multer');
const { ApiError } = require('../utils/ApiError');

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB — generous for a profile photo, not for abuse

const storage = multer.memoryStorage();

function fileFilter(req, file, cb) {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(new ApiError(400, `Unsupported image type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`));
  }
  cb(null, true);
}

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter
});

module.exports = { upload, ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES };
