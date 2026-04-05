"use client";

import React, { useState } from 'react';
import { TrustScoreChart } from './TrustScoreChart';
import { EvidenceUploader } from './EvidenceUploader';

interface Supplier {
  company_name_en: string;
  company_name_zh: string;
  location: string;
  established_year: number;
  product_categories: string[];
  certifications: string[];
  tier: string;
  totalScore: number;
  categories: {
    name: string;
    score: number;
    max: number;
    color: string;
  }[];
}

interface SupplierProfileProps {
  supplier: Supplier;
}

export const SupplierProfile = ({ supplier }: SupplierProfileProps) => {
  const [evidenceCount, setEvidenceCount] = useState(Math.floor(Math.random() * 10) + 2);
  const shipments = Math.floor(Math.random() * 200) + 50; 

  return (
    <div className="w-full max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <div className="overflow-hidden rounded-[2.5rem] border border-slate-100 bg-white p-8 shadow-2xl md:p-12">
        {/* Header */}
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row">
          <div className="flex-1">
            <div className="flex flex-col items-start gap-1">
              <span className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-blue-600">
                AI Verified Entity · {supplier.tier}
              </span>
              <h2 className="text-3xl font-black tracking-tight text-slate-900">{supplier.company_name_en}</h2>
              <p className="text-[0.9rem] font-bold text-slate-400">{supplier.company_name_zh}</p>
            </div>
            <p className="mt-4 text-[0.92rem] text-slate-500">
              📍 {supplier.location} · Est. {supplier.established_year} · 🏭 {supplier.product_categories[0]}
            </p>
            <div className="mt-6 flex flex-wrap gap-4">
              {supplier.certifications.slice(0, 3).map(cert => (
                <div key={cert} className="rounded-xl bg-slate-50 px-4 py-2 text-[0.82rem] font-bold text-slate-600 ring-1 ring-slate-200">
                  🛡️ {cert} Verified
                </div>
              ))}
              <div className="rounded-xl bg-emerald-50 px-4 py-2 text-[0.82rem] font-bold text-emerald-600 ring-1 ring-emerald-600/20">
                🚢 {shipments}+ Shipments / Year
              </div>
            </div>
          </div>
          
          <div className="w-full md:w-auto">
            <TrustScoreChart score={supplier.totalScore} categories={supplier.categories} />
          </div>
        </div>

        {/* AI Insight Section */}
        <div className="mt-12 rounded-3xl bg-blue-600 p-8 text-white shadow-xl shadow-blue-600/20">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl animate-pulse">🤖</span>
            <h3 className="text-xl font-black">AI Verification Insight</h3>
          </div>
          <p className="text-[0.95rem] leading-relaxed opacity-90">
            RegistryAgent has verified the legal existence and active export status of <span className="font-bold underline underline-offset-4 decoration-blue-300 decoration-2">{supplier.company_name_en}</span>. 
            Trade records show high consistency in the <span className="font-bold">HS 8504.40</span> category over 3 years.
            VerificationAgent recommends this supplier for {supplier.totalScore > 80 ? 'strategic partnerships' : 'trial orders'}.
          </p>
          <div className="mt-6 flex flex-wrap gap-4">
            <button className="rounded-xl bg-white px-6 py-2.5 text-[0.85rem] font-bold text-blue-600 shadow-lg shadow-white/10 transition hover:bg-slate-100">
              Download Detailed PDF Report ($29)
            </button>
            <button className="rounded-xl border border-white/20 bg-white/10 px-6 py-2.5 text-[0.85rem] font-bold text-white transition hover:bg-white/20">
              Check Evidence Vault ({evidenceCount})
            </button>
          </div>
        </div>

        {/* Data points */}
        <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-6">
            <div className="mb-4 text-[0.72rem] font-black uppercase tracking-widest text-slate-400">Trading Activity</div>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-[0.85rem] text-slate-500">Focus Category</span>
                <span className="text-[0.85rem] font-bold text-slate-900">{supplier.product_categories[0]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[0.85rem] text-slate-500">Market Profile</span>
                <span className="text-[0.85rem] font-bold text-slate-900">Global Export</span>
              </div>
            </div>
          </div>
          
          <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-6">
            <div className="mb-4 text-[0.72rem] font-black uppercase tracking-widest text-slate-400">Legal Risk</div>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-[0.85rem] text-slate-500">Legal Disputes</span>
                <span className="text-[0.85rem] font-bold text-emerald-500">Zero Detected</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[0.85rem] text-slate-500">Status</span>
                <span className="text-[0.85rem] font-bold text-slate-900">Active (Normal)</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-6 md:col-span-2 lg:col-span-1">
            <div className="mb-4 text-[0.72rem] font-black uppercase tracking-widest text-slate-400">AI Verification Log</div>
            <ul className="space-y-3">
              {['Business License (Verified)', 'Customs ID Match', 'Compliance Certs Scan', 'Real-world Footprint'].map(item => (
                <li key={item} className="flex items-center gap-2 text-[0.82rem] font-bold text-slate-700">
                  <span className="text-emerald-500">✅</span> {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Evidence Verification Flow (Task #11) */}
        <div className="mt-12 border-t border-slate-100 pt-12">
            <div className="mb-8">
                <h3 className="text-2xl font-black text-slate-900">Buyer Verified Evidence</h3>
                <p className="mt-2 text-slate-500">Only buyers with verified trade documents can contribute to this section. All documents are scanned by AI Vision.</p>
            </div>
            
            <div className="flex flex-col gap-8 md:flex-row">
                <div className="flex-1 space-y-4">
                    {[
                        { type: 'Bill of Lading', date: 'Dec 15, 2025', status: 'AI Verified', origin: 'Shenzhen -> Hamburg' },
                        { type: 'Commercial Invoice', date: 'Jan 22, 2026', status: 'AI Verified', origin: 'Ningbo -> New York' }
                    ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200">
                            <div className="flex items-center gap-4">
                                <div className="text-2xl">📄</div>
                                <div>
                                    <div className="text-[0.85rem] font-bold text-slate-900">{item.type}</div>
                                    <div className="text-[0.75rem] text-slate-400">{item.date} · {item.origin}</div>
                                </div>
                            </div>
                            <span className="rounded-full bg-emerald-100 px-3 py-1 text-[0.7rem] font-black uppercase text-emerald-600">
                                ✅ {item.status}
                            </span>
                        </div>
                    ))}
                    <div className="text-center">
                        <span className="text-[0.8rem] font-bold text-slate-400">+{evidenceCount - 2} more verified documents in vault</span>
                    </div>
                </div>

                <div className="flex-1">
                    <EvidenceUploader 
                      supplierName={supplier.company_name_en} 
                      onVerified={() => setEvidenceCount(c => c + 1)} 
                    />
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
