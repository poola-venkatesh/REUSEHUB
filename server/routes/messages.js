const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { createNotification } = require('../services/notification');

// GET /api/messages/:transactionId - Retrieve chat history for transaction
router.get('/:transactionId', requireAuth, async (req, res) => {
  try {
    const { transactionId } = req.params;
    const currentUserId = req.user.id;

    const tx = await db.get('SELECT * FROM transactions WHERE id = ?', [transactionId]);
    if (!tx) {
      return res.status(404).json({ success: false, error: 'Transaction not found.' });
    }

    const isParty = (tx.owner_id === currentUserId || tx.borrower_id === currentUserId);
    if (!isParty && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Access denied.' });
    }

    const messages = await db.all(
      `SELECT 
         m.*,
         u.full_name as sender_name, u.profile_photo as sender_photo
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.transaction_id = ?
       ORDER BY m.created_at ASC`,
      [transactionId]
    );

    // Mark messages as read for receiver
    await db.run(
      `UPDATE messages SET is_read = 1 WHERE transaction_id = ? AND receiver_id = ?`,
      [transactionId, currentUserId]
    );

    res.json({ success: true, messages });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/messages/:transactionId - Send message in transaction thread
router.post('/:transactionId', requireAuth, async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { content } = req.body;
    const senderId = req.user.id;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, error: 'Message content cannot be empty.' });
    }

    const tx = await db.get(
      `SELECT t.*, l.title as listing_title 
       FROM transactions t 
       JOIN listings l ON l.id = t.listing_id 
       WHERE t.id = ?`,
      [transactionId]
    );

    if (!tx) {
      return res.status(404).json({ success: false, error: 'Transaction not found.' });
    }

    const isParty = (tx.owner_id === senderId || tx.borrower_id === senderId);
    if (!isParty && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Access denied.' });
    }

    const receiverId = (tx.owner_id === senderId) ? tx.borrower_id : tx.owner_id;
    const messageId = 'msg_' + crypto.randomBytes(8).toString('hex');

    await db.run(
      `INSERT INTO messages (id, transaction_id, sender_id, receiver_id, content, is_read)
       VALUES (?, ?, ?, ?, ?, 0)`,
      [messageId, transactionId, senderId, receiverId, content.trim()]
    );

    // Notify receiver
    await createNotification({
      userId: receiverId,
      title: `New Message from ${req.user.full_name}`,
      message: `Regarding "${tx.listing_title}": "${content.slice(0, 60)}${content.length > 60 ? '...' : ''}"`,
      type: 'CHAT_MESSAGE',
      link: `/transaction/${transactionId}`
    });

    res.json({
      success: true,
      messageId,
      content: content.trim(),
      created_at: new Date().toISOString()
    });
  } catch (err) {
    console.error('Send message error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
