#!/usr/bin/env node
/**
 * Remove edge runtime export from all pages (revert to Node.js runtime)
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
  
  // Check if has runtime export
  if (!content.includes("export const runtime = 'edge'")) {
    skipped++;
    return;
  }
  
  // Remove the edge runtime export
  content = content.replace(/export const runtime = 'edge';\n?/g, '');
  
  fs.writeFileSync(filePath, content);
  fixed++;
  console.log(`✅ Fixed: ${path.relative(process.cwd(), filePath)}`);
});

console.log(`\n📊 Summary:`);
console.log(`  Removed edge runtime: ${fixed} files`);
console.log(`  Skipped: ${skipped} files`);
console.log(`  Total: ${pageFiles.length} files`);
