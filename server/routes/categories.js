const express = require('express');
const router = express.Router();
const db = require('../db');
const { getPlatformImpactMetrics } = require('../services/impact');

// GET /api/categories
router.get('/', async (req, res) => {
  try {
    const categories = await db.all(
      `SELECT c.*, COUNT(l.id) as approved_listings_count
       FROM categories c
       LEFT JOIN listings l ON l.category_id = c.id AND l.status = 'APPROVED'
       GROUP BY c.id ORDER BY c.name ASC`
    );
    res.json({ success: true, categories });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/categories/impact
router.get('/impact', async (req, res) => {
  try {
    const metrics = await getPlatformImpactMetrics();
    res.json({ success: true, metrics });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
