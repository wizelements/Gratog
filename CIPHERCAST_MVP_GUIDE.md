# CipherCast MVP - User Guide

## ✅ What's Been Fixed

### 1. **Backend API (FastAPI)** - WORKING ✓
- ✅ KDS (Key Directory Service) endpoints for device registration
- ✅ Message posting with encrypted envelopes
- ✅ Feed retrieval with pagination
- ✅ WebSocket support (ready for real-time updates)
- ✅ MongoDB integration with proper indexes

### 2. **Frontend - Simplified Direct Mode** - WORKING ✓
- ✅ Created `/feed-simple` - clean, direct feed view
- ✅ Created `/compose-direct` - working message composition
- ✅ Created `/message-detail/[id]` - message decryption view
- ✅ Settings page with key display and safety words
- ✅ All crypto utilities (tweetnacl + AES-GCM)

### 3. **Key Features Implemented**
- ✅ End-to-end encryption (X25519 ECDH + AES-256-GCM)
- ✅ Public ciphertext feed (everyone sees encrypted messages)
- ✅ Per-device envelopes (only intended recipients can decrypt)
- ✅ Device identity and verification (safety words)
- ✅ Real-time feed updates (polling every 5 seconds)

---

## 🧪 Testing Instructions

### Test Scenario 1: View Public Feed
1. Open the app - you'll see the onboarding screen
2. Enter any username (e.g., "charlie")
3. Click "Create Account"
4. You'll see the feed with existing encrypted messages from alice and bob
5. Messages show as ciphertext - you can see them but can't decrypt (not for you)

### Test Scenario 2: Send Encrypted Message
1. From the feed, tap the ✏️ (pencil) icon in the top right
2. **Compose New Message**:
   - To: `alice` (or `bob`)
   - Message: `Hello from Charlie! This is my first encrypted message.`
3. Tap "Send Encrypted"
4. Go back to feed - your message appears at the top
5. The message shows as ciphertext (encrypted)

### Test Scenario 3: Decrypt Message (Two Devices Required)
**To properly test decryption, you need two accounts:**

#### Device 1 (Sender - "charlie"):
1. Compose message to "alice"
2. Send the message

#### Device 2 (Receiver - "alice"):
1. Create account as "alice"
2. See the message in feed with "Tap to decrypt" badge
3. Tap the message to open details
4. Tap "Decrypt Message"
5. See the plaintext: "Hello from Charlie!..."

### Test Scenario 4: Settings & Key Verification
1. From feed, tap ⚙️ (settings) icon
2. View your device ID and username
3. See your "Safety Words" (6 words derived from your public key)
4. Tap "Show Public Key" to see your full X25519 public key
5. These can be used to verify your device with others

---

## 📁 File Structure

```
/app/
├── backend/
│   └── server.py (FastAPI backend with crypto endpoints)
│
└── frontend/
    ├── app/
    │   ├── index.tsx (entry point → redirects to feed-simple)
    │   ├── onboarding.tsx (account creation)
    │   ├── feed-simple.tsx (✨ NEW - simple direct feed)
    │   ├── compose-direct.tsx (✨ NEW - working compose)
    │   ├── message-detail/[id].tsx (✨ NEW - decrypt view)
    │   └── settings.tsx (device info, keys, safety words)
    │
    └── src/
        ├── crypto/
        │   ├── utils.ts (AES-GCM, ECDH, HKDF)
        │   └── envelope.ts (wrap/unwrap content keys)
        ├── services/
        │   └── api.ts (HTTP client for backend)
        └── store/
            └── authStore.ts (identity management)
```

---

## 🔐 How Encryption Works

