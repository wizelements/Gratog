# 🔍 Troubleshooting Guide - Admin & Square Sync Issues

## Quick Diagnosis

### Check 1: Are the latest changes deployed?

Run this to see if the fix is in your latest commit:
```bash
git log --oneline -1
git diff HEAD scripts/fix-deployment-issues.js
```

**Look for:** The line should say `squareClient.catalog.listCatalog` NOT `catalogApi`

### Check 2: Environment Variables on Vercel

Go to: Vercel Dashboard → Your Project → Settings → Environment Variables

**Required variables:**
```bash
JWT_SECRET=<any random 32+ character string>
MONGODB_URI=mongodb+srv://...
SQUARE_ACCESS_TOKEN=EAAA... (starts with EAAA or sq0atp)
SQUARE_LOCATION_ID=L...
NEXT_PUBLIC_SQUARE_APPLICATION_ID=sq0idp-...
SQUARE_ENVIRONMENT=production
```

### Check 3: Test Admin Login Issue

**Symptom:** "Invalid credentials" or "Login failed"

**Possible causes:**
1. ❌ JWT_SECRET not set on Vercel
2. ❌ MONGODB_URI not set or incorrect
3. ❌ Admin user not created in database

**Test locally:**
```bash
# Check if admin user exists
node -e "
const { MongoClient } = require('mongodb');
MongoClient.connect('YOUR_MONGODB_URI')
  .then(client => {
    const db = client.db('taste_of_gratitude');
    return db.collection('admin_users').findOne({ email: 'admin@tasteofgratitude.com' });
  })
  .then(user => {
    console.log('Admin user:', user ? 'EXISTS ✅' : 'NOT FOUND ❌');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
"
```

### Check 4: Test Square Sync Issue

**Symptom:** "Cannot read properties of undefined"

**Possible causes:**
1. ❌ Latest fix not deployed (still using `catalogApi` instead of `catalog`)
2. ❌ SQUARE_ACCESS_TOKEN not set on Vercel
3. ❌ SQUARE_ACCESS_TOKEN is wrong type (client secret instead of access token)

**Test locally:**
```bash
node -e "
const { SquareClient, SquareEnvironment } = require('square');
const client = new SquareClient({
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
  environment: SquareEnvironment.Production
});

client.catalog.listCatalog(undefined, 'ITEM')
  .then(({ result }) => {
    console.log('✅ Square sync works!');
    console.log('Found', result.objects?.length || 0, 'items');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Square sync failed:', err.message);
    process.exit(1);
  });
"
```

---

## Common Issues & Solutions

### Issue 1: "JWT_SECRET is required"

**Solution:**
```bash
# On Vercel dashboard, add:
JWT_SECRET=TasteOfGratitude2025SecureJWTKey987654321RandomCharsABC123XYZ

# Or generate a random one:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Issue 2: "Cannot connect to MongoDB"

**Check:**
1. Is MONGODB_URI correct? Copy from MongoDB Atlas
2. Does it include username and password?
3. Is IP whitelist set to allow all (0.0.0.0/0) for Vercel?

**Test connection:**
```bash
node -e "
const { MongoClient } = require('mongodb');
MongoClient.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connection works'))
  .catch(err => console.error('❌ MongoDB error:', err.message));
"
```

### Issue 3: "Invalid credentials" at login

**Solutions:**

**Option A: Reset admin password**
```javascript
// Run in MongoDB shell or create a script:
const bcrypt = require('bcryptjs');
const passwordHash = await bcrypt.hash('TasteOfGratitude2025!', 10);

