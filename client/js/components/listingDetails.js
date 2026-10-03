async function renderListingDetailsView(listingId) {
  const root = document.getElementById('app-root');

  root.innerHTML = `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
      <div class="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
      <p class="text-xs text-slate-500">Loading item details...</p>
    </div>
  `;

  try {
    const listing = await api.getListing(listingId);
    const currentUser = api.getCurrentUser();
    const isOwner = currentUser && currentUser.id === listing.owner_id;
    const isFree = listing.is_borrow_free || listing.rent_price_per_day === 0;

    root.innerHTML = `
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        <!-- Breadcrumbs -->
        <nav class="flex items-center gap-2 text-xs text-slate-500 mb-6">
          <a href="#home" class="hover:text-slate-800">Home</a>
          <span>/</span>
          <a href="#explore" class="hover:text-slate-800">Explore</a>
          <span>/</span>
          <a href="#explore?category=${listing.category_id}" class="hover:text-slate-800">${listing.category_name}</a>
          <span>/</span>
          <span class="text-slate-900 font-semibold truncate max-w-xs">${listing.title}</span>
        </nav>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <!-- Left 2 Cols: Photos & Details -->
          <div class="lg:col-span-2 space-y-8">
            
            <!-- Gallery / Image View -->
            <div class="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
              <div class="relative aspect-video bg-slate-900">
                <img 
                  id="main-detail-img"
                  src="${listing.images && listing.images.length > 0 ? listing.images[0] : 'https://images.unsplash.com/photo-1581291518655-9523c932deb4?w=800'}" 
                  onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1581291518655-9523c932deb4?w=800';"
                  class="w-full h-full object-cover" 
                  alt="${listing.title}"
                />
                
                <div class="absolute top-4 left-4 flex items-center gap-2">
                  <span class="text-xs font-bold px-3 py-1 rounded-full ${isFree ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white'} shadow-md">
                    ${isFree ? 'FREE TO BORROW' : `$${listing.rent_price_per_day} / day`}
                  </span>
                  <span class="text-xs font-semibold px-3 py-1 rounded-full bg-slate-900/80 text-white backdrop-blur">
                    ${listing.condition}
                  </span>
                </div>

                <div class="absolute top-4 right-4 flex items-center gap-2">
                  <button 
                    onclick="app.toggleWishlist('${listing.id}')" 
                    id="btn-wishlist-${listing.id}"
                    class="p-2.5 rounded-full bg-white/90 hover:bg-white text-slate-700 shadow-md backdrop-blur transition"
                    title="${listing.is_saved ? 'Remove from Wishlist' : 'Save to Wishlist'}"
                  >
                    <i data-lucide="bookmark" class="w-4 h-4 ${listing.is_saved ? 'fill-emerald-600 text-emerald-600' : ''}"></i>
                  </button>
                  <button 
                    onclick="app.openReportModal('${listing.id}', '${listing.title.replace(/'/g, "\\'")}')" 
                    class="p-2.5 rounded-full bg-white/90 hover:bg-white text-slate-700 shadow-md backdrop-blur transition"
                    title="Report Listing"
                  >
                    <i data-lucide="flag" class="w-4 h-4 text-slate-500 hover:text-rose-600"></i>
                  </button>
                </div>
              </div>

              <!-- Thumbnails if multi-image -->
              ${listing.images && listing.images.length > 1 ? `
                <div class="p-3 bg-slate-50 border-t border-slate-100 flex items-center gap-2 overflow-x-auto">
                  ${listing.images.map((img, idx) => `
                    <button 
                      onclick="document.getElementById('main-detail-img').src = '${img}'" 
                      class="shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 border-transparent hover:border-emerald-600 focus:border-emerald-600 transition"
                    >
                      <img src="${img}" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1581291518655-9523c932deb4?w=200';" class="w-full h-full object-cover" />
                    </button>
                  `).join('')}
                </div>
              ` : ''}
            </div>

            <!-- Title & Metadata -->
            <div class="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
              <div>
                <div class="flex items-center gap-2 text-xs font-semibold text-emerald-700 mb-1.5">
                  <i data-lucide="tag" class="w-3.5 h-3.5"></i>
                  <span>${listing.category_name}</span>
                  <span>•</span>
                  <span>Posted on ${new Date(listing.created_at).toLocaleDateString()}</span>
                </div>
                <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">${listing.title}</h1>
              </div>

              <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 border-y border-slate-100 text-xs">
                <div class="p-3 rounded-xl bg-slate-50">
                  <span class="text-slate-400 block text-[11px] mb-0.5">Condition</span>
                  <span class="font-bold text-slate-800">${listing.condition}</span>
                </div>
                <div class="p-3 rounded-xl bg-slate-50">
                  <span class="text-slate-400 block text-[11px] mb-0.5">Rental Fee</span>
                  <span class="font-bold ${isFree ? 'text-blue-700' : 'text-emerald-700'}">${isFree ? 'Free to Borrow' : '$' + listing.rent_price_per_day + '/day'}</span>
                </div>
                <div class="p-3 rounded-xl bg-slate-50">
                  <span class="text-slate-400 block text-[11px] mb-0.5">Security Deposit</span>
                  <span class="font-bold text-slate-800">${listing.security_deposit > 0 ? '$' + listing.security_deposit + ' (Escrow Refundable)' : 'No Deposit Required'}</span>
                </div>
                <div class="p-3 rounded-xl bg-slate-50">
                  <span class="text-slate-400 block text-[11px] mb-0.5">Approx Distance</span>
                  <span class="font-bold text-slate-800">${listing.distance_km !== null && listing.distance_km !== undefined ? `~${listing.distance_km} km away` : 'In your city'}</span>
                </div>
              </div>

              <!-- Description -->
              <div>
                <h3 class="text-sm font-bold text-slate-900 mb-2">Item Description</h3>
                <p class="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line">${listing.description}</p>
              </div>

              <!-- Location & Privacy Box -->
              <div class="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div class="flex items-start gap-3">
                  <div class="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <i data-lucide="map-pin" class="w-4 h-4"></i>
                  </div>
                  <div class="flex-1">
                    <h4 class="text-xs font-bold text-slate-900">Pickup Location Area</h4>
                    <p class="text-xs text-slate-600 mt-0.5">${listing.location_name}</p>

                    ${listing.can_view_exact ? `
                      <div class="mt-3 p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs">
                        <div class="font-bold text-emerald-900 flex items-center gap-1.5 mb-1">
                          <i data-lucide="unlock" class="w-3.5 h-3.5 text-emerald-600"></i>
                          <span>Verified Pickup Address (Unlocked for Approved Transaction):</span>
                        </div>
                        <p class="text-slate-800 font-medium">${listing.exact_address}</p>
                        <p class="text-slate-600 mt-1"><strong>Instructions:</strong> ${listing.pickup_instructions}</p>
                      </div>
                    ` : `
                      <div class="mt-2.5 flex items-center gap-2 text-[11px] text-slate-500 bg-white p-2 rounded-lg border border-slate-200">
                        <i data-lucide="shield" class="w-3.5 h-3.5 text-brand-600 shrink-0"></i>
                        <span>Privacy Protected: Exact home address & handover notes will be revealed only after the lender accepts your booking and payment is confirmed.</span>
                      </div>
                    `}
                  </div>
                </div>
              </div>

              <!-- Prohibited Item Disclaimer -->
              <div class="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span>All listings comply with platform safety rules. Prohibited weapons, hazardous chemicals, and illicit items are strictly barred.</span>
                <button onclick="app.openReportModal('${listing.id}', '${listing.title.replace(/'/g, "\\'")}')" class="text-rose-600 hover:text-rose-800 font-medium shrink-0 ml-4">
                  Report Listing
                </button>
              </div>

            </div>

          </div>

          <!-- Right Col: Booking Request Form & Owner Trust Card -->
          <div class="space-y-6">
            
            <!-- Booking Request Box -->
            <div class="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm sticky top-24">
              <div class="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                <div>
                  <span class="text-xs text-slate-400 font-medium block">Price to Rent</span>
                  <span class="text-2xl font-black ${isFree ? 'text-blue-700' : 'text-slate-900'}">
                    ${isFree ? 'Free Borrow' : '$' + listing.rent_price_per_day + ' <span class="text-xs font-normal text-slate-500">/ day</span>'}
                  </span>
                </div>
                ${listing.security_deposit > 0 ? `
                  <div class="text-right">
                    <span class="text-[10px] text-slate-400 block font-medium">Refundable Deposit</span>
                    <span class="text-sm font-bold text-slate-700">$${listing.security_deposit}</span>
                  </div>
                ` : ''}
              </div>

              ${isOwner ? `
                <div class="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-center text-xs text-amber-800">
                  <i data-lucide="info" class="w-5 h-5 mx-auto mb-1 text-amber-600"></i>
                  <span class="font-bold block">This is your item listing</span>
                  <span>You can manage this item and view incoming booking requests from your dashboard.</span>
                  <a href="#dashboard?tab=listings" class="mt-3 inline-block font-bold text-amber-900 underline">Go to My Listings →</a>
                </div>
              ` : `
                <!-- Booking Request Form -->
                <form onsubmit="app.handleBookingSubmit(event, '${listing.id}')" class="space-y-4">
                  
                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="block text-xs font-semibold text-slate-700 mb-1">Start Date</label>
                      <input 
                        type="date" 
                        id="req-start-date" 
                        required 
                        min="${new Date().toISOString().split('T')[0]}"
                        onchange="app.calculateBookingEstimate(${listing.rent_price_per_day}, ${listing.security_deposit}, ${isFree})"
                        class="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label class="block text-xs font-semibold text-slate-700 mb-1">End Date</label>
                      <input 
                        type="date" 
                        id="req-end-date" 
                        required 
                        min="${new Date().toISOString().split('T')[0]}"
                        onchange="app.calculateBookingEstimate(${listing.rent_price_per_day}, ${listing.security_deposit}, ${isFree})"
                        class="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label class="block text-xs font-semibold text-slate-700 mb-1">Message to Lender</label>
                    <textarea 
                      id="req-message" 
                      rows="2"
                      placeholder="Hi ${listing.owner_name}, I'd like to use this for..."
                      class="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:border-emerald-500 resize-none"
                    ></textarea>
                  </div>

                  <!-- Live Cost Breakdown -->
                  <div id="booking-cost-breakdown" class="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2">
                    <div class="flex justify-between text-slate-600">
                      <span id="label-calc-days">Days selected</span>
                      <span id="val-calc-days" class="font-medium">1 day</span>
                    </div>
                    <div class="flex justify-between text-slate-600">
                      <span>Rental Fee</span>
                      <span id="val-calc-rent" class="font-medium">${isFree ? '$0 (Free Borrow)' : '$' + listing.rent_price_per_day}</span>
                    </div>
                    ${listing.security_deposit > 0 ? `
                      <div class="flex justify-between text-slate-600">
                        <span>Security Deposit (Refundable)</span>
                        <span class="font-medium">$${listing.security_deposit}</span>
                      </div>
                    ` : ''}
                    <div class="pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-900 text-sm">
                      <span>Total Payable</span>
                      <span id="val-calc-total" class="text-emerald-700">${isFree ? (listing.security_deposit > 0 ? '$' + listing.security_deposit : '$0') : '$' + (listing.rent_price_per_day + listing.security_deposit)}</span>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    class="w-full py-3 rounded-2xl ${isFree ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'} text-white font-bold text-sm shadow-md transition transform active:scale-95"
                  >
                    ${isFree ? 'Request to Borrow (Free)' : 'Request to Rent'}
                  </button>

                  <p class="text-[11px] text-center text-slate-400">
                    Lender must explicitly accept before payment/handover proceeds.
                  </p>
                </form>
              `}
            </div>

            <!-- Owner Trust & Profile Card -->
            <div class="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <span class="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-4">Lender Trust Profile</span>
              <div class="flex items-center gap-3 mb-4">
                <img src="${listing.owner_photo || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120'}" class="w-12 h-12 rounded-2xl object-cover" />
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-1.5">
                    <h4 class="font-bold text-sm text-slate-900 truncate">${listing.owner_name}</h4>
                    ${listing.owner_verified ? `<i data-lucide="badge-check" class="w-4 h-4 text-emerald-600 shrink-0" title="Mobile Verified"></i>` : ''}
                  </div>
                  <div class="flex items-center gap-1 text-xs text-amber-500 font-semibold mt-0.5">
                    <span>★ ${listing.owner_rating || '5.0'}</span>
                    <span class="text-slate-400 font-normal">(${listing.owner_review_count || 0} reviews)</span>
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-2 text-center text-xs py-3 border-y border-slate-100 mb-4">
                <div class="p-2 rounded-lg bg-slate-50">
                  <span class="font-bold text-slate-900 block text-sm">${listing.owner_completed_exchanges || 0}</span>
                  <span class="text-[10px] text-slate-500">Exchanges</span>
                </div>
                <div class="p-2 rounded-lg bg-slate-50">
                  <span class="font-bold text-emerald-700 block text-sm">Verified</span>
                  <span class="text-[10px] text-slate-500">Mobile OTP</span>
                </div>
              </div>

              <div class="text-[11px] text-slate-500 space-y-1.5">
                <div class="flex items-center gap-2">
                  <i data-lucide="shield-check" class="w-3.5 h-3.5 text-emerald-600"></i>
                  <span>Mobile OTP identity verified</span>
                </div>
                <div class="flex items-center gap-2">
                  <i data-lucide="message-square" class="w-3.5 h-3.5 text-emerald-600"></i>
                  <span>In-app chat available post-request</span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    `;

    lucide.createIcons();

    // Default dates (today and tomorrow)
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 2);

    const startInput = document.getElementById('req-start-date');
    const endInput = document.getElementById('req-end-date');
    if (startInput && endInput) {
      startInput.value = today.toISOString().split('T')[0];
      endInput.value = tomorrow.toISOString().split('T')[0];
      app.calculateBookingEstimate(listing.rent_price_per_day, listing.security_deposit, isFree);
    }

  } catch (err) {
    root.innerHTML = `
      <div class="max-w-md mx-auto my-16 p-8 bg-white rounded-3xl border border-rose-200 text-center">
        <div class="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
          <i data-lucide="alert-circle" class="w-6 h-6"></i>
        </div>
        <h3 class="text-base font-bold text-slate-900 mb-1">Item Not Found or Under Review</h3>
        <p class="text-xs text-slate-500 mb-4">${err.message}</p>
        <a href="#explore" class="inline-block px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl">Browse All Items</a>
      </div>
    `;
    lucide.createIcons();
  }
}
