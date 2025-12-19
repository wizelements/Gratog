# Quick Fixes Implementation Guide
**Estimated Time:** 30 minutes  
**Expected Score Improvement:** +1.0 points (6.5 → 7.5)

---

## Quick Win #1: Enable Interactive Games
**Time:** 5 minutes  
**Impact:** HIGH - Enables 2 fully-implemented games

### Step 1: Edit Games Page
File: `app/explore/games/page.jsx`

**Find lines 32-60:**
```javascript
{
  id: 'memory-match',
  title: 'Memory Match',
  description: 'Match ingredient pairs to sharpen your memory and learn benefits',
  icon: Brain,
  color: 'from-blue-500 to-cyan-600',
  route: '/explore/games/memory-match',
  difficulty: 'Easy',
  coming: true  // ← REMOVE THIS LINE
},
{
  id: 'ingredient-quiz',
  title: 'Ingredient Quiz',
  description: 'Test your knowledge of health benefits and ingredients',
  icon: Star,
  color: 'from-purple-500 to-pink-600',
  route: '/explore/games/ingredient-quiz',
  difficulty: 'Medium',
  coming: true  // ← REMOVE THIS LINE
},
```

**Step 2: Remove `coming: true` from both games**
```javascript
// BEFORE (line 39)
coming: true

// AFTER
// Just delete this line entirely
```

**Step 3: Verify Games Button is Active**
The button will now show "Play Now" instead of "Coming Soon"

**Step 4: Test Locally**
```bash
npm run dev
# Visit http://localhost:3000/explore/games
# Click "Play Now" on Memory Match and Ingredient Quiz
```

---

## Quick Win #2: Fix Learning Center 404
**Time:** 5 minutes  
**Impact:** MEDIUM - Restores broken educational page

### Check 1: Verify Page Exists
```bash
ls -la app/explore/learn/page.jsx
# Should show the file exists
```

### Check 2: Check for TypeScript Errors
```bash
npm run typecheck
# Look for errors in app/explore/learn/page.jsx
```

### Check 3: Verify Export Statement
File: `app/explore/learn/page.jsx`

**Should have valid export:**
```javascript
export default function LearnPage() {
  return (
    // Page content
  );
}
```

### Check 4: Test Locally
```bash
npm run dev
# Visit http://localhost:3000/explore/learn
# Should load successfully
```

### Check 5: Full Build Test
```bash
npm run build
npm run start
# Visit http://localhost:3000/explore/learn
# If still 404, check build logs
```

---

## Quick Win #3: Verify Domain Configuration
**Time:** 10 minutes  
**Impact:** CRITICAL - Fixes SSL and 502 errors

### Step 1: Check Vercel Configuration
File: `vercel.json`

**Should have redirects:**
```json
{
  "redirects": [
    {
      "source": "/:path*",
      "has": [{ "type": "host", "value": "gratog.vercel.app" }],
      "destination": "https://tasteofgratitude.shop/:path*",
      "permanent": true
    }
  ]
}
```

### Step 2: Verify Sitemap Config
File: `next-sitemap.config.js`

**Should use custom domain:**
```javascript
module.exports = {
  siteUrl: 'https://tasteofgratitude.shop',  // ← Must be custom domain
  changefreq: 'daily',
  priority: 0.7,
  generateRobotsTxt: true,
  // ... rest of config
};
```

### Step 3: Check DNS Settings
**For your domain registrar (GoDaddy, Namecheap, etc.):**

Required DNS records:
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com

OR

