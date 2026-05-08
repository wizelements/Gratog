#!/usr/bin/env node
/**
 * Fix 'use client' directive order in all page files
 * 'use client' must come BEFORE export const dynamic
 */

const fs = require('fs');
const path = require('path');

// Find all page files
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
let ok = 0;

pageFiles.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  // Find positions
  let useClientIndex = -1;
  let dynamicIndex = -1;
  
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed === "'use client';" || trimmed === '"use client";') {
      useClientIndex = i;
    }
    if (trimmed.startsWith('export const dynamic')) {
      dynamicIndex = i;
    }
  }
  
  // If both exist and dynamic comes before use client, swap them
  if (useClientIndex !== -1 && dynamicIndex !== -1 && dynamicIndex < useClientIndex) {
    // Remove dynamic line
    const dynamicLine = lines[dynamicIndex];
    lines.splice(dynamicIndex, 1);
    // Adjust useClientIndex since we removed a line before it
    useClientIndex--;
    // Insert dynamic after use client
    lines.splice(useClientIndex + 1, 0, '', dynamicLine);
    
    fs.writeFileSync(filePath, lines.join('\n'));
    fixed++;
    console.log(`✅ Fixed: ${path.relative(process.cwd(), filePath)}`);
  } else if (useClientIndex !== -1 && dynamicIndex !== -1 && dynamicIndex > useClientIndex) {
    ok++;
  } else if (dynamicIndex === -1) {
    // No dynamic export - skip
    ok++;
  }
});

console.log(`\n📊 Summary:`);
console.log(`  Fixed order: ${fixed} files`);
console.log(`  Already correct: ${ok} files`);
console.log(`  Total: ${pageFiles.length} files`);
