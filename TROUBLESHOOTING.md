# CipherCast Troubleshooting Guide

## Issue: Messages Not Sending

### Quick Checks:

1. **Verify Backend is Running:**
```bash
curl http://localhost:8001/api/feed
# Should return JSON with messages
```

2. **Test Message Posting Directly:**
```bash
curl -X POST http://localhost:8001/api/message \
  -H "Content-Type: application/json" \
  -d '{
    "senderDeviceId": "test_sender",
    "kind": "sealed",
    "ciphertext": "dGVzdA==",
    "nonce": "bm9uY2UxMjM=",
    "envelopes": [{
      "recipientDeviceId": "dev_alice",
      "senderEphemeralPubKey": "ZXBoZW1lcmFsUHViS2V5MTIzNDU2Nzg5MA==",
      "wrappedCk": "d3JhcHBlZENvbnRlbnRLZXk=",
      "wrappedCkIv": "aXYxMjM=",
      "wrapAlg": "X25519+HKDF+AESGCM"
    }]
  }'
# Should return: {"id":"some-uuid"}
```

3. **Check Backend Logs:**
```bash
tail -f /var/log/supervisor/backend.out.log | grep POST
```

4. **Check Frontend Console Logs:**
```bash
tail -f /var/log/supervisor/expo.out.log | grep -E "(console|LOG|===|Error)"
```

### Common Issues:

#### 1. API URL Not Set
**Symptom:** Fetch fails silently or shows network error
**Fix:** Check `/app/frontend/src/services/api.ts` line 4-5:
```typescript
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const API_URL = `${BACKEND_URL}/api`;
```

Verify `.env` has:
```
EXPO_PUBLIC_BACKEND_URL=https://your-preview-url.com
```

#### 2. Recipient Not Found
**Symptom:** "Recipient not found" alert
**Cause:** Username doesn't exist in database
**Fix:** Use pre-created usernames: `alice` or `bob`

OR create test user:
```bash
cd /app/backend && python3 << 'EOF'
from pymongo import MongoClient
import base64, hashlib
from datetime import datetime

client = MongoClient("mongodb://localhost:27017")
db = client["test_database"]

username = "testuser"
salt = "ciphercast-v1"
handle_hash = base64.b64encode(hashlib.sha256((username + salt).encode()).digest()).decode()

db.users.update_one(
    {"_id": f"user_{username}"},
    {"$setOnInsert": {
        "_id": f"user_{username}",
        "handleHash": handle_hash,
        "createdAt": datetime.utcnow()
    }},
    upsert=True
)

db.devices.update_one(
    {"_id": f"dev_{username}"},
    {"$setOnInsert": {
        "_id": f"dev_{username}",
        "userId": f"user_{username}",
        "identityPubKey": base64.b64encode(b"test_key_32_bytes_padded_here").decode(),
        "status": "active",
        "createdAt": datetime.utcnow()
    }},
    upsert=True
)

print(f"Created user: {username}")
EOF
```

#### 3. CORS Issues
**Symptom:** CORS policy error in browser console
**Fix:** Backend already has CORS enabled. If still seeing errors, check backend logs for the actual request.

#### 4. Crypto Error
**Symptom:** "Failed to encrypt" or crypto-related error
**Check:**
- Browser supports Web Crypto API
- `react-native-get-random-values` is imported
- tweetnacl and @noble/hashes are installed

#### 5. Feed Not Updating
**Symptom:** Sent message doesn't appear
**Debug:**
1. Check if message was posted:
```bash
curl http://localhost:8001/api/feed | python3 -m json.tool | head -30
```
2. Refresh feed manually (pull to refresh)
3. Check auto-refresh is working (5-second polling)

### Debug Mode:

To enable detailed logging, all console.log statements are already added. View them:

```bash
# Watch backend
tail -f /var/log/supervisor/backend.out.log

# Watch frontend (in another terminal)
tail -f /var/log/supervisor/expo.out.log | grep -v "shadow"
```

### Manual Testing:

1. **Register a Device:**
```bash
curl -X POST http://localhost:8001/api/kds/registerDevice \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_test",
    "deviceId": "dev_test",
    "handleHash": "test_hash_123",
    "identityPubKey": "dGVzdF9wdWJsaWNfa2V5XzMyX2J5dGVzX3BhZGRlZA=="
  }'
```

2. **Resolve Device:**
```bash
curl "http://localhost:8001/api/kds/resolve?handleHash=test_hash_123"
```

3. **Get Feed:**
```bash
curl http://localhost:8001/api/feed
```

### Still Not Working?

**Collect Debug Info:**
```bash
echo "=== Backend Status ==="
sudo supervisorctl status backend

echo "=== Expo Status ==="
sudo supervisorctl status expo

echo "=== Recent Backend Logs ==="
tail -50 /var/log/supervisor/backend.err.log

echo "=== Recent Expo Logs ==="
tail -50 /var/log/supervisor/expo.err.log | grep -E "(Error|error|fail)"

echo "=== Test Message Post ==="
curl -X POST http://localhost:8001/api/message \
  -H "Content-Type: application/json" \
  -d '{"senderDeviceId":"test","kind":"sealed","ciphertext":"dGVzdA==","nonce":"bm9uY2U=","envelopes":[{"recipientDeviceId":"dev_alice","senderEphemeralPubKey":"ZXBoZW1lcmFs","wrappedCk":"d3JhcA==","wrappedCkIv":"aXY=","wrapAlg":"X25519+HKDF+AESGCM"}]}'
```

### Restart Services:

If all else fails:
```bash
sudo supervisorctl restart backend expo
sleep 5
sudo supervisorctl status
```

---

## Known Working State:

- Backend: ✓ FastAPI running on :8001
- MongoDB: ✓ Connected, indexes created
- Feed: ✓ Returns messages
- KDS: ✓ Register/resolve works
- Message Post: ✓ Accepts properly formatted requests

If direct curl tests work but frontend doesn't, the issue is in the React Native app, not the backend.