Type: A
Name: @
Value: 76.76.19.194 (Vercel's IP)
```

### Step 4: Test Domain
```bash
# Check SSL certificate
openssl s_client -connect tasteofgratitude.shop:443

# Check DNS resolution
nslookup tasteofgratitude.shop
dig tasteofgratitude.shop
```

### Step 5: Rebuild and Deploy
```bash
npm run build
npm run start
# Then deploy to Vercel via git push
```

---

## Quick Win #4: Verify Sitemap Generation
**Time:** 5 minutes  
**Impact:** MEDIUM - Fixes SEO and search indexing

### Step 1: Build with Sitemap Generation
```bash
npm run build
# Post-build hook runs: next-sitemap
```

### Step 2: Verify Sitemaps Created
```bash
ls -la public/sitemap*.xml
ls -la public/robots.txt

# Should see:
# -rw-r--r-- ... public/robots.txt
# -rw-r--r-- ... public/sitemap.xml
# -rw-r--r-- ... public/sitemap-0.xml (if large)
```

### Step 3: Check Sitemap Content
```bash
cat public/sitemap.xml | head -20
# Should have entries like:
# <?xml version="1.0" encoding="UTF-8"?>
# <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
#   <url>
#     <loc>https://tasteofgratitude.shop/explore/games</loc>
```

### Step 4: Check robots.txt
```bash
cat public/robots.txt
# Should have entries like:
# User-agent: *
# Allow: /
# Sitemap: https://tasteofgratitude.shop/sitemap.xml
```

### Step 5: Test URLs
```bash
# Test sitemap accessibility
curl -I https://tasteofgratitude.shop/sitemap.xml
# Should return 200 OK

curl -I https://tasteofgratitude.shop/robots.txt
# Should return 200 OK
```

---

## Quick Win #5: Create Authenticated User Wishlist API
**Time:** 20 minutes  
**Impact:** HIGH - Fixes core feature for logged-in users

### Step 1: Create Wishlist API Endpoints
File: `app/api/user/wishlist/route.js`

```javascript
import { verifyAuth } from '@/lib/auth/middleware';
import { getDB } from '@/lib/db-client';

// GET /api/user/wishlist
export async function GET(req) {
  try {
    const userId = await verifyAuth(req);
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDB();
    const wishlist = await db.collection('wishlists').findOne({ userId });
    
    return Response.json({
      items: wishlist?.items || [],
      count: wishlist?.items?.length || 0
    });
  } catch (error) {
    console.error('Wishlist GET error:', error);
    return Response.json({ error: 'Failed to fetch wishlist' }, { status: 500 });
  }
}

// POST /api/user/wishlist
export async function POST(req) {
  try {
    const userId = await verifyAuth(req);
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { productId } = await req.json();
    const db = await getDB();

    await db.collection('wishlists').updateOne(
      { userId },
      { 
        $addToSet: { items: productId },
        $set: { updatedAt: new Date() }
      },
      { upsert: true }
    );

    return Response.json({ success: true, message: 'Added to wishlist' });
  } catch (error) {
    console.error('Wishlist POST error:', error);
    return Response.json({ error: 'Failed to add to wishlist' }, { status: 500 });
  }
}

// DELETE /api/user/wishlist
export async function DELETE(req) {
  try {
    const userId = await verifyAuth(req);
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { productId } = await req.json();
    const db = await getDB();

    await db.collection('wishlists').updateOne(
      { userId },
      { 
        $pull: { items: productId },
        $set: { updatedAt: new Date() }
      }
    );

    return Response.json({ success: true, message: 'Removed from wishlist' });
  } catch (error) {
    console.error('Wishlist DELETE error:', error);
    return Response.json({ error: 'Failed to remove from wishlist' }, { status: 500 });
  }
}
```

### Step 2: Update Wishlist Store
File: `stores/wishlist.ts`

Add sync with API for authenticated users:

```typescript
// Add this function to the store
import { useAuthContext } from '@/contexts/AuthContext';

const useWishlistStore = create((set, get) => ({
  // ... existing code ...
  
  // Sync with API for authenticated users
  syncWithServer: async () => {
    try {
      const user = useAuthContext().user;
      if (!user) return; // Only sync for authenticated users

      const response = await fetch('/api/user/wishlist');
      if (response.ok) {
        const data = await response.json();
        set(state => ({
          ...state,
          items: data.items
        }));
      }
    } catch (error) {
      console.error('Failed to sync wishlist:', error);
    }
  },

  addItem: (productId: string) => {
    set(state => {
      const user = useAuthContext().user;
      const newItems = [...state.items, productId];

      // For authenticated users, sync with API
      if (user) {
        fetch('/api/user/wishlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId })
        });
      } else {
        // For guests, use localStorage
        localStorage.setItem('wishlist_v1', JSON.stringify(newItems));
      }

      window.dispatchEvent(new CustomEvent('wishlistUpdate'));
      return { items: newItems };
    });
  },

  removeItem: (productId: string) => {
    set(state => {
      const user = useAuthContext().user;
      const newItems = state.items.filter(id => id !== productId);

      // For authenticated users, sync with API
      if (user) {
        fetch('/api/user/wishlist', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId })
        });
      } else {
        // For guests, use localStorage
        localStorage.setItem('wishlist_v1', JSON.stringify(newItems));
      }

      window.dispatchEvent(new CustomEvent('wishlistUpdate'));
      return { items: newItems };
    });
  }
}));
```

### Step 3: Test API Endpoints
```bash
# After creating the route file, test:
npm run dev

