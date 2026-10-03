const db = require('../db');

function maskContact(contact, type = 'phone') {
  if (!contact) return '';
  if (type === 'phone') {
    if (contact.length >= 10) {
      return contact.slice(0, 3) + '••••' + contact.slice(-3);
    }
    return '••••••••••';
  }
  const parts = contact.split('@');
  if (parts.length === 2) {
    const name = parts[0];
    const maskedName = name.length > 2 ? name[0] + '•••' + name.slice(-1) : name[0] + '•••';
    return maskedName + '@' + parts[1];
  }
  return '••••@••••';
}

function obscureCoordinates(lat, lng) {
  // Add a slight deterministic offset (~200m - 400m) to protect exact home building
  const offsetLat = Math.sin(lat * 100) * 0.0025;
  const offsetLng = Math.cos(lng * 100) * 0.0025;
  return {
    approxLatitude: Number((lat + offsetLat).toFixed(4)),
    approxLongitude: Number((lng + offsetLng).toFixed(4))
  };
}

async function sanitizeListingForUser(listing, currentUserId = null) {
  if (!listing) return null;

  let canViewExactDetails = false;

  if (currentUserId) {
    // 1. Owner can always view exact details
    if (listing.owner_id === currentUserId) {
      canViewExactDetails = true;
    } else {
      // 2. An active or paid transaction party can view exact details
      const activeTx = await db.get(
        `SELECT id, status FROM transactions 
         WHERE listing_id = ? AND borrower_id = ? 
         AND status IN ('PAID', 'HANDOVER_PENDING', 'ACTIVE', 'RETURN_PENDING')`,
        [listing.id, currentUserId]
      );
      if (activeTx) {
        canViewExactDetails = true;
      }
    }
  }

  const { approxLatitude, approxLongitude } = obscureCoordinates(listing.latitude, listing.longitude);

  const sanitized = {
    ...listing,
    approx_latitude: approxLatitude,
    approx_longitude: approxLongitude,
    owner_phone_masked: maskContact(listing.owner_mobile, 'phone'),
    owner_email_masked: maskContact(listing.owner_email, 'email'),
    can_view_exact: canViewExactDetails
  };

  if (!canViewExactDetails) {
    delete sanitized.exact_address;
    delete sanitized.pickup_instructions;
    delete sanitized.latitude;
    delete sanitized.longitude;
    delete sanitized.owner_mobile;
    delete sanitized.owner_email;
  }

  return sanitized;
}

module.exports = {
  maskContact,
  obscureCoordinates,
  sanitizeListingForUser
};
