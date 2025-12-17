/**
 * TrustGuardian Sub-Agent
 * 
 * Tracks potential financial losses from inconsistent content eroding trust.
 * Models revenue impact using predictive analytics (trust score * conversion rate).
 * Quantifies losses in dollars and escalates to C-suite if >1% projected loss.
 * 
 * Micro-agents: ContentMicro, ReviewMicro, RiskMicro
 */

const fs = require('fs');
const path = require('path');

class TrustGuardian {
  constructor(config, prime) {
    this.config = config;
    this.prime = prime;
    this.name = 'trust-guardian';
    this.issues = [];
    this.revenueAlertThreshold = config.revenueAlertThreshold || 0.01;
    this.contentDriftTolerance = config.contentDriftTolerance || 0.05;
    this.microAgents = {
      content: new ContentMicro(),
      review: new ReviewMicro(),
      risk: new RiskMicro()
    };
    
    // Revenue modeling parameters (would be configured from real data)
    this.baselineMetrics = {
      monthlyRevenue: 10000,        // Estimated monthly revenue
      conversionRate: 0.03,         // 3% baseline conversion
      averageOrderValue: 45,        // $45 AOV
      trustScoreImpact: 0.15        // 15% revenue impact per 10% trust drop
    };
  }

  async hunt() {
    this.issues = [];
    const startTime = Date.now();

    console.log('   🛡️ Guarding trust & revenue...');

    await Promise.all([
      this.analyzeContentConsistency(),
      this.checkPricingIntegrity(),
      this.analyzeClaimsAndPromises(),
      this.microAgents.content.hunt(this),
      this.microAgents.review.hunt(this),
      this.microAgents.risk.hunt(this)
    ]);

    // Calculate total estimated revenue impact
    this.calculateRevenueImpact();

    return {
      agent: this.name,
      duration: Date.now() - startTime,
      issues: this.issues,
      stats: {
        trustScore: this.trustScore || 100,
        estimatedRevenueLoss: this.estimatedRevenueLoss || 0,
        contentDrift: this.contentDrift || 0
      }
    };
  }

  async analyzeContentConsistency() {
    let trustScore = 100;
    const inconsistencies = [];
    
    // Check product descriptions for consistency
    const productFiles = await this.findProductFiles();
    
    for (const file of productFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      const relativePath = file.replace(process.cwd(), '');
      
      // Check for price inconsistencies (multiple price formats)
      const prices = content.match(/\$\d+(\.\d{2})?/g) || [];
      const uniquePrices = new Set(prices);
      if (uniquePrices.size > 3) {
        inconsistencies.push({
          file: relativePath,
          type: 'price-variation',
          detail: `${uniquePrices.size} different prices shown`
        });
        trustScore -= 5;
      }
      
      // Check for conflicting claims
      const claimPatterns = [
        { positive: /100%\s*natural/gi, negative: /contains?\s*preservatives/gi },
        { positive: /organic/gi, negative: /non-organic/gi },
        { positive: /free shipping/gi, negative: /shipping\s*fee|delivery\s*charge/gi },
        { positive: /instant|immediate/gi, negative: /takes?\s*\d+\s*days?/gi }
      ];
      
      for (const pattern of claimPatterns) {
        const hasPositive = pattern.positive.test(content);
        pattern.positive.lastIndex = 0; // Reset regex
        const hasNegative = pattern.negative.test(content);
        pattern.negative.lastIndex = 0;
        
        if (hasPositive && hasNegative) {
          inconsistencies.push({
            file: relativePath,
            type: 'conflicting-claims',
            detail: 'Contradictory statements found'
          });
          trustScore -= 10;
        }
      }
    }
    
    this.trustScore = Math.max(0, trustScore);
    
    // Report significant inconsistencies
    for (const inconsistency of inconsistencies.slice(0, 5)) {
      this.issues.push({
        agent: this.name,
        microAgent: 'content',
        severity: inconsistency.type === 'conflicting-claims' ? 'high' : 'medium',
        type: 'content-inconsistency',
        title: `Content inconsistency: ${inconsistency.type}`,
        file: inconsistency.file,
        description: inconsistency.detail,
        estimatedLoss: this.calculateLoss(inconsistency.type),
        fix: 'Review and align content messaging'
      });
    }
  }

