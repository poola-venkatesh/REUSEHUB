const crypto = require('crypto');
const db = require('../db');

async function createNotification({ userId, title, message, type = 'SYSTEM', link = null }) {
  if (!userId) return null;
  const id = 'notif_' + crypto.randomBytes(8).toString('hex');

  await db.run(
    `INSERT INTO notifications (id, user_id, title, message, type, link, is_read)
     VALUES (?, ?, ?, ?, ?, ?, 0)`,
    [id, userId, title, message, type, link]
  );

  return { id, userId, title, message, type, link };
}

async function getUserNotifications(userId, limit = 50) {
  return db.all(
    `SELECT * FROM notifications 
     WHERE user_id = ? 
     ORDER BY created_at DESC 
     LIMIT ?`,
    [userId, limit]
  );
}

async function markNotificationAsRead(id, userId) {
  return db.run(
    `UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`,
    [id, userId]
  );
}

async function markAllNotificationsAsRead(userId) {
  return db.run(
    `UPDATE notifications SET is_read = 1 WHERE user_id = ?`,
    [userId]
  );
}

module.exports = {
  createNotification,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead
};
