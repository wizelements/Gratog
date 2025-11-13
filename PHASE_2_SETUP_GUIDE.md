# Phase II: Email Automation - Setup Guide

## Overview

Phase II implements a 3-email nurture sequence for quiz takers:
- **Email #1 (Immediate)**: Quiz results with personalized recommendations ✅
- **Email #2 (Day 3)**: Educational follow-up with testimonials
- **Email #3 (Day 7)**: Rewards engagement with passport program

---

## System Architecture

### 1. Email Queue System
- **Collection**: `email_queue` in MongoDB
- **Scheduled emails** stored with delivery dates
- **Status tracking**: pending → sent/failed/cancelled
- **Smart cancellation**: Stops emails if customer purchases

### 2. API Endpoints

#### POST /api/quiz/submit
- **Enhanced**: Now automatically schedules follow-up emails
- Creates 2 queue entries: Day 3 and Day 7
- Returns quiz ID for tracking

#### POST /api/quiz/email-scheduler
- **Purpose**: Process pending emails from queue
- **Called by**: Cron job or manual trigger
- **Auth**: Requires Bearer token (CRON_SECRET from .env)
- **Logic**:
  1. Fetches pending emails due for delivery
  2. Checks if customer purchased (cancels if yes)
  3. Sends email via Resend
  4. Updates status in queue and quiz records

#### GET /api/quiz/email-scheduler
- **Purpose**: Get email queue statistics
- Returns: pending, sent, failed, cancelled counts

#### POST /api/quiz/conversion-webhook
- **Purpose**: Cancel scheduled emails when customer purchases
- **Parameters**: `{ quizId, customerEmail, action: 'purchased' }`
- **Called from**: Order completion flow

---

## Setup Instructions

### Option 1: Manual Processing (For Testing)

**Test the email scheduler manually:**

```bash
curl -X POST https://taste-gratitude-pay.preview.emergentagent.com/api/quiz/email-scheduler \
  -H "Authorization: Bearer cron-secret-taste-of-gratitude-2024" \
  -H "Content-Type: application/json"
```

**Check queue status:**

```bash
curl https://taste-gratitude-pay.preview.emergentagent.com/api/quiz/email-scheduler
```

### Option 2: Automated Cron Job (Recommended for Production)

**Using cron-job.org (Free Service):**

1. Go to https://cron-job.org
2. Create account
3. Add new cron job:
   - **Title**: "Taste of Gratitude - Email Scheduler"
   - **URL**: `https://taste-gratitude-pay.preview.emergentagent.com/api/quiz/email-scheduler`
   - **Method**: POST
   - **Headers**: 
     - `Authorization: Bearer cron-secret-taste-of-gratitude-2024`
     - `Content-Type: application/json`
   - **Schedule**: Every 6 hours (0 */6 * * *)
   - **Timezone**: America/New_York

4. Enable and save

**Alternative: Vercel Cron (If deploying to Vercel)**

Create `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/quiz/email-scheduler",
    "schedule": "0 */6 * * *"
  }]
}
```

### Option 3: EasyCron (Free Tier Available)

1. Go to https://www.easycron.com
2. Create account
3. Add new cron job with same settings as above

---

## Testing Phase II

### 1. Test Email Scheduling

**Submit a quiz and check database:**

```bash
# After quiz submission, check MongoDB
use taste_of_gratitude
db.email_queue.find().pretty()

# Should show 2 pending emails:
# - followUp3Day (scheduled for 3 days from now)
# - followUp7Day (scheduled for 7 days from now)
```

### 2. Test Immediate Email Processing (Manual)

**Force process emails by setting past dates:**

```javascript
// In MongoDB shell
db.email_queue.updateMany(
  { status: 'pending' },
  { $set: { scheduledFor: new Date() } }
)

// Then trigger email scheduler
curl -X POST http://localhost:3000/api/quiz/email-scheduler \
  -H "Authorization: Bearer cron-secret-taste-of-gratitude-2024"
```

### 3. Test Conversion Cancellation

**Simulate customer purchase:**

```bash
curl -X POST http://localhost:3000/api/quiz/conversion-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "quizId": "YOUR_QUIZ_ID_HERE",
    "action": "purchased"
  }'

# Check that pending emails are cancelled
db.email_queue.find({ quizId: "YOUR_QUIZ_ID_HERE" })
```

---

## Email Sending Limits

### Resend Free Tier
- **100 emails/month**
- **3,000 emails/day**

### Rate Limiting Strategy
- Email scheduler processes max 10 emails per run
- Running every 6 hours = 4 runs/day = 40 emails/day max
- Conservative approach to stay under limits

### Monitoring Email Usage

**Check sent emails in Resend Dashboard:**
- https://resend.com/emails

**Check queue stats via API:**
```bash
curl https://taste-gratitude-pay.preview.emergentagent.com/api/quiz/email-scheduler
```

---

## Integration with Order Flow

**Add to order completion handler:**

```javascript
// In /app/app/api/orders/complete/route.js (or similar)
async function completeOrder(order) {
  // ... existing order completion logic
  
  // Cancel scheduled quiz emails if customer has quiz
  if (order.customer.email) {
    await fetch('/api/quiz/conversion-webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerEmail: order.customer.email,
        action: 'purchased'
      })
    });
  }
}
```

---

## Database Collections

### email_queue
```javascript
{
  _id: "uuid",
  quizId: "quiz-uuid",
  recipient: {
    name: "Customer Name",
    email: "customer@email.com"
  },
  emailType: "followUp3Day" | "followUp7Day",
  scheduledFor: ISODate("2025-06-05T12:00:00Z"),
  status: "pending" | "sent" | "failed" | "cancelled",
  attempts: 0,
  lastAttemptAt: null,
  sentAt: null,
  error: null,
  emailData: {
    topProduct: { name, price, id }
  },
  createdAt: ISODate(),
  updatedAt: ISODate()
}
```

---

## Troubleshooting

### Emails not sending?
1. Check Resend API key in .env
2. Verify domain verified in Resend dashboard
3. Check email queue status: `db.email_queue.find({ status: 'failed' })`
4. Review server logs for email errors

### Emails sending multiple times?
1. Check `emailsSent` status in quiz_results
2. Verify cron job not running too frequently
3. Check `attempts` count in email_queue (max 3)

### Customer purchased but still receiving emails?
1. Ensure conversion webhook called on purchase
2. Check `conversionStatus.purchased` in quiz_results
3. Verify scheduled emails marked as cancelled

---

## Success Metrics

Track in admin dashboard:
- **Email Queue Stats**: GET /api/quiz/email-scheduler
- **Quiz Analytics**: GET /api/quiz/analytics
- **Resend Dashboard**: Track open rates, click rates

**Target Metrics:**
- Email Open Rate: 45%+
- Click-Through Rate: 15%+
- Conversion Rate (Quiz → Purchase): 10-15%
- Cancellation Rate: <5% (low = customers purchasing!)

---

## Phase II Complete! 🎉

All email automation infrastructure is now in place. Next steps:
1. Set up cron job for automated processing
2. Monitor email delivery and engagement
3. Track conversion metrics
4. Optimize email content based on performance
