# Complete Setup Checklist - From Code to Live Domain

**Status**: Ready for final setup  
**Estimated Time**: 30-45 minutes  
**Difficulty**: ⭐⭐ (Mostly configuration)

---

## Phase 1: Authentication Fix ✅ (Code Ready)

### Status: Complete
Code has been deployed to GitHub and pushed to Vercel.

**Files Modified**: 9  
**Tests Passing**: 19/19 ✅  
**GitHub Commit**: 9792e84

**What's Done**:
- [x] Root cause analysis (3 issues identified)
- [x] Database connection support for MONGODB_URI
- [x] Code backward compatible
- [x] All tests passing
- [x] Documentation created (6 files)
- [x] Code deployed to GitHub
- [x] Vercel auto-building

### Your Action: Set Environment Variables ⏳ TODO (5 minutes)

**In Vercel Dashboard**:

1. Go to https://vercel.com/wizelements/gratog
2. Click **Settings** → **Environment Variables**
3. Add these variables (set for Production, Preview, Development):

**Variable 1: MONGODB_URI**
```
Name: MONGODB_URI
Value: mongodb+srv://Togratitude:$gratitud3$@gratitude0.1ckskrv.mongodb.net/gratitude0?appName=Gratitude0
Environments: Production, Preview, Development
```

**Variable 2: JWT_SECRET**
```
Name: JWT_SECRET
Value: [generate-a-secure-random-key-32-chars-minimum]
Environments: Production, Preview, Development
```

**How to generate JWT_SECRET**:
```bash
# In terminal
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

4. Click **Save**
5. Vercel will ask to redeploy → Click **Yes**
6. Wait 5-10 minutes for deployment

**Verify**: 
- [ ] Vercel shows deployment complete (green checkmark)
- [ ] Can visit `/register` page
- [ ] Can register new user
- [ ] Can login with credentials
- [ ] No errors in browser console

---

## Phase 2: Domain Setup ⏳ TODO

### Domain Details
- **Current**: gratog.vercel.app
- **Target**: tasteofgratitude.shop
- **Registrar**: Namecheap
- **Hosting**: Vercel (unchanged)

### Your Actions: (10 minutes)

#### Step 1: Add Domain to Vercel (1 minute)

1. Go to https://vercel.com/wizelements/gratog/settings/domains
2. Click **"Add"** or **"Add Domain"**
3. Type: `tasteofgratitude.shop`
4. Click **"Add"**
5. **Copy the DNS records shown** - you'll need these for Namecheap

Vercel will show something like:
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com

Type: A
Name: @ (or root)
Value: 76.76.19.132
```

#### Step 2: Update Namecheap DNS Records (3 minutes)

1. Go to https://www.namecheap.com/ and login
2. Dashboard → Find **tasteofgratitude.shop**
3. Click **"Manage"**
4. Click **"Advanced DNS"** tab
5. **Delete any existing www or @ records** that aren't from Vercel

**Add Record 1 - www subdomain**:
- Click **"Add Record"**
- **Type**: CNAME Record
- **Host**: www
- **Value**: cname.vercel-dns.com
- **TTL**: 30 min (or Automatic)
- Click checkmark ✓

**Add Record 2 - root domain**:
- Click **"Add Record"**
- **Type**: A Record
- **Host**: @ (or leave blank/root)
- **Value**: 76.76.19.132
- **TTL**: 30 min (or Automatic)
- Click checkmark ✓

#### Step 3: Wait for DNS Propagation (15-30 minutes)

DNS changes take time to propagate worldwide.

**Optional**: Check propagation status
- Go to https://dnschecker.org/
- Enter: tasteofgratitude.shop
- Should show your new DNS records

#### Step 4: Verify in Vercel (1 minute)

1. Back in Vercel → Domains section
2. Look at tasteofgratitude.shop status
3. Should show **"Valid Configuration"** ✅ (green checkmark)
4. If still "Invalid": Wait longer, DNS takes time

