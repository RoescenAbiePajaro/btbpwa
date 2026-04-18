// backend/routes/gallery.js
import express from 'express';
import auth from '../middleware/auth.js';
import SavedWork from '../models/SavedWork.js';

const router = express.Router();

// Get all works for logged-in user
router.get('/', auth, async (req, res) => {
  try {
    const works = await SavedWork.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json(works);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save new work
router.post('/', auth, async (req, res) => {
  try {
    const { thumbnail, canvasData, title } = req.body;
    const work = new SavedWork({
      userId: req.userId,
      thumbnail,
      canvasData,
      title: title || `Work ${new Date().toLocaleString()}`
    });
    await work.save();
    res.status(201).json(work);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Load specific work
router.get('/:id', auth, async (req, res) => {
  try {
    const work = await SavedWork.findOne({ _id: req.params.id, userId: req.userId });
    if (!work) return res.status(404).json({ error: 'Not found' });
    res.json(work);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;