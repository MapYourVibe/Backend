const express = require("express");
const multer = require("multer");
const path = require("path");
const os = require("os");
const fs = require("fs");
const router = express.Router();

const uploadController = require("./upload.controller");
const requireAuth = require("../../middlewares/auth.middleware");

// Raster-only allowlist. SVG is deliberately excluded: it can embed <script>
// / <foreignObject> and would be stored XSS once served as a banner or avatar.
// The client-supplied mimetype is untrusted, so magic bytes are verified below.
const ALLOWED_MAGIC = [
  { type: "image/jpeg", match: [0xff, 0xd8, 0xff], ext: [".jpg", ".jpeg"] },
  { type: "image/png", match: [0x89, 0x50, 0x4e, 0x47], ext: [".png"] },
  { type: "image/webp", match: [0x52, 0x49, 0x46, 0x46], ext: [".webp"] }, // "RIFF" prefix, verified below
  { type: "image/gif", match: [0x47, 0x49, 0x46, 0x38], ext: [".gif"] }, // "GIF8"
];

function sniffImageType(filePath) {
  let header;
  try {
    header = fs.readFileSync(filePath);
  } catch {
    return null;
  }
  if (header.length < 12) return null;

  // WebP requires the full "RIFF....WEBP" signature.
  const webpOk =
    header.subarray(0, 4).equals(Buffer.from("RIFF")) &&
    header.subarray(8, 12).equals(Buffer.from("WEBP"));

  for (const def of ALLOWED_MAGIC) {
    const matches = def.match.every((byte, i) => header[i] === byte);
    if (matches && (def.type !== "image/webp" || webpOk)) return def.type;
  }
  return null;
}

const storage = multer.diskStorage({
  destination: os.tmpdir(),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    // Strip any path traversal / junk from the extension; only a recognized
    // safe raster extension survives (acting as a secondary line of defense).
    const safeExt = [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext) ? ext : "";
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExt = [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext);
    if (!allowedExt || !file.mimetype.startsWith("image/")) {
      return cb(new Error("Only JPG, PNG, WEBP, or GIF images are allowed"));
    }
    cb(null, true);
  },
});

// Verify real file content before it is ever handed to Cloudinary. The client
// can spoof both the Content-Type and the extension, so only the bytes count.
function verifyImageFile(req, res, next) {
  if (!req.file) return next();
  const detected = sniffImageType(req.file.path);
  if (!detected) {
    return res.status(400).json({ success: false, message: "File is not a valid image" });
  }
  // The classification must also agree with the claimed width/height sanity
  // handled by the destination service; here we simply tag the detected type.
  req.file.safeType = detected;
  next();
}

router.post("/", requireAuth, (req, res, next) => {
  upload.single("image")(req, res, (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ success: false, message: "File too large. Max 10MB." });
      }
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
}, verifyImageFile, uploadController.handleUpload);

module.exports = router;
