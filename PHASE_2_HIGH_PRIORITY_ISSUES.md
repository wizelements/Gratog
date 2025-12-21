# Phase 2: HIGH Priority Issues (Deploy within 1 month)

After Phase 1 security fixes, these issues should be addressed in Phase 2.

---

## ISSUE 1: No Fraud Detection

### Problem
Anyone can repeatedly stamp the same market to earn unlimited rewards.

### Attack Scenario
```
Attacker at "Market A" (Latitude: 40.7128, Longitude: -74.0060)
Stamps every 5 minutes (rate limit allows 2/hour at one market)
Switches between markets to bypass per-market limits
Within 24 hours: 48 stamps → Multiple rewards, can resell codes
```

### Solution Required

```javascript
// lib/fraud-detection.js
import { connectToDatabase } from './db-optimized';

export class FraudDetectionSystem {
  /**
   * Comprehensive fraud check before accepting stamp
   */
  static async checkForFraud(email, marketName, marketLocation) {
    const { db } = await connectToDatabase();
    const passport = await db.collection('passports').findOne({ customerEmail: email });

    const checks = {
      velocityCheck: await this.checkVelocity(email, passport),
      geographicCheck: await this.checkGeography(email, marketLocation, passport),
      marketValidation: await this.validateMarket(marketName),
      timeAnomaly: this.checkTimeAnomaly(passport),
      fingerprintAnalysis: await this.checkFingerprint(email)
    };

    return {
      isFraudulent: Object.values(checks).some(c => c.suspicious),
      risks: checks,
      score: this.calculateRiskScore(checks)
    };
  }

  /**
   * Velocity check: too many stamps in short time?
   */
  static async checkVelocity(email, passport) {
    if (!passport) return { suspicious: false, reason: 'new_user' };

    const oneHourAgo = new Date(Date.now() - 3600000);
    const recentStamps = passport.stamps.filter(s => s.timestamp > oneHourAgo);

    const suspicious = recentStamps.length > 5; // Max 5 per hour
    return {
      suspicious,
      count: recentStamps.length,
      reason: suspicious ? 'excessive_stamps_per_hour' : null
    };
  }

  /**
   * Geographic check: impossible travel?
   */
  static checkGeography(email, currentMarketLocation, passport) {
    if (!passport || passport.stamps.length === 0) {
      return { suspicious: false, reason: 'first_stamp' };
    }

    const lastStamp = passport.stamps[passport.stamps.length - 1];
    const lastLocation = lastStamp.marketLocation || { lat: 0, lng: 0 };

    // Calculate distance
    const distance = this.calculateDistance(lastLocation, currentMarketLocation);
    const timeDiff = Date.now() - lastStamp.timestamp;
    const maxSpeed = 100; // km/h (car speed)
    const maxDistance = (maxSpeed * timeDiff) / 3600000; // km

    const suspicious = distance > maxDistance;
    return {
      suspicious,
      distance: distance.toFixed(2),
      timeSinceLastStamp: timeDiff / 60000, // minutes
      reason: suspicious ? 'impossible_travel' : null
    };
  }

  /**
   * Validate market is real
   */
  static async validateMarket(marketName) {
    const { db } = await connectToDatabase();
    const market = await db.collection('markets').findOne({ name: marketName });

    return {
      suspicious: !market,
      isValidMarket: !!market,
      reason: !market ? 'invalid_market' : null
    };
  }

  /**
   * Time anomaly: stamping at 3am every day?
   */
  static checkTimeAnomaly(passport) {
    if (!passport || passport.stamps.length < 5) {
      return { suspicious: false, reason: 'insufficient_history' };
    }

    const hours = passport.stamps.map(s => new Date(s.timestamp).getHours());
    const average = hours.reduce((a, b) => a + b, 0) / hours.length;

    // Suspicious if consistently stamping at odd hours
    const suspicious = average < 6 || average > 23; // Not between 6am-11pm
    return {
      suspicious,
      averageHour: average.toFixed(1),
      reason: suspicious ? 'off_hours_activity' : null
    };
  }

  /**
   * Fingerprint analysis: related accounts?
   */
  static async checkFingerprint(email) {
    // Would require: IP address, device fingerprint, browser data
    // This is a placeholder for the concept
    return {
      suspicious: false,
      relatedAccounts: 0,
      reason: null
    };
  }

  /**
   * Calculate overall fraud risk score (0-100)
   */
  static calculateRiskScore(checks) {
    let score = 0;

    if (checks.velocityCheck.suspicious) score += 30;
    if (checks.geographicCheck.suspicious) score += 40;
    if (checks.marketValidation.suspicious) score += 25;
    if (checks.timeAnomaly.suspicious) score += 15;
    if (checks.fingerprintAnalysis.suspicious) score += 20;

    return Math.min(100, score);
  }

  static calculateDistance(loc1, loc2) {
    const R = 6371; // Earth radius in km
    const dLat = (loc2.lat - loc1.lat) * Math.PI / 180;
    const dLng = (loc2.lng - loc1.lng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(loc1.lat * Math.PI / 180) * Math.cos(loc2.lat * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}
```

