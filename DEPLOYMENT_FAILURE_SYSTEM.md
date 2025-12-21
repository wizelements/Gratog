# Deployment Failure Capture & Standby System

## Overview

This system automatically captures deployment failures from GitHub Actions, provides detailed context, and keeps Amp in standby mode ready to assist with fixes.

**Status:** ✅ Installed and active

## Components

### 1. Failure Capture Workflow (`.github/workflows/failure-capture.yml`)

Automatically triggers when tests fail in GitHub Actions.

**What it does:**
- Captures full workflow context (jobs, steps, logs)
- Extracts failure details and root causes
- Creates structured failure reports
- Generates GitHub issues for investigation
- Commits context to repository for reference

**Triggers on:**
- Integration Tests failures
- API Integration Tests failures
- Database Tests failures
- CI/CD pipeline failures

### 2. Standby Monitor (`scripts/standby-monitor.js`)

Command: `npm run standby`

Checks for recent failures and prepares context for developer action.

**Output:**
- Detects latest failure (if any)
- Analyzes failure type and severity
- Lists failed jobs and components
- Provides fix recommendations
- Shows quick debug commands

### 3. Integration Test Diagnostics (`scripts/diagnose-integration-tests.js`)

Command: `npm run diagnose`

Performs comprehensive health check of test infrastructure.

**Checks:**
- ✅ MongoDB connectivity
- ✅ Environment variables
- ✅ Build health
- ✅ Test configurations
- ✅ Server startup
- ✅ Square SDK configuration
- ✅ Health endpoint

## Workflow: Deployment Failure → Fix

### Step 1: Failure Occurs in GitHub Actions

The `failure-capture.yml` workflow automatically:
1. Extracts workflow details from failed jobs
2. Analyzes which components failed
3. Creates structured failure report
4. Opens GitHub issue with full context
5. Commits context to branch for reference

### Step 2: Amp Enters Standby Mode

When you run `npm run standby`:
1. Checks `.failure-reports/` directory for latest failure
2. Analyzes failure type (database, API, build, etc)
3. Generates standby report with recommendations
4. Shows quick commands for local debugging

### Step 3: Developer Diagnoses

When you run `npm run diagnose`:
1. Checks all integration test prerequisites
2. Tests MongoDB connectivity
3. Verifies environment setup
4. Validates test configurations
5. Shows which systems are ready/failing

### Step 4: Fix is Applied

Developer fixes the issue locally and pushes changes.

### Step 5: Tests Re-Run Automatically

GitHub Actions triggers the full test suite again, and:
1. If tests pass → deployment succeeds
2. If tests fail → failure capture activates again with new context

## Failure Types Handled

### Database Integration Tests Failures

**Common causes:**
- MongoDB not running
- Connection timeout
- Missing environment variables
- Database already in use

**Fix steps:**
```bash
# Start MongoDB
docker run -d --name mongo -p 27017:27017 mongo:6.0

# Set environment
export MONGODB_URI=mongodb://localhost:27017/test_db
export MONGO_URL=mongodb://localhost:27017/test_db

# Run tests
yarn vitest run --config vitest.db.config.ts
```

### API Integration Tests Failures

**Common causes:**
- Server failed to build
- Server won't start on port 3000
- Health check endpoint timeout
- Missing Square credentials

**Fix steps:**
```bash
# Diagnose
npm run diagnose

# Build
yarn build

# Start server
yarn start

# In another terminal, run tests
yarn test:api
```

### Server Startup Failures

**Common causes:**
- Missing environment variables
- Invalid database connection string
- Port 3000 already in use
- Build errors

**Fix steps:**
```bash
# Check environment
npm run diagnose

# Clear build cache
rm -rf .next

# Rebuild
yarn build

# Start with debug output
yarn start --debug
```

## GitHub Actions Integration

### Workflows Enabled

