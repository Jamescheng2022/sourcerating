"use client";

import React from 'react';

interface TrustScoreChartProps {
  score: number;
  categories: {
    name: string;
    score: number;
    max: number;
    color: string;
  }[];
}

export const TrustScoreChart = ({ score, categories }: TrustScoreChartProps) => {
  return (
    <div className="flex flex-col items-center">
      <div className="relative mb-8 flex h-40 w-40 items-center justify-center rounded-full">
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100">
          <circle 
            cx="50" 
            cy="50" 
            r="45" 
            fill="none" 
            stroke="#f1f5f9" 
            strokeWidth="8" 
          />
          <circle 
            cx="50" 
            cy="50" 
            r="45" 
            fill="none" 
            stroke="#2563eb" 
            strokeWidth="8" 
            strokeDasharray="282.7" 
            strokeDashoffset={282.7 * (1 - score / 100)} 
            strokeLinecap="round" 
            transform="rotate(-90 50 50)" 
          />
        </svg>
        <div className="text-center">
          <div className="text-5xl font-black text-blue-600">{score}</div>
          <div className="text-[0.7rem] font-bold uppercase tracking-wider text-slate-400">TrustScore�?</div>
        </div>
      </div>

      <div className="grid w-full grid-cols-2 gap-4">
        {categories.map((cat) => (
          <div key={cat.name} className="rounded-2xl bg-slate-50 p-4 transition hover:bg-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[0.7rem] font-bold uppercase tracking-widest text-slate-400">{cat.name}</span>
              <span className="text-[0.75rem] font-black text-slate-900">{cat.score} / {cat.max}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
              <div 
                className={`h-full ${cat.color} transition-all duration-1000`} 
                style={{ width: `${(cat.score / cat.max) * 100}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
