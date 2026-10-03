const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { generate6DigitCode } = require('../services/otp');
const { createNotification } = require('../services/notification');

// POST /api/requests - Create a rental or borrow request
router.post('/', requireAuth, async (req, res) => {
  try {
    const { listingId, requestType = 'RENT', startDate, endDate, message } = req.body;
    const borrowerId = req.user.id;

    if (!listingId || !startDate || !endDate) {
      return res.status(400).json({ success: false, error: 'Listing, start date, and end date are required.' });
    }

    const listing = await db.get('SELECT * FROM listings WHERE id = ?', [listingId]);
    if (!listing) {
      return res.status(404).json({ success: false, error: 'Listing not found.' });
    }

    if (listing.owner_id === borrowerId) {
      return res.status(400).json({ success: false, error: 'You cannot rent or borrow your own item.' });
    }

    if (listing.status !== 'APPROVED') {
      return res.status(400).json({ success: false, error: 'This listing is not currently available for requests.' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
      return res.status(400).json({ success: false, error: 'End date must be on or after start date.' });
    }

    const diffMs = end.getTime() - start.getTime();
    const totalDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1);

    const isBorrow = requestType === 'BORROW' || listing.is_borrow_free === 1;
    const rentPerDay = isBorrow ? 0 : listing.rent_price_per_day;
    const totalRent = rentPerDay * totalDays;
    const securityDeposit = listing.security_deposit || 0;

    const requestId = 'req_' + crypto.randomBytes(8).toString('hex');

    await db.run(
      `INSERT INTO rental_requests (
        id, listing_id, borrower_id, owner_id, request_type,
        start_date, end_date, total_days, rent_per_day,
        total_rent, security_deposit, message, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
      [
        requestId, listingId, borrowerId, listing.owner_id,
        isBorrow ? 'BORROW' : 'RENT',
        startDate, endDate, totalDays, rentPerDay,
        totalRent, securityDeposit, message || null
      ]
    );

    // Notify owner
    await createNotification({
      userId: listing.owner_id,
      title: 'New Rental Request Received',
      message: `${req.user.full_name} has requested to ${isBorrow ? 'borrow' : 'rent'} "${listing.title}" for ${totalDays} day(s).`,
      type: 'REQUEST_RECEIVED',
      link: `/dashboard?tab=requests`
    });

    res.json({
      success: true,
      requestId,
      status: 'PENDING',
      totalDays,
      totalRent,
      securityDeposit,
      totalPayable: totalRent + securityDeposit,
      message: 'Request sent to item owner! The transaction will proceed once the owner accepts.'
    });
  } catch (err) {
    console.error('Create request error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/requests/incoming - Requests received by user as item owner
router.get('/incoming', requireAuth, async (req, res) => {
  try {
    const rows = await db.all(
      `SELECT 
         r.*,
         l.title as listing_title, l.condition as listing_condition,
         (SELECT image_url FROM listing_images WHERE listing_id = l.id ORDER BY is_primary DESC LIMIT 1) as listing_image,
         u.full_name as borrower_name, u.profile_photo as borrower_photo,
         u.is_mobile_verified as borrower_verified,
         (SELECT COUNT(*) FROM transactions WHERE (borrower_id = u.id OR owner_id = u.id) AND status = 'COMPLETED') as borrower_completed_exchanges,
         COALESCE((SELECT AVG(rating) FROM reviews WHERE reviewee_id = u.id), 5.0) as borrower_rating,
         t.id as transaction_id, t.status as transaction_status
       FROM rental_requests r
       JOIN listings l ON l.id = r.listing_id
       JOIN users u ON u.id = r.borrower_id
       LEFT JOIN transactions t ON t.request_id = r.id
       WHERE r.owner_id = ?
       ORDER BY r.created_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, requests: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/requests/outgoing - Requests made by current user as borrower
router.get('/outgoing', requireAuth, async (req, res) => {
  try {
    const rows = await db.all(
      `SELECT 
         r.*,
         l.title as listing_title, l.location_name as listing_location,
         (SELECT image_url FROM listing_images WHERE listing_id = l.id ORDER BY is_primary DESC LIMIT 1) as listing_image,
         u.full_name as owner_name, u.profile_photo as owner_photo,
         t.id as transaction_id, t.status as transaction_status,
         t.payment_status as transaction_payment_status
       FROM rental_requests r
       JOIN listings l ON l.id = r.listing_id
       JOIN users u ON u.id = r.owner_id
       LEFT JOIN transactions t ON t.request_id = r.id
       WHERE r.borrower_id = ?
       ORDER BY r.created_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, requests: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/requests/:id/respond - Owner accepts or rejects
router.post('/:id/respond', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { action, reason } = req.body; // action: 'ACCEPT' or 'REJECT'
    const ownerId = req.user.id;

    const request = await db.get('SELECT * FROM rental_requests WHERE id = ?', [id]);
    if (!request) {
      return res.status(404).json({ success: false, error: 'Rental request not found.' });
    }

    if (request.owner_id !== ownerId) {
      return res.status(403).json({ success: false, error: 'Only the item owner can accept or reject this request.' });
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({ success: false, error: `This request has already been ${request.status.toLowerCase()}.` });
    }

    const listing = await db.get('SELECT * FROM listings WHERE id = ?', [request.listing_id]);

    if (action === 'REJECT') {
      await db.run(
        `UPDATE rental_requests SET status = 'REJECTED', reject_reason = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [reason || 'Owner unavailable for the requested dates', id]
      );

      await createNotification({
        userId: request.borrower_id,
        title: 'Rental Request Declined',
        message: `The owner was unable to accept your request for "${listing.title}". Reason: ${reason || 'Dates unavailable'}`,
        type: 'REQUEST_REJECTED'
      });

      return res.json({ success: true, status: 'REJECTED', message: 'Request rejected.' });
    }

    if (action === 'ACCEPT') {
      // 1. Update request status
      await db.run(
        `UPDATE rental_requests SET status = 'ACCEPTED', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [id]
      );

      // 2. Generate secure Handover OTP and Return OTP
      const handoverOtp = generate6DigitCode();
      const returnOtp = generate6DigitCode();
      const txId = 'tx_' + crypto.randomBytes(8).toString('hex');

      const isTotallyFree = (request.total_rent === 0 && request.security_deposit === 0);
      const initialTxStatus = isTotallyFree ? 'HANDOVER_PENDING' : 'PAYMENT_PENDING';
      const initialPayStatus = isTotallyFree ? 'PAID' : 'UNPAID';

      await db.run(
        `INSERT INTO transactions (
          id, request_id, listing_id, borrower_id, owner_id,
          status, payment_status, total_rent, deposit_amount,
          deposit_status, handover_otp, return_otp, due_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          txId, id, request.listing_id, request.borrower_id, ownerId,
          initialTxStatus, initialPayStatus, request.total_rent, request.security_deposit,
          request.security_deposit > 0 ? 'HELD' : 'NONE',
          handoverOtp, returnOtp, request.end_date
        ]
      );

      // Send notification to borrower
      await createNotification({
        userId: request.borrower_id,
        title: 'Request Accepted! Complete Next Step',
        message: `Your request for "${listing.title}" was accepted! ${isTotallyFree ? 'Please coordinate handover with owner.' : 'Please complete checkout/payment to unlock handover details.'}`,
        type: 'REQUEST_ACCEPTED',
        link: `/transaction/${txId}`
      });

      return res.json({
        success: true,
        status: 'ACCEPTED',
        transactionId: txId,
        message: 'Request accepted! Transaction created and awaiting payment/handover.'
      });
    }

    return res.status(400).json({ success: false, error: 'Invalid action. Must be ACCEPT or REJECT.' });
  } catch (err) {
    console.error('Respond to request error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
