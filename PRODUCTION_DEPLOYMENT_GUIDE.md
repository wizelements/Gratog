# 🚀 Production Deployment Guide - Taste of Gratitude

## Overview
Complete guide for deploying the Square-integrated e-commerce platform to production.

---

## Pre-Deployment Checklist

### ✅ Square Configuration
- [x] Production access token configured
- [x] Application ID verified
- [x] Location ID validated
- [x] Catalog synced (29 products)
- [ ] Webhooks configured in Square Dashboard
- [ ] Test payment processed successfully

### ✅ Application Status
- [x] Backend APIs tested (90% pass rate)
- [x] Frontend functional (29 products loading)
- [x] Database connections stable
- [x] Image domains configured
- [x] Catalog sync script working
- [ ] Daily sync scheduled
- [ ] Production environment variables set

### ✅ Security
- [x] HTTPS enforced
- [x] Square webhook signature verification implemented
- [ ] Webhook signature key configured
- [x] Environment variables secured
- [x] CORS headers configured

---

## Deployment Steps

### 1. Environment Configuration (15 min)

#### Production Environment Variables
Create `/app/.env.production` with:

```bash
# Server Configuration
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_BASE_URL=https://tasteofgratitude.shop

# Database
MONGO_URL=mongodb://localhost:27017
DB_NAME=taste_of_gratitude

# Square Production Credentials
SQUARE_ENVIRONMENT=production
SQUARE_ACCESS_TOKEN=your_production_token_here
SQUARE_APPLICATION_ID=sq0idp-V1fV-MwsU5lET4rvzHKnIw
SQUARE_LOCATION_ID=L66TVG6867BG9
SQUARE_WEBHOOK_SIGNATURE_KEY=your_webhook_signature_here

# Communication (Optional)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=your_twilio_number
RESEND_API_KEY=your_resend_key
```

#### Copy to Production
```bash
cp /app/.env.production /app/.env
sudo supervisorctl restart nextjs
```

---

### 2. Database Setup (10 min)

#### Initial Catalog Sync
```bash
cd /app
node scripts/syncCatalog.js
```

**Expected Output:**
```
✅ Connected to Square successfully
   Location: Taste Of Gratitude
📦 Total objects retrieved: 123
✅ Saved 29 items
✅ Saved 6 categories
🎉 Sync completed successfully!
```

#### Verify Database
```bash
mongosh localhost:27017/taste_of_gratitude
```

```javascript
// Check products
db.square_catalog_items.countDocuments()
// Should return: 29

// Check categories
db.square_catalog_categories.find().pretty()

// Check sync metadata
db.square_sync_metadata.findOne({ type: 'catalog_sync' })
```

---

### 3. Schedule Automated Sync (5 min)

#### Option A: Supervisor (Recommended for Emergent)
```bash
# Add to supervisor config
cat >> /etc/supervisor/conf.d/catalog-sync.conf << 'EOF'
[program:catalog-sync-scheduler]
command=/bin/bash -c "while true; do sleep 86400; /app/scripts/catalog-sync-cron.sh; done"
autostart=true
autorestart=true
stderr_logfile=/var/log/supervisor/catalog-sync.err.log
stdout_logfile=/var/log/supervisor/catalog-sync.out.log
EOF

# Reload supervisor
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start catalog-sync-scheduler
```

#### Option B: System Cron (Alternative)
```bash
# Edit crontab
crontab -e

# Add this line (runs daily at 2 AM)
0 2 * * * /app/scripts/catalog-sync-cron.sh
```

#### Verify Sync Logs
```bash
tail -f /var/log/catalog-sync.log
```

---

### 4. Configure Square Webhooks (15 min)

#### Step 1: Access Square Dashboard
1. Go to https://developer.squareup.com/
2. Sign in and select your application
3. Navigate to **Webhooks** in left sidebar

#### Step 2: Add Webhook Subscription
**Webhook URL:**
```
https://tasteofgratitude.shop/api/webhooks/square
```

**Subscribe to Events:**
- ✅ `inventory.count.updated`
- ✅ `catalog.version.updated`  
- ✅ `payment.created`
- ✅ `payment.updated`
- ✅ `order.created`
- ✅ `order.updated`

#### Step 3: Configure Signature Key
1. Copy the signature key from Square Dashboard
2. Add to `.env`:
   ```bash
   SQUARE_WEBHOOK_SIGNATURE_KEY=your_signature_key_here
   ```
3. Restart application:
   ```bash
   sudo supervisorctl restart nextjs
   ```

