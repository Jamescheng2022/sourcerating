import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 antialiased">
      {/* NAV */}
      <nav className="fixed top-0 z-50 flex w-full items-center justify-between border-b border-slate-100 bg-white/90 px-6 py-4 backdrop-blur-xl md:px-10">
        <a href="#" className="flex items-center gap-2.5 text-xl font-extrabold tracking-tight text-slate-900">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-emerald-500 text-lg text-white">
            ‚ú?
          </div>
          sourcerating
        </a>
        <div className="hidden items-center gap-8 md:flex">
          <a href="#" className="text-[0.92rem] font-medium text-slate-500 transition hover:text-blue-600">How It Works</a>
          <a href="#" className="text-[0.92rem] font-medium text-slate-500 transition hover:text-blue-600">Pricing</a>
          <a href="#" className="text-[0.92rem] font-medium text-slate-500 transition hover:text-blue-600">For Suppliers</a>
          <a href="#" className="text-[0.92rem] font-medium text-slate-500 transition hover:text-blue-600">Resources</a>
        </div>
        <div className="flex items-center gap-3">
          <button className="hidden px-5 py-2 text-[0.9rem] font-semibold text-slate-900 md:block">Log In</button>
          <button className="rounded-lg bg-blue-600 px-6 py-2.5 text-[0.9rem] font-semibold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-700 hover:shadow-blue-600/40">
            Verify a Supplier ‚Ü?
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section className="mx-auto flex max-w-7xl flex-col items-center gap-16 px-6 pb-20 pt-32 md:flex-row md:px-10 md:pt-40">
        <div className="flex-1">
          <h1 className="text-5xl font-black leading-[1.1] tracking-tight text-slate-900 lg:text-6xl">
            Verify Chinese Suppliers <span className="bg-gradient-to-br from-blue-600 to-emerald-500 bg-clip-text text-transparent">Before You Pay</span>
          </h1>
          <p className="mt-6 max-w-lg text-[1.15rem] leading-relaxed text-slate-500">
            AI-powered credit scoring for Chinese manufacturers. Get a verified TrustScore‚Ñ?in 5 minutes ‚Ä?no factory visit required. Powered by <span className="font-semibold text-blue-600">sourcerating.com</span> data.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <button className="rounded-xl bg-blue-600 px-8 py-4 text-lg font-bold text-white shadow-xl shadow-blue-600/35 transition hover:-translate-y-0.5 hover:shadow-blue-600/45">
              Check a Supplier Free ‚Ü?
            </button>
            <button className="rounded-xl bg-slate-100 px-8 py-4 text-lg font-bold text-slate-900 transition hover:bg-slate-200">
              Watch Demo
            </button>
          </div>
          <div className="mt-10 flex gap-9">
            <div>
              <div className="text-3xl font-extrabold text-slate-900">12,000+</div>
              <div className="mt-0.5 text-[0.82rem] text-slate-400 uppercase tracking-wide">Verified Suppliers</div>
            </div>
            <div>
              <div className="text-3xl font-extrabold text-slate-900">$29</div>
              <div className="mt-0.5 text-[0.82rem] text-slate-400 uppercase tracking-wide">Starting Price</div>
            </div>
            <div>
              <div className="text-3xl font-extrabold text-slate-900">5 min</div>
              <div className="mt-0.5 text-[0.82rem] text-slate-400 uppercase tracking-wide">Instant Report</div>
            </div>
          </div>
        </div>
        
        <div className="relative w-full max-w-md flex-1">
          <div className="relative overflow-hidden rounded-[2.5rem] bg-white p-8 shadow-2xl ring-1 ring-slate-100">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-emerald-500"></div>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-lg font-bold text-slate-900">Zhejiang Hengtong Steel Co., Ltd</div>
                <div className="mt-1 text-[0.82rem] text-slate-400">üìç Hangzhou, Zhejiang ¬∑ Est. 2014</div>
              </div>
              <div className="rounded-full bg-emerald-50 px-3.5 py-1.5 text-[0.82rem] font-bold text-emerald-600">
                ‚ú?Verified
              </div>
            </div>
            
            <div className="relative my-6 flex h-32 w-32 items-center justify-center rounded-full mx-auto">
                <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="#f1f5f9" strokeWidth="8" />
                    <circle cx="50" cy="50" r="45" fill="none" stroke="#2563eb" strokeWidth="8" strokeDasharray="282.7" strokeDashoffset="65" strokeLinecap="round" transform="rotate(-90 50 50)" />
                </svg>
                <div className="text-4xl font-black text-blue-600">77</div>
            </div>
            <div className="text-center text-[0.85rem] font-medium text-slate-500">TrustScore‚Ñ?¬∑ Grade B+</div>
            
            <div className="mt-6 grid grid-cols-2 gap-3">
              {[
                { name: "Identity", score: "22 / 25", color: "bg-blue-600", width: "88%" },
                { name: "Compliance", score: "19 / 25", color: "bg-purple-500", width: "76%" },
                { name: "Trade", score: "24 / 30", color: "bg-amber-500", width: "80%" },
                { name: "Reputation", score: "12 / 20", color: "bg-emerald-500", width: "60%" }
              ].map((stage) => (
                <div key={stage.name} className="rounded-xl bg-slate-50 p-3">
                  <div className="text-[0.72rem] font-bold tracking-wider text-slate-400 uppercase">{stage.name}</div>
                  <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                    <div className={`h-full ${stage.color} rounded-full`} style={{ width: stage.width }}></div>
                  </div>
                  <div className="mt-1 text-[0.78rem] font-bold text-slate-900">{stage.score}</div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="absolute -top-3 -right-5 animate-bounce rounded-xl bg-white px-4 py-2.5 text-[0.82rem] font-bold shadow-xl ring-1 ring-slate-100">
            üõ°Ô∏?ISO 9001 Verified
          </div>
          <div className="absolute bottom-10 -left-8 animate-bounce delay-700 rounded-xl bg-white px-4 py-2.5 text-[0.82rem] font-bold shadow-xl ring-1 ring-slate-100">
            üö¢ 156 Shipments / Year
          </div>
        </div>
      </section>

      {/* TRUST BAR */}
      <div className="border-y border-slate-100 bg-slate-50 py-12">
        <div className="mx-auto max-w-5xl px-6 text-center">
          <p className="text-[0.85rem] font-bold uppercase tracking-[0.2em] text-slate-400">Trusted by procurement teams worldwide</p>
          <div className="mt-8 flex flex-wrap justify-center items-center gap-x-12 gap-y-8 opacity-40 grayscale">
            {["BOSCH", "SIEMENS", "PHILIPS", "SCHNEIDER", "ABB", "HONEYWELL"].map(logo => (
              <span key={logo} className="text-2xl font-black text-slate-600">{logo}</span>
            ))}
          </div>
        </div>
      </div>

      {/* PROBLEM SECTION */}
      <section className="mx-auto max-w-6xl px-6 py-24 md:px-10">
        <span className="inline-block rounded-full bg-red-50 px-4 py-1.5 text-[0.78rem] font-bold uppercase tracking-widest text-red-600">The Problem</span>
        <h2 className="mt-4 text-4xl font-black leading-tight tracking-tight text-slate-900 md:text-5xl">
            Sourcing from China?<br />You're Flying Blind.
        </h2>
        <p className="mt-4 max-w-xl text-lg text-slate-500">
            15-20% of first-time international buyers get scammed. The rest waste thousands on factory visits that could be avoided.
        </p>
        
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            { icon: "üé≠", stat: "15-20%", title: "Fraud Rate", desc: "First-time buyers face a 15-20% scam rate. Trading companies pose as factories. Fake certifications everywhere." },
            { icon: "üí∏", stat: "$5,000+", title: "Verification Cost", desc: "Traditional factory audit costs $2,000-$10,000 per visit. Flights, hotels, translators, lost time ‚Ä?for each supplier." },
            { icon: "üîí", stat: "Blocked", title: "Data Wall", desc: "Chinese business registries are in Chinese only and often blocked overseas. You can't access critical data." }
          ].map((item) => (
            <div key={item.title} className="group rounded-2xl border border-slate-100 bg-white p-8 transition hover:-translate-y-1 hover:shadow-2xl hover:shadow-slate-200/50">
              <div className="text-4xl">{item.icon}</div>
              <div className="mt-4 text-3xl font-black text-red-600">{item.stat}</div>
              <h3 className="mt-2 text-xl font-bold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-[0.88rem] leading-relaxed text-slate-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-slate-950 px-6 py-24 text-white md:px-10">
        <div className="mx-auto max-w-6xl">
          <span className="inline-block rounded-full bg-blue-500/10 px-4 py-1.5 text-[0.78rem] font-bold uppercase tracking-widest text-blue-400">How TrustScore‚Ñ?Works</span>
          <h2 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">4-Stage Verification.<br />Evidence Over Opinions.</h2>
          <p className="mt-4 max-w-xl text-lg text-slate-400">Unlike review platforms, 80% of our score comes from hard evidence ‚Ä?not user ratings.</p>
          
          <div className="mt-16 grid gap-12 md:grid-cols-4 relative">
            <div className="absolute top-11 left-12 right-12 hidden h-0.5 bg-gradient-to-r from-blue-600 via-purple-600 via-amber-600 to-emerald-600 md:block opacity-20"></div>
            {[
              { pts: 25, title: "Identity", desc: "Business license verification, legal rep, capital, address validation", tag: "‚ö?Fully Automated", tagColor: "text-emerald-400 bg-emerald-400/10", border: "border-blue-600" },
              { pts: 25, title: "Compliance", desc: "ISO/CE certificates verified via OCR + issuer cross-check, IP portfolio", tag: "ü§ñ AI Verified", tagColor: "text-purple-400 bg-purple-400/10", border: "border-purple-600" },
              { pts: 30, title: "Trade", desc: "Customs shipment frequency, export volume, client portfolio quality", tag: "üìä Data-Driven", tagColor: "text-amber-400 bg-amber-400/10", border: "border-amber-600" },
              { pts: 20, title: "Reputation", desc: "Transaction-verified buyer reviews only, dispute rate, response speed", tag: "‚ú?Proof Required", tagColor: "text-blue-400 bg-blue-400/10", border: "border-emerald-600" }
            ].map((stage, idx) => (
              <div key={stage.title} className="relative z-10 text-center">
                <div className={`mx-auto mb-6 flex h-24 w-24 flex-col items-center justify-center rounded-full border-2 bg-slate-900 ${stage.border}`}>
                  <div className="text-3xl font-black">{stage.pts}</div>
                  <div className="text-[0.7rem] font-bold uppercase opacity-50">points</div>
                </div>
                <h3 className="text-lg font-bold">{stage.title}</h3>
                <p className="mt-2 text-[0.82rem] leading-relaxed text-slate-400">{stage.desc}</p>
                <div className={`mt-4 inline-block rounded-full px-3 py-1 text-[0.72rem] font-bold ${stage.tagColor}`}>{stage.tag}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="mx-auto max-w-6xl px-6 py-24 md:px-10">
        <div className="text-center">
          <span className="inline-block rounded-full bg-emerald-50 px-4 py-1.5 text-[0.78rem] font-bold uppercase tracking-widest text-emerald-600">Simple Pricing</span>
          <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-900 md:text-5xl">One Report. Full Clarity.</h2>
          <p className="mt-4 text-slate-500">Start with a free basic check. Upgrade when you need the full picture.</p>
        </div>
        
        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {[
            { tier: "Basic", price: "$29", desc: "Quick identity & compliance check for initial screening.", features: ["Business license verification", "Company registration details", "Basic compliance check", "Identity Score (Stage 1+2)", "PDF report delivered"] },
            { tier: "Standard", price: "$79", desc: "Full verification with trade data analysis. Best for serious sourcing.", featured: true, features: ["Everything in Basic", "Customs shipment analysis", "Export trend & client quality", "AI risk assessment", "TrustScore‚Ñ?(Stage 1-3)", "Competitor comparison"] },
            { tier: "Deep Dive", price: "$199", desc: "Comprehensive due diligence for high-value partnerships.", features: ["Everything in Standard", "Full 4-Stage TrustScore‚Ñ?, "Buyer-verified reviews", "Industry benchmarking", "Recommended sourcing strategy", "30-day monitoring included"] }
          ].map((plan) => (
            <div key={plan.tier} className={`relative rounded-3xl border p-10 transition hover:shadow-2xl ${plan.featured ? "border-blue-600 shadow-xl shadow-blue-600/10 ring-1 ring-blue-600" : "border-slate-100"}`}>
              {plan.featured && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-4 py-1 text-[0.7rem] font-black tracking-widest text-white">MOST POPULAR</div>
              )}
              <div className="text-[0.85rem] font-bold uppercase tracking-widest text-slate-400">{plan.tier}</div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-5xl font-black text-slate-900">{plan.price}</span>
                <span className="text-[0.85rem] font-medium text-slate-400">/ report</span>
              </div>
              <p className="mt-4 text-[0.88rem] leading-relaxed text-slate-500">{plan.desc}</p>
              <ul className="mt-8 space-y-4">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-3 text-[0.88rem] font-medium text-slate-600">
                    <span className="text-emerald-500">‚ú?/span> {f}
                  </li>
                ))}
              </ul>
              <button className={`mt-10 w-full rounded-xl py-4 text-[0.95rem] font-bold transition ${plan.featured ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-white border border-slate-200 text-slate-900 hover:border-blue-600 hover:text-blue-600"}`}>
                Get {plan.tier} Report
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-br from-slate-900 to-slate-800 px-6 py-24 text-center text-white md:px-10">
        <h2 className="text-4xl font-black tracking-tight md:text-5xl">Don't Trust. Verify.</h2>
        <p className="mt-6 mx-auto max-w-lg text-lg text-slate-400">Stop gambling with your supply chain. Get the facts in 5 minutes via <span className="text-blue-400 font-semibold">sourcerating.com</span>.</p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <button className="rounded-xl bg-blue-600 px-8 py-4 text-lg font-bold text-white shadow-xl shadow-blue-600/35 transition hover:-translate-y-0.5 hover:shadow-blue-600/45">
            Verify Your First Supplier Free ‚Ü?
          </button>
          <button className="rounded-xl border border-white/10 bg-white/5 px-8 py-4 text-lg font-bold text-white transition hover:bg-white/10">
            Talk to Sales
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-950 px-6 py-20 text-slate-400 md:px-10">
        <div className="mx-auto grid max-w-7xl gap-12 md:grid-cols-4">
          <div className="col-span-1 md:col-span-1">
            <a href="#" className="flex items-center gap-2.5 text-xl font-extrabold tracking-tight text-white">
              <div className="flex h-7 w-7 items-center justify-center rounded bg-gradient-to-br from-blue-600 to-emerald-500 text-sm text-white">‚ú?/div>
              sourcerating
            </a>
            <p className="mt-6 text-[0.85rem] leading-relaxed">
              AI-powered Chinese supplier verification for global procurement teams. Making cross-border trade transparent, safe, and efficient. Part of the <a href="https://sourcerating.com" className="text-blue-400 hover:underline">sourcerating.com</a> network.
            </p>
          </div>
          {[
            { title: "Product", links: ["How It Works", "Pricing", "API Access", "For Suppliers"] },
            { title: "Resources", links: ["Sourcing Guide", "Blog", "Case Studies", "Help Center"] },
            { title: "Company", links: ["About Us", "Contact", "Privacy Policy", "Terms of Service"] }
          ].map(col => (
            <div key={col.title}>
              <h4 className="text-[0.78rem] font-bold uppercase tracking-widest text-slate-200">{col.title}</h4>
              <ul className="mt-6 space-y-4">
                {col.links.map(link => (
                  <li key={link}><a href="#" className="text-[0.88rem] transition hover:text-white">{link}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mx-auto mt-20 flex max-w-7xl flex-col items-center justify-between border-t border-slate-900 pt-8 text-[0.8rem] md:flex-row">
          <p>¬© 2026 sourcerating / sourcerating.com. All rights reserved.</p>
          <p className="mt-4 md:mt-0 font-medium">Don't Trust. Verify.‚Ñ?/p>
        </div>
      </footer>
    </div>
  );
}

