"use client";

import React, { useState } from 'react';
import { SupplierProfile } from '@/components/SupplierProfile';

export default function DemoPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResult, setSearchResult] = useState<any | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    setIsSearching(true);
    setSearchResult(null);
    setError('');

    try {
      const res = await fetch(`/api/suppliers/search?q=${encodeURIComponent(searchTerm)}`);
      const results = await res.json();
      
      // Simulate a bit of "AI scanning" lag
      setTimeout(() => {
        if (results && results.length > 0) {
          setSearchResult(results[0]);
        } else {
          setError('No verified supplier found by that name in the 8504.40 category. Try an example from below.');
        }
        setIsSearching(false);
      }, 1200);
    } catch (err) {
      setError('Connection error. Please try again.');
      setIsSearching(false);
    }
  };

  const selectExample = async (example: string) => {
    setSearchTerm(example);
    setIsSearching(true);
    setSearchResult(null);
    setError('');

    try {
      const res = await fetch(`/api/suppliers/search?q=${encodeURIComponent(example)}`);
      const results = await res.json();
      setTimeout(() => {
        setSearchResult(results[0]);
        setIsSearching(false);
      }, 800);
    } catch (err) {
      setError('Connection error.');
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased">
      {/* NAV */}
      <nav className="fixed top-0 z-50 flex w-full items-center justify-between border-b border-slate-100 bg-white/90 px-6 py-4 backdrop-blur-xl md:px-10">
        <a href="/" className="flex items-center gap-2.5 text-xl font-extrabold tracking-tight text-slate-900">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-emerald-500 text-lg text-white">
            🔍
          </div>
          sourcerating
        </a>
        <div className="flex items-center gap-3">
          <a href="/" className="text-[0.92rem] font-medium text-slate-500 transition hover:text-blue-600">Back to Home</a>
        </div>
      </nav>

      <main className="mx-auto max-w-5xl px-6 pb-20 pt-32 md:px-10 md:pt-40">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-black tracking-tight text-slate-900 md:text-5xl">
            Supplier Verification <span className="text-blue-600">Demo</span>
          </h1>
          <p className="mt-4 text-lg text-slate-500">
            Scanning 50 top <span className="font-bold text-slate-900">HS 8504.40 (Power Adapters)</span> manufacturers.
          </p>
        </div>

        {/* Search Bar */}
        <div className="mx-auto mb-16 max-w-2xl">
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="e.g., Huntkey, Anker, Huntkey"
              className="w-full rounded-2xl border-none bg-white py-6 pl-8 pr-32 text-lg shadow-xl shadow-slate-200 ring-1 ring-slate-100 transition focus:ring-2 focus:ring-blue-600 outline-none"
              disabled={isSearching}
            />
            <button
              type="submit"
              disabled={isSearching}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl bg-blue-600 px-6 py-3 font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {isSearching ? 'Searching...' : 'Verify →'}
            </button>
          </form>
          {isSearching && (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm font-medium text-blue-600 animate-pulse">
              <span>🤖</span> RegistryAgent is scanning 52wmb and customs data...
            </div>
          )}
          {error && (
            <div className="mt-4 rounded-xl bg-red-50 p-4 text-sm font-bold text-red-600 ring-1 ring-red-100">
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Results */}
        {searchResult && (
          <div className="flex justify-center">
            <SupplierProfile supplier={searchResult} />
          </div>
        )}

        {!searchResult && !isSearching && (
          <div className="grid gap-6 md:grid-cols-2">
            {[
              "Shenzhen Huntkey Electric",
              "Anker Innovations",
              "Shenzhen Topband",
              "Delta Electronics"
            ].map((example) => (
              <button
                key={example}
                onClick={() => selectExample(example)}
                className="rounded-2xl border border-slate-100 bg-white p-6 text-left transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-600/5"
              >
                <div className="text-[0.7rem] font-black uppercase tracking-widest text-slate-400">Featured Supplier</div>
                <div className="mt-1 font-bold text-slate-900">{example}</div>
              </button>
            ))}
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="mt-20 border-t border-slate-100 bg-white py-12 text-center text-[0.85rem] text-slate-400">
        <p>© 2026 sourcerating / sourcerating.com. For Demo Purposes Only with Real-World Seed Data.</p>
      </footer>
    </div>
  );
}
