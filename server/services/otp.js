const crypto = require('crypto');
const db = require('../db');

function generate6DigitCode() {
  return crypto.randomInt(100000, 999999).toString();
}

async function createOtp({ userId = null, destination, purpose, expiresInMinutes = 10 }) {
  const code = generate6DigitCode();
  const id = 'otp_' + crypto.randomBytes(8).toString('hex');
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000).toISOString();

  // Invalidate any prior unused OTP for this destination & purpose
  await db.run(
    `UPDATE otp_codes SET is_used = 1 WHERE destination = ? AND purpose = ? AND is_used = 0`,
    [destination, purpose]
  );

  await db.run(
    `INSERT INTO otp_codes (id, user_id, destination, code, purpose, expires_at, is_used)
     VALUES (?, ?, ?, ?, ?, ?, 0)`,
    [id, userId, destination, code, purpose, expiresAt]
  );

  console.log(`\n========================================`);
  console.log(`🔑 [OTP DISPATCH] Destination: ${destination}`);
  console.log(`🔑 [OTP PURPOSE]  ${purpose}`);
  console.log(`🔑 [OTP CODE]     👉 ${code} 👈`);
  console.log(`🔑 [EXPIRES AT]   ${expiresAt}`);
  console.log(`========================================\n`);

  return { id, code, expiresAt };
}

async function verifyOtp({ destination, code, purpose }) {
  if (!code || !destination || !purpose) {
    return { valid: false, error: 'Destination, code, and purpose are required.' };
  }

  const cleanCode = code.toString().trim();
  const now = new Date().toISOString();

  const record = await db.get(
    `SELECT * FROM otp_codes 
     WHERE destination = ? AND purpose = ? AND is_used = 0 AND expires_at > ?
     ORDER BY created_at DESC LIMIT 1`,
    [destination, purpose, now]
  );

  if (!record) {
    return { valid: false, error: 'OTP is invalid or has expired. Please request a new one.' };
  }

  if (record.code !== cleanCode) {
    return { valid: false, error: 'Incorrect OTP code entered.' };
  }

  // Mark as used
  await db.run('UPDATE otp_codes SET is_used = 1 WHERE id = ?', [record.id]);

  return { valid: true, otpRecord: record };
}

module.exports = {
  generate6DigitCode,
  createOtp,
  verifyOtp
};