1. **integration-tests.yml** - Runs API & database tests after each push
2. **failure-capture.yml** - Captures failure context automatically
3. **generate-failure-report.yml** - Creates investigation issues

### How Failures Trigger

```
Push to main/develop
         ↓
GitHub Actions runs tests
         ↓
Test fails
         ↓
failure-capture.yml triggers
         ↓
Creates issue with context
         ↓
Amp monitors for failures
```

## Manual Testing Workflow

### Quick Check
```bash
npm run standby          # Check for recent failures
npm run diagnose        # Diagnose test infrastructure
```

### Full Local Test
```bash
# Terminal 1: Start MongoDB
docker run -d --name mongo -p 27017:27017 mongo:6.0

# Terminal 2: Build & start server
yarn build
yarn start

# Terminal 3: Run API integration tests
yarn test:api
```

### Database Tests Only
```bash
docker run -d --name mongo -p 27017:27017 mongo:6.0
yarn vitest run --config vitest.db.config.ts
```

## Failure Report Structure

When failures occur, the system creates:

```
.failure-reports/
├── failure-{WORKFLOW_ID}-{TIMESTAMP}.md    # Detailed report
├── context-{WORKFLOW_ID}.json               # Structured context
└── ...
```

Plus:
- `FAILURE_CONTEXT.md` - In repository root
- GitHub issue - In repository issues

## Standby Mode Commands

```bash
# Check for failures
npm run standby

# Diagnose test infrastructure
npm run diagnose

# Run specific test suites
yarn test:unit              # Unit tests
yarn test:smoke             # Smoke tests
yarn test:api               # API integration tests
yarn vitest run --config vitest.db.config.ts  # Database tests

# Debug locally
yarn dev                    # Start dev server
yarn build                  # Build for production
```

## Integration Test Configuration

### API Integration Tests (`vitest.integration.config.ts`)

- **Tests:** `/tests/api/**/*.spec.ts`
- **Service:** Next.js server (localhost:3000)
- **Prerequisites:** Built app, running server
- **Timeout:** 30 seconds per test
- **Retry:** 1 failure automatically retried

### Database Integration Tests (`vitest.db.config.ts`)

- **Tests:** `/tests/db/**/*.spec.ts`
- **Service:** MongoDB (localhost:27017)
- **Prerequisites:** MongoDB running
- **Timeout:** 30 seconds per test

## Environment Variables Required

For integration tests to work:

```bash
# Server & Database
MONGODB_URI=mongodb://localhost:27017/test_db
MONGO_URL=mongodb://localhost:27017/test_db
JWT_SECRET=test-jwt-secret
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Payment (optional, for full testing)
SQUARE_ACCESS_TOKEN=<your-test-token>
SQUARE_ENVIRONMENT=sandbox
```

## Standby System Status

✅ **Active** - Monitoring deployment for failures
✅ **Automatic** - Captures context on any failure
✅ **Ready** - Amp prepared for next fix iteration

## How Amp Stays in Standby

1. Failure capture workflow runs automatically
2. Failure context stored in `.failure-reports/`
3. GitHub issue created with full details
4. `npm run standby` shows current failure status
5. Amp reviews context and assists with fixes

## Quick Reference

| Task | Command |
|------|---------|
| Check for failures | `npm run standby` |
| Diagnose infrastructure | `npm run diagnose` |
| Run API tests locally | `npm run test:api` |
| Run DB tests locally | `yarn vitest run --config vitest.db.config.ts` |
| Start MongoDB | `docker run -d --name mongo -p 27017:27017 mongo:6.0` |
| View failure reports | `ls -la .failure-reports/` |
| View latest context | `cat FAILURE_CONTEXT.md` |

## Support

When failures occur:

1. Run `npm run standby` to see current status
2. Run `npm run diagnose` to identify issues
3. Fix the problems locally
4. Push to trigger automatic tests
5. If new failures appear, system captures context automatically

Amp monitors failures and is ready to assist with each iteration.
