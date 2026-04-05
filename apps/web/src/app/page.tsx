import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 antialiased">
      {/* NAV */}
      <nav className="fixed top-0 z-50 flex w-full items-center justify-between border-b border-slate-100 bg-white/90 px-6 py-4 backdrop-blur-xl md:px-10">
        <a href="/" className="flex items-center gap-2.5 text-xl font-extrabold tracking-tight text-slate-900">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-emerald-500 text-lg text-white">
            🔍
          </div>
          sourcerating
        </a>
        <div className="hidden items-center gap-8 md:flex">
          <a href="#" className="text-[0.92rem] font-medium text-slate-500 transition hover:text-blue-600">How It Works</a>
          <a href="#" className="text-[0.92rem] font-medium text-slate-500 transition hover:text-blue-600">Pricing</a>
          <a href="#" className="text-[0.92rem] font-medium text-slate-500 transition hover:text-blue-600">For Suppliers</a>
        </div>
        <div className="flex items-center gap-3">
          <button className="hidden px-5 py-2 text-[0.9rem] font-semibold text-slate-900 md:block">Log In</button>
          <a href="/demo" className="rounded-lg bg-blue-600 px-6 py-2.5 text-[0.9rem] font-semibold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-700 hover:shadow-blue-600/40">
            Check Your Supplier’s Score - It’s Free
          </a>
        </div>
      </nav>

      {/* HERO */}
      <section className="mx-auto flex max-w-7xl flex-col items-center gap-16 px-6 pb-20 pt-32 md:flex-row md:px-10 md:pt-40">
        <div className="flex-1">
          <h1 className="text-5xl font-black leading-[1.1] tracking-tight text-slate-900 lg:text-7xl">
            Stop Guessing. <br />
            <span className="bg-gradient-to-br from-blue-600 to-emerald-500 bg-clip-text text-transparent">Start Rating.</span>
          </h1>
          <p className="mt-6 max-w-lg text-[1.25rem] leading-relaxed text-slate-500">
            The world's first AI-driven supplier credit infrastructure. We don't ask suppliers for their story—we listen to their data.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <a href="/demo" className="rounded-xl bg-blue-600 px-8 py-4 text-lg font-bold text-white shadow-xl shadow-blue-600/35 transition hover:-translate-y-0.5 hover:shadow-blue-600/45">
              Check Your Supplier’s Score →
            </a>
            <button className="rounded-xl bg-slate-900 px-8 py-4 text-lg font-bold text-white transition hover:bg-slate-800">
              Get Beta Access
            </button>
          </div>
          <div className="mt-12 flex gap-9 border-t border-slate-100 pt-8">
            <div>
              <div className="text-3xl font-extrabold text-slate-900">1M+</div>
              <div className="mt-0.5 text-[0.82rem] text-slate-400 uppercase tracking-wide">Suppliers Indexed</div>
            </div>
            <div>
              <div className="text-3xl font-extrabold text-slate-900">10k+</div>
              <div className="mt-0.5 text-[0.82rem] text-slate-400 uppercase tracking-wide">Global Importers</div>
            </div>
          </div>
        </div>
        
        <div className="relative w-full max-w-md flex-1">
          <div className="relative overflow-hidden rounded-[2.5rem] bg-white p-8 shadow-2xl ring-1 ring-slate-100">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-emerald-500"></div>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-lg font-bold text-slate-900">Shenzhen Huntkey Electric</div>
                <div className="mt-1 text-[0.82rem] text-slate-400">📍 Shenzhen · Est. 1995</div>
              </div>
              <div className="rounded-full bg-emerald-50 px-3.5 py-1.5 text-[0.82rem] font-bold text-emerald-600">
                ✅ Verified
              </div>
            </div>
            
            <div className="relative my-6 flex h-32 w-32 items-center justify-center rounded-full mx-auto">
                <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="#f1f5f9" strokeWidth="8" />
                    <circle cx="50" cy="50" r="45" fill="none" stroke="#2563eb" strokeWidth="8" strokeDasharray="282.7" strokeDashoffset="42" strokeLinecap="round" transform="rotate(-90 50 50)" />
                </svg>
                <div className="text-4xl font-black text-blue-600">85</div>
            </div>
            <div className="text-center text-[0.85rem] font-medium text-slate-500">TrustScore™ · Grade A</div>
            
            <div className="mt-6 grid grid-cols-2 gap-3">
              {[
                { name: "Identity", score: "32 / 35", color: "bg-blue-600", width: "91%" },
                { name: "Compliance", score: "18 / 20", color: "bg-purple-500", width: "90%" },
                { name: "Trade", score: "40 / 45", color: "bg-amber-500", width: "88%" },
                { name: "Reputation", score: "12 / 15", color: "bg-emerald-500", width: "80%" }
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
        </div>
      </section>

      {/* PROBLEM SECTION */}
      <section className="bg-slate-50 py-24 px-6 md:px-10">
        <div className="mx-auto max-w-6xl text-center">
            <span className="inline-block rounded-full bg-red-100 px-4 py-1.5 text-[0.78rem] font-bold uppercase tracking-widest text-red-600">The Sourcing Blind Spot</span>
            <h2 className="mt-4 text-4xl font-black leading-tight tracking-tight text-slate-900 md:text-5xl">
                Traditional Platforms are Broken.
            </h2>
            <p className="mt-4 mx-auto max-w-2xl text-lg text-slate-500">
                Paid "Gold" status doesn't mean "Good" quality. One bad batch can ruin your business. You need 100% objective data.
            </p>
            
            <div className="mt-16 grid gap-12 md:grid-cols-2">
                <div className="rounded-[2.5rem] bg-white p-12 text-left shadow-xl">
                    <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-2xl">❌</div>
                    <h3 className="text-2xl font-black text-slate-900">The Paid Rank Model</h3>
                    <p className="mt-4 text-slate-500 leading-relaxed">
                        Suppliers pay for "Verified" badges and higher rankings. Platforms prioritize their revenue over your supply chain safety. Fake reviews are easy to buy.
                    </p>
                </div>
                <div className="rounded-[2.5rem] bg-blue-600 p-12 text-left shadow-xl text-white">
                    <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-2xl text-white">🛡️</div>
                    <h3 className="text-2xl font-black">The SourceRating Model</h3>
                    <p className="mt-4 text-white/80 leading-relaxed">
                        We listen to the data, not the sales pitch. AI-vetted ratings based on actual trade records, business registries, and verified legal footprints. A score they can't buy.
                    </p>
                </div>
            </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-6xl px-6 py-24 md:px-10">
        <div className="text-center">
            <span className="inline-block rounded-full bg-blue-50 px-4 py-1.5 text-[0.78rem] font-bold uppercase tracking-widest text-blue-600">The SourceRating Difference</span>
            <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-900 md:text-5xl">How It Works.</h2>
        </div>
        
        <div className="mt-16 grid gap-12 md:grid-cols-3">
          {[
            { 
                icon: "🚢", 
                title: "Hard Truth from Customs", 
                desc: "Our AI scanners analyze millions of Bills of Lading (BOL). We know who a factory actually ships to, how often, and at what volume. Trade history doesn't lie." 
            },
            { 
                icon: "🛡️", 
                title: "Real-time Risk Monitoring", 
                desc: "We track administrative penalties, legal disputes, and financial red flags across global registries. See the risk before the contract." 
            },
            { 
                icon: "📂", 
                title: "Evidence-Based Reviews", 
                desc: "No fake five-star reviews. A review is only counted if the buyer uploads a verified proof of trade (Invoice or BOL). Crowdsourced truth, verified by AI." 
            }
          ].map((item) => (
            <div key={item.title} className="text-center">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-50 text-3xl shadow-inner transition group-hover:bg-blue-600 group-hover:text-white">
                {item.icon}
              </div>
              <h3 className="text-xl font-bold text-slate-900">{item.title}</h3>
              <p className="mt-4 text-[0.92rem] leading-relaxed text-slate-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-slate-900 px-6 py-24 text-center text-white md:px-10">
        <h2 className="text-4xl font-black tracking-tight md:text-5xl">Don’t wire the deposit until you’ve checked the SourceRating.</h2>
        <p className="mt-6 mx-auto max-w-lg text-lg text-slate-400">Zero Friction. No supplier login. Search any factory name and get an instant AI-generated rating.</p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <a href="/demo" className="rounded-xl bg-blue-600 px-8 py-4 text-lg font-bold text-white shadow-xl shadow-blue-600/35 transition hover:-translate-y-0.5 hover:shadow-blue-600/45">
            Search a Supplier Now →
          </a>
          <button className="rounded-xl border border-white/10 bg-white/5 px-8 py-4 text-lg font-bold text-white transition hover:bg-white/10">
            Join the Beta
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-100 bg-white py-12 text-center text-[0.85rem] text-slate-400">
        <p>© 2026 sourcerating / sourcerating.com. Powered by the Multi-Agent Credit Engine.</p>
      </footer>
    </div>
  );
}
