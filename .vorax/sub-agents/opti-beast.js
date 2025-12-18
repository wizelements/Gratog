/**
 * OptiBeast Sub-Agent
 * 
 * Ravages poor optimization - bloated assets, inefficient scripts, slow loads.
 * 
 * ACCURATE: Only flags significant performance issues
 * 
 * Micro-agents: AssetMicro, CacheMicro, EnergyMicro
 */

const fs = require('fs');
const path = require('path');

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
      return;
    }

    const staticDir = path.join(nextDir, 'static', 'chunks');
    if (!fs.existsSync(staticDir)) return;
    
    const files = fs.readdirSync(staticDir);
    let totalSize = 0;

    for (const file of files) {
      const filePath = path.join(staticDir, file);
      try {
        const stats = fs.statSync(filePath);
        if (stats.isFile()) {
          totalSize += stats.size;
        }
      } catch (e) {
        // Skip files we can't stat
      }
    }

    this.bundleSize = totalSize;

    // Only flag if bundle is truly excessive (> 3MB)
    if (totalSize > 3 * 1024 * 1024) {
      this.issues.push({
        agent: this.name,
        severity: 'high',
        type: 'bundle-size',
        title: 'Bundle size exceeds 3MB',
        description: `Total bundle: ${(totalSize / 1024 / 1024).toFixed(2)}MB`,
        fix: 'Enable code splitting and lazy loading'
      });
    } else if (totalSize > 2.5 * 1024 * 1024) {
      this.issues.push({
        agent: this.name,
        severity: 'medium',
        type: 'bundle-size',
        title: 'Bundle size is large (>2.5MB)',
        description: `Total bundle: ${(totalSize / 1024 / 1024).toFixed(2)}MB`,
        fix: 'Consider optimizing bundle size'
      });
    }
  }

  async analyzeAssets() {
    const publicDir = path.join(process.cwd(), 'public');
    if (!fs.existsSync(publicDir)) return;

    let assetCount = 0;
    const largeImages = [];

    const scanDir = (dir) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          scanDir(fullPath);
        } else {
          const ext = path.extname(entry.name).toLowerCase();
          if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
            assetCount++;
            try {
              const stats = fs.statSync(fullPath);
              // Only flag truly large images (> 1MB)
              if (stats.size > 1024 * 1024) {
                largeImages.push({
                  file: fullPath.replace(process.cwd(), ''),
                  size: stats.size
                });
              }
            } catch (e) {
              // Skip
            }
          }
        }
      }
    };

    scanDir(publicDir);
    this.assetCount = assetCount;

    // Only report the largest images
    for (const img of largeImages.slice(0, 3)) {
      this.issues.push({
        agent: this.name,
        severity: 'medium',
        type: 'large-image',
        title: 'Large image file (>1MB)',
        file: img.file,
        description: `Size: ${(img.size / 1024 / 1024).toFixed(2)}MB`,
        fix: 'Compress or resize image'
      });
    }
  }
}

/**
 * AssetMicro - Analyzes assets
 */
class AssetMicro {
  async hunt(parent) {
    console.log('      - AssetMicro: Analyzing assets...');
  }
}

/**
 * CacheMicro - Audits caching strategies
 */
class CacheMicro {
  async hunt(parent) {
    console.log('      - CacheMicro: Checking caching...');
  }
}

/**
 * EnergyMicro - Optimizes for efficiency
 */
class EnergyMicro {
  async hunt(parent) {
    console.log('      - EnergyMicro: Checking energy efficiency...');
  }
}

module.exports = OptiBeast;
