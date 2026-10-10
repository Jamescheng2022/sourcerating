import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ error: "Supplier search is unavailable in this pilot." }, { status: 410 });
}
