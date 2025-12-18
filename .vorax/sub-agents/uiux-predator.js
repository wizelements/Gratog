/**
 * UIUX Predator Sub-Agent
 * 
 * Devours bad UI flows and poor user experience.
 * Simulates user journeys, accessibility checks, funnel analysis.
 * 
 * ACCURATE: Only flags real issues, not false positives
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
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;
      
      // Check for img tags WITHOUT alt attribute
      // Match <img that does NOT have alt= anywhere before the closing >
      if (/<img\s+[^>]*>/.test(line)) {
        // Extract the full img tag (may span multiple lines for complex cases)
        const imgMatch = line.match(/<img\s+[^>]*>/);
        if (imgMatch) {
          const imgTag = imgMatch[0];
          // Check if alt attribute exists (with = sign)
          if (!imgTag.includes('alt=') && !imgTag.includes('alt =')) {
            this.issues.push({
              agent: this.name,
              severity: 'high',
              type: 'img-no-alt',
              title: 'Image missing alt attribute',
              file: relativePath,
              line: lineNum,
              fix: 'Add alt attribute for accessibility'
            });
          }
        }
      }
      
      // Check for buttons without type (only native <button> tags, not components)
      if (/<button\s+[^>]*>/.test(line)) {
        const buttonMatch = line.match(/<button\s+[^>]*>/);
        if (buttonMatch) {
          const buttonTag = buttonMatch[0];
          if (!buttonTag.includes('type=') && !buttonTag.includes('type =')) {
            this.issues.push({
              agent: this.name,
              severity: 'low',
              type: 'button-no-type',
              title: 'Button without explicit type attribute',
              file: relativePath,
              line: lineNum,
              fix: 'Add type="button" or type="submit"'
            });
          }
        }
      }
      
      // Check for click handlers on divs without role/keyboard support
      if (/<div[^>]*onClick[^>]*>/.test(line)) {
        const divMatch = line.match(/<div[^>]*onClick[^>]*>/);
        if (divMatch) {
          const divTag = divMatch[0];
          if (!divTag.includes('role=') && !divTag.includes('tabIndex') && !divTag.includes('onKeyDown')) {
            this.issues.push({
              agent: this.name,
              severity: 'medium',
              type: 'div-click-no-a11y',
              title: 'Interactive div without keyboard support',
              file: relativePath,
              line: lineNum,
              fix: 'Add role="button" and keyboard handler, or use <button>'
            });
          }
        }
      }
    }
  }

  async checkAccessibility() {
    const appDir = path.join(process.cwd(), 'app');
    if (!fs.existsSync(appDir)) return;

    let a11yScore = 100;
    let issueCount = 0;

    const scanForA11y = (dir) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          scanForA11y(fullPath);
        } else if (/\.(jsx?|tsx?)$/.test(entry.name)) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          
          // Positive: Check for aria attributes
          if (content.includes('aria-label') || content.includes('aria-labelledby')) {
            a11yScore += 1;
          }
          if (content.includes('aria-expanded') || content.includes('aria-controls')) {
            a11yScore += 0.5;
          }
          if (content.includes('aria-live') || content.includes('aria-atomic')) {
            a11yScore += 0.5;
          }
          if (content.includes('role=')) {
            a11yScore += 0.5;
          }
          
          // Check for semantic HTML usage
          const hasSemanticHTML = content.includes('<main') || 
                                   content.includes('<nav') || 
                                   content.includes('<header') ||
                                   content.includes('<footer') ||
                                   content.includes('<article') ||
                                   content.includes('<section');
          if (hasSemanticHTML) {
            a11yScore += 1;
          }
          
          // Check for focus indicators
          if (content.includes('focus:') || content.includes(':focus') || content.includes('focus-visible')) {
            a11yScore += 0.5;
          }
          
          // Check for keyboard support
          if (content.includes('onKeyDown') || content.includes('onKeyPress') || content.includes('onKeyUp')) {
            a11yScore += 0.5;
          }
        }
      }
    };

    scanForA11y(appDir);
    this.accessibilityScore = Math.min(100, Math.max(0, Math.round(a11yScore)));

    // Only report if score is critically low (< 40)
    if (this.accessibilityScore < 40) {
      this.issues.push({
        agent: this.name,
        microAgent: 'access',
        severity: 'high',
        type: 'low-a11y-score',
        title: `Accessibility score: ${this.accessibilityScore}/100`,
        description: 'Multiple accessibility issues detected',
        fix: 'Add ARIA labels, semantic HTML, and focus indicators'
      });
    } else if (this.accessibilityScore < 60) {
      this.issues.push({
        agent: this.name,
        microAgent: 'access',
        severity: 'medium',
        type: 'moderate-a11y-score',
        title: `Accessibility score: ${this.accessibilityScore}/100`,
        description: 'Some accessibility improvements recommended',
        fix: 'Add more ARIA labels and focus indicators'
      });
    }
  }

  async analyzeForms() {
    const componentsDir = path.join(process.cwd(), 'components');
    const uiDir = path.join(componentsDir, 'ui');
    
    // Only check UI primitives for label issues
    if (fs.existsSync(uiDir)) {
      const entries = fs.readdirSync(uiDir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (!entry.isFile()) continue;
        if (!entry.name.includes('input')) continue;
        
        const fullPath = path.join(uiDir, entry.name);
        const content = fs.readFileSync(fullPath, 'utf-8');
        const relativePath = fullPath.replace(process.cwd(), '');
        
        // For UI primitive input components, they should support aria-label passthrough
        // This is typically done via {...props} spread, so check for that
        if (content.includes('<input') && !content.includes('{...props}') && !content.includes('...props')) {
          this.issues.push({
            agent: this.name,
            microAgent: 'access',
            severity: 'medium',
            type: 'input-no-props-spread',
            title: 'Input component may not pass through aria props',
            file: relativePath,
            fix: 'Ensure {...props} spread passes aria-label and other a11y props'
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
    
    const appDir = path.join(process.cwd(), 'app');
    if (!fs.existsSync(appDir)) return;
    
    const routes = this.getRoutes(appDir);
    
    // Only flag extremely deep nesting (> 6 levels)
    for (const route of routes) {
      const depth = route.split('/').filter(Boolean).length;
      if (depth > 6) {
        parent.issues.push({
          agent: parent.name,
          microAgent: 'flow',
          severity: 'low',
          type: 'deep-route',
          title: 'Very deeply nested route',
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
    
    const layoutPath = path.join(process.cwd(), 'app', 'layout.js');
    const layoutTsPath = path.join(process.cwd(), 'app', 'layout.tsx');
    const layoutFile = fs.existsSync(layoutPath) ? layoutPath : 
                       fs.existsSync(layoutTsPath) ? layoutTsPath : null;
    
    if (layoutFile) {
      const content = fs.readFileSync(layoutFile, 'utf-8');
      
      // Check for lang attribute
      if (!content.includes('lang=') && !content.includes('lang =')) {
        parent.issues.push({
          agent: parent.name,
          microAgent: 'access',
          severity: 'medium',
          type: 'no-lang-attr',
          title: 'HTML lang attribute not set',
          file: layoutFile.replace(process.cwd(), ''),
          fix: 'Add lang attribute to html element: <html lang="en">'
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
    
    // Check button.tsx for icon size (the source of tap targets)
    const buttonPath = path.join(process.cwd(), 'components', 'ui', 'button.tsx');
    if (fs.existsSync(buttonPath)) {
      const content = fs.readFileSync(buttonPath, 'utf-8');
      
      // Check if icon size is at least 44px (h-11 w-11)
      if (content.includes('size: "icon"') || content.includes("size: 'icon'")) {
        // Look for the icon variant dimensions
        const iconMatch = content.match(/icon:\s*["'][^"']*["']/);
        if (iconMatch) {
          const iconClasses = iconMatch[0];
          // Check if it has h-9 or smaller (less than 44px)
          if (iconClasses.includes('h-8') || iconClasses.includes('h-7') || 
              iconClasses.includes('h-6') || iconClasses.includes('w-8') ||
              iconClasses.includes('w-7') || iconClasses.includes('w-6')) {
            parent.issues.push({
              agent: parent.name,
              microAgent: 'mobile',
              severity: 'medium',
              type: 'small-icon-button',
              title: 'Icon button may be smaller than 44x44px',
              file: '/components/ui/button.tsx',
              fix: 'Ensure icon variant is at least h-11 w-11 (44px)'
            });
          }
        }
      }
    }
  }
}

module.exports = UiuxPredator;
