#!/usr/bin/env node
/**
 * Add edge runtime export to ALL pages
 * This forces Edge runtime which doesn't prerender, fixing useSearchParams errors
 */

const fs = require('fs');
const path = require('path');

function findPageFiles(dir, files = []) {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      if (item.name === 'node_modules' || item.name === '.next' || item.name === 'dist' || item.name.startsWith('.')) {
        continue;
      }
      findPageFiles(fullPath, files);
    } else if (item.name === 'page.tsx' || item.name === 'page.js' || item.name === 'page.jsx') {
      files.push(fullPath);
    }
  }
  
  return files;
}

const appDir = path.join(process.cwd(), 'app');
const pageFiles = findPageFiles(appDir);

let fixed = 0;
let skipped = 0;

pageFiles.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Check if already has runtime export
  if (content.includes("export const runtime")) {
    skipped++;
    return;
  }
  
  // Add edge runtime export after any 'use client' or at the top
  const lines = content.split('\n');
  let insertIndex = 0;
  
  // Find where to insert (after use client if present)
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed === "'use client';" || trimmed === '"use client";') {
      insertIndex = i + 1;
      break;
    }
    // Also check for comments at the start
    if (trimmed.startsWith('//') || trimmed.startsWith('/*')) {
      insertIndex = i + 1;
    }
  }
  
  // Check if there's already dynamic export
  const dynamicIndex = lines.findIndex(l => l.includes("export const dynamic"));
  if (dynamicIndex !== -1) {
    // Insert after dynamic export
    insertIndex = dynamicIndex + 1;
  }
  
  lines.splice(insertIndex, 0, "export const runtime = 'edge';");
  
  fs.writeFileSync(filePath, lines.join('\n'));
  fixed++;
  console.log(`✅ Fixed: ${path.relative(process.cwd(), filePath)}`);
});

console.log(`\n📊 Summary:`);
console.log(`  Fixed: ${fixed} files`);
console.log(`  Skipped (already has runtime): ${skipped} files`);
console.log(`  Total: ${pageFiles.length} files`);
