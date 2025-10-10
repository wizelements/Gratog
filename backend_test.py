#!/usr/bin/env python3
"""
Comprehensive Backend Testing for Taste of Gratitude E-commerce
Focus: Square Payment Integration with Updated Credentials
"""

import requests
import json
import time
import os
from datetime import datetime

# Configuration
BASE_URL = "https://taste-ecommerce.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

# Test data for elderberry moss product ($36.00 as specified in review request)
ELDERBERRY_PRODUCT = {
    "id": "elderberry-moss",
    "name": "Elderberry Moss",
    "price": 3600  # $36.00 in cents
}

# Square test tokens for sandbox testing
SQUARE_TEST_TOKENS = {
    "valid": "cnon:card-nonce-ok",
    "declined": "cnon:card-nonce-declined",
    "invalid": "cnon:invalid-card-nonce"
}

def log_test(test_name, status, details=""):
    """Log test results with timestamp"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    status_emoji = "✅" if status == "PASS" else "❌" if status == "FAIL" else "⚠️"
    print(f"[{timestamp}] {status_emoji} {test_name}: {status}")
    if details:
        print(f"    Details: {details}")
    print()

def test_square_payment_authentication():
    """Test Square Payment API Authentication with Updated Credentials"""
    print("🔐 TESTING SQUARE PAYMENT AUTHENTICATION")
    print("=" * 60)
    
    # Test 1: Valid payment with Square test token
    try:
        payment_data = {
            "sourceId": SQUARE_TEST_TOKENS["valid"],
            "amount": 36.00,  # Elderberry moss price
            "currency": "USD",
            "orderId": "test-order-001",
            "buyerDetails": {
                "name": "Emma Rodriguez",
                "email": "emma.rodriguez@example.com",
                "phone": "+1-555-0123"
            },
            "orderData": {
                "items": [
                    {
                        "id": ELDERBERRY_PRODUCT["id"],
                        "name": ELDERBERRY_PRODUCT["name"],
                        "price": ELDERBERRY_PRODUCT["price"],
                        "quantity": 1
                    }
                ],
                "customerInfo": {
                    "name": "Emma Rodriguez",
                    "email": "emma.rodriguez@example.com",
                    "phone": "+1-555-0123"
                },
                "fulfillment": {
                    "type": "pickup",
                    "location": "Serenbe Farmers Market"
                }
            }
        }
        
        print(f"Testing payment processing with amount: ${payment_data['amount']}")
        response = requests.post(f"{API_BASE}/square-payment", json=payment_data, timeout=30)
        
        if response.status_code == 200:
            result = response.json()
            if result.get("success"):
                log_test("Square Payment Authentication", "PASS", 
                        f"Payment processed successfully. Payment ID: {result.get('paymentId', 'N/A')}")
                return True
            else:
                log_test("Square Payment Authentication", "FAIL", 
                        f"Payment failed: {result.get('error', 'Unknown error')}")
                return False
        else:
            try:
                error_data = response.json()
                log_test("Square Payment Authentication", "FAIL", 
                        f"HTTP {response.status_code}: {error_data.get('error', 'Unknown error')}")
            except:
                log_test("Square Payment Authentication", "FAIL", 
                        f"HTTP {response.status_code}: {response.text[:200]}")
            return False
            
    except requests.exceptions.Timeout:
        log_test("Square Payment Authentication", "FAIL", "Request timeout (30s)")
        return False
    except Exception as e:
        log_test("Square Payment Authentication", "FAIL", f"Exception: {str(e)}")
        return False
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
def test_missing_source_id():
    """Test missing sourceId validation"""
    print("\n🧪 Testing Missing SourceId Validation...")
    
    payload = {
        "amount": 25.00,
        "currency": "USD"
    }
    
    try:
        response = requests.post(
            SQUARE_API_URL,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        print(f"   Status Code: {response.status_code}")
        
        # Test JSON format
        if not test_json_response_format(response, "Missing SourceId"):
            return False
            
        data = response.json()
        print(f"   Response: {json.dumps(data, indent=2)}")
        
        # Should return 400 with proper error message
        if response.status_code == 400 and data.get('success') == False:
            if 'sourceId' in data.get('error', '').lower():
                print("✅ Missing sourceId validation test passed")
                return True
            else:
                print("❌ Error message doesn't mention sourceId")
                return False
        else:
            print(f"❌ Expected 400 status with error, got {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Request failed: {str(e)}")
        return False
def test_missing_amount():
    """Test missing amount validation"""
    print("\n🧪 Testing Missing Amount Validation...")
    
    payload = {
        "sourceId": "cnon:card-nonce-ok",
        "currency": "USD"
    }
    
    try:
        response = requests.post(
            SQUARE_API_URL,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        print(f"   Status Code: {response.status_code}")
        
        # Test JSON format
        if not test_json_response_format(response, "Missing Amount"):
            return False
            
        data = response.json()
        print(f"   Response: {json.dumps(data, indent=2)}")
        
        # Should return 400 with proper error message
        if response.status_code == 400 and data.get('success') == False:
            if 'amount' in data.get('error', '').lower():
                print("✅ Missing amount validation test passed")
                return True
            else:
                print("❌ Error message doesn't mention amount")
                return False
        else:
            print(f"❌ Expected 400 status with error, got {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Request failed: {str(e)}")
        return False

def test_invalid_amount():
    """Test invalid amount validation"""
    print("\n🧪 Testing Invalid Amount Validation...")
    
    payload = {
        "sourceId": "cnon:card-nonce-ok",
        "amount": "invalid",
        "currency": "USD"
    }
    
    try:
        response = requests.post(
            SQUARE_API_URL,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        print(f"   Status Code: {response.status_code}")
        
        # Test JSON format
        if not test_json_response_format(response, "Invalid Amount"):
            return False
            
        data = response.json()
        print(f"   Response: {json.dumps(data, indent=2)}")
        
        # Should return 400 with proper error message
        if response.status_code == 400 and data.get('success') == False:
            print("✅ Invalid amount validation test passed")
            return True
        else:
            print(f"❌ Expected 400 status with error, got {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Request failed: {str(e)}")
        return False

def test_malformed_json():
    """Test malformed request body handling"""
    print("\n🧪 Testing Malformed JSON Handling...")
    
    malformed_json = '{"sourceId": "test", "amount": 25.00'  # Missing closing brace
    
    try:
        response = requests.post(
            SQUARE_API_URL,
            data=malformed_json,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        print(f"   Status Code: {response.status_code}")
        
        # Test JSON format - this is critical for the fix
        if not test_json_response_format(response, "Malformed JSON"):
            return False
            
        data = response.json()
        print(f"   Response: {json.dumps(data, indent=2)}")
        
        # Should return 400 with proper error message
        if response.status_code == 400 and data.get('success') == False:
            if 'invalid' in data.get('error', '').lower() or 'format' in data.get('error', '').lower():
                print("✅ Malformed JSON handling test passed")
                return True
            else:
                print("❌ Error message doesn't indicate format issue")
                return False
        else:
            print(f"❌ Expected 400 status with error, got {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Request failed: {str(e)}")
        return False

def test_square_api_error_simulation():
    """Test Square API error simulation with invalid card"""
    print("\n🧪 Testing Square API Error Simulation...")
    
    payload = {
        "sourceId": "cnon:card-nonce-declined",  # Square sandbox declined token
        "amount": 35.00,
        "currency": "USD",
        "orderId": "test-order-declined"
    }
    
    try:
        response = requests.post(
            SQUARE_API_URL,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        print(f"   Status Code: {response.status_code}")
        
        # Test JSON format - critical for error responses
        if not test_json_response_format(response, "Square API Error"):
            return False
            
        data = response.json()
        print(f"   Response: {json.dumps(data, indent=2)}")
        
        # Should return error with proper JSON structure
        if data.get('success') == False and 'error' in data:
            print("✅ Square API error simulation test passed")
            return True
        else:
            print("❌ Invalid error response structure")
            return False
            
    except Exception as e:
        print(f"❌ Request failed: {str(e)}")
        return False

def test_get_method_not_allowed():
    """Test GET method returns proper JSON error"""
    print("\n🧪 Testing GET Method Not Allowed...")
    
    try:
        response = requests.get(SQUARE_API_URL, timeout=10)
        
        print(f"   Status Code: {response.status_code}")
        
        # Test JSON format
        if not test_json_response_format(response, "GET Method"):
            return False
            
        data = response.json()
        print(f"   Response: {json.dumps(data, indent=2)}")
        
        # Should return 405 with proper error message
        if response.status_code == 405 and 'error' in data:
            if 'method' in data.get('error', '').lower():
                print("✅ GET method not allowed test passed")
                return True
            else:
                print("❌ Error message doesn't mention method")
                return False
        else:
            print(f"❌ Expected 405 status, got {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Request failed: {str(e)}")
        return False

def test_api_stability():
    """Test multiple requests for consistent behavior"""
    print("\n🧪 Testing API Stability (Multiple Requests)...")
    
    payload = {
        "sourceId": "cnon:card-nonce-ok",
        "amount": 15.00,
        "currency": "USD",
        "orderId": "stability-test"
    }
    
    success_count = 0
    total_requests = 3
    
    for i in range(total_requests):
        try:
            print(f"   Request {i+1}/{total_requests}...")
            response = requests.post(
                SQUARE_API_URL,
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=30
            )
            
            # Test JSON format for each request
            if test_json_response_format(response, f"Stability Test {i+1}"):
                success_count += 1
                
            # Add small delay between requests
            time.sleep(1)
            
        except Exception as e:
            print(f"❌ Request {i+1} failed: {str(e)}")
    
    if success_count == total_requests:
        print(f"✅ API stability test passed ({success_count}/{total_requests} requests successful)")
        return True
    else:
        print(f"❌ API stability test failed ({success_count}/{total_requests} requests successful)")
        return False

def run_comprehensive_tests():
    """Run all Square Payment API tests"""
    print("🚀 Starting Comprehensive Square Payment API Testing")
    print("=" * 60)
    print(f"Testing API: {SQUARE_API_URL}")
    print("Focus: JSON parsing error fix validation")
    print("=" * 60)
    
    tests = [
        ("Valid Payment Request", test_valid_payment_request),
        ("Missing SourceId Validation", test_missing_source_id),
        ("Missing Amount Validation", test_missing_amount),
        ("Invalid Amount Validation", test_invalid_amount),
        ("Malformed JSON Handling", test_malformed_json),
        ("Square API Error Simulation", test_square_api_error_simulation),
        ("GET Method Not Allowed", test_get_method_not_allowed),
        ("API Stability", test_api_stability)
    ]
    
    passed_tests = 0
    total_tests = len(tests)
    
    for test_name, test_func in tests:
        try:
            if test_func():
                passed_tests += 1
        except Exception as e:
            print(f"❌ {test_name}: Unexpected error - {str(e)}")
    
    print("\n" + "=" * 60)
    print("🏁 SQUARE PAYMENT API TEST RESULTS")
    print("=" * 60)
    print(f"Total Tests: {total_tests}")
    print(f"Passed: {passed_tests}")
    print(f"Failed: {total_tests - passed_tests}")
    print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
    
    if passed_tests == total_tests:
        print("\n🎉 ALL TESTS PASSED! JSON parsing fix is working correctly.")
        print("✅ No 'Unexpected end of JSON input' errors found")
        print("✅ All responses are properly formatted JSON")
        print("✅ Error handling returns valid JSON responses")
        print("✅ API stability confirmed with consistent behavior")
        return True
    else:
        print(f"\n⚠️  {total_tests - passed_tests} test(s) failed. JSON parsing issues may still exist.")
        return False

if __name__ == "__main__":
    success = run_comprehensive_tests()
    exit(0 if success else 1)