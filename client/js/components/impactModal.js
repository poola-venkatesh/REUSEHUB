async function openImpactMethodologyModal() {
  const container = document.getElementById('modal-container');
  container.classList.remove('hidden');

  container.innerHTML = `
    <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div class="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 max-h-[90vh] overflow-y-auto">
        
        <div class="flex items-center justify-between border-b border-slate-100 pb-4">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <i data-lucide="leaf" class="w-5 h-5"></i>
            </div>
            <div>
              <h2 class="text-lg font-black text-slate-900">Platform Reuse Impact Methodology</h2>
              <p class="text-xs text-slate-500">Transparent science-backed environmental calculation formulas</p>
            </div>
          </div>
          <button onclick="app.closeModal()" class="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100">
            <i data-lucide="x" class="w-5 h-5"></i>
          </button>
        </div>

        <div class="space-y-4 text-xs text-slate-600 leading-relaxed">
          <div class="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-950 font-medium">
            <strong>Core Principle:</strong> RENT & REUSE strictly uses factual platform metrics derived from real database transactions that have successfully completed both Handover and Return OTP verification.
          </div>

          <div class="space-y-3">
            <div class="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <h4 class="font-bold text-slate-900 text-sm mb-1">1. Life Cycle Assessment (LCA) Embodied Carbon</h4>
              <p class="mb-2">
                Manufacturing, packaging, and transporting consumer products generates substantial greenhouse gas emissions (embodied carbon). When a user borrows a product instead of buying new, that product's manufacturing footprint is deferred.
              </p>
              <div class="bg-white p-2.5 rounded-xl border border-slate-200 font-mono text-[11px] text-slate-700">
                Total CO2e Saved = Σ (Completed Rentals in Category × Category Benchmark LCA kg CO2e)
              </div>
            </div>

            <div class="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <h4 class="font-bold text-slate-900 text-sm mb-1">2. Category Embodied Carbon Benchmarks</h4>
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] pt-1">
                <div class="p-2 bg-white rounded-lg border border-slate-100"><strong>Electronics:</strong> 45.0 kg CO2e</div>
                <div class="p-2 bg-white rounded-lg border border-slate-100"><strong>Industrial:</strong> 65.0 kg CO2e</div>
                <div class="p-2 bg-white rounded-lg border border-slate-100"><strong>Automotive:</strong> 55.0 kg CO2e</div>
                <div class="p-2 bg-white rounded-lg border border-slate-100"><strong>Tools:</strong> 18.0 kg CO2e</div>
                <div class="p-2 bg-white rounded-lg border border-slate-100"><strong>Agricultural:</strong> 40.0 kg CO2e</div>
                <div class="p-2 bg-white rounded-lg border border-slate-100"><strong>Household:</strong> 12.0 kg CO2e</div>
                <div class="p-2 bg-white rounded-lg border border-slate-100"><strong>Sports:</strong> 14.0 kg CO2e</div>
                <div class="p-2 bg-white rounded-lg border border-slate-100"><strong>Events:</strong> 20.0 kg CO2e</div>
                <div class="p-2 bg-white rounded-lg border border-slate-100"><strong>Fashion:</strong> 8.5 kg CO2e</div>
                <div class="p-2 bg-white rounded-lg border border-slate-100"><strong>Student:</strong> 6.0 kg CO2e</div>
                <div class="p-2 bg-white rounded-lg border border-slate-100"><strong>Books/Media:</strong> 2.5 kg CO2e</div>
                <div class="p-2 bg-white rounded-lg border border-slate-100"><strong>Other:</strong> 10.0 kg CO2e</div>
              </div>
            </div>

            <div class="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <h4 class="font-bold text-slate-900 text-sm mb-1">3. Landfill Waste Diversion</h4>
              <p>
                Calculated by multiplying each completed exchange by the physical mass of packaging and end-of-life materials kept from municipal solid waste streams.
              </p>
            </div>
          </div>

        </div>

        <div class="text-right pt-2 border-t border-slate-100">
          <button onclick="app.closeModal()" class="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs">
            Close
          </button>
        </div>

      </div>
    </div>
  `;

  lucide.createIcons();
}
