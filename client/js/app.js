const app = {
  state: {
    unreadNotificationsCount: 0,
    pollInterval: null,
    deferredPrompt: null
  },

  async init() {
    console.log('🚀 Initializing REUSEHUB Web Application (PWA)...');
    
    // Check user session
    if (api.getToken()) {
      try {
        await api.getMe();
        await this.refreshNotificationsCount();
      } catch (e) {
        console.warn('Session expired or invalid, clearing:', e);
        api.logout();
      }
    }

    renderNavbar();

    // PWA Install Prompt Listener
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.state.deferredPrompt = e;
      const banner = document.getElementById('pwa-install-banner');
      if (banner && !sessionStorage.getItem('pwa_banner_dismissed')) {
        banner.classList.remove('hidden');
      }
      const navBtn = document.getElementById('nav-install-btn');
      if (navBtn) {
        navBtn.classList.remove('hidden');
      }
    });

    window.addEventListener('appinstalled', () => {
      this.state.deferredPrompt = null;
      const banner = document.getElementById('pwa-install-banner');
      if (banner) banner.classList.add('hidden');
      this.showToast('🎉 REUSEHUB App installed successfully to your device!', 'success');
    });

    // Setup Hash Route Listener
    window.addEventListener('hashchange', () => this.handleRoute());
    this.handleRoute();

    // Notification polling every 15s if logged in
    this.startNotificationPolling();
  },

  triggerPwaInstall() {
    if (this.state.deferredPrompt) {
      this.state.deferredPrompt.prompt();
      this.state.deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the PWA install prompt');
        }
        this.state.deferredPrompt = null;
        const banner = document.getElementById('pwa-install-banner');
        if (banner) banner.classList.add('hidden');
      });
    } else {
      this.showToast('To install REUSEHUB: tap your browser menu (⋮, ⎙, or Share) and select "Add to Home Screen" or "Install App".', 'warning');
    }
  },

  dismissInstallPrompt() {
    const banner = document.getElementById('pwa-install-banner');
    if (banner) banner.classList.add('hidden');
    sessionStorage.setItem('pwa_banner_dismissed', 'true');
  },

  handleRoute() {
    const hash = window.location.hash || '#home';
    const [pathPart, queryPart] = hash.split('?');
    
    const params = {};
    if (queryPart) {
      new URLSearchParams(queryPart).forEach((v, k) => { params[k] = v; });
    }

    renderNavbar();
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (pathPart === '#home' || pathPart === '') {
      renderHomeView();
    } else if (pathPart === '#explore') {
      renderExploreView(params);
    } else if (pathPart === '#smart-match') {
      renderExploreView(params);
      this.openSmartMatchModal();
    } else if (pathPart === '#post-item') {
      renderPostItemView();
    } else if (pathPart.startsWith('#listing/')) {
      const id = pathPart.replace('#listing/', '');
      renderListingDetailsView(id);
    } else if (pathPart.startsWith('#transaction/')) {
      const id = pathPart.replace('#transaction/', '');
      renderTransactionView(id);
    } else if (pathPart === '#dashboard') {
      renderDashboardView(params.tab || 'overview');
    } else if (pathPart === '#admin') {
      const user = api.getCurrentUser();
      if (!user || user.role !== 'ADMIN') {
        this.showToast('Access denied: Administrator credentials required.', 'error');
        this.openAdminLoginModal();
        return;
      }
      renderAdminDashboardView(params.tab || 'moderation');
    } else if (pathPart === '#admin-login') {
      this.openAdminLoginModal();
      renderHomeView();
    } else {
      renderHomeView();
    }
  },

  // Toast Notification
  showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    const isError = type === 'error';
    const isWarning = type === 'warning';

    toast.className = `p-4 rounded-2xl shadow-xl border text-xs font-semibold flex items-center gap-3 transition-all duration-300 transform translate-y-4 opacity-0 pointer-events-auto max-w-sm ${
      isError 
        ? 'bg-rose-900 text-white border-rose-700' 
        : (isWarning ? 'bg-amber-900 text-white border-amber-700' : 'bg-emerald-950 text-white border-emerald-800')
    }`;

    toast.innerHTML = `
      <i data-lucide="${isError ? 'alert-circle' : (isWarning ? 'alert-triangle' : 'check-circle-2')}" class="w-5 h-5 shrink-0"></i>
      <span class="flex-1">${message}</span>
    `;

    container.appendChild(toast);
    lucide.createIcons();

    setTimeout(() => {
      toast.classList.remove('translate-y-4', 'opacity-0');
    }, 10);

    setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-y-2');
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  },

  // Modal Controls
  closeModal() {
    const container = document.getElementById('modal-container');
    if (container) {
      container.classList.add('hidden');
      container.innerHTML = '';
    }
  },

  openAuthModal(mode, pendingData) {
    openAuthModal(mode, pendingData);
  },

  openSmartMatchModal(query) {
    openSmartMatchModal(query);
  },

  showImpactMethodology() {
    openImpactMethodologyModal();
  },



  logout() {
    api.logout();
    this.state.unreadNotificationsCount = 0;
    renderNavbar();
    this.showToast('Logged out successfully.');
    window.location.hash = '#home';
  },

  // Auth Form Handlers
  async handleLoginSubmit(e) {
    e.preventDefault();
    const identifier = document.getElementById('login-identifier').value.trim();
    const password = document.getElementById('login-password').value;

    try {
      const res = await api.login(identifier, password);
      this.closeModal();
      await this.refreshNotificationsCount();
      renderNavbar();
      this.showToast(`Welcome back, ${res.user.full_name}!`, 'success');
      this.handleRoute();
    } catch (err) {
      if (err.message && err.message.includes('Mobile verification is required')) {
        this.showToast('Mobile verification required.', 'warning');
      } else {
        this.showToast(err.message, 'error');
      }
    }
  },

  openAdminLoginModal() {
    openAdminLoginModal();
  },

  async handleAdminLoginSubmit(e) {
    e.preventDefault();
    const identifier = document.getElementById('admin-login-identifier').value.trim();
    const password = document.getElementById('admin-login-password').value;

    try {
      const res = await api.adminLogin(identifier, password);
      this.closeModal();
      await this.refreshNotificationsCount();
      renderNavbar();
      this.showToast(`🛡️ Authenticated as System Administrator (${res.user.full_name})`, 'success');
      window.location.hash = '#admin';
      this.handleRoute();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  async handleSignupSubmit(e) {
    e.preventDefault();
    const fullName = document.getElementById('signup-name').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const mobile = document.getElementById('signup-mobile').value.trim();
    const locationName = document.getElementById('signup-location').value.trim();
    const addressPickup = document.getElementById('signup-pickup').value.trim();
    const password = document.getElementById('signup-password').value;

    try {
      const res = await api.signup({
        fullName,
        email,
        mobile,
        locationName,
        addressPickup,
        password
      });

      this.showToast(res.message, 'success');
      // Transition to OTP screen with dev OTP code helper
      this.openAuthModal('otp', {
        userId: res.userId,
        mobile: res.mobile,
        devOtp: res.devOtp
      });
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  async handleOtpSubmit(e) {
    e.preventDefault();
    const code = document.getElementById('otp-code-input').value.trim();

    try {
      const res = await api.verifyOtp({
        userId: authModalState.pendingUserId,
        destination: authModalState.pendingMobile,
        code,
        purpose: 'SIGNUP'
      });

      this.closeModal();
      await this.refreshNotificationsCount();
      renderNavbar();
      this.showToast('Mobile number verified! Account activated.', 'success');
      this.handleRoute();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  async handleResendOtp() {
    try {
      const res = await api.resendOtp(authModalState.pendingMobile, 'SIGNUP');
      authModalState.devOtpCode = res.devOtp;
      renderAuthModalContent();
      this.showToast(`Fresh OTP dispatched! (Dev Code: ${res.devOtp})`, 'success');
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  // Post Item Photos Helpers
  renderPostItemPhotoPreviews() {
    const grid = document.getElementById('post-photos-grid');
    const countSpan = document.getElementById('post-photo-count');
    if (!grid) return;

    if (!window._postItemImages) window._postItemImages = [];
    if (countSpan) countSpan.innerText = window._postItemImages.length;

    if (window._postItemImages.length === 0) {
      grid.innerHTML = `
        <div class="col-span-full p-4 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400">
          No photos selected yet. Upload photos from your device or pick a sample photo above.
        </div>
      `;
      return;
    }

    grid.innerHTML = window._postItemImages.map((src, index) => `
      <div class="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-100 aspect-square">
        <img src="${src}" class="w-full h-full object-cover" alt="Item photo ${index + 1}" />
        ${index === 0 ? `
          <span class="absolute top-1.5 left-1.5 bg-emerald-600 text-white text-[9px] font-black uppercase px-1.5 py-0.5 rounded shadow">
            Main Cover
          </span>
        ` : ''}
        <button 
          type="button" 
          onclick="app.removePostPhoto(${index})" 
          class="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-slate-900/80 hover:bg-rose-600 text-white flex items-center justify-center text-xs shadow transition"
          title="Remove this photo"
        >
          ✕
        </button>
      </div>
    `).join('');
  },

  async handlePostFileUpload(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (!window._postItemImages) window._postItemImages = [];

    const remainingSlots = 4 - window._postItemImages.length;
    if (remainingSlots <= 0) {
      this.showToast('You can add up to 4 photos per listing.', 'warning');
      return;
    }

    const filesToProcess = Array.from(files).slice(0, remainingSlots);
    let addedCount = 0;

    for (const file of filesToProcess) {
      if (!file.type.startsWith('image/')) {
        this.showToast(`"${file.name}" is not an image. Please select JPG, PNG, or WEBP photos.`, 'error');
        continue;
      }
      try {
        const compressedBase64 = await this.compressImageFile(file);
        // Upload to persistent storage and save permanent URL
        const uploadRes = await api.uploadImage(compressedBase64, file.name);
        if (uploadRes && uploadRes.url) {
          window._postItemImages.push(uploadRes.url);
          addedCount++;
        }
      } catch (err) {
        console.error('File upload error:', err);
        this.showToast('Could not upload image: ' + err.message, 'error');
      }
    }

    event.target.value = '';
    this.renderPostItemPhotoPreviews();
    if (addedCount > 0) {
      this.showToast(`Uploaded ${addedCount} photo${addedCount > 1 ? 's' : ''} to permanent storage!`, 'success');
    }
  },

  compressImageFile(file, maxDimension = 1200, quality = 0.82) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => reject(new Error('Invalid image data.'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('Could not read image file.'));
      reader.readAsDataURL(file);
    });
  },

  addSamplePhoto(url, label) {
    if (!window._postItemImages) window._postItemImages = [];
    if (window._postItemImages.length >= 4) {
      this.showToast('Maximum 4 photos allowed.', 'warning');
      return;
    }
    window._postItemImages.push(url);
    this.renderPostItemPhotoPreviews();
    this.showToast(`Added sample photo (${label})!`, 'success');
  },

  addPhotoFromUrlInput() {
    const input = document.getElementById('post-photo-url-input');
    if (!input) return;
    let val = input.value.trim();
    if (!val) {
      this.showToast('Please enter an image link.', 'warning');
      return;
    }
    // Automatically convert Google Drive share links to direct image streams
    const gDriveMatch = val.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/) || val.match(/drive\.google\.com\/.*[?&]id=([a-zA-Z0-9_-]+)/);
    if (gDriveMatch) {
      val = `https://lh3.googleusercontent.com/d/${gDriveMatch[1]}`;
    } else if (val.includes('dropbox.com') && !val.includes('raw=1')) {
      val = val.replace('www.dropbox.com', 'dl.dropboxusercontent.com');
    } else if (!val.startsWith('http://') && !val.startsWith('https://') && !val.startsWith('data:')) {
      val = 'https://' + val;
    }

    if (!window._postItemImages) window._postItemImages = [];
    if (window._postItemImages.length >= 4) {
      this.showToast('Maximum 4 photos allowed.', 'warning');
      return;
    }
    window._postItemImages.push(val);
    input.value = '';
    this.renderPostItemPhotoPreviews();
    this.showToast('Image link added!', 'success');
  },

  removePostPhoto(index) {
    if (!window._postItemImages) return;
    window._postItemImages.splice(index, 1);
    this.renderPostItemPhotoPreviews();
  },

  async handleEvidencePhotoUpload(event, targetInputId, previewContainerId) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.showToast('Please select a valid image file (JPG, PNG).', 'error');
      return;
    }
    try {
      const base64 = await this.compressImageFile(file);
      const input = document.getElementById(targetInputId);
      if (input) input.value = base64;
      const preview = document.getElementById(previewContainerId);
      if (preview) {
        preview.classList.remove('hidden');
        const img = preview.querySelector('img');
        if (img) img.src = base64;
      }
      this.showToast('Photo uploaded from device!', 'success');
    } catch (err) {
      this.showToast('Failed to process image: ' + err.message, 'error');
    }
  },

  // Post Item Submit with Explicit Validation & Clear Error Messages
  async handlePostItemSubmit(e) {
    e.preventDefault();

    const banner = document.getElementById('post-error-banner');
    const errList = document.getElementById('post-error-list');
    const errTitle = document.getElementById('post-error-title');
    if (banner) banner.classList.add('hidden');
    if (errList) errList.innerHTML = '';

    // Clear any previous error styling on inputs
    document.querySelectorAll('.post-field-error').forEach(el => {
      el.classList.remove('post-field-error', '!border-rose-500', '!bg-rose-50/50');
    });

    const errors = [];
    const fieldsToHighlight = [];

    const categoryId = document.getElementById('post-category')?.value;
    const title = document.getElementById('post-title')?.value.trim();
    const condition = document.getElementById('post-condition')?.value;
    const description = document.getElementById('post-description')?.value.trim();
    const isBorrowFree = document.getElementById('post-borrow-free')?.checked;
    const rentInput = document.getElementById('post-rent-price');
    const rentPricePerDay = parseFloat(rentInput?.value) || 0;
    const securityDeposit = parseFloat(document.getElementById('post-deposit')?.value) || 0;
    const locationName = document.getElementById('post-location-name')?.value.trim();
    const exactAddress = document.getElementById('post-exact-address')?.value.trim();
    const pickupInstructions = document.getElementById('post-instructions')?.value.trim();

    // 1. Detailed Field-by-Field Friendly Validations
    if (!title || title.length < 3) {
      errors.push('<strong>Item Title:</strong> Please enter a descriptive title (at least 3 characters, e.g. "Sony A7 Camera" or "Cordless Power Drill").');
      fieldsToHighlight.push('post-title');
    }

    if (!categoryId) {
      errors.push('<strong>Category:</strong> Please choose a category from the dropdown list.');
      fieldsToHighlight.push('post-category');
    }

    if (!condition) {
      errors.push('<strong>Item Condition:</strong> Please select the current condition of the item.');
      fieldsToHighlight.push('post-condition');
    }

    if (!description || description.length < 8) {
      errors.push('<strong>Description:</strong> Please provide a short description (at least 8 characters) explaining included accessories and item condition.');
      fieldsToHighlight.push('post-description');
    }

    if (!isBorrowFree && rentPricePerDay <= 0) {
      errors.push('<strong>Rent Price:</strong> Please specify a rental price per day greater than $0, or check "Allow Free Borrowing".');
      fieldsToHighlight.push('post-rent-price');
    }

    if (!locationName) {
      errors.push('<strong>Public Neighborhood:</strong> Please enter your general area or neighborhood (e.g. Madhapur, Hitech City) for map discovery.');
      fieldsToHighlight.push('post-location-name');
    }

    if (!exactAddress) {
      errors.push('<strong>Exact Pickup Address:</strong> Please provide the physical street address for item pickup (kept completely private until you approve a booking).');
      fieldsToHighlight.push('post-exact-address');
    }

    if (!pickupInstructions) {
      errors.push('<strong>Collection Instructions:</strong> Please add simple instructions for the borrower (e.g. "Call on arrival" or "Available after 5 PM").');
      fieldsToHighlight.push('post-instructions');
    }

    // Collect Photos: If empty, gracefully use a verified category default image
    const images = Array.isArray(window._postItemImages) && window._postItemImages.length > 0
      ? window._postItemImages
      : ['https://images.unsplash.com/photo-1581291518655-9523c932deb4?w=700'];

    // If client validation fails, display prominent error banner and scroll smoothly to it
    if (errors.length > 0) {
      if (banner && errList) {
        if (errTitle) errTitle.innerText = `Please complete the following ${errors.length} required field${errors.length > 1 ? 's' : ''}:`;
        errList.innerHTML = errors.map(msg => `<li>${msg}</li>`).join('');
        banner.classList.remove('hidden');
        banner.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      fieldsToHighlight.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          el.classList.add('post-field-error', '!border-rose-500', '!bg-rose-50/50');
        }
      });
      this.showToast('Please fix the highlighted fields above.', 'error');
      return;
    }

    const btn = document.getElementById('btn-submit-post');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span class="animate-spin mr-2">⏳</span> Submitting for Admin moderation...`;
    }

    try {
      const res = await api.createListing({
        categoryId,
        title,
        condition,
        description,
        isBorrowFree,
        rentPricePerDay,
        securityDeposit,
        locationName,
        exactAddress,
        pickupInstructions,
        images
      });

      this.showToast(res.message || 'Item submitted for Admin moderation!', 'success');
      window._postItemImages = [];
      window.location.hash = `#dashboard?tab=listings`;
    } catch (err) {
      // Display server error clearly in the prominent error banner
      if (banner && errList) {
        if (errTitle) errTitle.innerText = 'Item submission could not be accepted:';
        errList.innerHTML = `<li><strong>${err.message || 'An error occurred during submission.'}</strong> Please update your details and try again.</li>`;
        banner.classList.remove('hidden');
        banner.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      this.showToast(err.message, 'error');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<i data-lucide="check-circle" class="w-4 h-4"></i><span>Submit Item for Admin Moderation</span>`;
        lucide.createIcons();
      }
    }
  },

  // Booking Calculator & Submit
  calculateBookingEstimate(dailyRent, deposit, isFree) {
    const startInput = document.getElementById('req-start-date');
    const endInput = document.getElementById('req-end-date');
    if (!startInput || !endInput || !startInput.value || !endInput.value) return;

    const start = new Date(startInput.value);
    const end = new Date(endInput.value);

    let days = 1;
    if (end >= start) {
      const diff = end.getTime() - start.getTime();
      days = Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1);
    }

    const rentFee = isFree ? 0 : days * dailyRent;
    const total = rentFee + deposit;

    const valDays = document.getElementById('val-calc-days');
    const valRent = document.getElementById('val-calc-rent');
    const valTotal = document.getElementById('val-calc-total');

    if (valDays) valDays.innerText = `${days} day${days === 1 ? '' : 's'}`;
    if (valRent) valRent.innerText = isFree ? '$0 (Free Borrow)' : `$${rentFee}`;
    if (valTotal) valTotal.innerText = `$${total}`;
  },

  async handleBookingSubmit(e, listingId) {
    e.preventDefault();
    if (!api.getToken()) {
      this.showToast('Please sign in to request this item.', 'warning');
      this.openAuthModal('signup');
      return;
    }

    const startDate = document.getElementById('req-start-date').value;
    const endDate = document.getElementById('req-end-date').value;
    const message = document.getElementById('req-message').value.trim();

    try {
      const res = await api.createRequest({
        listingId,
        startDate,
        endDate,
        message
      });

      this.showToast(res.message, 'success');
      window.location.hash = '#dashboard?tab=requests';
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  // Payment Processing
  async handleProcessPayment(txId, paymentMethod) {
    try {
      this.showToast('Processing escrow payment ledger...');
      const res = await api.payTransaction(txId, paymentMethod);
      this.showToast(res.message, 'success');
      renderTransactionView(txId);
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  // Handover OTP Verification
  async handleVerifyHandover(e, txId) {
    e.preventDefault();
    const otp = document.getElementById('input-handover-otp').value.trim();
    try {
      const res = await api.verifyHandover(txId, otp);
      this.showToast(res.message, 'success');
      renderTransactionView(txId);
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  // Return Verification
  async handleReturnItemPrompt(txId, hasDamage = false) {
    const otp = prompt('Enter Return OTP provided during physical meetup:');
    if (!otp) return;

    try {
      const res = await api.verifyReturn(txId, otp, hasDamage);
      this.showToast(res.message, 'success');
      renderTransactionView(txId);
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  // Owner Accept/Reject Request
  async handleOwnerAcceptRequest(reqId) {
    try {
      const res = await api.respondToRequest(reqId, 'ACCEPT');
      this.showToast(res.message, 'success');
      if (res.transactionId) {
        window.location.hash = `#transaction/${res.transactionId}`;
      } else {
        renderDashboardView('requests');
      }
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  async handleOwnerRejectRequest(reqId) {
    const reason = prompt('Optional reason for declining request:', 'Unavailable on requested dates');
    try {
      const res = await api.respondToRequest(reqId, 'REJECT', reason);
      this.showToast('Request declined.', 'warning');
      renderDashboardView('requests');
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  // Chat message send
  async handleSendChatMessage(e, txId) {
    e.preventDefault();
    const input = document.getElementById('chat-input-text');
    const content = input.value.trim();
    if (!content) return;

    input.value = '';
    try {
      await api.sendMessage(txId, content);
      await loadTransactionChat(txId);
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  // Filter change in Explore
  handleFilterChange(field, value) {
    currentExploreFilters[field] = value;
    loadExploreListings();
  },

  setExploreViewMode(mode) {
    currentExploreFilters.viewMode = mode;
    const btnGrid = document.getElementById('btn-view-grid');
    const btnMap = document.getElementById('btn-view-map');
    const gridContainer = document.getElementById('explore-grid-container');
    const mapWrapper = document.getElementById('explore-map-wrapper');

    if (mode === 'grid') {
      btnGrid.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition bg-white text-slate-900 shadow-sm';
      btnMap.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition text-slate-600 hover:text-slate-900';
      gridContainer.classList.remove('hidden');
      mapWrapper.classList.add('hidden');
    } else {
      btnMap.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition bg-white text-slate-900 shadow-sm';
      btnGrid.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition text-slate-600 hover:text-slate-900';
      gridContainer.classList.add('hidden');
      mapWrapper.classList.remove('hidden');

      if (!exploreMapInstance) {
        initExploreMap('explore-leaflet-map');
      }
      setTimeout(() => {
        exploreMapInstance.invalidateSize();
        loadExploreListings();
      }, 100);
    }
    lucide.createIcons();
  },

  resetExploreFilters() {
    currentExploreFilters = {
      search: '',
      category: '',
      type: 'all',
      condition: '',
      minPrice: '',
      maxPrice: '',
      radiusKm: 25,
      sort: 'recently_added',
      viewMode: currentExploreFilters.viewMode
    };
    renderExploreView();
  },

  // Smart Match
  handleHomeSmartMatch(e) {
    e.preventDefault();
    const query = document.getElementById('home-smart-query').value.trim();
    this.openSmartMatchModal(query);
  },

  fillSmartQuery(text) {
    const input = document.getElementById('home-smart-query');
    if (input) input.value = text;
    this.openSmartMatchModal(text);
  },

  async executeSmartMatch(e) {
    if (e) e.preventDefault();
    const input = document.getElementById('smart-match-input');
    const query = input ? input.value.trim() : '';
    if (!query) return;

    const preview = document.getElementById('smart-parsed-preview');
    const resultsContainer = document.getElementById('smart-match-results');

    resultsContainer.innerHTML = `
      <div class="text-center py-8 text-xs text-slate-400">
        <div class="w-7 h-7 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
        <span>Analyzing keywords, distance radius, duration & availability...</span>
      </div>
    `;

    try {
      const res = await api.smartMatch(query);
      const parsed = res.parsedQuery;

      preview.classList.remove('hidden');
      preview.innerHTML = `
        <span class="font-bold text-emerald-950 block mb-1">Parsed Requirements:</span>
        <div class="flex flex-wrap gap-2 text-[11px]">
          <span class="bg-white px-2.5 py-1 rounded-lg border border-emerald-200"><strong>Target Item:</strong> "${parsed.targetItem}"</span>
          <span class="bg-white px-2.5 py-1 rounded-lg border border-emerald-200"><strong>Duration:</strong> ${parsed.durationDays} day(s)</span>
          <span class="bg-white px-2.5 py-1 rounded-lg border border-emerald-200"><strong>Radius:</strong> within ${parsed.radiusKm} km</span>
          ${parsed.maxBudget ? `<span class="bg-white px-2.5 py-1 rounded-lg border border-emerald-200"><strong>Budget:</strong> max $${parsed.maxBudget}</span>` : ''}
          ${parsed.preferBorrow ? `<span class="bg-blue-100 text-blue-900 px-2.5 py-1 rounded-lg font-bold">Prefers Free Borrowing</span>` : ''}
        </div>
      `;

      if (res.matches.length === 0) {
        resultsContainer.innerHTML = `
          <div class="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl border border-slate-200">
            No items closely matched this exact criteria. Try increasing the search radius or exploring all categories.
          </div>
        `;
        return;
      }

      resultsContainer.innerHTML = res.matches.map(item => `
        <div class="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-emerald-500 transition space-y-2">
          <div class="flex items-start justify-between gap-4">
            <div class="flex items-start gap-3">
              <img src="${item.primary_image || 'https://images.unsplash.com/photo-1581291518655-9523c932deb4?w=150'}" class="w-16 h-16 rounded-xl object-cover shrink-0" />
              <div>
                <div class="flex items-center gap-1.5 mb-0.5">
                  <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${item.is_borrow_free ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'}">
                    ${item.is_borrow_free ? 'FREE BORROW' : '$' + item.rent_price_per_day + '/day'}
                  </span>
                  <span class="text-xs text-slate-400 font-medium">${item.category_name}</span>
                </div>
                <h4 class="font-bold text-sm text-slate-900">${item.title}</h4>
                <p class="text-xs text-slate-500">${item.location_name} • ${item.distance_km !== null ? '~' + item.distance_km + ' km away' : ''}</p>
              </div>
            </div>

            <div class="text-right shrink-0">
              <span class="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                ${item.match_score}% Match
              </span>
            </div>
          </div>

          <div class="p-2.5 bg-slate-50 rounded-xl text-[11px] text-slate-600">
            <strong>Why it matched:</strong> ${item.match_explanation}
          </div>

          <div class="flex items-center justify-between pt-1">
            <span class="text-xs font-bold text-slate-800">
              Estimated Total: ${item.is_borrow_free ? '$0' : '$' + item.estimated_total}
            </span>
            <a href="#listing/${item.id}" onclick="app.closeModal()" class="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm">
              View & Request →
            </a>
          </div>
        </div>
      `).join('');

      lucide.createIcons();
    } catch (err) {
      resultsContainer.innerHTML = `<div class="p-4 text-center text-xs text-rose-500">${err.message}</div>`;
    }
  },

  // Wishlist toggle
  async toggleWishlist(id) {
    if (!api.getToken()) {
      this.showToast('Please sign in to save items.', 'warning');
      this.openAuthModal('login');
      return;
    }
    try {
      const res = await api.toggleSaveListing(id);
      this.showToast(res.message, 'success');
      const btn = document.getElementById(`btn-wishlist-${id}`);
      if (btn) {
        btn.querySelector('i').classList.toggle('fill-emerald-600');
        btn.querySelector('i').classList.toggle('text-emerald-600');
      }
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  // Modal Dialogs for Condition, Report, Damage, Review
  openConditionModal(txId, stage) {
    const container = document.getElementById('modal-container');
    container.classList.remove('hidden');

    container.innerHTML = `
      <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-4">
          <div class="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 class="text-sm font-bold text-slate-900">
              ${stage === 'BEFORE_HANDOVER' ? 'Record Pre-Handover Condition' : 'Record Post-Return Condition'}
            </h3>
            <button onclick="app.closeModal()" class="p-1 text-slate-400 hover:text-slate-600"><i data-lucide="x" class="w-5 h-5"></i></button>
          </div>
          <form onsubmit="app.handleConditionSubmit(event, '${txId}', '${stage}')" class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Condition Description Notes *</label>
              <textarea id="cond-notes" rows="3" required placeholder="Describe physical condition, included cables/accessories, operational test..." class="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-600"></textarea>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Evidence Photo</label>
              <div class="space-y-2">
                <input type="file" accept="image/*" class="w-full text-xs file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-emerald-100 file:text-emerald-800 hover:file:bg-emerald-200 cursor-pointer" onchange="app.handleEvidencePhotoUpload(event, 'cond-photo', 'cond-preview')" />
                <div id="cond-preview" class="hidden">
                  <img src="" class="h-20 w-auto rounded-lg object-cover border border-slate-200" />
                </div>
                <input type="text" id="cond-photo" placeholder="Or paste image link (optional)" value="https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=600" class="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-600" />
              </div>
            </div>
            <button type="submit" class="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md">
              Save Timestamped Evidence
            </button>
          </form>
        </div>
      </div>
    `;
    lucide.createIcons();
  },

  async handleConditionSubmit(e, txId, stage) {
    e.preventDefault();
    const notes = document.getElementById('cond-notes').value.trim();
    const photo = document.getElementById('cond-photo').value.trim();
    const photos = photo ? [photo] : [];

    try {
      const res = await api.uploadConditionEvidence(txId, stage, notes, photos);
      this.showToast(res.message, 'success');
      this.closeModal();
      renderTransactionView(txId);
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  openReportDamageModal(txId) {
    const container = document.getElementById('modal-container');
    container.classList.remove('hidden');

    container.innerHTML = `
      <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-4">
          <div class="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 class="text-sm font-bold text-rose-700 flex items-center gap-1.5">
              <i data-lucide="alert-triangle" class="w-4 h-4"></i> File Damage Report & Dispute
            </h3>
            <button onclick="app.closeModal()" class="p-1 text-slate-400 hover:text-slate-600"><i data-lucide="x" class="w-5 h-5"></i></button>
          </div>
          <form onsubmit="app.handleReportDamageSubmit(event, '${txId}')" class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Damage Description *</label>
              <textarea id="dmg-desc" rows="3" required placeholder="Describe damaged parts, malfunction, or missing accessories..." class="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-600"></textarea>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Estimated Repair / Replacement Cost ($) *</label>
              <input type="number" id="dmg-cost" min="1" step="1" required placeholder="e.g. 25" class="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-600" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Damage Photo Evidence</label>
              <div class="space-y-2">
                <input type="file" accept="image/*" class="w-full text-xs file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-rose-100 file:text-rose-800 hover:file:bg-rose-200 cursor-pointer" onchange="app.handleEvidencePhotoUpload(event, 'dmg-photo', 'dmg-preview')" />
                <div id="dmg-preview" class="hidden">
                  <img src="" class="h-20 w-auto rounded-lg object-cover border border-rose-200" />
                </div>
                <input type="text" id="dmg-photo" placeholder="Or paste image link (optional)" class="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-600" />
              </div>
            </div>
            <div class="p-3 bg-amber-50 rounded-xl text-[11px] text-amber-900">
              Filing this report safely freezes the security deposit in escrow. The borrower will be given notice to respond with counter-evidence before Admin arbitrates.
            </div>
            <button type="submit" class="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md">
              Submit Formal Damage Claim
            </button>
          </form>
        </div>
      </div>
    `;
    lucide.createIcons();
  },

  async handleReportDamageSubmit(e, txId) {
    e.preventDefault();
    const desc = document.getElementById('dmg-desc').value.trim();
    const cost = parseFloat(document.getElementById('dmg-cost').value);
    const photo = document.getElementById('dmg-photo').value.trim();
    const photos = photo ? [photo] : [];

    try {
      const res = await api.reportDamage(txId, desc, cost, photos);
      this.showToast(res.message, 'warning');
      this.closeModal();
      renderTransactionView(txId);
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  openBorrowerDisputeResponseModal(disputeId) {
    const container = document.getElementById('modal-container');
    container.classList.remove('hidden');

    container.innerHTML = `
      <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-4">
          <div class="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 class="text-sm font-bold text-slate-900">Respond to Damage Claim</h3>
            <button onclick="app.closeModal()" class="p-1 text-slate-400 hover:text-slate-600"><i data-lucide="x" class="w-5 h-5"></i></button>
          </div>
          <form onsubmit="app.handleBorrowerDisputeSubmit(event, '${disputeId}')" class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Your Response *</label>
              <select id="disp-resp" required class="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <option value="ACCEPTED">Accept Claim (Agree to repair deduction from deposit)</option>
                <option value="CONTESTED">Disagree / Contest (Submit explanation & counter-evidence)</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Your Statement / Explanation</label>
              <textarea id="disp-notes" rows="3" required placeholder="Explain your perspective, pre-existing wear, or counter-offer..." class="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl"></textarea>
            </div>
            <button type="submit" class="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md">
              Submit Response for Admin Review
            </button>
          </form>
        </div>
      </div>
    `;
    lucide.createIcons();
  },

  async handleBorrowerDisputeSubmit(e, disputeId) {
    e.preventDefault();
    const response = document.getElementById('disp-resp').value;
    const notes = document.getElementById('disp-notes').value.trim();

    try {
      const res = await api.respondToDispute(disputeId, response, notes, []);
      this.showToast(res.message, 'success');
      this.closeModal();
      this.handleRoute();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  // Review Modal
  openReviewModal(txId) {
    const container = document.getElementById('modal-container');
    container.classList.remove('hidden');

    container.innerHTML = `
      <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-4">
          <div class="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 class="text-sm font-bold text-slate-900">Leave a Review</h3>
            <button onclick="app.closeModal()" class="p-1 text-slate-400 hover:text-slate-600"><i data-lucide="x" class="w-5 h-5"></i></button>
          </div>
          <form onsubmit="app.handleReviewSubmit(event, '${txId}')" class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Star Rating (1 to 5 Stars) *</label>
              <select id="rev-rating" class="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-amber-500">
                <option value="5">★★★★★ (5 Stars - Outstanding)</option>
                <option value="4">★★★★☆ (4 Stars - Very Good)</option>
                <option value="3">★★★☆☆ (3 Stars - Average)</option>
                <option value="2">★★☆☆☆ (2 Stars - Disappointing)</option>
                <option value="1">★☆☆☆☆ (1 Star - Poor)</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Feedback & Comments</label>
              <textarea id="rev-text" rows="3" placeholder="How was the communication, item condition, and handover punctuality?" class="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl"></textarea>
            </div>
            <button type="submit" class="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md">
              Publish Review
            </button>
          </form>
        </div>
      </div>
    `;
    lucide.createIcons();
  },

  async handleReviewSubmit(e, txId) {
    e.preventDefault();
    const rating = document.getElementById('rev-rating').value;
    const reviewText = document.getElementById('rev-text').value.trim();

    try {
      const res = await api.submitReview(txId, rating, reviewText);
      this.showToast(res.message, 'success');
      this.closeModal();
      renderTransactionView(txId);
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  // Report Listing Modal
  openReportModal(listingId, title) {
    const container = document.getElementById('modal-container');
    container.classList.remove('hidden');

    container.innerHTML = `
      <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-4">
          <div class="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 class="text-sm font-bold text-rose-700 flex items-center gap-1.5">
              <i data-lucide="flag" class="w-4 h-4"></i> Report Listing
            </h3>
            <button onclick="app.closeModal()" class="p-1 text-slate-400 hover:text-slate-600"><i data-lucide="x" class="w-5 h-5"></i></button>
          </div>
          <form onsubmit="app.handleReportSubmit(event, '${listingId}')" class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Reason for Report *</label>
              <select id="report-reason" required class="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <option value="Suspicious">Suspicious / Potential Fraud</option>
                <option value="Prohibited">Prohibited / Barred Item</option>
                <option value="Misleading">Misleading Information or Stock Photos</option>
                <option value="Safety concern">Safety Concern or Dangerous Goods</option>
                <option value="Item not as described">Item Not as Described</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Details & Context</label>
              <textarea id="report-details" rows="3" placeholder="Provide any details to help admin reviewers..." class="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl"></textarea>
            </div>
            <button type="submit" class="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md">
              Send Report to Admin
            </button>
          </form>
        </div>
      </div>
    `;
    lucide.createIcons();
  },

  async handleReportSubmit(e, listingId) {
    e.preventDefault();
    if (!api.getToken()) {
      this.showToast('Please log in to submit reports.', 'warning');
      this.openAuthModal('login');
      return;
    }
    const reason = document.getElementById('report-reason').value;
    const details = document.getElementById('report-details').value.trim();

    try {
      const res = await api.reportListing(listingId, reason, details);
      this.showToast(res.message, 'success');
      this.closeModal();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  // Admin Actions
  async handleAdminApproveListing(id) {
    try {
      const res = await api.moderateListing(id, 'APPROVE');
      this.showToast(res.message, 'success');
      switchAdminTab('moderation');
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  openRejectListingModal(id, title = '') {
    const container = document.getElementById('modal-container');
    container.classList.remove('hidden');

    container.innerHTML = `
      <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-4">
          <div class="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 class="text-sm font-bold text-rose-700">Decline Listing${title ? `: ${title}` : ''}</h3>
            <button onclick="app.closeModal()" class="p-1 text-slate-400 hover:text-slate-600"><i data-lucide="x" class="w-5 h-5"></i></button>
          </div>
          <form onsubmit="app.handleAdminRejectSubmit(event, '${id}')" class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Standard Reject Reason *</label>
              <select id="rej-reason" required class="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <option value="Prohibited item">Prohibited item</option>
                <option value="Unsafe listing">Unsafe listing</option>
                <option value="Misleading information">Misleading information</option>
                <option value="Incomplete details">Incomplete details</option>
                <option value="Duplicate listing">Duplicate listing</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Explanation Notes to Submitter</label>
              <textarea id="rej-notes" rows="3" placeholder="Explain what needs fixing so the user can correct it..." class="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl"></textarea>
            </div>
            <button type="submit" class="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md">
              Confirm Rejection & Notify Submitter
            </button>
          </form>
        </div>
      </div>
    `;
    lucide.createIcons();
  },

  async handleAdminRejectSubmit(e, id) {
    e.preventDefault();
    const reason = document.getElementById('rej-reason').value;
    const notes = document.getElementById('rej-notes').value.trim();

    try {
      const res = await api.moderateListing(id, 'REJECT', reason, notes);
      this.showToast(res.message, 'warning');
      this.closeModal();
      switchAdminTab('moderation');
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  async handleArbitrateDispute(disputeId, resolution, amount) {
    const adminNotes = prompt(`Enter arbitration ruling notes for ${resolution}:`, `Arbitrated by platform compliance team.`);
    if (adminNotes === null) return;

    try {
      const res = await api.resolveAdminDispute(disputeId, resolution, amount, adminNotes);
      this.showToast(res.message, 'success');
      renderAdminDashboardView('disputes');
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  async handleAdminReportAction(reportId, action) {
    try {
      const res = await api.handleAdminReport(reportId, action);
      this.showToast(res.message, 'success');
      renderAdminDashboardView('reports');
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  async handleToggleUserStatus(userId) {
    try {
      const res = await api.toggleAdminUserStatus(userId);
      this.showToast(res.message, 'success');
      renderAdminDashboardView('users');
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  // Notification UI helpers
  toggleNotificationsDropdown() {
    const dropdown = document.getElementById('notifications-dropdown');
    if (!dropdown) return;
    dropdown.classList.toggle('hidden');
    if (!dropdown.classList.contains('hidden')) {
      this.loadNotificationsDropdownList();
    }
  },

  async loadNotificationsDropdownList() {
    const list = document.getElementById('notifications-list');
    if (!list) return;

    try {
      const res = await api.getNotifications();
      const notifs = res.notifications || [];

      if (notifs.length === 0) {
        list.innerHTML = `<div class="p-6 text-center text-xs text-slate-400">No notifications yet.</div>`;
        return;
      }

      list.innerHTML = notifs.slice(0, 5).map(n => `
        <div class="p-3 text-xs ${n.is_read ? 'bg-white' : 'bg-emerald-50/50'}">
          <div class="font-bold text-slate-900">${n.title}</div>
          <div class="text-slate-600 mt-0.5 line-clamp-2">${n.message}</div>
          <div class="flex items-center justify-between mt-1 text-[10px] text-slate-400">
            <span>${new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            ${n.link ? `<a href="${n.link}" onclick="document.getElementById('notifications-dropdown').classList.add('hidden')" class="font-bold text-emerald-700">Open →</a>` : ''}
          </div>
        </div>
      `).join('');
    } catch (e) {
      console.error(e);
    }
  },

  async markAllNotificationsRead() {
    try {
      await api.markAllNotificationsRead();
      this.state.unreadNotificationsCount = 0;
      renderNavbar();
      this.loadNotificationsDropdownList();
    } catch (e) {
      console.error(e);
    }
  },

  toggleUserMenu() {
    const dropdown = document.getElementById('user-dropdown');
    if (dropdown) dropdown.classList.toggle('hidden');
  },

  async refreshNotificationsCount() {
    if (!api.getToken()) return;
    try {
      const res = await api.getNotifications();
      this.state.unreadNotificationsCount = res.unreadCount || 0;
    } catch (e) {}
  },

  startNotificationPolling() {
    if (this.state.pollInterval) clearInterval(this.state.pollInterval);
    this.state.pollInterval = setInterval(async () => {
      if (api.getToken()) {
        const prev = this.state.unreadNotificationsCount;
        await this.refreshNotificationsCount();
        if (this.state.unreadNotificationsCount !== prev) {
          renderNavbar();
        }
      }
    }, 15000);
  },

  switchDashTab(tabId) {
    switchDashboardTab(tabId);
  },

  switchAdminTab(tabId) {
    switchAdminTab(tabId);
  }
};

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
