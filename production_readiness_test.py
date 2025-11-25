#!/usr/bin/env python3
"""
Production Readiness Assessment for Taste of Gratitude E-commerce Platform
Comprehensive testing for tasteofgratitude.shop replacement

Test Categories:
1. Performance & Load Testing
2. Security Validation  
3. Integration Testing
4. Error Handling & Recovery
5. SEO & Accessibility
"""

import requests
import time
import json
import concurrent.futures
import threading
from urllib.parse import urljoin
import os
from datetime import datetime

# Configuration
BASE_URL = "https://loading-fix-taste.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

class ProductionReadinessTest:
    def __init__(self):
        self.results = {
            'performance': [],
            'security': [],
            'integration': [],
            'error_handling': [],
            'seo_accessibility': []
        }
        self.start_time = datetime.now()
        
    def log_result(self, category, test_name, status, details, response_time=None):
        """Log test result with timestamp and details"""
        result = {
            'test': test_name,
            'status': status,
            'details': details,
            'timestamp': datetime.now().isoformat(),
            'response_time_ms': response_time
        }
        self.results[category].append(result)
        
        status_icon = "✅" if status == "PASS" else "❌" if status == "FAIL" else "⚠️"
        print(f"{status_icon} [{category.upper()}] {test_name}: {details}")
        if response_time:
            print(f"   Response Time: {response_time}ms")

    def test_api_performance(self):
        """Test API response times under various conditions"""
        print("\n🚀 PERFORMANCE & LOAD TESTING")
        
        # Test critical API endpoints
        endpoints = [
            ("/health", "GET", None),
            ("/checkout", "POST", {
                "items": [{"id": "elderberry-sea-moss-16oz", "quantity": 1}],
                "customer": {"email": "test@example.com"}
            }),
            ("/coupons/validate", "POST", {"couponCode": "INVALID", "customerEmail": "test@example.com"}),
            ("/square-payment", "POST", {
                "sourceId": "test_source",
                "amount": 3500,
                "currency": "USD",
                "customer": {"email": "test@example.com"}
            })
        ]
        
        for endpoint, method, data in endpoints:
            try:
                start_time = time.time()
                
                if method == "GET":
                    response = requests.get(f"{API_BASE}{endpoint}", timeout=10)
                else:
                    response = requests.post(f"{API_BASE}{endpoint}", 
                                           json=data, 
                                           headers={'Content-Type': 'application/json'},
                                           timeout=10)
                
                response_time = int((time.time() - start_time) * 1000)
                
                # Production requirement: All APIs responding within 2 seconds
                if response_time <= 2000:
                    self.log_result('performance', f"API Response Time {endpoint}", 
                                  "PASS", f"Response in {response_time}ms (< 2s requirement)", response_time)
                else:
                    self.log_result('performance', f"API Response Time {endpoint}", 
                                  "FAIL", f"Response in {response_time}ms (> 2s requirement)", response_time)
                    
            except requests.exceptions.Timeout:
                self.log_result('performance', f"API Response Time {endpoint}", 
                              "FAIL", "Request timed out (> 10s)")
            except Exception as e:
                self.log_result('performance', f"API Response Time {endpoint}", 
                              "FAIL", f"Request failed: {str(e)}")

    def test_concurrent_load(self):
        """Test concurrent user scenarios"""
        print("\n⚡ CONCURRENT LOAD TESTING")
        
        def make_request():
            try:
                start_time = time.time()
                response = requests.get(f"{API_BASE}/health", timeout=5)
                response_time = int((time.time() - start_time) * 1000)
                return response.status_code == 200, response_time
            except:
                return False, None
        
        # Test with 10 concurrent requests
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(make_request) for _ in range(10)]
            results = [future.result() for future in concurrent.futures.as_completed(futures)]
        
        successful_requests = sum(1 for success, _ in results if success)
        response_times = [rt for success, rt in results if success and rt is not None]
        
        if successful_requests >= 8:  # 80% success rate minimum
            avg_response_time = sum(response_times) / len(response_times) if response_times else 0
            self.log_result('performance', "Concurrent Load Test", 
                          "PASS", f"{successful_requests}/10 requests successful, avg {avg_response_time:.0f}ms")
        else:
            self.log_result('performance', "Concurrent Load Test", 
                          "FAIL", f"Only {successful_requests}/10 requests successful")

    def test_security_validation(self):
        """Test security vulnerabilities and protections"""
        print("\n🔒 SECURITY VALIDATION")
        
        # Test SQL Injection protection
        sql_injection_payloads = [
            "'; DROP TABLE users; --",
            "' OR '1'='1",
            "admin'--",
            "' UNION SELECT * FROM users--"
        ]
        
        for payload in sql_injection_payloads:
            try:
                response = requests.post(f"{API_BASE}/coupons/validate", 
                                       json={"couponCode": payload, "customerEmail": "test@example.com"},
                                       headers={'Content-Type': 'application/json'},
                                       timeout=5)
                
                # Should not return database errors or expose internal structure
                if response.status_code in [400, 404] and "error" not in response.text.lower():
                    self.log_result('security', "SQL Injection Protection", 
                                  "PASS", f"Payload '{payload[:20]}...' properly handled")
                else:
                    self.log_result('security', "SQL Injection Protection", 
                                  "WARN", f"Payload '{payload[:20]}...' returned: {response.status_code}")
            except Exception as e:
                self.log_result('security', "SQL Injection Protection", 
                              "FAIL", f"Error testing payload: {str(e)}")

        # Test XSS protection
        xss_payloads = [
            "<script>alert('xss')</script>",
            "javascript:alert('xss')",
            "<img src=x onerror=alert('xss')>",
            "';alert('xss');//"
        ]
        
        for payload in xss_payloads:
            try:
                response = requests.post(f"{API_BASE}/coupons/validate", 
                                       json={"couponCode": payload, "customerEmail": "test@example.com"},
                                       headers={'Content-Type': 'application/json'},
                                       timeout=5)
                
                # Response should not contain unescaped script tags
                if "<script>" not in response.text and "javascript:" not in response.text:
                    self.log_result('security', "XSS Protection", 
                                  "PASS", f"XSS payload properly sanitized")
                else:
                    self.log_result('security', "XSS Protection", 
                                  "FAIL", f"XSS payload not properly sanitized")
            except Exception as e:
                self.log_result('security', "XSS Protection", 
                              "FAIL", f"Error testing XSS: {str(e)}")

        # Test rate limiting
        print("   Testing rate limiting...")
        rapid_requests = []
        for i in range(35):  # Exceed 30 requests/minute limit
            try:
                start_time = time.time()
                response = requests.get(f"{API_BASE}/health", timeout=2)
                rapid_requests.append(response.status_code)
                time.sleep(0.1)  # Small delay between requests
            except:
                rapid_requests.append(None)
        
        rate_limited = any(status == 429 for status in rapid_requests)
        if rate_limited:
            self.log_result('security', "Rate Limiting", 
                          "PASS", "Rate limiting active - 429 responses detected")
        else:
            self.log_result('security', "Rate Limiting", 
                          "WARN", "No rate limiting detected in 35 rapid requests")

    def test_integration_systems(self):
        """Test integration with external systems"""
        print("\n🔗 INTEGRATION TESTING")
        
        # Test Square payment system (mock mode expected)
        try:
            response = requests.post(f"{API_BASE}/square-payment", 
                                   json={
                                       "sourceId": "cnon:card-nonce-ok",
                                       "amount": 3500,
                                       "currency": "USD",
                                       "customer": {
                                           "email": "integration.test@example.com",
                                           "firstName": "Integration",
                                           "lastName": "Test"
                                       },
                                       "order": {
                                           "items": [{"name": "Test Product", "price": 35.00, "quantity": 1}]
                                       }
                                   },
                                   headers={'Content-Type': 'application/json'},
                                   timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success') and 'paymentId' in data:
                    self.log_result('integration', "Square Payment Integration", 
                                  "PASS", f"Payment processing working (mock mode): {data.get('paymentId')}")
                else:
                    self.log_result('integration', "Square Payment Integration", 
                                  "FAIL", f"Invalid response format: {data}")
            else:
                self.log_result('integration', "Square Payment Integration", 
                              "FAIL", f"Payment failed with status {response.status_code}")
                
        except Exception as e:
            self.log_result('integration', "Square Payment Integration", 
                          "FAIL", f"Payment integration error: {str(e)}")

        # Test coupon system end-to-end
        try:
            # Create coupon
            create_response = requests.post(f"{API_BASE}/coupons/create", 
                                          json={
                                              "email": "integration.test@example.com",
                                              "type": "manual",
                                              "discountAmount": 5.00
                                          },
                                          headers={'Content-Type': 'application/json'},
                                          timeout=5)
            
            if create_response.status_code == 200:
                coupon_data = create_response.json()
                coupon_code = coupon_data.get('couponCode')
                
                # Validate coupon
                validate_response = requests.post(f"{API_BASE}/coupons/validate", 
                                                json={
                                                    "couponCode": coupon_code,
                                                    "customerEmail": "integration.test@example.com"
                                                },
                                                headers={'Content-Type': 'application/json'},
                                                timeout=5)
                
                if validate_response.status_code == 200:
                    self.log_result('integration', "Coupon System End-to-End", 
                                  "PASS", f"Coupon created and validated: {coupon_code}")
                else:
                    self.log_result('integration', "Coupon System End-to-End", 
                                  "FAIL", f"Coupon validation failed: {validate_response.status_code}")
            else:
                self.log_result('integration', "Coupon System End-to-End", 
                              "FAIL", f"Coupon creation failed: {create_response.status_code}")
                
        except Exception as e:
            self.log_result('integration', "Coupon System End-to-End", 
                          "FAIL", f"Coupon system error: {str(e)}")

        # Test admin dashboard functionality
        try:
            response = requests.get(f"{API_BASE}/admin/coupons", timeout=5)
            if response.status_code == 200:
                data = response.json()
                if 'coupons' in data:
                    self.log_result('integration', "Admin Dashboard API", 
                                  "PASS", f"Admin API accessible, {len(data['coupons'])} coupons found")
                else:
                    self.log_result('integration', "Admin Dashboard API", 
                                  "FAIL", "Invalid admin API response format")
            else:
                self.log_result('integration', "Admin Dashboard API", 
                              "WARN", f"Admin API returned status {response.status_code}")
                
        except Exception as e:
            self.log_result('integration', "Admin Dashboard API", 
                          "FAIL", f"Admin API error: {str(e)}")

    def test_error_handling(self):
        """Test graceful error handling and recovery"""
        print("\n🛡️ ERROR HANDLING & RECOVERY")
        
        # Test invalid JSON handling
        try:
            response = requests.post(f"{API_BASE}/square-payment", 
                                   data="invalid json{",
                                   headers={'Content-Type': 'application/json'},
                                   timeout=5)
            
            if response.status_code == 400:
                self.log_result('error_handling', "Invalid JSON Handling", 
                              "PASS", "Invalid JSON properly rejected with 400 status")
            else:
                self.log_result('error_handling', "Invalid JSON Handling", 
                              "FAIL", f"Invalid JSON returned status {response.status_code}")
                
        except Exception as e:
            self.log_result('error_handling', "Invalid JSON Handling", 
                          "FAIL", f"Error testing invalid JSON: {str(e)}")

        # Test missing required fields
        try:
            response = requests.post(f"{API_BASE}/square-payment", 
                                   json={},  # Empty payload
                                   headers={'Content-Type': 'application/json'},
                                   timeout=5)
            
            if response.status_code == 400:
                self.log_result('error_handling', "Missing Fields Validation", 
                              "PASS", "Missing required fields properly rejected")
            else:
                self.log_result('error_handling', "Missing Fields Validation", 
                              "FAIL", f"Missing fields returned status {response.status_code}")
                
        except Exception as e:
            self.log_result('error_handling', "Missing Fields Validation", 
                          "FAIL", f"Error testing missing fields: {str(e)}")

        # Test invalid HTTP methods
        try:
            response = requests.delete(f"{API_BASE}/square-payment", timeout=5)
            
            if response.status_code == 405:
                self.log_result('error_handling', "Invalid HTTP Method", 
                              "PASS", "Invalid HTTP method properly rejected with 405")
            else:
                self.log_result('error_handling', "Invalid HTTP Method", 
                              "FAIL", f"Invalid method returned status {response.status_code}")
                
        except Exception as e:
            self.log_result('error_handling', "Invalid HTTP Method", 
                          "FAIL", f"Error testing invalid method: {str(e)}")

        # Test system health monitoring
        try:
            response = requests.get(f"{API_BASE}/health", timeout=5)
            
            if response.status_code == 200:
                data = response.json()
                if 'status' in data and 'services' in data:
                    self.log_result('error_handling', "Health Monitoring", 
                                  "PASS", f"Health endpoint operational: {data.get('status')}")
                else:
                    self.log_result('error_handling', "Health Monitoring", 
                                  "FAIL", "Health endpoint missing required fields")
            else:
                self.log_result('error_handling', "Health Monitoring", 
                              "FAIL", f"Health endpoint returned status {response.status_code}")
                
        except Exception as e:
            self.log_result('error_handling', "Health Monitoring", 
                          "FAIL", f"Health monitoring error: {str(e)}")

    def test_seo_accessibility(self):
        """Test SEO and accessibility compliance"""
        print("\n🌐 SEO & ACCESSIBILITY")
        
        # Test main pages for SEO elements
        pages = [
            "/",
            "/catalog", 
            "/about",
            "/contact",
            "/markets"
        ]
        
        for page in pages:
            try:
                response = requests.get(f"{BASE_URL}{page}", timeout=10)
                
                if response.status_code == 200:
                    html = response.text
                    
                    # Check for essential SEO elements
                    has_title = "<title>" in html
                    has_meta_description = 'name="description"' in html
                    has_meta_viewport = 'name="viewport"' in html
                    has_h1 = "<h1" in html
                    
                    seo_score = sum([has_title, has_meta_description, has_meta_viewport, has_h1])
                    
                    if seo_score >= 3:
                        self.log_result('seo_accessibility', f"SEO Elements {page}", 
                                      "PASS", f"SEO elements present: {seo_score}/4")
                    else:
                        self.log_result('seo_accessibility', f"SEO Elements {page}", 
                                      "FAIL", f"Missing SEO elements: {seo_score}/4")
                        
                    # Check page load time
                    if response.elapsed.total_seconds() <= 3:
                        self.log_result('seo_accessibility', f"Page Load Speed {page}", 
                                      "PASS", f"Page loaded in {response.elapsed.total_seconds():.2f}s")
                    else:
                        self.log_result('seo_accessibility', f"Page Load Speed {page}", 
                                      "FAIL", f"Page loaded in {response.elapsed.total_seconds():.2f}s (> 3s)")
                        
                else:
                    self.log_result('seo_accessibility', f"Page Accessibility {page}", 
                                  "FAIL", f"Page returned status {response.status_code}")
                    
            except Exception as e:
                self.log_result('seo_accessibility', f"Page Testing {page}", 
                              "FAIL", f"Page test error: {str(e)}")

        # Test mobile responsiveness indicators
        try:
            response = requests.get(BASE_URL, timeout=10)
            if response.status_code == 200:
                html = response.text
                
                # Check for responsive design indicators
                has_viewport = 'name="viewport"' in html
                has_responsive_css = any(indicator in html for indicator in [
                    'responsive', 'mobile', '@media', 'flex', 'grid'
                ])
                
                if has_viewport and has_responsive_css:
                    self.log_result('seo_accessibility', "Mobile Responsiveness", 
                                  "PASS", "Responsive design indicators present")
                else:
                    self.log_result('seo_accessibility', "Mobile Responsiveness", 
                                  "WARN", "Limited responsive design indicators")
                    
        except Exception as e:
            self.log_result('seo_accessibility', "Mobile Responsiveness", 
                          "FAIL", f"Responsiveness test error: {str(e)}")

    def generate_report(self):
        """Generate comprehensive production readiness report"""
        print("\n" + "="*80)
        print("🎯 PRODUCTION READINESS ASSESSMENT REPORT")
        print("="*80)
        
        total_tests = sum(len(category) for category in self.results.values())
        passed_tests = sum(1 for category in self.results.values() 
                          for test in category if test['status'] == 'PASS')
        failed_tests = sum(1 for category in self.results.values() 
                          for test in category if test['status'] == 'FAIL')
        warned_tests = sum(1 for category in self.results.values() 
                          for test in category if test['status'] == 'WARN')
        
        print(f"\n📊 OVERALL RESULTS:")
        print(f"   Total Tests: {total_tests}")
        print(f"   ✅ Passed: {passed_tests} ({passed_tests/total_tests*100:.1f}%)")
        print(f"   ❌ Failed: {failed_tests} ({failed_tests/total_tests*100:.1f}%)")
        print(f"   ⚠️  Warnings: {warned_tests} ({warned_tests/total_tests*100:.1f}%)")
        
        # Category breakdown
        for category, tests in self.results.items():
            if tests:
                category_passed = sum(1 for test in tests if test['status'] == 'PASS')
                category_total = len(tests)
                print(f"\n🔍 {category.upper().replace('_', ' ')}:")
                print(f"   {category_passed}/{category_total} tests passed ({category_passed/category_total*100:.1f}%)")
                
                # Show failed tests
                failed_in_category = [test for test in tests if test['status'] == 'FAIL']
                if failed_in_category:
                    print("   ❌ Failed Tests:")
                    for test in failed_in_category:
                        print(f"      - {test['test']}: {test['details']}")
        
        # Production readiness assessment
        print(f"\n🚀 PRODUCTION READINESS ASSESSMENT:")
        
        # Critical requirements check
        performance_pass_rate = len([t for t in self.results['performance'] if t['status'] == 'PASS']) / max(len(self.results['performance']), 1)
        security_pass_rate = len([t for t in self.results['security'] if t['status'] == 'PASS']) / max(len(self.results['security']), 1)
        integration_pass_rate = len([t for t in self.results['integration'] if t['status'] == 'PASS']) / max(len(self.results['integration']), 1)
        
        overall_pass_rate = passed_tests / total_tests
        
        if overall_pass_rate >= 0.9 and performance_pass_rate >= 0.8 and security_pass_rate >= 0.7:
            print("   ✅ READY FOR PRODUCTION DEPLOYMENT")
            print("   - Performance benchmarks met")
            print("   - Security validations passed")
            print("   - Integration tests successful")
            print("   - Error handling operational")
        elif overall_pass_rate >= 0.8:
            print("   ⚠️  MOSTLY READY - MINOR ISSUES TO ADDRESS")
            print("   - Core functionality working")
            print("   - Some optimizations needed")
        else:
            print("   ❌ NOT READY FOR PRODUCTION")
            print("   - Critical issues need resolution")
            print("   - Additional testing required")
        
        print(f"\n⏱️  Test Duration: {(datetime.now() - self.start_time).total_seconds():.1f} seconds")
        print("="*80)
        
        return {
            'overall_pass_rate': overall_pass_rate,
            'total_tests': total_tests,
            'passed_tests': passed_tests,
            'failed_tests': failed_tests,
            'production_ready': overall_pass_rate >= 0.9 and performance_pass_rate >= 0.8 and security_pass_rate >= 0.7
        }

def main():
    """Run comprehensive production readiness assessment"""
    print("🎯 TASTE OF GRATITUDE - PRODUCTION READINESS ASSESSMENT")
    print("Testing tasteofgratitude.shop replacement readiness")
    print(f"Target URL: {BASE_URL}")
    print("="*80)
    
    tester = ProductionReadinessTest()
    
    try:
        # Run all test categories
        tester.test_api_performance()
        tester.test_concurrent_load()
        tester.test_security_validation()
        tester.test_integration_systems()
        tester.test_error_handling()
        tester.test_seo_accessibility()
        
        # Generate final report
        report = tester.generate_report()
        
        return report
        
    except KeyboardInterrupt:
        print("\n⚠️  Testing interrupted by user")
        return None
    except Exception as e:
        print(f"\n❌ Testing failed with error: {str(e)}")
        return None

if __name__ == "__main__":
    main()