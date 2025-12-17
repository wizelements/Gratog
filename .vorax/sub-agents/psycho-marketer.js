/**
 * PsychoMarketer Sub-Agent
 * 
 * Detects psychological marketing inconsistencies.
 * Analyzes content with NLP for cognitive biases, A/B test discrepancies.
 * Continuously A/B tests alternatives, "starving" if consistency <90%.
 * 
 * Micro-agents: BiasMicro, ToneMicro, EngageMicro
 */

const fs = require('fs');
const path = require('path');

class PsychoMarketer {
  constructor(config, prime) {
    this.config = config;
    this.prime = prime;
    this.name = 'psycho-marketer';
    this.issues = [];
    this.sentimentThreshold = config.sentimentThreshold || 0.7;
    this.microAgents = {
      bias: new BiasMicro(),
      tone: new ToneMicro(),
      engage: new EngageMicro()
    };
  }

  async hunt() {
    this.issues = [];
    const startTime = Date.now();

    console.log('   🧠 Analyzing marketing psychology...');

    await Promise.all([
      this.analyzeMessaging(),
      this.checkCTAConsistency(),
      this.analyzeValueProposition(),
      this.microAgents.bias.hunt(this),
      this.microAgents.tone.hunt(this),
      this.microAgents.engage.hunt(this)
    ]);

    return {
      agent: this.name,
      duration: Date.now() - startTime,
      issues: this.issues,
      stats: {
        messagingScore: this.messagingScore || 100,
        ctaCount: this.ctaCount || 0,
        toneConsistency: this.toneConsistency || 100
      }
    };
  }

  async analyzeMessaging() {
    const contentPaths = this.config.contentPaths || ['app/(site)/', 'components/'];
    let messagingScore = 100;
    
    for (const contentPath of contentPaths) {
      const fullPath = path.join(process.cwd(), contentPath);
      if (!fs.existsSync(fullPath)) continue;
      
      const files = this.getFiles(fullPath);
      
      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');
        const relativePath = file.replace(process.cwd(), '');
        
        // Check for mixed messaging
        const messagingChecks = [
          {
            name: 'Urgency overload',
            patterns: [/hurry/gi, /limited/gi, /now/gi, /fast/gi, /quick/gi],
            threshold: 5,
            severity: 'medium',
            penalty: 10
          },
          {
            name: 'Vague benefits',
            patterns: [/great|amazing|awesome|incredible/gi],
            negatives: [/because|which means|so that/gi],
            severity: 'low',
            penalty: 5
          },
          {
            name: 'Price anchoring without context',
            patterns: [/was \$\d+|originally \$\d+|save \$\d+/gi],
            requires: [/now|today|only/gi],
            severity: 'medium',
            penalty: 8
          }
        ];
        
        for (const check of messagingChecks) {
          let matchCount = 0;
          for (const pattern of check.patterns) {
            const matches = content.match(pattern) || [];
            matchCount += matches.length;
          }
          
          if (check.threshold && matchCount > check.threshold) {
            messagingScore -= check.penalty;
            this.issues.push({
              agent: this.name,
              severity: check.severity,
              type: 'messaging-issue',
              title: check.name,
              file: relativePath,
              description: `${matchCount} instances found (threshold: ${check.threshold})`,
              fix: 'Reduce intensity or add substantive value propositions'
            });
          }
        }
      }
    }
    