#### Step 4: Test Webhook
```bash
# Send test event from Square Dashboard
# Then check logs:
tail -f /var/log/supervisor/nextjs.out.log | grep -i webhook

# Verify in database:
mongosh localhost:27017/taste_of_gratitude
db.webhook_logs.find().sort({createdAt: -1}).limit(1).pretty()
```

---

### 5. DNS & Domain Configuration (30 min)

#### Domain Setup
1. Point `tasteofgratitude.shop` to your server IP
2. Configure A record in DNS provider
3. Wait for DNS propagation (5-60 minutes)

#### SSL Certificate (Let's Encrypt)
```bash
# Install certbot
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# Generate certificate
sudo certbot --nginx -d tasteofgratitude.shop -d www.tasteofgratitude.shop

# Test auto-renewal
sudo certbot renew --dry-run
```

#### Nginx Configuration
```nginx
server {
    listen 80;
    server_name tasteofgratitude.shop www.tasteofgratitude.shop;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name tasteofgratitude.shop www.tasteofgratitude.shop;

    ssl_certificate /etc/letsencrypt/live/tasteofgratitude.shop/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tasteofgratitude.shop/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

### 6. Final Testing (20 min)

#### Backend API Tests
```bash
# Health check
curl https://tasteofgratitude.shop/api/health

# Products API
curl https://tasteofgratitude.shop/api/products | jq '.count'
# Should return: 29

# Square diagnostic
curl https://tasteofgratitude.shop/api/square-diagnose | jq '.summary'
```

#### Frontend Tests
1. **Homepage**: https://tasteofgratitude.shop/
   - ✅ Hero section loads
   - ✅ Navigation works
   - ✅ CTAs functional

2. **Catalog**: https://tasteofgratitude.shop/catalog
   - ✅ 29 products display
   - ✅ Categories filter
   - ✅ Images load from Square S3

3. **Order Flow**: https://tasteofgratitude.shop/order
   - ✅ Product selection
   - ✅ Customer info form
   - ✅ Fulfillment options
   - ✅ Square payment form

#### Test Payment Flow
```bash
# Create test payment link
curl -X POST https://tasteofgratitude.shop/api/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "line_items": [{
      "catalog_object_id": "YOUR_PRODUCT_ID",
      "quantity": "1"
    }],
    "redirect_url": "https://tasteofgratitude.shop/order/success"
  }'

# Click the returned payment link and complete test purchase
```

---

### 7. Monitoring Setup (10 min)

#### Application Logs
```bash
# Real-time monitoring
tail -f /var/log/supervisor/nextjs.out.log

# Error monitoring
tail -f /var/log/supervisor/nextjs.err.log

# Catalog sync logs
tail -f /var/log/catalog-sync.log
```

#### Database Monitoring
```javascript
// Order count
db.orders.countDocuments()

// Recent orders
db.orders.find().sort({createdAt: -1}).limit(5)

// Webhook event count
db.webhook_logs.countDocuments()

// Sync status
db.square_sync_metadata.findOne({ type: 'catalog_sync' })
```

#### Performance Monitoring
```bash
# Check memory usage
free -h

# Check disk space
df -h

# Check process status
sudo supervisorctl status
```

---

## Post-Deployment Verification

### Critical Checks (30 min)

#### 1. Application Health
```bash
curl https://tasteofgratitude.shop/api/health | jq
```
**Expected:**
```json
{
  "status": "healthy",
  "database": "connected",
  "square_api": "production"
}
```

#### 2. Product Catalog
```bash
curl https://tasteofgratitude.shop/api/products | jq '.count'
```
**Expected:** `29`

#### 3. Square Payment Link Creation
```bash
# Should successfully create payment link
curl -X POST https://tasteofgratitude.shop/api/checkout \
  -H "Content-Type: application/json" \
  -d '{"line_items": [{"catalog_object_id": "24IR66LLZDKD2NMM3FI4JKPG", "quantity": "1"}]}'
```

#### 4. Webhook Reception
- Trigger test event from Square Dashboard
- Check logs: `grep -i "webhook" /var/log/supervisor/nextjs.out.log`
- Verify in DB: `db.webhook_logs.find().limit(1)`

---

## Rollback Plan

If deployment issues occur:

### 1. Quick Rollback
```bash
# Revert to preview environment variables
cp /app/.env.preview /app/.env
sudo supervisorctl restart nextjs
```

### 2. Database Rollback
```bash
# Restore from backup (if needed)
mongorestore --uri="mongodb://localhost:27017/taste_of_gratitude" /backup/path
```

### 3. DNS Rollback
- Revert DNS A record to previous IP
- Wait for DNS propagation

---

## Troubleshooting

### Issue: Products Not Loading

**Symptoms:** Catalog page shows loading or 0 products

**Solution:**
```bash
# Re-run catalog sync
cd /app && node scripts/syncCatalog.js

