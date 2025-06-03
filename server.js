const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

// Middleware
app.use(express.json());
app.use(cors());

// MongoDB connection
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err);
    process.exit(1);
  });

// Sample route
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const imageSchema = new mongoose.Schema({
  url: { type: String, required: true },
  pageIndex: { type: Number, required: true },
  pageName: { type: String, default: '' },
  uploadedAt: { type: Date, default: Date.now },
});
const Image = mongoose.model('Image', imageSchema);

app.post('/api/images', async (req, res) => {
  try {
    const { url, pageIndex, pageName } = req.body;
    if (!url || typeof pageIndex !== 'number') {
      return res.status(400).json({ error: 'url and pageIndex are required' });
    }
    const image = new Image({ url, pageIndex, pageName });
    await image.save();
    res.status(201).json(image);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save image info' });
  }
});

app.get('/api/images', async (req, res) => {
  try {
    const images = await Image.find().sort({ pageIndex: 1 });
    res.json(images);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch images' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
