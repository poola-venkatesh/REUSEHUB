let currentExploreFilters = {
  search: '',
  category: '',
  type: 'all', // 'all', 'rent', 'borrow'
  condition: '',
  minPrice: '',
  maxPrice: '',
  radiusKm: 25,
  sort: 'recently_added',
  viewMode: 'grid' // 'grid' or 'map'
};

async function renderExploreView(initialParams = {}) {
  const root = document.getElementById('app-root');

  // Parse initial params from URL hash (e.g. #explore?category=student)
  if (initialParams.category) currentExploreFilters.category = initialParams.category;
  if (initialParams.search) currentExploreFilters.search = initialParams.search;

  root.innerHTML = `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Breadcrumb & Top Bar -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 class="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Explore Items</h1>
          <p class="text-xs text-slate-500 mt-1">Browse approved items for rent and free borrowing within your community</p>
        </div>

        <!-- View Mode & Sort Controls -->
        <div class="flex items-center gap-3">
          <div class="inline-flex rounded-xl bg-slate-200/80 p-1 border border-slate-300/60">
            <button 
              id="btn-view-grid" 
              onclick="app.setExploreViewMode('grid')" 
              class="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${currentExploreFilters.viewMode === 'grid' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}"
            >
              <i data-lucide="grid" class="w-3.5 h-3.5"></i>
              <span>Grid</span>
            </button>
            <button 
              id="btn-view-map" 
              onclick="app.setExploreViewMode('map')" 
              class="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${currentExploreFilters.viewMode === 'map' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}"
            >
              <i data-lucide="map" class="w-3.5 h-3.5"></i>
              <span>Interactive Map</span>
            </button>
          </div>

          <select 
            id="filter-sort" 
            onchange="app.handleFilterChange('sort', this.value)"
            class="text-xs font-medium bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:border-brand-500"
          >
            <option value="recently_added">Recently Added</option>
            <option value="nearest">Nearest First</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </select>
        </div>
      </div>

      <!-- Layout: Filter Sidebar + Content Grid/Map -->
      <div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        <!-- Filter Controls Sidebar -->
        <div class="lg:col-span-1 space-y-6">
          <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-5">
            <div class="flex items-center justify-between border-b border-slate-100 pb-3">
              <span class="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <i data-lucide="sliders-horizontal" class="w-4 h-4 text-emerald-600"></i> Filters
              </span>
              <button onclick="app.resetExploreFilters()" class="text-xs text-brand-600 hover:text-brand-800 font-medium">Reset All</button>
            </div>

            <!-- Keyword Search -->
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1.5">Item Search</label>
              <div class="relative">
                <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3 top-2.5"></i>
                <input 
                  type="text" 
                  id="filter-search"
                  value="${currentExploreFilters.search}"
                  oninput="app.handleFilterChange('search', this.value)"
                  placeholder="e.g. Projector, Drill, Tent..." 
                  class="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>
            </div>

            <!-- Rent vs Borrow Mode -->
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1.5">Listing Type</label>
              <div class="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl text-xs font-medium text-center">
                <button 
                  onclick="app.handleFilterChange('type', 'all')" 
                  class="py-1.5 rounded-lg transition ${currentExploreFilters.type === 'all' ? 'bg-white font-bold text-slate-900 shadow-sm' : 'text-slate-600'}"
                >All</button>
                <button 
                  onclick="app.handleFilterChange('type', 'rent')" 
                  class="py-1.5 rounded-lg transition ${currentExploreFilters.type === 'rent' ? 'bg-white font-bold text-emerald-700 shadow-sm' : 'text-slate-600'}"
                >Rent</button>
                <button 
                  onclick="app.handleFilterChange('type', 'borrow')" 
                  class="py-1.5 rounded-lg transition ${currentExploreFilters.type === 'borrow' ? 'bg-white font-bold text-blue-700 shadow-sm' : 'text-slate-600'}"
                >Free Borrow</button>
              </div>
            </div>

            <!-- Category Filter -->
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1.5">Category</label>
              <select 
                id="filter-category" 
                onchange="app.handleFilterChange('category', this.value)"
                class="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:border-emerald-500 focus:bg-white"
              >
                <option value="">All 12 Categories</option>
                <!-- Populated dynamically -->
              </select>
            </div>

            <!-- Distance Radius Slider -->
            <div>
              <div class="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
                <span>Maximum Distance</span>
                <span id="radius-val" class="text-emerald-600 font-bold">${currentExploreFilters.radiusKm} km</span>
              </div>
              <input 
                type="range" 
                id="filter-radius" 
                min="1" 
                max="50" 
                value="${currentExploreFilters.radiusKm}"
                oninput="document.getElementById('radius-val').innerText = this.value + ' km'; app.handleFilterChange('radiusKm', this.value)"
                class="w-full accent-emerald-600"
              />
              <div class="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>1 km</span>
                <span>25 km</span>
                <span>50 km</span>
              </div>
            </div>

            <!-- Condition Filter -->
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1.5">Item Condition</label>
              <select 
                id="filter-condition" 
                onchange="app.handleFilterChange('condition', this.value)"
                class="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:border-emerald-500 focus:bg-white"
              >
                <option value="">Any Condition</option>
                <option value="New">New</option>
                <option value="Like New">Like New</option>
                <option value="Good">Good</option>
                <option value="Used">Used</option>
                <option value="Needs Repair">Needs Repair</option>
              </select>
            </div>

            <!-- Max Daily Price Slider -->
            <div>
              <div class="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
                <span>Max Rent Price/Day</span>
                <span id="price-val" class="text-emerald-600 font-bold">${currentExploreFilters.maxPrice ? '$' + currentExploreFilters.maxPrice : 'Any'}</span>
              </div>
              <input 
                type="range" 
                id="filter-maxprice" 
                min="0" 
                max="100" 
                value="${currentExploreFilters.maxPrice || 100}"
                oninput="const val = this.value == 100 ? '' : this.value; document.getElementById('price-val').innerText = val ? '$' + val : 'Any'; app.handleFilterChange('maxPrice', val)"
                class="w-full accent-emerald-600"
              />
              <div class="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>$0 (Free)</span>
                <span>$50</span>
                <span>$100+</span>
              </div>
            </div>

          </div>

          <!-- Natural-Language Smart Match CTA Card -->
          <div class="p-5 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-md">
            <div class="flex items-center gap-2 mb-2 font-bold text-sm">
              <i data-lucide="sparkles" class="w-4 h-4 text-emerald-200"></i>
              <span>Smart Match Assistant</span>
            </div>
            <p class="text-xs text-emerald-100 leading-relaxed mb-4">
              Can't find what you need? Describe your exact requirement in plain English and let our matcher score budget, distance, and duration fit.
            </p>
            <button onclick="app.openSmartMatchModal()" class="w-full py-2 rounded-xl bg-white text-emerald-800 text-xs font-bold hover:bg-emerald-50 transition shadow-sm">
              Try Smart Match →
            </button>
          </div>
        </div>

        <!-- Main Items Area (Grid or Map View) -->
        <div class="lg:col-span-3">
          
          <!-- Category Quick Pills Bar -->
          <div id="category-pills-bar" class="flex items-center gap-2 overflow-x-auto pb-4 mb-4 scrollbar-none text-xs">
            <!-- Populated dynamically -->
          </div>

          <!-- Count Bar -->
          <div class="flex items-center justify-between text-xs text-slate-500 mb-4 px-1">
            <span id="explore-results-count">Loading items...</span>
            <div class="flex items-center gap-1.5 text-emerald-700">
              <i data-lucide="shield-check" class="w-3.5 h-3.5"></i>
              <span>All listings Admin Moderated</span>
            </div>
          </div>

          <!-- Grid Container -->
          <div id="explore-grid-container" class="${currentExploreFilters.viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5' : 'hidden'}">
            <!-- Populated dynamically -->
          </div>

          <!-- Map View Container -->
          <div id="explore-map-wrapper" class="${currentExploreFilters.viewMode === 'map' ? 'block' : 'hidden'}">
            <div class="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm mb-3">
              <div class="flex items-center justify-between text-xs">
                <span class="font-semibold text-slate-800 flex items-center gap-1.5">
                  <i data-lucide="map-pin" class="w-4 h-4 text-emerald-600"></i> Protected Community Discovery Map
                </span>
                <span class="text-slate-500 text-[11px]">Radius circles represent approximate neighborhood zones</span>
              </div>
            </div>
            <div id="explore-leaflet-map" class="w-full h-[600px] rounded-2xl border border-slate-200 shadow-sm z-0"></div>
          </div>

        </div>

      </div>
    </div>
  `;

  lucide.createIcons();

  // Populate categories
  try {
    const categories = await api.getCategories();
    const catSelect = document.getElementById('filter-category');
    const pillsBar = document.getElementById('category-pills-bar');

    if (catSelect) {
      catSelect.innerHTML = `<option value="">All 12 Categories</option>` + 
        categories.map(c => `<option value="${c.slug}" ${currentExploreFilters.category === c.slug ? 'selected' : ''}>${c.name}</option>`).join('');
    }

    if (pillsBar) {
      pillsBar.innerHTML = `
        <button 
          onclick="app.handleFilterChange('category', '')" 
          class="shrink-0 px-3 py-1.5 rounded-full font-medium transition ${!currentExploreFilters.category ? 'bg-slate-900 text-white font-semibold' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'}"
        >All</button>
      ` + categories.map(c => `
        <button 
          onclick="app.handleFilterChange('category', '${c.slug}')" 
          class="shrink-0 px-3 py-1.5 rounded-full font-medium transition ${currentExploreFilters.category === c.slug ? 'bg-emerald-600 text-white font-semibold shadow-sm' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'}"
        >${c.name}</button>
      `).join('');
    }
  } catch (err) {
    console.error('Categories error in explore:', err);
  }

  // Load Listings
  await loadExploreListings();
}

