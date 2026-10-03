const bcrypt = require('bcryptjs');
const db = require('./db');

const CATEGORIES = [
  { id: 'cat_student', name: 'Student', slug: 'student', icon: 'GraduationCap', description: 'Academic books, scientific calculators, dorm essentials, lab equipment', co2: 6.0, waste: 1.0 },
  { id: 'cat_household', name: 'Household', slug: 'household', icon: 'Home', description: 'Vacuum cleaners, steam mops, carpet cleaners, pressure washers, folding tables', co2: 12.0, waste: 2.5 },
  { id: 'cat_electronics', name: 'Electronics', slug: 'electronics', icon: 'Tv', description: 'Projectors, DSLR cameras, sound systems, VR headsets, drone equipment', co2: 45.0, waste: 3.5 },
  { id: 'cat_tools', name: 'Tools', slug: 'tools', icon: 'Wrench', description: 'Power drills, circular saws, ladders, sanders, tile cutters, paint sprayers', co2: 18.0, waste: 4.0 },
  { id: 'cat_industrial', name: 'Industrial', slug: 'industrial', icon: 'Factory', description: 'Heavy generators, air compressors, pallet jacks, scaffolding, floor scrubbers', co2: 65.0, waste: 12.0 },
  { id: 'cat_agricultural', name: 'Agricultural', slug: 'agricultural', icon: 'Wheat', description: 'Rototillers, seeders, chainsaws, water irrigation pumps, garden shredders', co2: 40.0, waste: 9.0 },
  { id: 'cat_events', name: 'Events', slug: 'events', icon: 'PartyPopper', description: 'Marquee tents, lighting rigs, DJ mixers, catering warmers, chocolate fountains', co2: 20.0, waste: 5.0 },
  { id: 'cat_sports', name: 'Sports', slug: 'sports', icon: 'Trophy', description: 'Camping tents, kayaks, mountain bikes, paddleboards, ski gear, golf clubs', co2: 14.0, waste: 3.0 },
  { id: 'cat_automotive', name: 'Automotive', slug: 'automotive', icon: 'Car', description: 'OBD2 scanners, torque wrenches, engine hoists, roof racks, battery boosters', co2: 55.0, waste: 8.0 },
  { id: 'cat_fashion', name: 'Fashion', slug: 'fashion', icon: 'Shirt', description: 'Tuxedos, designer gowns, wedding attire, traditional ethnic wear, winter coats', co2: 8.5, waste: 1.2 },
  { id: 'cat_books', name: 'Books/Media', slug: 'books-media', icon: 'BookOpen', description: 'Board games, bestsellers, textbooks, vinyl records, musical instruments', co2: 2.5, waste: 0.8 },
  { id: 'cat_other', name: 'Other', slug: 'other', icon: 'Package', description: 'Specialty hobby gear, travel luggage, baby travel cribs, moving dollies', co2: 10.0, waste: 2.0 }
];

async function seedDatabase() {
  console.log('====================================================');
  console.log('🌱 Initializing REUSEHUB Clean Environment');
  console.log('====================================================');

  // Initialize schema
  await db.initDb();

  // 1. Purge all legacy demo data, fake accounts, and test records
  console.log('Cleaning up old demonstration records...');
  await db.run('DELETE FROM condition_records');
  await db.run('DELETE FROM disputes');
  await db.run('DELETE FROM reviews');
  await db.run('DELETE FROM messages');
  await db.run('DELETE FROM notifications');
  await db.run('DELETE FROM transactions');
  await db.run('DELETE FROM rental_requests');
  await db.run('DELETE FROM listing_images');
  await db.run('DELETE FROM saved_items');
  await db.run('DELETE FROM reports');
  await db.run('DELETE FROM listings');
  await db.run('DELETE FROM otp_codes');
  await db.run("DELETE FROM users WHERE role != 'ADMIN' OR email != 'admin@rentandreuse.com'");

  console.log('✓ Purged legacy demo accounts, fake listings, and transactions');

  // 2. Seed Standard 12 Categories
  for (const cat of CATEGORIES) {
    await db.run(
      `INSERT OR REPLACE INTO categories (id, name, slug, icon, description, avg_co2_saved_kg, avg_waste_diverted_kg)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [cat.id, cat.name, cat.slug, cat.icon, cat.description, cat.co2, cat.waste]
    );
  }
  console.log('✓ 12 Standard Categories seeded with LCA carbon & waste impact benchmarks');

  // 3. Seed Exactly ONE Authorized Admin Account
  const salt = await bcrypt.genSalt(10);
  const adminPasswordHash = await bcrypt.hash('Admin@123', salt);

  const ADMIN_USER = {
    id: 'usr_admin',
    fullName: 'System Administrator',
    email: 'admin@rentandreuse.com',
    mobile: '+919876543210',
    role: 'ADMIN',
    location: 'Central Admin Operations',
    lat: 17.3850,
    lng: 78.4867,
    pickup: 'Admin Security Operations Center, Floor 4',
    photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop',
    hash: adminPasswordHash
  };

  await db.run(
    `INSERT OR REPLACE INTO users (
      id, full_name, email, mobile, password_hash, role,
      location_name, latitude, longitude, address_pickup,
      profile_photo, is_mobile_verified, is_email_verified, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 1)`,
    [
      ADMIN_USER.id, ADMIN_USER.fullName, ADMIN_USER.email, ADMIN_USER.mobile,
      ADMIN_USER.hash, ADMIN_USER.role, ADMIN_USER.location, ADMIN_USER.lat,
      ADMIN_USER.lng, ADMIN_USER.pickup, ADMIN_USER.photo
    ]
  );
  console.log('✓ Single legitimate Admin account initialized (admin@rentandreuse.com)');

  const userCount = await db.get('SELECT count(*) as count FROM users');
  const listingCount = await db.get('SELECT count(*) as count FROM listings');
  const catCount = await db.get('SELECT count(*) as count FROM categories');

  console.log('\n====================================================');
  console.log(`Database is clean and ready for real users!`);
  console.log(`- Categories: ${catCount.count}`);
  console.log(`- Users:      ${userCount.count} (Single Admin Only)`);
  console.log(`- Listings:   ${listingCount.count} (0 Fake Listings)`);
  console.log('====================================================\n');
}

if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seed error:', err);
      process.exit(1);
    });
}

module.exports = { seedDatabase, CATEGORIES };
