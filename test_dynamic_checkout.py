#!/usr/bin/env python3
"""Test Dynamic Square Checkout Integration"""

import requests
import json

BASE_URL = "http://localhost:3000"
API_BASE = f"{BASE_URL}/api"

def test_dynamic_checkout():
    print("="*70)
    print("🧪 TESTING DYNAMIC SQUARE CHECKOUT API")
    print("="*70)
    
    # Step 1: Check API availability
    print("\nStep 1: Checking Square Checkout API...")
    try:
        response = requests.get(f"{API_BASE}/square/create-checkout", timeout=10)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ API Available")
            print(f"   Configured: {data.get('configured')}")
            print(f"   Environment: {data.get('environment')}")
            print(f"   Location ID: {data.get('locationId')}")
        else:
            print(f"❌ API returned status {response.status_code}")
            return
    except Exception as e:
        print(f"❌ Error: {e}")
        return
    
    # Step 2: Create test order
    print("\nStep 2: Creating test order...")
    order_data = {
        "cart": [{
            "id": "elderberry-moss",
            "slug": "elderberry-moss",
            "name": "Elderberry Moss",
            "price": 25.00,
            "quantity": 1
        }],
        "customer": {
            "name": "Dynamic Checkout Test",
            "email": "dynamic-test@tasteofgratitude.com",
            "phone": "+14045551234"
        },
        "fulfillmentType": "pickup_market",
        "subtotal": 25.00,
        "total": 25.00,
        "source": "dynamic_checkout_test"
    }
    
    try:
        response = requests.post(
            f"{API_BASE}/orders/create",
            json=order_data,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            order_id = result['order']['id']
            print(f"✅ Order Created: {order_id}")
        else:
            print(f"❌ Order creation failed: {response.status_code}")
            return
    except Exception as e:
        print(f"❌ Error: {e}")
        return
    
    # Step 3: Create dynamic checkout session
    print("\nStep 3: Creating dynamic Square checkout session...")
    checkout_data = {
        "orderId": order_id,
        "items": [{
            "name": "Elderberry Moss",
            "price": 25.00,
            "quantity": 1,
            "description": "Sea Moss Gel"
        }],
        "customer": {
            "name": "Dynamic Checkout Test",
            "email": "dynamic-test@tasteofgratitude.com",
            "phone": "+14045551234"
        },
        "total": 25.00,
        "subtotal": 25.00
    }
    
    try:
        response = requests.post(
            f"{API_BASE}/square/create-checkout",
            json=checkout_data,
            timeout=30
        )
        
        print(f"Response status: {response.status_code}")
        print(f"Response body: {response.text[:500]}")
        
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                print(f"\n✅ SQUARE CHECKOUT SESSION CREATED!")
                print(f"   Checkout URL: {result.get('checkoutUrl')}")
                print(f"   Payment Link ID: {result.get('paymentLinkId')}")
                print(f"   Order ID: {result.get('orderId')}")
                print(f"\n🎯 Open this URL to complete test payment:")
                print(f"   {result.get('checkoutUrl')}")
                return True
            else:
                print(f"❌ Checkout creation returned success=false")
                print(f"   Response: {json.dumps(result, indent=2)}")
        else:
            print(f"❌ Checkout creation failed: {response.status_code}")
            try:
                error_data = response.json()
                print(f"   Error: {json.dumps(error_data, indent=2)}")
            except:
                print(f"   Response: {response.text}")
                
    except Exception as e:
        print(f"❌ Exception: {e}")
        import traceback
        traceback.print_exc()
    
    return False

if __name__ == "__main__":
    test_dynamic_checkout()