#### Step 5: Test the Domain (2 minutes)

1. Open browser
2. Go to https://tasteofgratitude.shop
3. Should load your Gratog app ✅
4. Check padlock (HTTPS should work)
5. Navigate around to verify it works

**Verify**:
- [ ] Domain loads at tasteofgratitude.shop
- [ ] HTTPS works (padlock visible)
- [ ] App loads correctly
- [ ] No console errors
- [ ] Registration/login works

---

## Phase 3: Environment Variables Update ⏳ TODO

### Optional but Recommended

Update your app's environment variable to use the custom domain.

**In Vercel Environment Variables**:

1. Find or create: `NEXT_PUBLIC_APP_URL`
2. Set value to: `https://tasteofgratitude.shop`
3. Click **Save**
4. Vercel will ask to redeploy → Click **Yes**

This ensures any hardcoded URLs use your custom domain instead of vercel.app.

---

## Phase 4: Square Integration ⏳ TODO

### If Using Square Payments

Tell Square your new domain is trusted:

1. Go to https://squareup.com/dashboard
2. Click **Settings** (bottom left)
3. Click **Trusted Web Domains**
4. Click **"+ Add"**
5. Add your domain: `tasteofgratitude.shop`
6. Also add: `www.tasteofgratitude.shop`
7. Click **Save**

This allows Square to process payments from your custom domain.

---

## Phase 5: Documentation Updates ⏳ TODO

### Update Your README

In `/README.md`:

1. Update any references to old domain
2. Change `gratog.vercel.app` → `tasteofgratitude.shop`
3. Update setup instructions if needed
4. Commit to GitHub

### Update Setup Documentation

For your team:
1. Update any internal docs
2. Update deployment guides
3. Update API documentation
4. Note the custom domain in your README

---

## Complete Timeline

| Phase | Task | Time | Status |
|-------|------|------|--------|
| **1** | Auth Fix - Code Deploy | ✅ Done | |
| **1** | Set MongoDB/JWT env vars | 5 min | ⏳ TODO |
| **1** | Verify auth works | 5 min | ⏳ TODO |
| **2** | Add domain to Vercel | 1 min | ⏳ TODO |
| **2** | Update DNS in Namecheap | 3 min | ⏳ TODO |
| **2** | Wait for DNS propagation | 15-30 min | ⏳ WAIT |
| **2** | Verify domain works | 1 min | ⏳ TODO |
| **3** | Update app env var | 2 min | ⏳ TODO |
| **4** | Square trusted domains | 2 min | ⏳ TODO |
| **5** | Update documentation | 5 min | ⏳ TODO |
| | **TOTAL** | **~35 min** | |

---

## Quick Reference

### Vercel Links
- Dashboard: https://vercel.com/wizelements/gratog
- Settings: https://vercel.com/wizelements/gratog/settings
- Domains: https://vercel.com/wizelements/gratog/settings/domains
- Environment Vars: https://vercel.com/wizelements/gratog/settings/environment-variables

### Namecheap Links
- Dashboard: https://www.namecheap.com/
- Domain Manage: Find tasteofgratitude.shop → Manage
- Advanced DNS: Click tab when managing domain
- Email Forwarding: Optional email setup

### Useful Tools
- DNS Checker: https://dnschecker.org/
- Domain Tester: https://www.whatsmydns.net/
- SSL Checker: https://www.ssllabs.com/ssltest/

---

## Success Criteria

After completing all phases, verify:

### Authentication Works ✅
- [ ] Can register at /register
- [ ] Can login at /login
- [ ] Session persists after refresh
- [ ] Protected routes work
- [ ] No auth errors in console

### Domain Works ✅
- [ ] Site loads at tasteofgratitude.shop
- [ ] HTTPS works (green padlock)
- [ ] www.tasteofgratitude.shop redirects correctly
- [ ] Old vercel.app URL still works
- [ ] No mixed content warnings

