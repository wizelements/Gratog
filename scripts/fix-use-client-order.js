#!/usr/bin/env node
/**
 * Fix 'use client' directive order - must be before dynamic export
 */

const fs = require('fs');
const path = require('path');

const files = process.argv.slice(2);

files.forEach(file => {
  const fullPath = path.join(process.cwd(), file);
  if (!fs.existsSync(fullPath)) {
    console.log(`Skipping ${file} - not found`);
    return;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  
  // Remove duplicate dynamic exports
  const dynamicMatches = content.match(/export const dynamic = 'force-dynamic';/g);
  if (dynamicMatches && dynamicMatches.length > 1) {
    // Keep only one
    content = content.replace(/export const dynamic = 'force-dynamic';\n\n/g, '');
    content = content.replace(/^(use client';)/m, "export const dynamic = 'force-dynamic';\n\n$1");
    fs.writeFileSync(fullPath, content);
    console.log(`Fixed duplicates in ${file}`);
    return;
  }
  
  // Check if 'use client' comes after dynamic export
  const dynamicMatch = content.match(/export const dynamic = 'force-dynamic';/);
  const useClientMatch = content.match(/'use client';/);
  
  if (dynamicMatch && useClientMatch) {
    const dynamicIndex = content.indexOf("export const dynamic = 'force-dynamic';");
    const useClientIndex = content.indexOf("'use client';");
    
    if (dynamicIndex < useClientIndex) {
      // 'use client' must come first
      content = content.replace("export const dynamic = 'force-dynamic';\n\n", '');
      content = content.replace("'use client';", "'use client';\n\nexport const dynamic = 'force-dynamic';");
      fs.writeFileSync(fullPath, content);
      console.log(`Fixed order in ${file}`);
    }
  }
});

console.log('Done!');
