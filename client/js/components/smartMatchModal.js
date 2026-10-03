function openSmartMatchModal(initialQuery = '') {
  const container = document.getElementById('modal-container');
  container.classList.remove('hidden');

  container.innerHTML = `
    <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div class="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 max-h-[90vh] overflow-y-auto">
        
        <div class="flex items-center justify-between border-b border-slate-100 pb-4">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-500/20">
              <i data-lucide="sparkles" class="w-5 h-5"></i>
            </div>
            <div>
              <h2 class="text-lg font-black text-slate-900">Natural-Language Smart Match</h2>
              <p class="text-xs text-slate-500">Ask in everyday English — we match item, location, availability, duration & budget</p>
            </div>
          </div>
          <button onclick="app.closeModal()" class="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100">
            <i data-lucide="x" class="w-5 h-5"></i>
          </button>
        </div>

        <!-- Input Query Form -->
        <form onsubmit="app.executeSmartMatch(event)" class="space-y-3">
          <div class="relative">
            <textarea 
              id="smart-match-input" 
              rows="2"
              placeholder="e.g. 'Need a projector for 2 days within 5 km' or 'Looking for a lawn mower under $20'"
              class="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-900 font-medium focus:outline-none focus:border-emerald-600 focus:bg-white resize-none"
            >${initialQuery}</textarea>
          </div>

          <div class="flex items-center justify-between">
            <div class="flex items-center gap-1.5 text-[11px] text-slate-500">
              <span>Try:</span>
              <button type="button" onclick="document.getElementById('smart-match-input').value = 'Need a projector for 2 days within 5 km'; app.executeSmartMatch(event)" class="text-emerald-700 hover:underline">Projector 2 days 5km</button> •
              <button type="button" onclick="document.getElementById('smart-match-input').value = 'Camping tent to borrow for 2 days'; app.executeSmartMatch(event)" class="text-emerald-700 hover:underline">Tent (borrow)</button>
            </div>

            <button type="submit" class="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md shadow-brand-600/30 flex items-center gap-1.5 transition">
              <i data-lucide="search" class="w-4 h-4"></i>
              <span>Find Matches</span>
            </button>
          </div>
        </form>

        <!-- Parsed Tokens Preview Area -->
        <div id="smart-parsed-preview" class="hidden p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs">
          <!-- Rendered dynamically -->
        </div>

        <!-- Ranked Results Area -->
        <div id="smart-match-results" class="space-y-4">
          <!-- Rendered dynamically -->
        </div>

      </div>
    </div>
  `;

  lucide.createIcons();
  if (initialQuery) {
    app.executeSmartMatch();
  }
}
