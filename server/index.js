const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const db = require('./db');

const authRouter = require('./routes/auth');
const categoriesRouter = require('./routes/categories');
const listingsRouter = require('./routes/listings');
const requestsRouter = require('./routes/requests');
const transactionsRouter = require('./routes/transactions');
const disputesRouter = require('./routes/disputes');
const messagesRouter = require('./routes/messages');
const reviewsRouter = require('./routes/reviews');
const notificationsRouter = require('./routes/notifications');
const adminRouter = require('./routes/admin');
const { startReminderScheduler } = require('./services/reminders');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Persistent uploads storage directory
const uploadsDir = path.join(__dirname, '..', 'client', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Static files (Frontend Client)
const clientPath = path.join(__dirname, '..', 'client');
app.use(express.static(clientPath));

// POST /api/upload - Persistent Image Storage
app.post('/api/upload', (req, res) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ success: false, error: 'No image data provided.' });
    }
    const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ success: false, error: 'Invalid image data format.' });
    }
    const mimeType = matches[1];
    const base64Data = matches[2];
    let ext = 'jpg';
    if (mimeType.includes('png')) ext = 'png';
    else if (mimeType.includes('webp')) ext = 'webp';
    else if (mimeType.includes('gif')) ext = 'gif';

    const filename = `item_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${ext}`;
    const filePath = path.join(uploadsDir, filename);
    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));

    const permanentUrl = `/uploads/${filename}`;
    res.json({ success: true, url: permanentUrl, filename });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/listings', listingsRouter);
app.use('/api/requests', requestsRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/disputes', disputesRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/admin', adminRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'REUSEHUB (RENT & REUSE Platform API)',
    version: '1.0.0'
  });
});

// Single Page Application (SPA) routing fallback
app.get('*', (req, res) => {
  // If it's an API route that wasn't handled, return 404 JSON
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, error: 'Endpoint not found.' });
  }
  res.sendFile(path.join(clientPath, 'index.html'));
});

// Global error handling
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error: ' + (err.message || 'Unknown error')
  });
});

// Initialize database and start server
async function startServer() {
  try {
    await db.initDb();
    startReminderScheduler();
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`\n=============================================================`);
      console.log(`🚀 REUSEHUB (RENT & REUSE Platform) is running!`);
      console.log(`🌐 Local Web URL: http://localhost:${PORT}`);
      console.log(`📋 API Base:      http://localhost:${PORT}/api`);
      console.log(`=============================================================\n`);
    });
    return server;
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
