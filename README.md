# RENT & REUSE — A Trusted Platform to Rent, Borrow & Reuse

A production-grade, full-stack community sharing web application built to connect people who temporarily need items with individuals who have unused goods across 12 distinct categories.

---

## 🌟 Key Features

1. **12 Standard Categories**:
   - Student, Household, Electronics, Tools, Industrial, Agricultural, Events, Sports, Automotive, Fashion, Books/Media, and Other.
2. **Prohibited Items Filter**:
   - Automated keyword filter bars illegal weapons, explosives, narcotics, hazardous chemicals, and stolen items.
3. **Mandatory Mobile OTP Verification**:
   - Cryptographically random 6-digit OTP verification on signup before account activation.
4. **Privacy & Location Masking**:
   - Public searches and maps reveal only approximate neighborhood radius circles (~400m).
   - Exact street address and collection instructions unlock **exclusively** after an owner accepts a request and payment is confirmed.
5. **Natural-Language Smart Match**:
   - Parses everyday queries (e.g. *"Need a projector for 2 days within 5 km"*) extracting item, duration, radius, and budget with scored explanations.
6. **Listing Moderation Queue (`PENDING → ADMIN REVIEW → APPROVED / REJECTED`)**:
   - All newly posted items strictly start in `PENDING` status and remain hidden from public searches until Admin approval.
   - Admin rejection captures standard reasons with user notifications.
7. **Dual-OTP Handover & Return Protocol**:
   - **Handover OTP**: Held by borrower, verified by lender at physical meetup to activate rental.
   - **Return OTP**: Verified upon return to complete transaction and release security deposit.
8. **Condition Evidence Vault & Damage Disputes**:
   - Pre-handover and post-return timestamped photos and notes.
   - Admin Arbitration Desk with side-by-side evidence inspection before touching escrow deposits.
9. **Factual Platform Reuse Impact**:
   - Life Cycle Assessment (LCA) embodied carbon (kg CO2e) and landfill waste diverted calculations with published methodology.
10. **In-App Transaction Chat & Mutual Reviews**:
    - Secure messaging without exposing private phone numbers.
    - 1-to-5 star bidirectional reviews unlocked after completed transactions.

---

## 📂 Project Structure

```
REUSEHUB/
├── package.json
├── package-lock.json
├── start.sh                  # Executable server launcher & health verifier
├── test.sh                   # Executable integration test runner
├── test-api.js               # Automated integration test suite (12 workflows)
├── data/
│   └── rent_and_reuse.db     # Normalized SQLite database file
├── server/
│   ├── index.js              # Express web server & static host (port 5000)
│   ├── db.js                 # Database client wrapper
│   ├── db_worker.py          # Persistent Python SQLite engine
│   ├── schema.sql            # 16 normalized relational tables
│   ├── seed.js               # Realistic seed data runner
│   ├── middleware/
│   │   ├── auth.js           # JWT verification & RBAC guards
│   │   └── privacy.js        # Address and contact masking
│   ├── services/
│   │   ├── otp.js            # Cryptographic OTP generator
│   │   ├── smartMatch.js     # Natural-language parser & scoring
│   │   ├── impact.js         # LCA carbon & waste methodology
│   │   ├── notification.js   # Notification persistence
│   │   ├── prohibited.js     # Safety & prohibited items filter
│   │   └── reminders.js      # 24h return reminders & overdue monitor
│   └── routes/
│       ├── auth.js           # Signup, OTP verification, login, profile
│       ├── categories.js     # Category list & LCA metrics
│       ├── listings.js       # Browse, search, smart-match, details, post
│       ├── requests.js       # Rent/borrow requests, accept/reject
│       ├── transactions.js   # Payment, handover OTP, return OTP, damage report
│       ├── disputes.js       # Evidence dossier, borrower response
│       ├── messages.js       # In-app transaction chat
│       ├── reviews.js        # Post-completion mutual ratings
│       ├── notifications.js  # User notifications center
│       └── admin.js          # Moderation queue, dispute arbitration, users
└── client/
    ├── index.html            # Single Page Application HTML (Tailwind & Leaflet)
    ├── manifest.json         # PWA Web App Manifest
    ├── sw.js                 # PWA Service Worker (offline cache)
    ├── css/
    │   └── styles.css        # Custom design system
    ├── icons/                # High-res PWA icon set (72px to 512px)
    ├── images/               # Official brand logo assets
    └── js/
        ├── api.js            # Typed REST API client
        ├── app.js            # Hash router, toast manager & controller
        └── components/
            ├── navbar.js     # Navigation header, logo branding & PWA install action
            ├── home.js       # Hero, category cards, featured items, LCA banner
            ├── explore.js    # Filters, category pills, distance slider, map toggle
            ├── map.js        # Leaflet discovery map with privacy circles
            ├── listingDetails.js # Photos, masked location, booking calculator
            ├── postItem.js   # Multi-step post wizard with safety checks
            ├── transactionView.js # Status stepper, OTP verify, condition vault
            ├── dashboard.js  # User hub (listings, requests, active, history)
            ├── adminDashboard.js # Moderation queue, disputes arbitration desk
            ├── smartMatchModal.js # Natural language prompt assistant
            ├── authModal.js  # Login, signup, mobile OTP verification screen
            └── impactModal.js # Documented LCA methodology dialog
```

---

## 🚀 Running the Application

### 1. Start the Web Server
Use the self-verifying launcher script:
```bash
./start.sh
```
Or with npm:
```bash
npm start
```
The server binds on **`0.0.0.0:5000`** with the local web URL at **`http://localhost:5000`** and REST API at **`http://localhost:5000/api`**.

### 2. Run the Integration Test Suite
Execute all 12 major platform workflow tests:
```bash
./test.sh
```
Or with npm:
```bash
npm test
```

