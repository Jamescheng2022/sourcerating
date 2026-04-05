"use client";

import React, { useState, useRef } from 'react';

interface EvidenceUploaderProps {
  supplierName: string;
  onVerified: (data: any) => void;
}

export const EvidenceUploader = ({ supplierName, onVerified }: EvidenceUploaderProps) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'scanning' | 'matched' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const simulateVerification = () => {
    setIsVerifying(true);
    setStatus('uploading');
    setProgress(10);

    // 1. Upload
    setTimeout(() => {
      setProgress(40);
      setStatus('scanning');
      
      // 2. AI Vision Scan (OCR)
      setTimeout(() => {
        setProgress(70);
        
        // 3. Match with Customs Data
        setTimeout(() => {
          setProgress(100);
          setStatus('matched');
          setIsVerifying(false);
          onVerified({
            bolNumber: `BOL-${Math.floor(Math.random() * 1000000)}`,
            weight: '12,500 KG',
            date: new Date().toLocaleDateString(),
            port: 'Shanghai -> Los Angeles'
          });
        }, 1500);
      }, 2000);
    }, 1000);
  };

  return (
    <div className="mt-8 rounded-[2rem] border-2 border-dashed border-slate-200 bg-slate-50/50 p-8 transition-all hover:border-blue-400">
      <div className="flex flex-col items-center text-center">
        {status === 'idle' && (
          <>
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-2xl text-blue-600">
              🚢
            </div>
            <h3 className="text-lg font-bold text-slate-900">Verify a Real Trade</h3>
            <p className="mt-1 text-[0.85rem] text-slate-500">
              Upload a Bill of Lading (BOL) or Invoice from <span className="font-bold">{supplierName}</span>. 
              Our AI Vision Agent will verify it against customs databases.
            </p>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="mt-6 rounded-xl bg-slate-900 px-6 py-2.5 text-[0.85rem] font-bold text-white transition hover:bg-slate-800"
            >
              Upload Document (PDF/JPG)
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={simulateVerification}
              accept="image/*,application/pdf"
            />
          </>
        )}

        {isVerifying && (
          <div className="w-full max-w-sm">
            <div className="mb-4 flex items-center justify-center gap-3">
              <span className="text-2xl animate-spin">🤖</span>
              <span className="text-[0.9rem] font-black uppercase tracking-widest text-blue-600">
                {status === 'uploading' && 'Uploading...'}
                {status === 'scanning' && 'AI Vision Scanning...'}
              </span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-slate-200 overflow-hidden">
              <div 
                className="h-full bg-blue-600 transition-all duration-500" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div className="mt-4 text-[0.8rem] font-medium text-slate-500">
              {status === 'scanning' && 'Checking HS Codes & Shipper Identity against 52wmb...'}
            </div>
          </div>
        )}

        {status === 'matched' && (
          <div className="animate-in fade-in zoom-in duration-500">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl text-emerald-600 mx-auto">
              �?
            </div>
            <h3 className="text-xl font-black text-slate-900">Proof of Trade Verified!</h3>
            <p className="mt-2 text-[0.88rem] leading-relaxed text-slate-500">
              AI Vision matched this document to an active export record in HS 8504.40. 
              <span className="block font-bold text-blue-600 mt-1">+15 Reputation Points added to TrustScore�?</span>
            </p>
            <button 
              onClick={() => setStatus('idle')}
              className="mt-6 text-[0.85rem] font-bold text-slate-400 hover:text-slate-600 underline"
            >
              Verify another document
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
