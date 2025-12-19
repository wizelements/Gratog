# Connect tasteofgratitude.shop to Vercel Deployment

**Status**: Step-by-step domain connection guide  
**Time**: 10 minutes  
**Registrar**: Namecheap  
**Current URL**: https://gratog.vercel.app  
**Target URL**: https://tasteofgratitude.shop

---

## Step 1: Add Domain to Vercel

### In Vercel Dashboard

1. Go to https://vercel.com/wizelements/gratog
2. Click **Settings** (top navigation)
3. Click **Domains** (left sidebar)
4. Click **"Add"** or **"Add Domain"**
5. Type your domain: `tasteofgratitude.shop`
6. Click **"Add"**

Vercel will show you DNS records to add.

---

## Step 2: Get DNS Records from Vercel

After adding domain, Vercel shows something like:

```
Type: CNAME
Name: www
Value: cname.vercel-dns.com

Type: A
Name: (root/@)
Value: 76.76.19.132
```

**Copy these records** - you'll need them in Namecheap.

---

## Step 3: Connect Domain in Namecheap

### Login to Namecheap

1. Go to https://www.namecheap.com/
2. Login to your account
3. Go to **"Dashboard"**
4. Find **tasteofgratitude.shop**
5. Click **"Manage"**

### Update DNS Records

**For www subdomain (www.tasteofgratitude.shop)**:

1. Click **"Advanced DNS"** tab
2. Look for existing www record (might say "Redirect to URL" or "CNAME")
3. Delete any existing www record
4. Click **"Add Record"**
   - **Type**: CNAME Record
   - **Host**: www
   - **Value**: cname.vercel-dns.com
   - **TTL**: 30 min (or automatic)
5. Click checkmark to save

**For root domain (tasteofgratitude.shop)**:

