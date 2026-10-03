const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { generateToken, requireAuth } = require('../middleware/auth');
const { createOtp, verifyOtp } = require('../services/otp');
const { createNotification } = require('../services/notification');

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { fullName, email, mobile, password, locationName, latitude, longitude, addressPickup, profilePhoto } = req.body;

    if (!fullName || !email || !mobile || !password) {
      return res.status(400).json({ success: false, error: 'Full name, email, mobile number, and password are required.' });
    }

    // Normal users can NEVER select or become Admin
    if (req.body.role && req.body.role.toUpperCase() === 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Administrative accounts cannot be created via public signup.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanMobile = mobile.trim().replace(/[^\d+]/g, '');

    // Check existing email
    const existingEmail = await db.get('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (existingEmail) {
      return res.status(400).json({ success: false, error: 'An account with this email address already exists.' });
    }

    // Check existing mobile
    const existingMobile = await db.get('SELECT id FROM users WHERE mobile = ?', [cleanMobile]);
    if (existingMobile) {
      return res.status(400).json({ success: false, error: 'An account with this mobile number already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const userId = 'usr_' + crypto.randomBytes(8).toString('hex');

    const lat = parseFloat(latitude) || 17.3850;
    const lng = parseFloat(longitude) || 78.4867;
    const locName = locationName ? locationName.trim() : 'City Center';
    const pickup = addressPickup ? addressPickup.trim() : locName;

    await db.run(
      `INSERT INTO users (
        id, full_name, email, mobile, password_hash, role,
        location_name, latitude, longitude, address_pickup,
        profile_photo, is_mobile_verified, is_email_verified, is_active
      ) VALUES (?, ?, ?, ?, ?, 'USER', ?, ?, ?, ?, ?, 0, 0, 1)`,
      [userId, fullName.trim(), cleanEmail, cleanMobile, passwordHash, locName, lat, lng, pickup, profilePhoto || null]
    );

    // Generate mandatory mobile verification OTP
    const otp = await createOtp({
      userId,
      destination: cleanMobile,
      purpose: 'SIGNUP',
      expiresInMinutes: 10
    });

    await createNotification({
      userId,
      title: 'Mobile Verification Required',
      message: `Your verification code is ${otp.code}. Please verify to activate your account.`,
      type: 'OTP'
    });

    res.json({
      success: true,
      userId,
      mobile: cleanMobile,
      message: `Verification OTP sent to ${cleanMobile}. (Dev Quick-Fill Code: ${otp.code})`,
      devOtp: otp.code
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ success: false, error: 'Failed to create account: ' + err.message });
  }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', async (req, res) => {
  try {
    const { userId, destination, code, purpose = 'SIGNUP' } = req.body;

    if (!destination || !code) {
      return res.status(400).json({ success: false, error: 'Destination and OTP code are required.' });
    }

    const cleanDest = destination.trim().replace(/[^\d+]/g, '');
    const verification = await verifyOtp({ destination: cleanDest, code, purpose });

    if (!verification.valid) {
      return res.status(400).json({ success: false, error: verification.error });
    }

    // Activate user
    let user;
    if (userId) {
      await db.run('UPDATE users SET is_mobile_verified = 1 WHERE id = ?', [userId]);
      user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
    } else {
      user = await db.get('SELECT * FROM users WHERE mobile = ?', [cleanDest]);
      if (user) {
        await db.run('UPDATE users SET is_mobile_verified = 1 WHERE id = ?', [user.id]);
        user.is_mobile_verified = 1;
      }
    }

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    const token = generateToken(user);
    delete user.password_hash;

    res.json({
      success: true,
      message: 'Mobile number verified successfully!',
      token,
      user
    });
  } catch (err) {
    console.error('Verify OTP error:', err);
    res.status(500).json({ success: false, error: 'Verification failed: ' + err.message });
  }
});

// POST /api/auth/resend-otp
router.post('/resend-otp', async (req, res) => {
  try {
    const { destination, purpose = 'SIGNUP' } = req.body;
    if (!destination) {
      return res.status(400).json({ success: false, error: 'Destination number is required.' });
    }

    const cleanDest = destination.trim().replace(/[^\d+]/g, '');
    const user = await db.get('SELECT id FROM users WHERE mobile = ?', [cleanDest]);

    const otp = await createOtp({
      userId: user ? user.id : null,
      destination: cleanDest,
      purpose,
      expiresInMinutes: 10
    });

    res.json({
      success: true,
      message: `Fresh OTP dispatched to ${cleanDest}. (Dev Quick-Fill: ${otp.code})`,
      devOtp: otp.code
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ success: false, error: 'Mobile number or email and password are required.' });
    }

    const cleanId = identifier.trim();
    const user = await db.get(
      'SELECT * FROM users WHERE (email = ? OR mobile = ?) AND is_active = 1',
      [cleanId.toLowerCase(), cleanId]
    );

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials. User not found.' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ success: false, error: 'Invalid credentials. Password does not match.' });
    }

    if (!user.is_mobile_verified && user.role !== 'ADMIN') {
      const otp = await createOtp({
        userId: user.id,
        destination: user.mobile,
        purpose: 'SIGNUP',
        expiresInMinutes: 10
      });
      return res.status(403).json({
        success: false,
        requireOtp: true,
        userId: user.id,
        mobile: user.mobile,
        message: 'Mobile verification is required before login.',
        devOtp: otp.code
      });
    }

    const token = generateToken(user);
    delete user.password_hash;

    res.json({
      success: true,
      token,
      user
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, error: 'Login failed: ' + err.message });
  }
});