### Implementation
In stamp endpoint:
```javascript
import FraudDetectionSystem from '@/lib/fraud-detection';

// Before adding stamp
const fraud = await FraudDetectionSystem.checkForFraud(email, market, location);

if (fraud.score > 70) {
  // Block stamp
  return createErrorResponse('Unable to process - please try again later', 429);
}

if (fraud.score > 40) {
  // Flag for manual review
  await db.collection('fraud_alerts').insertOne({
    email,
    market,
    score: fraud.score,
    risks: fraud.risks,
    timestamp: new Date()
  });
}

// Continue with stamp
```

---

## ISSUE 2: No Monitoring & Observability

### Problem
Can't detect fraud, performance issues, or errors in real-time.

### Required Metrics

```javascript
// lib/monitoring.js
import * as Sentry from '@sentry/nextjs';

export class RewardsMonitoring {
  /**
   * Track stamp requests
   */
  static trackStampRequest(email, market, success, rewardCount) {
    const tags = {
      rewards: 'stamp',
      market,
      success: success.toString(),
      rewarded: (rewardCount > 0).toString()
    };

    Sentry.captureMessage('Stamp request', {
      level: 'info',
      tags,
      contexts: {
        rewards: { email, market, rewards: rewardCount }
      }
    });

    // Send to analytics
    if (typeof window !== 'undefined') {
      gtag('event', 'stamp_added', {
        market,
        success,
        reward_count: rewardCount
      });
    }
  }

  /**
   * Track voucher redemptions
   */
  static trackVoucherRedemption(email, voucherType, success) {
    Sentry.captureMessage('Voucher redeemed', {
      level: 'info',
      tags: {
        rewards: 'voucher_redeem',
        type: voucherType,
        success: success.toString()
      }
    });
  }

  /**
   * Track API errors
   */
  static trackError(error, endpoint, context = {}) {
    Sentry.captureException(error, {
      tags: {
        rewards: 'api_error',
        endpoint
      },
      contexts: { rewards: context }
    });
  }

  /**
   * Track performance
   */
  static trackPerformance(endpoint, duration) {
    if (duration > 1000) {
      Sentry.captureMessage(`Slow API: ${endpoint}`, {
        level: 'warning',
        contexts: { performance: { endpoint, duration } }
      });
    }
  }
}
```

### Dashboards to Create

**1. Rewards Distribution**
- Stamps awarded per hour
- Rewards issued per day
- Voucher redemption rate
- XP points distributed

**2. Fraud Detection**
- Suspicious accounts flagged
- Geographic anomalies
- Velocity limit hits
- Invalid market attempts

**3. API Performance**
- Request latency (p50, p95, p99)
- Error rate by endpoint
- Database query time
- Transaction rollback rate

**4. User Engagement**
- New passports created
- Active users per day
- Conversion rate (create → stamp → redeem)
- Retention by level

---

## ISSUE 3: No Logging

### Problem
When errors happen, we can't diagnose them because we don't log anything.

### Solution

```javascript
// lib/logger.js
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname'
    }
  }
});

export function logStamp(email, market, success, rewardCount) {
  logger.info({
    event: 'stamp_added',
    email: hashEmail(email), // Never log plaintext
    market,
    success,
    reward_count: rewardCount,
    timestamp: new Date()
  });
}

export function logError(error, context) {
  logger.error({
    event: 'error',
    error: {
      message: error.message,
      code: error.code,
      stack: error.stack
    },
    context,
    timestamp: new Date()
  });
}

function hashEmail(email) {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(email).digest('hex');
}
```

---

