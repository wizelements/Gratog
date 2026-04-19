# GitHub Actions & Scripts Audit Report
## Gratog Project - April 18, 2026

---

## 📊 CURRENT STATE

### GitHub Actions Workflows: 28 files
### Scripts: 48 files

**Total CI/CD Automation:** 76 files
**Estimated Maintenance Burden:** HIGH
**Actual Usage:** UNKNOWN (likely over-engineered)

---

## 🎯 ANALYSIS FRAMEWORK

### KEEP Criteria:
- ✅ Essential for deployment
- ✅ Required for security
- ✅ Proven to catch real issues
- ✅ Low maintenance, high value

### DELETE Criteria:
- ❌ Overlapping functionality
- ❌ Never/rarely runs
- ❌ High false-positive rate
- ❌ Maintenance burden > value
- ❌ Replaced by Vercel-native features

---

## 🔴 WORKFLOWS TO DELETE (13 files)

| File | Reason | Action |
|------|--------|--------|
| `canary-deployment.yml` | Over-engineered for solo dev | DELETE |
| `failure-capture.yml` | Never used | DELETE |
| `generate-failure-report.yml` | Depends on failure-capture | DELETE |
| `error-analytics.yml` | Sentry handles this | DELETE |
| `smart-notifications.yml` | Over-engineered | DELETE |
| `smart-test-selection.yml` | Too complex | DELETE |
| `automated-insights.yml` | Vanity metrics | DELETE |
| `test-and-report.yml` | Duplicates ci.yml | DELETE |
| `test-coverage.yml` | Not actionable | DELETE |
| `performance-audit.yml` | Duplicates performance-monitoring | DELETE |
| `vorax-ci.yml` | Experimental | DELETE |
| `vorax-integration.yml` | Experimental | DELETE |
| `quality-gate.yml` | Duplicates ci.yml | DELETE |

---

## 🟡 WORKFLOWS TO CONSOLIDATE (7 files → 3 files)

### BEFORE (7 files):
- `ci.yml`
- `quality-gate.yml`
- `test-and-report.yml`
- `test-coverage.yml`
- `test.yml`
- `integration-tests.yml`
- `smoke-tests.yml`

### AFTER (3 files):
1. **ci.yml** - Build + Lint + TypeScript
2. **test.yml** - Unit tests (PR only)
3. **e2e-on-preview.yml** - E2E tests on Vercel preview

---

## 🟢 WORKFLOWS TO KEEP (8 files)

| File | Reason | Priority |
|------|--------|----------|
| `ci.yml` | Core build verification | ESSENTIAL |
| `e2e-on-preview.yml` | Post-deploy smoke tests | HIGH |
| `accessibility-audit.yml` | WCAG compliance (weekly) | MEDIUM |
| `cross-browser-e2e.yml` | Browser compatibility (daily) | MEDIUM |
| `security-scanning.yml` | Dependency vulnerabilities (daily) | HIGH |
| `post-deploy-test.yml` | Production health check | HIGH |
| `health-monitor.yml` | Uptime monitoring (15min) | MEDIUM |
| `performance-monitoring.yml` | Lighthouse scores (6hr) | MEDIUM |

---

## 🔴 SCRIPTS TO DELETE (22 files)

| Script | Reason | Action |
|--------|--------|--------|
| `ci-monitor.js` | Unused | DELETE |
| `ci-report-email.js` | CI sends own emails | DELETE |
| `deploy-monitor.js` | Vercel handles this | DELETE |
| `deploy-monitor-simple.js` | Vercel handles this | DELETE |
| `deployment-diagnostics.sh` | Unused | DELETE |
| `fix-deployment-issues.js` | One-time fix script | DELETE |
| `fix-security-updates.ps1` | Windows-specific, unused | DELETE |
| `fix-vorax-console-logs.js` | Vorax deprecated | DELETE |
| `diagnose-integration-tests.js` | Test debugging | DELETE |
| `diagnose-square-production.sh` | Unused | DELETE |
| `standby-monitor.js` | Unused | DELETE |
| `sync-production.mjs` | Manual sync, unused | DELETE |
| `sync-to-unified.js` | Architecture changed | DELETE |
| `test-all-emails.js` | Test script | DELETE |
| `test-all-order-types.js` | Test script | DELETE |
| `test-emails-curl.sh` | Test script | DELETE |
| `test-sandbox-payment.js` | Test script | DELETE |
| `test-square-integration.sh` | Test script | DELETE |
| `validate-deep-fixes.js` | One-time validation | DELETE |
| `validate-deployment.js` | CI handles this | DELETE |
| `validate-music-button.js` | CI handles this | DELETE |
| `validate-payments.js` | CI handles this | DELETE |

