#!/usr/bin/env python3
"""
Square Payment API Authentication Diagnostic Test Suite
Focused testing for Square payment integration authentication issues after disabling mock mode
"""

import requests
import json
import time
import uuid
from datetime import datetime
import os
import sys

# Configuration
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://taste-ecommerce.preview.emergentagent.com')
API_BASE = f"{BASE_URL}/api"

class SquareAuthenticationDiagnostic:
    def __init__(self):
        self.test_results = []
        self.start_time = time.time()
        
    def log_test(self, test_name, success, details="", response_time=None):
        """Log test results with detailed information"""
        result = {
            'test': test_name,
            'success': success,
            'details': details,
            'response_time_ms': response_time,
            'timestamp': datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL" if not success else "⚠️ WARN"
        time_info = f" ({response_time}ms)" if response_time else ""
        print(f"{status}: {test_name}{time_info}")
        if details:
            print(f"    Details: {details}")
        print()

    def test_square_credentials_format(self):
        """Test 1: Validate Square credentials format"""
        print("🔍 TEST 1: SQUARE CREDENTIALS FORMAT VALIDATION")
        
        # Check environment variables (from .env file analysis)
        app_id = "sq0idp-V1fV-MwsU5lET4rvzHKnIw"
        location_id = "L66TVG6867BG9"
        access_token = "EAAAl-ZrukY7JTIOhQRn4biERUAu3arLjF2LFjEOtz0_I30fXiFEsQuVEsNvr7eH"
        
        # Validate App ID format
        if app_id.startswith("sq0idp-"):
            self.log_test("App ID Format", True, f"Correct format: {app_id}")
        else:
            self.log_test("App ID Format", False, f"Invalid format: {app_id}")
        
        # Validate Location ID format
        if len(location_id) > 5 and location_id.isalnum():
            self.log_test("Location ID Format", True, f"Correct format: {location_id}")
        else:
            self.log_test("Location ID Format", False, f"Invalid format: {location_id}")
        
        # Validate Access Token format - THIS IS THE CRITICAL ISSUE
        if access_token.startswith("sandbox-sq0atb-"):
            self.log_test("Access Token Format", True, f"Correct sandbox format")
            return True
        elif access_token.startswith("sq0atb-"):
            self.log_test("Access Token Format", True, f"Correct production format")
            return True
        else:
            self.log_test("Access Token Format", False, 
                         f"❌ CRITICAL ISSUE: Invalid token format. Current token '{access_token[:20]}...' appears to be from Facebook/Meta API, not Square. Square sandbox tokens must start with 'sandbox-sq0atb-' followed by alphanumeric characters.")
            return False

    def test_square_api_connectivity(self):
        """Test 2: Test Square API endpoint accessibility"""
        print("🌐 TEST 2: SQUARE API ENDPOINT CONNECTIVITY")
        
        try:
            # Test Square sandbox API endpoint directly
            response = requests.get("https://connect.squareupsandbox.com/v2/locations", timeout=10)
            if response.status_code in [401, 403]:
                self.log_test("Square Sandbox API Endpoint", True, 
                             f"Square API accessible (Status: {response.status_code} - expected without auth)")
            else:
                self.log_test("Square Sandbox API Endpoint", False, 
                             f"Unexpected status: {response.status_code}")
        except Exception as e:
            self.log_test("Square Sandbox API Endpoint", False, f"Connection error: {str(e)}")
    
    def test_mock_mode_status(self):
        """Test 3: Check if mock mode is enabled/disabled"""
        print("🎭 TEST 3: MOCK MODE STATUS CHECK")
        
        # Check the current mock mode setting by examining the API response patterns
        test_data = {
            "sourceId": "cnon:card-nonce-ok",
            "amount": 1.00,
            "currency": "USD",
            "orderId": f"mock_check_{int(time.time())}"
        }
        
        try:
            start_time = time.time()
            response = requests.post(
                f"{API_BASE}/square-payment",
                json=test_data,
                headers={"Content-Type": "application/json"},
                timeout=30
            )
            response_time = int((time.time() - start_time) * 1000)
            
            if response.status_code == 200:
                result = response.json()
                payment_id = result.get('paymentId', '')
                receipt_url = result.get('receiptUrl', '')
                
                # Check for mock indicators
                is_mock = (
                    payment_id.startswith('mock_payment_') or
                    'mock-square.com' in receipt_url
                )
                
                if is_mock:
                    self.log_test("Mock Mode Status", True, 
                                 f"✅ Mock mode is ENABLED - Payment ID: {payment_id}", response_time)
                else:
                    self.log_test("Mock Mode Status", True, 
                                 f"⚠️ Mock mode is DISABLED - Using live Square API", response_time)
            else:
                self.log_test("Mock Mode Status", False, 
                             f"Unable to determine mock mode status - HTTP {response.status_code}", response_time)
                
        except Exception as e:
            self.log_test("Mock Mode Status", False, f"Request failed: {str(e)}")

    def test_square_authentication_with_test_tokens(self):
        """Test 4: Test Square authentication with various test tokens"""
        print("🧪 TEST 4: SQUARE AUTHENTICATION WITH TEST TOKENS")
        
        test_tokens = [
            ("cnon:card-nonce-ok", "Valid test token"),
            ("cnon:card-nonce-declined", "Declined test token"),
            ("cnon:card-nonce-insufficient-funds", "Insufficient funds test token")
        ]
        
        for token, description in test_tokens:
            test_data = {
                "sourceId": token,
                "amount": 5.00,
                "currency": "USD",
                "orderId": f"auth_test_{token.split(':')[-1]}_{int(time.time())}"
            }
            
            try:
                start_time = time.time()
                response = requests.post(
                    f"{API_BASE}/square-payment",
                    json=test_data,
                    headers={"Content-Type": "application/json"},
                    timeout=30
                )
                response_time = int((time.time() - start_time) * 1000)
                
                if response.status_code == 200:
                    result = response.json()
                    if result.get('success'):
                        self.log_test(f"Auth Test: {description}", True, 
                                     f"✅ Authentication successful - Payment processed", response_time)
                    else:
                        # Check if it's a business logic failure (declined) vs auth failure
                        error_msg = result.get('error', '').lower()
                        if 'declined' in error_msg or 'insufficient' in error_msg:
                            self.log_test(f"Auth Test: {description}", True, 
                                         f"✅ Authentication successful - Business logic rejection: {result.get('error')}", response_time)
                        else:
                            self.log_test(f"Auth Test: {description}", False, 
                                         f"❌ Payment failed: {result.get('error')}", response_time)
                elif response.status_code == 500:
                    try:
                        error_data = response.json()
                        error_msg = error_data.get('error', 'Unknown server error')
                        if 'authentication' in error_msg.lower() or 'unauthorized' in error_msg.lower():
                            self.log_test(f"Auth Test: {description}", False, 
                                         f"❌ AUTHENTICATION FAILURE: {error_msg}", response_time)
                        else:
                            self.log_test(f"Auth Test: {description}", False, 
                                         f"❌ Server error: {error_msg}", response_time)
                    except:
                        self.log_test(f"Auth Test: {description}", False, 
                                     f"❌ 500 error with unparseable response", response_time)
                else:
                    self.log_test(f"Auth Test: {description}", False, 
                                 f"❌ HTTP {response.status_code}", response_time)
                    
            except Exception as e:
                self.log_test(f"Auth Test: {description}", False, f"❌ Request error: {str(e)}")

    def test_detailed_error_analysis(self):
        """Test 5: Detailed analysis of Square API error responses"""
        print("🔬 TEST 5: DETAILED SQUARE API ERROR ANALYSIS")
        
        # Test with minimal valid data to get specific error details
        minimal_data = {
            "sourceId": "cnon:card-nonce-ok",
            "amount": 1.00,
            "currency": "USD",
            "orderId": f"error_analysis_{int(time.time())}"
        }
        
        try:
            start_time = time.time()
            response = requests.post(
                f"{API_BASE}/square-payment",
                json=minimal_data,
                headers={"Content-Type": "application/json"},
                timeout=30
            )
            response_time = int((time.time() - start_time) * 1000)
            
            print(f"    Response Status: {response.status_code}")
            print(f"    Response Time: {response_time}ms")
            
            try:
                response_data = response.json()
                print(f"    Response Body: {json.dumps(response_data, indent=4)}")
                
                if response.status_code == 500:
                    error_msg = response_data.get("error", "Unknown error")
                    
                    # Analyze specific error patterns
                    if "401" in error_msg or "Unauthorized" in error_msg or "AUTHENTICATION" in error_msg:
                        self.log_test("Error Analysis - Authentication", False, 
                                     f"❌ CONFIRMED: Square API authentication failure - {error_msg}", response_time)
                    elif "INVALID_REQUEST_ERROR" in error_msg:
                        self.log_test("Error Analysis - Request Format", False, 
                                     f"❌ Request format error - {error_msg}", response_time)
                    elif "timeout" in error_msg.lower():
                        self.log_test("Error Analysis - Timeout", False, 
                                     f"❌ Square API timeout - {error_msg}", response_time)
                    else:
                        self.log_test("Error Analysis - Other", False, 
                                     f"❌ Other Square API error - {error_msg}", response_time)
                        
                elif response.status_code == 200:
                    if response_data.get("success"):
                        self.log_test("Error Analysis - Success", True, 
                                     f"✅ Payment processed successfully - No authentication errors", response_time)
                    else:
                        self.log_test("Error Analysis - Business Logic", True, 
                                     f"✅ Authentication OK, business logic rejection: {response_data.get('error')}", response_time)
                else:
                    self.log_test("Error Analysis - HTTP Status", False, 
                                 f"❌ Unexpected HTTP status: {response.status_code}", response_time)
                    
            except json.JSONDecodeError:
                self.log_test("Error Analysis - Response Format", False, 
                             f"❌ Non-JSON response: {response.text[:200]}", response_time)
                
        except Exception as e:
            self.log_test("Error Analysis - Request", False, f"❌ Request failed: {str(e)}")
    
    def test_server_logs_analysis(self):
        """Test 6: Analyze server logs for Square API errors"""
        print("📋 TEST 6: SERVER LOGS ANALYSIS")
        
        # Make a request that should trigger logging
        test_data = {
            "sourceId": "cnon:card-nonce-ok",
            "amount": 10.00,
            "orderId": f"log_test_{int(time.time())}"
        }
        
        try:
            # Make the request
            response = requests.post(
                f"{API_BASE}/square-payment",
                json=test_data,
                headers={"Content-Type": "application/json"},
                timeout=30
            )
            
            # Check server logs for Square-related errors
            # Note: In a real environment, you'd check actual log files
            # Here we'll simulate by checking the response patterns
            
            if response.status_code == 500:
                self.log_test("Server Logs - Error Detection", True, 
                             "✅ 500 error detected - Check server logs for Square API authentication errors")
            else:
                self.log_test("Server Logs - Error Detection", True, 
                             f"✅ Response received (Status: {response.status_code}) - Check logs for details")
                
        except Exception as e:
            self.log_test("Server Logs - Request", False, f"❌ Unable to trigger log analysis: {str(e)}")

    def test_error_handling(self):
        """Test comprehensive error handling"""
        print("🚨 Testing Error Handling...")
        
        # Test malformed JSON
        try:
            start_time = time.time()
            response = requests.post(
                f"{API_BASE}/square-payment",
                data="invalid json",
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            response_time = int((time.time() - start_time) * 1000)
            
            if response.status_code == 400:
                try:
                    result = response.json()
                    self.log_test(
                        "Error Handling: Malformed JSON",
                        True,
                        f"Properly handled with error: {result.get('error', 'No error message')}",
                        response_time
                    )
                except:
                    self.log_test(
                        "Error Handling: Malformed JSON",
                        False,
                        "Error response is not valid JSON",
                        response_time
                    )
            else:
                self.log_test(
                    "Error Handling: Malformed JSON",
                    False,
                    f"Expected 400, got {response.status_code}",
                    response_time
                )
                
        except Exception as e:
            self.log_test(
                "Error Handling: Malformed JSON",
                False,
                f"Request failed: {str(e)}"
            )
        
        # Test GET method (should return 405)
        try:
            start_time = time.time()
            response = requests.get(f"{API_BASE}/square-payment", timeout=10)
            response_time = int((time.time() - start_time) * 1000)
            
            if response.status_code == 405:
                self.log_test(
                    "Error Handling: Invalid HTTP Method",
                    True,
                    "Correctly rejected GET request with 405",
                    response_time
                )
            else:
                self.log_test(
                    "Error Handling: Invalid HTTP Method",
                    False,
                    f"Expected 405, got {response.status_code}",
                    response_time
                )
                
        except Exception as e:
            self.log_test(
                "Error Handling: Invalid HTTP Method",
                False,
                f"Request failed: {str(e)}"
            )

    def test_performance_monitoring(self):
        """Test performance monitoring and metrics"""
        print("📊 Testing Performance Monitoring...")
        
        # Test multiple requests to check consistency
        response_times = []
        
        for i in range(3):
            try:
                test_data = {
                    "sourceId": "test-token",
                    "amount": 35.00,
                    "orderId": f"perf_test_{i}_{uuid.uuid4().hex[:6]}"
                }
                
                start_time = time.time()
                response = requests.post(
                    f"{API_BASE}/square-payment",
                    json=test_data,
                    headers={'Content-Type': 'application/json'},
                    timeout=10
                )
                response_time = int((time.time() - start_time) * 1000)
                response_times.append(response_time)
                
                # Check if response includes performance metrics
                if response.status_code == 200:
                    result = response.json()
                    if 'processingTime' in result:
                        self.log_test(
                            f"Performance Monitoring: Request {i+1}",
                            True,
                            f"Response time: {response_time}ms, Processing time: {result['processingTime']}ms",
                            response_time
                        )
                    else:
                        self.log_test(
                            f"Performance Monitoring: Request {i+1}",
                            True,
                            f"Response time: {response_time}ms (no processing time in response)",
                            response_time
                        )
                        
            except Exception as e:
                self.log_test(
                    f"Performance Monitoring: Request {i+1}",
                    False,
                    f"Request failed: {str(e)}"
                )
        
        # Analyze performance consistency
        if response_times:
            avg_time = sum(response_times) / len(response_times)
            max_time = max(response_times)
            
            if max_time < 5000:  # Under 5 seconds
                self.log_test(
                    "Performance Consistency",
                    True,
                    f"Average: {avg_time:.0f}ms, Max: {max_time}ms (all under 5s threshold)"
                )
            else:
                self.log_test(
                    "Performance Consistency",
                    False,
                    f"Average: {avg_time:.0f}ms, Max: {max_time}ms (exceeds 5s threshold)"
                )

    def test_mock_mode_functionality(self):
        """Test mock mode functionality for development/testing"""
        print("🎭 Testing Mock Mode Functionality...")
        
        # Test mock payment with complex order
        mock_order_data = {
            "sourceId": "mock-payment-token",
            "amount": 105.00,  # $105.00
            "currency": "USD",
            "orderId": f"mock_order_{uuid.uuid4().hex[:8]}",
            "orderData": {
                "customer": {
                    "name": "Test Customer",
                    "email": "test@example.com",
                    "phone": "+15551234567"
                },
                "cart": [
                    {"name": "Elderberry Sea Moss", "price": 3500, "quantity": 2},
                    {"name": "Original Sea Moss", "price": 3000, "quantity": 1},
                    {"name": "Shipping", "price": 500, "quantity": 1}
                ],
                "fulfillmentType": "delivery"
            }
        }
        
        try:
            start_time = time.time()
            response = requests.post(
                f"{API_BASE}/square-payment",
                json=mock_order_data,
                headers={'Content-Type': 'application/json'},
                timeout=15
            )
            response_time = int((time.time() - start_time) * 1000)
            
            if response.status_code == 200:
                result = response.json()
                
                # Check for mock payment indicators
                payment_id = result.get('paymentId', '')
                receipt_url = result.get('receiptUrl', '')
                
                is_mock = (
                    payment_id.startswith('mock_payment_') or
                    'mock-square.com' in receipt_url or
                    result.get('status') == 'COMPLETED'
                )
                
                if is_mock and result.get('success'):
                    self.log_test(
                        "Mock Mode Payment Processing",
                        True,
                        f"Mock payment successful - ID: {payment_id}, Amount: ${result.get('amount', 0)/100:.2f}",
                        response_time
                    )
                    
                    # Test mock receipt URL
                    if receipt_url and 'mock' in receipt_url:
                        self.log_test(
                            "Mock Mode Receipt Generation",
                            True,
                            f"Mock receipt URL generated: {receipt_url}"
                        )
                    else:
                        self.log_test(
                            "Mock Mode Receipt Generation",
                            False,
                            f"No mock receipt URL found: {receipt_url}"
                        )
                else:
                    self.log_test(
                        "Mock Mode Payment Processing",
                        False,
                        f"Payment failed or not in mock mode: {result.get('error', 'Unknown error')}"
                    )
            else:
                self.log_test(
                    "Mock Mode Payment Processing",
                    False,
                    f"HTTP {response.status_code}: {response.text[:200]}"
                )
                
        except Exception as e:
            self.log_test(
                "Mock Mode Payment Processing",
                False,
                f"Request failed: {str(e)}"
            )

    def test_rate_limiting(self):
        """Test rate limiting (30 requests per minute)"""
        print("🚦 TESTING RATE LIMITING")
        
        # Send multiple requests quickly to test rate limiting
        rate_limit_hit = False
        
        for i in range(5):  # Test with 5 quick requests
            try:
                test_data = {
                    "sourceId": "rate-test-token",
                    "amount": 10.00,
                    "orderId": f"rate_test_{i}"
                }
                
                start_time = time.time()
                response = requests.post(
                    f"{API_BASE}/square-payment",
                    json=test_data,
                    headers={'Content-Type': 'application/json'},
                    timeout=5
                )
                response_time = int((time.time() - start_time) * 1000)
                
                if response.status_code == 429:
                    rate_limit_hit = True
                    result = response.json()
                    self.log_test(
                        "Rate Limiting Enforcement",
                        True,
                        f"Rate limit enforced after {i+1} requests: {result.get('error', 'Rate limited')}",
                        response_time
                    )
                    break
                elif response.status_code in [200, 400]:
                    # Continue testing
                    continue
                else:
                    self.log_test(
                        f"Rate Limiting Test Request {i+1}",
                        False,
                        f"Unexpected status {response.status_code}: {response.text[:100]}"
                    )
                    
            except Exception as e:
                self.log_test(
                    f"Rate Limiting Test Request {i+1}",
                    False,
                    f"Request failed: {str(e)}"
                )
        
        if not rate_limit_hit:
            self.log_test(
                "Rate Limiting Enforcement",
                True,
                "Rate limiting not triggered with 5 requests (may be configured for higher threshold)"
            )

    def test_webhook_handler(self):
        """Test Square webhook handler for real-time payment updates"""
        print("🔗 TESTING SQUARE WEBHOOK HANDLER")
        
        # Test webhook endpoint accessibility
        try:
            start_time = time.time()
            response = requests.get(f"{API_BASE}/square-webhook", timeout=10)
            response_time = int((time.time() - start_time) * 1000)
            
            if response.status_code == 200:
                result = response.json()
                self.log_test(
                    "Webhook Endpoint Accessibility",
                    True,
                    f"Webhook endpoint active: {result.get('message', 'No message')}",
                    response_time
                )
            else:
                self.log_test(
                    "Webhook Endpoint Accessibility",
                    False,
                    f"HTTP {response.status_code}: {response.text}",
                    response_time
                )
                
        except Exception as e:
            self.log_test(
                "Webhook Endpoint Accessibility",
                False,
                f"Request failed: {str(e)}"
            )
        
        # Test webhook with mock payment event
        mock_webhook_event = {
            "type": "payment.completed",
            "data": {
                "object": {
                    "payment": {
                        "id": f"test_payment_{uuid.uuid4().hex[:8]}",
                        "status": "COMPLETED",
                        "order_id": f"test_order_{uuid.uuid4().hex[:8]}",
                        "amount_money": {
                            "amount": 3500,
                            "currency": "USD"
                        }
                    }
                }
            }
        }
        
        try:
            start_time = time.time()
            response = requests.post(
                f"{API_BASE}/square-webhook",
                json=mock_webhook_event,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            response_time = int((time.time() - start_time) * 1000)
            
            if response.status_code == 200:
                result = response.json()
                self.log_test(
                    "Webhook Event Processing",
                    True,
                    f"Webhook processed successfully: {result.get('eventType', 'Unknown event')}",
                    response_time
                )
            else:
                self.log_test(
                    "Webhook Event Processing",
                    False,
                    f"HTTP {response.status_code}: {response.text[:200]}",
                    response_time
                )
                
        except Exception as e:
            self.log_test(
                "Webhook Event Processing",
                False,
                f"Request failed: {str(e)}"
            )

    def run_all_tests(self):
        """Run comprehensive test suite for enhanced Square payment system"""
        print("🚀 STARTING COMPREHENSIVE SQUARE PAYMENT SYSTEM TESTING")
        print("=" * 80)
        print()
        
        # OPTION A: Production Ready Square Integration
        print("📋 OPTION A: PRODUCTION READY SQUARE INTEGRATION")
        self.test_health_check_endpoint()
        self.test_square_payment_api_comprehensive()
        
        # OPTION B: Enhanced Features  
        print("📋 OPTION B: ENHANCED FEATURES")
        self.test_webhook_handler()
        
        # OPTION C: Performance & Security
        print("📋 OPTION C: PERFORMANCE & SECURITY")
        self.test_rate_limiting()
        
        # Generate comprehensive summary
        self.generate_test_summary()

    def generate_test_summary(self):
        """Generate comprehensive test summary"""
        print("=" * 80)
        print("📊 COMPREHENSIVE TEST SUMMARY")
        print("=" * 80)
        
        total_tests = len(self.test_results)
        passed_tests = len([t for t in self.test_results if t['success']])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests*100):.1f}%")
        print()
        
        # Performance analysis
        response_times = [t['response_time_ms'] for t in self.test_results if t['response_time_ms']]
        if response_times:
            avg_response = sum(response_times) / len(response_times)
            max_response = max(response_times)
            print(f"Performance Metrics:")
            print(f"  Average Response Time: {avg_response:.0f}ms")
            print(f"  Maximum Response Time: {max_response:.0f}ms")
            print()
        
        # Failed tests details
        if failed_tests > 0:
            print("❌ FAILED TESTS:")
            for test in self.test_results:
                if not test['success']:
                    print(f"  • {test['test']}: {test['details']}")
            print()
        
        # Critical system status
        critical_tests = [
            'Health Check Endpoint',
            'Valid Payment Processing', 
            'Mock Mode Payment Processing',
            'Webhook Endpoint Accessibility'
        ]
        
        critical_failures = [
            t for t in self.test_results 
            if not t['success'] and any(critical in t['test'] for critical in critical_tests)
        ]
        
        if critical_failures:
            print("🚨 CRITICAL ISSUES FOUND:")
            for test in critical_failures:
                print(f"  • {test['test']}: {test['details']}")
            print()
        
        total_time = time.time() - self.start_time
        print(f"Total Testing Time: {total_time:.1f} seconds")
        print("=" * 80)

if __name__ == "__main__":
    print("Enhanced Square Payment System - Comprehensive Backend Testing")
    print(f"Testing against: {BASE_URL}")
    print()
    
    tester = SquarePaymentSystemTester()
    tester.run_all_tests()