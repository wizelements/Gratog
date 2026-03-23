# Deployment Monitoring Guide

## Current Status

Latest push committed and waiting for GitHub Actions to execute.

**Commit:** a2d94ff (add: CI monitor that waits for GitHub Actions and captures failures)  
**Branch:** main  
**Repository:** wizelements/Gratog

## What's Happening Now

1. ✅ Code pushed to GitHub
2. ⏳ GitHub Actions CI workflow triggered automatically
3. 🔍 Workflows running:
   - `CI` - Build and lint checks
   - `Integration Tests` - Database and API tests (if enabled)
   - `Test & Report` - Additional test suites

## Monitor for Failures

### Option 1: Watch GitHub Actions UI (Easiest)
```
https://github.com/wizelements/Gratog/actions
```
- Click on latest workflow run
- Watch jobs execute in real-time
- Note any failures

### Option 2: Use CI Monitor Script
```bash
npm run ci:monitor
```
This waits for workflow completion and captures:
- Failed job names
- Step-by-step logs
- Failure context markdown

## When Failures Occur

If tests fail, the CI monitor will:

1. **Detect Failure** - Catches when workflow status = "completed" with conclusion = "failure"
2. **Fetch Details** - Gets all job info, step names, timestamps
3. **Create Context** - Generates `CI_FAILURE_*.md` file with:
   - Full job details
   - Failed steps
   - Log URLs
   - Commit info
   - Summary & next steps

4. **Display Report** - Shows you the failure analysis in terminal

## Example Failure Report

```markdown
# CI Failure Context Report

**Generated:** 2025-12-22T00:15:30.000Z
**Workflow:** Integration Tests
**Branch:** main
**Commit:** a2d94ff
**Status:** completed / failure

## Failed Jobs (2)

### Database Integration Tests
- **Status:** completed / failure
- **Logs:** https://api.github.com/repos/wizelements/Gratog/actions/jobs/xxx/logs

**Failed Steps:**
- Step 15: Wait for MongoDB (failure)
- Step 20: Run database integration tests (failure)

### API Integration Tests
- **Status:** completed / failure
- **Logs:** https://api.github.com/repos/wizelements/Gratog/actions/jobs/yyy/logs

**Failed Steps:**
- Step 10: Start server in background (failure)
- Step 15: Wait for server to be ready (failure)

## Workflow Summary

- **Total Jobs:** 3
- **Failed Jobs:** 2
- **Passed Jobs:** 1
- **Duration:** 450s

## Next Steps

1. **Review Failures:** Check logs above
2. **Identify Root Cause:** Look at step outputs
3. **Analyze Patterns:** Multiple failures? Same root cause?
4. **Create Fix:** Based on failure analysis
5. **Push Changes:** To trigger new CI run
6. **Monitor:** Use `npm run ci:monitor` again
```

## Workflow Configuration

### CI.yml (Main Build & Lint)
- **Trigger:** Every push to main/develop
- **Jobs:** TypeScript check, ESLint, Build
- **Time:** ~2-3 minutes

### Integration-Tests.yml (Tests)
- **Trigger:** Every push to main/develop (if configured)
- **Jobs:** 
  - Database tests (with MongoDB service)
  - API integration tests (with server startup)
  - Test summary
- **Time:** ~5-10 minutes
- **Requirements:**
  - MongoDB service must start
  - Server must build and start
  - Health check endpoint must respond

### Failure-Capture.yml (Auto Context)
- **Trigger:** On any workflow failure
- **Action:** Automatically creates GitHub issue with context
- **Status:** Installed and ready

## Current Test Fixes Deployed

The following critical fixes were already applied to address known issues:

1. **Database Setup** - Explicit test_db name + connection verify
2. **Test Cleanup** - Only clean test_* collections
3. **Server Startup** - Exponential backoff retry (1-5s intervals)
4. **MongoDB Detection** - Exponential backoff with 60 attempts
5. **Test Timeouts** - Increased from 30s to 60s

## If You See "No workflow found"

This means:
1. GitHub Actions hasn't executed yet (wait 30-60 seconds)
2. OR workflow runs list is empty (first time on branch)
3. OR API call isn't working

**Solution:**
```bash
# Check manually at GitHub
open https://github.com/wizelements/Gratog/actions

# Or wait and retry
sleep 60 && npm run ci:monitor
```

## Commands Reference

| Command | Purpose |
|---------|---------|
| `npm run ci:monitor` | Wait for GitHub Actions & capture failures |
| `npm run standby` | Check for recent failures locally |
| `npm run diagnose` | Validate local infrastructure |
| `npm run build` | Build locally |
| `npm run test:api` | Run API tests locally (requires MongoDB) |

## Real-Time Monitoring

To stay updated as workflows execute:

```bash
# Terminal 1: Monitor CI
npm run ci:monitor

# Terminal 2: Watch logs locally
tail -f CI_FAILURE_*.md

# Terminal 3: Check git status
git status && git log --oneline -5
```

## Success Criteria

✅ Tests pass when:
- All unit tests pass
- All smoke tests pass
- All integration tests pass (requires MongoDB + server)
- No build errors

## Deployment Flow

```
git push main
        ↓
GitHub Actions triggers
        ↓
CI workflow runs (2-3 min)
        ↓
├─ SUCCESS? → Ready to deploy
└─ FAILURE? → npm run ci:monitor captures details
                ↓
              Fix issues
                ↓
              git push
                ↓
              Monitor again
```

---

**Last Updated:** 2025-12-22  
**Monitor Script:** scripts/ci-monitor.js  
**Status:** Ready to monitor
