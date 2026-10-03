async function renderPostItemView() {
  const root = document.getElementById('app-root');
  const user = api.getCurrentUser();

  if (!user) {
    root.innerHTML = `
      <div class="max-w-md mx-auto my-16 p-8 bg-white rounded-3xl border border-slate-200 text-center shadow-sm">
        <div class="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-4 font-bold">
          <i data-lucide="lock" class="w-6 h-6"></i>
        </div>
        <h2 class="text-xl font-bold text-slate-900 mb-2">Sign In Required to Post Items</h2>
        <p class="text-xs text-slate-600 mb-6">
          To maintain a safe community, all lenders must be registered and mobile OTP verified before posting items for rent or borrowing.
        </p>
        <button onclick="app.openAuthModal('signup')" class="w-full py-3 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-md transition mb-2">
          Create Verified Account
        </button>
        <button onclick="app.openAuthModal('login')" class="w-full py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition">
          Already have an account? Log in
        </button>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  let categories = [];
  try {
    categories = await api.getCategories();
  } catch (e) {
    console.error(e);
  }

  root.innerHTML = `
    <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      
      <!-- Header Banner -->
      <div class="mb-8 text-center sm:text-left">
        <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-semibold mb-2 border border-amber-200">
          <i data-lucide="shield-alert" class="w-3.5 h-3.5 text-amber-600"></i>
          <span>All new listings undergo Admin Review before public release</span>
        </div>
        <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Post an Item to Rent or Share</h1>
        <p class="text-xs sm:text-sm text-slate-500 mt-1">
          Turn your unused household, electronic, or academic gear into community assets.
        </p>
      </div>

      <!-- Main Form Card -->
      <div class="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm">
        
        <!-- Prominent Inline Error Message Alert Banner -->
        <div id="post-error-banner" class="hidden mb-6 p-4 sm:p-5 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-950 text-xs shadow-sm transition-all">
          <div class="flex items-start gap-3">
            <div class="w-8 h-8 rounded-xl bg-rose-200 text-rose-800 flex items-center justify-center shrink-0 font-bold">
              <i data-lucide="alert-triangle" class="w-4 h-4"></i>
            </div>
            <div class="flex-1">
              <h4 class="font-bold text-sm text-rose-900 mb-1" id="post-error-title">Please review the following details:</h4>
              <ul class="list-disc pl-4 space-y-1 text-rose-800 font-medium" id="post-error-list"></ul>
            </div>
            <button type="button" onclick="document.getElementById('post-error-banner').classList.add('hidden')" class="text-rose-400 hover:text-rose-700 p-1" title="Dismiss">✕</button>
          </div>
        </div>

        <form onsubmit="app.handlePostItemSubmit(event)" novalidate class="space-y-6">
          
          <!-- 1. Basic Information -->
          <div>
            <h3 class="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 mb-4 flex items-center gap-2">
              <span class="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-xs flex items-center justify-center font-bold">1</span>
              <span>Item Details</span>
            </h3>

            <div class="space-y-4">
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Item Title *</label>
                <input 
                  type="text" 
                  id="post-title" 
                  required
                  placeholder="e.g. Sony Alpha A7 III Camera or Bosch Cordless Drill"
                  class="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-semibold text-slate-700 mb-1">Category (12 Standard Options) *</label>
                  <select 
                    id="post-category" 
                    required
                    class="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
                  >
                    <option value="">Select Category...</option>
                    ${categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                  </select>
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-700 mb-1">Item Condition *</label>
                  <select 
                    id="post-condition" 
                    required
                    class="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
                  >
                    <option value="Like New">Like New (flawless, barely used)</option>
                    <option value="New">New (unopened / brand new)</option>
                    <option value="Good" selected>Good (minor cosmetic wear, works 100%)</option>
                    <option value="Used">Used (visible wear, functional)</option>
                    <option value="Needs Repair">Needs Repair (has known quirks)</option>
                  </select>
                </div>
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Detailed Description *</label>
                <textarea 
                  id="post-description" 
                  rows="3" 
                  required
                  placeholder="Describe included accessories, usage guidelines, features, and specs..."
                  class="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
                ></textarea>
              </div>
            </div>
          </div>

          <!-- 2. Pricing & Deposit -->
          <div>
            <h3 class="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 mb-4 flex items-center gap-2">
              <span class="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-xs flex items-center justify-center font-bold">2</span>
              <span>Pricing & Sharing Terms</span>
            </h3>

            <div class="space-y-4">
              <div class="flex items-center gap-3 p-3.5 bg-blue-50 rounded-2xl border border-blue-200">
                <input 
                  type="checkbox" 
                  id="post-borrow-free" 
                  class="w-4 h-4 rounded text-blue-600 accent-blue-600"
                  onchange="
                    const rentInput = document.getElementById('post-rent-price');
                    if (this.checked) {
                      rentInput.value = 0;
                      rentInput.disabled = true;
                    } else {
                      rentInput.disabled = false;
                      if (rentInput.value == 0) rentInput.value = 15;
                    }
                  "
                />
                <label for="post-borrow-free" class="text-xs text-blue-900 cursor-pointer">
                  <strong class="block">Allow Free Borrowing</strong>
                  <span>Share this item with students or community members at $0/day rental fee.</span>
                </label>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-semibold text-slate-700 mb-1">Rent Price Per Day ($) *</label>
                  <div class="relative">
                    <span class="absolute left-3 top-3 text-slate-400 font-bold">$</span>
                    <input 
                      type="number" 
                      id="post-rent-price" 
                      min="0" 
                      step="1" 
                      value="15"
                      required
                      class="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl p-3 pl-8 text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-700 mb-1">Refundable Security Deposit ($)</label>
                  <div class="relative">
                    <span class="absolute left-3 top-3 text-slate-400 font-bold">$</span>
                    <input 
                      type="number" 
                      id="post-deposit" 
                      min="0" 
                      step="1" 
                      value="30"
                      class="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl p-3 pl-8 text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
                    />
                  </div>
                  <span class="text-[10px] text-slate-500 mt-1 block">Held securely in platform escrow and refunded automatically upon return inspection.</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 3. Photos -->
          <div>
            <div class="flex items-center justify-between border-b border-slate-100 pb-2 mb-4">
              <h3 class="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span class="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-xs flex items-center justify-center font-bold">3</span>
                <span>Item Photos</span>
              </h3>
              <span class="text-[11px] text-slate-500">Upload from camera/device or choose a sample</span>
            </div>

            <div class="space-y-4">
              
              <!-- Primary Device File Upload Dropzone -->
              <div 
                onclick="document.getElementById('post-file-input').click()" 
                class="border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/40 hover:bg-emerald-50 transition rounded-2xl p-5 sm:p-6 text-center cursor-pointer group"
              >
                <input 
                  type="file" 
                  id="post-file-input" 
                  accept="image/*" 
                  multiple 
                  class="hidden" 
                  onchange="app.handlePostFileUpload(event)" 
                />
                <div class="w-12 h-12 rounded-2xl bg-white shadow-sm border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition">
                  <i data-lucide="camera" class="w-6 h-6"></i>
                </div>
                <p class="text-xs sm:text-sm font-bold text-slate-800">
                  📸 Upload from Phone / Computer or Take a Photo
                </p>
                <p class="text-[11px] text-slate-500 mt-1">
                  Click to select photos (JPG, PNG, WEBP). Optimized automatically for fast upload.
                </p>
              </div>

              <!-- Selected Photos Preview Grid -->
              <div id="post-photos-preview-container" class="space-y-2">
                <div class="flex items-center justify-between text-xs text-slate-600">
                  <span class="font-semibold">Selected Photos (<span id="post-photo-count">1</span> / 4):</span>
                  <span class="text-[11px] text-slate-400">First photo is your main listing cover</span>
                </div>
                <div id="post-photos-grid" class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <!-- Dynamic thumbnail cards inserted here -->
                </div>
              </div>

              <!-- Quick Pick Sample Photos -->
              <div class="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div class="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                  <i data-lucide="sparkles" class="w-3.5 h-3.5 text-amber-500"></i>
                  <span>Quick Pick Ready Photos (Click any to use):</span>
                </div>
                <div class="flex flex-wrap gap-2 text-xs">
                  <button type="button" onclick="app.addSamplePhoto('https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=700', 'Camera')" class="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-emerald-500 text-slate-700 hover:text-emerald-700 transition flex items-center gap-1 text-[11px] font-medium shadow-sm">
                    📷 Camera
                  </button>
                  <button type="button" onclick="app.addSamplePhoto('https://images.unsplash.com/photo-1504148455328-c376907d081c?w=700', 'Drill')" class="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-emerald-500 text-slate-700 hover:text-emerald-700 transition flex items-center gap-1 text-[11px] font-medium shadow-sm">
                    🔨 Power Drill
                  </button>
                  <button type="button" onclick="app.addSamplePhoto('https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=700', 'Projector')" class="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-emerald-500 text-slate-700 hover:text-emerald-700 transition flex items-center gap-1 text-[11px] font-medium shadow-sm">
                    📽️ Projector
                  </button>
                  <button type="button" onclick="app.addSamplePhoto('https://images.unsplash.com/photo-1510312305653-8ed496efae75?w=700', 'Camping Tent')" class="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-emerald-500 text-slate-700 hover:text-emerald-700 transition flex items-center gap-1 text-[11px] font-medium shadow-sm">
                    ⛺ Camping Tent
                  </button>
                  <button type="button" onclick="app.addSamplePhoto('https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=700', 'Electronics')" class="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-emerald-500 text-slate-700 hover:text-emerald-700 transition flex items-center gap-1 text-[11px] font-medium shadow-sm">
                    🔌 Electronics
                  </button>
                  <button type="button" onclick="app.addSamplePhoto('https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=700', 'Books')" class="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-emerald-500 text-slate-700 hover:text-emerald-700 transition flex items-center gap-1 text-[11px] font-medium shadow-sm">
                    📚 Books
                  </button>
                </div>
              </div>

              <!-- Optional Paste Link (Using text input, NEVER url type) -->
              <details class="text-xs text-slate-600 bg-white border border-slate-200 rounded-xl p-3">
                <summary class="font-medium cursor-pointer text-slate-700 hover:text-emerald-700 flex items-center justify-between">
                  <span>Optional: Paste an image link from web</span>
                  <span class="text-[10px] text-slate-400">Click to expand</span>
                </summary>
                <div class="mt-3 flex gap-2">
                  <input 
                    type="text" 
                    id="post-photo-url-input" 
                    placeholder="e.g. https://images.unsplash.com/... or paste image link" 
                    class="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-emerald-500" 
                  />
                  <button 
                    type="button" 
                    onclick="app.addPhotoFromUrlInput()" 
                    class="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-xs shrink-0"
                  >
                    Add Link
                  </button>
                </div>
              </details>

            </div>
          </div>

          <!-- 4. Location & Privacy Protocol -->
          <div>
            <h3 class="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 mb-4 flex items-center gap-2">
              <span class="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-xs flex items-center justify-center font-bold">4</span>
              <span>Location & Privacy Safeguards</span>
            </h3>

            <div class="space-y-4">
              <!-- Public neighborhood -->
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">
                  Public Neighborhood / City Area * 
                  <span class="text-emerald-700 font-normal">(Shown publicly on map & discovery)</span>
                </label>
                <input 
                  type="text" 
                  id="post-location-name" 
                  required
                  value="${user.location_name || 'Hitech City'}"
                  placeholder="e.g. Madhapur, Jubilee Hills, Gachibowli"
                  class="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>

              <!-- Strictly Private Pickup details -->
              <div class="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-3">
                <div class="flex items-center gap-2 text-xs font-bold text-amber-900">
                  <i data-lucide="lock" class="w-4 h-4 text-amber-700"></i>
                  <span>Private Handover Details (Revealed ONLY after approved booking)</span>
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-700 mb-1">Exact Street Address / Building Unit *</label>
                  <input 
                    type="text" 
                    id="post-exact-address" 
                    required
                    value="${user.address_pickup || ''}"
                    placeholder="e.g. Villa 14, Silicon Springs, Road 2"
                    class="w-full text-xs sm:text-sm bg-white border border-amber-300 rounded-xl p-3 text-slate-900 focus:outline-none focus:border-amber-600"
                  />
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-700 mb-1">Collection Instructions for Renter *</label>
                  <textarea 
                    id="post-instructions" 
                    rows="2" 
                    required
                    placeholder="e.g. Available for pickup between 9 AM - 7 PM. Gate passcode is 1234 or call on arrival."
                    class="w-full text-xs sm:text-sm bg-white border border-amber-300 rounded-xl p-3 text-slate-900 focus:outline-none focus:border-amber-600"
                  >Ring the doorbell or inform security at reception for item handover.</textarea>
                </div>
              </div>
            </div>
          </div>

          <!-- Submit Notice & Button -->
          <div class="pt-4 border-t border-slate-200">
            <div class="p-4 rounded-2xl bg-slate-50 border border-slate-200 mb-5 text-xs text-slate-600 flex items-start gap-3">
              <i data-lucide="info" class="w-4 h-4 text-brand-600 shrink-0 mt-0.5"></i>
              <span>
                <strong>Moderation Protocol:</strong> Once submitted, your item will be held in <strong>PENDING</strong> status until our Admin team reviews and approves it. You will receive an immediate in-app notification upon approval.
              </span>
            </div>

            <button 
              type="submit" 
              id="btn-submit-post"
              class="w-full py-3.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-md shadow-brand-600/30 transition transform active:scale-95 flex items-center justify-center gap-2"
            >
              <i data-lucide="check-circle" class="w-4 h-4"></i>
              <span>Submit Item for Admin Moderation</span>
            </button>
          </div>

        </form>
      </div>

    </div>
  `;

  window._postItemImages = ['https://images.unsplash.com/photo-1581291518655-9523c932deb4?w=700'];
  app.renderPostItemPhotoPreviews();
  lucide.createIcons();
}
