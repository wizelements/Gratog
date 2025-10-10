#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Taste of Gratitude E-commerce
Focus: Square Payment Integration Mock Mode Testing
"""

import requests
import json
import time
from datetime import datetime

# Configuration
BASE_URL = "https://taste-ecommerce.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

def log_test(test_name, status, details=""):
    """Log test results with timestamp"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    status_emoji = "✅" if status == "PASS" else "❌" if status == "FAIL" else "⚠️"
    print(f"[{timestamp}] {status_emoji} {test_name}: {status}")
    if details:
        print(f"    Details: {details}")
    print()

def test_square_payment_mock_mode():
    """Test Square Payment API in Mock Mode - Comprehensive Testing"""
    print("🟦 TESTING SQUARE PAYMENT API MOCK MODE")
    print("=" * 60)
    
    # Test 1: Valid Mock Payment Processing
    print("Test 1: Valid Mock Payment Processing")
    try:
        valid_payment_data = {
            "sourceId": "cnon:card-nonce-ok",  # Square test nonce
            "amount": 35.00,
            "currency": "USD",
            "orderId": f"ORDER_{int(time.time())}",
            "buyerDetails": {
                "name": "Sarah Johnson",
                "email": "sarah.johnson@example.com",
                "phone": "+1-555-0123"
            },
            "orderData": {
                "items": [
                    {
                        "name": "Elderberry Sea Moss 16oz",
                        "price": 35.00,
                        "quantity": 1
                    }
                ],
                "fulfillment": {
                    "type": "pickup",
                    "location": "Serenbe Farmers Market"
                }
            }
        }
        
        response = requests.post(
            f"{API_BASE}/square-payment",
            json=valid_payment_data,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            if (data.get("success") and 
                data.get("paymentId") and 
                data.get("paymentId").startswith("mock_payment_") and
                data.get("status") == "COMPLETED" and
                data.get("amount") == 3500 and  # 35.00 in cents
                data.get("currency") == "USD"):
                log_test("Valid Mock Payment", "PASS", 
                        f"Payment ID: {data.get('paymentId')}, Amount: ${data.get('amount')/100:.2f}")
            else:
                log_test("Valid Mock Payment", "FAIL", 
                        f"Invalid response structure: {data}")
        else:
            log_test("Valid Mock Payment", "FAIL", 
                    f"Status: {response.status_code}, Response: {response.text}")
            
    except Exception as e:
        log_test("Valid Mock Payment", "FAIL", f"Exception: {str(e)}")
    
    # Test 2: Multiple Product Mock Payment
    print("Test 2: Multiple Product Mock Payment")
    try:
        multi_product_data = {
            "sourceId": "cnon:card-nonce-ok",
            "amount": 100.00,  # 3 products
            "currency": "USD",
            "orderId": f"ORDER_MULTI_{int(time.time())}",
            "buyerDetails": {
                "name": "Michael Chen",
                "email": "michael.chen@example.com",
                "phone": "+1-555-0456"
            },
            "orderData": {
                "items": [
                    {"name": "Elderberry Sea Moss 16oz", "price": 35.00, "quantity": 1},
                    {"name": "Original Sea Moss 16oz", "price": 30.00, "quantity": 1},
                    {"name": "Ginger Turmeric Sea Moss 16oz", "price": 35.00, "quantity": 1}
                ],
                "fulfillment": {
                    "type": "delivery",
                    "address": {
                        "street": "123 Wellness Ave",
                        "city": "Atlanta",
                        "state": "GA",
                        "zip": "30309"
                    }
                }
            }
        }
        
        response = requests.post(
            f"{API_BASE}/square-payment",
            json=multi_product_data,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            if (data.get("success") and 
                data.get("paymentId") and 
                data.get("status") == "COMPLETED" and
                data.get("amount") == 10000):  # 100.00 in cents
                log_test("Multiple Product Mock Payment", "PASS", 
                        f"Payment ID: {data.get('paymentId')}, Total: ${data.get('amount')/100:.2f}")
            else:
                log_test("Multiple Product Mock Payment", "FAIL", 
                        f"Invalid response: {data}")
        else:
            log_test("Multiple Product Mock Payment", "FAIL", 
                    f"Status: {response.status_code}")
            
    except Exception as e:
        log_test("Multiple Product Mock Payment", "FAIL", f"Exception: {str(e)}")
    
    # Test 3: Mock Payment with Delivery Order
    print("Test 3: Mock Payment with Delivery Order")
    try:
        delivery_order_data = {
            "sourceId": "cnon:card-nonce-ok",
            "amount": 70.00,
            "currency": "USD",
            "orderId": f"ORDER_DELIVERY_{int(time.time())}",
            "buyerDetails": {
                "name": "Emma Rodriguez",
                "email": "emma.rodriguez@example.com",
                "phone": "+1-555-0789"
            },
            "orderData": {
                "items": [
                    {"name": "Blueberry Sea Moss 16oz", "price": 35.00, "quantity": 2}
                ],
                "fulfillment": {
                    "type": "delivery",
                    "address": {
                        "street": "456 Health Street",
                        "city": "Decatur",
                        "state": "GA",
                        "zip": "30030"
                    },
                    "deliveryInstructions": "Leave at front door"
                }
            }
        }
        
        response = requests.post(
            f"{API_BASE}/square-payment",
            json=delivery_order_data,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            if (data.get("success") and 
                data.get("paymentId") and 
                data.get("status") == "COMPLETED"):
                log_test("Delivery Order Mock Payment", "PASS", 
                        f"Payment processed for delivery order: {data.get('paymentId')}")
            else:
                log_test("Delivery Order Mock Payment", "FAIL", 
                        f"Invalid response: {data}")
        else:
            log_test("Delivery Order Mock Payment", "FAIL", 
                    f"Status: {response.status_code}")
            
    except Exception as e:
        log_test("Delivery Order Mock Payment", "FAIL", f"Exception: {str(e)}")
    
    # Test 4: Mock Payment Response Format Validation
    print("Test 4: Mock Payment Response Format Validation")
    try:
        format_test_data = {
            "sourceId": "cnon:card-nonce-ok",
            "amount": 30.00,
            "currency": "USD",
            "orderId": f"ORDER_FORMAT_{int(time.time())}"
        }
        
        response = requests.post(
            f"{API_BASE}/square-payment",
            json=format_test_data,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            required_fields = ["success", "paymentId", "orderId", "status", "amount", "currency"]
            missing_fields = [field for field in required_fields if field not in data]
            
            if not missing_fields and data.get("success") == True:
                log_test("Mock Response Format", "PASS", 
                        f"All required fields present: {required_fields}")
            else:
                log_test("Mock Response Format", "FAIL", 
                        f"Missing fields: {missing_fields}, Response: {data}")
        else:
            log_test("Mock Response Format", "FAIL", 
                    f"Status: {response.status_code}")
            
    except Exception as e:
        log_test("Mock Response Format", "FAIL", f"Exception: {str(e)}")
    
    # Test 5: Input Validation Still Works in Mock Mode
    print("Test 5: Input Validation in Mock Mode")
    try:
        # Test missing sourceId
        invalid_data = {
            "amount": 35.00,
            "currency": "USD"
        }
        
        response = requests.post(
            f"{API_BASE}/square-payment",
            json=invalid_data,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        if response.status_code == 400:
            data = response.json()
            if not data.get("success") and "sourceId" in data.get("error", ""):
                log_test("Mock Mode Input Validation", "PASS", 
                        "Missing sourceId properly rejected with 400")
            else:
                log_test("Mock Mode Input Validation", "FAIL", 
                        f"Unexpected error response: {data}")
        else:
            log_test("Mock Mode Input Validation", "FAIL", 
                    f"Expected 400, got {response.status_code}")
            
    except Exception as e:
        log_test("Mock Mode Input Validation", "FAIL", f"Exception: {str(e)}")
    
    # Test 6: Mock Mode Performance Test
    print("Test 6: Mock Mode Performance Test")
    try:
        start_time = time.time()
        
        performance_data = {
            "sourceId": "cnon:card-nonce-ok",
            "amount": 35.00,
            "currency": "USD",
            "orderId": f"ORDER_PERF_{int(time.time())}"
        }
        
        response = requests.post(
            f"{API_BASE}/square-payment",
            json=performance_data,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        end_time = time.time()
        response_time = end_time - start_time
        
        if response.status_code == 200 and response_time < 10.0:  # Should be reasonably fast in mock mode
            data = response.json()
            if data.get("success"):
                log_test("Mock Mode Performance", "PASS", 
                        f"Response time: {response_time:.2f}s (under 10s threshold)")
            else:
                log_test("Mock Mode Performance", "FAIL", 
                        f"Payment failed: {data}")
        else:
            log_test("Mock Mode Performance", "FAIL", 
                    f"Slow response: {response_time:.2f}s or error: {response.status_code}")
            
    except Exception as e:
        log_test("Mock Mode Performance", "FAIL", f"Exception: {str(e)}")
    
    # Test 7: Error Handling in Mock Mode
    print("Test 7: Error Handling in Mock Mode")
    try:
        # Test invalid amount
        error_test_data = {
            "sourceId": "cnon:card-nonce-ok",
            "amount": -10.00,  # Invalid negative amount
            "currency": "USD"
        }
        
        response = requests.post(
            f"{API_BASE}/square-payment",
            json=error_test_data,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        if response.status_code == 400:
            data = response.json()
            if not data.get("success") and "amount" in data.get("error", "").lower():
                log_test("Mock Mode Error Handling", "PASS", 
                        "Invalid amount properly rejected")
            else:
                log_test("Mock Mode Error Handling", "FAIL", 
                        f"Unexpected error response: {data}")
        else:
            log_test("Mock Mode Error Handling", "FAIL", 
                    f"Expected 400, got {response.status_code}")
            
    except Exception as e:
        log_test("Mock Mode Error Handling", "FAIL", f"Exception: {str(e)}")
    
    # Test 8: Mock Receipt URL Generation
    print("Test 8: Mock Receipt URL Generation")
    try:
        receipt_test_data = {
            "sourceId": "cnon:card-nonce-ok",
            "amount": 35.00,
            "currency": "USD",
            "orderId": f"ORDER_RECEIPT_{int(time.time())}"
        }
        
        response = requests.post(
            f"{API_BASE}/square-payment",
            json=receipt_test_data,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            receipt_url = data.get("receiptUrl", "")
            if receipt_url and "mock-square.com/receipt/" in receipt_url:
                log_test("Mock Receipt URL", "PASS", 
                        f"Mock receipt URL generated: {receipt_url}")
            else:
                log_test("Mock Receipt URL", "FAIL", 
                        f"Invalid or missing receipt URL: {receipt_url}")
        else:
            log_test("Mock Receipt URL", "FAIL", 
                    f"Status: {response.status_code}")
            
    except Exception as e:
        log_test("Mock Receipt URL", "FAIL", f"Exception: {str(e)}")
def test_square_payment_validation():
    """Test Square Payment API Input Validation"""
    print("🔍 TESTING SQUARE PAYMENT VALIDATION")
    print("=" * 60)
    
    test_cases = [
        {
            "name": "Missing sourceId",
            "data": {"amount": 36.00, "currency": "USD"},
            "expected_status": 400,
            "should_pass": True
        },
        {
            "name": "Missing amount",
            "data": {"sourceId": SQUARE_TEST_TOKENS["valid"], "currency": "USD"},
            "expected_status": 400,
            "should_pass": True
        },
        {
            "name": "Invalid negative amount",
            "data": {"sourceId": SQUARE_TEST_TOKENS["valid"], "amount": -10.00},
            "expected_status": 400,
            "should_pass": True
        },
        {
            "name": "Invalid string amount",
            "data": {"sourceId": SQUARE_TEST_TOKENS["valid"], "amount": "invalid"},
            "expected_status": 400,
            "should_pass": True
        },
        {
            "name": "Zero amount",
            "data": {"sourceId": SQUARE_TEST_TOKENS["valid"], "amount": 0},
            "expected_status": 400,
            "should_pass": True
        }
    ]
    
    passed_tests = 0
    total_tests = len(test_cases)
    
    for test_case in test_cases:
        try:
            response = requests.post(f"{API_BASE}/square-payment", json=test_case["data"], timeout=15)
            
            if response.status_code == test_case["expected_status"]:
                try:
                    result = response.json()
                    if "error" in result:
                        log_test(f"Validation: {test_case['name']}", "PASS", 
                                f"Correctly rejected with: {result['error']}")
                        passed_tests += 1
                    else:
                        log_test(f"Validation: {test_case['name']}", "FAIL", 
                                "Expected error message in response")
                except:
                    log_test(f"Validation: {test_case['name']}", "FAIL", 
                            "Invalid JSON response")
            else:
                log_test(f"Validation: {test_case['name']}", "FAIL", 
                        f"Expected status {test_case['expected_status']}, got {response.status_code}")
                
        except Exception as e:
            log_test(f"Validation: {test_case['name']}", "FAIL", f"Exception: {str(e)}")
    
    log_test("Square Payment Validation Summary", 
             "PASS" if passed_tests == total_tests else "FAIL",
             f"{passed_tests}/{total_tests} validation tests passed")
    
    return passed_tests == total_tests
def test_square_payment_error_handling():
    """Test Square Payment API Error Handling"""
    print("🚨 TESTING SQUARE PAYMENT ERROR HANDLING")
    print("=" * 60)
    
    test_cases = [
        {
            "name": "Declined card token",
            "data": {
                "sourceId": SQUARE_TEST_TOKENS["declined"],
                "amount": 36.00,
                "currency": "USD"
            },
            "expected_behavior": "Should return proper error response"
        },
        {
            "name": "Invalid card token",
            "data": {
                "sourceId": "invalid-token-12345",
                "amount": 36.00,
                "currency": "USD"
            },
            "expected_behavior": "Should handle invalid token gracefully"
        },
        {
            "name": "Malformed JSON",
            "data": "invalid-json",
            "expected_behavior": "Should return 400 with JSON error"
        }
    ]
    
    passed_tests = 0
    total_tests = len(test_cases)
    
    for test_case in test_cases:
        try:
            if test_case["name"] == "Malformed JSON":
                # Send malformed JSON
                response = requests.post(f"{API_BASE}/square-payment", 
                                       data="invalid-json", 
                                       headers={"Content-Type": "application/json"},
                                       timeout=15)
            else:
                response = requests.post(f"{API_BASE}/square-payment", 
                                       json=test_case["data"], 
                                       timeout=15)
            
            # Check if response is valid JSON
            try:
                result = response.json()
                if "error" in result or "success" in result:
                    log_test(f"Error Handling: {test_case['name']}", "PASS", 
                            f"Proper JSON response: {result.get('error', result.get('success'))}")
                    passed_tests += 1
                else:
                    log_test(f"Error Handling: {test_case['name']}", "FAIL", 
                            "Response missing error/success field")
            except:
                log_test(f"Error Handling: {test_case['name']}", "FAIL", 
                        "Invalid JSON response")
                
        except Exception as e:
            log_test(f"Error Handling: {test_case['name']}", "FAIL", f"Exception: {str(e)}")
    
    log_test("Square Payment Error Handling Summary", 
             "PASS" if passed_tests == total_tests else "FAIL",
             f"{passed_tests}/{total_tests} error handling tests passed")
    
    return passed_tests == total_tests

def test_square_payment_method_validation():
    """Test Square Payment API Method Validation"""
    print("🔧 TESTING SQUARE PAYMENT METHOD VALIDATION")
    print("=" * 60)
    
    try:
        # Test GET method (should be rejected)
        response = requests.get(f"{API_BASE}/square-payment", timeout=10)
        
        if response.status_code == 405:
            try:
                result = response.json()
                if "error" in result:
                    log_test("Method Validation: GET Request", "PASS", 
                            f"Correctly rejected GET with: {result['error']}")
                    return True
                else:
                    log_test("Method Validation: GET Request", "FAIL", 
                            "Missing error message in 405 response")
                    return False
            except:
                log_test("Method Validation: GET Request", "FAIL", 
                        "Invalid JSON in 405 response")
                return False
        else:
            log_test("Method Validation: GET Request", "FAIL", 
                    f"Expected 405, got {response.status_code}")
            return False
            
    except Exception as e:
        log_test("Method Validation: GET Request", "FAIL", f"Exception: {str(e)}")
        return False

def test_square_payment_comprehensive():
    """Comprehensive Square Payment Integration Test"""
    print("🎯 COMPREHENSIVE SQUARE PAYMENT INTEGRATION TEST")
    print("=" * 60)
    
    # Test with realistic order data
    comprehensive_order = {
        "sourceId": SQUARE_TEST_TOKENS["valid"],
        "amount": 36.00,  # Elderberry moss price
        "currency": "USD",
        "orderId": "comprehensive-test-001",
        "buyerDetails": {
            "name": "Maria Santos",
            "email": "maria.santos@example.com",
            "phone": "+1-404-555-0199"
        },
        "orderData": {
            "items": [
                {
                    "id": ELDERBERRY_PRODUCT["id"],
                    "name": ELDERBERRY_PRODUCT["name"],
                    "price": ELDERBERRY_PRODUCT["price"],
                    "quantity": 1,
                    "description": "Elderberry Moss Gels combine the natural benefits of sea moss and elderberry"
                }
            ],
            "customerInfo": {
                "name": "Maria Santos",
                "email": "maria.santos@example.com",
                "phone": "+1-404-555-0199",
                "address": {
                    "street": "123 Wellness Way",
                    "city": "Atlanta",
                    "state": "GA",
                    "zipCode": "30309"
                }
            },
            "fulfillment": {
                "type": "pickup",
                "location": "Serenbe Farmers Market",
                "scheduledDate": "2024-12-21",
                "notes": "Please have order ready by 10 AM"
            },
            "notifications": {
                "sms": True,
                "email": True
            }
        }
    }
    
    try:
        print(f"Processing comprehensive order for {comprehensive_order['buyerDetails']['name']}")
        print(f"Product: {ELDERBERRY_PRODUCT['name']} - ${comprehensive_order['amount']}")
        
        response = requests.post(f"{API_BASE}/square-payment", json=comprehensive_order, timeout=30)
        
        if response.status_code == 200:
            result = response.json()
            if result.get("success"):
                log_test("Comprehensive Square Payment", "PASS", 
                        f"Full order processed successfully. Payment ID: {result.get('paymentId', 'N/A')}")
                
                # Verify response structure
                required_fields = ["paymentId", "status", "amount", "currency"]
                missing_fields = [field for field in required_fields if field not in result]
                
                if not missing_fields:
                    log_test("Response Structure Validation", "PASS", 
                            "All required fields present in response")
                    return True
                else:
                    log_test("Response Structure Validation", "FAIL", 
                            f"Missing fields: {missing_fields}")
                    return False
            else:
                log_test("Comprehensive Square Payment", "FAIL", 
                        f"Payment failed: {result.get('error', 'Unknown error')}")
                return False
        else:
            try:
                error_data = response.json()
                log_test("Comprehensive Square Payment", "FAIL", 
                        f"HTTP {response.status_code}: {error_data.get('error', 'Unknown error')}")
            except:
                log_test("Comprehensive Square Payment", "FAIL", 
                        f"HTTP {response.status_code}: {response.text[:200]}")
            return False
            
    except requests.exceptions.Timeout:
        log_test("Comprehensive Square Payment", "FAIL", "Request timeout (30s)")
        return False
    except Exception as e:
        log_test("Comprehensive Square Payment", "FAIL", f"Exception: {str(e)}")
        return False

def main():
    """Run all Square Payment Integration tests"""
    print("🟦 SQUARE PAYMENT INTEGRATION TESTING")
    print("Updated Credentials Testing for Taste of Gratitude E-commerce")
    print("=" * 80)
    print(f"Testing against: {API_BASE}")
    print(f"Target product: {ELDERBERRY_PRODUCT['name']} (${ELDERBERRY_PRODUCT['price']/100:.2f})")
    print("=" * 80)
    print()
    
    # Track test results
    test_results = []
    
    # Run all tests
    test_results.append(("Authentication", test_square_payment_authentication()))
    test_results.append(("Validation", test_square_payment_validation()))
    test_results.append(("Error Handling", test_square_payment_error_handling()))
    test_results.append(("Method Validation", test_square_payment_method_validation()))
    test_results.append(("Comprehensive Test", test_square_payment_comprehensive()))
    
    # Summary
    print("🏁 SQUARE PAYMENT TESTING SUMMARY")
    print("=" * 60)
    
    passed_tests = sum(1 for _, result in test_results if result)
    total_tests = len(test_results)
    
    for test_name, result in test_results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} {test_name}")
    
    print()
    print(f"Overall Result: {passed_tests}/{total_tests} tests passed")
    
    if passed_tests == total_tests:
        print("🎉 ALL SQUARE PAYMENT TESTS PASSED!")
        print("✅ Square authentication with updated credentials working")
        print("✅ Payment processing functional")
        print("✅ Error handling working correctly")
        print("✅ API validation working properly")
    else:
        print("⚠️  Some Square payment tests failed")
        print("❌ Review failed tests above for details")
    
    print("=" * 60)
    return passed_tests == total_tests

if __name__ == "__main__":
    main()