async function renderHomeView() {
  const root = document.getElementById('app-root');

  root.innerHTML = `
    <!-- Hero Section -->
    <section class="relative bg-gradient-to-b from-emerald-50/70 via-white to-slate-50 pt-12 pb-20 border-b border-slate-200/80 overflow-hidden">
      <!-- Background subtle decorative shapes -->
      <div class="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-emerald-200/30 blur-3xl pointer-events-none"></div>
      <div class="absolute top-1/2 -left-24 w-80 h-80 rounded-full bg-teal-200/20 blur-3xl pointer-events-none"></div>

      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div class="text-center max-w-3xl mx-auto">
          <!-- Featured Logo Visual -->
          <div class="flex justify-center mb-5">
            <div class="relative group">
              <div class="absolute -inset-1.5 bg-gradient-to-tr from-emerald-500 via-teal-400 to-amber-400 rounded-3xl blur-md opacity-40 group-hover:opacity-70 transition duration-500"></div>
              <img src="/images/logo.png" alt="REUSEHUB Logo" class="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-contain bg-white p-2 shadow-xl border border-emerald-100 transform hover:scale-105 transition duration-300" />
            </div>
          </div>

          <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold mb-6 border border-emerald-200">
            <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
            REUSEHUB — A Trusted Community Platform to Rent, Borrow & Reuse
          </div>

          <h1 class="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.1] mb-6">
            Rent what you need.<br/>
            <span class="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500">Share what you own.</span>
          </h1>

          <p class="text-lg text-slate-600 mb-8 leading-relaxed">
            Borrow cameras, tools, camping tents, lawn mowers and academic equipment directly from verified neighbors. Protected by <strong>OTP Handover</strong>, <strong>Condition Evidence</strong>, and <strong>Escrow Security Deposits</strong>.
          </p>

          <!-- Natural-Language Smart Match Search Bar -->
          <div class="bg-white p-2.5 sm:p-3 rounded-2xl sm:rounded-3xl shadow-xl shadow-slate-200/70 border border-slate-200 max-w-2xl mx-auto text-left">
            <form onsubmit="app.handleHomeSmartMatch(event)" class="flex flex-col sm:flex-row items-center gap-2">
              <div class="flex items-center gap-3 px-3 py-2 w-full flex-1">
                <i data-lucide="sparkles" class="w-5 h-5 text-emerald-600 shrink-0"></i>
                <input 
                  type="text" 
                  id="home-smart-query"
                  placeholder='Try: "Need a projector for 2 days within 5 km"' 
                  class="w-full text-sm text-slate-800 focus:outline-none bg-transparent placeholder-slate-400 font-medium"
                />
              </div>
              <button 
                type="submit" 
                class="w-full sm:w-auto px-6 py-3 rounded-xl sm:rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm transition shadow-md shadow-brand-600/30 flex items-center justify-center gap-2 shrink-0"
              >
                <span>Smart Match</span>
                <i data-lucide="arrow-right" class="w-4 h-4"></i>
              </button>
            </form>
            <div class="px-3 pt-2 text-[11px] text-slate-400 flex flex-wrap items-center gap-1.5">
              <span>Quick prompts:</span>
              <button type="button" onclick="app.fillSmartQuery('Need a projector for 2 days within 5 km')" class="hover:text-emerald-700 underline">Projector 2 days</button> •
              <button type="button" onclick="app.fillSmartQuery('Cordless drill for 1 day under $20')" class="hover:text-emerald-700 underline">Cordless drill</button> •
              <button type="button" onclick="app.fillSmartQuery('Camping tent to borrow for weekend')" class="hover:text-emerald-700 underline">Camping tent (borrow)</button>
            </div>
          </div>
        </div>

        <!-- Real Factual Platform Reuse Impact Banner -->
        <div id="home-impact-banner" class="mt-14 max-w-5xl mx-auto bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div class="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <i data-lucide="leaf" class="w-5 h-5"></i>
              </div>
              <div>
                <h3 class="text-sm font-bold text-slate-900">Real Platform Reuse Impact</h3>
                <p class="text-[11px] text-slate-500">Calculated strictly from completed exchanges using Life Cycle Assessment (LCA) methodology</p>
              </div>
            </div>
            <button onclick="app.showImpactMethodology()" class="text-xs font-semibold text-emerald-600 hover:text-emerald-800 flex items-center gap-1">
              <span>View Methodology</span>
              <i data-lucide="info" class="w-3.5 h-3.5"></i>
            </button>
          </div>

          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-center" id="home-impact-counters">
            <div class="p-3 rounded-xl bg-slate-50">
              <span class="text-2xl font-black text-slate-900 block" id="cnt-exchanges">--</span>
              <span class="text-xs text-slate-500 font-medium">Successful Exchanges</span>
            </div>
            <div class="p-3 rounded-xl bg-slate-50">
              <span class="text-2xl font-black text-emerald-600 block" id="cnt-items">--</span>
              <span class="text-xs text-slate-500 font-medium">Reused Items</span>
            </div>
            <div class="p-3 rounded-xl bg-slate-50">
              <span class="text-2xl font-black text-teal-600 block" id="cnt-co2">--</span>
              <span class="text-xs text-slate-500 font-medium">kg CO2e Emissions Avoided</span>
            </div>
            <div class="p-3 rounded-xl bg-slate-50">
              <span class="text-2xl font-black text-blue-600 block" id="cnt-waste">--</span>
              <span class="text-xs text-slate-500 font-medium">kg Waste Kept from Landfills</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 12 Categories Grid -->
    <section class="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-end justify-between mb-8">
        <div>
          <h2 class="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Explore by Category</h2>
          <p class="text-sm text-slate-500 mt-1">12 distinct categories of reusable household, student, and industrial assets</p>
        </div>
        <a href="#explore" class="text-sm font-semibold text-brand-600 hover:text-brand-800 flex items-center gap-1">
          <span>View all items</span>
          <i data-lucide="arrow-right" class="w-4 h-4"></i>
        </a>
      </div>

      <div id="home-categories-grid" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        <!-- Loaded dynamically -->
        <div class="p-6 bg-white rounded-xl border border-slate-200 animate-pulse h-28"></div>
        <div class="p-6 bg-white rounded-xl border border-slate-200 animate-pulse h-28"></div>
        <div class="p-6 bg-white rounded-xl border border-slate-200 animate-pulse h-28"></div>
        <div class="p-6 bg-white rounded-xl border border-slate-200 animate-pulse h-28"></div>
      </div>
    </section>

    <!-- Featured Verified Items -->
    <section class="py-16 bg-white border-t border-slate-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-end justify-between mb-8">
          <div>
            <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-semibold mb-2">
              <i data-lucide="shield-check" class="w-3.5 h-3.5"></i> Admin Moderated & Approved
            </div>
            <h2 class="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Featured Community Items</h2>
            <p class="text-sm text-slate-500 mt-1">Available for rent or free borrow with neighborhood discovery</p>
          </div>
          <a href="#explore" class="text-sm font-semibold text-brand-600 hover:text-brand-800 flex items-center gap-1">
            <span>Browse All</span>
            <i data-lucide="arrow-right" class="w-4 h-4"></i>
          </a>
        </div>

        <div id="home-featured-listings" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <!-- Loaded dynamically -->
          <div class="h-72 bg-slate-100 rounded-2xl animate-pulse"></div>
          <div class="h-72 bg-slate-100 rounded-2xl animate-pulse"></div>
          <div class="h-72 bg-slate-100 rounded-2xl animate-pulse"></div>
          <div class="h-72 bg-slate-100 rounded-2xl animate-pulse"></div>
        </div>
      </div>
    </section>

    <!-- Trust & Safety Protocol Section -->
    <section class="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="text-center max-w-2xl mx-auto mb-12">
        <h2 class="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Why RENT & REUSE is Trusted</h2>
        <p class="text-sm text-slate-500 mt-2">Zero unverified users, zero hidden addresses, and complete protection for both lenders and renters.</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div class="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold mb-4">
            <i data-lucide="shield-check" class="w-6 h-6"></i>
          </div>
          <h3 class="text-base font-bold text-slate-900 mb-2">Dual-OTP Handover & Return</h3>
          <p class="text-xs text-slate-600 leading-relaxed">
            Handovers require a 6-digit Handover OTP generated for the meetup. Returns require a separate Return OTP. Both parties must physically verify possession before transactions transition.
          </p>
        </div>

        <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div class="w-12 h-12 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold mb-4">
            <i data-lucide="camera" class="w-6 h-6"></i>
          </div>
          <h3 class="text-base font-bold text-slate-900 mb-2">Condition Evidence Vault</h3>
          <p class="text-xs text-slate-600 leading-relaxed">
            Before handover and after return, timestamped high-resolution photos and condition notes are recorded. If damage occurs, our Admin Dispute Desk reviews side-by-side evidence before touching escrow deposits.
          </p>
        </div>

        <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div class="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold mb-4">
            <i data-lucide="eye-off" class="w-6 h-6"></i>
          </div>
          <h3 class="text-base font-bold text-slate-900 mb-2">Privacy & Location Masking</h3>
          <p class="text-xs text-slate-600 leading-relaxed">
            Exact home addresses and phone numbers are strictly hidden from public searches. Strangers only see approximate neighborhood circles. Exact pickup instructions unlock only after approved booking.
          </p>
        </div>
      </div>
    </section>
  `;

  lucide.createIcons();

  // Load Real Data
  try {
    // 1. Categories
    const categories = await api.getCategories();
    const catGrid = document.getElementById('home-categories-grid');
    if (catGrid) {
      catGrid.innerHTML = categories.map(c => `
        <a href="#explore?category=${c.slug}" class="group p-5 bg-white rounded-2xl border border-slate-200 hover:border-emerald-500 hover:shadow-md transition flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition flex items-center justify-center shrink-0">
            <i data-lucide="${mapCategoryIcon(c.icon)}" class="w-6 h-6"></i>
          </div>
          <div class="min-w-0">
            <h4 class="font-bold text-sm text-slate-900 group-hover:text-emerald-700 transition truncate">${c.name}</h4>
            <span class="text-xs text-slate-500">${c.approved_listings_count || 0} items available</span>
          </div>
        </a>
      `).join('');
      lucide.createIcons();
    }

    // 2. Real Platform Metrics
    const metrics = await api.getImpactMetrics();
    if (metrics) {
      document.getElementById('cnt-exchanges').innerText = metrics.successfulExchanges;
      document.getElementById('cnt-items').innerText = metrics.reusedItems;
      document.getElementById('cnt-co2').innerText = metrics.totalCo2SavedKg;
      document.getElementById('cnt-waste').innerText = metrics.totalWasteDivertedKg;
    }

    // 3. Featured Listings
    const listings = await api.getListings({ sort: 'recently_added' });
    const featContainer = document.getElementById('home-featured-listings');
    if (featContainer) {
      if (listings.length === 0) {
        featContainer.innerHTML = `<div class="col-span-4 text-center py-12 text-slate-400 text-sm">No approved listings yet.</div>`;
      } else {
        featContainer.innerHTML = listings.slice(0, 4).map(item => renderListingCardHtml(item)).join('');
        lucide.createIcons();
      }
    }
  } catch (err) {
    console.error('Home load error:', err);
  }
}

