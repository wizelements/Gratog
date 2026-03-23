# DNS Cleanup Guide - tasteofgratitude.shop

**Status:** Conflicting DNS configuration requires manual cleanup at domain registrar

## Current Configuration Issue

### Root Domain (tasteofgratitude.shop)
✅ **Correct**
```
A record: 76.76.21.21 (Vercel)
```

### WWW Subdomain (www.tasteofgratitude.shop)
❌ **PROBLEM: Two A records**
```
A record 1: 76.76.21.93  (Vercel - CORRECT)
A record 2: 66.33.60.194 (Stray/conflicting - DELETE THIS)
```

## Impact

When DNS resolves www.tasteofgratitude.shop, it may randomly return either IP address:
- 76.76.21.93 → Routes correctly to Vercel ✅
- 66.33.60.194 → Routes to wrong server ❌ (causes "Something went wrong" error)

This DNS round-robin between two IPs causes **intermittent failures** where some requests load correctly and others fail.

## Fix Required

1. **Log in to your domain registrar:**
   - who.is / GoDaddy / Namecheap / Route53 / etc.

2. **Navigate to DNS Records**

3. **Find www.tasteofgratitude.shop A records**

4. **Delete the stray record:**
   - Remove: A record → 66.33.60.194
   - Keep: A record → 76.76.21.93

5. **Save changes**

6. **Verify propagation** (may take 5-30 minutes):
   ```bash
   # Verify www subdomain
   nslookup www.tasteofgratitude.shop
   # Should show ONLY: 76.76.21.93
   
   # Verify root domain
   nslookup tasteofgratitude.shop
   # Should show ONLY: 76.76.21.21
   ```

## DNS Best Practices

For consistency, you can also:
- Keep root domain (tasteofgratitude.shop) → 76.76.21.21
- Use CNAME for www → Point www to root domain
  ```
  www CNAME tasteofgratitude.shop
  ```

This makes it a single source of truth - when you change Vercel IPs in the future, only the root record needs updating.

## Testing After Fix

```bash
# Test root domain
curl -I https://tasteofgratitude.shop
# Should return HTTP 200

# Test www subdomain  
curl -I https://www.tasteofgratitude.shop
# Should return HTTP 200

# Test DNS resolution
nslookup tasteofgratitude.shop
nslookup www.tasteofgratitude.shop
# Both should show correct Vercel IPs only
```

---

**Note:** After DNS cleanup, the site should load consistently without "Something went wrong" errors.
