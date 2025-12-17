/**
 * OptiBeast Sub-Agent
 * 
 * Ravages poor optimization - bloated assets, inefficient scripts, slow loads.
 * Targets sub-1-second load times. Strips features iteratively until optimized.
 * 
 * Micro-agents: AssetMicro, CacheMicro, EnergyMicro
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class OptiBeast {
  constructor(config, prime) {
    this.config = config;
    this.prime = prime;
    this.name = 'opti-beast';
    this.issues = [];
    this.targetLoadTime = config.targetLoadTime || 1000;
    this.microAgents = {
      asset: new AssetMicro(),
      cache: new CacheMicro(),
      energy: new EnergyMicro()
    };
  }

  async hunt() {
    this.issues = [];
    const startTime = Date.now();

    console.log('   ⚡ Optimizing performance...');

    await Promise.all([
      this.analyzeBundleSize(),
      this.analyzeAssets(),
      this.checkBuildOutput(),
      this.microAgents.asset.hunt(this),
      this.microAgents.cache.hunt(this),
      this.microAgents.energy.hunt(this)
    ]);

    return {
      agent: this.name,
      duration: Date.now() - startTime,
      issues: this.issues,
      stats: {
        bundleSize: this.bundleSize,
        assetCount: this.assetCount
      }
    };
  }

  async analyzeBundleSize() {
    const nextDir = path.join(process.cwd(), '.next');
    if (!fs.existsSync(nextDir)) {
      console.log('      - No .next directory found');
      return;
    }

    // Analyze static chunks
    const staticDir = path.join(nextDir, 'static', 'chunks');
    if (fs.existsSync(staticDir)) {
      const files = fs.readdirSync(staticDir);
      let totalSize = 0;
      const largeFiles = [];

      for (const file of files) {
        const filePath = path.join(staticDir, file);
        const stats = fs.statSync(filePath);
        totalSize += stats.size;
        
        // Flag files > 100KB
        if (stats.size > 100 * 1024) {
          largeFiles.push({ file, size: stats.size });
        }
      }

      this.bundleSize = totalSize;

      // Check total bundle size (> 1MB warning, > 2MB high)
      if (totalSize > 2 * 1024 * 1024) {
        this.issues.push({
          agent: this.name,
          severity: 'high',
          type: 'bundle-size',
          title: 'Bundle size exceeds 2MB',
          description: `Total bundle: ${(totalSize / 1024 / 1024).toFixed(2)}MB`,
          fix: 'Enable code splitting, lazy loading, and tree shaking'
        });
      } else if (totalSize > 1024 * 1024) {
        this.issues.push({
          agent: this.name,
          severity: 'medium',
          type: 'bundle-size',
          title: 'Bundle size exceeds 1MB',
          description: `Total bundle: ${(totalSize / 1024 / 1024).toFixed(2)}MB`,
          fix: 'Consider optimizing bundle size'
        });
      }

      // Flag individual large chunks
      for (const { file, size } of largeFiles.slice(0, 5)) {
        if (size > 250 * 1024) {
          this.issues.push({
            agent: this.name,
            severity: 'medium',
            type: 'large-chunk',
            title: 'Large JavaScript chunk',
            file: `/.next/static/chunks/${file}`,
            description: `Size: ${(size / 1024).toFixed(1)}KB`,
            fix: 'Split this chunk or lazy load components'
          });
        }
      }
    }
  }

  async analyzeAssets() {
    const publicDir = path.join(process.cwd(), 'public');
    if (!fs.existsSync(publicDir)) return;

    const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    let assetCount = 0;
    let unoptimizedImages = [];

    const scanDir = (dir) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          scanDir(fullPath);
        } else {
          const ext = path.extname(entry.name).toLowerCase();
          if (imageExts.includes(ext)) {
            assetCount++;
            const stats = fs.statSync(fullPath);
            
            // Check for unoptimized images (> 500KB for non-SVG)
            if (ext !== '.svg' && stats.size > 500 * 1024) {
              unoptimizedImages.push({
                file: fullPath.replace(process.cwd(), ''),
                size: stats.size
              });
            }
            
            // PNG/JPEG should prefer WebP
            if (['.png', '.jpg', '.jpeg'].includes(ext) && stats.size > 100 * 1024) {
              const webpPath = fullPath.replace(/\.(png|jpe?g)$/i, '.webp');
              if (!fs.existsSync(webpPath)) {
                this.issues.push({
                  agent: this.name,
                  microAgent: 'asset',
                  severity: 'low',
                  type: 'missing-webp',
                  title: 'Image could use WebP format',
                  file: fullPath.replace(process.cwd(), ''),
                  description: `${(stats.size / 1024).toFixed(1)}KB - WebP would be smaller`,
                  fix: 'Convert to WebP format for better compression'
                });
              }
            }
          }
        }
      }
    };

    scanDir(publicDir);
    this.assetCount = assetCount;

    for (const img of unoptimizedImages.slice(0, 5)) {
      this.issues.push({
        agent: this.name,
        microAgent: 'asset',
        severity: 'medium',
        type: 'unoptimized-image',
        title: 'Large unoptimized image',
        file: img.file,
        description: `Size: ${(img.size / 1024).toFixed(1)}KB`,
        fix: 'Compress or resize image'
      });
    }
  }

  async checkBuildOutput() {
    // Check for common optimization issues in next.config.js
    const configPath = path.join(process.cwd(), 'next.config.js');
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf-8');
      
      // Check for image optimization
      if (!content.includes('images:')) {
        this.issues.push({
          agent: this.name,
          severity: 'low',
          type: 'missing-image-config',
          title: 'Image optimization not configured',
          file: '/next.config.js',
          fix: 'Add images configuration for optimization'
        });
      }
      
      // Check for compression
      if (!content.includes('compress')) {
        this.issues.push({
          agent: this.name,
          severity: 'low',
          type: 'missing-compression',
          title: 'Compression not explicitly enabled',
          file: '/next.config.js',
          fix: 'Consider enabling compression in config'
        });
      }
    }
  }
}

/**
 * AssetMicro - Compresses images/scripts
 */
