# Community Engagement Setup Guide

This guide will help you configure the newsletter system (Resend) and Instagram feed integration for the Taste of Gratitude community features.

---

## 📧 Newsletter System with Resend

### Step 1: Create a Resend Account

1. Go to [resend.com](https://resend.com)
2. Sign up for a free account (100 emails/day free tier)
3. Verify your email address

### Step 2: Get Your API Key

1. Log in to your Resend dashboard
2. Navigate to **API Keys** in the left sidebar
3. Click **Create API Key**
4. Give it a name (e.g., "Taste of Gratitude Production")
5. Select permissions: **Sending access**
6. Click **Add** and copy your API key

### Step 3: Verify Your Domain (Recommended for Production)

1. In Resend dashboard, go to **Domains**
2. Click **Add Domain**
3. Enter your domain: `tasteofgratitude.com` (or `tasteofgratitude.shop`)
4. Add the provided DNS records to your domain registrar:
   - **TXT record** for domain verification
   - **CNAME records** for email authentication (DKIM)
5. Wait for DNS propagation (5-30 minutes)
6. Click **Verify Domain**

### Step 4: Configure Environment Variables

1. Open `/app/.env`
2. Add your Resend API key:
   ```bash
   RESEND_API_KEY=re_your_api_key_here
   RESEND_FROM_EMAIL=hello@tasteofgratitude.com
   ```
3. **Important**: If you haven't verified your domain, use a test email:
   ```bash
   RESEND_FROM_EMAIL=delivered@resend.dev
   ```

### Step 5: Restart the Server

```bash
sudo supervisorctl restart nextjs
```

### Step 6: Test Newsletter Signup

1. Visit any page with the newsletter form (homepage footer, community page)
2. Enter your email and subscribe
3. Check your inbox for the welcome email
4. Monitor emails in Resend dashboard: **Emails** → **Logs**

---

## 📸 Instagram Feed Integration

### Current State

The Instagram feed currently displays **mock/placeholder data**. To show real Instagram posts, you need to set up Instagram Graph API access.

### Option 1: Quick Setup (Hashtag Feed - No API)

If you don't want to deal with Instagram API, you can:

1. Keep using mock data
2. Manually update the posts in `/app/app/api/instagram/posts/route.js`
3. Replace image URLs and captions with your real Instagram posts

### Option 2: Full Instagram API Integration

#### Prerequisites

- Instagram Business Account or Instagram Creator Account
- Facebook Page connected to your Instagram account
- Facebook Developer Account

#### Step 1: Convert to Instagram Business/Creator Account

1. Open Instagram app
2. Go to **Settings** → **Account**
3. Tap **Switch to Professional Account**
4. Choose **Business** or **Creator**
5. Complete the setup

#### Step 2: Create Facebook Page (if you don't have one)

1. Go to [facebook.com/pages/create](https://facebook.com/pages/create)
2. Create a page for Taste of Gratitude
3. Go to page Settings → **Instagram** → **Connect Account**
4. Link your Instagram Business account

#### Step 3: Create Facebook App

1. Go to [developers.facebook.com/apps](https://developers.facebook.com/apps)
2. Click **Create App**
3. Select **Business** as app type
4. Fill in app details:
   - **Display Name**: Taste of Gratitude Website
   - **App Contact Email**: your email
5. Click **Create App**

#### Step 4: Add Instagram Basic Display

1. In your app dashboard, click **Add Product**
2. Find **Instagram Basic Display** and click **Set Up**
3. Click **Create New App** in Instagram Basic Display
4. Fill in required fields:
   - **Valid OAuth Redirect URIs**: `https://taste-gratitude-pay.preview.emergentagent.com/api/instagram/callback`
   - **Deauthorize**: `https://taste-gratitude-pay.preview.emergentagent.com/api/instagram/deauthorize`
   - **Data Deletion**: `https://taste-gratitude-pay.preview.emergentagent.com/api/instagram/delete`
5. Save changes

#### Step 5: Add Instagram Testers

1. Go to **Roles** → **Instagram Testers**
2. Click **Add Instagram Testers**
3. Enter your Instagram username
4. Open Instagram app → **Settings** → **Apps and Websites** → **Tester Invites**
5. Accept the invite

#### Step 6: Generate Access Token

1. In Facebook app dashboard, go to **Instagram Basic Display** → **User Token Generator**
2. Click **Generate Token** next to your Instagram account
3. Log in to Instagram and authorize the app
4. Copy the **Access Token** (starts with `IG...`)

#### Step 7: Get Long-Lived Access Token

Short-lived tokens expire in 1 hour. Get a long-lived token (60 days):

```bash
curl -X GET "https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=YOUR_APP_SECRET&access_token=SHORT_LIVED_TOKEN"
```

Replace:
- `YOUR_APP_SECRET`: From App Settings → Basic → App Secret
- `SHORT_LIVED_TOKEN`: The token from Step 6

Response:
```json
{
  "access_token": "LONG_LIVED_TOKEN",
  "token_type": "bearer",
  "expires_in": 5183944
}
```

#### Step 8: Configure Environment Variable

1. Open `/app/.env`
2. Add your long-lived token:
   ```bash
   INSTAGRAM_ACCESS_TOKEN=your_long_lived_token_here
   ```
3. Restart the server:
   ```bash
   sudo supervisorctl restart nextjs
   ```

#### Step 9: Update API Route (Optional)

The Instagram API route (`/app/app/api/instagram/posts/route.js`) has placeholder code for real API integration. Uncomment the fetch code:

```javascript
if (hasInstagramAPI) {
  const response = await fetch(
    `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,permalink,timestamp&access_token=${process.env.INSTAGRAM_ACCESS_TOKEN}&limit=${limit}`
  );
  const data = await response.json();
  return NextResponse.json({ posts: data.data, source: 'instagram' });
}
```

#### Step 10: Refresh Token Automatically

Long-lived tokens expire after 60 days. To auto-refresh:

1. Create a cron job or scheduled function
2. Call the refresh endpoint every 30 days:
   ```bash
   curl -X GET "https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=CURRENT_TOKEN"
   ```
3. Update the `INSTAGRAM_ACCESS_TOKEN` in your .env

---

## ⭐ Product Reviews System

### How It Works

1. **Customer submits review**: Form on product detail pages
2. **Review stored**: Saved in MongoDB `product_reviews` collection
3. **Points awarded**: 10 points added to customer's passport
4. **Email sent**: Confirmation email via Resend
5. **Auto-published**: Reviews appear immediately (can be hidden by admin)

### Admin Moderation

To hide inappropriate reviews:

```bash
curl -X PUT https://taste-gratitude-pay.preview.emergentagent.com/api/reviews/REVIEW_ID \
  -H "Content-Type: application/json" \
  -d '{
    "hidden": true,
    "adminKey": "dev-admin-key-taste-of-gratitude-2024"
  }'
```

To delete a review:

```bash
curl -X DELETE "https://taste-gratitude-pay.preview.emergentagent.com/api/reviews/REVIEW_ID?adminKey=dev-admin-key-taste-of-gratitude-2024"
```

### Review Analytics

View all reviews in MongoDB:

```javascript
db.product_reviews.find({ hidden: false }).sort({ createdAt: -1 })
```

Get average rating per product:

```javascript
db.product_reviews.aggregate([
  { $match: { hidden: false } },
  { $group: { 
    _id: "$productId", 
    avgRating: { $avg: "$rating" },
    count: { $sum: 1 }
  }}
])
```

---

## 🧪 Testing Community Features

### 1. Test Newsletter Signup

- Visit: `https://taste-gratitude-pay.preview.emergentagent.com`
- Scroll to footer
- Submit email
- Check for welcome email
- Verify subscriber in MongoDB:
  ```javascript
  db.newsletter_subscribers.find({ email: "test@example.com" })
  ```

### 2. Test Product Reviews

- Visit any product page: `/product/elderberry-moss`
- Click "Write a Review"
- Submit 5-star review
- Check review displays on page
- Verify points awarded:
  ```javascript
  db.passports.findOne({ email: "test@example.com" })
  ```
- Check confirmation email

### 3. Test Instagram Feed

- Visit: `/community`
- Scroll to "Follow Our Wellness Journey"
- Verify 6 posts display (mock or real)
- Click "View" to test permalink
- Click "Follow @tasteofgratitude" button

---

## 📊 Monitoring & Analytics

### Newsletter Metrics

Check subscriber stats:

```javascript
// Total subscribers
db.newsletter_subscribers.countDocuments({ status: 'active' })

// Subscribers by source
db.newsletter_subscribers.aggregate([
  { $group: { _id: "$source", count: { $sum: 1 } }}
])

// Recent subscribers (last 7 days)
const weekAgo = new Date(Date.now() - 7*24*60*60*1000);
db.newsletter_subscribers.find({ 
  subscribedAt: { $gte: weekAgo },
  status: 'active'
}).count()
```

### Review Metrics

```javascript
// Total reviews
db.product_reviews.countDocuments({ hidden: false })

// Average rating across all products
db.product_reviews.aggregate([
  { $match: { hidden: false } },
  { $group: { _id: null, avgRating: { $avg: "$rating" } }}
])

// Most reviewed products
db.product_reviews.aggregate([
  { $match: { hidden: false } },
  { $group: { _id: "$productId", count: { $sum: 1 } }},
  { $sort: { count: -1 } },
  { $limit: 5 }
])
```

---

## 🚀 Production Deployment Checklist

- [ ] Resend API key configured (not mock mode)
- [ ] Domain verified in Resend
- [ ] `RESEND_FROM_EMAIL` set to your verified domain email
- [ ] Instagram access token configured (optional)
- [ ] Tested newsletter signup flow
- [ ] Tested product review submission
- [ ] Set up token refresh for Instagram (if using API)
- [ ] Configure admin moderation workflow
- [ ] Set up monitoring for email delivery rates
- [ ] Add newsletter unsubscribe link (handled by Resend)

---

## 🆘 Troubleshooting

### Newsletter emails not sending

1. Check Resend API key is valid
2. Verify domain in Resend dashboard
3. Check server logs: `tail -f /var/log/supervisor/nextjs.out.log`
4. Test API directly:
   ```bash
   curl -X POST https://taste-gratitude-pay.preview.emergentagent.com/api/newsletter/subscribe \
     -H "Content-Type: application/json" \
     -d '{"email": "test@example.com", "firstName": "Test"}'
   ```

### Instagram feed showing mock data

1. Check `INSTAGRAM_ACCESS_TOKEN` is set in .env
2. Verify token hasn't expired (60 days max)
3. Test token manually:
   ```bash
   curl "https://graph.instagram.com/me/media?fields=id,caption&access_token=YOUR_TOKEN"
   ```
4. Check API route uncommented the real fetch code

### Reviews not appearing

1. Check MongoDB connection
2. Verify review saved:
   ```javascript
   db.product_reviews.find().sort({ createdAt: -1 }).limit(1)
   ```
3. Ensure `hidden` field is `false`
4. Check browser console for errors
5. Verify ProductReviews component is rendering

---

## 📞 Support

If you need help:

1. Check server logs: `tail -f /var/log/supervisor/nextjs.out.log`
2. Check MongoDB connection: `mongo mongodb://localhost:27017`
3. Test APIs with curl commands above
4. Review this guide's troubleshooting section

For Resend support: [resend.com/docs](https://resend.com/docs)  
For Instagram API: [developers.facebook.com/docs/instagram-basic-display-api](https://developers.facebook.com/docs/instagram-basic-display-api)
