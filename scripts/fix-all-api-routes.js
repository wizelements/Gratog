#!/usr/bin/env node
/**
 * Add dynamic export to ALL API routes to disable static generation
 */

const fs = require('fs');
const path = require('path');

function findRouteFiles(dir, files = []) {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      if (item.name === 'node_modules' || item.name === '.next') continue;
      findRouteFiles(fullPath, files);
    } else if (item.name === 'route.js' || item.name === 'route.ts') {
      files.push(fullPath);
    }
  }
  
  return files;
}

const apiDir = path.join(process.cwd(), 'app/api');
if (!fs.existsSync(apiDir)) {
  console.log('No app/api directory found');
  process.exit(0);
}

const routeFiles = findRouteFiles(apiDir);

let fixed = 0;
let skipped = 0;

routeFiles.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Check if already has dynamic export
  if (content.includes("export const dynamic")) {
    skipped++;
    return;
  }
  
  // Add dynamic export at the top
  content = "export const dynamic = 'force-dynamic';\n\n" + content;
  
  fs.writeFileSync(filePath, content);
  fixed++;
  console.log(`✅ Fixed: ${path.relative(process.cwd(), filePath)}`);
});

console.log(`\n📊 Summary:`);
console.log(`  Fixed: ${fixed} files`);
console.log(`  Skipped (already has dynamic): ${skipped} files`);
console.log(`  Total: ${routeFiles.length} files`);
