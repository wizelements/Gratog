# 🚀 Advanced Operations Guide

**Status:** Production-Ready Advanced Systems  
**Last Updated:** Dec 21, 2025

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Advanced Workflows](#advanced-workflows)
3. [Error Analytics & Pattern Detection](#error-analytics--pattern-detection)
4. [Smart Alerting System](#smart-alerting-system)
5. [Canary Deployments](#canary-deployments)
6. [Performance Monitoring](#performance-monitoring)
7. [Accessibility & Cross-Browser Testing](#accessibility--cross-browser-testing)
8. [Operational Dashboards](#operational-dashboards)
9. [Incident Response](#incident-response)
10. [Metrics & KPIs](#metrics--kpis)

---

## System Overview

### Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│ Monitoring & Alerting Layer                                 │
│ (Smart alerts, Sentry, Slack, PagerDuty, GitHub)          │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│ Deployment & Operations Layer                               │
│ (Canary deployments, auto-rollback, traffic routing)       │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│ Testing & Quality Layer                                     │
│ (E2E, accessibility, visual regression, performance)       │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│ Application Layer                                           │
│ (Next.js, React, Zustand stores, error boundaries)        │
└─────────────────────────────────────────────────────────────┘
```

### Key Systems Deployed

| System | Purpose | Status |
|--------|---------|--------|
| **Cross-Browser E2E** | Automated testing across browsers & devices | ✅ Active |
| **Performance Monitoring** | Lighthouse, Core Web Vitals, bundle size | ✅ Active |
| **Error Analytics** | Pattern detection, ML clustering of errors | ✅ Active |
| **Smart Alerting** | Intelligent notifications with cooldowns | ✅ Active |
| **Canary Deployments** | Gradual rollouts with auto-rollback | ✅ Active |
| **Accessibility Audits** | WCAG compliance, keyboard navigation | ✅ Active |
| **Visual Regression** | Screenshot comparison, layout stability | ✅ Active |
| **Smart Test Selection** | Run only relevant tests per changes | ✅ Active |

---

## Advanced Workflows

### 1. Cross-Browser E2E Testing

**Workflow:** `.github/workflows/cross-browser-e2e.yml`

Automatically tests critical user journeys across:
- **Browsers:** Chromium, Firefox, WebKit
- **Devices:** Desktop, Mobile (iPhone 12, Pixel 5), Tablet (iPad Pro)
- **Tests:** Homepage, catalog, checkout, error recovery, accessibility

**Trigger:** Every push & nightly at 2 AM

**Output:**
```
✅ All critical journeys tested
├── Browse & purchase flow
├── Error handling & recovery
├── Accessibility & keyboard nav
├── Performance checks
└── Mobile responsiveness
```

**View Results:**
```bash
# GitHub Actions
https://github.com/wizelements/Gratog/actions?query=workflow:Cross-Browser

# Test artifacts
playwright-report-{browser}-{device}.zip
```

---

### 2. Performance Monitoring

**Workflow:** `.github/workflows/performance-monitoring.yml`

**Lighthouse Audits:**
- Performance score (target: 85+)
- Accessibility score (target: 95+)
- Best practices (target: 90+)
- SEO score (target: 95+)

**Core Web Vitals:**
- FCP (First Contentful Paint): < 1.8s
- LCP (Largest Contentful Paint): < 2.5s
- CLS (Cumulative Layout Shift): < 0.1
- FID (First Input Delay): < 100ms

**Bundle Analysis:**
- Total size monitoring
- Per-file size tracking
- Dependency bloat detection

**Trigger:** Every push & every 6 hours

**Response on Regression:**
1. Issue created with label `performance`
2. Slack alert sent
3. Detailed report with metrics
4. Recommendations for fixes

---

### 3. Error Analytics & Pattern Detection

**Workflow:** `.github/workflows/error-analytics.yml`

### Error Pattern Recognition

Automatically clusters and categorizes errors:

**Categories:**
- Hydration mismatches (SSR/Client)
- Component rendering failures
- Network/API failures
- Form validation errors
- Payment processing errors

**ML-Style Analysis:**
- Frequency tracking
- Time-series trends
- Recurring pattern detection
- Predictive alerts

**Trigger:** Daily at 1 AM (automated)

**Report Contents:**
```markdown
# 📊 Error Analytics Report

## Top Errors (Last 7 Days)
1. Hydration error in Header - 12 occurrences
2. Network timeout on checkout - 8 occurrences
3. Component render failure - 5 occurrences

## Root Cause Analysis
- Hydration: window access during SSR
- Network: Slow API, missing retry logic
- Component: Uncaught error in render

## Predictive Alerts
Would trigger if:
- Error rate > 5%
- Error count > 50 in 5 min
- Payment failures > 2%
```

---

### 4. Accessibility & WCAG Compliance

**Workflow:** `.github/workflows/accessibility-audit.yml`

**Testing Framework:** axe-core + manual testing

**Coverage:**
- ♿ Keyboard navigation (Tab, Enter, Arrow keys)
- 🎯 Focus indicators
- 🎨 Color contrast (4.5:1 WCAG AA)
- 📝 Form labels & ARIA
- 🖼️ Image alt text
- 🔤 Heading hierarchy
- ⌨️ Skip to main content

**Compliance Levels:**
- WCAG 2.1 Level A
- WCAG 2.1 Level AA (target)
- Section 508

**Trigger:** Every push & daily at 3 AM

**Failure Handling:**
- Issues critical/serious violations auto-create issue
- PR comments with violation count
- Suggestions for fixes

---

### 5. Visual Regression Testing

**Workflow:** `.github/workflows/visual-regression.yml`

**Mechanism:**
1. Takes screenshots of every page
2. Compares against baseline (main branch)
3. Pixel-level diff detection
4. Flags layout shifts, CSS changes

**Pages Tested:**
- Homepage
- Catalog
- Checkout (3-step flow)
- About
- Contact

**Devices:**
- Desktop (1920x1080)
- Mobile (390x844)
- Tablet (1024x1366)

**Output:**
```
Desktop-homepage-full.png (screenshot)
Desktop-homepage-fold.png (above-fold)
[Comparison diff image]
```

**Workflow:**
1. Screenshot taken on PR
2. Compared to baseline
3. Pixel differences highlighted
4. PR comment with summary
5. Baseline updated on main

---

## Smart Alerting System

**File:** `lib/smart-alerting.ts`

### Alert Rules

Default rules with severity levels and cooldowns:

| Rule | Condition | Severity | Channels |
|------|-----------|----------|----------|
| High error rate | > 5% | Critical | Slack, PagerDuty, GitHub |
| Critical spike | > 50 errors/5min | Critical | Slack, PagerDuty, SMS |
| Payment failures | > 2% | Critical | Slack, PagerDuty, Email |
| API degradation | Latency > 5s | High | Slack, PagerDuty |
| Availability drop | < 99% | High | Slack, PagerDuty, GitHub |
| Memory pressure | > 85% | High | Slack, PagerDuty |
| CPU spike | > 80% | High | Slack |
| Page slowness | > 5s load | Medium | Slack |

### Channels

```typescript
type AlertChannel = 'slack' | 'email' | 'sms' | 'pagerduty' | 'github';
```

**Slack:** Message in #deployments channel  
**Email:** Automated email to ops team  
**SMS:** Only for critical (payment failures)  
**PagerDuty:** Creates incident  
**GitHub:** Issue with label `alert-critical`

### Cooldown Strategy

Prevents alert fatigue:
```
5 min cooldown for critical alerts
10 min cooldown for high alerts
No SMS for same alert within 30 min
```

### Usage

```typescript
import { alerter } from '@/lib/smart-alerting';

// Evaluate metrics and dispatch alerts
const alerts = await alerter.evaluateAndAlert({
  errorRate: 2.5,
  errorCount: 28,
  networkLatency: 350,
  apiAvailability: 99.2,
  pageLoadTime: 2100,
  paymentFailureRate: 0.8,
  cpuUsage: 45,
  memoryUsage: 62
});

// Get history
const history = alerter.getHistory(100);

// Get statistics
const stats = alerter.getStats();
```

---

## Canary Deployments

**Workflow:** `.github/workflows/canary-deployment.yml`

### Phase-Based Rollout

```
Phase 1: Canary (10% traffic)
  ├─ 5 min: Health checks
  ├─ 1 min: Load testing (50 concurrent users)
  ├─ 1 hour: Monitoring
  └─ Decision: Proceed or rollback
       │
       └─→ Phase 2: Gradual (25% → 50% → 75%)
            └─→ Phase 3: Production (100%)
```

### Health Checks

**Endpoints Monitored:**
- `GET /` (homepage)
- `GET /api/health`
- `GET /api/products?limit=5`
- `GET /api/checkout/validate`

**Success Criteria:**
- 4/4 endpoints respond with 200
- Response time < 5s
- Error rate < 1%

### Load Testing

```
50 concurrent users
1 minute duration
Success rate: > 99.5%
Response time: < 300ms
```

### Auto-Rollback Triggers

1. **Health check fails:** 3+ consecutive failures
2. **Error spike:** Error rate > 5%
3. **Payment failures:** > 1 payment failure per minute
4. **Performance degradation:** Page load > 5s
5. **Database connection pool exhausted**

### Monitoring Duration

```
5 minutes @ 10% traffic
+ 1 hour @ full traffic
= 1 hour 5 minutes total monitoring
```

### Rollback Process

```
1. Traffic immediately reverted to stable version
2. Sentry error tracking reviewed
3. GitHub issue created: "Canary Rollback - [reason]"
4. Slack notification sent
5. Automatic post-mortem scheduled
```

---

## Operational Dashboards

**File:** `lib/monitoring-dashboard.ts`

### Dashboard Sections

#### 1. System Health
- API Availability (target: 99.95%)
- Database Latency (target: < 200ms)
- Cache Hit Rate (target: > 80%)
- Error Rate (target: < 1%)

#### 2. Performance
- Lighthouse Score (target: > 85)
- Page Load Time P75 (target: < 3s)
- FCP, LCP, CLS metrics
- Real User Monitoring

#### 3. Business Metrics
- Conversion Rate (target: > 3%)
- Cart Abandonment (target: < 75%)
- Average Order Value ($)
- Daily Active Users
- Payment Success Rate (target: > 99%)

#### 4. Error Tracking
- JS Errors (24h trend)
- Network Errors
- Checkout Errors
- Critical Issues (7d)
- Error Resolution Time

#### 5. Security
- Vulnerabilities (high/critical)
- SSL/TLS Status
- CSP Violations
- Failed Auth Attempts
- OWASP Compliance Score

#### 6. Infrastructure
- Deployments (7d)
- Build Success Rate (target: 100%)
- Deployment Success Rate (target: 100%)
- Rollback Count
- Build Duration (avg)

### Real-Time Updates

- System Health: Every 1 minute
- Performance: Every 2 minutes
- Business: Every 5 minutes
- Errors: Every 3 minutes
- Security: Every 5 minutes
- Infrastructure: Every 10 minutes

---

## Incident Response

### Escalation Path

```
Level 1 (Minutes): Automated response
├─ Alert triggered
├─ Issue auto-created
├─ Slack notification
└─ Sentry session replay recorded

Level 2 (5 min): Team notification
├─ PagerDuty incident
├─ SMS to on-call engineer
├─ Slack #incidents channel
└─ Automated diagnostics run

Level 3 (15 min): Escalation
├─ Conference call
├─ All hands if critical
├─ Executive notification
└─ Customer communication

Level 4 (1 hour): Post-incident
├─ Root cause analysis
├─ Timeline documented
├─ Action items assigned
└─ Prevention measures planned
```

### Common Incident Responses

#### Payment Processing Down

```
1. Auto-alert triggered (payment failure > 1/min)
2. Checkout error boundary shows fallback UI
3. Issue created with label `critical-payment`
4. PagerDuty incident created
5. Check:
   - Square API status
   - Network connectivity
   - SSL certificate validity
   - Database connection pool
6. If unfixable: Rollback to previous version
7. Notify customer support
8. Display banner: "Checkout temporarily unavailable"
```

#### High Error Rate Spike

```
1. Alert: Error rate > 5%
2. GitHub issue created
3. Error analytics queried
4. Top 5 errors identified
5. If pattern detected:
   - Likely root cause suggested
   - Affected files listed
   - Fix PR recommended
6. If no pattern:
   - Manual investigation
   - Sentry session replay reviewed
   - Affected users identified
```

#### Database Connection Failure

```
1. API availability drop detected
2. Health check fails
3. Canary auto-rollback triggered
4. Slack alert with severity
5. PagerDuty incident created
6. Check:
   - DB connection pool
   - Network to database
   - Database logs
   - Query performance
7. Scale up connections or optimize queries
8. Verify stability before returning to canary
```

---

## Metrics & KPIs

### Technical Metrics

**System Health:**
- API Availability: 99.95%+
- Error Rate: < 1%
- Database Latency: < 200ms
- Cache Hit Rate: > 85%

**Performance:**
- Lighthouse: > 85
- FCP: < 1.8s
- LCP: < 2.5s
- CLS: < 0.1

**Quality:**
- Test Coverage: > 80%
- Build Success: > 99%
- Deploy Success: > 99.5%
- Code Quality: A+ grade

### Business Metrics

**Conversion:**
- Checkout Completion: > 85%
- Cart Abandonment: < 75%
- Conversion Rate: > 3%
- AOV: $120+

**Engagement:**
- DAU: Growing
- Session Duration: > 3 min
- Page Views: Trending up
- Return Rate: > 40%

**Operations:**
- Mean Time To Detect (MTTD): < 1 min
- Mean Time To Recovery (MTTR): < 5 min
- Change Failure Rate: < 2%
- Deployment Frequency: Daily

---

## Configuration

### Environment Variables

```bash
# Alerting
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
SLACK_CHANNEL=#deployments
SLACK_MENTIONS=@ops-team

# Incident Management
PAGERDUTY_TOKEN=...
PAGERDUTY_ROUTING_KEY=...

# Monitoring
SENTRY_AUTH_TOKEN=...
SENTRY_DSN=...

# Deployment
VERCEL_TOKEN=...
VERCEL_ORG_ID=...
VERCEL_PROJECT_ID=...

# Email
ALERT_EMAIL=ops@example.com
ALERT_PHONE=+1-555-0123
```

### Customizing Alert Rules

```typescript
import { alerter, AlertRule } from '@/lib/smart-alerting';

// Add custom rule
const customRule: AlertRule = {
  id: 'custom-checkout-error',
  name: 'Checkout Specific Errors',
  condition: (m) => m.errorRate > 0.5 && m.errorMessage?.includes('checkout'),
  severity: 'critical',
  channels: ['slack', 'pagerduty'],
  cooldown: 600000 // 10 min
};

alerter.addRule(customRule);
```

---

## Troubleshooting

### E2E Tests Timeout

```bash
# Increase timeout in playwright.full.config.ts
timeout: 60000 // ms

# Run with verbose logging
PWDEBUG=1 yarn test:e2e
```

### Performance Tests Failing

```bash
# Rebuild optimized bundle
yarn build --experimental-optimizePackageImports

# Clear Lighthouse cache
rm -rf .lighthouseci
yarn test:lighthouse
```

### Alert Fatigue

```typescript
// Increase cooldown durations
const rule = {
  cooldown: 1800000 // 30 min instead of 5 min
};

// Or adjust thresholds
condition: (m) => m.errorRate > 10 // was > 5
```

### Canary Rollback

```bash
# Manual rollback if needed
vercel rollback --prod

# Check deployment history
vercel list deployments --limit=20
```

---

## Best Practices

✅ **DO:**
- Monitor metrics continuously
- Set aggressive alerting thresholds
- Test alerts weekly
- Document all incidents
- Review error patterns daily
- Schedule deployment windows
- Use canary for all deploys
- Keep runbooks updated
- Practice incident response
- Monitor competitor performance

❌ **DON'T:**
- Ignore alerts
- Skip canary for "small" changes
- Leave errors in production
- Deploy without testing
- Use hardcoded credentials
- Skip performance budgets
- Forget security audits
- Deploy during peak hours
- Ignore post-mortems
- Accumulate technical debt

---

## Next Steps

1. **This Week:** Review all dashboards, test alert system
2. **Next Week:** Run incident response drills
3. **Monthly:** Performance audit & trend analysis
4. **Quarterly:** Security assessment & dependency updates

---

## Support & Resources

- **Sentry:** https://sentry.io/organizations/taste-of-gratitude/
- **GitHub Actions:** https://github.com/wizelements/Gratog/actions
- **GitHub Issues:** https://github.com/wizelements/Gratog/issues
- **Vercel Dashboard:** https://vercel.com/dashboard
- **Lighthouse Reports:** [In workflow artifacts]
- **Canary Logs:** [In deployment reports]

---

**Your advanced operations system is now live and ready for production scale.**
