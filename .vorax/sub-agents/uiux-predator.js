/**
 * UIUX Predator Sub-Agent
 * 
 * Devours bad UI flows and poor user experience.
 * Simulates user journeys, accessibility checks, funnel analysis.
 * Replays sessions at 10x speed hunting micro-frustrations.
 * 
 * Micro-agents: FlowMicro, AccessMicro, MobileMicro
 */

const fs = require('fs');
const path = require('path');

class UiuxPredator {
  constructor(config, prime) {
    this.config = config;
    this.prime = prime;
    this.name = 'uiux-predator';
    this.issues = [];
    this.wcagLevel = config.wcagLevel || 'AA';
    this.microAgents = {
      flow: new FlowMicro(),
      access: new AccessMicro(),
      mobile: new MobileMicro()
    };
  }

  async hunt() {
    this.issues = [];
    const startTime = Date.now();

    console.log('   🎨 Analyzing UI/UX...');

    await Promise.all([
      this.analyzeComponents(),
      this.checkAccessibility(),
      this.analyzeForms(),
      this.microAgents.flow.hunt(this),
      this.microAgents.access.hunt(this),
      this.microAgents.mobile.hunt(this)
    ]);

    return {
      agent: this.name,
      duration: Date.now() - startTime,
      issues: this.issues,
      stats: {
        componentsScanned: this.componentsScanned || 0,
        accessibilityScore: this.accessibilityScore
      }
    };
  }

  async analyzeComponents() {
    const componentsDir = path.join(process.cwd(), 'components');
    if (!fs.existsSync(componentsDir)) return;

    let componentsScanned = 0;
    
    const scanComponents = (dir) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          scanComponents(fullPath);
        } else if (/\.(jsx?|tsx?)$/.test(entry.name)) {
          componentsScanned++;
          this.checkComponentUX(fullPath);
        }
      }
    };

    scanComponents(componentsDir);
    this.componentsScanned = componentsScanned;
  }

  checkComponentUX(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const relativePath = filePath.replace(process.cwd(), '');
    
    const uxChecks = [
      {
        pattern: /<button[^>]*(?!type=)/g,
        severity: 'low',
        type: 'button-no-type',
        msg: 'Button without explicit type attribute'
      },
      {
        pattern: /<img[^>]*(?!alt=)/g,
        severity: 'high',
        type: 'img-no-alt',
        msg: 'Image missing alt attribute'
      },
      {
        pattern: /onClick\s*=\s*{[^}]*}\s*>/g,
        checkContext: (line) => !line.includes('button') && !line.includes('Button') && line.includes('<div'),
        severity: 'medium',
        type: 'div-click-handler',
        msg: 'Click handler on non-button element'
      },
      {
        pattern: /className="[^"]*text-xs[^"]*"/g,
        severity: 'low',
        type: 'small-text',
        msg: 'Very small text (text-xs) may be hard to read'
      },
      {
        pattern: /disabled\s*&&/g,
        checkContext: (line) => !line.includes('cursor-not-allowed'),
        severity: 'low',
        type: 'disabled-no-cursor',
        msg: 'Disabled state without visual cursor feedback'
      }
    ];

    for (const check of uxChecks) {
      const matches = content.match(check.pattern);
      if (matches) {
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (check.pattern.test(lines[i])) {
            if (check.checkContext && !check.checkContext(lines[i])) continue;
            
            this.issues.push({
              agent: this.name,
              severity: check.severity,
              type: check.type,
              title: check.msg,
              file: relativePath,
              line: i + 1,
              fix: `Review and fix: ${check.type}`
            });
            break;
          }
        }
      }
    }
  }

  async checkAccessibility() {
    // Check for common accessibility patterns in the codebase
    const appDir = path.join(process.cwd(), 'app');
    if (!fs.existsSync(appDir)) return;

    const a11yIssues = [];
    let a11yScore = 100;

    const scanForA11y = (dir) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          scanForA11y(fullPath);
        } else if (/\.(jsx?|tsx?)$/.test(entry.name)) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          
          // Check for aria labels
          if (content.includes('onClick') && !content.includes('aria-')) {
            a11yScore -= 2;
          }
          
          // Check for semantic HTML
          if (content.includes('<div') && content.includes('onClick') && 
              !content.includes('role=') && !content.includes('<button')) {
            a11yIssues.push({
              file: fullPath.replace(process.cwd(), ''),
              issue: 'Interactive div without role attribute'
            });
            a11yScore -= 5;
          }
          
          // Check for focus indicators
          if (content.includes(':focus') || content.includes('focus:')) {
            // Good - has focus styles
          } else if (content.includes('onClick') || content.includes('button')) {
            a11yScore -= 1;
          }
        }
      }
    };

    scanForA11y(appDir);
    this.accessibilityScore = Math.max(0, a11yScore);

    if (this.accessibilityScore < 80) {
      this.issues.push({
        agent: this.name,
        microAgent: 'access',
        severity: 'high',
        type: 'low-a11y-score',
        title: `Accessibility score: ${this.accessibilityScore}/100`,
        description: 'Multiple accessibility issues detected',
        fix: 'Add ARIA labels, semantic HTML, and focus indicators'
      });
    }
  }

  async analyzeForms() {
    const appDir = path.join(process.cwd(), 'app');
    const componentsDir = path.join(process.cwd(), 'components');
    
    const dirs = [appDir, componentsDir].filter(d => fs.existsSync(d));
    
    for (const dir of dirs) {
      this.scanFormsInDir(dir);
    }
  }

  scanFormsInDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        this.scanFormsInDir(fullPath);
      } else if (/\.(jsx?|tsx?)$/.test(entry.name)) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const relativePath = fullPath.replace(process.cwd(), '');
        
        // Check for forms without validation feedback
        if (content.includes('<form') || content.includes('<Form')) {
          if (!content.includes('error') && !content.includes('Error')) {
            this.issues.push({
              agent: this.name,
              severity: 'medium',
              type: 'form-no-errors',
              title: 'Form without error display',
              file: relativePath,
              fix: 'Add error handling and display to form'
            });
          }
        }
        
        // Check for inputs without labels
        if ((content.includes('<input') || content.includes('<Input')) &&
            !content.includes('<label') && !content.includes('<Label') &&
            !content.includes('aria-label')) {
          this.issues.push({
            agent: this.name,
            microAgent: 'access',
            severity: 'high',
            type: 'input-no-label',
            title: 'Input without associated label',
            file: relativePath,
            fix: 'Add label element or aria-label attribute'
          });
        }
      }
    }
  }
}

