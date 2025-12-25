import { NextResponse } from 'next/server';

export async function GET(request) {
  return NextResponse.json({ success: true, test: 'ok' }, { status: 200 });
}

export async function POST(request) {
  return NextResponse.json({ success: true, test: 'ok' }, { status: 200 });
}

export const runtime = 'nodejs';
