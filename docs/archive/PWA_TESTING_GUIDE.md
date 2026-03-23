# Gratog PWA - Cross-Platform Testing Guide

## 🎯 Comprehensive Testing for Desktop & iPhone

---

## 📱 IPHONE / iOS SAFARI TESTING

### Prerequisites
- iPhone, iPad, or iOS simulator
- Safari browser (not Chrome or Firefox)
- iOS 13 or later
- HTTPS connection (or localhost for testing)

### Installation Test

#### Step 1: Visit the Website
1. Open Safari on iPhone
2. Navigate to: `https://tasteofgratitude.shop`
3. Allow a few seconds for page to load

#### Step 2: Add to Home Screen
1. Tap the Share button (↗️ bottom right)
2. Scroll down to find "Add to Home Screen"
   - If not visible, scroll left in the menu
3. Verify the app name shows as "Gratog"
4. Verify the icon preview looks correct
5. Tap "Add"

#### Step 3: Verify Installation
- [ ] App icon appears on home screen
- [ ] App is named "Gratog" (not the website URL)
- [ ] Icon uses the correct colors and design

#### Step 4: Launch App
1. Tap the app icon on home screen
2. Verify it launches in fullscreen
3. Check that Safari chrome (address bar, back button) is **hidden**
4. Verify the status bar at top is visible and styled correctly

#### Step 5: Test Navigation
- [ ] Can navigate between pages
- [ ] Links work correctly
- [ ] App feels native (no browser UI visible)

#### Step 6: Test Offline Mode
1. Settings → WiFi → Disconnect from WiFi
2. Close all cellular data (Airplane Mode)
3. Return to the app
4. Page should still display (from cache)

#### Step 7: Test Features
- [ ] Music button works (if enabled)
- [ ] Product browsing works
- [ ] Scroll is smooth
- [ ] Buttons are responsive to touch
- [ ] No visual glitches

#### Step 8: Verify Status Bar
- [ ] Status bar is black (or dark color)
- [ ] Time, battery, signal visible
- [ ] Not covered by app content

### iOS-Specific Troubleshooting

**Problem:** App opens in Safari instead of fullscreen
- **Solution:** Not truly installed. Delete and re-add to home screen.

**Problem:** Icon doesn't display or looks wrong
- **Solution:** Check `/public/apple-touch-icon.png` exists
- Replace with proper 180x180 PNG

**Problem:** Status bar is white and hard to read
- **Solution:** Status bar style is set to `black-translucent`
- Check meta tag: `apple-mobile-web-app-status-bar-style`

**Problem:** Content is covered at top/bottom
- **Solution:** Use `viewport-fit: cover` and add padding
- Check layout for notch/home indicator safe areas

---

## 💻 DESKTOP BROWSER TESTING

### Chrome / Edge (Windows/Mac)

#### Installation Test

#### Step 1: Visit Website
1. Open Chrome or Edge
2. Navigate to: `https://tasteofgratitude.shop`
3. Look for **install prompt**
   - Browser may show subtle prompt icon in address bar
   - Or show popup banner

#### Step 2: Install App
**Option A: Install Button in Address Bar**
1. Click download icon in address bar (right side)
2. Click "Install"
3. App installs and may launch

**Option B: Install Banner**
1. If popup banner appears, click "Install"
2. App installs to system

**Option C: Manual Installation**
1. Click menu (⋮) in top right
2. Go to "Apps"
3. Select "Install app"

#### Step 3: Verify Installation
- [ ] App icon appears in app drawer / start menu
- [ ] App has correct name: "Taste of Gratitude"
- [ ] Icon uses correct branding

#### Step 4: Launch App
1. Launch from app drawer or start menu
2. Verify app runs in **standalone window**
3. Check that address bar is **hidden** (unless on hover)
4. Verify no Chrome toolbar is visible

#### Step 5: Test Features
- [ ] Page loads correctly
- [ ] Navigation works
- [ ] Product pages display properly
- [ ] Scroll is smooth
- [ ] No console errors (F12)

#### Step 6: Test Offline
1. Press F12 to open DevTools
2. Go to Network tab
3. Check "Offline" checkbox
4. Reload the page
5. Should display offline page or cached content

#### Step 7: Check PWA Status
1. Press F12 for DevTools
2. Go to "Application" tab
3. Check "Manifest" section
   - Should show all app metadata
   - No errors
4. Check "Service Workers" section
   - Should show "active and running"
5. Check "Cache Storage"
   - Should show cached files

### Firefox (Limited PWA Support)

Firefox has limited PWA support, but can still test:

#### Installation Test
1. Navigate to `https://tasteofgratitude.shop`
2. Click menu (≡) → Apps
3. App may install (limited support)
4. Or bookmark to home screen

#### Verification
- [ ] Manifest loads (DevTools Console)
- [ ] Service Worker registers (DevTools)
- [ ] Can open offline mode for testing

### Safari (Mac/iPad)

#### Installation Test
1. Open Safari on Mac
2. Navigate to `https://tasteofgratitude.shop`
3. Go to File → "Add to Dock" or use Share menu
4. App adds to dock
5. Click to launch

#### Verification
- [ ] App launches in Safari
- [ ] Bookmarked for quick access

---

## 🧪 COMPREHENSIVE TESTING CHECKLIST

