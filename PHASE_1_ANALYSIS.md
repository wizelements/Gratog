# PHASE I: Quiz Engine Rebuild - Comprehensive Analysis

## Executive Summary
**Date:** June 2025  
**Application:** Taste of Gratitude E-Commerce Platform  
**Objective:** Transform quiz into conversion-driven personalized wellness journey

---

## 🔍 CURRENT STATE ANALYSIS

### 1. Quiz Component Status ✅ EXISTS

**Location:** `/app/components/FitQuiz.jsx`

**Current Features:**
- ✅ **3-step quiz flow**: Goal → Texture → Adventure Level
- ✅ **5 wellness goals**: Immune, Gut, Energy, Skin, Calm
- ✅ **3 texture preferences**: Gel, Lemonade, Shot
- ✅ **2 adventure levels**: Mild, Bold
- ✅ **Dynamic UI transitions** with Lucide icons
- ✅ **Analytics tracking** integrated (AnalyticsSystem)
- ✅ **Product recommendations** via `/api/quiz/recommendations` endpoint
- ✅ **Add to cart functionality** with toast notifications
- ✅ **Retake quiz option**

**Current Weaknesses:**
- ❌ **NO lead capture** (no name/email collection before results)
- ❌ **NO database persistence** (quiz results not saved)
- ❌ **NO email automation** trigger after completion
- ❌ **NO personalized recommendation page** (/recommendations/:userId)
- ❌ **NO follow-up nurture sequence**
- ❌ Quiz component NOT displayed on any page currently (orphaned component)

---

### 2. Recommendation API Status ✅ FUNCTIONAL

**Endpoint:** `/app/app/api/quiz/recommendations/route.js`

**Current Capabilities:**
- ✅ **Goal-based product mapping** with primary/secondary recommendations
- ✅ **Adventure level modifications** (bold vs mild flavors)
- ✅ **Texture preference filtering** (gel, lemonade, shot)
- ✅ **Match score calculation** algorithm (weighted scoring)
- ✅ **Enhanced recommendation reasons** with personalized messaging
- ✅ **Confidence scores** for each recommendation (0.65-0.95)
- ✅ Returns up to 4 top recommendations

**Product Mapping Example:**
```javascript
immune: ['elderberry-moss', 'gratitude-defense', 'grateful-guardian']
gut: ['grateful-greens', 'kissed-by-gods', 'supplemint']
energy: ['blue-lotus', 'pineapple-mango-lemonade', 'spicy-bloom']
skin: ['floral-tide', 'golden-glow-gel', 'blue-lotus']
calm: ['blue-lotus', 'grateful-greens', 'kissed-by-gods']
```

---

### 3. Email Service Status ✅ CONFIGURED

**Provider:** Resend  
**API Key:** ✅ Present in `.env` (re_KDMnzhx9_7QH25AFoQ7p8Um61tczAXa5D)  
**From Email:** hello@tasteofgratitude.com

**Existing Email Modules:**
- `/app/lib/resend.js` - Newsletter & Review emails
- `/app/lib/resend-email.js` - Order confirmations & transactional emails

**Available Email Functions:**
- ✅ `sendNewsletterWelcome(email, firstName)`
- ✅ `sendReviewConfirmation(email, productName, pointsEarned)`
- ✅ `sendOrderConfirmationEmail(order)`
- ✅ `sendWelcomeEmail(email, name)`
- ✅ `sendCouponEmail(email, coupon)`

**Missing Email Functions:**
- ❌ `sendQuizResultsEmail(email, name, recommendations)`
- ❌ `sendQuizFollowUp3Days(email, name, quizId)`
- ❌ `sendQuizFollowUp7Days(email, name, passportLink)`

---

### 4. Database Status

**MongoDB Collections:**
```javascript
[
  'customers',
  'coupons',
  'passports',
  'customer_passports',
  'orders',
  'newsletter_subscribers',
  // ... others
]
```

**Missing Collection:**
- ❌ `quiz_results` - NOT EXISTS, needs creation