---

## 🟢 SCRIPTS TO KEEP (26 files)

| Script | Purpose | Priority |
|--------|---------|----------|
| `catalog-sync-cron.sh` | Daily Square catalog sync | ESSENTIAL |
| `setup-database.js` | Database initialization | ESSENTIAL |
| `create-admin-user.js` | User management | HIGH |
| `create-test-user.js` | Test setup | HIGH |
| `verify-deployment.js` | Quick verify script | HIGH |
| `verify-square-auth.js` | OAuth verification | HIGH |
| `syncCatalog.js` | Catalog synchronization | ESSENTIAL |
| `syncCatalog.ts` | TypeScript version | KEEP |
| `send-review-request-campaign.js` | Marketing automation | MEDIUM |
| `run-review-qa-e2e.js` | Review workflow | MEDIUM |
| `generate-pwa-icons.js` | PWA assets | MEDIUM |
| `check-pwa-readiness.js` | PWA validation | MEDIUM |
| `cleanup-sandbox.mjs` | Sandbox cleanup | MEDIUM |
| `insert-sandbox-products.js` | Test data | LOW |
| `remove-sandbox-products.js` | Test cleanup | LOW |
| `pre-launch-fixes.sh` | Launch checklist | LOW |
| `flatten-app-structure.sh` | Maintenance | LOW |
| `fix-button-types.sh` | Maintenance | LOW |
| `extract-music-snippets.sh` | Content | LOW |
| `initialize-rewards-indexes.js` | DB maintenance | LOW |
| `init-admin-user.js` | User setup | LOW |
| `create-email-indexes.js` | DB maintenance | LOW |
| `create-first-admin.js` | User setup | LOW |
| `vercel-health-monitor.js` | Monitoring | MEDIUM |
| `monitor-and-fix.js` | Health monitoring | MEDIUM |
| `verify-music-integration.sh` | Feature verify | LOW |

---

## 📉 REDUCTION SUMMARY

| Category | Current | Target | Reduction |
|----------|---------|--------|-----------|
| GitHub Workflows | 28 | 11 | -61% |
| Scripts | 48 | 26 | -46% |
| **Total** | **76** | **37** | **-51%** |

---

## 🎉 BENEFITS

1. **Faster CI/CD** - Less time waiting for redundant jobs
2. **Lower Maintenance** - Fewer files to keep updated
3. **Clearer Intent** - Only essential automation runs
4. **Less Confusion** - No overlapping workflows
5. **Vercel-native** - Leverage built-in monitoring

---

## 🚀 RECOMMENDED IMPLEMENTATION

### Phase 1: Immediate (Today)
1. Delete redundant workflow files
2. Delete obsolete script files
3. Update ci.yml to be authoritative

### Phase 2: Consolidation (This Week)
1. Merge overlapping workflows
2. Simplify test structure
3. Document remaining workflows

### Phase 3: Optimization (Ongoing)
1. Monitor CI runtime
2. Adjust trigger frequency
3. Archive unused scripts

---

## ✅ EXECUTION CHECKLIST

### Workflows to Delete:
- [ ] canary-deployment.yml
- [ ] failure-capture.yml
- [ ] generate-failure-report.yml
- [ ] error-analytics.yml
- [ ] smart-notifications.yml
- [ ] smart-test-selection.yml
- [ ] automated-insights.yml
- [ ] test-and-report.yml
- [ ] test-coverage.yml
- [ ] performance-audit.yml
- [ ] vorax-ci.yml
- [ ] vorax-integration.yml
- [ ] quality-gate.yml

### Scripts to Delete:
- [ ] All 22 marked scripts above

### Files to Keep:
- [ ] Document remaining 11 workflows
- [ ] Document remaining 26 scripts
