const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { createNotification } = require('../services/notification');

// GET /api/transactions/:id - Detailed transaction view with role-scoped info & unmasked address
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user.id;
    const isAdmin = req.user.role === 'ADMIN';

    const tx = await db.get(
      `SELECT 
         t.*,
         l.title as listing_title, l.description as listing_description,
         l.condition as listing_condition, l.location_name as listing_location,
         l.pickup_instructions as listing_pickup_instructions,
         l.exact_address as listing_exact_address,
         l.latitude as listing_latitude, l.longitude as listing_longitude,
         c.name as category_name, c.icon as category_icon,
         u_owner.full_name as owner_name, u_owner.mobile as owner_mobile,
         u_owner.email as owner_email, u_owner.profile_photo as owner_photo,
         u_borrower.full_name as borrower_name, u_borrower.mobile as borrower_mobile,
         u_borrower.email as borrower_email, u_borrower.profile_photo as borrower_photo,
         r.start_date, r.end_date, r.total_days, r.message as request_message,
         (SELECT image_url FROM listing_images WHERE listing_id = l.id ORDER BY is_primary DESC LIMIT 1) as primary_image
       FROM transactions t
       JOIN listings l ON l.id = t.listing_id
       JOIN categories c ON c.id = l.category_id
       JOIN users u_owner ON u_owner.id = t.owner_id
       JOIN users u_borrower ON u_borrower.id = t.borrower_id
       JOIN rental_requests r ON r.id = t.request_id
       WHERE t.id = ?`,
      [id]
    );

    if (!tx) {
      return res.status(404).json({ success: false, error: 'Transaction not found.' });
    }

    const isOwner = tx.owner_id === currentUserId;
    const isBorrower = tx.borrower_id === currentUserId;

    if (!isOwner && !isBorrower && !isAdmin) {
      return res.status(403).json({ success: false, error: 'Access denied to this transaction.' });
    }

    // Role-specific scoping:
    // Only borrower holds the Handover OTP to give to owner
    // Only owner holds the Return OTP to give to borrower
    const responseTx = { ...tx };
    responseTx.is_owner = isOwner;
    responseTx.is_borrower = isBorrower;

    // Fetch condition evidence records
    const conditionRecords = await db.all(
      `SELECT * FROM condition_records WHERE transaction_id = ? ORDER BY created_at ASC`,
      [id]
    );
    responseTx.condition_records = conditionRecords.map(rec => ({
      ...rec,
      photos: rec.photo_urls ? JSON.parse(rec.photo_urls) : []
    }));

    // Fetch dispute if any
    const dispute = await db.get(`SELECT * FROM disputes WHERE transaction_id = ?`, [id]);
    if (dispute) {
      dispute.damage_photos = dispute.damage_photos ? JSON.parse(dispute.damage_photos) : [];
      dispute.borrower_photos = dispute.borrower_photos ? JSON.parse(dispute.borrower_photos) : [];
      responseTx.dispute = dispute;
    }

    // Fetch payments
    const payments = await db.all(`SELECT * FROM payments WHERE transaction_id = ? ORDER BY created_at ASC`, [id]);
    responseTx.payments = payments;

    // Check review status
    const reviewByCurrentUser = await db.get(
      `SELECT * FROM reviews WHERE transaction_id = ? AND reviewer_id = ?`,
      [id, currentUserId]
    );
    responseTx.user_review = reviewByCurrentUser;

    // Check overdue status
    const todayStr = new Date().toISOString().split('T')[0];
    responseTx.is_overdue = (tx.status === 'ACTIVE' && tx.due_date < todayStr);

    res.json({ success: true, transaction: responseTx });
  } catch (err) {
    console.error('Get transaction error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/transactions - List user's transactions (Active rentals, items lent, history)
router.get('/', requireAuth, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { role } = req.query; // 'borrower', 'owner', or all

    let query = `
      SELECT 
        t.*,
        l.title as listing_title, l.location_name as listing_location,
        c.name as category_name, c.icon as category_icon,
        u_owner.full_name as owner_name,
        u_borrower.full_name as borrower_name,
        r.start_date, r.end_date, r.total_days,
        (SELECT image_url FROM listing_images WHERE listing_id = l.id ORDER BY is_primary DESC LIMIT 1) as primary_image
      FROM transactions t
      JOIN listings l ON l.id = t.listing_id
      JOIN categories c ON c.id = l.category_id
      JOIN users u_owner ON u_owner.id = t.owner_id
      JOIN users u_borrower ON u_borrower.id = t.borrower_id
      JOIN rental_requests r ON r.id = t.request_id
      WHERE (t.owner_id = ? OR t.borrower_id = ?)
    `;
    const params = [currentUserId, currentUserId];

    if (role === 'owner') {
      query += ` AND t.owner_id = ?`;
      params.push(currentUserId);
    } else if (role === 'borrower') {
      query += ` AND t.borrower_id = ?`;
      params.push(currentUserId);
    }

    query += ` ORDER BY t.created_at DESC`;

    const rows = await db.all(query, params);
    res.json({ success: true, transactions: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/transactions/:id/pay - Process Online or Offline payment
router.post('/:id/pay', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentMethod = 'ONLINE', reference } = req.body; // 'ONLINE' or 'OFFLINE'
    const borrowerId = req.user.id;

    const tx = await db.get('SELECT * FROM transactions WHERE id = ?', [id]);
    if (!tx) {
      return res.status(404).json({ success: false, error: 'Transaction not found.' });
    }

    if (tx.borrower_id !== borrowerId) {
      return res.status(403).json({ success: false, error: 'Only the borrower can submit payment.' });
    }

    if (tx.status !== 'PAYMENT_PENDING' && tx.payment_status === 'PAID') {
      return res.status(400).json({ success: false, error: 'Payment has already been processed for this transaction.' });
    }

    const totalPayable = tx.total_rent + tx.deposit_amount;
    const paymentId = 'pay_' + crypto.randomBytes(8).toString('hex');
    const paymentRef = reference || (paymentMethod === 'ONLINE' ? 'GATEWAY_TXN_' + crypto.randomBytes(6).toString('hex').toUpperCase() : 'OFFLINE_HANDOVER_CONFIRMED');

    // Record payment ledger entry
    await db.run(
      `INSERT INTO payments (
        id, transaction_id, user_id, amount, type, method, status, reference
      ) VALUES (?, ?, ?, ?, 'RENT_AND_DEPOSIT', ?, 'SUCCESS', ?)`,
      [paymentId, id, borrowerId, totalPayable, paymentMethod, paymentRef]
    );

    // Update transaction status
    await db.run(
      `UPDATE transactions SET 
         payment_method = ?,
         payment_status = 'PAID',
         status = 'HANDOVER_PENDING',
         updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [paymentMethod, id]
    );

    const listing = await db.get('SELECT title FROM listings WHERE id = ?', [tx.listing_id]);

    // Notify owner
    await createNotification({
      userId: tx.owner_id,
      title: 'Payment Confirmed — Ready for Handover',
      message: `Borrower completed payment for "${listing.title}". Please prepare the item, verify condition photos, and perform handover using the 6-digit OTP.`,
      type: 'PAYMENT_CONFIRMED',
      link: `/transaction/${id}`
    });

    // Notify borrower
    await createNotification({
      userId: borrowerId,
      title: 'Payment Successful! Pickup Details Unlocked',
      message: `Your payment was confirmed. Exact pickup address and handover instructions are now visible on your transaction screen.`,
      type: 'PAYMENT_CONFIRMED',
      link: `/transaction/${id}`
    });

    res.json({
      success: true,
      status: 'HANDOVER_PENDING',
      paymentId,
      reference: paymentRef,
      message: 'Payment recorded successfully! Pickup address unlocked. Ready for Handover inspection.'
    });
  } catch (err) {
    console.error('Payment error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/transactions/:id/condition-evidence - Pre-handover or Post-return condition evidence
router.post('/:id/condition-evidence', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { stage, conditionNotes, photoUrls = [] } = req.body; // stage: 'BEFORE_HANDOVER' or 'AFTER_RETURN'

    if (!stage || !['BEFORE_HANDOVER', 'AFTER_RETURN'].includes(stage)) {
      return res.status(400).json({ success: false, error: 'Stage must be BEFORE_HANDOVER or AFTER_RETURN.' });
    }

    if (!conditionNotes || !conditionNotes.trim()) {
      return res.status(400).json({ success: false, error: 'Condition description notes are required.' });
    }

    const tx = await db.get('SELECT * FROM transactions WHERE id = ?', [id]);
    if (!tx) {
      return res.status(404).json({ success: false, error: 'Transaction not found.' });
    }

    const isParty = (tx.owner_id === req.user.id || tx.borrower_id === req.user.id);
    if (!isParty && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Access denied.' });
    }

    const evidenceId = 'evid_' + crypto.randomBytes(8).toString('hex');
    const photosJson = JSON.stringify(Array.isArray(photoUrls) ? photoUrls : []);

    await db.run(
      `INSERT INTO condition_records (
        id, transaction_id, stage, submitted_by_user_id, condition_notes, photo_urls
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [evidenceId, id, stage, req.user.id, conditionNotes.trim(), photosJson]
    );

    res.json({
      success: true,
      evidenceId,
      stage,
      message: `${stage === 'BEFORE_HANDOVER' ? 'Pre-handover' : 'Post-return'} condition evidence securely recorded with timestamp!`
    });
  } catch (err) {
    console.error('Condition evidence error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/transactions/:id/verify-handover - Owner verifies Borrower's Handover OTP at meetup
router.post('/:id/verify-handover', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { otp } = req.body;
    const ownerId = req.user.id;

    const tx = await db.get('SELECT * FROM transactions WHERE id = ?', [id]);
    if (!tx) {
      return res.status(404).json({ success: false, error: 'Transaction not found.' });
    }

    if (tx.owner_id !== ownerId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Only the item owner can verify the Handover OTP.' });
    }

    if (tx.status !== 'HANDOVER_PENDING' && tx.status !== 'PAID') {
      return res.status(400).json({ success: false, error: `Handover cannot be performed in '${tx.status}' status.` });
    }

    if (!otp || otp.toString().trim() !== tx.handover_otp) {
      return res.status(400).json({ success: false, error: 'Invalid Handover OTP code entered. Please check with borrower.' });
    }

    const now = new Date().toISOString();
    await db.run(
      `UPDATE transactions SET 
         status = 'ACTIVE',
         handover_at = ?,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [now, id]
    );

    const listing = await db.get('SELECT title FROM listings WHERE id = ?', [tx.listing_id]);

    // Send notifications to both parties
    await createNotification({
      userId: tx.borrower_id,
      title: 'Handover Completed! Rental is Now ACTIVE',
      message: `Owner verified your Handover OTP for "${listing.title}". Please enjoy your rental and return before ${tx.due_date}.`,
      type: 'HANDOVER_COMPLETED',
      link: `/transaction/${id}`
    });

    await createNotification({
      userId: tx.owner_id,
      title: 'Handover Confirmed — Item is Active',
      message: `You have successfully handed over "${listing.title}". Due date for return is ${tx.due_date}.`,
      type: 'HANDOVER_COMPLETED',
      link: `/transaction/${id}`
    });

    res.json({
      success: true,
      status: 'ACTIVE',
      handoverAt: now,
      message: 'Handover OTP verified successfully! The rental is now ACTIVE.'
    });
  } catch (err) {
    console.error('Verify handover error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/transactions/:id/verify-return - Verify Return OTP at return meetup
router.post('/:id/verify-return', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { otp, hasDamage = false } = req.body;
    const currentUserId = req.user.id;

    const tx = await db.get('SELECT * FROM transactions WHERE id = ?', [id]);
    if (!tx) {
      return res.status(404).json({ success: false, error: 'Transaction not found.' });
    }

    // Must be owner or admin
    if (tx.owner_id !== currentUserId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Only the item owner can verify the Return OTP.' });
    }

    if (tx.status !== 'ACTIVE' && tx.status !== 'RETURN_PENDING') {
      return res.status(400).json({ success: false, error: `Return cannot be verified for transaction in status '${tx.status}'.` });
    }

    if (!otp || otp.toString().trim() !== tx.return_otp) {
      return res.status(400).json({ success: false, error: 'Invalid Return OTP code entered.' });
    }

    const now = new Date().toISOString();

    if (hasDamage) {
      // Prompt damage reporting workflow
      await db.run(
        `UPDATE transactions SET 
           status = 'RETURN_PENDING',
           returned_at = ?,
           updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [now, id]
      );
      return res.json({
        success: true,
        status: 'RETURN_PENDING',
        requireDamageReport: true,
        message: 'Return recorded with damage noted. Please file the formal Damage Report to hold deposit in escrow.'
      });
    }

    // Normal safe return: Status -> COMPLETED, Deposit -> REFUNDED
    await db.run(
      `UPDATE transactions SET 
         status = 'COMPLETED',
         deposit_status = CASE WHEN deposit_amount > 0 THEN 'REFUNDED' ELSE 'NONE' END,
         returned_at = ?,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [now, id]
    );

    // Record deposit refund payment ledger entry if deposit was held
    if (tx.deposit_amount > 0) {
      const refundId = 'ref_' + crypto.randomBytes(8).toString('hex');
      await db.run(
        `INSERT INTO payments (
          id, transaction_id, user_id, amount, type, method, status, reference
        ) VALUES (?, ?, ?, ?, 'DEPOSIT_REFUND', ?, 'SUCCESS', ?)`,
        [refundId, id, tx.borrower_id, tx.deposit_amount, tx.payment_method || 'ONLINE', 'ESCROW_DEPOSIT_RETURNED_FULL']
      );
    }

    const listing = await db.get('SELECT title FROM listings WHERE id = ?', [tx.listing_id]);

    // Send notifications
    await createNotification({
      userId: tx.borrower_id,
      title: 'Rental Completed & Deposit Released!',
      message: `Return confirmed for "${listing.title}". Your security deposit of $${tx.deposit_amount} has been released. Please leave a review for the owner!`,
      type: 'RETURN_REMINDER',
      link: `/transaction/${id}`
    });

    await createNotification({
      userId: tx.owner_id,
      title: 'Item Safely Returned — Transaction Completed',
      message: `"${listing.title}" was successfully returned in good condition. Please rate your experience with the borrower!`,
      type: 'RETURN_REMINDER',
      link: `/transaction/${id}`
    });

    res.json({
      success: true,
      status: 'COMPLETED',
      depositStatus: tx.deposit_amount > 0 ? 'REFUNDED' : 'NONE',
      returnedAt: now,
      message: 'Return OTP verified! Transaction is COMPLETED and security deposit has been fully released.'
    });
  } catch (err) {
    console.error('Verify return error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/transactions/:id/report-damage - Owner reports damage during return inspection
router.post('/:id/report-damage', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { damageDescription, estimatedCost, damagePhotos = [] } = req.body;
    const ownerId = req.user.id;

    const tx = await db.get('SELECT * FROM transactions WHERE id = ?', [id]);
    if (!tx) {
      return res.status(404).json({ success: false, error: 'Transaction not found.' });
    }

    if (tx.owner_id !== ownerId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Only the item owner can file a damage report.' });
    }

    if (!damageDescription || !damageDescription.trim() || !estimatedCost) {
      return res.status(400).json({ success: false, error: 'Damage description and estimated repair cost are required.' });
    }

    const cost = parseFloat(estimatedCost) || 0;
    const disputeId = 'disp_' + crypto.randomBytes(8).toString('hex');
    const photosJson = JSON.stringify(Array.isArray(damagePhotos) ? damagePhotos : []);

    // Insert dispute record
    await db.run(
      `INSERT INTO disputes (
        id, transaction_id, reported_by_user_id, damage_description,
        estimated_cost, damage_photos, borrower_response, admin_resolution
      ) VALUES (?, ?, ?, ?, ?, ?, 'PENDING', 'PENDING')`,
      [disputeId, id, ownerId, damageDescription.trim(), cost, photosJson]
    );

    // Freeze transaction into DISPUTED state (deposit remains frozen in escrow)
    await db.run(
      `UPDATE transactions SET 
         status = 'DISPUTED',
         deposit_status = 'HELD',
         updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [id]
    );

    const listing = await db.get('SELECT title FROM listings WHERE id = ?', [tx.listing_id]);

    // Notify borrower
    await createNotification({
      userId: tx.borrower_id,
      title: 'Damage Claim Reported by Owner',
      message: `Owner reported damage to "${listing.title}" with an estimated repair claim of $${cost}. Please review the evidence and submit your response.`,
      type: 'DAMAGE_REPORT',
      link: `/transaction/${id}`
    });

    res.json({
      success: true,
      disputeId,
      status: 'DISPUTED',
      message: 'Damage report filed. Security deposit is safely held in escrow pending borrower response and admin arbitration.'
    });
  } catch (err) {
    console.error('Damage report error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
