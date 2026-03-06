#!/usr/bin/env node

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function fetchText(path) {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) {
    throw new Error(`${path} returned HTTP ${res.status}`);
  }
  return res.text();
}

async function fetchBuffer(path) {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) {
    throw new Error(`${path} returned HTTP ${res.status}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

async function assertAssetExists(path) {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) {
    throw new Error(`Required asset missing: ${path} (HTTP ${res.status})`);
  }
}

function parsePngDimensions(buffer) {
  // PNG IHDR chunk stores width/height at bytes 16-24
  const signature = '89504e470d0a1a0a';
  if (buffer.subarray(0, 8).toString('hex') !== signature) {
    throw new Error('Not a PNG file');
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

async function main() {
  console.log(`Checking PWA readiness for ${BASE_URL}`);

  const manifestRaw = await fetchText('/manifest.json');
  const manifest = JSON.parse(manifestRaw);

  if (manifest.display !== 'standalone') {
    throw new Error(`manifest.display must be standalone (found ${manifest.display})`);
  }
  if (manifest.start_url !== '/') {
    throw new Error(`manifest.start_url must be / (found ${manifest.start_url})`);
  }

  const requiredIcons = [
    { src: '/icon-192x192.png', width: 192, height: 192 },
    { src: '/icon-512x512.png', width: 512, height: 512 },
    { src: '/apple-touch-icon.png', width: 180, height: 180 },
  ];

  for (const icon of requiredIcons) {
    const iconEntry = (manifest.icons || []).find((i) => i.src === icon.src);
    if (!iconEntry) {
      throw new Error(`manifest missing required icon: ${icon.src}`);
    }

    const buffer = await fetchBuffer(icon.src);
    const { width, height } = parsePngDimensions(buffer);
    if (width !== icon.width || height !== icon.height) {
      throw new Error(`${icon.src} has ${width}x${height}, expected ${icon.width}x${icon.height}`);
    }
  }

  const sw = await fetchText('/sw.js');
  if (sw.includes('/css/main.css')) {
    throw new Error('Service worker still references removed /css/main.css');
  }
  if (!sw.includes("'/offline.html'")) {
    throw new Error('Service worker is missing offline fallback asset');
  }

  const swAssetMatches = [
    ...sw.matchAll(/(?:icon|badge)\s*:\s*['"]([^'"]+)['"]/g),
  ];
  for (const [, path] of swAssetMatches) {
    await assertAssetExists(path);
  }

  await fetchText('/offline.html');

  console.log('PWA readiness checks passed');
}

main().catch((error) => {
  console.error('PWA readiness check failed:', error.message);
  process.exit(1);
});
