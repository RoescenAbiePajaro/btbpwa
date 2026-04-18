
// backend/models/SavedWork.js
import mongoose from 'mongoose';

const savedWorkSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  thumbnail: { type: String, required: true }, // base64 or URL
  canvasData: { type: Object, required: true }, // stores drawing paths, texts, etc.
  createdAt: { type: Date, default: Date.now },
  title: String,
});

export default mongoose.model('SavedWork', savedWorkSchema);