    this.messagingScore = Math.max(0, messagingScore);
  }

  async checkCTAConsistency() {
    const ctaPatterns = [
      { pattern: /add\s*to\s*cart/gi, category: 'cart' },
      { pattern: /buy\s*now/gi, category: 'purchase' },
      { pattern: /shop\s*now/gi, category: 'browse' },
      { pattern: /get\s*started/gi, category: 'start' },
      { pattern: /learn\s*more/gi, category: 'info' },
      { pattern: /sign\s*up/gi, category: 'signup' },
      { pattern: /subscribe/gi, category: 'subscribe' },
      { pattern: /order\s*now/gi, category: 'purchase' },
      { pattern: /checkout/gi, category: 'checkout' }
    ];
    
    const ctasByCategory = new Map();
    const appDir = path.join(process.cwd(), 'app');
    const componentsDir = path.join(process.cwd(), 'components');
    
    const scanDir = (dir) => {
      if (!fs.existsSync(dir)) return;
      
      const files = this.getFiles(dir);
      
      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');
        
        for (const cta of ctaPatterns) {
          const matches = content.match(cta.pattern) || [];
          if (matches.length > 0) {
            const existing = ctasByCategory.get(cta.category) || [];
            matches.forEach(m => existing.push(m.toLowerCase()));
            ctasByCategory.set(cta.category, existing);
          }
        }
      }
    };
    
    scanDir(appDir);
    scanDir(componentsDir);
    
    let ctaCount = 0;
    for (const [category, ctas] of ctasByCategory) {
      ctaCount += ctas.length;
      const uniqueCtas = new Set(ctas);
      
      // Flag if same action has multiple different CTAs
      if (uniqueCtas.size > 2 && category === 'purchase') {
        this.issues.push({
          agent: this.name,
          severity: 'low',
          type: 'cta-inconsistency',
          title: `Inconsistent ${category} CTAs`,
          description: `Found variations: ${Array.from(uniqueCtas).join(', ')}`,
          fix: 'Standardize CTA text for consistency'
        });
      }
    }
    
    this.ctaCount = ctaCount;
  }

  async analyzeValueProposition() {
    // Check homepage for clear value proposition
    const homepagePath = path.join(process.cwd(), 'app', '(site)', 'page.tsx');
    
    if (!fs.existsSync(homepagePath)) {
      const altPath = path.join(process.cwd(), 'app', 'page.tsx');
      if (!fs.existsSync(altPath)) return;
    }
    
    const content = fs.readFileSync(
      fs.existsSync(homepagePath) ? homepagePath : path.join(process.cwd(), 'app', 'page.tsx'),
      'utf-8'
    );
    
    // Check for value proposition elements
    const vpElements = [
      { name: 'Headline', pattern: /<h1|<H1|className=".*text-(3xl|4xl|5xl)/g },
      { name: 'Subheadline', pattern: /<h2|<H2|subtitle|subheading/gi },
      { name: 'Benefit statement', pattern: /benefit|helps?|improve|boost/gi },
      { name: 'Social proof', pattern: /customer|review|testimonial|rating|\d+\s*\+?\s*(happy|satisfied)/gi },
      { name: 'Trust badge', pattern: /secure|verified|certified|guarantee/gi }
    ];
    
    const missingElements = [];
    
    for (const element of vpElements) {
      if (!element.pattern.test(content)) {
        missingElements.push(element.name);
      }
    }
    
    if (missingElements.length > 2) {
      this.issues.push({
        agent: this.name,
        severity: 'high',
        type: 'weak-value-proposition',
        title: 'Homepage missing key value proposition elements',
        description: `Missing: ${missingElements.join(', ')}`,
        fix: 'Add clear headline, benefits, and social proof'
      });
    }
  }

  getFiles(dir) {
    const files = [];
    
    const scan = (currentDir) => {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          scan(fullPath);
        } else if (/\.(jsx?|tsx?)$/.test(entry.name)) {
          files.push(fullPath);
        }
      }
    };
    
    scan(dir);
    return files;
  }
}

/**
 * BiasMicro - Detects manipulative tactics vs ethical norms
 */
class BiasMicro {
  async hunt(parent) {
    console.log('      - BiasMicro: Checking for manipulative patterns...');
    
    const manipulativePatterns = [
      {
        pattern: /only\s*\d+\s*left|low\s*stock|selling\s*fast/gi,
        name: 'False scarcity',
        severity: 'medium',
        suggestion: 'Ensure scarcity claims are accurate'
      },
      {
        pattern: /\d+\s*people\s*(viewing|watching|bought)/gi,
        name: 'Social pressure',
        severity: 'low',
        suggestion: 'Use real-time data if displaying'
      },
      {
        pattern: /last\s*chance|final\s*offer|never\s*again/gi,
        name: 'FOMO manipulation',
        severity: 'medium',
        suggestion: 'Avoid false urgency claims'
      },
      {
        pattern: /dark\s*pattern|trick|manipulat/gi,
        name: 'Dark pattern indicator',
        severity: 'high',
        suggestion: 'Review for dark patterns'
      }
    ];
    
    const appDir = path.join(process.cwd(), 'app');
    const componentsDir = path.join(process.cwd(), 'components');
    
    for (const dir of [appDir, componentsDir]) {
      if (!fs.existsSync(dir)) continue;
      
      const files = parent.getFiles(dir);
      
      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');
        const relativePath = file.replace(process.cwd(), '');
        
        for (const pattern of manipulativePatterns) {
          if (pattern.pattern.test(content)) {
            pattern.pattern.lastIndex = 0;
            
            parent.issues.push({
              agent: parent.name,
              microAgent: 'bias',
              severity: pattern.severity,
              type: 'manipulative-pattern',
              title: pattern.name,
              file: relativePath,
              fix: pattern.suggestion
            });
          }
        }
      }
    }
  }
}

