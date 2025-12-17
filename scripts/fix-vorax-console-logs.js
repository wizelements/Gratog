#!/usr/bin/env node

/**
 * VORAX Console.log Cleanup Script
 * Wraps console.log calls with development checks
 * Usage: node scripts/fix-vorax-console-logs.js
 */

const fs = require('fs');
const path = require('path');

const FILES_TO_FIX = [
  'lib/resend.js',
  'lib/explore/kiosk-mode.js',
  'lib/explore/game-engine.js',
  'lib/db-quiz.js',
  'lib/email.js',
  'lib/email-queue.js',
  'lib/monitoring.js',
  'lib/order-status-notifier.js',
  'lib/payment-orchestrator.js',
  'lib/product-sync-engine.js',
  'lib/square/syncToUnified.js',
  'lib/sms.js',
  'lib/resend-email.js',
  'lib/enhanced-order-tracking.js',
  'lib/staff-notifications.js',
  'utils/analytics.ts',
];

function wrapConsoleLogs(content, filename) {
  let updated = content;
  let changeCount = 0;

  // Pattern: console.log(...) but not inside strings or comments
  const consoleLogs = content.match(/^\s*console\.log\([^)]*\);?$/gm);
  
  if (!consoleLogs) {
    return { content: updated, changeCount };
  }

  // Only wrap if not already wrapped
  consoleLogs.forEach((match) => {
    if (match.includes('if (DEBUG)') || match.includes('if (process.env.DEBUG)')) {
      return; // Already wrapped
    }

    // Check if it's a dev-only log (has emoji, debug indicator, etc.)
    if (match.includes('✅') || match.includes('📧') || match.includes('🔄') || 
        match.includes('DEBUG') || match.includes('dev')) {
      
      const indent = match.match(/^\s*/)[0];
      const replacement = `${indent}if (process.env.NODE_ENV !== 'production') ${match}`;
      updated = updated.replace(match, replacement);
      changeCount++;
    }
  });

  return { content: updated, changeCount };
}

function processFile(filePath) {
  try {
    const fullPath = path.join(process.cwd(), filePath);
    
    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      return { success: false, changes: 0 };
    }

    let content = fs.readFileSync(fullPath, 'utf8');
    const { content: updated, changeCount } = wrapConsoleLogs(content, filePath);

    if (changeCount > 0) {
      fs.writeFileSync(fullPath, updated, 'utf8');
      console.log(`✅ ${filePath} - ${changeCount} console.log calls wrapped`);
      return { success: true, changes: changeCount };
    } else {
      console.log(`⏭️  ${filePath} - No changes needed`);
      return { success: true, changes: 0 };
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return { success: false, changes: 0 };
  }
}

async function main() {
  console.log('🦖 VORAX Console.log Cleanup Script\n');
  
  let totalChanges = 0;
  let successCount = 0;

  for (const file of FILES_TO_FIX) {
    const result = processFile(file);
    if (result.success) {
      successCount++;
      totalChanges += result.changes;
    }
  }

  console.log(`\n✨ Summary:`);
  console.log(`  Files processed: ${successCount}/${FILES_TO_FIX.length}`);
  console.log(`  Total changes: ${totalChanges}`);
  console.log(`\n⚠️  IMPORTANT: Review changes before committing!`);
  console.log(`  Run: git diff\n`);
}

main().catch(console.error);
