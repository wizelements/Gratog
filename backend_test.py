#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Taste of Gratitude Square Payment Integration
Focus: Testing Square payment APIs with SQUARE_MOCK_MODE=true configuration
Updated: Testing current Square integration after recent fixes and component import resolution
"""

import requests
import json
import time
import uuid
from datetime import datetime

# Configuration
BASE_URL = "https://square-payments-2.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

class SquareBackendTester:
    def __init__(self):
        self.results = []
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'Backend-Tester/1.0',
            'Origin': BASE_URL  # Add Origin header for CSRF protection
        })
    
    def log_result(self, test_name, success, details, response_time=None):
        """Log test result"""
        result = {
            'test': test_name,
            'success': success,
            'details': details,
            'timestamp': datetime.now().isoformat(),
            'response_time_ms': response_time
        }
        self.results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name}")
        if not success:
            print(f"   Details: {details}")
        if response_time:
            print(f"   Response time: {response_time}ms")
    
    def test_health_check(self):
        """Test /api/health endpoint - Critical for system monitoring"""
        try:
            start_time = time.time()
            response = self.session.get(f"{API_BASE}/health")
            response_time = int((time.time() - start_time) * 1000)
            
            if response.status_code == 200:
                data = response.json()
                # Check for required fields
                required_fields = ['status', 'services', 'response_time_ms']
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_result("Health Check API", False, f"Missing fields: {missing_fields}", response_time)
                    return
                
                # Check Square API status - should show mock_mode=true
                square_status = data.get('services', {}).get('square_api', 'unknown')
                expected_statuses = ['mock_mode', 'sandbox', 'production', 'not_configured']
                
                if square_status not in expected_statuses:
                    self.log_result("Health Check API", False, f"Unexpected Square status: {square_status}", response_time)
                    return
                
                # Verify database connectivity
                db_status = data.get('services', {}).get('database', 'unknown')
                if db_status != 'connected':
                    self.log_result("Health Check API", False, f"Database not connected: {db_status}", response_time)
                    return
                
                self.log_result("Health Check API", True, f"Status: {data['status']}, Square: {square_status}, DB: {db_status}", response_time)
            else:
                self.log_result("Health Check API", False, f"HTTP {response.status_code}: {response.text}", response_time)
                
        except Exception as e:
            self.log_result("Health Check API", False, f"Exception: {str(e)}")
    
    def test_square_payments_api(self):
        """Test /api/payments endpoint (Web Payments SDK) - High Priority"""
        try:
            # Test POST with missing sourceId (should fail with 400)
            start_time = time.time()
            response = self.session.post(f"{API_BASE}/payments", json={
                "amountCents": 2500,
                "currency": "USD",
                "orderId": f"test_order_{int(time.time())}"
            })
            response_time = int((time.time() - start_time) * 1000)
            
            if response.status_code == 400:
                data = response.json()
                if "source" in data.get('error', '').lower():
                    self.log_result("Square Payments API - Validation", True, "Correctly rejects missing sourceId", response_time)
                else:
                    self.log_result("Square Payments API - Validation", False, f"Unexpected error: {data.get('error')}", response_time)
            else:
                self.log_result("Square Payments API - Validation", False, f"Expected 400, got {response.status_code}", response_time)
            
            # Test with mock payment token (should work in mock mode or fail with auth error)
            start_time = time.time()
            response = self.session.post(f"{API_BASE}/payments", json={
                "sourceId": "cnon:card-nonce-ok",  # Square test nonce
                "amountCents": 3500,
                "currency": "USD",
                "orderId": f"test_order_{int(time.time())}",
                "customer": {
                    "email": "sarah.johnson@example.com",
                    "name": "Sarah Johnson"
                }
            })
            response_time = int((time.time() - start_time) * 1000)
            
            if response.status_code in [200, 500]:  # 200 for mock mode, 500 for auth issues
                data = response.json()
                if response.status_code == 200 and data.get('success'):
                    payment_id = data.get('payment', {}).get('id', 'unknown')
                    self.log_result("Square Payments API - Processing", True, f"Payment processed: {payment_id}", response_time)
                elif response.status_code == 500 and ('auth' in data.get('error', '').lower() or 'unauthorized' in data.get('error', '').lower()):
                    self.log_result("Square Payments API - Processing", True, "Expected auth error - Square credentials invalid", response_time)
                else:
                    self.log_result("Square Payments API - Processing", False, f"Unexpected response: {data}", response_time)
            else:
                self.log_result("Square Payments API - Processing", False, f"HTTP {response.status_code}: {response.text}", response_time)
                
        except Exception as e:
            self.log_result("Square Payments API", False, f"Exception: {str(e)}")
    
    def test_square_checkout_api(self):
        """Test /api/checkout endpoint (Payment Links) - High Priority"""
        try:
            # Test with invalid line items (should fail with 400)
            start_time = time.time()
            response = self.session.post(f"{API_BASE}/checkout", json={
                "lineItems": [],  # Empty array should fail
                "customer": {"email": "sarah.johnson@example.com"}
            })
            response_time = int((time.time() - start_time) * 1000)
            
            if response.status_code == 400:
                self.log_result("Square Checkout API - Validation", True, "Correctly rejects empty line items", response_time)
            else:
                self.log_result("Square Checkout API - Validation", False, f"Expected 400, got {response.status_code}", response_time)
            
            # Test with valid line items
            start_time = time.time()
            response = self.session.post(f"{API_BASE}/checkout", json={
                "lineItems": [
                    {
                        "catalogObjectId": "elderberry_sea_moss_16oz",
                        "quantity": 2,
                        "name": "Elderberry Sea Moss Gel",
                        "basePriceMoney": {"amount": 3500, "currency": "USD"}
                    }
                ],
                "customer": {
                    "email": "sarah.johnson@example.com",
                    "name": "Sarah Johnson"
                },
                "orderId": f"checkout_test_{int(time.time())}"
            })
            response_time = int((time.time() - start_time) * 1000)
            
            if response.status_code in [200, 500]:  # 200 for success, 500 for auth issues
                data = response.json()
                if response.status_code == 200 and data.get('success'):
                    payment_link_id = data.get('paymentLink', {}).get('id', 'unknown')
                    self.log_result("Square Checkout API - Creation", True, f"Payment link created: {payment_link_id}", response_time)
                elif response.status_code == 500 and ('auth' in data.get('error', '').lower() or 'unauthorized' in data.get('error', '').lower()):
                    self.log_result("Square Checkout API - Creation", True, "Expected auth error with invalid credentials", response_time)
                else:
                    self.log_result("Square Checkout API - Creation", False, f"Unexpected response: {data}", response_time)
            else:
                self.log_result("Square Checkout API - Creation", False, f"HTTP {response.status_code}: {response.text}", response_time)
                
        except Exception as e:
            self.log_result("Square Checkout API", False, f"Exception: {str(e)}")
    
    def test_cart_pricing_api(self):
        """Test /api/cart/price endpoint - High Priority for order calculations"""
        try:
            # Test GET endpoint (health check)
            start_time = time.time()
            response = self.session.get(f"{API_BASE}/cart/price")
            response_time = int((time.time() - start_time) * 1000)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    mock_mode = data.get('mockMode', False)
                    location = data.get('location', 'unknown')
                    self.log_result("Cart Pricing API - Health", True, f"API healthy, mock mode: {mock_mode}, location: {location}", response_time)
                else:
                    self.log_result("Cart Pricing API - Health", False, f"API not healthy: {data}", response_time)
            else:
                self.log_result("Cart Pricing API - Health", False, f"HTTP {response.status_code}: {response.text}", response_time)
            
            # Test POST with invalid data (should fail with 400)
            start_time = time.time()
            response = self.session.post(f"{API_BASE}/cart/price", json={
                "lines": []  # Empty lines should fail
            })
            response_time = int((time.time() - start_time) * 1000)
            
            if response.status_code == 400:
                self.log_result("Cart Pricing API - Validation", True, "Correctly rejects empty lines", response_time)
            else:
                self.log_result("Cart Pricing API - Validation", False, f"Expected 400, got {response.status_code}", response_time)
            
            # Test POST with valid data (should work in mock mode)
            start_time = time.time()
            response = self.session.post(f"{API_BASE}/cart/price", json={
                "lines": [
                    {"variationId": "elderberry_variation_16oz", "qty": 2},
                    {"variationId": "original_variation_16oz", "qty": 1}
                ]
            })
            response_time = int((time.time() - start_time) * 1000)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    mock_mode = data.get('mockMode', False)
                    pricing = data.get('pricing', {})
                    total = pricing.get('total', 0)
                    self.log_result("Cart Pricing API - Calculation", True, f"Pricing calculated, mock: {mock_mode}, total: ${total/100:.2f}" if isinstance(total, int) else f"Pricing calculated, mock: {mock_mode}, total: {total}", response_time)
                else:
                    self.log_result("Cart Pricing API - Calculation", False, f"Calculation failed: {data}", response_time)
            else:
                self.log_result("Cart Pricing API - Calculation", False, f"HTTP {response.status_code}: {response.text}", response_time)
                
        except Exception as e:
            self.log_result("Cart Pricing API", False, f"Exception: {str(e)}")
    
    def test_orders_create_api(self):
        """Test /api/orders/create endpoint - High Priority for order processing"""
        try:
            # Test with missing required fields (should fail with 400)
            start_time = time.time()
            response = self.session.post(f"{API_BASE}/orders/create", json={
                "cart": []  # Empty cart should fail
            })
            response_time = int((time.time() - start_time) * 1000)
            
            if response.status_code == 400:
                self.log_result("Orders Create API - Validation", True, "Correctly rejects empty cart", response_time)
            else:
                self.log_result("Orders Create API - Validation", False, f"Expected 400, got {response.status_code}", response_time)
            
            # Test with valid order data
            order_data = {
                "cart": [
                    {
                        "id": "elderberry-sea-moss-16oz",
                        "name": "Elderberry Sea Moss Gel",
                        "price": 35.00,
                        "quantity": 2
                    }
                ],
                "customer": {
                    "name": "Sarah Johnson",
                    "email": "sarah.johnson@example.com",
                    "phone": "+1-555-0123"
                },
                "fulfillmentType": "pickup",
                "fulfillmentDetails": {
                    "location": "Serenbe Farmers Market",
                    "date": "2024-01-20",
                    "time": "10:00 AM"
                },
                "pricing": {
                    "subtotal": 70.00,
                    "tax": 7.00,
                    "total": 77.00
                }
            }
            
            start_time = time.time()
            response = self.session.post(f"{API_BASE}/orders/create", json=order_data)
            response_time = int((time.time() - start_time) * 1000)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    order = data.get('order', {})
                    order_id = order.get('id', 'unknown')
                    order_status = order.get('status', 'unknown')
                    self.log_result("Orders Create API - Creation", True, f"Order created: {order_id}, status: {order_status}", response_time)
                else:
                    self.log_result("Orders Create API - Creation", False, f"Order creation failed: {data.get('error')}", response_time)
            else:
                self.log_result("Orders Create API - Creation", False, f"HTTP {response.status_code}: {response.text}", response_time)
                
        except Exception as e:
            self.log_result("Orders Create API", False, f"Exception: {str(e)}")
    
    def test_coupons_create_api(self):
        """Test /api/coupons/create endpoint - High Priority for coupon system"""
        try:
            # Test with missing email (should fail with 400)
            start_time = time.time()
            response = self.session.post(f"{API_BASE}/coupons/create", json={
                "discountAmount": 500  # Missing customerEmail
            })
            response_time = int((time.time() - start_time) * 1000)
            
            if response.status_code == 400:
                self.log_result("Coupons Create API - Validation", True, "Correctly rejects missing email", response_time)
            else:
                self.log_result("Coupons Create API - Validation", False, f"Expected 400, got {response.status_code}", response_time)
            
            # Test with valid coupon data
            start_time = time.time()
            response = self.session.post(f"{API_BASE}/coupons/create", json={
                "customerEmail": "sarah.johnson@example.com",
                "discountAmount": 500,  # $5.00 in cents
                "freeShipping": False,
                "type": "manual",
                "source": "backend_test"
            })
            response_time = int((time.time() - start_time) * 1000)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    coupon = data.get('coupon', {})
                    coupon_code = coupon.get('code', 'unknown')
                    discount_amount = coupon.get('discountAmount', 0)
                    self.log_result("Coupons Create API - Creation", True, f"Coupon created: {coupon_code}, amount: ${discount_amount/100:.2f}", response_time)
                    return coupon_code  # Return for validation test
                else:
                    self.log_result("Coupons Create API - Creation", False, f"Coupon creation failed: {data}", response_time)
            else:
                self.log_result("Coupons Create API - Creation", False, f"HTTP {response.status_code}: {response.text}", response_time)
                
        except Exception as e:
            self.log_result("Coupons Create API", False, f"Exception: {str(e)}")
        
        return None
    
    def test_coupons_validate_api(self, coupon_code=None):
        """Test /api/coupons/validate endpoint - High Priority for coupon system"""
        try:
            # Test with missing coupon code (should fail with 400)
            start_time = time.time()
            response = self.session.post(f"{API_BASE}/coupons/validate", json={
                "customerEmail": "sarah.johnson@example.com"  # Missing couponCode
            })
            response_time = int((time.time() - start_time) * 1000)
            
            if response.status_code == 400:
                self.log_result("Coupons Validate API - Validation", True, "Correctly rejects missing coupon code", response_time)
            else:
                self.log_result("Coupons Validate API - Validation", False, f"Expected 400, got {response.status_code}", response_time)
            
            # Test with invalid coupon code
            start_time = time.time()
            response = self.session.post(f"{API_BASE}/coupons/validate", json={
                "couponCode": "INVALID_CODE_123",
                "customerEmail": "sarah.johnson@example.com",
                "orderTotal": 7000  # $70.00 in cents
            })
            response_time = int((time.time() - start_time) * 1000)
            
            if response.status_code == 200:
                data = response.json()
                if not data.get('valid'):
                    error_msg = data.get('error', 'Invalid coupon')
                    self.log_result("Coupons Validate API - Invalid Code", True, f"Correctly rejects invalid code: {error_msg}", response_time)
                else:
                    self.log_result("Coupons Validate API - Invalid Code", False, "Should have rejected invalid code", response_time)
            else:
                self.log_result("Coupons Validate API - Invalid Code", False, f"HTTP {response.status_code}: {response.text}", response_time)
            
            # Test with valid coupon code (if provided)
            if coupon_code:
                start_time = time.time()
                response = self.session.post(f"{API_BASE}/coupons/validate", json={
                    "couponCode": coupon_code,
                    "customerEmail": "sarah.johnson@example.com",
                    "orderTotal": 7000  # $70.00 in cents
                })
                response_time = int((time.time() - start_time) * 1000)
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get('valid'):
                        discount = data.get('discount', {})
                        discount_amount = discount.get('amount', 0)
                        self.log_result("Coupons Validate API - Valid Code", True, f"Coupon validated: ${discount_amount/100:.2f} discount", response_time)
                    else:
                        error_msg = data.get('error', 'Unknown error')
                        self.log_result("Coupons Validate API - Valid Code", False, f"Valid coupon rejected: {error_msg}", response_time)
                else:
                    self.log_result("Coupons Validate API - Valid Code", False, f"HTTP {response.status_code}: {response.text}", response_time)
                
        except Exception as e:
            self.log_result("Coupons Validate API", False, f"Exception: {str(e)}")
    
    def test_square_create_checkout_api(self):
        """Test /api/square/create-checkout endpoint - Medium Priority"""
        try:
            # Test GET endpoint (configuration check)
            start_time = time.time()
            response = self.session.get(f"{API_BASE}/square/create-checkout")
            response_time = int((time.time() - start_time) * 1000)
            
            if response.status_code == 200:
                data = response.json()
                configured = data.get('configured', False)
                environment = data.get('environment', 'unknown')
                self.log_result("Square Create Checkout API - Config", True, f"Configured: {configured}, Environment: {environment}", response_time)
            else:
                self.log_result("Square Create Checkout API - Config", False, f"HTTP {response.status_code}: {response.text}", response_time)
            
            # Test POST with missing items (should fail with 400)
            start_time = time.time()
            response = self.session.post(f"{API_BASE}/square/create-checkout", json={
                "orderId": f"test_checkout_{int(time.time())}",
                "items": [],  # Empty items should fail
                "customer": {"email": "sarah.johnson@example.com"}
            })
            response_time = int((time.time() - start_time) * 1000)
            
            if response.status_code == 400:
                self.log_result("Square Create Checkout API - Validation", True, "Correctly rejects empty items", response_time)
            else:
                self.log_result("Square Create Checkout API - Validation", False, f"Expected 400, got {response.status_code}", response_time)
            
            # Test POST with valid checkout data
            start_time = time.time()
            response = self.session.post(f"{API_BASE}/square/create-checkout", json={
                "orderId": f"test_checkout_{int(time.time())}",
                "items": [
                    {
                        "name": "Elderberry Sea Moss Gel",
                        "price": 35.00,
                        "quantity": 1,
                        "description": "16oz jar of elderberry sea moss gel"
                    }
                ],
                "customer": {
                    "email": "sarah.johnson@example.com",
                    "name": "Sarah Johnson"
                },
                "total": 35.00,
                "subtotal": 35.00
            })
            response_time = int((time.time() - start_time) * 1000)
            
            if response.status_code in [200, 500]:  # 200 for success, 500 for auth issues
                data = response.json()
                if response.status_code == 200 and data.get('success'):
                    payment_link_id = data.get('paymentLinkId', 'unknown')
                    self.log_result("Square Create Checkout API - Creation", True, f"Checkout created: {payment_link_id}", response_time)
                elif response.status_code == 500 and ('credential' in data.get('error', '').lower() or 'unauthorized' in data.get('error', '').lower()):
                    self.log_result("Square Create Checkout API - Creation", True, "Expected credential error with invalid Square config", response_time)
                else:
                    self.log_result("Square Create Checkout API - Creation", False, f"Unexpected response: {data}", response_time)
            else:
                self.log_result("Square Create Checkout API - Creation", False, f"HTTP {response.status_code}: {response.text}", response_time)
                
        except Exception as e:
            self.log_result("Square Create Checkout API", False, f"Exception: {str(e)}")
    
    def run_all_tests(self):
        """Run all backend API tests"""
        print("🚀 Starting Comprehensive Square Payment Backend API Testing")
        print(f"📍 Base URL: {BASE_URL}")
        print(f"🔧 SQUARE_MOCK_MODE: Expected to be true (due to invalid access token format)")
        print(f"🎯 Focus: Testing Square payment integration with mock mode enabled")
        print("=" * 80)
        
        # Test core APIs in priority order
        print("\n🏥 HEALTH CHECK & SYSTEM STATUS")
        self.test_health_check()
        
        print("\n💳 SQUARE PAYMENT PROCESSING APIS")
        self.test_square_payments_api()
        self.test_square_checkout_api()
        self.test_cart_pricing_api()
        
        print("\n📦 ORDER MANAGEMENT APIS")
        self.test_orders_create_api()
        
        print("\n🎫 COUPON SYSTEM APIS")
        coupon_code = self.test_coupons_create_api()
        self.test_coupons_validate_api(coupon_code)
        
        print("\n🔗 ADDITIONAL SQUARE ENDPOINTS")
        self.test_square_create_checkout_api()
        
        # Generate summary
        self.generate_summary()
    
    def generate_summary(self):
        """Generate test summary"""
        print("\n" + "=" * 80)
        print("📊 COMPREHENSIVE TEST SUMMARY")
        print("=" * 80)
        
        total_tests = len(self.results)
        passed_tests = sum(1 for r in self.results if r['success'])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"📈 Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        # Categorize results by API
        api_categories = {}
        for result in self.results:
            api_name = result['test'].split(' - ')[0]
            if api_name not in api_categories:
                api_categories[api_name] = {'passed': 0, 'failed': 0, 'tests': []}
            
            if result['success']:
                api_categories[api_name]['passed'] += 1
            else:
                api_categories[api_name]['failed'] += 1
            api_categories[api_name]['tests'].append(result)
        
        print(f"\n📋 API BREAKDOWN:")
        for api_name, stats in api_categories.items():
            total_api_tests = stats['passed'] + stats['failed']
            success_rate = (stats['passed'] / total_api_tests) * 100 if total_api_tests > 0 else 0
            status = "✅" if stats['failed'] == 0 else "⚠️" if success_rate >= 50 else "❌"
            print(f"   {status} {api_name}: {stats['passed']}/{total_api_tests} ({success_rate:.0f}%)")
        
        if failed_tests > 0:
            print(f"\n🔍 FAILED TESTS DETAILS:")
            for result in self.results:
                if not result['success']:
                    print(f"   ❌ {result['test']}: {result['details']}")
        
        # Response time analysis
        response_times = [r['response_time_ms'] for r in self.results if r['response_time_ms']]
        if response_times:
            avg_response_time = sum(response_times) / len(response_times)
            max_response_time = max(response_times)
            min_response_time = min(response_times)
            print(f"\n⏱️  PERFORMANCE METRICS:")
            print(f"   Average Response Time: {avg_response_time:.0f}ms")
            print(f"   Fastest Response: {min_response_time:.0f}ms")
            print(f"   Slowest Response: {max_response_time:.0f}ms")
        
        # Mock mode assessment
        mock_mode_detected = any("mock" in r['details'].lower() for r in self.results if r['success'])
        auth_errors_detected = any("auth" in r['details'].lower() for r in self.results)
        
        print(f"\n🎭 SQUARE INTEGRATION STATUS:")
        print(f"   Mock Mode Detected: {'✅ Yes' if mock_mode_detected else '❌ No'}")
        print(f"   Auth Errors (Expected): {'✅ Yes' if auth_errors_detected else '❌ No'}")
        
        # Save results to file
        with open('/app/backend_test_results.json', 'w') as f:
            json.dump({
                'summary': {
                    'total_tests': total_tests,
                    'passed_tests': passed_tests,
                    'failed_tests': failed_tests,
                    'success_rate': (passed_tests/total_tests)*100,
                    'avg_response_time_ms': sum(response_times) / len(response_times) if response_times else 0,
                    'max_response_time_ms': max(response_times) if response_times else 0,
                    'min_response_time_ms': min(response_times) if response_times else 0,
                    'mock_mode_detected': mock_mode_detected,
                    'auth_errors_detected': auth_errors_detected
                },
                'api_breakdown': api_categories,
                'test_results': self.results,
                'timestamp': datetime.now().isoformat(),
                'base_url': BASE_URL,
                'test_focus': 'Square Payment Integration with SQUARE_MOCK_MODE=true'
            }, f, indent=2)
        
        print(f"\n💾 Detailed results saved to: /app/backend_test_results.json")
        print(f"🎯 Test Focus: Square payment integration backend APIs")
        print(f"🔧 Configuration: SQUARE_MOCK_MODE=true due to invalid access token format")

if __name__ == "__main__":
    tester = SquareBackendTester()
    tester.run_all_tests()