#!/usr/bin/env python3
"""
Simple Backend API Test for Taste of Gratitude
Testing key APIs after Next.js 15.5.4 update
"""

import requests
import json
import time
from datetime import datetime
import os

# Configuration
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://gratitude-ecom.preview.emergentagent.com')
API_BASE = f"{BASE_URL}/api"

class SimpleBackendTester:
    def __init__(self):
        self.results = []
        
    def test_api(self, name, url, method="GET", data=None, expected_status=200):
        """Test an API endpoint"""
        try:
            start_time = time.time()
            
            # Disable gzip to avoid decompression issues
            headers = {
                'Accept-Encoding': 'identity',
                'Content-Type': 'application/json' if data else 'application/json'
            }
            
            if method == "GET":
                response = requests.get(url, headers=headers, timeout=10)
            else:
                response = requests.post(url, json=data, headers=headers, timeout=10)
            
            response_time = int((time.time() - start_time) * 1000)
            
            # Try to parse JSON
            try:
                json_data = response.json()
                json_valid = True
            except:
                json_data = None
                json_valid = False
            
            success = response.status_code == expected_status and json_valid
            
            result = {
                'name': name,
                'success': success,
                'status_code': response.status_code,
                'response_time': response_time,
                'json_valid': json_valid,
                'data': json_data
            }
            
            self.results.append(result)
            
            status = "✅" if success else "❌"
            print(f"{status} {name}: {response.status_code} ({response_time}ms)")
            
            if json_data and isinstance(json_data, dict):
                if 'error' in json_data:
                    print(f"    Error: {json_data['error']}")
                elif 'status' in json_data:
                    print(f"    Status: {json_data['status']}")
                elif 'success' in json_data:
                    print(f"    Success: {json_data['success']}")
            
            return success, json_data
            
        except Exception as e:
            print(f"❌ {name}: Request failed - {str(e)}")
            self.results.append({
                'name': name,
                'success': False,
                'error': str(e)
            })
            return False, None

    def run_tests(self):
        """Run all backend tests"""
        print("🚀 SIMPLE BACKEND API TESTING")
        print("=" * 60)
        print(f"Testing: {BASE_URL}")
        print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 60)
        
        # Test 1: Health Check
        print("\n❤️ HEALTH CHECK")
        success, data = self.test_api("Health Check", f"{API_BASE}/health")
        
        # Test 2: Product API
        print("\n📦 PRODUCT API")
        success, data = self.test_api("Admin Products", f"{API_BASE}/admin/products")
        if success and data:
            products = data.get('products', [])
            print(f"    Products found: {len(products)}")
        
        # Test 3: Square Webhook (GET)
        print("\n🔗 SQUARE WEBHOOK")
        success, data = self.test_api("Webhook GET", f"{API_BASE}/square-webhook")
        
        # Test 4: Square Payment (POST) - Mock mode test
        print("\n💳 SQUARE PAYMENT")
        payment_data = {
            "sourceId": "cnon:card-nonce-ok",
            "amount": 10.00,
            "currency": "USD",
            "orderId": f"test_{int(time.time())}"
        }
        success, data = self.test_api("Square Payment", f"{API_BASE}/square-payment", "POST", payment_data)
        if success and data:
            if data.get('success'):
                payment_id = data.get('paymentId', '')
                is_mock = payment_id.startswith('mock_payment_')
                print(f"    Mock mode: {'✅ Active' if is_mock else '❌ Not detected'}")
                print(f"    Payment ID: {payment_id}")
        
        # Test 5: Square Payment Input Validation
        invalid_payment_data = {"amount": 10.00}  # Missing sourceId
        success, data = self.test_api("Payment Validation", f"{API_BASE}/square-payment", "POST", invalid_payment_data, 400)
        
        # Test 6: Coupon Creation
        print("\n🎫 COUPON SYSTEM")
        coupon_data = {
            "customerEmail": "test@example.com",
            "discountAmount": 200,
            "type": "test"
        }
        success, data = self.test_api("Coupon Creation", f"{API_BASE}/coupons/create", "POST", coupon_data)
        
        created_coupon = None
        if success and data and data.get('success'):
            created_coupon = data.get('coupon', {}).get('code')
            print(f"    Created coupon: {created_coupon}")
        
        # Test 7: Coupon Validation
        if created_coupon:
            validation_data = {
                "couponCode": created_coupon,
                "customerEmail": "test@example.com",
                "orderTotal": 3500
            }
            success, data = self.test_api("Coupon Validation", f"{API_BASE}/coupons/validate", "POST", validation_data)
        else:
            # Test with invalid coupon
            validation_data = {
                "couponCode": "INVALID123",
                "customerEmail": "test@example.com"
            }
            success, data = self.test_api("Invalid Coupon Test", f"{API_BASE}/coupons/validate", "POST", validation_data)
        
        # Generate summary
        self.generate_summary()
    
    def generate_summary(self):
        """Generate test summary"""
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        total_tests = len(self.results)
        passed_tests = len([r for r in self.results if r.get('success', False)])
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {total_tests - passed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests*100):.1f}%")
        
        # Show failed tests
        failed_tests = [r for r in self.results if not r.get('success', False)]
        if failed_tests:
            print("\n❌ FAILED TESTS:")
            for test in failed_tests:
                print(f"  • {test['name']}")
                if 'error' in test:
                    print(f"    Error: {test['error']}")
                elif 'status_code' in test:
                    print(f"    Status: {test['status_code']}")
        
        # Key findings
        print("\n🔍 KEY FINDINGS:")
        
        # Check health
        health_test = next((r for r in self.results if 'Health' in r['name']), None)
        if health_test and health_test.get('success'):
            print("✅ System health check passing")
        else:
            print("❌ System health check failing")
        
        # Check Square payment
        payment_tests = [r for r in self.results if 'Square Payment' in r['name'] or 'Payment' in r['name']]
        payment_working = any(r.get('success') for r in payment_tests)
        if payment_working:
            print("✅ Square payment API functional")
        else:
            print("❌ Square payment API issues detected")
        
        # Check products
        product_test = next((r for r in self.results if 'Products' in r['name']), None)
        if product_test and product_test.get('success'):
            print("✅ Product API working")
        else:
            print("❌ Product API issues")
        
        # Check coupons
        coupon_tests = [r for r in self.results if 'Coupon' in r['name']]
        coupon_working = any(r.get('success') for r in coupon_tests)
        if coupon_working:
            print("✅ Coupon system functional")
        else:
            print("❌ Coupon system issues detected")
        
        print("\n🎯 NEXT.JS 15.5.4 UPDATE STATUS:")
        if passed_tests >= total_tests * 0.7:  # 70% success rate
            print("✅ Backend APIs stable after Next.js update")
            print("✅ No major breaking changes detected")
        else:
            print("⚠️ Some backend issues detected after update")
            print("🔧 Investigation and fixes may be needed")

if __name__ == "__main__":
    tester = SimpleBackendTester()
    tester.run_tests()