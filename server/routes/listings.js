const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const db = require('../db');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { sanitizeListingForUser, maskContact } = require('../middleware/privacy');
const { checkProhibitedItem } = require('../services/prohibited');
const { calculateDistanceKm, parseNaturalLanguageQuery, scoreListing } = require('../services/smartMatch');
const { createNotification } = require('../services/notification');

// GET /api/listings - Browse and search approved listings
router.get('/', optionalAuth, async (req, res) => {
  try {
    const {
      search,
      category,
      type, // 'all', 'rent', 'borrow'
      condition,
      minPrice,
      maxPrice,
      lat,
      lng,
      radiusKm,
      sort
    } = req.query;

    let query = `
      SELECT 
        l.id, l.owner_id, l.category_id, l.title, l.description, l.condition,
        l.rent_price_per_day, l.is_borrow_free, l.security_deposit,
        l.available_from, l.available_to, l.location_name, l.latitude, l.longitude,
        l.status, l.created_at,
        c.name as category_name, c.icon as category_icon,
        u.full_name as owner_name, u.profile_photo as owner_photo,
        u.is_mobile_verified as owner_verified,
        (SELECT image_url FROM listing_images WHERE listing_id = l.id ORDER BY is_primary DESC, created_at ASC LIMIT 1) as primary_image
      FROM listings l
      JOIN categories c ON c.id = l.category_id
      JOIN users u ON u.id = l.owner_id
      WHERE l.status = 'APPROVED'
    `;
    const params = [];

    if (search) {
      query += ` AND (l.title LIKE ? OR l.description LIKE ? OR c.name LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (category) {
      query += ` AND (c.slug = ? OR c.id = ? OR c.name = ?)`;
      params.push(category, category, category);
    }

    if (type === 'rent') {
      query += ` AND l.rent_price_per_day > 0`;
    } else if (type === 'borrow') {
      query += ` AND l.is_borrow_free = 1`;
    }

    if (condition) {
      query += ` AND l.condition = ?`;
      params.push(condition);
    }

    if (minPrice !== undefined && minPrice !== '') {
      query += ` AND l.rent_price_per_day >= ?`;
      params.push(parseFloat(minPrice));
    }

    if (maxPrice !== undefined && maxPrice !== '') {
      query += ` AND l.rent_price_per_day <= ?`;
      params.push(parseFloat(maxPrice));
    }

    const rows = await db.all(query, params);

    const userLat = lat ? parseFloat(lat) : (req.user ? req.user.latitude : null);
    const userLng = lng ? parseFloat(lng) : (req.user ? req.user.longitude : null);
    const maxRadius = radiusKm ? parseFloat(radiusKm) : null;

    let results = [];
    for (const item of rows) {
      const distance = calculateDistanceKm(userLat, userLng, item.latitude, item.longitude);
      if (maxRadius !== null && distance !== null && distance > maxRadius) {
        continue; // Exceeds requested radius
      }

      const sanitized = await sanitizeListingForUser(item, req.user ? req.user.id : null);
      sanitized.distance_km = distance;
      results.push(sanitized);
    }

    // Sorting
    if (sort === 'nearest' && userLat && userLng) {
      results.sort((a, b) => (a.distance_km || 9999) - (b.distance_km || 9999));
    } else if (sort === 'price_asc') {
      results.sort((a, b) => a.rent_price_per_day - b.rent_price_per_day);
    } else if (sort === 'price_desc') {
      results.sort((a, b) => b.rent_price_per_day - a.rent_price_per_day);
    } else {
      // Default: recently added
      results.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    res.json({ success: true, count: results.length, listings: results });
  } catch (err) {
    console.error('Listings browse error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/listings/smart-match - Natural-language Smart Match
router.post('/smart-match', optionalAuth, async (req, res) => {
  try {
    const { query, lat, lng } = req.body;
    if (!query || !query.trim()) {
      return res.status(400).json({ success: false, error: 'Natural language search query is required.' });
    }

    const parsed = parseNaturalLanguageQuery(query);

    const userLat = lat !== undefined ? parseFloat(lat) : (req.user ? req.user.latitude : 17.3850);
    const userLng = lng !== undefined ? parseFloat(lng) : (req.user ? req.user.longitude : 78.4867);

    // Fetch approved listings with owner info
    const rawListings = await db.all(`
      SELECT 
        l.*, c.name as category_name, c.icon as category_icon,
        u.full_name as owner_name, u.profile_photo as owner_photo,
        u.is_mobile_verified as owner_verified,
        (SELECT image_url FROM listing_images WHERE listing_id = l.id ORDER BY is_primary DESC LIMIT 1) as primary_image
      FROM listings l
      JOIN categories c ON c.id = l.category_id
      JOIN users u ON u.id = l.owner_id
      WHERE l.status = 'APPROVED'
    `);

    const scoredMatches = [];
    for (const item of rawListings) {
      const matchResult = scoreListing(item, parsed, userLat, userLng);
      // Only include matches that have at least some relevance score or distance proximity
      if (matchResult.score > 25) {
        const sanitized = await sanitizeListingForUser(item, req.user ? req.user.id : null);
        scoredMatches.push({
          ...sanitized,
          match_score: matchResult.score,
          distance_km: matchResult.distanceKm,
          estimated_total: matchResult.totalEstimatedCost,
          match_explanation: matchResult.explanation
        });
      }
    }

    // Sort descending by match score
    scoredMatches.sort((a, b) => b.match_score - a.match_score);

    res.json({
      success: true,
      query,
      parsedQuery: parsed,
      count: scoredMatches.length,
      matches: scoredMatches
    });
  } catch (err) {
    console.error('Smart match error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/listings/:id - Item Details View
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user ? req.user.id : null;

    const listing = await db.get(
      `SELECT 
         l.*, c.name as category_name, c.icon as category_icon,
         u.full_name as owner_name, u.profile_photo as owner_photo,
         u.email as owner_email, u.mobile as owner_mobile,
         u.is_mobile_verified as owner_verified,
         u.created_at as owner_joined_at,
         (SELECT COUNT(*) FROM transactions WHERE (owner_id = u.id OR borrower_id = u.id) AND status = 'COMPLETED') as owner_completed_exchanges,
         COALESCE((SELECT AVG(rating) FROM reviews WHERE reviewee_id = u.id), 5.0) as owner_rating,
         (SELECT COUNT(*) FROM reviews WHERE reviewee_id = u.id) as owner_review_count
       FROM listings l
       JOIN categories c ON c.id = l.category_id
       JOIN users u ON u.id = l.owner_id
       WHERE l.id = ?`,
      [id]
    );

    if (!listing) {
      return res.status(404).json({ success: false, error: 'Listing not found.' });
    }

    // If listing is not APPROVED, only owner or Admin can view
    if (listing.status !== 'APPROVED') {
      const isOwner = currentUserId && listing.owner_id === currentUserId;
      const isAdmin = req.user && req.user.role === 'ADMIN';
      if (!isOwner && !isAdmin) {
        return res.status(403).json({
          success: false,
          error: 'This listing is currently pending moderation or under review and is not publicly accessible.'
        });
      }
    }

    // Fetch images
    const images = await db.all(
      `SELECT id, image_url, is_primary FROM listing_images WHERE listing_id = ? ORDER BY is_primary DESC, created_at ASC`,
      [id]
    );
    listing.images = images.length > 0 ? images.map(img => img.image_url) : [];

    // Check if saved by current user
    let isSaved = false;
    if (currentUserId) {
      const saved = await db.get(`SELECT id FROM saved_items WHERE user_id = ? AND listing_id = ?`, [currentUserId, id]);
      isSaved = !!saved;
    }
    listing.is_saved = isSaved;

    // Check distance if user coords known
    if (req.user && req.user.latitude && req.user.longitude) {
      listing.distance_km = calculateDistanceKm(req.user.latitude, req.user.longitude, listing.latitude, listing.longitude);
    }

    // Apply privacy masking for pickup details & contacts
    const sanitized = await sanitizeListingForUser(listing, currentUserId);

    res.json({ success: true, listing: sanitized });
  } catch (err) {
    console.error('Get listing error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/listings - Create listing (Starts PENDING, strictly hidden from public!)
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      categoryId,
      title,
      description,
      condition,
      rentPricePerDay,
      isBorrowFree,
      securityDeposit,
      availableFrom,
      availableTo,
      locationName,
      latitude,
      longitude,
      pickupInstructions,
      exactAddress,
      images = []
    } = req.body;

    if (!categoryId || !title || !description || !condition) {
      return res.status(400).json({ success: false, error: 'Category, title, description, and condition are required.' });
    }

    // 1. Prohibited / Illegal items check
    const prohibitedCheck = checkProhibitedItem(title, description);
    if (prohibitedCheck.prohibited) {
      return res.status(400).json({
        success: false,
        error: `Submission blocked: ${prohibitedCheck.reason} Please review platform guidelines.`
      });
    }

    const listingId = 'lst_' + crypto.randomBytes(8).toString('hex');
    const ownerId = req.user.id;
    const rentPrice = parseFloat(rentPricePerDay) || 0;
    const isFree = isBorrowFree ? 1 : (rentPrice === 0 ? 1 : 0);
    const deposit = parseFloat(securityDeposit) || 0;
    const lat = parseFloat(latitude) || req.user.latitude || 17.3850;
    const lng = parseFloat(longitude) || req.user.longitude || 78.4867;
    const locName = locationName ? locationName.trim() : req.user.location_name || 'City Neighborhood';
    const exactAddr = exactAddress ? exactAddress.trim() : req.user.address_pickup || locName;
    const instructions = pickupInstructions ? pickupInstructions.trim() : 'Contact owner via in-app chat after approved request.';

    // Strictly starts as PENDING!
    await db.run(
      `INSERT INTO listings (
        id, owner_id, category_id, title, description, condition,
        rent_price_per_day, is_borrow_free, security_deposit,
        available_from, available_to, location_name, latitude, longitude,
        pickup_instructions, exact_address, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
      [
        listingId, ownerId, categoryId, title.trim(), description.trim(), condition,
        rentPrice, isFree, deposit, availableFrom || null, availableTo || null,
        locName, lat, lng, instructions, exactAddr
      ]
    );

    // Persist base64 images to disk storage and normalize cloud storage URLs
    function persistAndNormalizeImage(imgStr) {
      if (!imgStr || typeof imgStr !== 'string') return imgStr;
      const trimmed = imgStr.trim();

      // If base64 data URL, persist to disk immediately in persistent storage
      if (trimmed.startsWith('data:image/')) {
        const matches = trimmed.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const mimeType = matches[1];
          const base64Data = matches[2];
          let ext = 'jpg';
          if (mimeType.includes('png')) ext = 'png';
          else if (mimeType.includes('webp')) ext = 'webp';
          else if (mimeType.includes('gif')) ext = 'gif';

          const uploadsDir = path.join(__dirname, '..', '..', 'client', 'uploads');
          if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
          }
          const uniqueName = `item_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${ext}`;
          fs.writeFileSync(path.join(uploadsDir, uniqueName), Buffer.from(base64Data, 'base64'));
          return `/uploads/${uniqueName}`;
        }
      }

      // If Google Drive link, convert to direct image stream
      const gDriveMatch = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/) || trimmed.match(/drive\.google\.com\/.*[?&]id=([a-zA-Z0-9_-]+)/);
      if (gDriveMatch) {
        return `https://lh3.googleusercontent.com/d/${gDriveMatch[1]}`;
      }

      // If Dropbox link, convert to direct download stream
      if (trimmed.includes('dropbox.com') && !trimmed.includes('raw=1')) {
        return trimmed.replace('www.dropbox.com', 'dl.dropboxusercontent.com');
      }

      return trimmed;
    }

    // Insert photos
    if (Array.isArray(images) && images.length > 0) {
      for (let i = 0; i < images.length; i++) {
        const imgId = 'img_' + crypto.randomBytes(6).toString('hex');
        const persistentUrl = persistAndNormalizeImage(images[i]);
        await db.run(
          `INSERT INTO listing_images (id, listing_id, image_url, is_primary) VALUES (?, ?, ?, ?)`,
          [imgId, listingId, persistentUrl, i === 0 ? 1 : 0]
        );
      }
    } else {
      // Default placeholder image based on category
      const placeholderImg = `https://images.unsplash.com/photo-1581291518655-9523c932deb4?w=600&auto=format&fit=crop`;
      const imgId = 'img_' + crypto.randomBytes(6).toString('hex');
      await db.run(
        `INSERT INTO listing_images (id, listing_id, image_url, is_primary) VALUES (?, ?, ?, 1)`,
        [imgId, listingId, placeholderImg]
      );
    }

    // Create confirmation notification for user
    await createNotification({
      userId: ownerId,
      title: 'Listing Submitted for Review',
      message: `Your listing "${title}" has been submitted and is currently PENDING Admin moderation. You will be notified once it is approved and made public.`,
      type: 'LISTING_SUBMITTED',
      link: `/listing/${listingId}`
    });

    // Dispatch notification to dedicated System Administrator
    const adminUser = await db.get("SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1");
    if (adminUser) {
      await createNotification({
        userId: adminUser.id,
        title: '🔔 New listing pending approval',
        message: `${title.trim()} — submitted by ${req.user.full_name}`,
        type: 'ADMIN_PENDING_LISTING',
        link: `#admin`
      });
    }

    res.json({
      success: true,
      listingId,
      status: 'PENDING',
      message: 'Listing successfully submitted! It will undergo Admin Review before appearing in public searches.'
    });
  } catch (err) {
    console.error('Create listing error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/listings/:id/report - Report approved listing
router.post('/:id/report', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, details } = req.body;

    const validReasons = ['Suspicious', 'Prohibited', 'Misleading', 'Safety concern', 'Item not as described'];
    if (!validReasons.includes(reason)) {
      return res.status(400).json({ success: false, error: 'Invalid report reason.' });
    }

    const reportId = 'rep_' + crypto.randomBytes(8).toString('hex');
    await db.run(
      `INSERT INTO reports (id, listing_id, reporter_id, reason, details, status)
       VALUES (?, ?, ?, ?, ?, 'PENDING')`,
      [reportId, id, req.user.id, reason, details || null]
    );

    res.json({
      success: true,
      message: 'Thank you for reporting. Platform administrators will review this listing shortly.'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/listings/:id/save - Toggle wishlist bookmark
router.post('/:id/save', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const existing = await db.get(`SELECT id FROM saved_items WHERE user_id = ? AND listing_id = ?`, [userId, id]);
    if (existing) {
      await db.run(`DELETE FROM saved_items WHERE id = ?`, [existing.id]);
      return res.json({ success: true, saved: false, message: 'Item removed from saved items.' });
    } else {
      const saveId = 'sav_' + crypto.randomBytes(8).toString('hex');
      await db.run(`INSERT INTO saved_items (id, user_id, listing_id) VALUES (?, ?, ?)`, [saveId, userId, id]);
      return res.json({ success: true, saved: true, message: 'Item saved to your wishlist!' });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/listings/user/saved - Get all saved items for current user
router.get('/user/saved', requireAuth, async (req, res) => {
  try {
    const rows = await db.all(
      `SELECT 
         l.id, l.title, l.description, l.condition, l.rent_price_per_day,
         l.is_borrow_free, l.security_deposit, l.location_name, l.status,
         c.name as category_name, c.icon as category_icon,
         s.created_at as saved_at,
         (SELECT image_url FROM listing_images WHERE listing_id = l.id ORDER BY is_primary DESC LIMIT 1) as primary_image
       FROM saved_items s
       JOIN listings l ON l.id = s.listing_id
       JOIN categories c ON c.id = l.category_id
       WHERE s.user_id = ?
       ORDER BY s.created_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, savedItems: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/listings/user/my-listings - Get owner listings tabbed by status
router.get('/user/my-listings', requireAuth, async (req, res) => {
  try {
    const rows = await db.all(
      `SELECT 
         l.*, c.name as category_name, c.icon as category_icon,
         (SELECT image_url FROM listing_images WHERE listing_id = l.id ORDER BY is_primary DESC LIMIT 1) as primary_image,
         (SELECT COUNT(*) FROM rental_requests WHERE listing_id = l.id AND status = 'PENDING') as pending_requests_count,
         (SELECT COUNT(*) FROM transactions WHERE listing_id = l.id AND status = 'ACTIVE') as active_rentals_count
       FROM listings l
       JOIN categories c ON c.id = l.category_id
       WHERE l.owner_id = ?
       ORDER BY l.created_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, listings: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
