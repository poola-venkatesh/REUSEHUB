const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { createNotification } = require('../services/notification');

// GET /api/disputes/:id - Fetch dispute with complete evidence dossier
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user.id;
    const isAdmin = req.user.role === 'ADMIN';

    const dispute = await db.get(
      `SELECT 
         d.*,
         t.total_rent, t.deposit_amount, t.deposit_status, t.payment_method,
         t.due_date, t.handover_at, t.returned_at,
         l.id as listing_id, l.title as listing_title,
         u_owner.id as owner_id, u_owner.full_name as owner_name, u_owner.email as owner_email,
         u_borrower.id as borrower_id, u_borrower.full_name as borrower_name, u_borrower.email as borrower_email
       FROM disputes d
       JOIN transactions t ON t.id = d.transaction_id
       JOIN listings l ON l.id = t.listing_id
       JOIN users u_owner ON u_owner.id = t.owner_id
       JOIN users u_borrower ON u_borrower.id = t.borrower_id
       WHERE d.id = ? OR d.transaction_id = ?`,
      [id, id]
    );

    if (!dispute) {
      return res.status(404).json({ success: false, error: 'Dispute record not found.' });
    }

    const isParty = (dispute.owner_id === currentUserId || dispute.borrower_id === currentUserId);
    if (!isParty && !isAdmin) {
      return res.status(403).json({ success: false, error: 'Access denied.' });
    }

    dispute.damage_photos = dispute.damage_photos ? JSON.parse(dispute.damage_photos) : [];
    dispute.borrower_photos = dispute.borrower_photos ? JSON.parse(dispute.borrower_photos) : [];

    // Fetch before & after condition records for side-by-side comparison
    const conditionRecords = await db.all(
      `SELECT * FROM condition_records WHERE transaction_id = ? ORDER BY created_at ASC`,
      [dispute.transaction_id]
    );
    dispute.condition_evidence = conditionRecords.map(r => ({
      ...r,
      photos: r.photo_urls ? JSON.parse(r.photo_urls) : []
    }));

    res.json({ success: true, dispute });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/disputes/:id/respond - Borrower responds to damage claim
router.post('/:id/respond', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { response, notes, photos = [] } = req.body; // response: 'ACCEPTED' or 'CONTESTED'
    const currentUserId = req.user.id;

    if (!response || !['ACCEPTED', 'CONTESTED'].includes(response)) {
      return res.status(400).json({ success: false, error: "Response must be either 'ACCEPTED' or 'CONTESTED'." });
    }

    const dispute = await db.get(
      `SELECT d.*, t.borrower_id, t.owner_id, l.title as listing_title 
       FROM disputes d
       JOIN transactions t ON t.id = d.transaction_id
       JOIN listings l ON l.id = t.listing_id
       WHERE d.id = ?`,
      [id]
    );

    if (!dispute) {
      return res.status(404).json({ success: false, error: 'Dispute not found.' });
    }

    if (dispute.borrower_id !== currentUserId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Only the borrower can respond to this dispute.' });
    }

    const photosJson = JSON.stringify(Array.isArray(photos) ? photos : []);

    await db.run(
      `UPDATE disputes SET 
         borrower_response = ?,
         borrower_notes = ?,
         borrower_photos = ?,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [response, notes || '', photosJson, id]
    );

    // Notify owner
    await createNotification({
      userId: dispute.owner_id,
      title: `Borrower Responded to Damage Claim: ${response}`,
      message: `Borrower has ${response === 'ACCEPTED' ? 'agreed to the claim' : 'contested the damage claim and submitted counter-evidence'}. Admin arbitration review is now active.`,
      type: 'DISPUTE_UPDATE',
      link: `/transaction/${dispute.transaction_id}`
    });

    res.json({
      success: true,
      borrowerResponse: response,
      message: `Your response (${response}) and counter-evidence have been recorded for Admin arbitration.`
    });
  } catch (err) {
    console.error('Dispute respond error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
