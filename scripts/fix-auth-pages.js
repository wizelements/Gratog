#!/usr/bin/env node
/**
 * Fix auth pages for static generation
 * Adds export const dynamic = 'force-dynamic' to pages using auth
 */

const fs = require('fs');
const path = require('path');

const pagesToFix = [
  'app/account/page.tsx',
  'app/login/page.js',
  'app/register/page.js',
  'app/profile/layout.js',
  'app/profile/ProfileClient.js',
  'app/passport/Client.js',
  'app/checkout/page.tsx',
  'app/checkout/square/page.tsx',
  'app/gratitude/page.tsx',
  'app/gratitude/rewards/page.tsx',
  'app/subscriptions/page.tsx',
  'app/wishlist/page.tsx',
  'app/test-auth/page.tsx',
  'app/admin/page.tsx',
  'app/admin/login/page.tsx',
  'app/admin/analytics/page.tsx',
  'app/admin/campaigns/page.tsx',
  'app/admin/campaigns/new/page.tsx',
  'app/admin/customers/page.tsx',
  'app/admin/errors/page.tsx',
  'app/admin/inventory/page.tsx',
  'app/admin/markets/page.tsx',
  'app/admin/orders/page.tsx',
  'app/admin/products/page.tsx',
  'app/admin/queue/page.tsx',
  'app/admin/reviews/page.tsx',
  'app/admin/settings/page.tsx',
  'app/admin/waitlist/page.tsx',
  'app/admin/market-day/page.tsx',
  'app/admin/market-setup/page.tsx',
  'app/admin/qr-generator/page.tsx',
  'app/admin/setup/page.tsx',
  'app/admin/square-oauth/page.tsx',
  'app/admin/forgot-password/page.tsx',
  'app/admin/reset-password/page.tsx',
];

const dynamicExport = "export const dynamic = 'force-dynamic';\n\n";

pagesToFix.forEach(pagePath => {
  const fullPath = path.join(process.cwd(), pagePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  Skipping (not found): ${pagePath}`);
    return;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  
  // Check if already has dynamic export
  if (content.includes("export const dynamic") || content.includes("export const revalidate")) {
    console.log(`✓ Already fixed: ${pagePath}`);
    return;
  }
  
  // Find the first 'use client' or import
  const useClientMatch = content.match(/^(use client';?\n)/m);
  const importMatch = content.match(/^(import\s)/m);
  
  let insertPosition = 0;
  if (useClientMatch) {
    insertPosition = content.indexOf(useClientMatch[0]) + useClientMatch[0].length;
  } else if (importMatch) {
    // Insert before first import
    insertPosition = content.indexOf(importMatch[0]);
  }
  
  // Insert dynamic export
  const newContent = content.slice(0, insertPosition) + dynamicExport + content.slice(insertPosition);
  
  fs.writeFileSync(fullPath, newContent);
  console.log(`✅ Fixed: ${pagePath}`);
});

console.log('\n✨ Done! Run vercel --force to rebuild.');
