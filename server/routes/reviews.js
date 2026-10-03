const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { createNotification } = require('../services/notification');

// POST /api/reviews - Submit review (Allowed strictly AFTER completed transactions!)
router.post('/', requireAuth, async (req, res) => {
  try {
    const { transactionId, rating, reviewText } = req.body;
    const reviewerId = req.user.id;

    const numRating = parseInt(rating, 10);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({ success: false, error: 'Rating must be an integer between 1 and 5 stars.' });
    }

    const tx = await db.get('SELECT * FROM transactions WHERE id = ?', [transactionId]);
    if (!tx) {
      return res.status(404).json({ success: false, error: 'Transaction not found.' });
    }

    // STRICT CHECK: Must be COMPLETED
    if (tx.status !== 'COMPLETED') {
      return res.status(400).json({
        success: false,
        error: `Reviews can only be submitted after the transaction is fully COMPLETED (Current status: ${tx.status}).`
      });
    }

    const isParty = (tx.owner_id === reviewerId || tx.borrower_id === reviewerId);
    if (!isParty) {
      return res.status(403).json({ success: false, error: 'You are not a participant in this transaction.' });
    }

    const revieweeId = (tx.owner_id === reviewerId) ? tx.borrower_id : tx.owner_id;

    // Check if already reviewed
    const existing = await db.get(
      `SELECT id FROM reviews WHERE transaction_id = ? AND reviewer_id = ?`,
      [transactionId, reviewerId]
    );
    if (existing) {
      return res.status(400).json({ success: false, error: 'You have already submitted a review for this transaction.' });
    }

    const reviewId = 'rev_' + crypto.randomBytes(8).toString('hex');
    await db.run(
      `INSERT INTO reviews (id, transaction_id, reviewer_id, reviewee_id, listing_id, rating, review_text)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [reviewId, transactionId, reviewerId, revieweeId, tx.listing_id, numRating, reviewText || '']
    );

    const listing = await db.get('SELECT title FROM listings WHERE id = ?', [tx.listing_id]);

    // Notify reviewee
    await createNotification({
      userId: revieweeId,
      title: `You Received a ${numRating}-Star Review!`,
      message: `${req.user.full_name} left you a ${numRating}-star rating for your exchange of "${listing.title}".`,
      type: 'REVIEW_RECEIVED',
      link: `/user/${revieweeId}`
    });

    res.json({
      success: true,
      reviewId,
      rating: numRating,
      message: 'Thank you! Your rating and review have been published to the user profile.'
    });
  } catch (err) {
    console.error('Submit review error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/reviews/user/:userId - Get reviews received by a user
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const reviews = await db.all(
      `SELECT 
         r.*,
         u.full_name as reviewer_name, u.profile_photo as reviewer_photo,
         l.title as listing_title
       FROM reviews r
       JOIN users u ON u.id = r.reviewer_id
       JOIN listings l ON l.id = r.listing_id
       WHERE r.reviewee_id = ?
       ORDER BY r.created_at DESC`,
      [userId]
    );

    const stats = await db.get(
      `SELECT 
         COUNT(*) as total_reviews,
         COALESCE(AVG(rating), 5.0) as average_rating
       FROM reviews WHERE reviewee_id = ?`,
      [userId]
    );

    res.json({
      success: true,
      totalReviews: stats.total_reviews,
      averageRating: Number(Number(stats.average_rating).toFixed(1)),
      reviews
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
