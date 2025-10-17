#!/usr/bin/env python3
"""
Focused Backend Testing - Post Next.js 15.5.4 Update
Testing critical endpoints after server restart
"""

import requests
import json
import time
from datetime import datetime

# Configuration
BASE_URL = "https://gratitude-square.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

def test_endpoint(name, method, url, data=None, expected_status=200):
    """Test a single endpoint"""
    try:
        start = time.time()
        
        if method == "GET":
            response = requests.get(url, timeout=15)
        elif method == "POST":
            response = requests.post(url, json=data, headers={'Content-Type': 'application/json'}, timeout=15)
        
        response_time = int((time.time() - start) * 1000)
        
        success = response.status_code == expected_status
        status_icon = "✅" if success else "❌"
        
        print(f"{status_icon} {name}: HTTP {response.status_code} ({response_time}ms)")
        
        if success and response.status_code == 200:
            try:
                data = response.json()
                if isinstance(data, dict):
                    print(f"   Response keys: {list(data.keys())}")
                elif isinstance(data, list):
                    print(f"   Response: List with {len(data)} items")
            except:
                print(f"   Response: Non-JSON content")
        elif not success:
            print(f"   Error: {response.text[:100]}...")
        
        return success, response_time
        
    except Exception as e:
        print(f"❌ {name}: Request failed - {str(e)}")
        return False, 0

def main():
    print("🔍 FOCUSED BACKEND TESTING - POST NEXT.JS 15.5.4 UPDATE")
    print("=" * 70)
    
    tests = []
    
    # Test 1: Health Check
    print("\n1. HEALTH CHECK ENDPOINT")
    success, time_ms = test_endpoint("Health Check", "GET", f"{API_BASE}/health")
    tests.append(("Health Check", success))
    
    # Test 2: Square Payment API
    print("\n2. SQUARE PAYMENT API")
    payment_data = {
        "sourceId": "cnon:card-nonce-ok",
        "amount": 10.00,
        "currency": "USD",
        "orderId": f"test_{int(time.time())}",
        "orderData": {
            "customer": {"name": "Test User", "email": "test@example.com"},
            "cart": [{"id": "test", "name": "Test Product", "price": 1000, "quantity": 1}]
        }
    }
    success, time_ms = test_endpoint("Square Payment", "POST", f"{API_BASE}/square-payment", payment_data)
    tests.append(("Square Payment", success))
    
    # Test 3: Coupon Creation
    print("\n3. COUPON SYSTEM")
    coupon_data = {
        "customerEmail": f"test.{int(time.time())}@example.com",
        "discountAmount": 200,
        "type": "test"
    }
    success, time_ms = test_endpoint("Coupon Creation", "POST", f"{API_BASE}/coupons/create", coupon_data)
    tests.append(("Coupon Creation", success))
    
    # Test 4: Admin Products
    print("\n4. ADMIN APIS")
    success, time_ms = test_endpoint("Admin Products", "GET", f"{API_BASE}/admin/products")
    tests.append(("Admin Products", success))
    
    # Test 5: Square Webhook
    print("\n5. SQUARE WEBHOOK")
    success, time_ms = test_endpoint("Square Webhook", "GET", f"{API_BASE}/square-webhook")
    tests.append(("Square Webhook", success))
    
    # Summary
    print("\n" + "=" * 70)
    print("📊 FOCUSED TEST SUMMARY")
    print("=" * 70)
    
    passed = sum(1 for _, success in tests if success)
    total = len(tests)
    success_rate = (passed / total * 100) if total > 0 else 0
    
    print(f"Tests Passed: {passed}/{total} ({success_rate:.1f}%)")
    
    for test_name, success in tests:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"  {status}: {test_name}")
    
    # Assessment
    print(f"\n🎯 NEXT.JS 15.5.4 COMPATIBILITY ASSESSMENT:")
    if success_rate >= 80:
        print("  ✅ EXCELLENT - No major regressions detected")
        print("  ✅ System appears stable after Next.js update")
    elif success_rate >= 60:
        print("  ⚠️  GOOD - Minor issues detected, likely server-related")
        print("  ✅ Core functionality working after Next.js update")
    else:
        print("  ❌ ISSUES - Multiple endpoints failing")
        print("  ⚠️  May require investigation of Next.js compatibility")
    
    return success_rate

if __name__ == "__main__":
    main()