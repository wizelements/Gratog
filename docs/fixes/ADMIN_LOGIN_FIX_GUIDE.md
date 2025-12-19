# Admin Login Fix Guide

## Problem
Admin login not working because **no admin user exists in the database**.

## Solution

### Option 1: For Vercel Production (Recommended)

1. **Go to the setup page:**
   ```
   https://gratog.vercel.app/admin/setup
   ```

2. **Enter setup secret:**
   - Default: `setup-admin-2025`
   - Or use your `ADMIN_SETUP_SECRET` from Vercel environment variables

3. **Click "Create Admin User"**

4. **Login at:**
   ```
   https://gratog.vercel.app/admin/login
   ```
   - Email: `admin@tasteofgratitude.com`
   - Password: (from `ADMIN_DEFAULT_PASSWORD` env var or `TasteOfGratitude2025!`)

### Option 2: For Local Development

Run this command:
```bash
node scripts/create-admin-user.js
```

Then login at http://localhost:3000/admin/login

### Option 3: Using API Directly

```bash
curl -X POST https://gratog.vercel.app/api/admin/setup \
  -H "Content-Type: application/json" \
  -d '{"secret": "setup-admin-2025"}'
```

## Environment Variables Needed

Make sure these are set in Vercel:

```env
MONGODB_URI=your_mongodb_connection_string
ADMIN_DEFAULT_EMAIL=admin@tasteofgratitude.com
ADMIN_DEFAULT_PASSWORD=TasteOfGratitude2025!
ADMIN_SETUP_SECRET=setup-admin-2025
JWT_SECRET=your_jwt_secret_here
```

## Verify Setup

Check if admin exists:
```bash
curl https://gratog.vercel.app/api/admin/setup
```

Response should show:
```json
{
  "adminExists": true,
  "adminCount": 1,
  "adminEmail": "admin@tasteofgratitude.com",
  "setupRequired": false
}
```

## Default Credentials

- **Email**: `admin@tasteofgratitude.com`
- **Password**: `TasteOfGratitude2025!` (or from env var)

## Files Created

1. `/app/scripts/create-admin-user.js` - CLI script for local setup
2. `/app/app/api/admin/setup/route.js` - API endpoint for setup
3. `/app/app/admin/setup/page.js` - Web UI for setup

## Troubleshooting

### Issue: "Invalid credentials" after setup

**Cause**: Password mismatch or wrong email format

**Solution**:
- Email must be lowercase
- Check `ADMIN_DEFAULT_PASSWORD` env var
- Re-run setup to reset password

### Issue: "Admin user already exists"

**Solution**:
- If you forgot the password, re-run setup with `setupSecret` to update it
- Or delete from MongoDB and create new:
  ```js
  db.users.deleteOne({ email: "admin@tasteofgratitude.com" })
  ```

### Issue: MongoDB connection error

**Solution**:
- Verify `MONGODB_URI` in Vercel environment variables
- Check MongoDB Atlas allows connections from Vercel IPs
- Test connection: `curl https://gratog.vercel.app/api/admin/setup`

## Security Notes

1. **Change default password** after first login
2. **Set strong ADMIN_SETUP_SECRET** in production
3. **Restrict /admin/setup** after initial setup (optional)
4. **Use strong JWT_SECRET** for token signing

## Quick Start (Vercel)

1. Visit: https://gratog.vercel.app/admin/setup
2. Enter secret: `setup-admin-2025`
3. Click "Create Admin User"
4. Login at: https://gratog.vercel.app/admin/login
5. Email: `admin@tasteofgratitude.com`
6. Password: `TasteOfGratitude2025!`

✅ You should now be able to log in!
