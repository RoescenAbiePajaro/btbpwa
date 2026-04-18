
// backend/server.js
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import galleryRoutes from './routes/gallery.js';
import uploadRoutes from './routes/upload.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
  dbName: 'test',
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('MongoDB error:', err));

// Proxy TF Hub model assets (browser cannot fetch tfhub.dev cross-origin without CORS)
app.use('/__tfhub__', async (req, res) => {
  try {
    const upstream = `https://tfhub.dev${req.url}`;
    const r = await fetch(upstream);
    const ct = r.headers.get('content-type');
    if (ct) res.setHeader('Content-Type', ct);
    const cache = r.headers.get('cache-control');
    if (cache) res.setHeader('Cache-Control', cache);
    res.status(r.status);
    const buf = Buffer.from(await r.arrayBuffer());
    res.send(buf);
  } catch (err) {
    console.error('TF Hub proxy error:', err);
    res.status(502).json({ error: 'TF Hub proxy failed' });
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/upload', uploadRoutes);

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});