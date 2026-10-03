let currentAdminTab = 'moderation';

async function renderAdminDashboardView(tab = 'moderation') {
  currentAdminTab = tab;
  const root = document.getElementById('app-root');
  const user = api.getCurrentUser();

  if (!user || user.role !== 'ADMIN') {
    root.innerHTML = `
      <div class="max-w-md mx-auto my-20 p-8 bg-white rounded-3xl border border-rose-200 text-center shadow-sm">
        <div class="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
          <i data-lucide="shield-alert" class="w-6 h-6"></i>
        </div>
        <h2 class="text-xl font-bold text-slate-900 mb-2">Administrative Privileges Required</h2>
        <p class="text-xs text-slate-600 mb-6">
          This portal is restricted to authorized platform administrators for moderation, dispute arbitration, and user safety governance.
        </p>
        <button onclick="app.openAdminLoginModal()" class="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md">
          Log In as Administrator
        </button>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  root.innerHTML = `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      <!-- Admin Top Banner -->
      <div class="bg-slate-900 text-white p-6 rounded-3xl shadow-lg mb-8 flex flex-col md:flex-row items-center justify-between gap-6 border border-slate-800">
        <div class="flex items-center gap-4">
          <div class="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
            <i data-lucide="shield" class="w-7 h-7"></i>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-2xl font-black tracking-tight">Admin Moderation & Governance Desk</h1>
              <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500 text-slate-950 uppercase">RBAC Tier 1</span>
            </div>
            <p class="text-xs text-slate-400 mt-1">
              Enforcing zero unapproved listings, impartial dispute arbitration, and community safety protocols.
            </p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <button onclick="app.showImpactMethodology()" class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-emerald-400 border border-slate-700 flex items-center gap-1.5">
            <i data-lucide="leaf" class="w-4 h-4"></i>
            <span>Reuse Impact Data</span>
          </button>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="border-b border-slate-200 mb-8 overflow-x-auto scrollbar-none flex items-center gap-2 text-xs font-semibold text-slate-600">
        ${renderAdminTabButton('moderation', 'check-square', 'Listing Moderation Queue')}
        ${renderAdminTabButton('disputes', 'alert-octagon', 'Disputes & Damage Arbitration')}
        ${renderAdminTabButton('reports', 'flag', 'Reported Listings')}
        ${renderAdminTabButton('users', 'users', 'User Governance')}
        ${renderAdminTabButton('overview', 'pie-chart', 'System Analytics')}
      </div>

      <!-- Tab Content Area -->
      <div id="admin-tab-content">
        <!-- Loaded dynamically below -->
      </div>

    </div>
  `;

  lucide.createIcons();
  await switchAdminTab(currentAdminTab);
}

function renderAdminTabButton(tabId, icon, label) {
  const isActive = currentAdminTab === tabId;
  return `
    <button 
      onclick="app.switchAdminTab('${tabId}')" 
      class="shrink-0 px-4 py-3 border-b-2 flex items-center gap-2 transition ${isActive ? 'border-amber-500 text-amber-700 font-bold' : 'border-transparent hover:text-slate-900 hover:border-slate-300'}"
    >
      <i data-lucide="${icon}" class="w-4 h-4"></i>
      <span>${label}</span>
    </button>
  `;
}

async function switchAdminTab(tabId) {
  currentAdminTab = tabId;
  const container = document.getElementById('admin-tab-content');
  if (!container) return;

  container.innerHTML = `<div class="p-12 text-center text-xs text-slate-400">Loading admin desk data...</div>`;

  try {
    if (tabId === 'moderation') {
      await renderAdminModerationTab(container);
    } else if (tabId === 'disputes') {
      await renderAdminDisputesTab(container);
    } else if (tabId === 'reports') {
      await renderAdminReportsTab(container);
    } else if (tabId === 'users') {
      await renderAdminUsersTab(container);
    } else if (tabId === 'overview') {
      await renderAdminOverviewTab(container);
    }
    lucide.createIcons();
  } catch (err) {
    container.innerHTML = `<div class="p-8 text-center text-xs text-rose-500">Error: ${err.message}</div>`;
  }
}

// 1. Listing Moderation Queue
async function renderAdminModerationTab(container) {
  const queue = await api.getAdminModerationQueue();

  if (queue.length === 0) {
    container.innerHTML = `
      <div class="bg-white p-16 rounded-3xl border border-slate-200 text-center shadow-sm">
        <i data-lucide="check-circle" class="w-12 h-12 text-emerald-500 mx-auto mb-3"></i>
        <h3 class="text-base font-bold text-slate-900 mb-1">Moderation Queue is Clean!</h3>
        <p class="text-xs text-slate-500">All submitted items have been reviewed. No pending listings remain.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="space-y-4">
      <div class="flex items-center justify-between text-xs text-slate-600 mb-2 px-1">
        <span class="font-bold text-amber-700">⚠️ ${queue.length} listing(s) pending review — completely hidden from public search until approved</span>
      </div>

      <div class="space-y-6">
        ${queue.map(item => `
          <div class="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col lg:flex-row gap-6">
            <div class="lg:w-64 shrink-0">
              <img src="${item.primary_image || 'https://images.unsplash.com/photo-1581291518655-9523c932deb4?w=400'}" class="w-full h-44 object-cover rounded-2xl" />
              ${item.images && item.images.length > 1 ? `
                <div class="flex gap-1 mt-2 overflow-x-auto">
                  ${item.images.map(img => `<img src="${img}" class="w-12 h-10 object-cover rounded border border-slate-200" />`).join('')}
                </div>
              ` : ''}
            </div>

            <div class="flex-1 min-w-0 space-y-3">
              <div>
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    PENDING ADMIN REVIEW
                  </span>
                  <span class="text-xs text-slate-500 font-medium">${item.category_name}</span>
                  <span>•</span>
                  <span class="text-xs font-semibold text-slate-700">${item.condition}</span>
                </div>
                <h3 class="text-lg font-bold text-slate-900">${item.title}</h3>
                <p class="text-xs text-slate-600 mt-1 leading-relaxed">${item.description}</p>
              </div>

              <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs py-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div>
                  <span class="text-slate-400 block text-[10px]">Rental Price</span>
                  <span class="font-bold text-slate-800">${item.is_borrow_free ? 'Free Borrow' : '$' + item.rent_price_per_day + '/day'}</span>
                </div>
                <div>
                  <span class="text-slate-400 block text-[10px]">Security Deposit</span>
                  <span class="font-bold text-slate-800">$${item.security_deposit}</span>
                </div>
                <div>
                  <span class="text-slate-400 block text-[10px]">Lister (Lender) Name</span>
                  <span class="font-bold text-slate-800">${item.owner_name}</span>
                </div>
                <div>
                  <span class="text-slate-400 block text-[10px]">Pickup Location</span>
                  <span class="font-bold text-slate-800">${item.location_name}</span>
                </div>
              </div>

              <!-- Unmasked address viewable by Admin -->
              <div class="p-3 bg-slate-100 rounded-xl text-[11px] text-slate-600">
                <strong>Exact Address:</strong> ${item.exact_address} • <strong>Instructions:</strong> ${item.pickup_instructions}
              </div>

              <!-- Moderation Action Buttons -->
              <div class="pt-3 border-t border-slate-100 flex items-center gap-3">
                <button 
                  onclick="app.handleAdminApproveListing('${item.id}')"
                  class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md transition flex items-center gap-1.5"
                >
                  <i data-lucide="check" class="w-4 h-4"></i>
                  <span>Approve & Make Public</span>
                </button>

                <button 
                  onclick="app.openRejectListingModal('${item.id}')"
                  class="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-bold text-xs border border-rose-200 transition flex items-center gap-1.5"
                >
                  <i data-lucide="x" class="w-4 h-4"></i>
                  <span>Reject Listing...</span>
                </button>
              </div>

            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// 2. Disputes & Damage Arbitration Tab
async function renderAdminDisputesTab(container) {
  const disputes = await api.getAdminDisputes();

  if (disputes.length === 0) {
    container.innerHTML = `<div class="bg-white p-16 rounded-3xl border border-slate-200 text-center text-xs text-slate-400">No active disputes requiring arbitration. All escrows balanced.</div>`;
    return;
  }

  container.innerHTML = `
    <div class="space-y-6">
      <div class="flex items-center justify-between text-xs text-slate-600 mb-2 px-1">
        <span class="font-bold text-amber-700">⚖️ ${disputes.length} active dispute dossier(s) awaiting administrative judgment</span>
      </div>

      <div class="space-y-6">
        ${disputes.map(d => `
          <div class="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <div>
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-xs font-bold text-rose-600">DAMAGE CLAIM</span>
                  <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${d.admin_resolution === 'PENDING' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-800'}">
                    Resolution: ${d.admin_resolution}
                  </span>
                </div>
                <h3 class="text-base font-bold text-slate-900">${d.listing_title}</h3>
              </div>

              <div class="text-right text-xs">
                <span class="text-slate-400 block text-[10px]">Held Escrow Deposit</span>
                <span class="text-base font-black text-emerald-700">$${d.deposit_amount}</span>
              </div>
            </div>

            <!-- Owner Claim vs Borrower Response -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              
              <!-- Lender Claim Column -->
              <div class="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-2">
                <div class="font-bold text-rose-900 flex items-center justify-between">
                  <span>Lender Claim (${d.owner_name})</span>
                  <span class="text-rose-700 font-extrabold">Claim: $${d.estimated_cost}</span>
                </div>
                <p class="text-slate-700">${d.damage_description}</p>
                ${d.damage_photos && d.damage_photos.length > 0 ? `
                  <div class="flex gap-2 pt-1">
                    ${d.damage_photos.map(p => `
                      <a href="${p}" target="_blank" class="w-16 h-12 rounded-lg overflow-hidden border border-rose-300">
                        <img src="${p}" class="w-full h-full object-cover" />
                      </a>
                    `).join('')}
                  </div>
                ` : ''}
              </div>

              <!-- Borrower Response Column -->
              <div class="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-2">
                <div class="font-bold text-blue-900 flex items-center justify-between">
                  <span>Borrower Response (${d.borrower_name})</span>
                  <span class="font-bold px-2 py-0.5 rounded text-[10px] ${d.borrower_response === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
                    ${d.borrower_response}
                  </span>
                </div>
                <p class="text-slate-700">${d.borrower_notes || 'Awaiting formal counter-statement from borrower...'}</p>
              </div>

            </div>

            <!-- Before & After Condition Evidence Side-by-Side -->
            <div>
              <h4 class="text-xs font-bold text-slate-800 mb-2">Immutable Condition Evidence Dossier</h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                ${d.condition_evidence && d.condition_evidence.length > 0 ? d.condition_evidence.map(c => `
                  <div class="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <span class="font-bold text-[11px] ${c.stage === 'BEFORE_HANDOVER' ? 'text-blue-800' : 'text-emerald-800'}">
                      ${c.stage === 'BEFORE_HANDOVER' ? 'Pre-Handover Inspection' : 'Post-Return Inspection'}
                    </span>
                    <p class="text-slate-600">${c.condition_notes}</p>
                  </div>
                `).join('') : '<p class="text-slate-400 text-xs">No prior condition logs.</p>'}
              </div>
            </div>

            <!-- Arbitration Actions -->
            ${d.admin_resolution === 'PENDING' ? `
              <div class="pt-4 border-t border-slate-100 flex flex-wrap items-center gap-3">
                <button 
                  onclick="app.handleArbitrateDispute('${d.id}', 'RESOLVED_DEDUCTION', ${Math.min(d.estimated_cost, d.deposit_amount)})"
                  class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md"
                >
                  Resolve per Claim (Award $${Math.min(d.estimated_cost, d.deposit_amount)} to Lender, Refund Rest)
                </button>

                <button 
                  onclick="app.handleArbitrateDispute('${d.id}', 'CLOSED_DISMISSED', 0)"
                  class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-xs"
                >
                  Dismiss Claim (100% Refund to Borrower)
                </button>

                <button 
                  onclick="app.handleArbitrateDispute('${d.id}', 'REQUEST_MORE_INFO', 0)"
                  class="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs border border-slate-300"
                >
                  Request More Evidence
                </button>
              </div>
            ` : `
              <div class="p-3 bg-slate-50 rounded-xl text-xs text-slate-500">
                <strong>Final Admin Resolution:</strong> ${d.admin_resolution} • Notes: ${d.admin_notes || 'Closed'}
              </div>
            `}

          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// 3. Reported Listings Tab
async function renderAdminReportsTab(container) {
  const reports = await api.getAdminReports();

  if (reports.length === 0) {
    container.innerHTML = `<div class="bg-white p-16 rounded-3xl border border-slate-200 text-center text-xs text-slate-400">Zero active reports from community members.</div>`;
    return;
  }

  container.innerHTML = `
    <div class="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      <div class="p-4 border-b border-slate-100 flex items-center justify-between">
        <h3 class="text-xs font-bold text-slate-900 uppercase">Community Safety Reports Queue</h3>
        <span class="text-xs text-slate-500">${reports.length} report(s)</span>
      </div>
      <div class="divide-y divide-slate-100 text-xs">
        ${reports.map(r => `
          <div class="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800 uppercase">
                  ${r.reason}
                </span>
                <span class="font-bold text-slate-900">${r.listing_title}</span>
              </div>
              <p class="text-xs text-slate-600 mt-1">${r.details || 'No detailed message.'}</p>
              <span class="text-[10px] text-slate-400 mt-1 block">Reported by: ${r.reporter_name}</span>
            </div>

            <div class="flex items-center gap-2">
              <button onclick="app.handleAdminReportAction('${r.id}', 'KEEP_ACTIVE')" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold">
                Keep Active
              </button>
              <button onclick="app.handleAdminReportAction('${r.id}', 'HIDE')" class="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold">
                Temporarily Hide
              </button>
              <button onclick="app.handleAdminReportAction('${r.id}', 'REMOVE')" class="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold">
                Remove Listing
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// 4. User Governance Tab
async function renderAdminUsersTab(container) {
  const users = await api.getAdminUsers();

  container.innerHTML = `
    <div class="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      <div class="p-4 border-b border-slate-100 flex items-center justify-between">
        <h3 class="text-xs font-bold text-slate-900 uppercase">Registered Platform Users</h3>
        <span class="text-xs text-slate-500">${users.length} total user accounts</span>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-50 border-b border-slate-100 text-slate-500">
            <tr>
              <th class="p-3">User</th>
              <th class="p-3">Mobile & Email</th>
              <th class="p-3">Role</th>
              <th class="p-3">Listings</th>
              <th class="p-3">Exchanges</th>
              <th class="p-3">Status</th>
              <th class="p-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 text-slate-700">
            ${users.map(u => `
              <tr class="hover:bg-slate-50/50">
                <td class="p-3 font-semibold text-slate-900">${u.full_name}</td>
                <td class="p-3">
                  <div>${u.email}</div>
                  <div class="text-slate-400 font-mono text-[10px]">${u.mobile}</div>
                </td>
                <td class="p-3">
                  <span class="text-[10px] font-bold px-2 py-0.5 rounded ${u.role === 'ADMIN' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'}">
                    ${u.role}
                  </span>
                </td>
                <td class="p-3">${u.listing_count}</td>
                <td class="p-3 font-semibold text-emerald-700">${u.completed_exchanges}</td>
                <td class="p-3">
                  <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${u.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}">
                    ${u.is_active ? 'Active' : 'Banned'}
                  </span>
                </td>
                <td class="p-3 text-right">
                  ${u.role !== 'ADMIN' ? `
                    <button onclick="app.handleToggleUserStatus('${u.id}')" class="text-xs font-semibold ${u.is_active ? 'text-rose-600 hover:text-rose-800' : 'text-emerald-600 hover:text-emerald-800'}">
                      ${u.is_active ? 'Deactivate / Ban' : 'Reactivate'}
                    </button>
                  ` : '<span class="text-slate-300">Protected</span>'}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// 5. System Analytics Overview Tab
async function renderAdminOverviewTab(container) {
  const data = await api.getAdminOverview();
  const s = data.stats;
  const imp = data.impact;

  container.innerHTML = `
    <div class="space-y-8">
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
        <div class="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
          <span class="text-3xl font-black text-slate-900 block mb-1">${s.totalUsers}</span>
          <span class="text-xs font-semibold text-slate-500">Registered Users</span>
        </div>
        <div class="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
          <span class="text-3xl font-black text-emerald-600 block mb-1">${s.approvedListings}</span>
          <span class="text-xs font-semibold text-slate-500">Approved Public Items</span>
        </div>
        <div class="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
          <span class="text-3xl font-black text-blue-600 block mb-1">${s.activeRentals}</span>
          <span class="text-xs font-semibold text-slate-500">Active Rentals</span>
        </div>
        <div class="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
          <span class="text-3xl font-black text-amber-600 block mb-1">$${s.totalEscrowHeld}</span>
          <span class="text-xs font-semibold text-slate-500">Total Escrow Held</span>
        </div>
      </div>

      <!-- Category Breakdown of Reuse Impact -->
      <div class="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <h3 class="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
          <i data-lucide="leaf" class="w-4 h-4 text-emerald-600"></i>
          <span>Life Cycle Assessment (LCA) Impact Breakdown</span>
        </h3>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 border-b border-slate-100 text-slate-500">
              <tr>
                <th class="p-3">Category</th>
                <th class="p-3">Completed Rentals</th>
                <th class="p-3">Embodied CO2 Avoided</th>
                <th class="p-3">Landfill Waste Diverted</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 text-slate-700">
              ${imp.categoryBreakdown.map(c => `
                <tr>
                  <td class="p-3 font-semibold text-slate-900">${c.name}</td>
                  <td class="p-3 font-bold">${c.completed_count || 0}</td>
                  <td class="p-3 text-emerald-700 font-bold">${((c.completed_count || 0) * c.avg_co2_saved_kg).toFixed(1)} kg CO2e</td>
                  <td class="p-3 text-blue-700 font-bold">${((c.completed_count || 0) * c.avg_waste_diverted_kg).toFixed(1)} kg</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}
