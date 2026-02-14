# Gratog PWA - Deployment Checklist

## ✅ Pre-Deployment Verification

### 1. **HTTPS Verification**
- [ ] Domain has valid SSL certificate
- [ ] All resources load over HTTPS
- [ ] No mixed content warnings

**Check:**
```bash
# Test HTTPS
curl -I https://tasteofgratitude.shop
```

### 2. **Manifest.json**
- [ ] File exists at `/public/manifest.json`
- [ ] Served with correct Content-Type: `application/manifest+json`
- [ ] Contains all required fields:
  - `name`, `short_name`
  - `start_url`
  - `display: "standalone"`
  - `icons` (at least 192x192 and 512x512)
  - `theme_color`, `background_color`

**Check:**
```bash
curl https://tasteofgratitude.shop/manifest.json | jq
```

### 3. **Service Worker**
- [ ] File exists at `/public/sw.js`
- [ ] Served with headers:
  - `Content-Type: application/javascript`
  - `Service-Worker-Allowed: /`
  - `Cache-Control: public, max-age=0, must-revalidate`
- [ ] No errors in DevTools Console

**Check:**
```bash
curl -I https://tasteofgratitude.shop/sw.js
```

### 4. **HTML Head Tags**
- [ ] Manifest link in head: `<link rel="manifest" href="/manifest.json" />`
- [ ] Theme color meta: `<meta name="theme-color" content="#1f2937" />`
- [ ] Mobile webapp meta: `<meta name="mobile-web-app-capable" content="yes" />`
- [ ] Apple meta tags for iOS
- [ ] Apple touch icon: `<link rel="apple-touch-icon" href="/apple-touch-icon.png" />`

### 5. **Icons**
- [ ] 192x192 icon available
- [ ] 512x512 icon available
- [ ] Maskable variants for Android
- [ ] All icons referenced in manifest.json
- [ ] Icons are under 100KB each

**Check:**
```bash
curl -I https://tasteofgratitude.shop/icons/icon-192x192.svg
curl -I https://tasteofgratitude.shop/icons/icon-512x512.svg
```

### 6. **API Routes (if applicable)**
- [ ] No console errors
- [ ] API responses have proper CORS headers
- [ ] Background sync endpoints working

### 7. **Security Headers**
- [ ] Strict-Transport-Security header present
- [ ] X-Content-Type-Options: nosniff
- [ ] Referrer-Policy set correctly

**Check:**
```bash
curl -I https://tasteofgratitude.shop | grep -i "strict-transport"
```

## 🚀 Deployment Steps

### 1. **Commit Changes**
```bash
git add .
git commit -m "feat: PWA deployment finalization"
git push origin main
```

### 2. **Vercel Deployment**
- [ ] Changes pushed to main branch
- [ ] Vercel auto-deploys from main
- [ ] Production build completes successfully
- [ ] No build errors or warnings

### 3. **Post-Deployment Verification**

#### Desktop (Chrome/Edge)
1. [ ] Navigate to https://tasteofgratitude.shop
2. [ ] Check DevTools → Application tab
   - [ ] Manifest loads without errors
   - [ ] Service Worker status shows "active and running"
   - [ ] Cache Storage shows service worker cache
3. [ ] Look for install prompt in address bar
4. [ ] Click install and verify app behavior
5. [ ] Run Lighthouse PWA audit (F12 → Lighthouse)

#### Android Chrome
1. [ ] Navigate to https://tasteofgratitude.shop
2. [ ] Look for install banner at bottom
3. [ ] Tap "Install"
4. [ ] App installs to home screen
5. [ ] App opens in fullscreen standalone mode
6. [ ] Test offline functionality

#### iOS Safari
1. [ ] Navigate to https://tasteofgratitude.shop
2. [ ] Tap Share button (↗️)
3. [ ] Tap "Add to Home Screen"
4. [ ] App appears on home screen
5. [ ] App opens in fullscreen
6. [ ] App icon displays correctly

## 🔍 Testing Commands

### Lighthouse PWA Audit
```bash
npm run lighthouse
# OR manually in DevTools: F12 → Lighthouse → PWA
```

