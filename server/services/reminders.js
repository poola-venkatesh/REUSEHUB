const db = require('../db');
const { createNotification } = require('./notification');

async function checkDueDatesAndSendReminders() {
  try {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Find all ACTIVE transactions
    const activeTransactions = await db.all(
      `SELECT t.*, l.title as listing_title, u_owner.full_name as owner_name, u_borrower.full_name as borrower_name
       FROM transactions t
       JOIN listings l ON l.id = t.listing_id
       JOIN users u_owner ON u_owner.id = t.owner_id
       JOIN users u_borrower ON u_borrower.id = t.borrower_id
       WHERE t.status = 'ACTIVE'`
    );

    for (const tx of activeTransactions) {
      // 1. Due Tomorrow: Send Return Reminder
      if (tx.due_date === tomorrowStr) {
        // Check if reminder was already sent today to avoid duplicate alerts
        const alreadySent = await db.get(
          `SELECT id FROM notifications 
           WHERE user_id = ? AND type = 'RETURN_REMINDER' AND link = ? 
           AND date(created_at) = ?`,
          [tx.borrower_id, `/transaction/${tx.id}`, todayStr]
        );

        if (!alreadySent) {
          await createNotification({
            userId: tx.borrower_id,
            title: `Return Reminder: Due Tomorrow (${tomorrowStr})`,
            message: `Your rental for "${tx.listing_title}" is due for return tomorrow. Please coordinate with ${tx.owner_name} for the physical return meetup and Return OTP verification.`,
            type: 'RETURN_REMINDER',
            link: `/transaction/${tx.id}`
          });
          console.log(`⏰ [REMINDER] Sent return reminder to ${tx.borrower_name} for tx ${tx.id}`);
        }
      }

      // 2. Past Due Date: Send Overdue Alert
      if (tx.due_date < todayStr) {
        const alreadyAlertedToday = await db.get(
          `SELECT id FROM notifications 
           WHERE user_id = ? AND type = 'OVERDUE' AND link = ? 
           AND date(created_at) = ?`,
          [tx.borrower_id, `/transaction/${tx.id}`, todayStr]
        );

        if (!alreadyAlertedToday) {
          // Alert borrower
          await createNotification({
            userId: tx.borrower_id,
            title: `URGENT: Rental Overdue (${tx.listing_title})`,
            message: `Your rental was due on ${tx.due_date} and is now overdue. Please initiate return immediately to safeguard your security deposit.`,
            type: 'OVERDUE',
            link: `/transaction/${tx.id}`
          });

          // Alert owner
          await createNotification({
            userId: tx.owner_id,
            title: `Notice: Rental Overdue for "${tx.listing_title}"`,
            message: `The borrower was due to return "${tx.listing_title}" on ${tx.due_date}. Please communicate via in-app chat or inspect the item upon return.`,
            type: 'OVERDUE',
            link: `/transaction/${tx.id}`
          });

          console.log(`⚠️ [OVERDUE ALERT] Sent overdue alerts for tx ${tx.id} (due ${tx.due_date})`);
        }
      }
    }
  } catch (err) {
    console.error('Error running reminder checks:', err);
  }
}

function startReminderScheduler(intervalMs = 60000 * 30) {
  // Run on startup
  checkDueDatesAndSendReminders();
  // Run periodically
  return setInterval(checkDueDatesAndSendReminders, intervalMs);
}

module.exports = {
  checkDueDatesAndSendReminders,
  startReminderScheduler
};
