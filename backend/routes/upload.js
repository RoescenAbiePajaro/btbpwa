import express from 'express';
import multer from 'multer';
import auth from '../middleware/auth.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/image', auth, upload.single('image'), (req, res) => {
  // handle image upload if needed (e.g., for template)
  const base64 = req.file.buffer.toString('base64');
  res.json({ base64 });
});

export default router;