### Check Service Worker Status
In browser DevTools Console:
```javascript
// Check SW status
navigator.serviceWorker.getRegistrations().then(regs => {
  regs.forEach(reg => console.log('SW:', reg.active ? 'ACTIVE' : 'INACTIVE', reg.scope));
});

// Check cached files
caches.keys().then(names => {
  console.log('Cache stores:', names);
  names.forEach(name => {
    caches.open(name).then(cache => {
      cache.keys().then(urls => {
        console.log(`${name}:`, urls.map(r => r.url));
      });
    });
  });
});
```

### Test Offline
1. DevTools → Network tab
2. Check "Offline" checkbox
3. Reload page
4. Should see offline page or cached content

### PWA Diagnostics
Add `?pwa-debug` to URL to show diagnostics panel:
```
https://tasteofgratitude.shop/?pwa-debug
```

## 📊 Expected Lighthouse Scores

Target scores for PWA audit:
- **PWA Score:** 90+
- **Performance:** 85+
- **Accessibility:** 90+
- **Best Practices:** 90+
- **SEO:** 95+

## ⚠️ Common Issues & Fixes

### Install Prompt Not Showing
**Issue:** No install dialog appears
**Causes:**
- Missing HTTPS
- Missing manifest.json
- Missing service worker
- Missing valid icons (192x192 minimum)
- Page not loaded over HTTPS

**Fix:**
1. Verify HTTPS: Check DevTools → Security tab
2. Check manifest: `curl https://tasteofgratitude.shop/manifest.json`
3. Check SW: DevTools → Application → Service Workers
4. Verify icons in manifest are accessible

### Service Worker Not Registering
**Issue:** SW shows as "unregistered" or "error"
**Causes:**
- JS errors in sw.js
- HTTPS not available
- Incorrect SW path
- Browser blocking

**Fix:**
1. Check DevTools → Console for errors
2. Verify `/public/sw.js` exists
3. Check network tab for sw.js request
4. Clear site data and reload

### Offline Not Working
**Issue:** App doesn't work without internet
**Causes:**
- Cache strategy not matching requests
- API calls not cached
- Missing offline page

**Fix:**
1. Check Cache Storage in DevTools
2. Verify offline.html is being served
3. Check SW cache strategy logs in console

### Icons Not Displaying
**Issue:** Icons don't appear on installed app
**Causes:**
- Icon files missing
- Wrong MIME types
- Incorrect manifest paths
- File format unsupported

**Fix:**
1. Verify icon files exist: `/public/icons/`
2. Check MIME types in manifest
3. Verify file URLs are correct
4. Use PNG or SVG format

## 📈 Monitoring

### After Deployment
1. **Monitor error logs:** Check for SW errors in Sentry
2. **Track installations:** Monitor app install metrics
3. **Check performance:** Run Lighthouse weekly
4. **Monitor cache:** Check cache hit rates

### Metrics to Track
- Service Worker registration success rate
- App installation rate
- Offline usage percentage
- Background sync success rate
- Update acceptance rate

## 🎯 Success Criteria

✅ **PWA is ready when:**
- [ ] Install prompt appears on first visit
- [ ] App installs successfully on Android and iOS
- [ ] App runs in standalone fullscreen mode
- [ ] App works offline (shows offline page when needed)
- [ ] Lighthouse PWA score ≥ 90
- [ ] No console errors or warnings
- [ ] All icons display correctly
- [ ] Theme colors apply correctly

## 📞 Support

### If Installation Fails:
1. Check console for errors (DevTools → Console)
2. Verify manifest.json loads: DevTools → Application → Manifest
3. Check Service Worker status: DevTools → Application → Service Workers
4. Ensure HTTPS is active

### If Offline Doesn't Work:
1. Check offline.html loads: DevTools → Network (offline mode)
2. Verify cache strategy: Check Cache Storage tab
3. Review service worker logs in console

### Testing PWA Before Launch
1. Build locally: `npm run build`
2. Start server: `npm start`
3. Test in Chrome DevTools
4. Test on actual devices (Android + iOS)

---

## ✅ Deployment Checklist Summary

```
□ HTTPS verified
□ manifest.json served correctly
□ Service worker registered
□ HTML head tags present
□ Icons 192x192 and 512x512 available
□ No security header issues
□ Lighthouse PWA score ≥90
□ Tested on Android Chrome
□ Tested on iOS Safari
□ Tested offline functionality
□ Verified app installation
□ No console errors
□ Deployment completed
```

---

**Status:** Ready for production  
**Last Updated:** February 14, 2026  
**Next Review:** After first production deployment
