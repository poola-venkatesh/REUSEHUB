function renderNavbar() {
  const user = api.getCurrentUser();
  const container = document.getElementById('navbar-container');

  const unreadCount = app.state.unreadNotificationsCount || 0;

  container.innerHTML = `
    <!-- Main Navigation Bar -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center h-16">
        <!-- Logo -->
        <a href="#home" class="flex items-center gap-2.5">
          <img src="/images/logo.png" alt="REUSEHUB Logo" class="w-10 h-10 rounded-xl object-contain bg-white shadow-sm border border-emerald-500/20" />
          <div class="flex flex-col">
            <span class="text-lg font-black tracking-tight text-slate-900 leading-none">REUSEHUB</span>
            <span class="text-[10px] font-medium text-brand-600 tracking-wider uppercase">Rent, Borrow & Reuse</span>
          </div>
        </a>

        <!-- Desktop Navigation Links -->
        <nav class="hidden md:flex items-center gap-1 sm:gap-2">
          <a href="#explore" class="px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:text-brand-600 hover:bg-slate-100 transition flex items-center gap-1.5">
            <i data-lucide="compass" class="w-4 h-4"></i>
            <span>Browse Items</span>
          </a>

          <button onclick="app.openSmartMatchModal()" class="px-3 py-2 rounded-lg text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition flex items-center gap-1.5 border border-emerald-200">
            <i data-lucide="sparkles" class="w-4 h-4 text-emerald-600"></i>
            <span>Smart Match</span>
          </button>

          <button onclick="app.showImpactMethodology()" class="px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:text-brand-600 hover:bg-slate-100 transition flex items-center gap-1.5">
            <i data-lucide="leaf" class="w-4 h-4 text-emerald-600"></i>
            <span>Reuse Impact</span>
          </button>

          <button onclick="app.triggerPwaInstall()" id="nav-install-btn" class="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 transition flex items-center gap-1.5 border border-emerald-300 shadow-sm" title="Install REUSEHUB as desktop or mobile app">
            <i data-lucide="download" class="w-3.5 h-3.5 text-emerald-700"></i>
            <span>Install App</span>
          </button>

          ${user && user.role === 'ADMIN' ? `
            <a href="#admin" class="px-3 py-2 rounded-lg text-sm font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 transition flex items-center gap-1.5 border border-amber-300">
              <i data-lucide="shield-check" class="w-4 h-4 text-amber-600"></i>
              <span>Admin Portal</span>
            </a>
          ` : ''}
        </nav>

        <!-- Right Action Items -->
        <div class="flex items-center gap-3">
          <!-- Post Item Button -->
          <a href="#post-item" class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 shadow-sm shadow-brand-600/30 transition transform active:scale-95">
            <i data-lucide="plus-circle" class="w-4 h-4"></i>
            <span class="hidden sm:inline">Post Item</span>
          </a>

          ${user ? `
            <!-- Notifications Dropdown Trigger -->
            <div class="relative">
              <button onclick="app.toggleNotificationsDropdown()" class="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition">
                <i data-lucide="bell" class="w-5 h-5"></i>
                ${unreadCount > 0 ? `
                  <span class="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-bounce">
                    ${unreadCount}
                  </span>
                ` : ''}
              </button>

              <!-- Notifications Dropdown Menu -->
              <div id="notifications-dropdown" class="hidden absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50">
                <div class="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="font-semibold text-sm text-slate-800">Notifications</span>
                    ${unreadCount > 0 ? `<span class="bg-brand-100 text-brand-800 text-[11px] font-bold px-2 py-0.5 rounded-full">${unreadCount} new</span>` : ''}
                  </div>
                  <button onclick="app.markAllNotificationsRead()" class="text-xs text-brand-600 hover:text-brand-800 font-medium">Mark all read</button>
                </div>
                <div id="notifications-list" class="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  <div class="p-4 text-center text-xs text-slate-400">Loading notifications...</div>
                </div>
                <div class="p-2 border-t border-slate-100 text-center">
                  <a href="#dashboard?tab=notifications" class="text-xs text-slate-600 hover:text-brand-600 font-medium block py-1">View all in dashboard →</a>
                </div>
              </div>
            </div>

            <!-- User Profile Dropdown -->
            <div class="relative">
              <button onclick="app.toggleUserMenu()" class="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 transition border border-slate-200">
                <img src="${user.profile_photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}" class="w-7 h-7 rounded-lg object-cover" />
                <span class="text-xs font-semibold text-slate-800 hidden sm:inline max-w-[100px] truncate">${user.full_name}</span>
                <i data-lucide="chevron-down" class="w-3.5 h-3.5 text-slate-400"></i>
              </button>

              <!-- Dropdown Menu -->
              <div id="user-dropdown" class="hidden absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50">
                <div class="px-4 py-2 border-b border-slate-100">
                  <p class="text-xs font-bold text-slate-900 truncate">${user.full_name}</p>
                  <p class="text-[11px] text-slate-500 truncate">${user.email}</p>
                  <span class="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded ${user.role === 'ADMIN' ? 'bg-amber-100 text-amber-800' : 'bg-brand-100 text-brand-800'}">
                    ${user.role}
                  </span>
                </div>
                <a href="#dashboard" class="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50">
                  <i data-lucide="layout-dashboard" class="w-4 h-4 text-slate-400"></i>
                  <span>My Dashboard</span>
                </a>
                <a href="#dashboard?tab=listings" class="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50">
                  <i data-lucide="package" class="w-4 h-4 text-slate-400"></i>
                  <span>My Listings</span>
                </a>
                <a href="#dashboard?tab=requests" class="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50">
                  <i data-lucide="inbox" class="w-4 h-4 text-slate-400"></i>
                  <span>Rental Requests</span>
                </a>
                <a href="#dashboard?tab=saved" class="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50">
                  <i data-lucide="bookmark" class="w-4 h-4 text-slate-400"></i>
                  <span>Saved Wishlist</span>
                </a>
                ${user.role === 'ADMIN' ? `
                  <a href="#admin" class="flex items-center gap-2 px-4 py-2 text-xs text-amber-700 hover:bg-amber-50 font-semibold border-t border-slate-100">
                    <i data-lucide="shield" class="w-4 h-4 text-amber-500"></i>
                    <span>Admin Control Center</span>
                  </a>
                ` : ''}
                <div class="border-t border-slate-100 mt-1 pt-1">
                  <button onclick="app.logout()" class="w-full text-left flex items-center gap-2 px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 font-medium">
                    <i data-lucide="log-out" class="w-4 h-4"></i>
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </div>
          ` : `
            <!-- Guest Login/Signup -->
            <button onclick="app.openAuthModal('login')" class="text-sm font-semibold text-slate-700 hover:text-slate-900 px-3 py-2">
              Log in
            </button>
            <button onclick="app.openAuthModal('signup')" class="text-sm font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 px-3.5 py-2 rounded-xl border border-brand-200 transition">
              Sign up
            </button>
          `}
        </div>
      </div>
    </div>
  `;

  lucide.createIcons();
}