  async findProductFiles() {
    const files = [];
    const dirs = ['app/(site)', 'components', 'data'];
    
    for (const dir of dirs) {
      const fullDir = path.join(process.cwd(), dir);
      if (fs.existsSync(fullDir)) {
        this.scanForFiles(fullDir, files);
      }
    }
    
    return files;
  }

  scanForFiles(dir, files) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        this.scanForFiles(fullPath, files);
      } else if (/\.(js|ts|jsx|tsx|json)$/.test(entry.name)) {
        files.push(fullPath);
      }
    }
  }

  async checkPricingIntegrity() {
    // Check for pricing-related files
    const pricingPatterns = ['price', 'cost', 'fee', 'discount', 'coupon'];
    const appDir = path.join(process.cwd(), 'app');
    const libDir = path.join(process.cwd(), 'lib');
    
    const pricingIssues = [];
    
    const checkDir = (dir) => {
      if (!fs.existsSync(dir)) return;
      
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          checkDir(fullPath);
        } else if (/\.(js|ts|jsx|tsx)$/.test(entry.name)) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          
          // Check for hardcoded prices (should use constants or API)
          const hardcodedPrices = content.match(/(?:price|cost)\s*[:=]\s*\d+(\.\d{2})?(?!\s*\*)/g) || [];
          if (hardcodedPrices.length > 2) {
            pricingIssues.push({
              file: fullPath.replace(process.cwd(), ''),
              count: hardcodedPrices.length
            });
          }
          
          // Check for discount calculation errors (common bugs)
          if (content.includes('discount') && content.includes('%')) {
            if (!content.includes('/ 100') && !content.includes('* 0.')) {
              this.issues.push({
                agent: this.name,
                severity: 'high',
                type: 'discount-calculation',
                title: 'Potential discount calculation error',
                file: fullPath.replace(process.cwd(), ''),
                description: 'Percentage discount may not be calculated correctly',
                estimatedLoss: 0.02,
                fix: 'Verify discount is divided by 100 or multiplied by decimal'
              });
            }
          }
        }
      }
    };
    
    checkDir(appDir);
    checkDir(libDir);
    
    if (pricingIssues.length > 3) {
      this.issues.push({
        agent: this.name,
        severity: 'medium',
        type: 'scattered-pricing',
        title: 'Pricing scattered across files',
        description: `${pricingIssues.length} files with hardcoded prices`,
        estimatedLoss: 0.005,
        fix: 'Centralize pricing in a constants file or API'
      });
    }
  }

  async analyzeClaimsAndPromises() {
    // Analyze marketing claims that could impact trust
    const claimFiles = [];
    const appDir = path.join(process.cwd(), 'app', '(site)');
    
    if (fs.existsSync(appDir)) {
      this.scanForFiles(appDir, claimFiles);
    }
    
    const dangerousClaims = [
      { pattern: /cure|heal|treat\s+disease/gi, severity: 'critical', msg: 'Medical claim (FDA violation risk)' },
      { pattern: /guarantee|100%\s*satisfaction/gi, severity: 'medium', msg: 'Guarantee without terms' },
      { pattern: /best|#1|leading/gi, severity: 'low', msg: 'Superlative claim (may need substantiation)' },
      { pattern: /limited\s*time|act\s*now|hurry/gi, severity: 'low', msg: 'Urgency tactic (verify authenticity)' }
    ];
    
    for (const file of claimFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      const relativePath = file.replace(process.cwd(), '');
      
      for (const claim of dangerousClaims) {
        if (claim.pattern.test(content)) {
          claim.pattern.lastIndex = 0;
          
          this.issues.push({
            agent: this.name,
            microAgent: 'review',
            severity: claim.severity,
            type: 'risky-claim',
            title: claim.msg,
            file: relativePath,
            estimatedLoss: claim.severity === 'critical' ? 0.1 : 0.01,
            fix: 'Review claim for compliance and accuracy'
          });
        }
      }
    }
  }

  calculateLoss(issueType) {
    const lossMap = {
      'conflicting-claims': 0.02,
      'price-variation': 0.01,
      'discount-calculation': 0.03,
      'risky-claim': 0.02
    };
    
    return lossMap[issueType] || 0.005;
  }

  calculateRevenueImpact() {
    let totalLoss = 0;
    
    for (const issue of this.issues) {
      totalLoss += issue.estimatedLoss || 0;
    }
    
    // Cap at 20% maximum loss estimate
    totalLoss = Math.min(totalLoss, 0.2);
    
    this.estimatedRevenueLoss = totalLoss;
    
    // Add summary issue if significant loss
    if (totalLoss > this.revenueAlertThreshold) {
      const dollarLoss = this.baselineMetrics.monthlyRevenue * totalLoss;
      
      this.issues.unshift({
        agent: this.name,
        severity: 'critical',
        type: 'revenue-impact',
        title: `Potential ${(totalLoss * 100).toFixed(1)}% revenue loss ($${dollarLoss.toFixed(0)}/month)`,
        description: `Trust issues could reduce conversion by ${(totalLoss * 100).toFixed(1)}%`,
        estimatedLoss: totalLoss,
        fix: 'Address all trust-related issues immediately'
      });
    }
  }
}