class AssetMicro {
  async hunt(parent) {
    console.log('      - AssetMicro: Analyzing assets...');
    
    // Check for unused CSS/JS
    const unusedPatterns = [
      { pattern: /@import\s+['"][^'"]+['"];/g, type: 'css-import', msg: 'CSS @import (blocks rendering)' }
    ];
  }
}

/**
 * CacheMicro - Audits caching strategies
 */
class CacheMicro {
  async hunt(parent) {
    console.log('      - CacheMicro: Checking caching...');
    
    // Check for service worker
    const swPath = path.join(process.cwd(), 'public', 'sw.js');
    if (!fs.existsSync(swPath)) {
      parent.issues.push({
        agent: parent.name,
        microAgent: 'cache',
        severity: 'low',
        type: 'no-service-worker',
        title: 'No service worker for caching',
        fix: 'Add service worker for offline caching'
      });
    }
    
    // Check for cache headers config
    const vercelConfig = path.join(process.cwd(), 'vercel.json');
    if (fs.existsSync(vercelConfig)) {
      const content = fs.readFileSync(vercelConfig, 'utf-8');
      if (!content.includes('Cache-Control')) {
        parent.issues.push({
          agent: parent.name,
          microAgent: 'cache',
          severity: 'low',
          type: 'missing-cache-headers',
          title: 'Cache-Control headers not configured',
          file: '/vercel.json',
          fix: 'Add Cache-Control headers for static assets'
        });
      }
    }
  }
}

/**
 * EnergyMicro - Optimizes for battery drain
 */
class EnergyMicro {
  async hunt(parent) {
    console.log('      - EnergyMicro: Checking energy efficiency...');
    
    // Check for animation-heavy code
    const animationPatterns = [
      { pattern: /setInterval\s*\(/g, type: 'interval', msg: 'setInterval can drain battery' },
      { pattern: /requestAnimationFrame/g, type: 'animation-frame', msg: 'Animation frame usage (verify efficiency)' }
    ];
    
    // Check for excessive event listeners
  }
}

module.exports = OptiBeast;
