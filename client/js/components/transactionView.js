async function renderTransactionView(transactionId) {
  const root = document.getElementById('app-root');
  const user = api.getCurrentUser();

  if (!user) {
    root.innerHTML = `<div class="max-w-md mx-auto my-16 p-8 text-center text-xs text-slate-500">Please sign in to view transaction details.</div>`;
    return;
  }

  root.innerHTML = `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
      <div class="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
      <p class="text-xs text-slate-500">Loading transaction & security escrow status...</p>
    </div>
  `;

  try {
    const tx = await api.getTransaction(transactionId);
    const isOwner = tx.is_owner;
    const isBorrower = tx.is_borrower;
    const isOverdue = tx.is_overdue;

    root.innerHTML = `
      <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        <!-- Breadcrumbs -->
        <nav class="flex items-center gap-2 text-xs text-slate-500 mb-6">
          <a href="#dashboard" class="hover:text-slate-800">Dashboard</a>
          <span>/</span>
          <span class="text-slate-900 font-semibold truncate">Transaction #${tx.id.slice(-8)}</span>
        </nav>

        <!-- Status Tracker Banner -->
        <div class="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm mb-8">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-5">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <span class="text-xs font-bold text-slate-400">STATUS:</span>
                <span class="text-xs font-black px-2.5 py-0.5 rounded-full ${getStatusBadgeClass(tx.status)}">
                  ${tx.status.replace(/_/g, ' ')}
                </span>
                ${isOverdue ? `<span class="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-600 text-white animate-pulse">OVERDUE</span>` : ''}
              </div>
              <h1 class="text-xl sm:text-2xl font-black text-slate-900">
                ${tx.listing_title}
              </h1>
            </div>

            <!-- Transaction Context Badge -->
            <div class="text-right">
              <span class="text-[10px] font-bold text-slate-400 block uppercase">Transaction Role</span>
              <span class="text-xs font-bold px-3 py-1 rounded-xl ${isOwner ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}">
                ${isOwner ? 'Item Lister (Lender)' : 'Item Renter (Borrower)'}
              </span>
            </div>
          </div>

          <!-- Progress Stepper -->
          <div class="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
            ${renderStepItem(1, 'Accepted', ['PAYMENT_PENDING', 'PAID', 'HANDOVER_PENDING', 'ACTIVE', 'RETURN_PENDING', 'RETURNED', 'COMPLETED', 'DISPUTED'].includes(tx.status))}
            ${renderStepItem(2, 'Payment', ['PAID', 'HANDOVER_PENDING', 'ACTIVE', 'RETURN_PENDING', 'RETURNED', 'COMPLETED', 'DISPUTED'].includes(tx.status))}
            ${renderStepItem(3, 'Handover OTP', ['ACTIVE', 'RETURN_PENDING', 'RETURNED', 'COMPLETED', 'DISPUTED'].includes(tx.status))}
            ${renderStepItem(4, 'Return OTP', ['RETURNED', 'COMPLETED', 'DISPUTED'].includes(tx.status))}
            ${renderStepItem(5, 'Completed', tx.status === 'COMPLETED')}
          </div>
        </div>

        <!-- Overdue Alert if active and past due date -->
        ${isOverdue ? `
          <div class="p-4 mb-6 rounded-2xl bg-rose-50 border border-rose-300 text-rose-800 text-xs flex items-center gap-3">
            <i data-lucide="alert-triangle" class="w-5 h-5 text-rose-600 shrink-0"></i>
            <div>
              <strong class="font-bold">Rental is Overdue:</strong>
              <span>Due date was ${tx.due_date}. Please coordinate immediate return with lender to avoid deposit forfeiture.</span>
            </div>
          </div>
        ` : ''}

        <!-- Active Dispute Alert if disputed -->
        ${tx.status === 'DISPUTED' ? `
          <div class="p-5 mb-6 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs space-y-2">
            <div class="flex items-center gap-2 font-bold text-sm">
              <i data-lucide="alert-octagon" class="w-4 h-4 text-amber-600"></i>
              <span>Damage Claim Filed — Security Deposit Frozen in Escrow</span>
            </div>
            <p>
              An inspection damage claim has been logged for this exchange. The $${tx.deposit_amount} security deposit is held in escrow. Admin Arbitration Desk will review before/after condition evidence.
            </p>
            ${tx.dispute && tx.dispute.borrower_response === 'PENDING' && isBorrower ? `
              <div class="pt-2">
                <button onclick="app.openBorrowerDisputeResponseModal('${tx.dispute.id}')" class="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl font-bold">
                  Review Claim & Submit Counter-Evidence →
                </button>
              </div>
            ` : ''}
          </div>
        ` : ''}

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <!-- Left 2 Cols: Main Action Panels -->
          <div class="lg:col-span-2 space-y-6">
            
            <!-- Step Action Container based on status -->
            
            <!-- 1. PAYMENT NEEDED -->
            ${tx.status === 'PAYMENT_PENDING' ? `
              <div class="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <div class="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <i data-lucide="credit-card" class="w-5 h-5 text-emerald-600"></i>
                  <span>Checkout & Security Escrow Payment</span>
                </div>
                <p class="text-xs text-slate-600">
                  Lender has accepted your request! To unlock the exact pickup address and generate your Handover OTP, please confirm payment.
                </p>

                <div class="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2">
                  <div class="flex justify-between text-slate-600">
                    <span>Rental Amount (${tx.total_days} days)</span>
                    <span class="font-bold text-slate-800">$${tx.total_rent}</span>
                  </div>
                  <div class="flex justify-between text-slate-600">
                    <span>Security Deposit (Refundable Escrow)</span>
                    <span class="font-bold text-slate-800">$${tx.deposit_amount}</span>
                  </div>
                  <div class="pt-2 border-t border-slate-200 flex justify-between text-sm font-black text-slate-900">
                    <span>Total Amount</span>
                    <span class="text-emerald-700">$${tx.total_rent + tx.deposit_amount}</span>
                  </div>
                </div>

                ${isBorrower ? `
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <button 
                      onclick="app.handleProcessPayment('${tx.id}', 'ONLINE')"
                      class="py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-2"
                    >
                      <i data-lucide="zap" class="w-4 h-4"></i>
                      <span>Pay Online (Simulated Card / UPI)</span>
                    </button>

                    <button 
                      onclick="app.handleProcessPayment('${tx.id}', 'OFFLINE')"
                      class="py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-300 transition flex items-center justify-center gap-2"
                    >
                      <i data-lucide="handshake" class="w-4 h-4"></i>
                      <span>Pay on Handover (Direct Offline)</span>
                    </button>
                  </div>
                ` : `
                  <div class="text-center py-3 text-xs text-slate-400">
                    Awaiting borrower to complete payment...
                  </div>
                `}
              </div>
            ` : ''}

            <!-- 2. HANDOVER & DUAL OTP -->
            ${tx.status === 'HANDOVER_PENDING' || tx.status === 'PAID' ? `
              <div class="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
                <div class="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div class="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <i data-lucide="key" class="w-5 h-5 text-emerald-600"></i>
                    <span>Handover Protocol & Physical Verification</span>
                  </div>
                  <span class="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">Ready for Handover</span>
                </div>

                <!-- Unlocked exact pickup details -->
                <div class="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs">
                  <h4 class="font-bold text-emerald-900 mb-1 flex items-center gap-1.5">
                    <i data-lucide="map-pin" class="w-4 h-4 text-emerald-600"></i>
                    <span>Unlocked Exact Pickup Address:</span>
                  </h4>
                  <p class="text-slate-800 font-semibold">${tx.listing_exact_address}</p>
                  <p class="text-slate-600 mt-1"><strong>Lender Instructions:</strong> ${tx.listing_pickup_instructions}</p>
                </div>

                <!-- Pre-Handover Condition Evidence Upload -->
                <div class="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-xs font-bold text-slate-800">Pre-Handover Condition Photos</span>
                    <button onclick="app.openConditionModal('${tx.id}', 'BEFORE_HANDOVER')" class="text-xs font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1">
                      <i data-lucide="camera" class="w-3.5 h-3.5"></i>
                      <span>Upload Photos</span>
                    </button>
                  </div>
                  <p class="text-[11px] text-slate-500">
                    Both lender and borrower should record photos of the item's condition before handover to prevent disputes.
                  </p>
                </div>

                <!-- Handover OTP Box -->
                <div class="p-5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl text-white text-center">
                  <span class="text-[11px] uppercase tracking-wider text-emerald-100 font-bold block mb-1">Dual-OTP Security Handover</span>
                  
                  ${isBorrower ? `
                    <p class="text-xs text-emerald-100 mb-3">Provide this 6-digit code to the item lender at physical meetup:</p>
                    <div class="text-3xl sm:text-4xl font-mono font-black tracking-widest bg-white text-emerald-800 py-2.5 px-6 rounded-2xl shadow-inner inline-block">
                      ${tx.handover_otp}
                    </div>
                  ` : `
                    <p class="text-xs text-emerald-100 mb-3">Ask borrower for their 6-digit Handover OTP and verify here:</p>
                    <form onsubmit="app.handleVerifyHandover(event, '${tx.id}')" class="max-w-xs mx-auto flex items-center gap-2">
                      <input 
                        type="text" 
                        id="input-handover-otp"
                        maxlength="6"
                        required
                        placeholder="6-digit OTP"
                        class="w-full text-center text-xl font-mono font-bold py-2 bg-white text-slate-900 rounded-xl focus:outline-none"
                      />
                      <button type="submit" class="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shrink-0 shadow-md">
                        Verify & Handover
                      </button>
                    </form>
                  `}
                </div>
              </div>
            ` : ''}

            <!-- 3. ACTIVE RENTAL & RETURN -->
            ${tx.status === 'ACTIVE' ? `
              <div class="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
                <div class="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div class="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <i data-lucide="clock" class="w-5 h-5 text-emerald-600"></i>
                    <span>Rental in Progress (Active)</span>
                  </div>
                  <span class="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">Due: ${tx.due_date}</span>
                </div>

                <div class="grid grid-cols-2 gap-3 text-xs">
                  <div class="p-3 bg-slate-50 rounded-xl">
                    <span class="text-slate-400 block text-[10px]">Handover Timestamp</span>
                    <span class="font-bold text-slate-800">${tx.handover_at ? new Date(tx.handover_at).toLocaleString() : 'Verified'}</span>
                  </div>
                  <div class="p-3 bg-slate-50 rounded-xl">
                    <span class="text-slate-400 block text-[10px]">Security Deposit Held</span>
                    <span class="font-bold text-emerald-700">$${tx.deposit_amount} in Escrow</span>
                  </div>
                </div>

                <!-- Return OTP Verification Box -->
                <div class="p-5 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl text-white text-center">
                  <span class="text-[11px] uppercase tracking-wider text-slate-300 font-bold block mb-1">Return Verification Protocol</span>

                  ${isOwner ? `
                    <p class="text-xs text-slate-300 mb-3">Share this Return OTP with the borrower, or verify the returned item:</p>
                    <div class="text-3xl sm:text-4xl font-mono font-black tracking-widest bg-slate-800 text-emerald-400 py-2.5 px-6 rounded-2xl border border-slate-700 inline-block mb-4">
                      ${tx.return_otp}
                    </div>

                    <div class="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                      <button 
                        onclick="app.handleReturnItemPrompt('${tx.id}', false)" 
                        class="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md"
                      >
                        Item Returned Safely (Refund Deposit)
                      </button>

                      <button 
                        onclick="app.openReportDamageModal('${tx.id}')" 
                        class="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md"
                      >
                        Report Damage / Dispute
                      </button>
                    </div>
                  ` : `
                    <p class="text-xs text-slate-300 mb-3">When returning the item, ask the lender for their Return OTP:</p>
                    <div class="max-w-xs mx-auto p-3 bg-slate-800/80 rounded-xl border border-slate-700 text-xs text-slate-300">
                      Lender will inspect the item and verify return to release your $${tx.deposit_amount} security deposit.
                    </div>
                  `}
                </div>

                <!-- Post-Return Condition Evidence Upload -->
                <div class="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <div class="flex items-center justify-between mb-1">
                    <span class="text-xs font-bold text-slate-800">Return Condition Inspection</span>
                    <button onclick="app.openConditionModal('${tx.id}', 'AFTER_RETURN')" class="text-xs font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1">
                      <i data-lucide="camera" class="w-3.5 h-3.5"></i>
                      <span>Upload Return Photos</span>
                    </button>
                  </div>
                  <p class="text-[11px] text-slate-500">Record final condition at return meetup to protect against claims.</p>
                </div>
              </div>
            ` : ''}

            <!-- 4. COMPLETED & REVIEWS -->
            ${tx.status === 'COMPLETED' ? `
              <div class="bg-white p-6 rounded-3xl border border-emerald-200 shadow-sm space-y-4">
                <div class="flex items-center gap-2 text-sm font-bold text-emerald-800">
                  <i data-lucide="check-circle-2" class="w-5 h-5 text-emerald-600"></i>
                  <span>Transaction Successfully Completed!</span>
                </div>
                <p class="text-xs text-slate-600">
                  The item was safely returned and the $${tx.deposit_amount} security deposit was fully released. Thank you for contributing to community reuse!
                </p>

                ${tx.user_review ? `
                  <div class="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs">
                    <span class="font-bold text-emerald-900 block mb-1">You reviewed this exchange:</span>
                    <div class="flex items-center gap-1 text-amber-500 font-bold mb-1">
                      ${'★'.repeat(tx.user_review.rating)}${'☆'.repeat(5 - tx.user_review.rating)}
                    </div>
                    <p class="text-slate-700 italic">"${tx.user_review.review_text}"</p>
                  </div>
                ` : `
                  <div class="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs">
                    <span class="font-bold text-amber-900 block mb-2">Leave a Rating & Review for your counterparty:</span>
                    <button onclick="app.openReviewModal('${tx.id}')" class="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm">
                      Write Review (1 to 5 Stars) →
                    </button>
                  </div>
                `}
              </div>
            ` : ''}

            <!-- Condition Evidence Vault Section -->
            <div class="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <h3 class="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
                <i data-lucide="file-check" class="w-4 h-4 text-emerald-600"></i>
                <span>Condition Evidence Vault (Before & After)</span>
              </h3>

              ${tx.condition_records && tx.condition_records.length > 0 ? `
                <div class="space-y-4">
                  ${tx.condition_records.map(rec => `
                    <div class="p-4 rounded-2xl ${rec.stage === 'BEFORE_HANDOVER' ? 'bg-blue-50/50 border border-blue-200' : 'bg-emerald-50/50 border border-emerald-200'} text-xs space-y-2">
                      <div class="flex items-center justify-between font-bold">
                        <span class="${rec.stage === 'BEFORE_HANDOVER' ? 'text-blue-900' : 'text-emerald-900'}">
                          ${rec.stage === 'BEFORE_HANDOVER' ? '📸 Pre-Handover Condition Record' : '📸 Post-Return Condition Record'}
                        </span>
                        <span class="text-[10px] text-slate-400 font-normal">${new Date(rec.created_at).toLocaleString()}</span>
                      </div>
                      <p class="text-slate-700">${rec.condition_notes}</p>
                      ${rec.photos && rec.photos.length > 0 ? `
                        <div class="flex items-center gap-2 pt-1">
                          ${rec.photos.map(p => `
                            <a href="${p}" target="_blank" class="block w-16 h-12 rounded-lg overflow-hidden border border-slate-200 shadow-sm hover:opacity-80">
                              <img src="${p}" class="w-full h-full object-cover" />
                            </a>
                          `).join('')}
                        </div>
                      ` : ''}
                    </div>
                  `).join('')}
                </div>
              ` : `
                <p class="text-xs text-slate-400 text-center py-4">No condition records submitted yet.</p>
              `}
            </div>

          </div>

          <!-- Right Col: Counterparty Info & In-App Chat -->
          <div class="space-y-6">
            
            <!-- Counterparty Info Card -->
            <div class="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm text-xs">
              <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-3">
                ${isOwner ? 'Renter Contact Info' : 'Lender Contact Info'}
              </span>

              <div class="flex items-center gap-3 mb-3">
                <img 
                  src="${isOwner ? (tx.borrower_photo || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100') : (tx.owner_photo || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100')}" 
                  class="w-10 h-10 rounded-xl object-cover" 
                />
                <div>
                  <h4 class="font-bold text-slate-900">${isOwner ? tx.borrower_name : tx.owner_name}</h4>
                  <span class="text-[11px] text-emerald-700 flex items-center gap-1">
                    <i data-lucide="shield-check" class="w-3 h-3"></i> Mobile OTP Verified
                  </span>
                </div>
              </div>

              <div class="pt-3 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
                <div><strong>Rental Dates:</strong> ${tx.start_date} to ${tx.end_date} (${tx.total_days} days)</div>
                <div><strong>Due Date:</strong> ${tx.due_date}</div>
                <div><strong>Payment:</strong> ${tx.payment_method || 'PENDING'} (${tx.payment_status})</div>
              </div>
            </div>

            <!-- In-App Chat Box -->
            <div class="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-96">
              <div class="p-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <i data-lucide="message-square" class="w-4 h-4 text-emerald-600"></i>
                  <span class="text-xs font-bold text-slate-800">In-App Chat</span>
                </div>
                <span class="text-[10px] text-slate-400">Phone numbers hidden</span>
              </div>

              <!-- Message thread container -->
              <div id="tx-chat-messages" class="flex-1 p-3 overflow-y-auto space-y-2 text-xs">
                <div class="text-center text-slate-400 py-6 text-[11px]">Loading chat...</div>
              </div>

              <!-- Message input form -->
              <form onsubmit="app.handleSendChatMessage(event, '${tx.id}')" class="p-2 border-t border-slate-100 flex items-center gap-2 bg-slate-50">
                <input 
                  type="text" 
                  id="chat-input-text" 
                  placeholder="Type message..." 
                  class="flex-1 text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500"
                />
                <button type="submit" class="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm">
                  <i data-lucide="send" class="w-4 h-4"></i>
                </button>
              </form>
            </div>

          </div>

        </div>

      </div>
    `;

    lucide.createIcons();

    // Load chat messages
    await loadTransactionChat(tx.id);

  } catch (err) {
    root.innerHTML = `<div class="p-12 text-center text-rose-500 text-xs">Error loading transaction: ${err.message}</div>`;
  }
}