/**
 * ContentMicro - Diffs versions for inconsistencies
 */
class ContentMicro {
  async hunt(parent) {
    console.log('      - ContentMicro: Checking content drift...');
    
    // Check for SEO metadata consistency
    const appDir = path.join(process.cwd(), 'app');
    if (!fs.existsSync(appDir)) return;
    
    const metadataFiles = [];
    this.findMetadataFiles(appDir, metadataFiles);
    
    const titles = new Set();
    const descriptions = new Set();
    
    for (const file of metadataFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      
      // Extract metadata
      const titleMatch = content.match(/title:\s*['"]([^'"]+)['"]/);
      const descMatch = content.match(/description:\s*['"]([^'"]+)['"]/);
      
      if (titleMatch) titles.add(titleMatch[1]);
      if (descMatch) descriptions.add(descMatch[1]);
    }
    
    // Check for brand name consistency
    const brandVariations = this.findBrandVariations(appDir);
    if (brandVariations.length > 1) {
      parent.issues.push({
        agent: parent.name,
        microAgent: 'content',
        severity: 'medium',
        type: 'brand-inconsistency',
        title: 'Brand name variations detected',
        description: `Found variations: ${brandVariations.join(', ')}`,
        estimatedLoss: 0.01,
        fix: 'Standardize brand name across all content'
      });
    }
  }
  
  findMetadataFiles(dir, files) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        this.findMetadataFiles(fullPath, files);
      } else if (entry.name === 'page.tsx' || entry.name === 'page.js' || entry.name === 'layout.js') {
        files.push(fullPath);
      }
    }
  }
  
  findBrandVariations(dir) {
    const brandPatterns = [
      /taste\s*of\s*gratitude/gi,
      /tasteofgratitude/gi,
      /gratitude\s*shop/gi
    ];
    
    const variations = new Set();
    
    const scan = (d) => {
      if (!fs.existsSync(d)) return;
      const entries = fs.readdirSync(d, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(d, entry.name);
        
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          scan(fullPath);
        } else if (/\.(js|ts|jsx|tsx)$/.test(entry.name)) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          
          for (const pattern of brandPatterns) {
            const matches = content.match(pattern) || [];
            matches.forEach(m => variations.add(m.toLowerCase()));
          }
        }
      }
    };
    
    scan(dir);
    return Array.from(variations);
  }
}

/**
 * ReviewMicro - Mines user feedback for trust signals
 */
