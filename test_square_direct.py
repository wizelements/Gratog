#!/usr/bin/env python3
"""
Direct Square API Testing - Investigate TRANSACTION_LIMIT error
"""

import requests
import json
import time

SQUARE_ACCESS_TOKEN = "EAAAl4KvAdZXvBekxwhUUfXc0siQpVE4BlD3-Ykw7T1xzJtR793ft5T0FgoTcjqw"
SQUARE_LOCATION_ID = "L66TVG6867BG9"

print("="*80)
print("DIRECT SQUARE API INVESTIGATION - TRANSACTION_LIMIT ERROR")
print("="*80)

# Test 1: Check account limits
print("\n🔍 Test 1: Retrieve Location Details")
try:
    response = requests.get(
        f"https://connect.squareup.com/v2/locations/{SQUARE_LOCATION_ID}",
        headers={
            "Authorization": f"Bearer {SQUARE_ACCESS_TOKEN}",
            "Square-Version": "2025-10-16",
            "Content-Type": "application/json"
        },
        timeout=10
    )
    
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
except Exception as e:
    print(f"Error: {str(e)}")

# Test 2: Try a minimal payment with different amounts
print("\n🔍 Test 2: Test Payment with $1.00")
try:
    payment_payload = {
        "source_id": "cnon:card-nonce-ok",
        "idempotency_key": f"test_1dollar_{int(time.time())}",
        "amount_money": {
            "amount": 100,  # $1.00
            "currency": "USD"
        },
        "location_id": SQUARE_LOCATION_ID
    }
    
    response = requests.post(
        "https://connect.squareup.com/v2/payments",
        headers={
            "Authorization": f"Bearer {SQUARE_ACCESS_TOKEN}",
            "Square-Version": "2025-10-16",
            "Content-Type": "application/json"
        },
        json=payment_payload,
        timeout=10
    )
    
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
except Exception as e:
    print(f"Error: {str(e)}")

# Test 3: Check if there's a minimum amount issue
print("\n🔍 Test 3: Test Payment with $10.00")
try:
    payment_payload = {
        "source_id": "cnon:card-nonce-ok",
        "idempotency_key": f"test_10dollar_{int(time.time())}",
        "amount_money": {
            "amount": 1000,  # $10.00
            "currency": "USD"
        },
        "location_id": SQUARE_LOCATION_ID
    }
    
    response = requests.post(
        "https://connect.squareup.com/v2/payments",
        headers={
            "Authorization": f"Bearer {SQUARE_ACCESS_TOKEN}",
            "Square-Version": "2025-10-16",
            "Content-Type": "application/json"
        },
        json=payment_payload,
        timeout=10
    )
    
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
except Exception as e:
    print(f"Error: {str(e)}")

# Test 4: Check merchant account status
print("\n🔍 Test 4: List Merchants")
try:
    response = requests.get(
        "https://connect.squareup.com/v2/merchants",
        headers={
            "Authorization": f"Bearer {SQUARE_ACCESS_TOKEN}",
            "Square-Version": "2025-10-16",
            "Content-Type": "application/json"
        },
        timeout=10
    )
    
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        merchants = response.json().get("merchant", [])
        print(f"Merchant data: {json.dumps(merchants, indent=2)}")
    else:
        print(f"Response: {json.dumps(response.json(), indent=2)}")
except Exception as e:
    print(f"Error: {str(e)}")

print("\n" + "="*80)
print("INVESTIGATION COMPLETE")
print("="*80)
