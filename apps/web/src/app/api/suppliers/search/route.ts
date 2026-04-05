import { NextResponse } from 'next/server';
import seedData from '@/data/seed_data.json';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.toLowerCase() || '';

  if (!q) {
    return NextResponse.json([]);
  }

  const results = seedData.filter(s => 
    s.company_name_en.toLowerCase().includes(q) || 
    s.company_name_zh.includes(q)
  );

  return NextResponse.json(results);
}