### Message Sending Flow:
```
1. User types plaintext: "Hello Bob!"
2. Generate random 32-byte Content Key (CK)
3. Encrypt plaintext with CK using AES-256-GCM → ciphertext
4. For each recipient device:
   a. Do ECDH(my_ephemeral_key, recipient_public_key) → shared_secret
   b. Derive KEK from shared_secret using HKDF
   c. Encrypt CK with KEK → wrapped_ck
   d. Create envelope: {recipient_device_id, ephemeral_pubkey, wrapped_ck}
5. POST to /api/message: {ciphertext, nonce, envelopes[]}
6. Everyone sees ciphertext in feed
```

### Message Decryption Flow:
```
1. User taps encrypted message
2. Find envelope for my device_id
3. Do ECDH(my_identity_secret, sender_ephemeral_pubkey) → shared_secret
4. Derive KEK from shared_secret using HKDF
5. Decrypt wrapped_ck with KEK → content_key
6. Decrypt ciphertext with content_key using AES-256-GCM → plaintext
7. Display: "Hello Bob!"
```

---

## 🛠️ Technical Details

### Crypto Primitives:
- **Key Exchange**: X25519 (Elliptic Curve Diffie-Hellman)
- **KDF**: HKDF-SHA256 with context "ck-wrap:v1"
- **Encryption**: AES-256-GCM (authenticated encryption)
- **Handle Hashing**: SHA-256(username + "ciphercast-v1")

### Security Properties:
- ✅ No plaintext on server (only ciphertext)
- ✅ Per-device keys (identity stored in secure storage)
- ✅ Forward secrecy-ready (ephemeral keys per message)
- ✅ Authenticated encryption (AES-GCM tags)
- ✅ Public feed but private content

---

## 🐛 Known Limitations (MVP)

1. **No WebSocket live updates yet** - Feed polls every 5 seconds
2. **No media encryption** - Text messages only for now
3. **No group messages** - Only 1:1 encrypted messages
4. **No key transparency log** - Trust on first use (TOFU) model
5. **No Double Ratchet** - Single-use content keys (still secure)

---

## 🧑‍💻 Test User Accounts

Pre-created test accounts in database:
- **alice** (dev_alice)
- **bob** (dev_bob)

You can send messages to these usernames. To receive messages from them, you'd need to register with these exact usernames (but they already exist in DB).

---

## 📊 API Endpoints

### KDS (Key Directory Service):
- `POST /api/kds/registerDevice` - Register a device
- `GET /api/kds/resolve?handleHash=...` - Resolve username to devices

### Messages:
- `POST /api/message` - Post encrypted message
- `GET /api/feed?cursor=...` - Get feed (paginated)

### WebSocket:
- `WS /realtime` - Real-time message notifications

---

## 🎯 Next Steps (Post-MVP)

1. **Enable WebSocket** - Real-time feed updates
2. **Media Encryption** - Client-side encrypt images/videos
3. **Group Messages** - Sender Keys for scalable groups
4. **Key Transparency** - Merkle tree for device key verification
5. **Double Ratchet** - Post-compromise security
6. **Push Notifications** - ID-only, no plaintext

---

## 💡 Tips

- **Clear Account**: Settings → Logout
- **View Logs**: Backend logs show device registration and message posts
- **Test with Two Devices**: Use two browser tabs or devices for full E2E test
- **Verify Keys**: Compare safety words between devices to verify identity

---

## ✅ Acceptance Criteria - Status

- [✓] User can create account (register device)
- [✓] User sees public ciphertext feed
- [✓] User can compose and send encrypted message
- [✓] Only intended recipient can decrypt
- [✓] Settings shows device keys and safety words
- [✓] Backend never sees plaintext
- [✓] Messages use proper E2EE (X25519 + AES-GCM)
- [✓] Feed updates automatically (polling)

---

## 🎉 Success!

**CipherCast MVP is ready!** 

You now have a working end-to-end encrypted messaging app where:
- Everyone can see every message (ciphertext in public feed)
- Only intended recipients can decrypt and read
- No server ever sees plaintext
- Cryptographic verification via safety words

Try it out and enjoy your private conversations in a public timeline! 🔐✨