# 1. Test GET (fetch wishlist)
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/user/wishlist

# 2. Test POST (add to wishlist)
curl -X POST http://localhost:3000/api/user/wishlist \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"productId":"507f1f77bcf86cd799439011"}'

# 3. Test DELETE (remove from wishlist)
curl -X DELETE http://localhost:3000/api/user/wishlist \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"productId":"507f1f77bcf86cd799439011"}'
```

---

## Verification Checklist

After implementing quick fixes, verify:

### Games
- [ ] Visit `/explore/games`
- [ ] Memory Match shows "Play Now" button (not "Coming Soon")
- [ ] Ingredient Quiz shows "Play Now" button (not "Coming Soon")
- [ ] Click "Play Now" - games load successfully
- [ ] Play a few rounds - scoring works

### Learning Center
- [ ] Visit `/explore/learn`
- [ ] Page loads (no 404 error)
- [ ] Content displays correctly

### Sitemaps
- [ ] Visit `/sitemap.xml` - loads successfully
- [ ] Visit `/robots.txt` - loads successfully
- [ ] Check sitemap has entries from tasteofgratitude.shop

### Domain
- [ ] Visit https://tasteofgratitude.shop - loads without 502
- [ ] Visit https://gratog.vercel.app - redirects to tasteofgratitude.shop
- [ ] SSL certificate is valid (browser shows lock icon)

### Wishlist (Authenticated)
- [ ] Sign in to account
- [ ] Add item to wishlist
- [ ] Wishlist persists after page refresh
- [ ] Wishlist persists after sign out / sign in

---

## Deployment

After quick fixes:

```bash
# 1. Test locally
npm run dev
# Visit http://localhost:3000 and test all fixed features

# 2. Run build
npm run build
# Check for TypeScript errors

# 3. Run full test suite
npm run verify:full

# 4. Commit changes
git add .
git commit -m "Quick fixes: Enable games, fix 404 pages, add wishlist API"

# 5. Push to Vercel
git push origin main
# Vercel will automatically build and deploy

# 6. Monitor deployment
# Check Vercel dashboard for build status
# Test production URLs after deploy
```

---

## Expected Results

After completing all 5 quick wins:

| Issue | Before | After | Status |
|-------|--------|-------|--------|
| Games disabled | 404 | Playable | ✓ Fixed |
| Learning Center 404 | 404 | Loads | ✓ Fixed |
| Wishlist for Auth Users | Broken | Works | ✓ Fixed |
| SSL/Domain | 502 errors | Stable | ✓ Fixed |
| Sitemaps 404 | 404 | Accessible | ✓ Fixed |

**Time Investment:** ~30 minutes  
**Score Improvement:** 6.5/10 → 7.5/10 (+1.0 point)  
**User Impact:** HIGH - Enables 3 major features

---

## Support & Debugging

If you encounter issues:

### Build Errors
```bash
npm run typecheck  # Check TypeScript errors
npm run lint      # Check code style
npm run build     # Full build with errors
```

### Runtime Errors
```bash
npm run dev
# Check browser console (F12 → Console tab)
# Look for red error messages
# Check Network tab for failed API calls
```

### Deployment Issues
```bash
# Check Vercel logs
vercel logs

# Check environment variables
vercel env pull

# Re-deploy
vercel --prod
```

---

**Estimated Completion:** 30 minutes  
**Difficulty:** Easy  
**Risk Level:** Low  

✅ **Ready to proceed?** Start with Quick Win #1!