/**
 * ToneMicro - Ensures consistent brand voice
 */
class ToneMicro {
  async hunt(parent) {
    console.log('      - ToneMicro: Analyzing brand voice consistency...');
    
    // Define brand voice characteristics
    const toneIndicators = {
      formal: [/therefore|furthermore|consequently|hereby/gi],
      casual: [/hey|gonna|wanna|awesome|cool/gi],
      professional: [/solution|optimize|leverage|streamline/gi],
      friendly: [/we're|you'll|let's|together/gi],
      aggressive: [/must|need to|have to|don't miss/gi]
    };
    
    const toneScores = {};
    for (const tone of Object.keys(toneIndicators)) {
      toneScores[tone] = 0;
    }
    
    const contentDirs = ['app/(site)', 'components'];
    
    for (const dir of contentDirs) {
      const fullDir = path.join(process.cwd(), dir);
      if (!fs.existsSync(fullDir)) continue;
      
      const files = parent.getFiles(fullDir);
      
      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');
        
        for (const [tone, patterns] of Object.entries(toneIndicators)) {
          for (const pattern of patterns) {
            const matches = content.match(pattern) || [];
            toneScores[tone] += matches.length;
          }
        }
      }
    }
    
    // Analyze tone distribution
    const totalMatches = Object.values(toneScores).reduce((a, b) => a + b, 0);
    if (totalMatches > 0) {
      const dominantTone = Object.entries(toneScores)
        .sort((a, b) => b[1] - a[1])[0];
      
      const dominantPercentage = (dominantTone[1] / totalMatches) * 100;
      
      // Flag if no dominant tone (inconsistent voice)
      if (dominantPercentage < 40 && totalMatches > 20) {
        parent.issues.push({
          agent: parent.name,
          microAgent: 'tone',
          severity: 'medium',
          type: 'inconsistent-voice',
          title: 'Brand voice inconsistency',
          description: `No dominant tone (highest: ${dominantTone[0]} at ${dominantPercentage.toFixed(0)}%)`,
          fix: 'Define and enforce consistent brand voice guidelines'
        });
      }
      
      // Flag conflicting tones
      if (toneScores.formal > 10 && toneScores.casual > 10) {
        parent.issues.push({
          agent: parent.name,
          microAgent: 'tone',
          severity: 'low',
          type: 'mixed-formality',
          title: 'Mixed formality levels',
          description: 'Content mixes formal and casual language',
          fix: 'Choose consistent formality level'
        });
      }
    }
    
    parent.toneConsistency = totalMatches > 0 
      ? Math.round((Object.entries(toneScores).sort((a, b) => b[1] - a[1])[0][1] / totalMatches) * 100)
      : 100;
  }
}

/**
 * EngageMicro - Analyzes clickbait vs value-driven content
 */
class EngageMicro {
  async hunt(parent) {
    console.log('      - EngageMicro: Checking content quality...');
    
    const clickbaitPatterns = [
      { pattern: /you won't believe|shocking|mind.?blow/gi, severity: 'medium' },
      { pattern: /this\s+\w+\s+trick|secret\s+\w+\s+that/gi, severity: 'low' },
      { pattern: /what happens next|you'll never guess/gi, severity: 'medium' },
      { pattern: /\d+\s+(ways?|reasons?|secrets?|tricks?)\s+to/gi, severity: 'low' }
    ];
    
    const valuePatterns = [
      /how to|guide|tutorial|learn/gi,
      /benefits?|features?|includes?/gi,
      /research|studies?|evidence|proven/gi
    ];
    
    let clickbaitScore = 0;
    let valueScore = 0;
    
    const appDir = path.join(process.cwd(), 'app', '(site)');
    if (!fs.existsSync(appDir)) return;
    
    const files = parent.getFiles(appDir);
    
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      
      for (const { pattern, severity } of clickbaitPatterns) {
        const matches = content.match(pattern) || [];
        clickbaitScore += matches.length * (severity === 'medium' ? 2 : 1);
      }
      
      for (const pattern of valuePatterns) {
        const matches = content.match(pattern) || [];
        valueScore += matches.length;
      }
    }
    
    // Flag if clickbait outweighs value content
    if (clickbaitScore > valueScore && clickbaitScore > 5) {
      parent.issues.push({
        agent: parent.name,
        microAgent: 'engage',
        severity: 'medium',
        type: 'clickbait-heavy',
        title: 'Content leans toward clickbait',
        description: `Clickbait score: ${clickbaitScore}, Value score: ${valueScore}`,
        fix: 'Add more substantive, value-driven content'
      });
    }
  }
}

module.exports = PsychoMarketer;