**Required Schema:**
```javascript
{
  _id: UUID,
  customer: {
    name: String,
    email: String (indexed, unique)
  },
  answers: {
    goal: String,        // 'immune', 'gut', 'energy', 'skin', 'calm'
    texture: String,     // 'gel', 'lemonade', 'shot'
    adventure: String    // 'mild', 'bold'
  },
  recommendations: Array[Product],
  matchScore: Number,
  completedAt: Date,
  emailsSent: {
    results: Boolean,
    followUp3Day: Boolean,
    followUp7Day: Boolean
  },
  conversionStatus: {
    viewed: Boolean,
    addedToCart: Boolean,
    purchased: Boolean,
    purchaseDate: Date
  },
  createdAt: Date,
  updatedAt: Date
}
```

---

### 5. Product Catalog Status ✅ COMPREHENSIVE

**Source:** `/app/lib/products.js`  
**Total Products:** 19 premium sea moss products

**Categories:**
- **Gels (6):** Elderberry Moss, Healing Harmony, Golden Glow, Grateful Greens, Kissed by Gods, Floral Tide
- **Lemonades (11):** Pineapple Mango, Blue Lotus, Grateful Guardian, etc.
- **Wellness Shots (2):** Supplemint, Spicy Bloom

**Product Data Structure:**
```javascript
{
  id: String,
  slug: String,
  name: String,
  category: String,       // 'gel', 'lemonade', 'shot'
  price: Number,          // In dollars
  size: String,           // '16oz', '2oz', '8oz'
  description: String,
  image: String,          // CDN URL
  ingredients: Array,
  benefits: Array,
  squareProductUrl: String,
  featured: Boolean,
  inStock: Boolean,
  rewardPoints: Number
}
```

---

### 6. Frontend Integration Status

**Quiz Display:**
- ❌ NOT visible on homepage (component exists but not rendered)
- ✅ "Take the Quiz" button exists on `/catalog` page
- ❌ No dedicated `/quiz` page route

**Catalog Page Analysis:**
- ✅ Quiz CTA banner: "Not sure where to start? Take our 60-second wellness quiz"
- ✅ "Take the Quiz" button present
- ✅ Product filtering by category
- ✅ 19 products displayed with Square Checkout integration

**Homepage Analysis:**
- ✅ Hero section with wellness messaging
- ✅ "Shop Now" and "Our Story" CTAs
- ✅ Market visit information
- ❌ No quiz promotion on homepage

---

## 🎯 PHASE I IMPLEMENTATION REQUIREMENTS

### Task 1: Database Model Creation

**Objective:** Create `quiz_results` collection with proper indexing

**Implementation:**
1. Create MongoDB schema migration
2. Add indexes for email (unique) and createdAt
3. Set up TTL index for data retention (optional, 180 days)

**Files to Create:**
- `/app/lib/db-quiz.js` - Quiz database operations
- `/app/scripts/setup-quiz-db.js` - Migration script

---

### Task 2: Enhanced Quiz UI with Lead Capture

**Objective:** Add lead capture screen BEFORE showing results

**New Flow:**
1. Start Quiz (existing)
2. Question 1: Goal (existing)
3. Question 2: Texture (existing)
4. Question 3: Adventure (existing)
5. **NEW: Lead Capture Screen**
   - "Save my personalized blend"
   - Name input (required)
   - Email input (required)
   - Checkbox: "Email me my results"
   - Privacy consent
6. Results with Recommendations (existing, enhanced)

**Files to Modify:**
- `/app/components/FitQuiz.jsx` - Add step 3.5 (lead capture)

---

### Task 3: Quiz Results Persistence API

**Objective:** Save quiz results to database with customer info

**New Endpoint:**
- `POST /api/quiz/submit` - Save quiz results with email/name

**Request Body:**
```javascript
{
  customer: { name: String, email: String },
  answers: { goal, texture, adventure },
  recommendations: Array[Product]
}
```

**Response:**
```javascript
{
  success: true,
  quizId: UUID,
  recommendations: Array[Product],
  emailSent: boolean
}
```

**Files to Create:**
- `/app/app/api/quiz/submit/route.js`

---

### Task 4: Email Automation System

**Objective:** Trigger 3-email nurture sequence after quiz completion

