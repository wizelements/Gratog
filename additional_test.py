#!/usr/bin/env python3
"""
Additional Backend Testing - Coupon Validation and Admin Analytics
"""

import requests
import json
import time

BASE_URL = "https://square-payments-2.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

def test_coupon_validation():
    """Test coupon validation endpoint"""
    print("🎫 TESTING COUPON VALIDATION")
    
    # First create a coupon
    coupon_data = {
        "customerEmail": f"validation.test.{int(time.time())}@example.com",
        "discountAmount": 500,  # $5.00
        "type": "test"
    }
    
    try:
        response = requests.post(f"{API_BASE}/coupons/create", 
                               json=coupon_data, 
                               headers={'Content-Type': 'application/json'},
                               timeout=15)
        
        if response.status_code == 200:
            data = response.json()
            coupon_code = data.get('coupon', {}).get('code')
            print(f"✅ Created test coupon: {coupon_code}")
            
            # Now validate it
            validation_data = {
                "couponCode": coupon_code,
                "customerEmail": coupon_data["customerEmail"],
                "orderTotal": 3000  # $30.00
            }
            
            response = requests.post(f"{API_BASE}/coupons/validate", 
                                   json=validation_data, 
                                   headers={'Content-Type': 'application/json'},
                                   timeout=15)
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Coupon Validation: HTTP 200")
                print(f"   Valid: {data.get('valid')}")
                print(f"   Discount: ${data.get('discount', {}).get('amount', 0)/100:.2f}")
                return True
            else:
                print(f"❌ Coupon Validation: HTTP {response.status_code}")
                return False
        else:
            print(f"❌ Coupon Creation failed: HTTP {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Coupon Validation Test failed: {str(e)}")
        return False

def test_admin_analytics():
    """Test admin coupon analytics"""
    print("\n📊 TESTING ADMIN ANALYTICS")
    
    try:
        analytics_data = {"action": "analytics"}
        
        response = requests.post(f"{API_BASE}/admin/coupons", 
                               json=analytics_data, 
                               headers={'Content-Type': 'application/json'},
                               timeout=15)
        
        if response.status_code == 200:
            data = response.json()
            analytics = data.get('analytics', {})
            
            print(f"✅ Admin Analytics: HTTP 200")
            print(f"   Total Coupons: {analytics.get('totalCoupons', 0)}")
            print(f"   Used Coupons: {analytics.get('usedCoupons', 0)}")
            print(f"   Active Coupons: {analytics.get('activeCoupons', 0)}")
            return True
        else:
            print(f"❌ Admin Analytics: HTTP {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Admin Analytics Test failed: {str(e)}")
        return False

def test_webhook_event():
    """Test webhook event processing"""
    print("\n🔗 TESTING WEBHOOK EVENT PROCESSING")
    
    try:
        webhook_event = {
            "type": "payment.completed",
            "data": {
                "object": {
                    "payment": {
                        "id": f"test_payment_{int(time.time())}",
                        "status": "COMPLETED",
                        "order_id": f"test_order_{int(time.time())}",
                        "amount_money": {
                            "amount": 2500,
                            "currency": "USD"
                        }
                    }
                }
            }
        }
        
        response = requests.post(f"{API_BASE}/square-webhook", 
                               json=webhook_event, 
                               headers={'Content-Type': 'application/json'},
                               timeout=15)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Webhook Event Processing: HTTP 200")
            print(f"   Event Type: {data.get('eventType')}")
            print(f"   Received: {data.get('received')}")
            return True
        else:
            print(f"❌ Webhook Event Processing: HTTP {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Webhook Event Test failed: {str(e)}")
        return False

def main():
    print("🔍 ADDITIONAL BACKEND TESTING")
    print("=" * 50)
    
    tests = []
    
    # Test coupon validation
    success = test_coupon_validation()
    tests.append(("Coupon Validation", success))
    
    # Test admin analytics
    success = test_admin_analytics()
    tests.append(("Admin Analytics", success))
    
    # Test webhook events
    success = test_webhook_event()
    tests.append(("Webhook Events", success))
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 ADDITIONAL TEST SUMMARY")
    print("=" * 50)
    
    passed = sum(1 for _, success in tests if success)
    total = len(tests)
    success_rate = (passed / total * 100) if total > 0 else 0
    
    print(f"Tests Passed: {passed}/{total} ({success_rate:.1f}%)")
    
    for test_name, success in tests:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"  {status}: {test_name}")

if __name__ == "__main__":
    main()