# Check database
mongosh localhost:27017/taste_of_gratitude
db.square_catalog_items.countDocuments()

# Restart app
sudo supervisorctl restart nextjs
```

### Issue: Payment Links Not Creating

**Symptoms:** Checkout returns 500 error

**Solution:**
```bash
# Verify Square credentials
grep SQUARE /app/.env

# Test Square connectivity
curl https://tasteofgratitude.shop/api/square-diagnose

# Check logs for specific error
tail -100 /var/log/supervisor/nextjs.out.log | grep -i "square\|payment"
```

### Issue: Webhooks Not Receiving

**Symptoms:** No webhook events in logs

**Solution:**
```bash
# 1. Verify webhook URL is accessible
curl https://tasteofgratitude.shop/api/webhooks/square

# 2. Check Square Dashboard for delivery failures

# 3. Verify signature key is set
grep SQUARE_WEBHOOK_SIGNATURE_KEY /app/.env

# 4. Test webhook manually
curl -X POST https://tasteofgratitude.shop/api/webhooks/square \
  -H "Content-Type: application/json" \
  -d '{"type": "test.event", "data": {}}'
```

### Issue: Images Not Loading

**Symptoms:** Product images show broken or don't load

**Solution:**
```bash
# 1. Verify image domains in next.config.js
grep "items-images" /app/next.config.js

# 2. Check image URLs in database
mongosh localhost:27017/taste_of_gratitude
db.square_catalog_items.findOne({}, {images: 1})

# 3. Test image URL directly
curl -I "https://items-images-production.s3.us-west-2.amazonaws.com/..."
```

---

## Maintenance

### Daily Tasks
- ✅ Automated catalog sync (2 AM)
- ✅ Webhook processing (automatic)

### Weekly Tasks
- Review error logs: `tail -500 /var/log/supervisor/nextjs.err.log`
- Check disk space: `df -h`
- Review order volume: `db.orders.countDocuments()`

### Monthly Tasks
- Update dependencies: `cd /app && yarn upgrade`
- Backup database: `mongodump --uri="mongodb://localhost:27017/taste_of_gratitude"`
- Review Square API changes
- Update SSL certificate (auto via certbot)

---

## Performance Optimization

### Enable Caching
Add to `/app/next.config.js`:
```javascript
headers: async () => [
  {
    source: '/api/products',
    headers: [
      { key: 'Cache-Control', value: 'public, s-maxage=300, stale-while-revalidate=600' }
    ]
  }
]
```

### Database Indexes
```javascript
// Ensure indexes for performance
db.square_catalog_items.createIndex({ name: "text" })
db.orders.createIndex({ createdAt: -1 })
db.orders.createIndex({ customerEmail: 1 })
```

### CDN Setup (Optional)
- Configure Cloudflare for static assets
- Enable image optimization
- Set up caching rules

---

## Security Hardening

### Rate Limiting
Already implemented in:
- `/app/lib/response-optimizer.js`
- 30 requests per minute default

### Environment Variables
```bash
# Restrict .env permissions
chmod 600 /app/.env
chown www-data:www-data /app/.env
```

### Firewall Rules
```bash
# Allow only necessary ports
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw allow 22/tcp    # SSH
ufw enable
```

---

## Support & Resources

### Documentation
- **Square API Docs**: https://developer.squareup.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **MongoDB Docs**: https://www.mongodb.com/docs

### Application Files
- **Webhook Setup**: `/app/SQUARE_WEBHOOK_SETUP.md`
- **API Routes**: `/app/app/api/`
- **Sync Script**: `/app/scripts/syncCatalog.js`

### Contact
- **Square Support**: https://squareup.com/help
- **Technical Issues**: Review logs and check GitHub issues

---

## Success Criteria

✅ **Production Deployment Complete When:**
1. Application accessible at https://tasteofgratitude.shop
2. 29 products loading from Square catalog
3. Payment links creating successfully
4. Webhooks receiving and processing events
5. Daily catalog sync running automatically
6. All backend APIs returning 200 status
7. Frontend fully responsive on mobile/desktop
8. SSL certificate active and auto-renewing
9. Monitoring and logging operational
10. Test purchase completed successfully

---

**Last Updated:** November 3, 2025  
**Version:** 2.0 - Square Production Integration  
**Status:** Ready for Deployment