function mapCategoryIcon(iconName) {
  const map = {
    'GraduationCap': 'graduation-cap',
    'Home': 'home',
    'Tv': 'tv',
    'Wrench': 'wrench',
    'Factory': 'factory',
    'Wheat': 'wheat',
    'PartyPopper': 'party-popper',
    'Trophy': 'trophy',
    'Car': 'car',
    'Shirt': 'shirt',
    'BookOpen': 'book-open',
    'Package': 'package'
  };
  return map[iconName] || 'box';
}

function renderListingCardHtml(item) {
  const isFree = item.is_borrow_free || item.rent_price_per_day === 0;
  return `
    <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition flex flex-col group">
      <a href="#listing/${item.id}" class="block relative aspect-video bg-slate-100 overflow-hidden">
        <img 
          src="${item.primary_image || 'https://images.unsplash.com/photo-1581291518655-9523c932deb4?w=500'}" 
          onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1581291518655-9523c932deb4?w=500';"
          class="w-full h-full object-cover group-hover:scale-105 transition duration-300"
          alt="${item.title}"
        />
        <div class="absolute top-2.5 left-2.5 flex items-center gap-1.5">
          <span class="text-[11px] font-bold px-2 py-0.5 rounded-full ${isFree ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white'} shadow-sm">
            ${isFree ? 'FREE BORROW' : `$${item.rent_price_per_day}/day`}
          </span>
          <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-900/80 text-white backdrop-blur">
            ${item.condition}
          </span>
        </div>
      </a>

      <div class="p-4 flex-1 flex flex-col">
        <div class="text-[11px] font-medium text-emerald-700 mb-1 flex items-center justify-between">
          <span>${item.category_name}</span>
          ${item.distance_km !== null && item.distance_km !== undefined ? `
            <span class="text-slate-400 flex items-center gap-0.5"><i data-lucide="map-pin" class="w-3 h-3"></i> ~${item.distance_km} km</span>
          ` : ''}
        </div>

        <h3 class="font-bold text-sm text-slate-900 group-hover:text-emerald-700 transition line-clamp-1 mb-1">
          <a href="#listing/${item.id}">${item.title}</a>
        </h3>

        <p class="text-xs text-slate-500 line-clamp-2 mb-4 flex-1">
          ${item.description}
        </p>

        <div class="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          <div class="flex items-center gap-1.5 text-slate-600">
            <i data-lucide="shield-check" class="w-3.5 h-3.5 text-emerald-600"></i>
            <span class="truncate max-w-[120px]">${item.owner_name}</span>
          </div>

          <a href="#listing/${item.id}" class="font-semibold text-emerald-700 hover:text-emerald-900">
            Details →
          </a>
        </div>
      </div>
    </div>
  `;
}