### App Functions ✅
- [ ] Registration flow complete
- [ ] Login flow complete
- [ ] Products display correctly
- [ ] Cart works
- [ ] Checkout works
- [ ] Orders process
- [ ] Emails send

### Square Payments ✅ (if applicable)
- [ ] Domain added to trusted list
- [ ] Payment form loads
- [ ] Test payment succeeds
- [ ] Webhook receives events
- [ ] Orders saved correctly

---

## Troubleshooting Guide

### Domain Not Working

**"Domain shows 'Invalid Configuration'"**
```
→ Check DNS records match Vercel exactly
→ Wait 30 minutes for propagation
→ Try https://dnschecker.org/ to verify
→ Try clearing browser cache
```

**"Site shows 404"**
```
→ Verify Vercel shows domain as valid
→ Check HTTPS is working
→ Hard refresh (Ctrl+Shift+R)
→ Wait 10 minutes and try again
```

**"HTTPS not working"**
```
→ Vercel auto-generates cert
→ Takes 5-10 minutes after DNS valid
→ Refresh after waiting
→ If persists: Go to Vercel Domains → Refresh Certificate
```

### Authentication Not Working

**"Still seeing 'Login failed'"**
```
→ Check MONGODB_URI is set in Vercel
→ Check JWT_SECRET is set in Vercel
→ Check both are set for all environments
→ Verify Vercel finished redeploying
→ Wait 5 more minutes and try again
```

**"Registration always fails"**
```
→ Check MongoDB connection works
→ Check JWT_SECRET is strong (32+ chars)
→ Check no validation errors on frontend
→ Check server logs for actual error
```

---

## Rollback Plan

If something goes wrong:

### For Code
```bash
git revert 9792e84  # Rollback auth changes
git push origin main
# Vercel will automatically redeploy
```

### For Domain
```
Option 1: Remove custom domain from Vercel
  → Vercel will auto-generate new .vercel.app URL

Option 2: Revert DNS changes in Namecheap
  → Restore previous DNS records
  → Domain will point to old location
```

### For Environment Variables
```
Option 1: Remove MONGODB_URI and JWT_SECRET
  → Auth will fail (but app still loads)

Option 2: Use wrong values temporarily
  → Auth will fail (for testing)
  → Update values when ready
```

---

## Next Steps Summary

1. **Right Now** (5 min):
   - Set MONGODB_URI in Vercel
   - Set JWT_SECRET in Vercel
   - Wait for redeploy
   - Test auth works

2. **In 10 min** (10 min):
   - Add domain to Vercel
   - Add DNS records to Namecheap
   - Copy DNS records from Vercel

3. **In 20 min** (wait):
   - Wait for DNS propagation (15-30 min)
   - Check with dnschecker.org (optional)

4. **In 50 min** (5 min):
   - Verify domain works
   - Test site at custom domain
   - Check HTTPS works

5. **In 55 min** (5 min):
   - Update NEXT_PUBLIC_APP_URL if needed
   - Update Square trusted domains if needed
   - Update documentation

6. **Done!** ✅
   - Site live at tasteofgratitude.shop
   - Auth working
   - All features functional

---

## Final Verification Checklist

Before considering complete:

- [ ] Auth env vars set in Vercel
- [ ] Vercel redeployed successfully
- [ ] Can register at /register
- [ ] Can login at /login
- [ ] Domain added to Vercel
- [ ] DNS records in Namecheap
- [ ] DNS propagation complete
- [ ] Site loads at custom domain
- [ ] HTTPS working (padlock visible)
- [ ] All features working
- [ ] Square trusted domains updated
- [ ] Documentation updated
- [ ] Team notified

---

**Setup Date**: December 16, 2024  
**Estimated Duration**: 35-45 minutes  
**Difficulty**: ⭐⭐ (Mostly waiting for DNS)  
**Support**: Check docs in repository
