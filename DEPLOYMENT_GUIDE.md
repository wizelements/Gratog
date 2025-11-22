# 🚀 TASTE OF GRATITUDE - COMPLETE DEPLOYMENT GUIDE

## 📋 Pre-Deployment Checklist

### Required Accounts & Credentials

- [ ] **Square Developer Account** (https://developer.squareup.com)
  - Get Production Access Token
  - Get Application ID
  - Get Location ID
  - Configure webhook URL

- [ ] **MongoDB Atlas Account** (https://www.mongodb.com/cloud/atlas)
  - Create production cluster
  - Whitelist deployment IP
  - Get connection string

- [ ] **Resend Account** (https://resend.com)
  - Get API key
  - Verify sending domain

- [ ] **Vercel/Hosting Account**
  - Connect GitHub repository
  - Configure custom domain

### Optional Services

- [ ] **Stripe** (Fallback payments): https://stripe.com
- [ ] **PostHog** (Analytics): https://posthog.com
- [ ] **Sentry** (Error tracking): https://sentry.io
- [ ] **Twilio** (SMS): https://twilio.com

---

## 🔧 Step 1: Environment Configuration

### 1.1 Copy Template

```bash
cp .env.production.template .env.production
```

### 1.2 Fill Required Variables

Edit `.env.production` and add:

```bash
# MongoDB
MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net/taste_of_gratitude

# Square
SQUARE_ACCESS_TOKEN=EAAA...  # From Square Dashboard
NEXT_PUBLIC_SQUARE_APPLICATION_ID=sq0idp-...
SQUARE_LOCATION_ID=L...
SQUARE_ENVIRONMENT=production

# Resend
RESEND_API_KEY=re_...

# URLs
NEXT_PUBLIC_BASE_URL=https://your-domain.com

# Security (Generate 32+ character random strings)
ADMIN_SECRET=your_secure_secret_here
JWT_SECRET=your_jwt_secret_here
```

### 1.3 Verify Configuration

```bash
# Test MongoDB connection
node -e "require('mongodb').MongoClient.connect(process.env.MONGO_URL).then(() => console.log('✅ MongoDB connected')).catch(e => console.error('❌ MongoDB failed:', e.message))"

# Test Square credentials
curl -X GET https://connect.squareup.com/v2/locations \
  -H "Square-Version: 2024-10-17" \
  -H "Authorization: Bearer $SQUARE_ACCESS_TOKEN"
```

---

## 🚢 Step 2: Deployment Options

### Option A: Vercel (Recommended - Easiest)

#### 2.1 Install Vercel CLI

```bash
npm install -g vercel
```

#### 2.2 Deploy

```bash
# Automated script
chmod +x scripts/deploy-vercel.sh
./scripts/deploy-vercel.sh

# OR manual
vercel --prod
```

#### 2.3 Configure Environment Variables in Vercel

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add all variables from `.env.production`
3. Redeploy: `vercel --prod`

#### 2.4 Add Custom Domain

1. Vercel Dashboard → Domains
2. Add your domain: `tasteofgratitude.com`
3. Update DNS records as instructed
4. SSL certificate auto-configured

---

### Option B: Docker (Self-Hosted)

#### 2.1 Build Image

```bash
chmod +x scripts/deploy-docker.sh
./scripts/deploy-docker.sh
```

#### 2.2 Or Manual Docker

```bash
# Build
docker build -t taste-of-gratitude:latest -f Dockerfile.production .

# Run
docker run -d \
  --name taste-of-gratitude \
  -p 3000:3000 \
  --env-file .env.production \
  --restart unless-stopped \
  taste-of-gratitude:latest
```

#### 2.3 Setup Reverse Proxy (Nginx)

```nginx
server {
    listen 80;
    server_name tasteofgratitude.com www.tasteofgratitude.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name tasteofgratitude.com www.tasteofgratitude.com;

    ssl_certificate /etc/letsencrypt/live/tasteofgratitude.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tasteofgratitude.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

### Option C: Kubernetes

```bash
# Apply configuration
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml

# Check status
kubectl get pods -l app=taste-of-gratitude
kubectl logs -f deployment/taste-of-gratitude
```

---

## 🧪 Step 3: Post-Deployment Testing

### 3.1 Smoke Tests

```bash
# Homepage loads
curl -I https://your-domain.com

# Products API
curl https://your-domain.com/api/products | jq '.success'

# Health check
curl https://your-domain.com/api/health | jq
```

### 3.2 Payment Flow Test

1. Visit: `https://your-domain.com/catalog`
2. Add product to cart
3. Go to checkout
4. Use test card: `4242 4242 4242 4242`
5. Complete purchase
6. Verify order email received

### 3.3 User Dashboard Test

1. Register new account: `/register`
2. Login: `/login`
3. View profile: `/profile`
4. Check stats, orders, rewards
5. Daily check-in: `/profile/challenge`

---

## 📸 Step 4: Upload Product Photos

### Via Admin Dashboard

1. Login to admin: `https://your-domain.com/admin/login`
2. Go to Products
3. Click on product without image
4. Upload high-res photo (1200x1200px recommended)
5. Save

### Via MongoDB Direct Upload

```javascript
// Connect to MongoDB
use taste_of_gratitude

// Update product with image
db.unified_products.updateOne(
  { slug: "product-slug" },
  { $set: { 
    image: "https://your-cdn.com/product-image.jpg",
    images: ["https://your-cdn.com/product-image.jpg"]
  }}
)
```

---

## 🔐 Step 5: Security Hardening

### 5.1 Enable Rate Limiting

Already configured in middleware. Verify:

```bash
curl -I https://your-domain.com/api/products
# Should see: X-RateLimit-Limit, X-RateLimit-Remaining
```

### 5.2 Configure CORS

In `.env.production`:

```bash
CORS_ORIGINS=https://tasteofgratitude.com,https://www.tasteofgratitude.com
```

### 5.3 Setup Webhooks

#### Square Webhook

1. Square Dashboard → Webhooks
2. Add endpoint: `https://your-domain.com/api/webhooks/square`
3. Subscribe to events:
   - `payment.created`
   - `payment.updated`
   - `order.created`
   - `order.updated`
   - `catalog.version.updated`
   - `inventory.count.updated`
4. Copy Signature Key to `.env.production`

---

## 📊 Step 6: Monitoring Setup

### 6.1 Sentry (Error Tracking)

1. Create Sentry project
2. Get DSN
3. Add to `.env.production`:
   ```bash
   SENTRY_DSN=https://...@sentry.io/...
   NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
   ```

### 6.2 PostHog (Analytics)

1. Create PostHog project
2. Get API key
3. Add to `.env.production`:
   ```bash
   NEXT_PUBLIC_POSTHOG_KEY=phc_...
   NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
   ```

---

## ✅ Step 7: Final Verification

### Checklist

- [ ] Homepage loads (<3s)
- [ ] All 33 products visible
- [ ] Product images display (or beautiful placeholders)
- [ ] Add to cart works
- [ ] Checkout creates Square Payment Link
- [ ] Test payment completes successfully
- [ ] Order confirmation email received
- [ ] User registration works
- [ ] Login works
- [ ] Profile dashboard shows correct data
- [ ] Daily challenge check-in works
- [ ] Admin dashboard accessible
- [ ] SSL certificate active
- [ ] Mobile responsive
- [ ] Social proof visible
- [ ] Trust badges display
- [ ] Scarcity badges on products

---

## 🎉 Launch Day!

### Announcement Checklist

- [ ] Social media posts scheduled
- [ ] Email newsletter sent
- [ ] Update Google My Business
- [ ] Submit sitemap to Google Search Console
- [ ] Set up Google Analytics (optional)
- [ ] Enable Facebook Pixel (optional)

### First Week Monitoring

- [ ] Check error logs daily (Sentry)
- [ ] Monitor payment success rate
- [ ] Review customer feedback
- [ ] Track conversion rates (PostHog)
- [ ] Test all flows from different devices

---

## 🆘 Troubleshooting

### Issue: Products not loading

```bash
# Check MongoDB connection
node -e "require('mongodb').MongoClient.connect(process.env.MONGO_URL).then(() => console.log('OK')).catch(console.error)"

# Verify products in database
mongosh $MONGO_URL --eval "db.unified_products.countDocuments()"
```

### Issue: Payments failing

```bash
# Test Square credentials
curl https://connect.squareup.com/v2/locations \
  -H "Authorization: Bearer $SQUARE_ACCESS_TOKEN" \
  -H "Square-Version: 2024-10-17"

# Check logs
tail -f /var/log/supervisor/nextjs.out.log
```

### Issue: Emails not sending

```bash
# Test Resend API key
curl -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "test@your-domain.com",
    "to": "you@email.com",
    "subject": "Test",
    "text": "Test email"
  }'
```

---

## 📞 Support

For deployment assistance:

- Documentation: `/app/README.md`
- API Reference: `/app/API_REFERENCE.md`
- Environment Guide: `/app/.env.production.template`

---

**🎊 Congratulations! Your store is now live and ready to accept orders!**