**Email #1: Immediate Results (Trigger: quiz completion)**
- Subject: "Your Perfect Blend Awaits 🌿"
- Content: Personalized product recommendations
- CTA: "Shop My Wellness Set" → `/recommendations/:userId`

**Email #2: Educational Follow-Up (Trigger: +3 days, no purchase)**
- Subject: "Did You Try Your Sea Moss Yet?"
- Content: Benefits education, customer testimonials
- CTA: "Learn More" → `/about`

**Email #3: Rewards Engagement (Trigger: +7 days, no purchase)**
- Subject: "Your Gratitude Passport Unlocks Rewards"
- Content: Community engagement, referral invite
- CTA: "Get My Passport" → `/passport`

**Files to Create:**
- `/app/lib/quiz-emails.js` - Email template functions
- `/app/app/api/quiz/email-automation/route.js` - Webhook for delayed emails

---

### Task 5: Personalized Recommendation Page

**Objective:** Create dynamic `/recommendations/:userId` page

**Features:**
- Display saved quiz results
- Show top 4 personalized products
- "Re-take quiz" CTA
- "Shop full catalog" fallback
- Email capture if not already saved

**Files to Create:**
- `/app/app/recommendations/[userId]/page.js`
- `/app/app/api/quiz/results/[userId]/route.js` - Fetch saved results

---

### Task 6: Homepage & Catalog Integration

**Objective:** Prominently display quiz entry points

**Homepage Changes:**
- Add quiz hero banner below main hero
- "Find Your Perfect Blend" CTA
- Quiz icon in navigation

**Catalog Changes:**
- Move quiz CTA to top (currently exists but small)
- Add "Personalize Your Selection" messaging

**Files to Modify:**
- `/app/app/page.js` - Homepage
- `/app/app/catalog/page.js` - Catalog page (minor adjustments)

---

## 📊 SUCCESS METRICS FOR PHASE I

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Quiz Completion Rate** | 80% | (completions / starts) |
| **Lead Capture Rate** | 95% | (emails captured / completions) |
| **Email Delivery Rate** | 98%+ | Resend dashboard |
| **Recommendation Click-Through** | 40%+ | Analytics tracking |
| **Quiz → Cart Rate** | 15%+ | Conversion tracking |

---

## 🔧 TECHNICAL STACK

- **Frontend:** Next.js 15.5.4, React, Tailwind CSS, shadcn/ui
- **Backend:** Next.js API Routes
- **Database:** MongoDB (localhost:27017)
- **Email:** Resend API (configured, tested)
- **Analytics:** Custom AnalyticsSystem (already integrated)

---

## 🚀 IMPLEMENTATION PRIORITY ORDER

1. **Create Database Schema** (30 min)
2. **Add Lead Capture to Quiz UI** (1 hour)
3. **Create Quiz Submit API** (45 min)
4. **Create Email Templates & Functions** (2 hours)
5. **Build Recommendation Page** (1.5 hours)
6. **Integrate Quiz on Homepage** (30 min)
7. **Testing & QA** (2 hours)

**Total Estimated Time:** ~8 hours

---

## ⚠️ DEPENDENCIES & BLOCKERS

### Required Values to Confirm:
1. ✅ **Resend API Key** - Already configured
2. ✅ **From Email** - hello@tasteofgratitude.com
3. ❌ **Email domain verification** - Need to confirm Resend domain is verified
4. ❌ **Recommendation page URL structure** - Confirm preference: `/recommendations/:userId` or `/quiz/results/:id`

### Technical Considerations:
- MongoDB indexes need to be created for performance
- Email rate limits with Resend (check current plan)
- Privacy compliance for storing customer emails (GDPR/CCPA)
- Quiz results retention policy (suggest 180 days)

---

## 📋 NEXT STEPS

1. ✅ **Analysis Complete** - You are here
2. 🔄 **Confirm with user:**
   - Resend domain verification status
   - Preferred URL structure for recommendations
   - Email sending frequency limits
   - Any brand guidelines for email design
3. 🚀 **Begin Implementation** - Phase I tasks 1-7

---

**Analysis Completed By:** AI Engineer  
**Status:** Ready for Implementation  
**Approval Required:** User confirmation on dependencies
