# 📧 Resend Domain Verification Setup

## Issue Found
Emails are not reaching inbox because the sending domain `tasteofgratitude.com` is not verified in Resend.

## Current Status
- ✅ RESEND_API_KEY: Configured
- ✅ Resend SDK: Working  
- ❌ Domain Verification: **NOT VERIFIED**

## Why Emails Aren't Sending

Without domain verification, Resend either:
1. Blocks emails completely
2. Sends from a generic domain (goes to spam)
3. Requires you to use `onboarding@resend.dev` (for testing only)

---

## SOLUTION: Verify Your Domain

### Step 1: Access Resend Dashboard
1. Go to: https://resend.com/domains
2. Log in with your Resend account

### Step 2: Add Domain
1. Click **"Add Domain"**
2. Enter: `tasteofgratitude.com`
3. Click **"Add"**

### Step 3: Get DNS Records
Resend will show you DNS records to add. Example:

```
Type: TXT
Name: _resend
Value: resend-verification-abc123xyz
TTL: 3600

Type: TXT  
Name: @
Value: v=spf1 include:_spf.resend.com ~all
TTL: 3600

Type: CNAME
Name: resend._domainkey
Value: resend._domainkey.tasteofgratitude.com
TTL: 3600
```

### Step 4: Add Records to DNS Provider
Go to your domain registrar (Namecheap, GoDaddy, Cloudflare, etc.):

1. Navigate to DNS settings for `tasteofgratitude.com`
2. Add each record exactly as shown in Resend
3. Save changes

### Step 5: Verify in Resend
1. Return to Resend dashboard
2. Click **"Verify Domain"**
3. Wait for green checkmark (may take 5-60 minutes)

---

## QUICK FIX FOR TESTING (Temporary)

While waiting for domain verification, use Resend's testing email:

### Update Environment Variable
```bash
# In .env file
RESEND_FROM_EMAIL=onboarding@resend.dev
```

Then restart server:
```bash
# Kill and restart dev server
pkill -f "next dev"
npm run dev
```

### Send Test Email
```bash
curl -X POST http://localhost:3000/api/emails/test \
  -H "Content-Type: application/json" \
  -d '{
    "templateId": "welcome",
    "recipientEmail": "silverwatkins@gmail.com",
    "testData": {"name": "Silver"}
  }'
```

**Note:** `onboarding@resend.dev` works for testing but:
- Emails may go to spam
- NOT for production use
- Limited to development/testing

---

## DNS RECORDS EXPLAINED

### SPF Record
**Purpose:** Tells email providers that Resend is authorized to send emails for your domain

```
Type: TXT
Name: @ (or your domain)
Value: v=spf1 include:_spf.resend.com ~all
```

### DKIM Record
**Purpose:** Adds digital signature to emails to prevent tampering

```
Type: CNAME
Name: resend._domainkey
Value: (provided by Resend)
```

### DMARC Record (Optional but Recommended)
**Purpose:** Tells email providers what to do with unauthenticated emails

```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:dmarc@tasteofgratitude.com
```

---

## VERIFICATION CHECKLIST

After adding DNS records:

- [ ] SPF record added and saved
- [ ] DKIM CNAME added and saved
- [ ] Wait 10-60 minutes for DNS propagation
- [ ] Check DNS propagation: https://dnschecker.org
- [ ] Click "Verify" in Resend dashboard
- [ ] Domain shows green "Verified" status
- [ ] Update RESEND_FROM_EMAIL back to `hello@tasteofgratitude.com`
- [ ] Send test email
- [ ] Email arrives in inbox (not spam)

---

## TROUBLESHOOTING

### Domain Verification Fails
**Check:**
```bash
# Verify SPF record
dig TXT tasteofgratitude.com +short | grep spf

# Verify DKIM record  
dig CNAME resend._domainkey.tasteofgratitude.com +short
```

**Common Issues:**
- DNS records not saved properly
- TTL too high (use 3600 or lower)
- Wrong record type (TXT vs CNAME)
- Typo in record value
- DNS not propagated yet (wait longer)

### Emails Still Go to Spam
**After domain verified:**
1. Warm up your domain (send gradually increasing volume)
2. Add DMARC record
3. Check spam score: https://www.mail-tester.com
4. Ensure "from" name is professional
5. Include unsubscribe link
6. Don't use spam trigger words

### Test Email Delivery
```bash
# Check if email was sent
curl http://localhost:3000/api/emails/test | jq

# Send to mail-tester
curl -X POST http://localhost:3000/api/emails/test \
  -H "Content-Type: application/json" \
  -d '{
    "templateId": "welcome",
    "recipientEmail": "YOUR-ID@mail-tester.com",
    "testData": {"name": "Test"}
  }'

# Then visit mail-tester.com to see your spam score
```

---

## PRODUCTION READINESS

Before going live:

1. ✅ Domain verified in Resend
2. ✅ SPF record active
3. ✅ DKIM record active
4. ✅ Test emails reaching inbox
5. ✅ Emails not in spam folder
6. ✅ `RESEND_FROM_EMAIL=hello@tasteofgratitude.com`
7. ✅ Professional email content
8. ✅ Unsubscribe links working

---

## ALTERNATIVE: Use Verified Email Address

If you can't verify the domain immediately:

### Option 1: Use Personal Email (Testing Only)
```bash
RESEND_FROM_EMAIL=your-verified-email@gmail.com
```

Then verify this email in Resend:
1. Resend → Settings → Email Addresses
2. Add and verify your personal email

### Option 2: Subdomain
Verify a subdomain instead:
```bash
RESEND_FROM_EMAIL=shop@mail.tasteofgratitude.com
```

In Resend, add `mail.tasteofgratitude.com` as domain.

---

## NEXT STEPS

**Immediate (to fix emails):**
1. Go to https://resend.com/domains
2. Add `tasteofgratitude.com`
3. Copy DNS records
4. Add to domain registrar
5. Wait for verification
6. Test email again

**For Production:**
- Keep domain verified
- Monitor bounce rates
- Check spam reports
- Maintain good sender reputation

---

**Last Updated:** November 25, 2025  
**Status:** Domain verification required
