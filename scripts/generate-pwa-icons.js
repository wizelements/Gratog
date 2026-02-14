#!/usr/bin/env node

/**
 * Generate PWA Icons
 * Creates placeholder PNG icons in the required sizes for PWA installation
 * These should be replaced with proper branded icons
 */

const fs = require('fs');
const path = require('path');

// Create icons directory if it doesn't exist
const iconsDir = path.join(__dirname, '../public/icons');
const screenshotsDir = path.join(__dirname, '../public/screenshots');

[iconsDir, screenshotsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✓ Created ${dir}`);
  }
});

// Simple SVG to PNG converter using canvas (this creates SVG placeholders instead)
// For production, use proper PNG icons

const createSVGIcon = (size, maskable = false) => {
  const padding = maskable ? 20 : 0;
  const innerSize = size - (padding * 2);
  
  return `<svg viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .bg { fill: #1f2937; }
      .accent { fill: #667eea; }
      .text { fill: #fbbf24; font-weight: bold; font-family: system-ui; }
    </style>
  </defs>
  ${maskable ? `<circle cx="${size/2}" cy="${size/2}" r="${size/2}" class="bg"/>` : `<rect width="${size}" height="${size}" class="bg" rx="${size * 0.15}"/>`}
  <text x="${size/2}" y="${size * 0.65}" font-size="${size * 0.5}" text-anchor="middle" class="text">G</text>
  <circle cx="${size * 0.75}" cy="${size * 0.25}" r="${size * 0.15}" class="accent" opacity="0.8"/>
</svg>`;
};

const createScreenshot = (width, height) => {
  return `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#grad)"/>
  <rect width="${width}" height="${height * 0.1}" fill="#1f2937" opacity="0.9"/>
  <text x="${width/2}" y="${height * 0.08}" font-size="${width * 0.04}" text-anchor="middle" fill="white" font-weight="bold">Taste of Gratitude</text>
  <circle cx="${width/2}" cy="${height/2}" r="${Math.min(width, height) * 0.2}" fill="#fbbf24" opacity="0.9"/>
  <text x="${width/2}" y="${height/2 + height * 0.08}" font-size="${Math.min(width, height) * 0.15}" text-anchor="middle" fill="#1f2937" font-weight="bold">G</text>
</svg>`;
};

// Create icons
const sizes = [192, 512];
sizes.forEach(size => {
  const svg = createSVGIcon(size, false);
  fs.writeFileSync(
    path.join(iconsDir, `icon-${size}x${size}.svg`),
    svg,
    'utf-8'
  );
  console.log(`✓ Created icon-${size}x${size}.svg`);

  const maskableSvg = createSVGIcon(size, true);
  fs.writeFileSync(
    path.join(iconsDir, `icon-${size}x${size}-maskable.svg`),
    maskableSvg,
    'utf-8'
  );
  console.log(`✓ Created icon-${size}x${size}-maskable.svg`);
});

// Create screenshots
const screenshots = [
  { width: 540, height: 720, name: 'screenshot-540x720' },
  { width: 1280, height: 720, name: 'screenshot-1280x720' }
];

screenshots.forEach(({ width, height, name }) => {
  const svg = createScreenshot(width, height);
  fs.writeFileSync(
    path.join(screenshotsDir, `${name}.svg`),
    svg,
    'utf-8'
  );
  console.log(`✓ Created ${name}.svg`);
});

console.log('\n✅ PWA icons generated!');
console.log('\n⚠️  Note: These are SVG placeholders. For production:');
console.log('   1. Replace with proper branded PNG icons');
console.log('   2. Update manifest.json to point to PNG files');
console.log('   3. Use tools like: https://www.pwabuilder.com/');
