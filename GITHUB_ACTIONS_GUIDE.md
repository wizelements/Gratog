# GitHub Actions Automated Testing & Reporting

**Status:** ✅ Set up and ready to use

---

## What Gets Automated

### 1️⃣ **On Every Push** - `test-and-report.yml`

When you push code to `main` or `develop`, GitHub automatically:

```
Push → GitHub Actions Runs Tests → Generates Report → Creates Issue if Failed
```

**Tests Run:**
- ✅ Unit tests (yarn test)
- ✅ Smoke tests (yarn test:smoke)
- ✅ Build check (yarn build)
- ✅ TypeScript check (yarn tsc)

**Reports Generated:**
- 📄 `test-report.md` - Summary of all tests
- 💾 Artifact logs saved for debugging
- 📌 Comment added to PRs with results
- 🔴 Issue created if tests fail

### 2️⃣ **After Deployment** - `post-deploy-test.yml`

When Vercel deploys successfully, GitHub automatically:

```
Vercel Deploy → GitHub Detects → Runs Production Tests → Reports Results
```

**Tests Run:**
- ✅ Health check API
- ✅ Products API
- ✅ Performance metrics
- ✅ Endpoint availability

**Reports Generated:**
- 📄 `deployment-report.md` - Deployment test results
- 🚨 Critical issue if site is down
- 📱 Slack notification if enabled

### 3️⃣ **On Test Failure** - `generate-failure-report.yml`

If any test fails, GitHub automatically:

```
Test Fails → Analyzes Failure → Generates Detailed Report → Creates Issue
```

**Reports Generated:**
- 📄 `FAILURE_REPORT.md` - Detailed failure analysis
- 🔍 Root cause analysis suggestions
- 📋 Debug commands to fix locally
- 📌 Next steps for investigation

---

## What You Get

### ✅ Automatic Test Reports

Every push generates a markdown report showing:

```markdown
# 🧪 Test Report

| Test | Status | Details |
|------|--------|---------|
| Unit Tests | ✅ PASSED | All 184 tests pass |
| Smoke Tests | ✅ PASSED | 36 tests pass |
| Build | ✅ PASSED | Build succeeded |
| TypeScript | ✅ PASSED | No type errors |

✅ OVERALL: PASSED - All tests passed
```

### ✅ Automatic Failure Reports

When tests fail, you get:

```markdown
# ❌ Test Failure Report

**Generated:** 2025-12-21 21:00:00 UTC

## Failure Details

### Unit Test Failures
```
✗ components/Header should render without errors
Error: Cannot read property 'title' of undefined
```

### Root Cause Analysis

- **Hydration Mismatch** - Server/Client rendering differences
- **Fix:** Check for window guards, useEffect hooks

## Next Steps

1. Review logs above
2. Run locally: `yarn test`
3. Apply fix
4. Push and verify
```

### ✅ Automatic GitHub Issues

On failure, an issue is automatically created:

**Title:** `❌ Tests Failed on 2025-12-21`  
**Labels:** test-failure, needs-fix  
**Body:** Full test report + logs  

You can:
- ✅ Assign to developer
- ✅ Add comments
- ✅ Link to PR
- ✅ Track progress

### ✅ Automatic Deployment Monitoring

After Vercel deploys:

```markdown
# 🚀 Post-Deployment Test Report

| Test | Status | Details |
|------|--------|---------|
| Health Check (API) | ✅ PASSED | HTTP 200 |
| Products API | ✅ PASSED | 29 products loaded |
| Homepage Load Time | ✅ FAST | 234ms |

✅ DEPLOYMENT SUCCESSFUL - All critical endpoints responding
```

---

## How to Use

### View Test Results

**Option 1: GitHub UI**
1. Go to https://github.com/wizelements/Gratog
2. Click "Actions" tab
3. Click on the workflow run
4. Scroll down to see results
5. Download artifacts for full logs

**Option 2: Generated Files**
1. After push, files are auto-generated:
   - `test-report.md` (in repo root, temporary)
   - `FAILURE_REPORT.md` (saved if failure)
   - Artifact logs (downloadable)

**Option 3: GitHub Issues**
1. Go to Issues tab
2. Filter by "test-failure" label
3. Click issue to see full report

### When Tests Fail

1. **GitHub creates an issue** with failure details
2. **You get full error logs** to debug locally
3. **You see root cause analysis** suggestions
4. **You get debug commands** to reproduce locally
5. **You have a step-by-step guide** to fix

**Example failure report includes:**

```markdown
## Debug Commands

Run these locally to debug:

```bash
yarn test -- --reporter=verbose
yarn test:smoke
yarn build
yarn tsc --noEmit --skipLibCheck
```
```

---

## Setting Up (Already Done)

The following files are already created:

```
.github/workflows/
├── test-and-report.yml          ✅ Runs on every push
├── post-deploy-test.yml         ✅ Runs after Vercel deploy
└── generate-failure-report.yml  ✅ Generates detailed failure reports
```

### Manual Setup (if needed)

1. **Copy workflow files to `.github/workflows/`** (already done)
2. **Commit and push**
   ```bash
   git add .github/workflows/
   git commit -m "setup: add github actions workflows"
   git push origin main
   ```
3. **Verify in GitHub**
   - Go to https://github.com/wizelements/Gratog/actions
   - Workflows should appear

### Optional: Set Up Slack Notifications

1. Get Slack webhook:
   - Go to https://api.slack.com/apps
   - Create new app
   - Enable Incoming Webhooks
   - Create webhook for #deployments channel
   - Copy webhook URL

