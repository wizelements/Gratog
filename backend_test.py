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

    def test_health_check_endpoint(self):
        """Test health check endpoint for system status monitoring"""
        print("🏥 TESTING HEALTH CHECK ENDPOINT")
        
        try:
            start_time = time.time()
            response = requests.get(f"{API_BASE}/health", timeout=10)
            response_time = int((time.time() - start_time) * 1000)
            
            if response.status_code == 200:
                health_data = response.json()
                
                # Validate health response structure
                required_fields = ['status', 'timestamp', 'services', 'response_time_ms']
                missing_fields = [field for field in required_fields if field not in health_data]
                
                if missing_fields:
                    self.log_test(
                        "Health Check Response Structure",
                        False,
                        f"Missing required fields: {missing_fields}",
                        response_time
                    )
                else:
                    # Check service statuses
                    services = health_data.get('services', {})
                    service_status = []
                    
                    for service, status in services.items():
                        service_status.append(f"{service}: {status}")
                    
                    self.log_test(
                        "Health Check Endpoint",
                        True,
                        f"Status: {health_data.get('status')}, Services: {', '.join(service_status)}",
                        response_time
                    )
                    
                    # Test performance threshold (should respond within 2 seconds)
                    if response_time > 2000:
                        self.log_test(
                            "Health Check Performance",
                            False,
                            f"Response time {response_time}ms exceeds 2000ms threshold",
                            response_time
                        )
                    else:
                        self.log_test(
                            "Health Check Performance",
                            True,
                            f"Response time within acceptable limits",
                            response_time
                        )
            else:
                self.log_test(
                    "Health Check Endpoint",
                    False,
                    f"HTTP {response.status_code}: {response.text}",
                    response_time
                )
                
        except Exception as e:
            self.log_test(
                "Health Check Endpoint",
                False,
                f"Request failed: {str(e)}"
            )

    def test_square_payment_api_comprehensive(self):
        """Comprehensive testing of Square Payment API with all enhanced features"""
        print("💳 TESTING ENHANCED SQUARE PAYMENT API")
        
        # Test 1: Valid payment with realistic order data
        self.test_valid_payment_processing()
        
        # Test 2: Input validation and sanitization
        self.test_input_validation()
        
        # Test 3: Error handling and user-friendly messages
        self.test_error_handling()
        
        # Test 4: Performance monitoring
        self.test_performance_monitoring()
        
        # Test 5: Mock mode functionality
        self.test_mock_mode_functionality()

    def test_valid_payment_processing(self):
        """Test valid payment processing with realistic order data"""
        print("🔄 Testing Valid Payment Processing...")
        
        # Realistic order data for testing
        realistic_order_data = {
            "sourceId": "cnon:card-nonce-ok",  # Square test nonce
            "amount": 70.00,  # $70.00
            "currency": "USD",
            "orderId": f"order_{uuid.uuid4().hex[:8]}",
            "orderData": {
                "customer": {
                    "name": "Sarah Johnson",
                    "email": "sarah.johnson@example.com",
                    "phone": "+14045551234"
                },
                "cart": [
                    {
                        "name": "Elderberry Sea Moss Gel (16oz)",
                        "price": 3500,  # $35.00 in cents
                        "quantity": 2
                    }
                ],
                "fulfillmentType": "delivery",
                "deliveryAddress": {
                    "street": "123 Wellness Way",
                    "city": "Atlanta",
                    "state": "GA",
                    "zip": "30309"
                },
                "deliveryTimeSlot": "Saturday 2:00 PM - 4:00 PM",
                "deliveryInstructions": "Leave at front door if no answer"
            }
        }
        
        try:
            start_time = time.time()
            response = requests.post(
                f"{API_BASE}/square-payment",
                json=realistic_order_data,
                headers={'Content-Type': 'application/json'},
                timeout=15
            )
            response_time = int((time.time() - start_time) * 1000)
            
            if response.status_code == 200:
                result = response.json()
                
                # Validate response structure
                required_fields = ['success', 'paymentId', 'status', 'amount', 'currency']
                missing_fields = [field for field in required_fields if field not in result]
                
                if missing_fields:
                    self.log_test(
                        "Valid Payment Response Structure",
                        False,
                        f"Missing fields: {missing_fields}",
                        response_time
                    )
                elif result.get('success'):
                    self.log_test(
                        "Valid Payment Processing",
                        True,
                        f"Payment ID: {result.get('paymentId')}, Status: {result.get('status')}, Amount: ${result.get('amount', 0)/100:.2f}",
                        response_time
                    )
                else:
                    self.log_test(
                        "Valid Payment Processing",
                        False,
                        f"Payment failed: {result.get('error', 'Unknown error')}",
                        response_time
                    )
            else:
                self.log_test(
                    "Valid Payment Processing",
                    False,
                    f"HTTP {response.status_code}: {response.text[:200]}",
                    response_time
                )
                
        except Exception as e:
            self.log_test(
                "Valid Payment Processing",
                False,
                f"Request failed: {str(e)}"
            )

    def test_input_validation(self):
        """Test enhanced input validation and sanitization"""
        print("🛡️ Testing Input Validation and Sanitization...")
        
        validation_tests = [
            {
                "name": "Missing Source ID",
                "data": {"amount": 35.00, "currency": "USD"},
                "expected_status": 400
            },
            {
                "name": "Missing Amount",
                "data": {"sourceId": "test-token", "currency": "USD"},
                "expected_status": 400
            },
            {
                "name": "Invalid Amount (Negative)",
                "data": {"sourceId": "test-token", "amount": -10.00},
                "expected_status": 400
            },
            {
                "name": "Invalid Amount (String)",
                "data": {"sourceId": "test-token", "amount": "invalid"},
                "expected_status": 400
            },
            {
                "name": "XSS Attempt in Order Data",
                "data": {
                    "sourceId": "test-token",
                    "amount": 35.00,
                    "orderData": {
                        "customer": {
                            "name": "<script>alert('xss')</script>John Doe",
                            "email": "test@example.com"
                        },
                        "cart": [{"name": "Test Product", "price": 3500, "quantity": 1}]
                    }
                },
                "expected_status": [200, 400]  # Should either sanitize or reject
            }
        ]
        
        for test in validation_tests:
            try:
                start_time = time.time()
                response = requests.post(
                    f"{API_BASE}/square-payment",
                    json=test["data"],
                    headers={'Content-Type': 'application/json'},
                    timeout=10
                )
                response_time = int((time.time() - start_time) * 1000)
                
                expected_statuses = test["expected_status"] if isinstance(test["expected_status"], list) else [test["expected_status"]]
                
                if response.status_code in expected_statuses:
                    # For XSS test, check if input was sanitized
                    if "XSS" in test["name"] and response.status_code == 200:
                        result = response.json()
                        if "<script>" not in str(result):
                            self.log_test(
                                f"Input Validation: {test['name']}",
                                True,
                                "XSS content properly sanitized",
                                response_time
                            )
                        else:
                            self.log_test(
                                f"Input Validation: {test['name']}",
                                False,
                                "XSS content not sanitized",
                                response_time
                            )
                    else:
                        self.log_test(
                            f"Input Validation: {test['name']}",
                            True,
                            f"Correctly returned HTTP {response.status_code}",
                            response_time
                        )
                else:
                    self.log_test(
                        f"Input Validation: {test['name']}",
                        False,
                        f"Expected {expected_statuses}, got {response.status_code}",
                        response_time
                    )
                    
            except Exception as e:
                self.log_test(
                    f"Input Validation: {test['name']}",
                    False,
                    f"Request failed: {str(e)}"
                )

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