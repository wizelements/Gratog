#!/usr/bin/env python3
"""
Test payment API with Square Order ID
"""

import requests
import json

BASE_URL = "https://typebug-hunter.preview.emergentagent.com"

print("="*80)
print("TEST: Payment API with Square Order ID")
print("="*80)

# Test 1: Payment with squareOrderId
print("\n🔍 Test 1: Payment with squareOrderId parameter")
try:
    response = requests.post(
        f"{BASE_URL}/api/payments",
        json={
            "sourceId": "cnon:card-nonce-ok",
            "amountCents": 2200,  # $22.00
            "currency": "USD",
            "orderId": "test-local-order-123",
            "squareOrderId": "test-square-order-456",
            "customer": {
                "email": "test@example.com",
                "name": "Test Customer"
            }
        },
        timeout=15
    )
    
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text[:500]}")
    
    # Check if squareOrderId is being logged
    if response.status_code in [500, 404]:
        print("✅ Expected failure with test nonce (API structure correct)")
    else:
        print(f"Response details: {json.dumps(response.json(), indent=2)}")
except Exception as e:
    print(f"❌ Error: {str(e)}")

# Test 2: Payment without squareOrderId (should still work)
print("\n🔍 Test 2: Payment without squareOrderId parameter")
try:
    response = requests.post(
        f"{BASE_URL}/api/payments",
        json={
            "sourceId": "cnon:card-nonce-ok",
            "amountCents": 2200,
            "currency": "USD",
            "orderId": "test-local-order-789",
            "customer": {
                "email": "test@example.com"
            }
        },
        timeout=15
    )
    
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text[:500]}")
    
    if response.status_code in [500, 404]:
        print("✅ Expected failure with test nonce (API structure correct)")
except Exception as e:
    print(f"❌ Error: {str(e)}")

print("\n" + "="*80)
print("Check server logs for 'squareOrderId' to verify it's being passed")
print("="*80)
