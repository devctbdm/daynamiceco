import express from 'express';
import { protect, adminOnly } from '../middleware/auth.js';
import { uploadSingle, uploadStoreLogo } from '../middleware/upload.js';

const router = express.Router();

// Generic single-image upload used by the rich-text editors (insert image).
// Returns the Cloudinary secure URL so the editor can embed it.
router.post('/image', protect, adminOnly, (req, res) => {
  uploadSingle(req, res, (err) => {
    if (err) {
      return res
        .status(400)
        .json({ success: false, message: err.message || 'Image upload failed' });
    }
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: 'No image file received' });
    }
    res.status(201).json({
      success: true,
      url: req.file.path,
      publicId: req.file.filename,
    });
  });
});

// Store logo upload (Settings → Logo, image type).
router.post('/logo', protect, adminOnly, (req, res) => {
  uploadStoreLogo(req, res, (err) => {
    if (err) {
      return res
        .status(400)
        .json({ success: false, message: err.message || 'Logo upload failed' });
    }
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: 'No image file received' });
    }
    res.status(201).json({
      success: true,
      url: req.file.path,
      publicId: req.file.filename,
    });
  });
});

export default router;