db.admin_users.updateOne(
  { email: 'admin@tasteofgratitude.com' },
  { 
    $set: { 
      passwordHash: passwordHash,
      updatedAt: new Date()
    }
  }
);
```

**Option B: Manually create admin user**
```javascript
// Run this in MongoDB shell:
db.admin_users.insertOne({
  email: 'admin@tasteofgratitude.com',
  name: 'Admin',
  role: 'admin',
  passwordHash: '$2a$10$YmVZxGxqxH5vFVGPJ8vq2OmVPxJ7qxqxqxqxqxqxqxqxqxqxqxqxq',
  createdAt: new Date(),
  updatedAt: new Date()
});
```

### Issue 4: "Client is not a constructor" or "catalogApi undefined"

**Solution:** Deploy the latest fix!
```bash
git add scripts/fix-deployment-issues.js
git commit -m "Fix: Square catalog sync - use .catalog for CommonJS"
git push origin main
```

The fix changes:
- `catalogApi` → `catalog`
- Uses correct `SquareClient` import

---

## Step-by-Step Debugging

### 1. Check Vercel Deployment Logs

Go to: Vercel → Your Project → Deployments → Latest → Function Logs

**Look for:**
```
✅ All required environment variables present
✅ Admin user created successfully
✅ Successfully synced X products to MongoDB
```

**If you see:**
```
❌ Missing required environment variables: JWT_SECRET
```
→ Add JWT_SECRET to Vercel env vars

```
❌ Failed to sync Square catalog: Cannot read properties...
```
→ Deploy latest fix (see above)

### 2. Check Vercel Environment Variables

```bash
# Using Vercel CLI
vercel env ls

# Should show:
# JWT_SECRET (Production)
# MONGODB_URI (Production)
# SQUARE_ACCESS_TOKEN (Production)
# etc.
```

### 3. Manual Admin User Creation

If admin login still fails after everything:

**Step 1:** Generate password hash
```bash
node -e "
const bcrypt = require('bcryptjs');
bcrypt.hash('TasteOfGratitude2025!', 10)
  .then(hash => console.log('Hash:', hash));
"
```

**Step 2:** Insert into MongoDB
```javascript
// Use MongoDB Compass or shell
db.admin_users.insertOne({
  email: 'admin@tasteofgratitude.com',
  name: 'Admin',
  role: 'admin',
  passwordHash: '<paste hash from step 1>',
  createdAt: new Date(),
  updatedAt: new Date()
});
```

**Step 3:** Test login at https://gratog.vercel.app/admin/login

---

## Quick Test Commands

### Test All Env Vars
```bash
node scripts/fix-deployment-issues.js
```

### Test Square Only
```bash
node -e "
const { SquareClient, SquareEnvironment } = require('square');
const client = new SquareClient({
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
  environment: SquareEnvironment.Production
});
console.log('Testing Square...');
client.catalog.listCatalog(undefined, 'ITEM')
  .then(r => console.log('✅ Works! Found', r.result.objects?.length, 'items'))
  .catch(e => console.error('❌ Failed:', e.message));
"
```

### Test MongoDB Only
```bash
node -e "
const { MongoClient } = require('mongodb');
MongoClient.connect(process.env.MONGODB_URI)
  .then(client => {
    console.log('✅ MongoDB connected');
    return client.db('taste_of_gratitude').collection('admin_users').findOne({});
  })
  .then(user => console.log('Admin:', user ? 'Found' : 'Not found'))
  .catch(e => console.error('❌ Failed:', e.message));
"
```

---

## Deployment Checklist

Before deploying, verify:

- [ ] Latest code committed: `git status` shows clean
- [ ] Fix deployed: Check `scripts/fix-deployment-issues.js` uses `.catalog`
- [ ] Env vars set on Vercel: JWT_SECRET, MONGODB_URI, SQUARE_*
- [ ] MongoDB allows Vercel IPs: Whitelist 0.0.0.0/0
- [ ] Square token is production: Starts with EAAA or sq0atp
- [ ] Deployment logs show success: All ✅ checkmarks

---

## Get Help

If still broken after all checks:

1. **Check Vercel logs:** Deployments → Latest → View Function Logs
2. **Check browser console:** F12 → Console tab when on the site
3. **Test API directly:** Visit https://gratog.vercel.app/api/health

**Share these for debugging:**
- Vercel deployment logs (screenshot)
- Browser console errors (screenshot)
- Environment variables list (DO NOT share values, just names)

---

**Last Updated:** 2025-01-06