async function loadExploreListings() {
  const gridContainer = document.getElementById('explore-grid-container');
  const countSpan = document.getElementById('explore-results-count');

  if (!gridContainer) return;

  gridContainer.innerHTML = `
    <div class="col-span-3 text-center py-16 text-slate-400">
      <div class="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
      <p class="text-xs">Finding available items...</p>
    </div>
  `;

  try {
    const listings = await api.getListings(currentExploreFilters);

    if (countSpan) {
      countSpan.innerText = `Showing ${listings.length} approved item${listings.length === 1 ? '' : 's'}`;
    }

    if (listings.length === 0) {
      gridContainer.innerHTML = `
        <div class="col-span-3 text-center py-20 bg-white rounded-2xl border border-slate-200 p-8">
          <div class="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <i data-lucide="package-search" class="w-6 h-6"></i>
          </div>
          <h3 class="text-sm font-bold text-slate-900 mb-1">No items matched your search criteria</h3>
          <p class="text-xs text-slate-500 mb-4 max-w-sm mx-auto">Try broadening your radius slider, resetting filters, or use Smart Match to find alternative options.</p>
          <button onclick="app.resetExploreFilters()" class="text-xs font-semibold px-4 py-2 rounded-xl bg-slate-900 text-white">Reset Filters</button>
        </div>
      `;
      lucide.createIcons();
    } else {
      gridContainer.innerHTML = listings.map(item => renderListingCardHtml(item)).join('');
      lucide.createIcons();
    }

    // Update map
    if (currentExploreFilters.viewMode === 'map') {
      if (!exploreMapInstance) {
        initExploreMap('explore-leaflet-map');
      }
      setTimeout(() => {
        exploreMapInstance.invalidateSize();
        updateMapListings(listings);
      }, 100);
    }
  } catch (err) {
    gridContainer.innerHTML = `<div class="col-span-3 text-center py-12 text-rose-500 text-xs">Error loading listings: ${err.message}</div>`;
  }
}