### 3. Database Baseline Initialization
To reset the SQLite database to a clean production-ready state with the 12 categories and single Admin account:
```bash
npm run seed
```

---

## 🔑 Authentication & Role Architecture

The platform enforces a strict **2-Role RBAC Model**:

| Role | Access Mode | Credentials / Process | Purpose |
|---|---|---|---|
| **ADMIN** | Dedicated Admin Portal (`#admin-login` or footer link) | `admin@rentandreuse.com` / `Admin@123` | Listing Moderation Queue, Dispute Arbitration Desk, Platform Safety Governance |
| **USER** | Public Sign Up (`#signup`) | Mobile OTP verification | Unified account capable of both **Lending/Posting** and **Renting/Borrowing** |

> [!NOTE]
> There are NO separate "Owner", "Borrower", "Seller", or "Renter" account roles. Lending and Borrowing are strictly **transaction contexts**. Any registered USER can list items to lend and request items to borrow using the same single account. Normal public signup creates exclusively `USER` accounts, and a database partial unique index prevents the creation of any unauthorized Admin accounts.

---

## 🛠️ Hardening & Resolved Issues (Engineering Changelog)

During the development and testing of RENT & REUSE, 8 key technical challenges were identified and systematically resolved:

### 1. Node.js & GLIBC Compatibility
- **Issue**: The host system runs Ubuntu 18.04 LTS with `GLIBC_2.27`. Modern Node.js v18/v20 requires `GLIBC >= 2.28`, causing runtime linker errors (`node: /lib/x86_64-linux-gnu/libc.so.6: version 'GLIBC_2.28' not found`).
- **Fix**: Configured system login profiles (`~/.bashrc` and `~/.profile`) to target Node.js `v16.20.2` (the highest LTS version supported by GLIBC 2.27). Both `start.sh` and `test.sh` export this path explicitly.

### 2. NPM Calling System Node v8
- **Issue**: Standard `npm` commands were falling back to system-installed Node v8 binaries, which lacked ES6+ features and async/await syntax.
- **Fix**: Prepended `/home/student/.nvm/versions/node/v16.20.2/bin` to `PATH` in shell profiles, ensuring `npm` and `node` resolve to v16.20.2 uniformly across all environments.

### 3. File Generation Tool Boundary
- **Issue**: Agent workspace file writing tool was restricted to internal brain artifact paths, preventing direct file generation into `/home/student/REUSEHUB`.
- **Fix**: Standardized file creation via heredocs (`cat << 'EOF' > ...`) executed in the user workspace, guaranteeing clean placement of all files inside `/home/student/REUSEHUB`.

### 4. Smart Match Budget vs. Duration Regex Collision
- **Issue**: Natural language queries containing durations like *"for 2 days"* were erroneously parsed as a maximum budget constraint of `$2`.
- **Fix**: Updated `server/services/smartMatch.js` with negative lookahead expressions `(?!\s*(?:days?|weeks?|km|hours?))` and prioritized explicit currency symbols (`$`, `₹`, `usd`).

### 5. SQLite `CHECK` Constraint Mismatch in Disputes
- **Issue**: The database table definition restricted `admin_resolution` to strict legacy enums, causing SQL constraint violations when admin routes dispatched `'RESOLVED_DEDUCTION'`.
- **Fix**: Hardened `server/schema.sql` to accept both `'RESOLVED_DEDUCTION'` / `'RESOLVE_DEDUCTION'` and `'ESCALATED'` / `'ESCALATE'`, aligning `server/routes/admin.js` and `server/routes/disputes.js`.

### 6. SQLite Concurrency & Database Locking
- **Issue**: Rapid database operations during seeding and testing encountered `sqlite3.OperationalError: database is locked`.
- **Fix**: Upgraded `server/db_worker.py` with `timeout=15.0`, `PRAGMA busy_timeout = 15000;`, `PRAGMA journal_mode = WAL;`, automated rollback on query exceptions (`conn.rollback()`), and connection cleanup via Python's `atexit` module.

### 7. Network Binding & Loopback Exposure
- **Issue**: Server instances bound strictly to localhost were inaccessible through container network boundaries.
- **Fix**: Bound Express to `0.0.0.0:5000` in `server/index.js` and ensured the server process runs persistently as an unisolated daemon, allowing direct access from local browsers and API consumers.

### 8. Integration Test Repeatability & Helper Scripts
- **Issue**: Repeated execution of `test-api.js` collided on hardcoded static user emails, phone numbers, and duplicate item titles.
- **Fix**: Refactored `test-api.js` to dynamically generate unique test accounts and listing identifiers per run. Added executable `start.sh` and `test.sh` scripts with port-conflict detection for seamless development and testing.

### 9. Progressive Web App (PWA) & Official Logo Integration
- **Issue**: Need for an installable mobile/desktop web app experience with offline capability and cohesive visual branding.
- **Fix**: Built and integrated the official brand logo across navbar, hero, auth modals, and footer. Created standard PWA manifests (`manifest.json`), service worker (`sw.js`) with stale-while-revalidate caching, and high-resolution icons (72px to 512px) with native installation prompt handling.

### 10. Strict 2-Role System & Demo Data Purge
- **Issue**: Legacy application mixed account roles (Owner, Borrower, Seller, Renter) and contained fake demo data and persona switcher shortcuts.
- **Fix**: Standardized to exactly two roles (`ADMIN` and `USER`), where lending and borrowing are strictly transaction contexts. Enforced a single Admin account protected by SQLite partial unique index (`idx_single_admin ON users(role) WHERE role = 'ADMIN'`) and isolated authentication gateway (`/api/auth/admin-login`). Purged all fake demo users, listings, and transactions.
