let currentDashboardTab = 'overview';

async function renderDashboardView(tab = 'overview') {
  currentDashboardTab = tab;
  const root = document.getElementById('app-root');
  const user = api.getCurrentUser();

  if (!user) {
    root.innerHTML = `
      <div class="max-w-md mx-auto my-16 p-8 bg-white rounded-3xl border border-slate-200 text-center shadow-sm">
        <h2 class="text-xl font-bold text-slate-900 mb-2">Sign In Required</h2>
        <p class="text-xs text-slate-600 mb-6">Please log in to access your listings, rentals, and transaction ledger.</p>
        <button onclick="app.openAuthModal('login')" class="w-full py-2.5 rounded-xl bg-brand-600 text-white font-bold text-xs">Log In</button>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  root.innerHTML = `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      <!-- User Profile Header Banner -->
      <div class="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm mb-8 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div class="flex items-center gap-4">
          <img src="${user.profile_photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}" class="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-500 shadow-sm" />
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-xl font-black text-slate-900">${user.full_name}</h1>
              <span class="text-xs font-bold px-2 py-0.5 rounded-md ${user.role === 'ADMIN' ? 'bg-amber-100 text-amber-800' : 'bg-brand-100 text-brand-800'}">
                ${user.role}
              </span>
            </div>
            <p class="text-xs text-slate-500 mt-0.5">${user.email} • ${user.mobile}</p>
            <div class="flex items-center gap-2 mt-2">
              <span class="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                <i data-lucide="shield-check" class="w-3.5 h-3.5"></i> Mobile OTP Verified
              </span>
              <span class="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                <i data-lucide="map-pin" class="w-3.5 h-3.5 text-slate-400"></i> ${user.location_name || 'City Center'}
              </span>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <a href="#post-item" class="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-sm shadow-brand-600/30 flex items-center gap-1.5 transition">
            <i data-lucide="plus-circle" class="w-4 h-4"></i>
            <span>Post New Item</span>
          </a>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="border-b border-slate-200 mb-8 overflow-x-auto scrollbar-none flex items-center gap-2 text-xs font-semibold text-slate-600">
        ${renderDashTabButton('overview', 'layout-dashboard', 'Overview')}
        ${renderDashTabButton('listings', 'package', 'My Listings')}
        ${renderDashTabButton('requests', 'inbox', 'Rental Requests')}
        ${renderDashTabButton('active-rentals', 'shopping-bag', 'Active Rentals (Borrowed)')}
        ${renderDashTabButton('lending', 'share-2', 'Items I\'m Lending')}
        ${renderDashTabButton('history', 'receipt', 'Financial Ledger')}
        ${renderDashTabButton('saved', 'bookmark', 'Saved Items')}
        ${renderDashTabButton('notifications', 'bell', 'Notifications')}
      </div>

      <!-- Tab Content Area -->
      <div id="dash-tab-content">
        <!-- Rendered dynamically below -->
      </div>

    </div>
  `;

  lucide.createIcons();

  // Load Tab Content
  await switchDashboardTab(currentDashboardTab);
}

function renderDashTabButton(tabId, icon, label) {
  const isActive = currentDashboardTab === tabId;
  return `
    <button 
      onclick="app.switchDashTab('${tabId}')" 
      class="shrink-0 px-4 py-3 border-b-2 flex items-center gap-2 transition ${isActive ? 'tab-active' : 'border-transparent hover:text-slate-900 hover:border-slate-300'}"
    >
      <i data-lucide="${icon}" class="w-4 h-4"></i>
      <span>${label}</span>
    </button>
  `;
}

async function switchDashboardTab(tabId) {
  currentDashboardTab = tabId;
  const container = document.getElementById('dash-tab-content');
  if (!container) return;

  container.innerHTML = `<div class="p-12 text-center text-xs text-slate-400">Loading tab data...</div>`;

  try {
    if (tabId === 'overview') {
      await renderDashOverviewTab(container);
    } else if (tabId === 'listings') {
      await renderDashListingsTab(container);
    } else if (tabId === 'requests') {
      await renderDashRequestsTab(container);
    } else if (tabId === 'active-rentals') {
      await renderDashActiveRentalsTab(container);
    } else if (tabId === 'lending') {
      await renderDashLendingTab(container);
    } else if (tabId === 'history') {
      await renderDashHistoryTab(container);
    } else if (tabId === 'saved') {
      await renderDashSavedTab(container);
    } else if (tabId === 'notifications') {
      await renderDashNotificationsTab(container);
    }
    lucide.createIcons();
  } catch (err) {
    container.innerHTML = `<div class="p-8 text-center text-xs text-rose-500">Error: ${err.message}</div>`;
  }
}

// 1. Overview Tab
async function renderDashOverviewTab(container) {
  const me = await api.getMe();
  const txs = await api.getTransactions();
  const myListings = await api.getMyListings();
  const incoming = await api.getIncomingRequests();

  const activeBorrowings = txs.filter(t => t.borrower_id === me.id && t.status === 'ACTIVE').length;
  const activeLendings = txs.filter(t => t.owner_id === me.id && t.status === 'ACTIVE').length;
  const pendingIncoming = incoming.filter(r => r.status === 'PENDING').length;

  container.innerHTML = `
    <div class="space-y-8">
      <!-- 4 Metric Cards -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
        <div class="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
          <span class="text-3xl font-black text-slate-900 block mb-1">${myListings.length}</span>
          <span class="text-xs font-semibold text-slate-500">My Listings</span>
        </div>
        <div class="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
          <span class="text-3xl font-black text-blue-600 block mb-1">${activeBorrowings}</span>
          <span class="text-xs font-semibold text-slate-500">Active Borrowings</span>
        </div>
        <div class="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
          <span class="text-3xl font-black text-emerald-600 block mb-1">${activeLendings}</span>
          <span class="text-xs font-semibold text-slate-500">Items Out on Loan</span>
        </div>
        <div class="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
          <span class="text-3xl font-black text-amber-600 block mb-1">${pendingIncoming}</span>
          <span class="text-xs font-semibold text-slate-500">Pending Requests</span>
        </div>
      </div>

      <!-- Quick Actions & Recent Activity -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
          <h3 class="text-sm font-bold text-slate-900 flex items-center gap-2">
            <i data-lucide="bell" class="w-4 h-4 text-emerald-600"></i>
            <span>Action Required</span>
          </h3>
          ${pendingIncoming > 0 ? `
            <div class="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
              <div>
                <strong>${pendingIncoming} new rental request(s)</strong> awaiting your acceptance.
              </div>
              <button onclick="app.switchDashTab('requests')" class="px-3 py-1.5 bg-amber-700 text-white rounded-xl font-bold">Review →</button>
            </div>
          ` : `
            <p class="text-xs text-slate-500 py-4 text-center">No pending actions required right now.</p>
          `}
        </div>

        <div class="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
          <h3 class="text-sm font-bold text-slate-900 flex items-center gap-2">
            <i data-lucide="shield-check" class="w-4 h-4 text-emerald-600"></i>
            <span>Trust & Verification Status</span>
          </h3>
          <div class="text-xs space-y-2 text-slate-600">
            <div class="flex items-center justify-between py-1 border-b border-slate-100">
              <span>Mobile OTP Verification</span>
              <span class="text-emerald-700 font-bold">✓ Verified</span>
            </div>
            <div class="flex items-center justify-between py-1 border-b border-slate-100">
              <span>Completed Community Exchanges</span>
              <span class="font-bold text-slate-900">${me.completed_exchanges || 0}</span>
            </div>
            <div class="flex items-center justify-between py-1">
              <span>Average User Rating</span>
              <span class="text-amber-500 font-bold">★ ${me.average_rating || 5.0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// 2. My Listings Tab (Pending, Approved, Rejected)
async function renderDashListingsTab(container) {
  const listings = await api.getMyListings();

  if (listings.length === 0) {
    container.innerHTML = `
      <div class="bg-white p-12 rounded-3xl border border-slate-200 text-center">
        <i data-lucide="package" class="w-10 h-10 text-slate-300 mx-auto mb-3"></i>
        <h3 class="text-sm font-bold text-slate-900 mb-1">You haven't posted any items yet</h3>
        <p class="text-xs text-slate-500 mb-4">Post items to start lending or sharing within your neighborhood.</p>
        <a href="#post-item" class="inline-block px-4 py-2 bg-brand-600 text-white font-bold text-xs rounded-xl">Post an Item</a>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="space-y-4">
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs text-slate-500 font-semibold">${listings.length} item(s) in your portfolio</span>
        <a href="#post-item" class="text-xs font-bold text-brand-600 hover:text-brand-800">+ Add New Item</a>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        ${listings.map(item => `
          <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex gap-4">
            <img src="${item.primary_image || 'https://images.unsplash.com/photo-1581291518655-9523c932deb4?w=200'}" class="w-24 h-24 rounded-xl object-cover shrink-0" />
            <div class="flex-1 min-w-0 flex flex-col justify-between">
              <div>
                <div class="flex items-center gap-1.5 mb-1">
                  <span class="text-[10px] font-black px-2 py-0.5 rounded-full ${getItemStatusBadge(item.status)}">
                    ${item.status}
                  </span>
                  <span class="text-[11px] text-slate-400 font-medium truncate">${item.category_name}</span>
                </div>
                <h4 class="font-bold text-sm text-slate-900 truncate">${item.title}</h4>
                <p class="text-xs text-slate-500 font-semibold mt-0.5">
                  ${item.is_borrow_free ? 'Free Borrow' : '$' + item.rent_price_per_day + '/day'}
                </p>

                ${item.status === 'PENDING' ? `
                  <p class="text-[11px] text-amber-700 mt-1 font-medium">
                    ⏳ Awaiting Admin Review. Hidden from public until approved.
                  </p>
                ` : ''}

                ${item.status === 'REJECTED' ? `
                  <p class="text-[11px] text-rose-700 mt-1 font-medium">
                    ❌ Rejected by Admin: ${item.reject_reason || 'Incomplete details'}. Notes: ${item.reject_notes || ''}
                  </p>
                ` : ''}
              </div>

              <div class="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span class="text-[11px] text-slate-400">${item.pending_requests_count || 0} pending request(s)</span>
                <a href="#listing/${item.id}" class="text-xs font-semibold text-emerald-700 hover:text-emerald-900">View Page →</a>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function getItemStatusBadge(status) {
  if (status === 'APPROVED') return 'bg-emerald-100 text-emerald-800';
  if (status === 'PENDING') return 'bg-amber-100 text-amber-800 animate-pulse';
  if (status === 'REJECTED') return 'bg-rose-100 text-rose-800';
  return 'bg-slate-100 text-slate-700';
}

// 3. Rental Requests Tab (Incoming)
async function renderDashRequestsTab(container) {
  const incoming = await api.getIncomingRequests();

  if (incoming.length === 0) {
    container.innerHTML = `<div class="bg-white p-12 rounded-3xl border border-slate-200 text-center text-xs text-slate-400">No incoming rental requests at this moment.</div>`;
    return;
  }

  container.innerHTML = `
    <div class="space-y-4">
      ${incoming.map(req => `
        <div class="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div class="flex items-center gap-4">
            <img src="${req.listing_image || 'https://images.unsplash.com/photo-1581291518655-9523c932deb4?w=200'}" class="w-16 h-16 rounded-2xl object-cover shrink-0" />
            <div>
              <div class="flex items-center gap-2 mb-1">
                <span class="text-xs font-bold text-slate-900">${req.listing_title}</span>
                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${req.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-800' : (req.status === 'REJECTED' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800')}">
                  ${req.status}
                </span>
              </div>
              <p class="text-xs text-slate-600">
                Requested by <strong>${req.borrower_name}</strong> for ${req.total_days} day(s) (${req.start_date} to ${req.end_date})
              </p>
              <p class="text-[11px] text-slate-500 mt-1 italic">"${req.message || 'No message provided'}"</p>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <div class="text-right text-xs pr-2">
              <span class="text-slate-400 block text-[10px]">Total Rent</span>
              <span class="font-bold text-slate-900">$${req.total_rent} (+$${req.security_deposit} deposit)</span>
            </div>

            ${req.status === 'PENDING' ? `
              <button onclick="app.handleOwnerAcceptRequest('${req.id}')" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-sm">
                Accept
              </button>
              <button onclick="app.handleOwnerRejectRequest('${req.id}')" class="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs border border-slate-300">
                Reject
              </button>
            ` : (req.transaction_id ? `
              <a href="#transaction/${req.transaction_id}" class="px-4 py-2 bg-slate-900 text-white rounded-xl font-bold text-xs">
                View Transaction →
              </a>
            ` : '')}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// 4. Active Rentals (Borrowed items)
async function renderDashActiveRentalsTab(container) {
  const txs = await api.getTransactions('borrower');
  const activeOnly = txs.filter(t => ['PAID', 'HANDOVER_PENDING', 'ACTIVE', 'RETURN_PENDING', 'DISPUTED'].includes(t.status));

  if (activeOnly.length === 0) {
    container.innerHTML = `<div class="bg-white p-12 rounded-3xl border border-slate-200 text-center text-xs text-slate-400">You have no active borrowed items currently.</div>`;
    return;
  }

  container.innerHTML = `
    <div class="space-y-4">
      ${activeOnly.map(t => `
        <div class="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div class="flex items-center gap-4">
            <img src="${t.primary_image || 'https://images.unsplash.com/photo-1581291518655-9523c932deb4?w=200'}" class="w-16 h-16 rounded-2xl object-cover shrink-0" />
            <div>
              <div class="flex items-center gap-2 mb-1">
                <span class="text-xs font-bold text-slate-900">${t.listing_title}</span>
                <span class="text-[10px] font-black px-2 py-0.5 rounded-full ${getStatusBadgeClass(t.status)}">
                  ${t.status.replace(/_/g, ' ')}
                </span>
              </div>
              <p class="text-xs text-slate-600">Lender: <strong>${t.owner_name}</strong> • Due: <strong>${t.due_date}</strong></p>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <a href="#transaction/${t.id}" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-sm">
              Manage & View OTP →
            </a>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// 5. Items I'm Lending
async function renderDashLendingTab(container) {
  const txs = await api.getTransactions('owner');
  const activeLending = txs.filter(t => ['PAYMENT_PENDING', 'PAID', 'HANDOVER_PENDING', 'ACTIVE', 'RETURN_PENDING', 'DISPUTED'].includes(t.status));

  if (activeLending.length === 0) {
    container.innerHTML = `<div class="bg-white p-12 rounded-3xl border border-slate-200 text-center text-xs text-slate-400">No items currently out on loan.</div>`;
    return;
  }

  container.innerHTML = `
    <div class="space-y-4">
      ${activeLending.map(t => `
        <div class="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div class="flex items-center gap-4">
            <img src="${t.primary_image || 'https://images.unsplash.com/photo-1581291518655-9523c932deb4?w=200'}" class="w-16 h-16 rounded-2xl object-cover shrink-0" />
            <div>
              <div class="flex items-center gap-2 mb-1">
                <span class="text-xs font-bold text-slate-900">${t.listing_title}</span>
                <span class="text-[10px] font-black px-2 py-0.5 rounded-full ${getStatusBadgeClass(t.status)}">
                  ${t.status.replace(/_/g, ' ')}
                </span>
              </div>
              <p class="text-xs text-slate-600">Borrower: <strong>${t.borrower_name}</strong> • Return Due: <strong>${t.due_date}</strong></p>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <a href="#transaction/${t.id}" class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs shadow-sm">
              Manage Handover / Return →
            </a>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// 6. Financial Ledger Tab
async function renderDashHistoryTab(container) {
  const txs = await api.getTransactions();

  if (txs.length === 0) {
    container.innerHTML = `<div class="bg-white p-12 rounded-3xl border border-slate-200 text-center text-xs text-slate-400">No transaction records found.</div>`;
    return;
  }

  container.innerHTML = `
    <div class="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
      <div class="p-4 border-b border-slate-100 flex items-center justify-between">
        <h3 class="text-xs font-bold text-slate-900 uppercase tracking-wider">Itemized Transactions & Escrow Ledger</h3>
        <span class="text-xs text-slate-500">${txs.length} total transaction(s)</span>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-50 border-b border-slate-100 text-slate-500">
            <tr>
              <th class="p-3">Transaction</th>
              <th class="p-3">Item</th>
              <th class="p-3">Counterparty</th>
              <th class="p-3">Rental Fee</th>
              <th class="p-3">Escrow Deposit</th>
              <th class="p-3">Status</th>
              <th class="p-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 text-slate-700">
            ${txs.map(t => `
              <tr class="hover:bg-slate-50/50">
                <td class="p-3 font-mono text-[11px]">#${t.id.slice(-8)}</td>
                <td class="p-3 font-semibold text-slate-900">${t.listing_title}</td>
                <td class="p-3">${t.borrower_name || t.owner_name}</td>
                <td class="p-3 font-semibold">$${t.total_rent}</td>
                <td class="p-3">
                  <span class="font-semibold">$${t.deposit_amount}</span>
                  <span class="text-[10px] text-slate-400 block">${t.deposit_status}</span>
                </td>
                <td class="p-3">
                  <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${getStatusBadgeClass(t.status)}">
                    ${t.status}
                  </span>
                </td>
                <td class="p-3 text-right">
                  <a href="#transaction/${t.id}" class="text-xs font-bold text-emerald-700 hover:text-emerald-900">View →</a>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// 7. Saved Items Tab
async function renderDashSavedTab(container) {
  const saved = await api.getSavedItems();

  if (saved.length === 0) {
    container.innerHTML = `<div class="bg-white p-12 rounded-3xl border border-slate-200 text-center text-xs text-slate-400">Your wishlist is currently empty. Bookmark items while browsing!</div>`;
    return;
  }

  container.innerHTML = `
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      ${saved.map(item => renderListingCardHtml(item)).join('')}
    </div>
  `;
}

// 8. Notifications Tab
async function renderDashNotificationsTab(container) {
  const res = await api.getNotifications();
  const list = res.notifications || [];

  if (list.length === 0) {
    container.innerHTML = `<div class="bg-white p-12 rounded-3xl border border-slate-200 text-center text-xs text-slate-400">No notifications yet.</div>`;
    return;
  }

  container.innerHTML = `
    <div class="bg-white rounded-3xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
      ${list.map(n => `
        <div class="p-4 flex items-start justify-between gap-4 ${n.is_read ? 'bg-white' : 'bg-emerald-50/40'}">
          <div class="flex items-start gap-3">
            <div class="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 mt-0.5">
              <i data-lucide="bell" class="w-4 h-4"></i>
            </div>
            <div>
              <h4 class="font-bold text-xs text-slate-900">${n.title}</h4>
              <p class="text-xs text-slate-600 mt-0.5">${n.message}</p>
              <span class="text-[10px] text-slate-400 mt-1 block">${new Date(n.created_at).toLocaleString()}</span>
            </div>
          </div>
          ${n.link ? `
            <a href="${n.link}" class="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shrink-0">
              View
            </a>
          ` : ''}
        </div>
      `).join('')}
    </div>
  `;
}
