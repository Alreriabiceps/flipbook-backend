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
  metadata: { type: Object, default: {} },
  textOverlays: { type: Array, default: [] },
  altText: { type: String, default: '' },
  filters: { type: Object, default: {} },
});
const Image = mongoose.model('Image', imageSchema);

// New schemas for enhanced features
const analyticsSchema = new mongoose.Schema({
  pageIndex: { type: Number, required: true },
  views: { type: Number, default: 0 },
  timeSpent: { type: Number, default: 0 },
  lastViewed: { type: Date, default: Date.now },
});
const Analytics = mongoose.model('Analytics', analyticsSchema);

const bookmarkSchema = new mongoose.Schema({
  pageIndex: { type: Number, required: true },
  title: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});
const Bookmark = mongoose.model('Bookmark', bookmarkSchema);

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  settings: { type: Object, default: {} },
  isPublic: { type: Boolean, default: false },
  password: { type: String, default: '' },
  shareId: { type: String, unique: true },
  images: { type: Array, default: [] },
  textOverlays: { type: Object, default: {} },
  pageMetadata: { type: Object, default: {} },
  altTexts: { type: Object, default: {} },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});
const Project = mongoose.model('Project', projectSchema);

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

app.delete('/api/images', async (req, res) => {
  try {
    const { pageIndex } = req.body;
    if (typeof pageIndex !== 'number') {
      return res.status(400).json({ error: 'pageIndex is required' });
    }
    
    const result = await Image.deleteOne({ pageIndex });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'No image found for this page' });
    }
    
    res.json({ message: 'Image deleted successfully', deletedCount: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

// FEATURE ENDPOINTS

// Bulk operations
app.post('/api/images/bulk', async (req, res) => {
  try {
    const { images } = req.body;
    const savedImages = await Image.insertMany(images);
    res.status(201).json(savedImages);
  } catch (err) {
    res.status(500).json({ error: 'Failed to bulk save images' });
  }
});

app.delete('/api/images/bulk', async (req, res) => {
  try {
    const { pageIndexes } = req.body;
    const result = await Image.deleteMany({ pageIndex: { $in: pageIndexes } });
    res.json({ message: 'Images deleted successfully', deletedCount: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: 'Failed to bulk delete images' });
  }
});

// Text overlays
app.put('/api/images/:pageIndex/text', async (req, res) => {
  try {
    const { pageIndex } = req.params;
    const { textOverlays } = req.body;
    
    const image = await Image.findOneAndUpdate(
      { pageIndex: parseInt(pageIndex) },
      { textOverlays },
      { new: true, upsert: true }
    );
    
    res.json(image);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update text overlays' });
  }
});

// Metadata
app.put('/api/images/:pageIndex/metadata', async (req, res) => {
  try {
    const { pageIndex } = req.params;
    const { metadata } = req.body;
    
    const image = await Image.findOneAndUpdate(
      { pageIndex: parseInt(pageIndex) },
      { metadata },
      { new: true, upsert: true }
    );
    
    res.json(image);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update metadata' });
  }
});

// Alt text
app.put('/api/images/:pageIndex/alt', async (req, res) => {
  try {
    const { pageIndex } = req.params;
    const { altText } = req.body;
    
    const image = await Image.findOneAndUpdate(
      { pageIndex: parseInt(pageIndex) },
      { altText },
      { new: true, upsert: true }
    );
    
    res.json(image);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update alt text' });
  }
});

// Analytics endpoints
app.post('/api/analytics/view', async (req, res) => {
  try {
    const { pageIndex } = req.body;
    
    const analytics = await Analytics.findOneAndUpdate(
      { pageIndex },
      { 
        $inc: { views: 1 },
        lastViewed: new Date()
      },
      { new: true, upsert: true }
    );
    
    res.json(analytics);
  } catch (err) {
    res.status(500).json({ error: 'Failed to track page view' });
  }
});

app.get('/api/analytics', async (req, res) => {
  try {
    const analytics = await Analytics.find().sort({ views: -1 });
    res.json(analytics);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Bookmarks endpoints
app.post('/api/bookmarks', async (req, res) => {
  try {
    const { pageIndex, title } = req.body;
    const bookmark = new Bookmark({ pageIndex, title });
    await bookmark.save();
    res.status(201).json(bookmark);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create bookmark' });
  }
});

app.get('/api/bookmarks', async (req, res) => {
  try {
    const bookmarks = await Bookmark.find().sort({ pageIndex: 1 });
    res.json(bookmarks);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch bookmarks' });
  }
});

app.delete('/api/bookmarks/:pageIndex', async (req, res) => {
  try {
    const { pageIndex } = req.params;
    const result = await Bookmark.deleteOne({ pageIndex: parseInt(pageIndex) });
    res.json({ message: 'Bookmark deleted successfully', deletedCount: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete bookmark' });
  }
});

// PROJECT SHARING ENDPOINTS

// Create/Save shared project
app.post('/api/projects', async (req, res) => {
  try {
    const {
      name,
      description,
      settings,
      isPublic,
      password,
      images,
      textOverlays,
      pageMetadata,
      altTexts
    } = req.body;

    // Generate unique share ID
    const shareId = Math.random().toString(36).substr(2, 12) + Date.now().toString(36);

    const project = new Project({
      name: name || `Flipbook ${new Date().toLocaleDateString()}`,
      description: description || `Flipbook with ${images?.length || 0} pages`,
      settings: settings || {},
      isPublic: isPublic || false,
      password: password || '',
      shareId,
      images: images || [],
      textOverlays: textOverlays || {},
      pageMetadata: pageMetadata || {},
      altTexts: altTexts || {},
    });

    await project.save();
    
    console.log(`✅ Project saved with shareId: ${shareId}`);
    
    res.status(201).json({
      ...project.toJSON(),
      message: 'Project saved successfully'
    });
  } catch (err) {
    console.error('❌ Failed to save project:', err);
    res.status(500).json({ error: 'Failed to save project', details: err.message });
  }
});

// Get shared project by shareId
app.get('/api/projects/:shareId', async (req, res) => {
  try {
    const { shareId } = req.params;
    
    const project = await Project.findOne({ shareId });
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Track view for analytics
    try {
      await Analytics.findOneAndUpdate(
        { pageIndex: 0, shareId },
        { 
          $inc: { views: 1 },
          lastViewed: new Date()
        },
        { new: true, upsert: true }
      );
    } catch (analyticsErr) {
      console.log('Analytics tracking failed:', analyticsErr);
    }

    console.log(`📖 Project ${shareId} accessed`);
    
    res.json(project);
  } catch (err) {
    console.error('❌ Failed to fetch project:', err);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// Get all public projects (for discovery)
app.get('/api/projects', async (req, res) => {
  try {
    const projects = await Project.find({ isPublic: true })
      .select('-password') // Don't send passwords
      .sort({ createdAt: -1 })
      .limit(50);
    
    res.json(projects);
  } catch (err) {
    console.error('❌ Failed to fetch public projects:', err);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// Update project
app.put('/api/projects/:shareId', async (req, res) => {
  try {
    const { shareId } = req.params;
    const updates = req.body;
    
    const project = await Project.findOneAndUpdate(
      { shareId },
      { ...updates, updatedAt: new Date() },
      { new: true }
    );
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    res.json(project);
  } catch (err) {
    console.error('❌ Failed to update project:', err);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// Delete project
app.delete('/api/projects/:shareId', async (req, res) => {
  try {
    const { shareId } = req.params;
    
    const result = await Project.deleteOne({ shareId });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    res.json({ message: 'Project deleted successfully' });
  } catch (err) {
    console.error('❌ Failed to delete project:', err);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// Search endpoint
app.get('/api/search', async (req, res) => {
  try {
    const { query } = req.query;
    
    const images = await Image.find({
      $or: [
        { pageName: { $regex: query, $options: 'i' } },
        { 'metadata.description': { $regex: query, $options: 'i' } },
        { 'metadata.tags': { $regex: query, $options: 'i' } }
      ]
    }).sort({ pageIndex: 1 });
    
    res.json(images);
  } catch (err) {
    res.status(500).json({ error: 'Failed to search images' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📖 Flipbook sharing is ready!`);
  console.log(`🔗 Sharing endpoints available at /api/projects`);
});
