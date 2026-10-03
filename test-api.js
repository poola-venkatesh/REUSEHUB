const http = require('http');
const { app } = require('./server/index');

const TEST_PORT = 5098;
let server;

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/api' + path,
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    if (payload) {
      options.headers['Content-Length'] = Buffer.byteLength(payload);
    }
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED ASSERTION: ${message}`);
    throw new Error(message);
  }
  console.log(`  ✓ ${message}`);
}

async function runTestSuite() {
  console.log('====================================================');
  console.log('🧪 RUNNING COMPREHENSIVE 2-ROLE REUSEHUB TEST SUITE');
  console.log('====================================================\n');

  server = app.listen(TEST_PORT);

  try {
    // 1. Categories & LCA Impact
    console.log('[1/12] Testing Categories & LCA Reuse Impact...');
    const catRes = await request('GET', '/categories');
    assert(catRes.data.success === true, 'Categories endpoint returns success');
    assert(catRes.data.categories.length === 12, 'All 12 specified categories are loaded');

    const impactRes = await request('GET', '/categories/impact');
    assert(impactRes.data.success === true, 'Impact metrics endpoint returns success');
    assert(impactRes.data.metrics.methodology !== undefined, 'LCA methodology documentation is present');

    // 2. Real User A Signup & Mandatory Mobile OTP Verification
    console.log('\n[2/12] Testing Real User A Signup & Mandatory Mobile OTP Verification (Role = USER)...');
    const testSuffixA = Date.now().toString().slice(-6) + Math.floor(10 + Math.random() * 90);
    const mobileA = `+9199${testSuffixA}`;
    const emailA = `anita.${testSuffixA}@example.com`;

    const signupResA = await request('POST', '/auth/signup', {
      fullName: 'Anita Roy',
      email: emailA,
      mobile: mobileA,
      password: 'SecurePassword@123',
      locationName: 'Banjara Hills',
      latitude: 17.4156,
      longitude: 78.4350,
      addressPickup: 'Flat 4B, Sunrise Heights, Rd No 12'
    });
    assert(signupResA.data.success === true, 'Public signup succeeds');
    assert(signupResA.data.devOtp !== undefined, 'Mobile verification OTP code provided');

    const verifyResA = await request('POST', '/auth/verify-otp', {
      userId: signupResA.data.userId,
      destination: mobileA,
      code: signupResA.data.devOtp,
      purpose: 'SIGNUP'
    });
    assert(verifyResA.data.success === true, 'OTP verification succeeds and activates account');
    assert(verifyResA.data.user.role === 'USER', 'Public signup strictly creates a USER account');
    const userAToken = verifyResA.data.token;
    const userA = verifyResA.data.user;

    // Verify public signup rejects any attempt to register as ADMIN
    const adminAttemptSignup = await request('POST', '/auth/signup', {
      fullName: 'Fake Admin',
      email: `fakeadmin.${testSuffixA}@example.com`,
      mobile: `+9188${testSuffixA}`,
      password: 'AdminPassword@123',
      role: 'ADMIN'
    });
    assert(adminAttemptSignup.status === 403, 'Public signup rejects attempt to register with ADMIN role (403)');

    // 3. Register Real User B
    console.log('\n[3/12] Testing Real User B Signup & Verification...');
    const testSuffixB = (Date.now() + 100).toString().slice(-6) + Math.floor(10 + Math.random() * 90);
    const mobileB = `+9198${testSuffixB}`;
    const emailB = `rahul.${testSuffixB}@example.com`;

    const signupResB = await request('POST', '/auth/signup', {
      fullName: 'Rahul Verma',
      email: emailB,
      mobile: mobileB,
      password: 'SecurePassword@123',
      locationName: 'Hitech City',
      latitude: 17.4480,
      longitude: 78.3910,
      addressPickup: 'Tower 3, Cyber Gateway'
    });
    assert(signupResB.data.success === true, 'User B signup succeeds');

    const verifyResB = await request('POST', '/auth/verify-otp', {
      userId: signupResB.data.userId,
      destination: mobileB,
      code: signupResB.data.devOtp,
      purpose: 'SIGNUP'
    });
    assert(verifyResB.data.success === true, 'User B mobile verified');
    assert(verifyResB.data.user.role === 'USER', 'User B strictly assigned role USER');
    const userBToken = verifyResB.data.token;
    const userB = verifyResB.data.user;

    // 4. Single Administrator Login & Role Enforcement
    console.log('\n[4/12] Testing Single Admin Dedicated Login & Security Enforcement...');
    // Regular user attempting admin-login must fail
    const nonAdminLoginAttempt = await request('POST', '/auth/admin-login', {
      identifier: emailA,
      password: 'SecurePassword@123'
    });
    assert(nonAdminLoginAttempt.status === 403, 'Normal USER account is rejected from /api/auth/admin-login with 403 Forbidden');

    // Single dedicated Admin login
    const adminLoginRes = await request('POST', '/auth/admin-login', {
      identifier: 'admin@rentandreuse.com',
      password: 'Admin@123'
    });
    assert(adminLoginRes.data.success === true, 'Single legitimate Admin logs in via /api/auth/admin-login');
    assert(adminLoginRes.data.user.role === 'ADMIN', 'Admin account role is verified as ADMIN');
    const adminToken = adminLoginRes.data.token;

    // Server-side Admin protection: User A attempting /api/admin/overview must be rejected
    const unauthorizedAdminAccess = await request('GET', '/admin/overview', null, userAToken);
    assert(unauthorizedAdminAccess.status === 403, 'Normal USER is barred from accessing /api/admin with 403 Forbidden');

    // 5. Prohibited Items Filtering
    console.log('\n[5/12] Testing Prohibited Items Blacklist Blocking...');
    const prohibitedPostRes = await request('POST', '/listings', {
      categoryId: 'cat_other',
      title: 'Hunting rifle with extra ammo',
      description: 'Used rifle for outdoor game',
      condition: 'Good',
      rentPricePerDay: 50
    }, userAToken);
    assert(prohibitedPostRes.status === 400, 'Prohibited item submission is blocked with 400 Bad Request');
    assert(prohibitedPostRes.data.error.includes('prohibited/illegal'), 'Helpful prohibited error message returned');

    // 6. User A Posts Item -> Starts PENDING -> Admin Receives Notification -> Admin Approves
    console.log('\n[6/12] Testing Item Posting (PENDING) -> Admin Notification -> Admin Approval...');
    const deskTitle = `Ergonomic Study Desk ${testSuffixA}`;
    const postResA = await request('POST', '/listings', {
      categoryId: 'cat_student',
      title: deskTitle,
      description: 'Compact wooden study desk with adjustable height and bright reading light.',
      condition: 'Like New',
      rentPricePerDay: 8,
      isBorrowFree: 0,
      securityDeposit: 20,
      locationName: 'Banjara Hills',
      latitude: 17.4160,
      longitude: 78.4360,
      pickupInstructions: 'Ring bell on 4th floor, elevator available.',
      exactAddress: 'Flat 4B, Sunrise Heights, Rd No 12, Banjara Hills'
    }, userAToken);
    assert(postResA.data.success === true, 'Item posted successfully');
    assert(postResA.data.status === 'PENDING', 'New listing strictly starts in PENDING status');
    const createdListingId = postResA.data.listingId;

    // Verify PENDING item is hidden from public search
    const publicBrowseBefore = await request('GET', `/listings?search=${encodeURIComponent(deskTitle)}`);
    assert(publicBrowseBefore.data.listings.length === 0, 'PENDING item is strictly hidden from public listings search');

    // Verify Admin received the pending listing notification
    const adminNotifications = await request('GET', '/notifications', null, adminToken);
    assert(adminNotifications.data.success === true, 'Admin can view notifications');
    const pendingNotice = adminNotifications.data.notifications.find(n => n.type === 'ADMIN_PENDING_LISTING');
    assert(pendingNotice !== undefined, 'Admin received 🔔 New listing pending approval notification');
    assert(pendingNotice.message.includes(deskTitle), 'Notification contains item name and submitter info');

    // Admin reviews listing in Moderation Queue
    const modQueueRes = await request('GET', '/admin/moderation-queue', null, adminToken);
    assert(modQueueRes.data.success === true, 'Admin can view moderation queue');
    const foundInQueue = modQueueRes.data.queue.find(item => item.id === createdListingId);
    assert(foundInQueue !== undefined, 'Item is present in Admin Moderation queue');
    assert(foundInQueue.owner_name === 'Anita Roy', 'Admin sees submitter name');

    // Admin approves the listing
    const approveRes = await request('POST', `/admin/moderation/${createdListingId}`, { action: 'APPROVE' }, adminToken);
    assert(approveRes.data.status === 'APPROVED', 'Admin approves listing');

    // Verify item is now visible in public search
    const publicBrowseAfter = await request('GET', `/listings?search=${encodeURIComponent(deskTitle)}`);
    assert(publicBrowseAfter.data.listings.length === 1, 'Listing is now visible in public search after Admin approval');

    // 7. Privacy Protection: Strangers cannot view exact address
    console.log('\n[7/12] Testing Privacy & Approximate Location Masking...');
    const strangerView = await request('GET', `/listings/${createdListingId}`, null, userBToken);
    assert(strangerView.data.listing.exact_address === undefined, 'Exact pickup address is NOT visible to strangers');
    assert(strangerView.data.listing.pickup_instructions === undefined, 'Pickup instructions are NOT visible to strangers');
    assert(strangerView.data.listing.owner_phone_masked.includes('••••'), 'Submitter phone number is masked');
    assert(strangerView.data.listing.approx_latitude !== undefined, 'Approximate coordinates are provided');

    // 8. Natural-Language Smart Match Assistant
    console.log('\n[8/12] Testing Natural-Language Smart Match Assistant...');
    const smartMatchRes = await request('POST', '/listings/smart-match', {
      query: `Need a desk for 2 days within 10 km`,
      lat: 17.4160,
      lng: 78.4360
    });
    assert(smartMatchRes.data.success === true, 'Smart match query executes successfully');
    assert(smartMatchRes.data.matches.length > 0, 'Smart match returned relevant listings');
    assert(smartMatchRes.data.matches[0].match_explanation !== undefined, 'Match explanation provided');

    // 9. Rental Request: User B requests User A's item (User B = Borrower context, User A = Lender context)
    console.log('\n[9/12] Testing Transaction Workflow: User B Rents User A\'s Item...');
    const requestRes = await request('POST', '/requests', {
      listingId: createdListingId,
      requestType: 'RENT',
      startDate: '2026-10-10',
      endDate: '2026-10-13',
      message: 'Need this desk for my exam revision week!'
    }, userBToken);
    assert(requestRes.data.success === true, 'User B submits rental request');
    const rentalReqId = requestRes.data.requestId;

    // User A (item lister) accepts request
    const acceptRes = await request('POST', `/requests/${rentalReqId}/respond`, {
      action: 'ACCEPT'
    }, userAToken);
    assert(acceptRes.data.success === true, 'User A accepts rental request');
    assert(acceptRes.data.transactionId !== undefined, 'Transaction record created upon acceptance');
    const txId = acceptRes.data.transactionId;

    // User B pays -> exact pickup address unlocks
    const payRes = await request('POST', `/transactions/${txId}/pay`, {
      paymentMethod: 'ONLINE',
      reference: 'MOCK_STRIPE_CH_999888'
    }, userBToken);
    assert(payRes.data.status === 'HANDOVER_PENDING', 'Transaction transitions to HANDOVER_PENDING upon payment');

    // Verify User B can now view exact pickup address and Handover OTP
    const userBTxView = await request('GET', `/transactions/${txId}`, null, userBToken);
    assert(userBTxView.data.transaction.listing_exact_address !== undefined, 'User B can now view exact pickup address');
    assert(userBTxView.data.transaction.handover_otp !== undefined, 'User B possesses 6-digit Handover OTP');
    const handoverOtp = userBTxView.data.transaction.handover_otp;
    const returnOtp = userBTxView.data.transaction.return_otp;

    // 10. Handover OTP Verification & Return Flow
    console.log('\n[10/12] Testing Pre-Handover Photos & Handover OTP Verification...');
    await request('POST', `/transactions/${txId}/condition-evidence`, {
      stage: 'BEFORE_HANDOVER',
      conditionNotes: 'Desk inspected: smooth surface, LED lamp functional.',
      photoUrls: ['https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=600']
    }, userAToken);

    // User A verifies Handover OTP provided by User B at physical meetup
    const handoverRes = await request('POST', `/transactions/${txId}/verify-handover`, {
      otp: handoverOtp
    }, userAToken);
    assert(handoverRes.data.status === 'ACTIVE', 'Transaction transitions to ACTIVE upon Handover OTP verification');

    // Post-return condition evidence & Return OTP verification
    await request('POST', `/transactions/${txId}/condition-evidence`, {
      stage: 'AFTER_RETURN',
      conditionNotes: 'Returned in clean, excellent condition.',
      photoUrls: ['https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=600']
    }, userAToken);

    const returnRes = await request('POST', `/transactions/${txId}/verify-return`, {
      otp: returnOtp,
      hasDamage: false
    }, userAToken);
    assert(returnRes.data.status === 'COMPLETED', 'Transaction transitions to COMPLETED');
    assert(returnRes.data.depositStatus === 'REFUNDED', 'Security deposit is fully refunded');

    // Mutual review: User B reviews User A
    const reviewRes = await request('POST', '/reviews', {
      transactionId: txId,
      rating: 5,
      reviewText: 'Desk was in perfect condition and Anita was so helpful!'
    }, userBToken);
    assert(reviewRes.data.success === true, 'User B reviews User A after completion');

    // 11. Reverse Transaction Capability: Same User B Lists an Item, User A Rents it!
    console.log('\n[11/12] Testing Reverse Capability: Same User B Posts/Lends, User A Rents/Borrows...');
    const drillTitle = `Makita Rotary Hammer Drill ${testSuffixB}`;
    const postResB = await request('POST', '/listings', {
      categoryId: 'cat_tools',
      title: drillTitle,
      description: '800W rotary hammer drill with chuck and depth stop.',
      condition: 'Good',
      rentPricePerDay: 12,
      isBorrowFree: 0,
      securityDeposit: 30,
      locationName: 'Hitech City',
      latitude: 17.4480,
      longitude: 78.3910,
      pickupInstructions: 'Pick up at reception tower 3.',
      exactAddress: 'Tower 3, Cyber Gateway, Hitech City'
    }, userBToken);
    assert(postResB.data.success === true, 'User B successfully posts item as Lister (Lender)');
    const drillListingId = postResB.data.listingId;

    // Admin approves User B's drill listing
    await request('POST', `/admin/moderation/${drillListingId}`, { action: 'APPROVE' }, adminToken);

    // User A requests to rent User B's drill (User A = Borrower context, User B = Lender context)
    const req2 = await request('POST', '/requests', {
      listingId: drillListingId,
      requestType: 'RENT',
      startDate: '2026-10-15',
      endDate: '2026-10-16',
      message: 'Need to drill curtain rods in new apartment.'
    }, userAToken);
    assert(req2.data.success === true, 'User A submits request to borrow User B\'s item');

    // User B accepts request from User A
    const accept2 = await request('POST', `/requests/${req2.data.requestId}/respond`, { action: 'ACCEPT' }, userBToken);
    assert(accept2.data.success === true, 'User B accepts request (same user who was previously borrower!)');
    const tx2Id = accept2.data.transactionId;

    // User A pays
    await request('POST', `/transactions/${tx2Id}/pay`, { paymentMethod: 'ONLINE' }, userAToken);

    // User B verifies handover OTP
    const tx2Details = await request('GET', `/transactions/${tx2Id}`, null, userAToken);
    await request('POST', `/transactions/${tx2Id}/verify-handover`, { otp: tx2Details.data.transaction.handover_otp }, userBToken);

    // 12. Damage Dispute Arbitration Workflow
    console.log('\n[12/12] Testing Damage Dispute Arbitration Workflow...');
    // User B reports damage during return inspection
    const damageRes = await request('POST', `/transactions/${tx2Id}/report-damage`, {
      damageDescription: 'Drill chuck was cracked during use',
      estimatedCost: 20,
      damagePhotos: ['https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600']
    }, userBToken);
    assert(damageRes.data.status === 'DISPUTED', 'Transaction transitions to DISPUTED');
    const disputeId = damageRes.data.disputeId;

    // User A responds with counter-explanation
    const respRes = await request('POST', `/disputes/${disputeId}/respond`, {
      response: 'CONTESTED',
      notes: 'I agree to pay $10 towards chuck repair.',
      photos: []
    }, userAToken);
    assert(respRes.data.success === true, 'User A counter-response submitted');

    // Admin arbitrates the dispute
    const resolveRes = await request('POST', `/admin/disputes/${disputeId}/resolve`, {
      resolution: 'RESOLVED_DEDUCTION',
      deductedAmount: 15,
      adminNotes: 'Admin verified evidence. Fair compromise of $15 deduction.'
    }, adminToken);
    assert(resolveRes.data.success === true, 'Admin arbitrates dispute with deduction');
    assert(resolveRes.data.deductedAmount === 15, 'Approved deduction awarded to lender');
    assert(resolveRes.data.refundedAmount === 15, 'Remainder of deposit refunded to borrower');

    console.log('\n====================================================');
    console.log('✅ ALL 12 INTEGRATION WORKFLOW TESTS PASSED PERFECTLY!');
    console.log('====================================================\n');

  } catch (err) {
    console.error('\n❌ TEST SUITE RUNTIME ERROR:', err);
    process.exitCode = 1;
  } finally {
    if (server) server.close();
  }
}

runTestSuite();
