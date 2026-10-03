const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { createNotification } = require('../services/notification');
const { getPlatformImpactMetrics } = require('../services/impact');

// Apply Admin guard to all routes
router.use(requireAuth, requireAdmin);

// GET /api/admin/overview - High-level metrics & stats
router.get('/overview', async (req, res) => {
  try {
    const userCount = await db.get('SELECT COUNT(*) as count FROM users');
    const pendingListings = await db.get("SELECT COUNT(*) as count FROM listings WHERE status = 'PENDING'");
    const approvedListings = await db.get("SELECT COUNT(*) as count FROM listings WHERE status = 'APPROVED'");
    const activeTransactions = await db.get("SELECT COUNT(*) as count FROM transactions WHERE status = 'ACTIVE'");
    const pendingDisputes = await db.get("SELECT COUNT(*) as count FROM disputes WHERE admin_resolution = 'PENDING'");
    const pendingReports = await db.get("SELECT COUNT(*) as count FROM reports WHERE status = 'PENDING'");
    const escrowHeld = await db.get("SELECT SUM(deposit_amount) as total FROM transactions WHERE deposit_status = 'HELD'");

    const impact = await getPlatformImpactMetrics();

    res.json({
      success: true,
      stats: {
        totalUsers: userCount ? userCount.count : 0,
        pendingModeration: pendingListings ? pendingListings.count : 0,
        approvedListings: approvedListings ? approvedListings.count : 0,
        activeRentals: activeTransactions ? activeTransactions.count : 0,
        pendingDisputes: pendingDisputes ? pendingDisputes.count : 0,
        pendingReports: pendingReports ? pendingReports.count : 0,
        totalEscrowHeld: escrowHeld && escrowHeld.total ? escrowHeld.total : 0
      },
      impact
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/admin/moderation-queue - Listings awaiting review
router.get('/moderation-queue', async (req, res) => {
  try {
    const rows = await db.all(
      `SELECT 
         l.*, c.name as category_name, c.icon as category_icon,
         u.full_name as owner_name, u.email as owner_email, u.mobile as owner_mobile,
         u.location_name as owner_city, u.is_mobile_verified as owner_verified,
         (SELECT image_url FROM listing_images WHERE listing_id = l.id ORDER BY is_primary DESC LIMIT 1) as primary_image
       FROM listings l
       JOIN categories c ON c.id = l.category_id
       JOIN users u ON u.id = l.owner_id
       WHERE l.status = 'PENDING'
       ORDER BY l.created_at ASC`
    );

    // Attach all photos
    for (const item of rows) {
      const images = await db.all('SELECT image_url FROM listing_images WHERE listing_id = ?', [item.id]);
      item.images = images.map(img => img.image_url);
    }

    res.json({ success: true, count: rows.length, queue: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/moderation/:listingId - Approve or Reject listing
router.post('/moderation/:listingId', async (req, res) => {
  try {
    const { listingId } = req.params;
    const { action, rejectReason, rejectNotes } = req.body; // action: 'APPROVE' or 'REJECT'

    const listing = await db.get('SELECT * FROM listings WHERE id = ?', [listingId]);
    if (!listing) {
      return res.status(404).json({ success: false, error: 'Listing not found.' });
    }

    if (action === 'APPROVE') {
      await db.run(
        `UPDATE listings SET status = 'APPROVED', reject_reason = NULL, reject_notes = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [listingId]
      );

      await createNotification({
        userId: listing.owner_id,
        title: 'Listing Approved & Published! 🎉',
        message: `Your listing "${listing.title}" was approved by Admin and is now publicly visible for rent/borrow.`,
        type: 'LISTING_APPROVED',
        link: `/listing/${listingId}`
      });

      return res.json({ success: true, status: 'APPROVED', message: 'Listing approved and is now public!' });
    }

    if (action === 'REJECT') {
      const validReasons = [
        'Prohibited item',
        'Unsafe listing',
        'Misleading information',
        'Incomplete details',
        'Duplicate listing',
        'Other'
      ];

      if (!rejectReason || !validReasons.includes(rejectReason)) {
        return res.status(400).json({
          success: false,
          error: `Please select a valid reject reason: ${validReasons.join(', ')}.`
        });
      }

      await db.run(
        `UPDATE listings SET status = 'REJECTED', reject_reason = ?, reject_notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [rejectReason, rejectNotes || '', listingId]
      );

      await createNotification({
        userId: listing.owner_id,
        title: 'Listing Submission Declined',
        message: `Your listing "${listing.title}" could not be approved. Reason: ${rejectReason}. Notes: ${rejectNotes || 'Please update your listing.'}`,
        type: 'LISTING_REJECTED',
        link: `/dashboard?tab=listings`
      });

      return res.json({ success: true, status: 'REJECTED', message: 'Listing rejected. Owner has been notified with the reason.' });
    }

    res.status(400).json({ success: false, error: 'Invalid action. Must be APPROVE or REJECT.' });
  } catch (err) {
    console.error('Moderation action error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/admin/reports - Listing reports queue
router.get('/reports', async (req, res) => {
  try {
    const rows = await db.all(
      `SELECT 
         r.*,
         l.title as listing_title, l.status as listing_status,
         u_rep.full_name as reporter_name, u_rep.email as reporter_email,
         u_own.full_name as owner_name, u_own.id as owner_id
       FROM reports r
       JOIN listings l ON l.id = r.listing_id
       JOIN users u_rep ON u_rep.id = r.reporter_id
       JOIN users u_own ON u_own.id = l.owner_id
       ORDER BY r.created_at DESC`
    );
    res.json({ success: true, reports: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/reports/:reportId - Handle report
router.post('/reports/:reportId', async (req, res) => {
  try {
    const { reportId } = req.params;
    const { action } = req.body; // 'KEEP_ACTIVE', 'HIDE', 'REMOVE'

    const report = await db.get('SELECT * FROM reports WHERE id = ?', [reportId]);
    if (!report) {
      return res.status(404).json({ success: false, error: 'Report not found.' });
    }

    if (action === 'HIDE') {
      await db.run("UPDATE listings SET status = 'HIDDEN' WHERE id = ?", [report.listing_id]);
      await db.run("UPDATE reports SET status = 'ACTIONED', admin_action = 'HIDDEN' WHERE id = ?", [reportId]);
    } else if (action === 'REMOVE') {
      await db.run("UPDATE listings SET status = 'REJECTED', reject_reason = 'Prohibited item / Safety concern' WHERE id = ?", [report.listing_id]);
      await db.run("UPDATE reports SET status = 'ACTIONED', admin_action = 'REMOVED' WHERE id = ?", [reportId]);
    } else {
      await db.run("UPDATE reports SET status = 'DISMISSED', admin_action = 'KEPT_ACTIVE' WHERE id = ?", [reportId]);
    }

    res.json({ success: true, message: `Report handled with action: ${action}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/admin/disputes - All disputes with before/after evidence
router.get('/disputes', async (req, res) => {
  try {
    const rows = await db.all(
      `SELECT 
         d.*,
         t.total_rent, t.deposit_amount, t.deposit_status, t.due_date,
         l.title as listing_title,
         u_own.full_name as owner_name, u_own.email as owner_email,
         u_bor.full_name as borrower_name, u_bor.email as borrower_email
       FROM disputes d
       JOIN transactions t ON t.id = d.transaction_id
       JOIN listings l ON l.id = t.listing_id
       JOIN users u_own ON u_own.id = t.owner_id
       JOIN users u_bor ON u_bor.id = t.borrower_id
       ORDER BY d.created_at DESC`
    );

    for (const d of rows) {
      d.damage_photos = d.damage_photos ? JSON.parse(d.damage_photos) : [];
      d.borrower_photos = d.borrower_photos ? JSON.parse(d.borrower_photos) : [];
      // Fetch before & after condition records
      const conditionRecords = await db.all(
        `SELECT * FROM condition_records WHERE transaction_id = ? ORDER BY created_at ASC`,
        [d.transaction_id]
      );
      d.condition_evidence = conditionRecords.map(r => ({
        ...r,
        photos: r.photo_urls ? JSON.parse(r.photo_urls) : []
      }));
    }

    res.json({ success: true, disputes: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/disputes/:disputeId/resolve - Arbitrate dispute
router.post('/disputes/:disputeId/resolve', async (req, res) => {
  try {
    const { disputeId } = req.params;
    const { resolution, deductedAmount = 0, adminNotes } = req.body;

    const validResolutions = ['CLOSED_DISMISSED', 'RESOLVED_DEDUCTION', 'RESOLVE_DEDUCTION', 'REQUEST_MORE_INFO', 'ESCALATED', 'ESCALATE'];
    if (!validResolutions.includes(resolution)) {
      return res.status(400).json({ success: false, error: `Invalid resolution. Must be one of: ${validResolutions.join(', ')}.` });
    }

    const dispute = await db.get(
      `SELECT d.*, t.deposit_amount, t.borrower_id, t.owner_id, l.title as listing_title
       FROM disputes d
       JOIN transactions t ON t.id = d.transaction_id
       JOIN listings l ON l.id = t.listing_id
       WHERE d.id = ?`,
      [disputeId]
    );

    if (!dispute) {
      return res.status(404).json({ success: false, error: 'Dispute not found.' });
    }

    const totalDeposit = dispute.deposit_amount || 0;
    const approvedDeduction = Math.min(totalDeposit, Math.max(0, parseFloat(deductedAmount) || 0));
    const refundedDeposit = Math.max(0, totalDeposit - approvedDeduction);

    if (resolution === 'CLOSED_DISMISSED') {
      // 100% deposit released back to borrower
      await db.run(
        `UPDATE disputes SET admin_resolution = 'CLOSED_DISMISSED', deducted_amount = 0, refunded_amount = ?, admin_notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [totalDeposit, adminNotes || 'Claim dismissed after evidence review', disputeId]
      );

      await db.run(
        `UPDATE transactions SET status = 'COMPLETED', deposit_status = 'REFUNDED', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [dispute.transaction_id]
      );

      // Record refund payment
      const pId = 'pay_' + crypto.randomBytes(8).toString('hex');
      await db.run(
        `INSERT INTO payments (id, transaction_id, user_id, amount, type, method, status, reference)
         VALUES (?, ?, ?, ?, 'DEPOSIT_REFUND', 'ONLINE', 'SUCCESS', 'ADMIN_DISPUTE_FULL_REFUND')`,
        [pId, dispute.transaction_id, dispute.borrower_id, totalDeposit]
      );

      // Notify parties
      await createNotification({
        userId: dispute.borrower_id,
        title: 'Dispute Resolved: Claim Dismissed',
        message: `Admin reviewed the evidence for "${dispute.listing_title}". Full deposit ($${totalDeposit}) has been released back to you.`,
        type: 'DISPUTE_UPDATE',
        link: `/transaction/${dispute.transaction_id}`
      });

      await createNotification({
        userId: dispute.owner_id,
        title: 'Dispute Resolved: Claim Dismissed',
        message: `Admin resolved dispute for "${dispute.listing_title}". Damage claim was dismissed based on prior condition records.`,
        type: 'DISPUTE_UPDATE',
        link: `/transaction/${dispute.transaction_id}`
      });
    } else if (resolution === 'RESOLVE_DEDUCTION') {
      // Deduct approved amount to owner, refund remaining to borrower
      await db.run(
        `UPDATE disputes SET admin_resolution = 'RESOLVED_DEDUCTION', deducted_amount = ?, refunded_amount = ?, admin_notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [approvedDeduction, refundedDeposit, adminNotes || 'Resolved according to verified damages', disputeId]
      );

      const depStatus = refundedDeposit > 0 ? 'PARTIALLY_REFUNDED' : 'FORFEITED';
      await db.run(
        `UPDATE transactions SET status = 'COMPLETED', deposit_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [depStatus, dispute.transaction_id]
      );

      // Record damage payout to owner
      if (approvedDeduction > 0) {
        const p1 = 'pay_' + crypto.randomBytes(8).toString('hex');
        await db.run(
          `INSERT INTO payments (id, transaction_id, user_id, amount, type, method, status, reference)
           VALUES (?, ?, ?, ?, 'DAMAGE_PAYOUT', 'ONLINE', 'SUCCESS', 'ADMIN_DISPUTE_PAYOUT_TO_OWNER')`,
          [p1, dispute.transaction_id, dispute.owner_id, approvedDeduction]
        );
      }

      // Record refund of remaining deposit to borrower
      if (refundedDeposit > 0) {
        const p2 = 'pay_' + crypto.randomBytes(8).toString('hex');
        await db.run(
          `INSERT INTO payments (id, transaction_id, user_id, amount, type, method, status, reference)
           VALUES (?, ?, ?, ?, 'DEPOSIT_REFUND', 'ONLINE', 'SUCCESS', 'ADMIN_DISPUTE_REMAINDER_REFUND')`,
          [p2, dispute.transaction_id, dispute.borrower_id, refundedDeposit]
        );
      }

      // Notify parties
      await createNotification({
        userId: dispute.owner_id,
        title: 'Dispute Resolved: Compensation Awarded',
        message: `Admin approved a repair deduction of $${approvedDeduction} for "${dispute.listing_title}". Payout processed.`,
        type: 'DISPUTE_UPDATE',
        link: `/transaction/${dispute.transaction_id}`
      });

      await createNotification({
        userId: dispute.borrower_id,
        title: 'Dispute Resolved',
        message: `Admin finalized dispute for "${dispute.listing_title}". $${approvedDeduction} deducted for verified repairs; remaining $${refundedDeposit} refunded to you.`,
        type: 'DISPUTE_UPDATE',
        link: `/transaction/${dispute.transaction_id}`
      });
    } else {
      // REQUEST_MORE_INFO or ESCALATE
      await db.run(
        `UPDATE disputes SET admin_resolution = ?, admin_notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [resolution, adminNotes || '', disputeId]
      );

      await createNotification({
        userId: dispute.owner_id,
        title: `Dispute Status: ${resolution}`,
        message: `Admin update for "${dispute.listing_title}": ${adminNotes || 'Further review pending.'}`,
        type: 'DISPUTE_UPDATE',
        link: `/transaction/${dispute.transaction_id}`
      });

      await createNotification({
        userId: dispute.borrower_id,
        title: `Dispute Status: ${resolution}`,
        message: `Admin update for "${dispute.listing_title}": ${adminNotes || 'Further review pending.'}`,
        type: 'DISPUTE_UPDATE',
        link: `/transaction/${dispute.transaction_id}`
      });
    }

    res.json({
      success: true,
      resolution,
      deductedAmount: approvedDeduction,
      refundedAmount: refundedDeposit,
      message: `Dispute successfully arbitrated with resolution: ${resolution}.`
    });
  } catch (err) {
    console.error('Resolve dispute error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/admin/users - User management
router.get('/users', async (req, res) => {
  try {
    const users = await db.all(
      `SELECT 
         id, full_name, email, mobile, role, location_name,
         is_mobile_verified, is_email_verified, is_active, created_at,
         (SELECT COUNT(*) FROM listings WHERE owner_id = users.id) as listing_count,
         (SELECT COUNT(*) FROM transactions WHERE (borrower_id = users.id OR owner_id = users.id) AND status = 'COMPLETED') as completed_exchanges
       FROM users
       ORDER BY created_at DESC`
    );
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/admin/users/:userId/toggle-status - Ban/Unban user
router.put('/users/:userId/toggle-status', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ success: false, error: 'User not found.' });

    const newStatus = user.is_active === 1 ? 0 : 1;
    await db.run('UPDATE users SET is_active = ? WHERE id = ?', [newStatus, userId]);

    res.json({
      success: true,
      isActive: newStatus,
      message: `User account has been ${newStatus === 1 ? 'activated' : 'deactivated/banned'}.`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


// POST /api/admin/run-reminders - Manually trigger automated return & overdue notifications
router.post('/run-reminders', async (req, res) => {
  try {
    const { checkDueDatesAndSendReminders } = require('../services/reminders');
    await checkDueDatesAndSendReminders();
    res.json({ success: true, message: 'Automated return reminders and overdue checks processed successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

