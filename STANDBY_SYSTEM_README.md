# 🔴 Standby Monitoring System

**Status:** ✅ Active and monitoring for deployment failures

## What This Does

When GitHub Actions tests fail (integration tests, database tests, API tests), this system:

1. **Automatically captures** the failure context
2. **Creates a detailed report** with what failed and why
3. **Stores context** for the next fix iteration
4. **Alerts** with GitHub issue
5. **Keeps Amp on standby** ready to help with fixes

## Quick Start for Developers

### Check for Recent Failures

```bash
npm run standby
```

Shows:
- Latest failure (if any)
- Which tests failed
- Recommendations for fixing

### Diagnose Your Infrastructure

```bash
npm run diagnose
```

Checks:
- ✅ MongoDB connectivity
- ✅ Environment variables
- ✅ Build health
- ✅ Test configurations
- ✅ Server startup
- ✅ Square credentials
- ✅ Health endpoint

## How It Works

### Failure Workflow

```
GitHub Actions Test Failure
        ↓
failure-capture.yml triggers
        ↓
Extracts context & creates report
        ↓
Opens GitHub issue with details
        ↓
Commits context to repository
        ↓
npm run standby detects failure
        ↓
Shows developer what to fix
```

### Test Structure

**API Integration Tests** (`tests/api/**/*.spec.ts`)
- Tests payment flows
- Tests order creation
- Tests checkout API
- Requires: Running server + MongoDB

**Database Integration Tests** (`tests/db/**/*.spec.ts`)
- Tests database operations
- Tests data persistence
- Tests record updates
- Requires: MongoDB running

## Running Tests Locally

### Prerequisites
```bash
# Terminal 1: Start MongoDB
docker run -d --name mongo -p 27017:27017 mongo:6.0

# Set environment variables
export MONGODB_URI=mongodb://localhost:27017/test_db
export MONGO_URL=mongodb://localhost:27017/test_db
export JWT_SECRET=test-jwt-secret
export NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### Run All Tests
```bash
# Terminal 2: Build & start server
yarn build
yarn start

# Terminal 3: Run tests
yarn test:api
```

### Run Specific Tests
```bash
# API integration tests
yarn test:api

# Database tests
yarn vitest run --config vitest.db.config.ts

# Unit tests
yarn test:unit

# Smoke tests
yarn test:smoke
```

## Failure Types & Fixes

### API Integration Tests Fail

**Causes:**
- Server won't start
- Health check endpoint fails
- Square credentials missing
- Build errors

**Fix:**
```bash
npm run diagnose          # See what's failing
yarn build               # Rebuild
yarn start               # Test server start
yarn test:api            # Run tests
```

### Database Integration Tests Fail

**Causes:**
- MongoDB not running
- Connection timeout
- Missing env vars

**Fix:**
```bash
# Check MongoDB
docker ps | grep mongo

# Start if needed
docker run -d --name mongo -p 27017:27017 mongo:6.0

# Set env vars
export MONGODB_URI=mongodb://localhost:27017/test_db

# Run tests
yarn vitest run --config vitest.db.config.ts
```

### Build Fails

**Causes:**
- TypeScript errors
- Import errors
- Missing dependencies

**Fix:**
```bash
npm run diagnose         # See detailed errors
yarn build              # See build errors
yarn lint               # Check for lint issues
```

## Files Created

- `.github/workflows/failure-capture.yml` - Auto-captures failures
- `scripts/standby-monitor.js` - Checks for failures
- `scripts/diagnose-integration-tests.js` - Diagnoses infrastructure
- `.failure-reports/` - Stores failure context
- `DEPLOYMENT_FAILURE_SYSTEM.md` - Full documentation

## GitHub Issues

When tests fail, the system creates an issue:

- Title: `🔴 [STANDBY] Deployment Failure - {workflow-name}`
- Labels: `deployment-failure`, `needs-fix`, `standby-active`
- Body: Full failure context and recommendations

## Integration with Amp

**Amp's standby mode:**

1. When you push and tests fail, failure context is captured
2. Run `npm run standby` to see the failure
3. Run `npm run diagnose` to identify issues
4. Fix the problem and push again
5. Amp monitors the new test run
6. Repeat until tests pass

Amp stays in standby between pushes, ready to help with each iteration.

## Environment Variables

For integration tests to work:

```bash
# Required
MONGODB_URI=mongodb://localhost:27017/test_db
MONGO_URL=mongodb://localhost:27017/test_db
JWT_SECRET=test-jwt-secret
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Optional (for payment testing)
SQUARE_ACCESS_TOKEN=your-test-token
SQUARE_ENVIRONMENT=sandbox
```

## Monitoring

Check system status:
```bash
npm run standby          # Current failure status
npm run diagnose        # Infrastructure health
ls -la .failure-reports/ # Recent failure reports
cat FAILURE_CONTEXT.md  # Latest failure context
```

## Common Commands

| What | Command |
|------|---------|
| Check for failures | `npm run standby` |
| Diagnose system | `npm run diagnose` |
| Run API tests | `yarn test:api` |
| Run DB tests | `yarn vitest run --config vitest.db.config.ts` |
| Start MongoDB | `docker run -d --name mongo -p 27017:27017 mongo:6.0` |
| Build app | `yarn build` |
| Start server | `yarn start` |
| View failures | `ls -la .failure-reports/` |

## Support

When deployments fail:
1. ✅ Failure is automatically captured
2. ✅ GitHub issue is created
3. ✅ Run `npm run standby` to see status
4. ✅ Run `npm run diagnose` to identify issues
5. ✅ Fix and push
6. ✅ System validates new test run

**Amp is on standby to help with each iteration.**