// POST /api/auth/admin-login - Dedicated System Administrator Login
router.post('/admin-login', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ success: false, error: 'Administrator email and password are required.' });
    }

    const cleanId = identifier.trim().toLowerCase();
    const user = await db.get(
      'SELECT * FROM users WHERE (lower(email) = ? OR mobile = ?) AND is_active = 1',
      [cleanId, cleanId]
    );

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid administrator credentials.' });
    }

    // Strictly enforce that this account has the ADMIN role
    if (user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. This portal is strictly for system administrator access.'
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ success: false, error: 'Invalid administrator credentials.' });
    }

    const token = generateToken(user);
    delete user.password_hash;

    res.json({
      success: true,
      message: 'System Administrator authenticated successfully.',
      token,
      user
    });
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ success: false, error: 'Administrator login failed: ' + err.message });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await db.get(
      `SELECT 
         u.id, u.full_name, u.email, u.mobile, u.role, u.location_name,
         u.latitude, u.longitude, u.address_pickup, u.profile_photo,
         u.is_mobile_verified, u.is_email_verified, u.created_at,
         COUNT(DISTINCT t.id) as completed_exchanges,
         COALESCE(AVG(r.rating), 5.0) as average_rating,
         COUNT(DISTINCT r.id) as review_count
       FROM users u
       LEFT JOIN transactions t ON (t.borrower_id = u.id OR t.owner_id = u.id) AND t.status = 'COMPLETED'
       LEFT JOIN reviews r ON r.reviewee_id = u.id
       WHERE u.id = ?
       GROUP BY u.id`,
      [req.user.id]
    );

    if (!user) return res.status(404).json({ success: false, error: 'User not found.' });

    user.average_rating = Number(Number(user.average_rating).toFixed(1));
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/auth/profile
router.put('/profile', requireAuth, async (req, res) => {
  try {
    const { fullName, locationName, latitude, longitude, addressPickup, profilePhoto } = req.body;
    const userId = req.user.id;

    await db.run(
      `UPDATE users SET 
         full_name = COALESCE(?, full_name),
         location_name = COALESCE(?, location_name),
         latitude = COALESCE(?, latitude),
         longitude = COALESCE(?, longitude),
         address_pickup = COALESCE(?, address_pickup),
         profile_photo = COALESCE(?, profile_photo),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [fullName, locationName, latitude, longitude, addressPickup, profilePhoto, userId]
    );

    const updated = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
    delete updated.password_hash;

    res.json({ success: true, user: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
