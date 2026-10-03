let authModalState = {
  mode: 'login', // 'login', 'signup', 'otp'
  pendingUserId: null,
  pendingMobile: '',
  devOtpCode: ''
};

function openAuthModal(mode = 'login', pendingData = null) {
  authModalState.mode = mode;
  if (pendingData) {
    authModalState.pendingUserId = pendingData.userId || null;
    authModalState.pendingMobile = pendingData.mobile || '';
    authModalState.devOtpCode = pendingData.devOtp || '';
  }

  const container = document.getElementById('modal-container');
  container.classList.remove('hidden');

  renderAuthModalContent();
}

function openAdminLoginModal() {
  authModalState.mode = 'admin-login';
  const container = document.getElementById('modal-container');
  container.classList.remove('hidden');
  renderAuthModalContent();
}

function renderAuthModalContent() {
  const container = document.getElementById('modal-container');

  if (authModalState.mode === 'otp') {
    container.innerHTML = `
      <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 text-center space-y-5">
          
          <img src="/images/logo.png" alt="REUSEHUB Logo" class="w-14 h-14 rounded-2xl object-contain bg-white p-1 border border-emerald-500/20 shadow-sm mx-auto" />

          <div>
            <h2 class="text-xl font-black text-slate-900">Verify Mobile Number</h2>
            <p class="text-xs text-slate-500 mt-1">
              We sent a 6-digit verification code to <strong>${authModalState.pendingMobile}</strong>
            </p>
          </div>

          ${authModalState.devOtpCode ? `
            <!-- Dev Quick-Fill Code Badge for Testing Convenience -->
            <div class="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 text-left flex items-center justify-between">
              <div>
                <span class="font-bold block">🔑 Dev OTP Code:</span>
                <span class="font-mono text-base font-black text-amber-800">${authModalState.devOtpCode}</span>
              </div>
              <button 
                type="button" 
                onclick="document.getElementById('otp-code-input').value = '${authModalState.devOtpCode}'" 
                class="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm"
              >
                Auto-Fill
              </button>
            </div>
          ` : ''}

          <form onsubmit="app.handleOtpSubmit(event)" class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1.5 text-left">Enter 6-Digit Code</label>
              <input 
                type="text" 
                id="otp-code-input"
                maxlength="6"
                required
                value="${authModalState.devOtpCode || ''}"
                placeholder="••••••"
                class="w-full text-center text-2xl font-mono font-bold tracking-widest p-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-emerald-600 focus:bg-white text-slate-900"
              />
            </div>

            <button 
              type="submit" 
              class="w-full py-3.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-md shadow-brand-600/30 transition transform active:scale-95"
            >
              Verify & Activate Account
            </button>
          </form>

          <div class="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <button onclick="app.handleResendOtp()" class="text-brand-600 hover:text-brand-800 font-semibold">Resend Code</button>
            <button onclick="app.closeModal()" class="text-slate-400 hover:text-slate-600">Cancel</button>
          </div>

        </div>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  // Dedicated Admin Login Mode
  if (authModalState.mode === 'admin-login') {
    container.innerHTML = `
      <div class="fixed inset-0 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-slate-900 text-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-amber-900/60 space-y-6">
          
          <div class="flex items-center justify-between border-b border-slate-800 pb-4">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                <i data-lucide="shield-alert" class="w-5 h-5"></i>
              </div>
              <div>
                <h2 class="text-lg font-black text-amber-300">System Admin Portal</h2>
                <p class="text-xs text-slate-400">Strictly restricted to authorized administrator</p>
              </div>
            </div>
            <button onclick="app.closeModal()" class="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800">
              <i data-lucide="x" class="w-5 h-5"></i>
            </button>
          </div>

          <div class="p-3 bg-amber-950/40 rounded-2xl border border-amber-800/40 text-xs text-amber-200/90 flex items-start gap-2.5">
            <i data-lucide="lock" class="w-4 h-4 text-amber-400 shrink-0 mt-0.5"></i>
            <span>This gateway is reserved for the single platform administrator. Normal users cannot sign in here.</span>
          </div>

          <form onsubmit="app.handleAdminLoginSubmit(event)" class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1">Administrator Email *</label>
              <input 
                type="email" 
                id="admin-login-identifier" 
                required 
                placeholder="admin@rentandreuse.com" 
                class="w-full text-xs bg-slate-800 border border-slate-700 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1">Password *</label>
              <input 
                type="password" 
                id="admin-login-password" 
                required 
                placeholder="••••••••" 
                class="w-full text-xs bg-slate-800 border border-slate-700 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <button 
              type="submit" 
              class="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition transform active:scale-95"
            >
              Authenticate Administrator →
            </button>
          </form>

          <div class="text-center pt-2 border-t border-slate-800 text-xs text-slate-400">
            <span>Normal community user?</span>
            <button onclick="authModalState.mode = 'login'; renderAuthModalContent()" class="font-bold text-emerald-400 hover:text-emerald-300 ml-1">
              Switch to User Login
            </button>
          </div>

        </div>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  // Normal User Login or Signup Form
  const isLogin = authModalState.mode === 'login';

  container.innerHTML = `
    <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div class="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 max-h-[90vh] overflow-y-auto">
        
        <div class="flex items-center justify-between border-b border-slate-100 pb-4">
          <div class="flex items-center gap-3">
            <img src="/images/logo.png" alt="REUSEHUB Logo" class="w-10 h-10 rounded-xl object-contain bg-white p-0.5 border border-emerald-500/20 shadow-sm" />
            <div>
              <h2 class="text-lg font-black text-slate-900">${isLogin ? 'Welcome to REUSEHUB' : 'Create Verified Account'}</h2>
              <p class="text-xs text-slate-500">${isLogin ? 'Log in to rent, borrow, or manage your items' : 'Join our trusted reuse community'}</p>
            </div>
          </div>
          <button onclick="app.closeModal()" class="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100">
            <i data-lucide="x" class="w-5 h-5"></i>
          </button>
        </div>

        <form onsubmit="${isLogin ? 'app.handleLoginSubmit(event)' : 'app.handleSignupSubmit(event)'}" class="space-y-4">
          
          ${!isLogin ? `
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
              <input 
                type="text" 
                id="signup-name" 
                required 
                placeholder="e.g. Priya Sharma" 
                class="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
              />
            </div>
          ` : ''}

          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">${isLogin ? 'Mobile Number or Email *' : 'Email Address *'}</label>
            <input 
              type="${isLogin ? 'text' : 'email'}" 
              id="${isLogin ? 'login-identifier' : 'signup-email'}" 
              required 
              placeholder="${isLogin ? 'e.g. user@example.com or +9198...' : 'your.email@example.com'}" 
              class="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
            />
          </div>

          ${!isLogin ? `
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Mobile Number (Mandatory OTP Verification) *</label>
              <input 
                type="tel" 
                id="signup-mobile" 
                required 
                placeholder="+919876543210" 
                class="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
              />
              <span class="text-[10px] text-slate-400 mt-0.5 block">Never displayed publicly to strangers.</span>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">City Neighborhood *</label>
              <input 
                type="text" 
                id="signup-location" 
                required 
                placeholder="e.g. Madhapur, Jubilee Hills" 
                class="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Private Street Address (Kept strictly private) *</label>
              <input 
                type="text" 
                id="signup-pickup" 
                required 
                placeholder="Villa 14, Silicon Springs, Rd 2" 
                class="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
              />
            </div>
          ` : ''}

          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Password *</label>
            <input 
              type="password" 
              id="${isLogin ? 'login-password' : 'signup-password'}" 
              required 
              placeholder="••••••••" 
              class="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
            />
          </div>

          <button 
            type="submit" 
            class="w-full py-3.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md shadow-brand-600/30 transition transform active:scale-95"
          >
            ${isLogin ? 'Sign In' : 'Continue to Mobile Verification →'}
          </button>

        </form>

        <div class="text-center pt-2 border-t border-slate-100 text-xs text-slate-500 space-y-2">
          <div>
            ${isLogin ? `
              <span>Don't have an account?</span>
              <button onclick="authModalState.mode = 'signup'; renderAuthModalContent()" class="font-bold text-brand-600 hover:text-brand-800 ml-1">Sign up</button>
            ` : `
              <span>Already have an account?</span>
              <button onclick="authModalState.mode = 'login'; renderAuthModalContent()" class="font-bold text-brand-600 hover:text-brand-800 ml-1">Log in</button>
            `}
          </div>
          ${isLogin ? `
            <div class="pt-1.5 border-t border-slate-100">
              <button onclick="authModalState.mode = 'admin-login'; renderAuthModalContent()" class="text-[11px] text-amber-700 hover:text-amber-900 font-semibold flex items-center justify-center gap-1 mx-auto">
                <i data-lucide="shield-alert" class="w-3.5 h-3.5 text-amber-600"></i>
                <span>System Administrator Access Portal →</span>
              </button>
            </div>
          ` : ''}
        </div>

      </div>
    </div>
  `;

  lucide.createIcons();
}
