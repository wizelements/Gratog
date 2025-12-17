# 🦖 VORAX - The Apex Predator of Quality Assurance

**VORAX** (Voracious Optimization, Review, Analysis, and eXamination) is a multi-agent quality assurance system that continuously hunts for bugs, performance issues, UX problems, and trust-eroding content.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     VORAX PRIME                             │
│              (Apex Coordinator Agent)                       │
│   • Appetite mechanism (hunger-based scanning)              │
│   • Aggregates reports from all sub-agents                  │
│   • Prioritizes by severity and revenue impact              │
│   • Triggers escalations and deployment halts               │
└─────────────────────┬───────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
┌───────────┐  ┌───────────┐  ┌───────────┐
│ BugHunter │  │ OptiBeast │  │   UIUX    │
│           │  │           │  │ Predator  │
├───────────┤  ├───────────┤  ├───────────┤
│• CrashMicro│  │• AssetMicro│  │• FlowMicro│
│• SecMicro  │  │• CacheMicro│  │• AccessMicro│
│• CompatMicro│ │• EnergyMicro│ │• MobileMicro│
└───────────┘  └───────────┘  └───────────┘

┌───────────┐  ┌───────────┐  ┌───────────┐
│   Log     │  │  Trust    │  │  Psycho   │
│ Devourer  │  │ Guardian  │  │ Marketer  │
├───────────┤  ├───────────┤  ├───────────┤
│• TraceMicro│  │• ContentMicro│ │• BiasMicro│
│• AnomMicro │  │• ReviewMicro│  │• ToneMicro│
│• PruneMicro│  │• RiskMicro  │  │• EngageMicro│
└───────────┘  └───────────┘  └───────────┘
        │             │             │
        └─────────────┴─────────────┘
                      │
        ┌─────────────┴─────────────┐
        │      NANO AGENTS          │
        │  (Atomic-level checks)    │
        ├───────────────────────────┤
        │ SyntaxNano • ColorNano    │
        │ WordNano • QueryNano      │
        │ ByteNano • TrustNano      │
        │ SecurityNano              │
        └───────────────────────────┘
```

## 🚀 Quick Start

```bash
# Run a full scan
npm run vorax

# Quick pre-commit check
npm run vorax:quick

# Run nano-agents only (fastest)
npm run vorax:nano

# Continuous monitoring
npm run vorax:watch

# Show latest report
npm run vorax:report