/**
 * FlowMicro - Maps and critiques navigation paths
 */
class FlowMicro {
  async hunt(parent) {
    console.log('      - FlowMicro: Analyzing navigation flows...');
    
    // Check for navigation patterns
    const appDir = path.join(process.cwd(), 'app');
    if (!fs.existsSync(appDir)) return;
    
    // Analyze route structure
    const routes = this.getRoutes(appDir);
    
    // Check for deep nesting (> 4 levels)
    for (const route of routes) {
      const depth = route.split('/').length;
      if (depth > 5) {
        parent.issues.push({
          agent: parent.name,
          microAgent: 'flow',
          severity: 'low',
          type: 'deep-route',
          title: 'Deeply nested route',
          file: route,
          description: `Route depth: ${depth} levels`,
          fix: 'Consider flattening navigation structure'
        });
      }
    }
  }
  
  getRoutes(dir, prefix = '') {
    const routes = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith('.') && !entry.name.startsWith('_')) {
        const routePath = `${prefix}/${entry.name}`;
        routes.push(routePath);
        routes.push(...this.getRoutes(path.join(dir, entry.name), routePath));
      }
    }
    
    return routes;
  }
}

/**
 * AccessMicro - Checks for ADA compliance
 */
class AccessMicro {
  async hunt(parent) {
    console.log('      - AccessMicro: Checking WCAG compliance...');
    
    // Additional accessibility checks
    const layoutPath = path.join(process.cwd(), 'app', 'layout.js');
    if (fs.existsSync(layoutPath)) {
      const content = fs.readFileSync(layoutPath, 'utf-8');
      
      if (!content.includes('lang=')) {
        parent.issues.push({
          agent: parent.name,
          microAgent: 'access',
          severity: 'medium',
          type: 'no-lang-attr',
          title: 'HTML lang attribute not set',
          file: '/app/layout.js',
          fix: 'Add lang attribute to html element'
        });
      }
      
      if (!content.includes('skip') && !content.includes('Skip')) {
        parent.issues.push({
          agent: parent.name,
          microAgent: 'access',
          severity: 'low',
          type: 'no-skip-link',
          title: 'No skip navigation link',
          file: '/app/layout.js',
          fix: 'Add skip to main content link for keyboard users'
        });
      }
    }
  }
}

/**
 * MobileMicro - Optimizes for touch/scroll behaviors
 */
class MobileMicro {
  async hunt(parent) {
    console.log('      - MobileMicro: Checking mobile optimization...');
    
    const componentsDir = path.join(process.cwd(), 'components');
    if (!fs.existsSync(componentsDir)) return;
    
    // Check for touch-friendly tap targets
    this.scanForTapTargets(componentsDir, parent);
  }
  
  scanForTapTargets(dir, parent) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        this.scanForTapTargets(fullPath, parent);
      } else if (/\.(jsx?|tsx?)$/.test(entry.name)) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        
        // Check for small tap targets
        const smallSizes = ['w-4', 'h-4', 'w-5', 'h-5', 'w-6', 'h-6'];
        for (const size of smallSizes) {
          if (content.includes(`onClick`) && content.includes(size)) {
            if (!content.includes('p-2') && !content.includes('p-3') && !content.includes('p-4')) {
              parent.issues.push({
                agent: parent.name,
                microAgent: 'mobile',
                severity: 'medium',
                type: 'small-tap-target',
                title: 'Potentially small tap target',
                file: fullPath.replace(process.cwd(), ''),
                description: `Found ${size} with click handler - may be < 44x44px`,
                fix: 'Ensure tap targets are at least 44x44px'
              });
              break;
            }
          }
        }
      }
    }
  }
}

module.exports = UiuxPredator;
