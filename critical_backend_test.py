#!/usr/bin/env python3
"""
Critical Backend API Testing for Production Readiness
Focus on essential backend functionality that must work for production deployment
"""

import requests
import time
import json
from datetime import datetime

# Configuration
BASE_URL = "https://cart-rescue-1.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

class CriticalBackendTest:
    def __init__(self):
        self.results = []
        self.start_time = datetime.now()
        
    def log_result(self, test_name, status, details, response_time=None):
        """Log test result with timestamp and details"""
        result = {
            'test': test_name,
            'status': status,
            'details': details,
            'timestamp': datetime.now().isoformat(),
            'response_time_ms': response_time
        }
        self.results.append(result)
        
        status_icon = "✅" if status == "PASS" else "❌" if status == "FAIL" else "⚠️"
        print(f"{status_icon} {test_name}: {details}")
        if response_time:
            print(f"   Response Time: {response_time}ms")

    def test_health_endpoint(self):
        """Test system health monitoring"""
        print("\n🏥 HEALTH CHECK ENDPOINT")
        
        try:
            start_time = time.time()
            response = requests.get(f"{API_BASE}/health", timeout=10)
            response_time = int((time.time() - start_time) * 1000)
            
            if response.status_code == 200:
                data = response.json()
                if 'status' in data and 'services' in data:
                    self.log_result("Health Endpoint", "PASS", 
                                  f"System healthy: {data.get('status')}", response_time)
                    return True
                else:
                    self.log_result("Health Endpoint", "FAIL", 
                                  "Missing required health data fields", response_time)
                    return False
            else:
                self.log_result("Health Endpoint", "FAIL", 
                              f"Health check failed with status {response.status_code}", response_time)
                return False
                
        except Exception as e:
            self.log_result("Health Endpoint", "FAIL", f"Health check error: {str(e)}")
            return False

    def test_stripe_checkout(self):
        """Test Stripe checkout functionality"""
        print("\n💳 STRIPE CHECKOUT API")
        
        try:
            start_time = time.time()
            response = requests.post(f"{API_BASE}/checkout", 
                                   json={
                                       "items": [{"id": "elderberry-sea-moss-16oz", "quantity": 1}],
                                       "customer": {"email": "production.test@example.com"}
                                   },
                                   headers={'Content-Type': 'application/json'},
                                   timeout=15)
            response_time = int((time.time() - start_time) * 1000)
            
            if response.status_code == 200:
                data = response.json()
                if 'url' in data and 'session_id' in data:
                    self.log_result("Stripe Checkout", "PASS", 
                                  f"Checkout session created: {data.get('session_id')[:20]}...", response_time)
                    return True
                else:
                    self.log_result("Stripe Checkout", "FAIL", 
                                  f"Invalid checkout response format", response_time)
                    return False
            else:
                self.log_result("Stripe Checkout", "FAIL", 
                              f"Checkout failed with status {response.status_code}", response_time)
                return False
                
        except Exception as e:
            self.log_result("Stripe Checkout", "FAIL", f"Checkout error: {str(e)}")
            return False

    def test_coupon_system(self):
        """Test coupon creation and validation"""
        print("\n🎫 COUPON SYSTEM")
        
        # Test coupon creation
        try:
            start_time = time.time()
            create_response = requests.post(f"{API_BASE}/coupons/create", 
                                          json={
                                              "email": "production.test@example.com",
                                              "type": "manual",
                                              "discountAmount": 5.00
                                          },
                                          headers={'Content-Type': 'application/json'},
                                          timeout=10)
            create_time = int((time.time() - start_time) * 1000)
            
            if create_response.status_code == 200:
                coupon_data = create_response.json()
                coupon_code = coupon_data.get('couponCode')
                
                self.log_result("Coupon Creation", "PASS", 
                              f"Coupon created: {coupon_code}", create_time)
                
                # Test coupon validation
                start_time = time.time()
                validate_response = requests.post(f"{API_BASE}/coupons/validate", 
                                                json={
                                                    "couponCode": coupon_code,
                                                    "customerEmail": "production.test@example.com"
                                                },
                                                headers={'Content-Type': 'application/json'},
                                                timeout=10)
                validate_time = int((time.time() - start_time) * 1000)
                
                if validate_response.status_code == 200:
                    self.log_result("Coupon Validation", "PASS", 
                                  f"Coupon validated successfully", validate_time)
                    return True
                else:
                    self.log_result("Coupon Validation", "FAIL", 
                                  f"Coupon validation failed: {validate_response.status_code}", validate_time)
                    return False
            else:
                self.log_result("Coupon Creation", "FAIL", 
                              f"Coupon creation failed: {create_response.status_code}", create_time)
                return False
                
        except Exception as e:
            self.log_result("Coupon System", "FAIL", f"Coupon system error: {str(e)}")
            return False

    def test_square_payment_mock(self):
        """Test Square payment in mock mode"""
        print("\n🟦 SQUARE PAYMENT (MOCK MODE)")
        
        try:
            start_time = time.time()
            response = requests.post(f"{API_BASE}/square-payment", 
                                   json={
                                       "sourceId": "cnon:card-nonce-ok",
                                       "amount": 3500,
                                       "currency": "USD",
                                       "customer": {
                                           "email": "production.test@example.com",
                                           "firstName": "Production",
                                           "lastName": "Test"
                                       },
                                       "order": {
                                           "items": [{"name": "Test Product", "price": 35.00, "quantity": 1}]
                                       }
                                   },
                                   headers={'Content-Type': 'application/json'},
                                   timeout=15)
            response_time = int((time.time() - start_time) * 1000)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success') and 'paymentId' in data:
                    payment_id = data.get('paymentId')
                    if payment_id.startswith('mock_payment_'):
                        self.log_result("Square Payment Mock", "PASS", 
                                      f"Mock payment successful: {payment_id}", response_time)
                        return True
                    else:
                        self.log_result("Square Payment Mock", "WARN", 
                                      f"Payment processed but not in mock mode: {payment_id}", response_time)
                        return True
                else:
                    self.log_result("Square Payment Mock", "FAIL", 
                                  f"Invalid payment response format", response_time)
                    return False
            else:
                self.log_result("Square Payment Mock", "FAIL", 
                              f"Payment failed with status {response.status_code}", response_time)
                return False
                
        except Exception as e:
            self.log_result("Square Payment Mock", "FAIL", f"Payment error: {str(e)}")
            return False

    def test_admin_apis(self):
        """Test admin dashboard APIs"""
        print("\n👨‍💼 ADMIN DASHBOARD APIs")
        
        try:
            start_time = time.time()
            response = requests.get(f"{API_BASE}/admin/coupons", timeout=10)
            response_time = int((time.time() - start_time) * 1000)
            
            if response.status_code == 200:
                data = response.json()
                if 'coupons' in data:
                    coupon_count = len(data['coupons'])
                    self.log_result("Admin Coupon API", "PASS", 
                                  f"Admin API accessible, {coupon_count} coupons found", response_time)
                    return True
                else:
                    self.log_result("Admin Coupon API", "FAIL", 
                                  "Invalid admin API response format", response_time)
                    return False
            else:
                self.log_result("Admin Coupon API", "FAIL", 
                              f"Admin API failed with status {response.status_code}", response_time)
                return False
                
        except Exception as e:
            self.log_result("Admin Coupon API", "FAIL", f"Admin API error: {str(e)}")
            return False

    def test_input_validation(self):
        """Test critical input validation"""
        print("\n🛡️ INPUT VALIDATION")
        
        # Test missing required fields
        try:
            start_time = time.time()
            response = requests.post(f"{API_BASE}/square-payment", 
                                   json={},  # Empty payload
                                   headers={'Content-Type': 'application/json'},
                                   timeout=10)
            response_time = int((time.time() - start_time) * 1000)
            
            if response.status_code == 400:
                self.log_result("Input Validation", "PASS", 
                              "Missing required fields properly rejected", response_time)
                return True
            else:
                self.log_result("Input Validation", "FAIL", 
                              f"Missing fields validation failed: {response.status_code}", response_time)
                return False
                
        except Exception as e:
            self.log_result("Input Validation", "FAIL", f"Validation test error: {str(e)}")
            return False

    def generate_critical_report(self):
        """Generate critical backend readiness report"""
        print("\n" + "="*80)
        print("🎯 CRITICAL BACKEND PRODUCTION READINESS REPORT")
        print("="*80)
        
        total_tests = len(self.results)
        passed_tests = sum(1 for test in self.results if test['status'] == 'PASS')
        failed_tests = sum(1 for test in self.results if test['status'] == 'FAIL')
        warned_tests = sum(1 for test in self.results if test['status'] == 'WARN')
        
        print(f"\n📊 CRITICAL BACKEND RESULTS:")
        print(f"   Total Critical Tests: {total_tests}")
        print(f"   ✅ Passed: {passed_tests} ({passed_tests/total_tests*100:.1f}%)")
        print(f"   ❌ Failed: {failed_tests} ({failed_tests/total_tests*100:.1f}%)")
        print(f"   ⚠️  Warnings: {warned_tests} ({warned_tests/total_tests*100:.1f}%)")
        
        # Show failed tests
        failed_tests_list = [test for test in self.results if test['status'] == 'FAIL']
        if failed_tests_list:
            print(f"\n❌ CRITICAL FAILURES:")
            for test in failed_tests_list:
                print(f"   - {test['test']}: {test['details']}")
        
        # Show warnings
        warned_tests_list = [test for test in self.results if test['status'] == 'WARN']
        if warned_tests_list:
            print(f"\n⚠️  WARNINGS:")
            for test in warned_tests_list:
                print(f"   - {test['test']}: {test['details']}")
        
        # Critical backend assessment
        print(f"\n🚀 CRITICAL BACKEND ASSESSMENT:")
        
        pass_rate = passed_tests / total_tests
        
        if pass_rate >= 0.9:
            print("   ✅ CRITICAL BACKEND SYSTEMS OPERATIONAL")
            print("   - Essential APIs working correctly")
            print("   - Payment processing functional")
            print("   - Admin systems accessible")
        elif pass_rate >= 0.7:
            print("   ⚠️  CRITICAL BACKEND MOSTLY FUNCTIONAL")
            print("   - Core systems working")
            print("   - Some issues need attention")
        else:
            print("   ❌ CRITICAL BACKEND ISSUES DETECTED")
            print("   - Essential systems failing")
            print("   - Immediate attention required")
        
        print(f"\n⏱️  Test Duration: {(datetime.now() - self.start_time).total_seconds():.1f} seconds")
        print("="*80)
        
        return {
            'pass_rate': pass_rate,
            'total_tests': total_tests,
            'passed_tests': passed_tests,
            'failed_tests': failed_tests,
            'critical_ready': pass_rate >= 0.8
        }

def main():
    """Run critical backend testing"""
    print("🎯 CRITICAL BACKEND PRODUCTION READINESS TEST")
    print("Testing essential backend functionality for production deployment")
    print(f"Target URL: {BASE_URL}")
    print("="*80)
    
    tester = CriticalBackendTest()
    
    try:
        # Run critical backend tests
        tester.test_health_endpoint()
        tester.test_stripe_checkout()
        tester.test_coupon_system()
        tester.test_square_payment_mock()
        tester.test_admin_apis()
        tester.test_input_validation()
        
        # Generate final report
        report = tester.generate_critical_report()
        
        return report
        
    except KeyboardInterrupt:
        print("\n⚠️  Testing interrupted by user")
        return None
    except Exception as e:
        print(f"\n❌ Testing failed with error: {str(e)}")
        return None

if __name__ == "__main__":
    main()