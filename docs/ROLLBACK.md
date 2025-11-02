# Rollback Procedures

## Quick Rollback - Disable Delivery

If delivery feature causes issues, disable it immediately:

### Step 1: Update Environment Variable

```bash
# In .env file
NEXT_PUBLIC_FULFILLMENT_DELIVERY=disabled
```

### Step 2: Restart Services

```bash
sudo supervisorctl restart nextjs
```

### Step 3: Clear CDN Cache (if applicable)

```bash
# Cloudflare example
curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone_id}/purge_cache" \
  -H "Authorization: Bearer {api_token}" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'
```

### Step 4: Verify

- Visit `/order` page
- Confirm delivery option NOT visible
- Confirm pickup/shipping still work
- Check logs for errors

---

## Full Rollback - Previous Git Commit

### Step 1: Identify Target Commit

```bash
cd /app
git log --oneline -10
```

### Step 2: Create Backup Branch

```bash
git branch backup-$(date +%Y%m%d-%H%M%S)
```

### Step 3: Rollback

```bash
git reset --hard {commit_hash}
```

### Step 4: Reinstall Dependencies (if package.json changed)

```bash
yarn install
```

### Step 5: Clear Next.js Cache

```bash
rm -rf /app/.next
```

### Step 6: Restart Services

```bash
sudo supervisorctl restart all
```

### Step 7: Verify

- Check `/` homepage loads
- Check `/order` checkout works
- Test payment flow
- Check logs for errors

---

## Rollback Webhook Configuration

If webhooks cause issues:

### Step 1: Disable in Square Dashboard

1. Go to Square Developer Dashboard
2. Navigate to Webhooks section
3. Click on your webhook endpoint
4. Click "Disable" or "Delete"

### Step 2: Verify Webhook Endpoint Returns 404

```bash
curl -X POST https://your-domain.com/api/square-webhook \
  -H "Content-Type: application/json" \
  -d '{}'
```

Should return 404 or disabled message.

---

## Rollback Square Integration

If Square payment processing fails:

### Step 1: Enable Mock Mode

```bash
# In .env file
SQUARE_MOCK_MODE=true
```

### Step 2: Restart Services

```bash
sudo supervisorctl restart nextjs
```

### Step 3: Verify Mock Mode Active

- Check `/api/health` endpoint
- Confirm `square_api: "mock"`
- Test payment creates mock payment ID

### Step 4: Communicate to Team

Notify team that payments are in mock mode and real transactions won't process.

---

## Emergency Maintenance Mode

If critical issue requires taking site offline:

### Step 1: Create Maintenance Page

```bash
# Create simple maintenance.html
cat > /app/public/maintenance.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
  <title>Maintenance - Taste of Gratitude</title>
  <style>
    body { font-family: Arial; text-align: center; padding: 50px; }
    h1 { color: #D4AF37; }
  </style>
</head>
<body>
  <h1>We'll be right back!</h1>
  <p>We're performing scheduled maintenance.</p>
  <p>Please check back in a few minutes.</p>
</body>
</html>
EOF
```

### Step 2: Update Middleware to Serve Maintenance Page

(Requires code change - better to use proxy/CDN for this)

### Step 3: Communicate

- Update social media
- Send email to customers (optional)
- Update website banner when back online

---

## Post-Rollback Actions

### Immediately After Rollback

1. [ ] Verify core functionality works
2. [ ] Check error logs
3. [ ] Test critical user paths
4. [ ] Monitor for new errors
5. [ ] Document what went wrong

### Within 24 Hours

1. [ ] Root cause analysis
2. [ ] Create bug report
3. [ ] Plan hotfix
4. [ ] Test hotfix in staging
5. [ ] Schedule re-deployment

### Within 1 Week

1. [ ] Implement permanent fix
2. [ ] Add automated tests
3. [ ] Update deployment checklist
4. [ ] Review rollback procedure effectiveness
5. [ ] Update documentation

---

## Rollback Decision Matrix

| Issue Severity | Action | Rollback Type |
|----------------|--------|---------------|
| Critical (site down) | Immediate | Full rollback |
| High (payments broken) | < 15 min | Feature disable or full rollback |
| Medium (feature broken) | < 1 hour | Feature disable |
| Low (cosmetic bug) | Next deploy | No rollback, log issue |

---

## Contact Information

**Emergency Contacts:**
- Developer: [Your Contact]
- DevOps: [DevOps Contact]
- Business Owner: [Owner Contact]

**External Services:**
- Square Support: https://squareup.com/help
- Hosting Provider: [Provider Support]
- CDN Provider: [CDN Support]