1. Find **"@"** or **root** record in DNS list
2. Delete or replace with:
   - **Type**: A Record
   - **Host**: @
   - **Value**: 76.76.19.132 (use Vercel's IP)
   - **TTL**: 30 min
3. Click checkmark to save

### Optional: Redirect www to non-www (or vice versa)

Choose one approach:

**Option A: Use non-www as primary**
- Point `@` (root) to Vercel IP
- Make www a CNAME to root (or delete www)
- Primary: `tasteofgratitude.shop`

**Option B: Use www as primary**
- Point www to Vercel CNAME
- Redirect @ to www via Vercel settings
- Primary: `www.tasteofgratitude.shop`

For this guide, **we recommend Option A** (non-www primary).

---

## Step 4: Verify DNS Changes in Vercel

Back in Vercel:

1. Go to https://vercel.com/wizelements/gratog/settings/domains
2. Find **tasteofgratitude.shop**
3. It should show: **"Verifying..."** or **"Valid Configuration"** ✅

**Note**: DNS propagation takes 5-30 minutes. If still showing as invalid after 30 minutes:
- Wait longer (DNS cache)
- Check DNS records are exactly as Vercel specified
- Check TTL isn't too high (use 30 min or less)

---

## Step 5: Set Primary Domain in Vercel (Optional but Recommended)

1. In Vercel Domains section
2. Find your domain in the list
3. Click the **"..."** menu
4. Select **"Set as Primary Domain"**

This makes your custom domain the default instead of `gratog.vercel.app`.

---

## Step 6: Verify Connection Works

Once DNS propagates (5-30 min):

1. Go to https://tasteofgratitude.shop
2. Should load your Gratog app ✅
3. Check browser - should show padlock (HTTPS) ✅
4. Vercel auto-provides SSL certificate

---

## Step 7: Update Environment Variables for Domain

In Vercel Dashboard:

1. Settings → Environment Variables
2. Find or create: `NEXT_PUBLIC_APP_URL`
3. Set value to: `https://tasteofgratitude.shop`
4. Save
5. Redeploy project

This updates any hardcoded URLs to use custom domain.

---

## Step 8: Update Square Payment Settings (If Needed)

If using Square payments:

1. Go to Square Dashboard: https://squareup.com/dashboard
2. Settings → Trusted Web Domains
3. Add: `tasteofgratitude.shop`
4. Also add: `www.tasteofgratitude.shop`
5. Save

This allows Square to verify payment requests from your domain.

---

## DNS Records Summary

### What Vercel Gives You
```
CNAME for www:
  Host: www
  Value: cname.vercel-dns.com
  TTL: 30 min

A Record for root:
  Host: @ (or root)
  Value: 76.76.19.132
  TTL: 30 min
```

### What You Put in Namecheap
```
www subdomain:
  Type: CNAME
  Host: www
  Value: cname.vercel-dns.com

Root domain:
  Type: A
  Host: @
  Value: 76.76.19.132
```

---

## Troubleshooting

### Domain Shows "Invalid Configuration"

**Check 1**: DNS Records match Vercel exactly
- Type: CNAME vs A (don't mix them)
- Host: www vs @ (exact match)
- Value: cname.vercel-dns.com or 76.76.19.132 (exact)

**Check 2**: Wait for DNS propagation
- Give it 15-30 minutes
- Check with: https://dnschecker.org/

**Check 3**: TTL is short enough
- Use 30 minutes, not 3600
- Helps testing and fixes

**Check 4**: Old records deleted
- Delete old redirect records
- Keep only A and CNAME records for Vercel

### Site Shows 404 or Old Content

**Check 1**: Vercel shows domain as valid
- Green checkmark in Domains section

**Check 2**: Hard refresh browser
- Ctrl+Shift+Delete (Windows) or Cmd+Shift+Delete (Mac)
- Clear all cookies/cache

**Check 3**: Check HTTPS certificate
- Click padlock in browser
- Should say "Valid" with Vercel cert

**Check 4**: Wait for deployment
- Might be deploying when you visit
- Try again in 30 seconds

### HTTPS Shows as Insecure

**Usually resolves itself**:
- Vercel auto-generates SSL cert
- Takes 5-10 minutes after DNS valid
- Refresh after 10 minutes

If persists:
1. Go to Vercel Domains
2. Force renewal: Click ... menu → Refresh Certificate

---

## Email Forwarding (Bonus)

While in Namecheap, you can also set up email forwarding:

1. Go to **Email Forwarding** section
2. Add: `hello@tasteofgratitude.shop` → your email
3. Save

Then you can receive emails at your custom domain email address.

---

## After Domain is Live

### Update Documentation
- [ ] Update README to point to custom domain
- [ ] Update any hardcoded URLs
- [ ] Update social media links
- [ ] Update emails to use custom domain email

### Monitor Performance
- [ ] Check Vercel Analytics dashboard
- [ ] Monitor Core Web Vitals
- [ ] Check error logs
- [ ] Test on mobile

### Security Checklist
- [ ] HTTPS is working (green padlock)
- [ ] SSL certificate is valid
- [ ] Mixed content warnings (if any)
- [ ] Security headers are present

---

## Timeline

| Step | Time | Status |
|------|------|--------|
| Add domain to Vercel | 1 min | ⏳ Do Now |
| Get DNS records | 1 min | ⏳ Do Now |
| Update Namecheap DNS | 3 min | ⏳ Do Now |
| DNS propagation | 15 min | ⏳ Wait |
| Verify in Vercel | 1 min | ⏳ Check |
| Update env variables | 1 min | ⏳ Do |
| Vercel redeploy | 5 min | ⏳ Wait |
| **Total** | **~30 min** | |

---

## Verification Checklist

After following all steps:

- [ ] Domain added to Vercel
- [ ] DNS records added to Namecheap
- [ ] Waited 15-30 minutes for propagation
- [ ] Vercel shows "Valid Configuration" ✅
- [ ] HTTPS works (padlock visible)
- [ ] Site loads at custom domain
- [ ] NEXT_PUBLIC_APP_URL env var updated
- [ ] Vercel redeployed
- [ ] Square trusted domains updated
- [ ] All forms/payments work at new domain

---

## Quick Reference

### Vercel Setup
- Domain: `tasteofgratitude.shop`
- Type: Custom Domain
- SSL: Auto-managed
- Status: Should be "Valid Configuration"

### Namecheap Setup
- Provider: Namecheap
- Domain: tasteofgratitude.shop
- DNS Type: CNAME + A Record
- TTL: 30 minutes
- Update: Advanced DNS section

### No Code Needed
- Just DNS configuration
- No application changes required
- Vercel handles everything

---

## Questions?

**Domain still not working?**
1. Check DNS with: https://dnschecker.org/
2. Wait 30 minutes from DNS change
3. Clear browser cache
4. Try different browser

**Need help with Square?**
1. Check Square docs: https://developer.squareup.com/
2. Review trusted domains section
3. Test with test keys first

**Still stuck?**
- Check DEPLOYMENT_STATUS_AUTH_FIX.md
- Check Vercel error logs
- Review Namecheap DNS docs

---

**Domain Setup Date**: December 16, 2024  
**Estimated Time**: 30 minutes  
**Difficulty**: ⭐⭐ (Simple DNS pointing)