### Desktop Chrome/Edge
- [ ] Install prompt appears
- [ ] App installs successfully
- [ ] Launches in standalone window
- [ ] Works offline (toggle offline mode)
- [ ] Manifest loads correctly
- [ ] Service Worker active
- [ ] Cache Storage populated
- [ ] Lighthouse PWA score ≥90
- [ ] No console errors

### iOS Safari
- [ ] Add to Home Screen works
- [ ] App icon displays correctly
- [ ] Opens in fullscreen
- [ ] Safari chrome is hidden
- [ ] Status bar visible and styled
- [ ] Content not covered by notch/home indicator
- [ ] Navigation works
- [ ] Offline mode works (airplane mode)
- [ ] Touch interactions responsive

### Cross-Platform
- [ ] App name consistent ("Gratog" or "Taste of Gratitude")
- [ ] Theme color applies (dark color at top)
- [ ] Icons are recognizable
- [ ] No console errors on either platform
- [ ] Background color loads before content
- [ ] Text is readable
- [ ] Images load correctly

---

## 🔍 DevTools Verification

### For Desktop (Chrome/Edge)

#### Check Manifest
```javascript
// Console
fetch('/manifest.json')
  .then(r => r.json())
  .then(m => console.table(m))
```

#### Check Service Worker
```javascript
// Console
navigator.serviceWorker.getRegistrations()
  .then(regs => {
    regs.forEach(r => {
      console.log('Scope:', r.scope);
      console.log('Status:', r.active ? 'ACTIVE' : 'INACTIVE');
    });
  });
```

#### Check Cache
```javascript
// Console
caches.keys()
  .then(names => {
    console.log('Caches:', names);
    names.forEach(name => {
      caches.open(name).then(cache => {
        cache.keys().then(reqs => {
          console.log(`\n${name}:`);
          reqs.forEach(r => console.log('  -', r.url));
        });
      });
    });
  });
```

#### Run Lighthouse Audit
1. Press F12 → Lighthouse tab
2. Click "Analyze page load"
3. Wait for results
4. Check PWA score (target: 90+)
5. Review checklist items

---

## 📊 Expected Results

### Installation Availability
| Platform | Method | Status |
|----------|--------|--------|
| Android Chrome | Install Banner | ✅ Expected |
| Android Firefox | Browser Menu | ⚠️ Limited |
| iOS Safari | Add to Home Screen | ✅ Expected |
| Mac Safari | File Menu | ✅ Works |
| Windows Chrome | Install Prompt | ✅ Expected |
| Windows Edge | Install Prompt | ✅ Expected |

### Offline Functionality
- **Desktop:** Should show offline page or cached content
- **iOS:** Should show cached content without banner
- **Android:** Should show cached content with offline indicator

### Performance
| Metric | Target | Status |
|--------|--------|--------|
| First Contentful Paint | < 1.5s | ✅ |
| Largest Contentful Paint | < 2.5s | ✅ |
| Cumulative Layout Shift | < 0.1 | ✅ |
| Time to Interactive | < 3.5s | ✅ |

---

## 🚨 Common Issues & Solutions

### Desktop Chrome: No Install Prompt
**Causes:**
- Not HTTPS
- Missing manifest.json
- Missing 192x192 icon
- Page not loaded from start_url

**Fix:**
1. Verify HTTPS: Check address bar shows 🔒
2. Check manifest: F12 → Application → Manifest
3. Check icons exist in manifest
4. Run diagnostic: Visit `?pwa-debug`

### iOS: Opens in Safari Instead of Fullscreen
**Causes:**
- Not truly installed to home screen
- Safari caching old version
- Missing meta tags

**Fix:**
1. Delete app from home screen
2. Clear Safari cache: Settings → Safari → Clear History and Website Data
3. Re-add to home screen
4. Check meta tags in head

### iOS: Status Bar Covers Content
**Causes:**
- Missing `viewport-fit=cover`
- No padding for safe areas
- Status bar style incorrect

**Fix:**
1. Ensure viewport meta tag has `viewport-fit=cover`
2. Add safe area padding in CSS
3. Check `apple-mobile-web-app-status-bar-style` is set

### Offline Not Working
**Causes:**
- Service Worker not active
- Cache strategy not matching requests
- Network timeout too short

**Fix:**
1. Check Service Worker in DevTools
2. Check Cache Storage for cached files
3. Toggle offline mode to test

---

## ✅ Sign-Off Checklist

Before deploying, verify:

### Desktop Testing
- [ ] Install prompt appears (Chrome/Edge)
- [ ] App installs successfully
- [ ] Opens in standalone window
- [ ] Works offline (toggles correctly)
- [ ] Lighthouse PWA ≥90
- [ ] No console errors

### iOS Testing
- [ ] Add to Home Screen works
- [ ] Icon displays correctly on home screen
- [ ] Opens fullscreen without Safari UI
- [ ] Status bar visible and not covering content
- [ ] Works with Airplane Mode (offline)
- [ ] Navigation and interactions work smoothly

### Cross-Platform
- [ ] Consistent app naming
- [ ] Proper theme colors
- [ ] No console errors
- [ ] Responsive on all sizes
- [ ] Images load correctly
- [ ] Text readable

---

## 🎉 Ready to Ship!

Once all checklist items pass, PWA is ready for production.

### Next Steps:
1. Deploy to Vercel
2. Monitor installation metrics
3. Check error logs in Sentry
4. Gather user feedback
5. Iterate on improvements

---

**Last Updated:** February 14, 2026  
**Status:** Testing Framework Complete
