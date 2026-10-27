import { NextResponse } from 'next/server';
export async function POST() {
  return NextResponse.json({
    success: false, code: 'BUNDLE_PILOT_RETIRED',
    error: 'Mixed-product boxes are retired. Choose a lemonade 4-pack or 6-pack instead.',
    shopUrl: '/lemonade-packs',
  }, { status: 410 });
}
