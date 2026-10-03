-- Users & Authentication
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    mobile TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'USER' CHECK(role IN ('USER', 'ADMIN')),
    location_name TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    address_pickup TEXT NOT NULL,
    profile_photo TEXT,
    is_mobile_verified INTEGER NOT NULL DEFAULT 0,
    is_email_verified INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Enforce exactly one active Admin at the database index level
CREATE UNIQUE INDEX IF NOT EXISTS idx_single_admin ON users(role) WHERE role = 'ADMIN';

-- OTP Codes for signup, login, handover, return
CREATE TABLE IF NOT EXISTS otp_codes (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    destination TEXT NOT NULL,
    code TEXT NOT NULL,
    purpose TEXT NOT NULL CHECK(purpose IN ('SIGNUP', 'LOGIN', 'SENSITIVE_ACTION', 'HANDOVER', 'RETURN')),
    expires_at DATETIME NOT NULL,
    is_used INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 12 Standard Categories with LCA Impact benchmarks
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    icon TEXT NOT NULL,
    description TEXT,
    avg_co2_saved_kg REAL NOT NULL DEFAULT 15.0,
    avg_waste_diverted_kg REAL NOT NULL DEFAULT 3.0
);

-- Item Listings (Starts PENDING, strictly hidden until Admin Approved)
CREATE TABLE IF NOT EXISTS listings (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id TEXT NOT NULL REFERENCES categories(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    condition TEXT NOT NULL CHECK(condition IN ('New', 'Like New', 'Good', 'Used', 'Needs Repair')),
    rent_price_per_day REAL NOT NULL DEFAULT 0.0,
    is_borrow_free INTEGER NOT NULL DEFAULT 0,
    security_deposit REAL NOT NULL DEFAULT 0.0,
    available_from DATE,
    available_to DATE,
    location_name TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    pickup_instructions TEXT NOT NULL,
    exact_address TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED', 'HIDDEN')),
    reject_reason TEXT,
    reject_notes TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Listing Photos
CREATE TABLE IF NOT EXISTS listing_images (
    id TEXT PRIMARY KEY,
    listing_id TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    is_primary INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Rental Requests
CREATE TABLE IF NOT EXISTS rental_requests (
    id TEXT PRIMARY KEY,
    listing_id TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    borrower_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    request_type TEXT NOT NULL CHECK(request_type IN ('RENT', 'BORROW')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days INTEGER NOT NULL,
    rent_per_day REAL NOT NULL,
    total_rent REAL NOT NULL,
    security_deposit REAL NOT NULL,
    message TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED')),
    reject_reason TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Transactions Lifecycle & Escrow
CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    request_id TEXT UNIQUE NOT NULL REFERENCES rental_requests(id) ON DELETE CASCADE,
    listing_id TEXT NOT NULL REFERENCES listings(id),
    borrower_id TEXT NOT NULL REFERENCES users(id),
    owner_id TEXT NOT NULL REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'PAYMENT_PENDING' CHECK(status IN (
        'PAYMENT_PENDING', 'PAID', 'HANDOVER_PENDING', 'ACTIVE', 
        'RETURN_PENDING', 'RETURNED', 'COMPLETED', 'DISPUTED', 'CANCELLED'
    )),
    payment_method TEXT CHECK(payment_method IN ('ONLINE', 'OFFLINE')),
    payment_status TEXT NOT NULL DEFAULT 'UNPAID' CHECK(payment_status IN ('UNPAID', 'PAID', 'REFUNDED')),
    total_rent REAL NOT NULL,
    deposit_amount REAL NOT NULL,
    deposit_status TEXT NOT NULL DEFAULT 'HELD' CHECK(deposit_status IN ('NONE', 'HELD', 'REFUNDED', 'PARTIALLY_REFUNDED', 'FORFEITED')),
    handover_otp TEXT NOT NULL,
    return_otp TEXT NOT NULL,
    handover_at DATETIME,
    returned_at DATETIME,
    due_date DATE NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Payments & Ledger
CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id),
    amount REAL NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('RENT_AND_DEPOSIT', 'DEPOSIT_REFUND', 'DAMAGE_PAYOUT')),
    method TEXT NOT NULL CHECK(method IN ('ONLINE', 'OFFLINE')),
    status TEXT NOT NULL CHECK(status IN ('PENDING', 'SUCCESS', 'FAILED')),
    reference TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Condition Evidence Records (Before Handover & After Return)
CREATE TABLE IF NOT EXISTS condition_records (
    id TEXT PRIMARY KEY,
    transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    stage TEXT NOT NULL CHECK(stage IN ('BEFORE_HANDOVER', 'AFTER_RETURN')),
    submitted_by_user_id TEXT NOT NULL REFERENCES users(id),
    condition_notes TEXT NOT NULL,
    photo_urls TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Disputes & Damage Resolution
CREATE TABLE IF NOT EXISTS disputes (
    id TEXT PRIMARY KEY,
    transaction_id TEXT UNIQUE NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    reported_by_user_id TEXT NOT NULL REFERENCES users(id),
    damage_description TEXT NOT NULL,
    estimated_cost REAL NOT NULL,
    damage_photos TEXT NOT NULL,
    borrower_response TEXT NOT NULL DEFAULT 'PENDING' CHECK(borrower_response IN ('PENDING', 'ACCEPTED', 'CONTESTED')),
    borrower_notes TEXT,
    borrower_photos TEXT,
    admin_resolution TEXT NOT NULL DEFAULT 'PENDING' CHECK(admin_resolution IN (
        'PENDING', 'CLOSED_DISMISSED', 'RESOLVED_DEDUCTION', 'RESOLVE_DEDUCTION', 'REQUEST_MORE_INFO', 'ESCALATED', 'ESCALATE'
    )),
    deducted_amount REAL DEFAULT 0.0,
    refunded_amount REAL DEFAULT 0.0,
    admin_notes TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- In-App Chat Messages
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    sender_id TEXT NOT NULL REFERENCES users(id),
    receiver_id TEXT NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    is_read INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    link TEXT,
    is_read INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Listing Reports
CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    listing_id TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    reporter_id TEXT NOT NULL REFERENCES users(id),
    reason TEXT NOT NULL CHECK(reason IN ('Suspicious', 'Prohibited', 'Misleading', 'Safety concern', 'Item not as described')),
    details TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'ACTIONED', 'DISMISSED')),
    admin_action TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Bidirectional Ratings & Reviews
CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    reviewer_id TEXT NOT NULL REFERENCES users(id),
    reviewee_id TEXT NOT NULL REFERENCES users(id),
    listing_id TEXT NOT NULL REFERENCES listings(id),
    rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
    review_text TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Saved Items (Wishlist)
CREATE TABLE IF NOT EXISTS saved_items (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    listing_id TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, listing_id)
);

-- Platform Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    action TEXT NOT NULL,
    performed_by TEXT NOT NULL,
    details TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for lightning-fast queries
CREATE INDEX IF NOT EXISTS idx_listings_category ON listings(category_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_coords ON listings(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_requests_status ON rental_requests(status);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_messages_transaction ON messages(transaction_id);