async function loadTransactionChat(transactionId) {
  const container = document.getElementById('tx-chat-messages');
  if (!container) return;

  try {
    const messages = await api.getMessages(transactionId);
    const currentUser = api.getCurrentUser();

    if (messages.length === 0) {
      container.innerHTML = `<div class="text-center text-slate-400 py-8 text-[11px]">No messages yet. Use this chat to coordinate meetup and item handover.</div>`;
      return;
    }

    container.innerHTML = messages.map(m => {
      const isMine = currentUser && m.sender_id === currentUser.id;
      return `
        <div class="flex flex-col ${isMine ? 'items-end' : 'items-start'}">
          <div class="max-w-[80%] rounded-2xl px-3 py-2 text-xs ${isMine ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-slate-100 text-slate-800 rounded-tl-none'}">
            ${m.content}
          </div>
          <span class="text-[9px] text-slate-400 mt-0.5 px-1">${new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      `;
    }).join('');

    container.scrollTop = container.scrollHeight;
  } catch (err) {
    console.error('Chat load error:', err);
  }
}

function getStatusBadgeClass(status) {
  const map = {
    'PAYMENT_PENDING': 'bg-amber-100 text-amber-800',
    'PAID': 'bg-blue-100 text-blue-800',
    'HANDOVER_PENDING': 'bg-indigo-100 text-indigo-800',
    'ACTIVE': 'bg-emerald-100 text-emerald-800',
    'RETURN_PENDING': 'bg-purple-100 text-purple-800',
    'RETURNED': 'bg-teal-100 text-teal-800',
    'COMPLETED': 'bg-emerald-600 text-white',
    'DISPUTED': 'bg-rose-100 text-rose-800',
    'CANCELLED': 'bg-slate-200 text-slate-700'
  };
  return map[status] || 'bg-slate-100 text-slate-700';
}

function renderStepItem(num, label, isDone) {
  return `
    <div class="flex flex-col items-center">
      <div class="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs mb-1 ${isDone ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400 border border-slate-200'}">
        ${isDone ? '✓' : num}
      </div>
      <span class="text-[11px] font-medium ${isDone ? 'text-slate-900 font-semibold' : 'text-slate-400'}">${label}</span>
    </div>
  `;
}
