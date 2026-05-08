#!/usr/bin/env node
/**
 * Add dynamic export to all page files to disable static generation
 * This fixes the 'useSearchParams should be wrapped in suspense' error
 */

const fs = require('fs');
const path = require('path');

// Find all page files
function findPageFiles(dir, files = []) {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      // Skip node_modules, .next, etc.
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
  
  // Check if already has dynamic export
  if (content.includes("export const dynamic")) {
    skipped++;
    return;
  }
  
  // Add dynamic export at the top
  // If there's 'use client', put it after that
  if (content.startsWith("'use client'") || content.startsWith('"use client"')) {
    const lines = content.split('\n');
    let insertIndex = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === "'use client';" || lines[i].trim() === '"use client";') {
        insertIndex = i + 1;
        break;
      }
    }
    lines.splice(insertIndex, 0, "", "export const dynamic = 'force-dynamic';");
    content = lines.join('\n');
  } else {
    // Put at the very top
    content = "export const dynamic = 'force-dynamic';\n\n" + content;
  }
  
  fs.writeFileSync(filePath, content);
  fixed++;
  console.log(`✅ Fixed: ${path.relative(process.cwd(), filePath)}`);
});

console.log(`\n📊 Summary:`);
console.log(`  Fixed: ${fixed} files`);
console.log(`  Skipped (already has dynamic): ${skipped} files`);
console.log(`  Total: ${pageFiles.length} files`);