2. Add to GitHub Secrets:
   - Go to Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `SLACK_WEBHOOK`
   - Value: [paste webhook URL]
   - Click Add secret

3. Uncomment Slack step in workflows (already added, just needs secret)

---

## Workflow Details

### Test Workflow Triggers

**Runs on:**
- Every push to `main` or `develop`
- Every PR to `main` or `develop`

**Outputs:**
- 📊 Test summary comment on PR
- 📄 Test report artifact
- 🔴 Issue if tests fail

### Deploy Workflow Triggers

**Runs on:**
- Vercel deployment completion (success or failure)
- Only if deployment was successful

**Outputs:**
- 📄 Deployment report
- 🚨 Issue if site down
- 🔔 Slack notification if enabled

### Failure Workflow Triggers

**Runs on:**
- When test-and-report workflow fails

**Outputs:**
- 📄 Detailed failure analysis
- 🔍 Root cause suggestions
- 🛠️ Debug commands
- 📌 Investigation issue

---

## What to Do Next

### Week 1: Monitor Tests

1. Make a push and watch GitHub Actions run
2. Go to https://github.com/wizelements/Gratog/actions
3. Click on the workflow run
4. Review test results
5. Download artifacts to see full logs

### Week 2: Trigger Failure (Optional Test)

1. Create a test branch
2. Intentionally break something (e.g., add syntax error)
3. Push and watch workflow catch it
4. See failure report generated automatically
5. Fix and verify recovery

### Week 3: Production Monitoring

1. Deploy to production (via Vercel)
2. Watch post-deploy tests run automatically
3. See deployment report generated
4. Monitor for any issues

---

## Common Workflows

### Scenario 1: Local Development

```
1. Edit code locally
2. Run: yarn test
3. Pass locally? ✓
4. git push
5. GitHub Actions runs tests
6. Tests pass? ✓ → Ready to deploy
7. Tests fail? ✗ → Issue created with details
```

### Scenario 2: Pull Request Review

```
1. Create PR
2. GitHub Actions runs tests automatically
3. Tests pass? ✓ → "All checks passed" ✓
4. Tests fail? ✗ → Report comments on PR
5. Reviewer checks report
6. Developer fixes issue
7. Push fix → Tests re-run
8. Tests pass → Ready to merge
```

### Scenario 3: Production Deployment

```
1. Merge to main
2. Vercel auto-deploys
3. Deployment completes
4. GitHub Actions post-deploy tests run
5. Tests pass? ✓ → Site is healthy
6. Tests fail? ✗ → Critical issue created
7. Slack notification sent (if enabled)
```

---

## Dashboard Overview

### GitHub Actions Runs

**View all runs:** https://github.com/wizelements/Gratog/actions

Shows:
- ✅ Passed workflows (green)
- ❌ Failed workflows (red)
- ⏳ Running workflows (yellow)
- 📊 Execution time
- 🔍 Logs

### Issues Created

**View all issues:** https://github.com/wizelements/Gratog/issues?q=label%3Atest-failure

Shows:
- 🔴 Test failures
- 🚨 Deployment failures
- 📋 Full error details
- 🔗 Links to workflows
- 👤 Assignee

### Artifacts

**View test logs:** In workflow run → Artifacts section

Download:
- `test-logs.zip` - Complete test output
- `test-report.md` - Summary report
- `build-output.txt` - Build logs
- `ts-output.txt` - TypeScript errors

---

## Customization

### Change Test Triggers

Edit `.github/workflows/test-and-report.yml`:

```yaml
on:
  push:
    branches: [main, develop]  # Add more branches
  pull_request:
    branches: [main, develop]
  # Add: run on schedule
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
```

### Add More Tests

Edit `.github/workflows/test-and-report.yml`, add steps:

```yaml
- name: Run integration tests
  run: yarn test:integration

- name: Run e2e tests
  run: yarn test:e2e

- name: Run accessibility tests
  run: yarn test:a11y
```

### Change Failure Response

Edit `.github/workflows/generate-failure-report.yml`:

```yaml
- name: Create investigation issue
  # Change issue labels, assignee, etc.
  labels: ['bug', 'needs-fix']
  assignees: ['@developer-username']
```

---

## Troubleshooting

### "Workflow didn't run"

- Check branch name (must be `main` or `develop`)
- Check file location: `.github/workflows/*.yml`
- Check YAML syntax (use online YAML validator)

### "Tests passed locally but failed in CI"

- CI environment might be different
- Check Node version: `node -v`
- Check dependencies: `yarn list`
- Run `yarn install` before tests

### "Artifacts not saving"

- Check workflow permissions (might need update)
- Use full path: `path: test-report.md`
- Check file exists: `ls -la test-report.md`

### "Issue not being created"

- Check GitHub token has permissions
- Verify issue creation step in workflow
- Check if issues are enabled in repo settings

---

## Next Steps

1. **Today:** Review the workflow files in `.github/workflows/`
2. **Make a push:** Trigger a workflow run
3. **Watch it run:** Go to Actions tab
4. **Review results:** Download test logs
5. **On next failure:** See automatic issue creation
6. **Iterate:** Use reports to fix issues faster

---

## Resources

- 📖 [GitHub Actions Docs](https://docs.github.com/en/actions)
- 📖 [Workflow Syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
- 📖 [Available Actions](https://github.com/actions)

---

**Your testing pipeline is now automated. Every push = automatic tests + reports!**