# Check status
npm run vorax:status
```

## 📊 Understanding the Reports

### Severity Levels

| Level | Icon | Description | Action Required |
|-------|------|-------------|-----------------|
| **Critical** | 🔴 | Security vulnerabilities, data loss risks | Immediate |
| **High** | 🟠 | Major bugs, significant UX issues | Within 24h |
| **Medium** | 🟡 | Performance issues, minor bugs | This sprint |
| **Low** | 🟢 | Code style, optimization suggestions | Backlog |

### Appetite Mechanism

VORAX uses a "hunger" system to dynamically adjust its behavior:

- **Hunger Level 0-20 (Starving)**: No issues found recently. VORAX runs stress tests and edge case simulations.
- **Hunger Level 21-79 (Normal)**: Standard scanning frequency (hourly).
- **Hunger Level 80-100 (Aggressive)**: Many unresolved issues. Scans run every 15 minutes.

## 🐺 Sub-Agents

### 🔍 BugHunter
Voraciously hunts bugs, crashes, and security vulnerabilities.
- Syntax error scanning
- TypeScript error detection
- Unit test execution
- Security vulnerability scanning

### ⚡ OptiBeast
Ravages poor optimization and slow performance.
- Bundle size analysis
- Asset optimization checks
- Lighthouse score monitoring
- Caching strategy audits

### 🎨 UIUX Predator
Devours bad UI flows and poor user experience.
- Accessibility (WCAG) compliance
- Navigation flow analysis
- Mobile optimization
- Form usability

### 📋 LogDevourer
Consumes bad logging practices.
- Structured logging adoption
- Trace completeness
- Log verbosity analysis
- Anomaly detection

### 🛡️ TrustGuardian
Tracks potential revenue losses from trust erosion.
- Content consistency
- Price integrity
- Claim verification
- Revenue impact modeling

### 🧠 PsychoMarketer
Detects psychological marketing inconsistencies.
- Brand voice consistency
- CTA optimization
- Value proposition clarity
- Ethical marketing compliance

## ⚙️ Configuration

Edit `.vorax/configs/vorax.config.js`:

```javascript
module.exports = {
  appetite: {
    baseHungerLevel: 50,
    hungerIncreaseRate: 5,    // Per unresolved issue
    hungerDecreaseRate: 10,   // Per resolved issue
    aggressiveThreshold: 80,  // Trigger aggressive mode
    starvingThreshold: 20,    // Trigger stress tests
  },
  
  escalation: {
    criticalRevenueImpact: 0.05,  // 5% loss triggers alert
    deploymentHalt: true,          // Block deploys on critical
  },
  
  subAgents: {
    bugHunter: { enabled: true, priority: 1 },
    optiBeast: { enabled: true, targetLoadTime: 1000 },
    // ... more configuration
  }
};
```

## 🔄 CI/CD Integration

VORAX integrates with GitHub Actions automatically:

- **On Pull Request**: Quick scan with results in PR comments
- **On Push to Main**: Full hunt with artifact upload
- **Daily Schedule**: Complete security and quality audit

### Blocking Deployments

When critical issues are found:
1. VORAX returns exit code 1
2. CI/CD pipeline fails
3. Stakeholders are notified
4. Deployment is blocked until fixed

## 📈 Metrics Tracked

- **Total Issues**: All detected problems
- **Resolution Rate**: Issues fixed vs. found
- **Scan Count**: Number of hunts run
- **Health Score**: Overall codebase health (0-100)
- **Trust Score**: Content trustworthiness
- **Revenue Impact**: Estimated financial risk

## 🎯 Best Practices

1. **Run `vorax:quick` before commits** - Catch issues early
2. **Review reports daily** - Stay ahead of technical debt
3. **Fix critical issues immediately** - They block deployments
4. **Feed the beast** - Resolve issues to reduce hunger level
5. **Configure thresholds** - Adjust to your team's capacity

## 📁 Directory Structure

```
.vorax/
├── agents/
│   └── vorax-prime.js       # Main coordinator
├── sub-agents/
│   ├── bug-hunter.js        # Bug detection
│   ├── opti-beast.js        # Performance
│   ├── uiux-predator.js     # UI/UX analysis
│   ├── log-devourer.js      # Logging quality
│   ├── trust-guardian.js    # Revenue protection
│   └── psycho-marketer.js   # Marketing consistency
├── nano-agents/
│   └── index.js             # Atomic checkers
├── configs/
│   └── vorax.config.js      # Configuration
├── reports/
│   ├── latest.json          # Latest scan data
│   └── LATEST_REPORT.md     # Human-readable report
├── dashboard/
│   └── index.html           # Web dashboard
├── vorax-cli.js             # CLI interface
└── README.md                # This file
```

## 🆘 Troubleshooting

### Scan takes too long
- Use `vorax:quick` for faster checks
- Adjust `excludePaths` in config

### Too many false positives
- Tune severity thresholds
- Add patterns to ignore list
- Adjust agent configurations

### Sub-agent errors
- Check file paths in config
- Ensure dependencies are installed
- Review error logs in reports

## 🚀 Roadmap

- [ ] Machine learning for issue prediction
- [ ] Automated fix suggestions with PR creation
- [ ] Real-time dashboard with WebSocket updates
- [ ] Integration with Sentry for error correlation
- [ ] Custom rule definitions
- [ ] Team performance metrics

---

**Remember**: VORAX is always hungry. Feed it by fixing issues, or it will become aggressive! 🦖
