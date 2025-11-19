#!/usr/bin/env python3
"""
Final Production Readiness Test with Correct Product IDs
Testing critical backend functionality for production deployment
"""

import requests
import time
import json
from datetime import datetime

# Configuration
BASE_URL = "https://gratog-payments.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

class FinalProductionTest:
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

    def test_core_apis(self):
        """Test core API functionality"""
        print("\n🎯 CORE API TESTING")
        
        # Test Health Check
        try:
            start_time = time.time()
            response = requests.get(f"{API_BASE}/health", timeout=10)
            response_time = int((time.time() - start_time) * 1000)
            
            if response.status_code == 200 and response_time <= 2000:
                data = response.json()
                self.log_result("Health Check API", "PASS", 
                              f"System healthy: {data.get('status')}", response_time)
            else:
                self.log_result("Health Check API", "FAIL", 
                              f"Health check failed: {response.status_code}", response_time)
        except Exception as e:
            self.log_result("Health Check API", "FAIL", f"Health check error: {str(e)}")

        # Test Stripe Checkout with correct product ID
        try:
            start_time = time.time()
            response = requests.post(f"{API_BASE}/checkout", 
                                   json={
                                       "items": [{"id": "elderberry-moss", "quantity": 1}],
                                       "customer": {"email": "production.test@example.com"}
                                   },
                                   headers={'Content-Type': 'application/json'},
                                   timeout=10)
            response_time = int((time.time() - start_time) * 1000)
            
            if response.status_code == 200 and response_time <= 2000:
                data = response.json()
                if 'url' in data and 'session_id' in data:
                    self.log_result("Stripe Checkout API", "PASS", 
                                  f"Checkout session created successfully", response_time)
                else:
                    self.log_result("Stripe Checkout API", "FAIL", 
                                  "Invalid checkout response format", response_time)
            else:
                self.log_result("Stripe Checkout API", "FAIL", 
                              f"Checkout failed: {response.status_code}", response_time)
        except Exception as e:
            self.log_result("Stripe Checkout API", "FAIL", f"Checkout error: {str(e)}")

        # Test Coupon Validation (simple test)
        try:
            start_time = time.time()
            response = requests.post(f"{API_BASE}/coupons/validate", 
                                   json={
                                       "couponCode": "INVALID_CODE",
                                       "customerEmail": "test@example.com"
                                   },
                                   headers={'Content-Type': 'application/json'},
                                   timeout=10)
            response_time = int((time.time() - start_time) * 1000)
            
            if response.status_code == 200 and response_time <= 2000:
                data = response.json()
                if 'valid' in data and data['valid'] == False:
                    self.log_result("Coupon Validation API", "PASS", 
                                  "Coupon validation working correctly", response_time)
                else:
                    self.log_result("Coupon Validation API", "FAIL", 
                                  "Unexpected coupon validation response", response_time)
            else:
                self.log_result("Coupon Validation API", "FAIL", 
                              f"Coupon validation failed: {response.status_code}", response_time)
        except Exception as e:
            self.log_result("Coupon Validation API", "FAIL", f"Coupon validation error: {str(e)}")

    def test_square_payment_mock(self):
        """Test Square payment in mock mode"""
        print("\n🟦 SQUARE PAYMENT TESTING")
        
        try:
            start_time = time.time()
            response = requests.post(f"{API_BASE}/square-payment", 
                                   json={
                                       "sourceId": "cnon:card-nonce-ok",
                                       "amount": 3600,  # $36.00 for elderberry-moss
                                       "currency": "USD",
                                       "customer": {
                                           "email": "production.test@example.com",
                                           "firstName": "Production",
                                           "lastName": "Test"
                                       },
                                       "order": {
                                           "items": [{"name": "Elderberry Moss", "price": 36.00, "quantity": 1}]
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
                    else:
                        self.log_result("Square Payment Mock", "WARN", 
                                      f"Payment processed (not mock): {payment_id}", response_time)
                else:
                    self.log_result("Square Payment Mock", "FAIL", 
                                  "Invalid payment response format", response_time)
            else:
                self.log_result("Square Payment Mock", "FAIL", 
                              f"Payment failed: {response.status_code}", response_time)
        except Exception as e:
            self.log_result("Square Payment Mock", "FAIL", f"Payment error: {str(e)}")

    def test_performance_requirements(self):
        """Test performance requirements for production"""
        print("\n⚡ PERFORMANCE TESTING")
        
        # Test multiple API calls for consistency
        endpoints = [
            ("/health", "GET", None),
            ("/coupons/validate", "POST", {"couponCode": "TEST", "customerEmail": "test@example.com"})
        ]
        
        for endpoint, method, data in endpoints:
            response_times = []
            success_count = 0
            
            for i in range(3):  # Test 3 times for consistency
                try:
                    start_time = time.time()
                    
                    if method == "GET":
                        response = requests.get(f"{API_BASE}{endpoint}", timeout=5)
                    else:
                        response = requests.post(f"{API_BASE}{endpoint}", 
                                               json=data, 
                                               headers={'Content-Type': 'application/json'},
                                               timeout=5)
                    
                    response_time = int((time.time() - start_time) * 1000)
                    response_times.append(response_time)
                    
                    if response.status_code in [200, 400]:  # 400 is expected for invalid coupon
                        success_count += 1
                        
                except Exception:
                    pass
            
            if response_times:
                avg_time = sum(response_times) / len(response_times)
                if success_count >= 2 and avg_time <= 2000:
                    self.log_result(f"Performance {endpoint}", "PASS", 
                                  f"Avg response: {avg_time:.0f}ms, {success_count}/3 successful")
                else:
                    self.log_result(f"Performance {endpoint}", "FAIL", 
                                  f"Avg response: {avg_time:.0f}ms, {success_count}/3 successful")
            else:
                self.log_result(f"Performance {endpoint}", "FAIL", "No successful responses")

    def test_error_handling(self):
        """Test error handling capabilities"""
        print("\n🛡️ ERROR HANDLING TESTING")
        
        # Test invalid JSON
        try:
            response = requests.post(f"{API_BASE}/coupons/validate", 
                                   data="invalid json",
                                   headers={'Content-Type': 'application/json'},
                                   timeout=5)
            
            if response.status_code == 400:
                self.log_result("Invalid JSON Handling", "PASS", 
                              "Invalid JSON properly rejected")
            else:
                self.log_result("Invalid JSON Handling", "FAIL", 
                              f"Invalid JSON returned: {response.status_code}")
        except Exception as e:
            self.log_result("Invalid JSON Handling", "FAIL", f"Error testing invalid JSON: {str(e)}")

        # Test missing fields
        try:
            response = requests.post(f"{API_BASE}/coupons/validate", 
                                   json={},  # Empty payload
                                   headers={'Content-Type': 'application/json'},
                                   timeout=5)
            
            if response.status_code == 400:
                self.log_result("Missing Fields Validation", "PASS", 
                              "Missing fields properly rejected")
            else:
                self.log_result("Missing Fields Validation", "FAIL", 
                              f"Missing fields returned: {response.status_code}")
        except Exception as e:
            self.log_result("Missing Fields Validation", "FAIL", f"Error testing missing fields: {str(e)}")

    def test_frontend_accessibility(self):
        """Test frontend pages for basic accessibility"""
        print("\n🌐 FRONTEND ACCESSIBILITY")
        
        pages = ["/", "/catalog", "/about"]
        
        for page in pages:
            try:
                start_time = time.time()
                response = requests.get(f"{BASE_URL}{page}", timeout=10)
                load_time = time.time() - start_time
                
                if response.status_code == 200:
                    html = response.text
                    
                    # Check for basic SEO/accessibility elements
                    has_title = "<title>" in html
                    has_meta_viewport = 'name="viewport"' in html
                    has_h1 = "<h1" in html
                    
                    seo_score = sum([has_title, has_meta_viewport, has_h1])
                    
                    if seo_score >= 2 and load_time <= 5:
                        self.log_result(f"Frontend {page}", "PASS", 
                                      f"Page accessible, SEO: {seo_score}/3, Load: {load_time:.1f}s")
                    else:
                        self.log_result(f"Frontend {page}", "WARN", 
                                      f"Issues detected, SEO: {seo_score}/3, Load: {load_time:.1f}s")
                else:
                    self.log_result(f"Frontend {page}", "FAIL", 
                                  f"Page returned: {response.status_code}")
            except Exception as e:
                self.log_result(f"Frontend {page}", "FAIL", f"Page error: {str(e)}")

    def generate_final_report(self):
        """Generate final production readiness report"""
        print("\n" + "="*80)
        print("🎯 FINAL PRODUCTION READINESS ASSESSMENT")
        print("="*80)
        
        total_tests = len(self.results)
        passed_tests = sum(1 for test in self.results if test['status'] == 'PASS')
        failed_tests = sum(1 for test in self.results if test['status'] == 'FAIL')
        warned_tests = sum(1 for test in self.results if test['status'] == 'WARN')
        
        print(f"\n📊 FINAL RESULTS:")
        print(f"   Total Tests: {total_tests}")
        print(f"   ✅ Passed: {passed_tests} ({passed_tests/total_tests*100:.1f}%)")
        print(f"   ❌ Failed: {failed_tests} ({failed_tests/total_tests*100:.1f}%)")
        print(f"   ⚠️  Warnings: {warned_tests} ({warned_tests/total_tests*100:.1f}%)")
        
        # Show critical failures
        critical_failures = [test for test in self.results if test['status'] == 'FAIL']
        if critical_failures:
            print(f"\n❌ CRITICAL ISSUES:")
            for test in critical_failures:
                print(f"   - {test['test']}: {test['details']}")
        
        # Show warnings
        warnings = [test for test in self.results if test['status'] == 'WARN']
        if warnings:
            print(f"\n⚠️  WARNINGS:")
            for test in warnings:
                print(f"   - {test['test']}: {test['details']}")
        
        # Final assessment
        print(f"\n🚀 PRODUCTION READINESS:")
        
        pass_rate = passed_tests / total_tests
        
        # Check critical systems
        health_working = any(t['test'] == 'Health Check API' and t['status'] == 'PASS' for t in self.results)
        stripe_working = any(t['test'] == 'Stripe Checkout API' and t['status'] == 'PASS' for t in self.results)
        frontend_working = any('Frontend' in t['test'] and t['status'] == 'PASS' for t in self.results)
        
        if pass_rate >= 0.8 and health_working and stripe_working and frontend_working:
            print("   ✅ READY FOR PRODUCTION DEPLOYMENT")
            print("   - Core payment systems operational")
            print("   - Health monitoring active")
            print("   - Frontend accessible")
            print("   - Performance within acceptable limits")
        elif pass_rate >= 0.6:
            print("   ⚠️  MOSTLY READY - MINOR OPTIMIZATIONS NEEDED")
            print("   - Core functionality working")
            print("   - Some performance improvements recommended")
        else:
            print("   ❌ NOT READY FOR PRODUCTION")
            print("   - Critical systems need attention")
            print("   - Performance issues detected")
        
        print(f"\n⏱️  Test Duration: {(datetime.now() - self.start_time).total_seconds():.1f} seconds")
        print("="*80)
        
        return {
            'pass_rate': pass_rate,
            'total_tests': total_tests,
            'passed_tests': passed_tests,
            'failed_tests': failed_tests,
            'production_ready': pass_rate >= 0.8 and health_working and stripe_working,
            'critical_systems': {
                'health': health_working,
                'stripe': stripe_working,
                'frontend': frontend_working
            }
        }

def main():
    """Run final production readiness test"""
    print("🎯 FINAL PRODUCTION READINESS TEST")
    print("Testing Taste of Gratitude e-commerce platform for production deployment")
    print(f"Target URL: {BASE_URL}")
    print("="*80)
    
    tester = FinalProductionTest()
    
    try:
        # Run all test categories
        tester.test_core_apis()
        tester.test_square_payment_mock()
        tester.test_performance_requirements()
        tester.test_error_handling()
        tester.test_frontend_accessibility()
        
        # Generate final report
        report = tester.generate_final_report()
        
        return report
        
    except KeyboardInterrupt:
        print("\n⚠️  Testing interrupted by user")
        return None
    except Exception as e:
        print(f"\n❌ Testing failed with error: {str(e)}")
        return None

if __name__ == "__main__":
    main()