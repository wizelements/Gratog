# Square Setup & Configuration

## Quick Start

1. **Get Square Credentials**
   - Visit: https://developer.squareup.com/apps
   - Select your application
   - Copy credentials from Production tab

2. **Set Environment Variables**
   ```env
   SQUARE_ENVIRONMENT=production
   SQUARE_ACCESS_TOKEN=your_production_access_token
   SQUARE_APPLICATION_ID=your_app_id
   SQUARE_LOCATION_ID=your_location_id
   SQUARE_WEBHOOK_SIGNATURE_KEY=your_webhook_key
   ```

3. **Deploy & Test**
   ```bash
   npm run build
   npm run dev
   
   # Test connectivity
   curl http://localhost:3000/api/square/test-rest
   ```

## Token Types

| Token Format | Type | Environment | Use |
|---|---|---|---|
| `EAAA...` | Personal Access Token | Production | ✅ Use this |
| `sq0atp-...` | OAuth Token | Production | ✅ Use this |
| `sq0csp-...` | Client Secret | — | ❌ Don't use |
| `sandbox-...` | Sandbox Token | Sandbox | Dev only |

## Environment Variables Reference

```env
# Required for payments
SQUARE_ENVIRONMENT=production          # 'production' or 'sandbox'
SQUARE_ACCESS_TOKEN=sq0atp_...        # Production access token
SQUARE_APPLICATION_ID=sq0idp_...      # From Dashboard
SQUARE_LOCATION_ID=LVEAZQ5D9F6BD      # Your location ID
SQUARE_WEBHOOK_SIGNATURE_KEY=whvk_... # For webhook verification

# Optional (for Web Payments SDK)
NEXT_PUBLIC_SQUARE_APPLICATION_ID=sq0idp_... # Client-side app ID
```

## Find Your Credentials

### Location ID
1. Go to https://developer.squareup.com/apps
2. Select app → Locations tab
3. Copy the Location ID

### Application ID
1. Go to Credentials tab
2. Copy the Application ID (starts with `sq0idp-`)

### Access Token
1. Go to Credentials tab
2. Under "Production" section
3. Copy the access token (starts with `EAAA` or `sq0atp-`)

### Webhook Key
1. Go to Webhooks tab
2. Select your endpoint
3. Copy the signature key

## Verify Setup

```bash
# Test that configuration is valid
curl http://localhost:3000/api/square/diagnose

# Should output detailed diagnosis of:
# - Configuration validity
# - Token format
# - API connectivity
# - Location verification
```

## Testing Payments

### Sandbox Testing
Switch to sandbox environment to test without charges:

```env
SQUARE_ENVIRONMENT=sandbox
SQUARE_ACCESS_TOKEN=sandbox_your_token
```

Use test card: `4111 1111 1111 1111`

### Production Testing
In production, use real payment cards.

Test with small amounts ($0.01) to verify setup.

## Troubleshooting

### "UNAUTHORIZED" Error
- Check token is production access token (not sandbox)
- Verify environment matches token type
- Ensure token hasn't expired

### "INVALID_LOCATION" Error
- Verify location ID exists in Square account
- Check location is in correct environment
- Run `/api/square/diagnose` to list available locations

### "CARD_DECLINED" Error
- Use test card in sandbox
- Verify card details with customer
- Check for sufficient funds

### Payment Link Not Generating
- Verify catalog items exist in Square
- Check line item IDs are correct
- Ensure location is set up for payments

## Webhooks

To receive real-time payment notifications:

1. Go to https://developer.squareup.com/apps
2. Select app → Webhooks
3. Add endpoint: `https://your-domain.com/api/webhooks/square`
4. Select events: `payment.created`, `payment.updated`
5. Copy signature key to `SQUARE_WEBHOOK_SIGNATURE_KEY`

Webhooks are verified automatically.

## Next Steps

- See [SQUARE_INTEGRATION.md](./SQUARE_INTEGRATION.md) for detailed API docs
- See [/lib/square-direct.ts](/lib/square-direct.ts) for available operations
- See [/app/api/payments/route.ts](/app/api/payments/route.ts) for payment flow example