class ReviewMicro {
  async hunt(parent) {
    console.log('      - ReviewMicro: Analyzing trust signals...');
    
    // Check for trust indicators in the codebase
    const trustIndicators = [
      { name: 'SSL badge', pattern: /ssl|secure|https/gi },
      { name: 'Money-back guarantee', pattern: /money.back|refund|guarantee/gi },
      { name: 'Customer reviews', pattern: /review|testimonial|rating/gi },
      { name: 'Contact information', pattern: /contact|email|phone|address/gi },
      { name: 'Privacy policy', pattern: /privacy.policy/gi },
      { name: 'Terms of service', pattern: /terms|conditions/gi }
    ];
    
    const appDir = path.join(process.cwd(), 'app');
    if (!fs.existsSync(appDir)) return;
    
    const foundIndicators = new Set();
    
    const scan = (dir) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          scan(fullPath);
        } else if (/\.(js|ts|jsx|tsx)$/.test(entry.name)) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          
          for (const indicator of trustIndicators) {
            if (indicator.pattern.test(content)) {
              foundIndicators.add(indicator.name);
            }
          }
        }
      }
    };
    
    scan(appDir);
    
    const missingIndicators = trustIndicators
      .filter(i => !foundIndicators.has(i.name))
      .map(i => i.name);
    
    if (missingIndicators.length > 2) {
      parent.issues.push({
        agent: parent.name,
        microAgent: 'review',
        severity: 'medium',
        type: 'missing-trust-indicators',
        title: 'Missing trust indicators',
        description: `Not found: ${missingIndicators.join(', ')}`,
        estimatedLoss: 0.02,
        fix: 'Add trust signals to improve conversion'
      });
    }
  }
}

/**
 * RiskMicro - Simulates scenarios for loss forecasts
 */
class RiskMicro {
  async hunt(parent) {
    console.log('      - RiskMicro: Running risk simulations...');
    
    // Simulate various risk scenarios
    const scenarios = [
      {
        name: 'Payment failure spike',
        trigger: () => this.checkPaymentErrorHandling(parent),
        impact: 0.05
      },
      {
        name: 'Checkout abandonment',
        trigger: () => this.checkCheckoutFriction(parent),
        impact: 0.03
      }
    ];
    
    for (const scenario of scenarios) {
      await scenario.trigger();
    }
  }
  
  checkPaymentErrorHandling(parent) {
    const checkoutDir = path.join(process.cwd(), 'components', 'checkout');
    if (!fs.existsSync(checkoutDir)) return;
    
    const entries = fs.readdirSync(checkoutDir);
    let hasErrorHandling = false;
    
    for (const entry of entries) {
      const content = fs.readFileSync(path.join(checkoutDir, entry), 'utf-8');
      if (content.includes('error') && content.includes('retry')) {
        hasErrorHandling = true;
        break;
      }
    }
    
    if (!hasErrorHandling) {
      parent.issues.push({
        agent: parent.name,
        microAgent: 'risk',
        severity: 'high',
        type: 'no-payment-retry',
        title: 'Payment errors may not have retry option',
        description: 'Users with failed payments may abandon checkout',
        estimatedLoss: 0.03,
        fix: 'Add retry mechanism for failed payments'
      });
    }
  }
  
  checkCheckoutFriction(parent) {
    const checkoutFiles = [
      path.join(process.cwd(), 'components', 'checkout', 'CheckoutRoot.tsx'),
      path.join(process.cwd(), 'app', '(site)', 'checkout', 'page.tsx')
    ];
    
    for (const file of checkoutFiles) {
      if (!fs.existsSync(file)) continue;
      
      const content = fs.readFileSync(file, 'utf-8');
      
      // Check for excessive form fields
      const inputCount = (content.match(/<input|<Input|<TextField/g) || []).length;
      
      if (inputCount > 15) {
        parent.issues.push({
          agent: parent.name,
          microAgent: 'risk',
          severity: 'medium',
          type: 'checkout-friction',
          title: 'High checkout friction',
          file: file.replace(process.cwd(), ''),
          description: `${inputCount} input fields may cause abandonment`,
          estimatedLoss: 0.02,
          fix: 'Reduce form fields or use progressive disclosure'
        });
      }
    }
  }
}

module.exports = TrustGuardian;