## ISSUE 4: No API Versioning

### Problem
Can't make breaking changes without killing all clients.

### Solution

```
/api/v1/rewards/stamp (current, deprecated after 30 days)
/api/v2/rewards/stamp (new with breaking changes)
/api/v3/rewards/stamp (beta, behind feature flag)
```

Create middleware:

```javascript
// middleware/api-version.js
export function withApiVersion(handler) {
  return async (request, context) => {
    const version = context.params.version || 'v1';
    
    if (!['v1', 'v2', 'v3'].includes(version)) {
      return new Response(
        JSON.stringify({ error: 'Invalid API version' }),
        { status: 400 }
      );
    }

    // Add version to request for handler to use
    request.apiVersion = version;
    
    return handler(request, context);
  };
}
```

---

## ISSUE 5: No Data Encryption at Rest

### Problem
Customer emails/names stored plaintext in database.

### Solution

```javascript
// lib/encryption.js
import crypto from 'crypto';

const algorithm = 'aes-256-gcm';

export function encryptField(value, secret) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, Buffer.from(secret.padEnd(32)), iv);
  
  let encrypted = cipher.update(JSON.stringify(value), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return {
    iv: iv.toString('hex'),
    encrypted,
    authTag: authTag.toString('hex')
  };
}

export function decryptField(encrypted, secret) {
  const decipher = crypto.createDecipheriv(
    algorithm,
    Buffer.from(secret.padEnd(32)),
    Buffer.from(encrypted.iv, 'hex')
  );
  
  decipher.setAuthTag(Buffer.from(encrypted.authTag, 'hex'));
  
  let decrypted = decipher.update(encrypted.encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return JSON.parse(decrypted);
}
```

Apply to database:
```javascript
// When creating passport
const encryptedEmail = encryptField(email, process.env.ENCRYPTION_KEY);

await db.collection('passports').insertOne({
  email: encryptedEmail,
  customerName: encryptField(name, process.env.ENCRYPTION_KEY),
  // ... other fields
});
```

---

## ISSUE 6: No GDPR Compliance Tools

### Problem
Can't honor data deletion or export requests.

### Solution

```javascript
// /app/api/customer/export/route.js
export async function POST(request) {
  const auth = await verifyAuth(request);
  
  // Get all data for this user
  const passport = await db.collection('passports').findOne({
    email: auth.userEmail
  });

  // Return as JSON download
  return new Response(JSON.stringify(passport), {
    headers: {
      'Content-Disposition': 'attachment; filename=rewards-data.json'
    }
  });
}

// /app/api/customer/delete/route.js
export async function DELETE(request) {
  const auth = await verifyAuth(request);
  
  // Delete all data (hard delete)
  await db.collection('passports').deleteOne({
    email: auth.userEmail
  });
  
  // Log deletion for compliance
  await db.collection('deletion_audit').insertOne({
    email: hashEmail(auth.userEmail),
    deletedAt: new Date()
  });

  return json({ success: true });
}
```

---

## ISSUE 7: No Security Headers

### Problem
Missing HTTP security headers leave us vulnerable.

### Solution

```javascript
// middleware.ts
import { NextResponse } from 'next/server';

export function middleware(request) {
  const response = NextResponse.next();

  // HSTS: Force HTTPS
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains'
  );

  // Prevent MIME sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY');

  // XSS protection
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // CSP
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' https://cdn.example.com"
  );

  // Disable browser MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');

  return response;
}

export const config = {
  matcher: ['/api/:path*', '/']
};
```

---

## Implementation Timeline

| Week | Task | Hours |
|------|------|-------|
| W1-2 | Fraud detection system | 8 |
| W2-3 | Monitoring & alerting | 6 |
| W3-4 | Structured logging | 4 |
| W4 | API versioning | 3 |
| W4-5 | Data encryption | 5 |
| W5-6 | GDPR compliance tools | 4 |
| W6 | Security headers | 2 |
| **Total** | | **32 hours** |

---

## Success Criteria

After Phase 2:
- [ ] Fraud risk score blocks obvious attacks
- [ ] Can identify fraud patterns via dashboard
- [ ] All errors logged with context
- [ ] Performance monitored and alerts set
- [ ] Can make breaking changes safely
- [ ] Customer data encrypted at rest
- [ ] Can honor GDPR requests within 24 hours
- [ ] All security headers present

