# ⚡ QUICK START - 5 MINUTE DEPLOY

## 🚀 Copy-Paste Deployment

```bash
# 1. Install & clean (2 min)
npm install
rm -f app/api/orders/create/route.js.{OLD,broken}
rm -f "app/(admin)/admin/catalog/page.js.unused"

# 2. Test build (2 min)
npm run build

# 3. Deploy (1 min)
git add . && git commit -m "Launch" && git push
```

## 🔑 Required Env Vars (Vercel)

```bash
MONGO_URL=mongodb+srv://...
SQUARE_ACCESS_TOKEN=EAAA...
SQUARE_LOCATION_ID=L...
SQUARE_APPLICATION_ID=sq0idp-...
NEXT_PUBLIC_SQUARE_APPLICATION_ID=sq0idp-...
RESEND_API_KEY=re_...
JWT_SECRET=$(openssl rand -base64 32)
ADMIN_JWT_SECRET=$(openssl rand -base64 32)
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
```

## ✅ 30 Second Test

After deploy, visit:
1. Homepage: `https://yourdomain.com` ✅
2. Catalog: `https://yourdomain.com/catalog` ✅
3. Add item to cart ✅
4. Start checkout ✅

## 🆘 If Broken

```bash
# Rollback
vercel rollback

# Check logs
vercel logs --follow
```

## 📚 Full Docs

- `SHIP_TONIGHT_SUMMARY.md` - Complete overview
- `PRE_LAUNCH_CHECKLIST.md` - Detailed steps
- `UNFINISHED_IMPLEMENTATIONS.md` - Known issues

**Status:** 🟢 READY TO SHIP
