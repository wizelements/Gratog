#!/usr/bin/env python3
"""
Delivery Fee Calculation Integration Testing
Tests the delivery fee calculation in order creation API
"""

import requests
import json
import sys
from datetime import datetime

# Backend URL
BASE_URL = "https://gratog-payments.preview.emergentagent.com/api"

# Headers for CSRF protection
HEADERS = {
    "Origin": "https://gratog-payments.preview.emergentagent.com",
    "Content-Type": "application/json"
}

# Test results tracking
tests_passed = 0
tests_failed = 0
test_results = []

def log_test(test_name, passed, message=""):
    """Log test result"""
    global tests_passed, tests_failed
    status = "✅ PASS" if passed else "❌ FAIL"
    result = f"{status}: {test_name}"
    if message:
        result += f" - {message}"
    print(result)
    test_results.append({"test": test_name, "passed": passed, "message": message})
    if passed:
        tests_passed += 1
    else:
        tests_failed += 1

def test_delivery_fee_below_threshold():
    """Test 1: Order with subtotal < $75 should have $6.99 delivery fee"""
    print("\n=== Test 1: Delivery Fee for Order < $75 (Subtotal: $36) ===")
    
    payload = {
        "cart": [
            {"id": "test-1", "name": "Test Product", "price": 36, "quantity": 1}
        ],
        "customer": {
            "name": "Test User",
            "email": "test@example.com",
            "phone": "555-1234"
        },
        "fulfillmentType": "delivery",
        "deliveryAddress": {
            "street": "123 Main St",
            "city": "Atlanta",
            "state": "GA",
            "zip": "30310"
        },
        "deliveryTimeSlot": "09:00-12:00",
        "deliveryTip": 0
    }
    
    try:
        response = requests.post(f"{BASE_URL}/orders/create", json=payload, headers=HEADERS, timeout=10)
        data = response.json()
        
        print(f"Response Status: {response.status_code}")
        print(f"Response Data: {json.dumps(data, indent=2)}")
        
        if response.status_code == 200 and data.get("success"):
            order = data.get("order", {})
            pricing = order.get("pricing", {})
            delivery_fee = pricing.get("deliveryFee")
            
            # Check if delivery fee is present in pricing
            if delivery_fee is not None:
                if delivery_fee == 6.99:
                    log_test("Delivery fee < $75 threshold", True, f"Correct delivery fee: ${delivery_fee}")
                    return True
                else:
                    log_test("Delivery fee < $75 threshold", False, f"Expected $6.99, got ${delivery_fee}")
                    return False
            else:
                # Check metadata
                metadata = order.get("metadata", {})
                delivery_fee_meta = metadata.get("deliveryFee")
                if delivery_fee_meta is not None:
                    if delivery_fee_meta == 6.99:
                        log_test("Delivery fee < $75 threshold", True, f"Correct delivery fee in metadata: ${delivery_fee_meta}")
                        return True
                    else:
                        log_test("Delivery fee < $75 threshold", False, f"Expected $6.99 in metadata, got ${delivery_fee_meta}")
                        return False
                else:
                    log_test("Delivery fee < $75 threshold", False, "Delivery fee not found in response")
                    return False
        else:
            log_test("Delivery fee < $75 threshold", False, f"Status {response.status_code}: {data.get('error', 'Unknown error')}")
            return False
    except Exception as e:
        log_test("Delivery fee < $75 threshold", False, f"Exception: {str(e)}")
        return False

def test_delivery_fee_above_threshold():
    """Test 2: Order with subtotal >= $75 should have $0 delivery fee (free delivery)"""
    print("\n=== Test 2: Free Delivery for Order >= $75 (Subtotal: $80) ===")
    
    payload = {
        "cart": [
            {"id": "test-1", "name": "Test Product", "price": 80, "quantity": 1}
        ],
        "customer": {
            "name": "Test User",
            "email": "test@example.com",
            "phone": "555-1234"
        },
        "fulfillmentType": "delivery",
        "deliveryAddress": {
            "street": "123 Main St",
            "city": "Atlanta",
            "state": "GA",
            "zip": "30310"
        },
        "deliveryTimeSlot": "09:00-12:00",
        "deliveryTip": 0
    }
    
    try:
        response = requests.post(f"{BASE_URL}/orders/create", json=payload, headers=HEADERS, timeout=10)
        data = response.json()
        
        print(f"Response Status: {response.status_code}")
        print(f"Response Data: {json.dumps(data, indent=2)}")
        
        if response.status_code == 200 and data.get("success"):
            order = data.get("order", {})
            pricing = order.get("pricing", {})
            delivery_fee = pricing.get("deliveryFee")
            
            # Check if delivery fee is present in pricing
            if delivery_fee is not None:
                if delivery_fee == 0:
                    log_test("Free delivery >= $75 threshold", True, f"Correct free delivery: ${delivery_fee}")
                    return True
                else:
                    log_test("Free delivery >= $75 threshold", False, f"Expected $0, got ${delivery_fee}")
                    return False
            else:
                # Check metadata
                metadata = order.get("metadata", {})
                delivery_fee_meta = metadata.get("deliveryFee")
                if delivery_fee_meta is not None:
                    if delivery_fee_meta == 0:
                        log_test("Free delivery >= $75 threshold", True, f"Correct free delivery in metadata: ${delivery_fee_meta}")
                        return True
                    else:
                        log_test("Free delivery >= $75 threshold", False, f"Expected $0 in metadata, got ${delivery_fee_meta}")
                        return False
                else:
                    log_test("Free delivery >= $75 threshold", False, "Delivery fee not found in response")
                    return False
        else:
            log_test("Free delivery >= $75 threshold", False, f"Status {response.status_code}: {data.get('error', 'Unknown error')}")
            return False
    except Exception as e:
        log_test("Free delivery >= $75 threshold", False, f"Exception: {str(e)}")
        return False

def test_delivery_fee_at_threshold():
    """Test 3: Order at exactly $75 should have $0 delivery fee (threshold test)"""
    print("\n=== Test 3: Free Delivery at Exactly $75 (Threshold Test) ===")
    
    payload = {
        "cart": [
            {"id": "test-1", "name": "Test Product", "price": 75, "quantity": 1}
        ],
        "customer": {
            "name": "Test User",
            "email": "test@example.com",
            "phone": "555-1234"
        },
        "fulfillmentType": "delivery",
        "deliveryAddress": {
            "street": "123 Main St",
            "city": "Atlanta",
            "state": "GA",
            "zip": "30310"
        },
        "deliveryTimeSlot": "09:00-12:00",
        "deliveryTip": 0
    }
    
    try:
        response = requests.post(f"{BASE_URL}/orders/create", json=payload, headers=HEADERS, timeout=10)
        data = response.json()
        
        print(f"Response Status: {response.status_code}")
        print(f"Response Data: {json.dumps(data, indent=2)}")
        
        if response.status_code == 200 and data.get("success"):
            order = data.get("order", {})
            pricing = order.get("pricing", {})
            delivery_fee = pricing.get("deliveryFee")
            
            # Check if delivery fee is present in pricing
            if delivery_fee is not None:
                if delivery_fee == 0:
                    log_test("Free delivery at $75 threshold", True, f"Correct free delivery at threshold: ${delivery_fee}")
                    return True
                else:
                    log_test("Free delivery at $75 threshold", False, f"Expected $0, got ${delivery_fee}")
                    return False
            else:
                # Check metadata
                metadata = order.get("metadata", {})
                delivery_fee_meta = metadata.get("deliveryFee")
                if delivery_fee_meta is not None:
                    if delivery_fee_meta == 0:
                        log_test("Free delivery at $75 threshold", True, f"Correct free delivery at threshold in metadata: ${delivery_fee_meta}")
                        return True
                    else:
                        log_test("Free delivery at $75 threshold", False, f"Expected $0 in metadata, got ${delivery_fee_meta}")
                        return False
                else:
                    log_test("Free delivery at $75 threshold", False, "Delivery fee not found in response")
                    return False
        else:
            log_test("Free delivery at $75 threshold", False, f"Status {response.status_code}: {data.get('error', 'Unknown error')}")
            return False
    except Exception as e:
        log_test("Free delivery at $75 threshold", False, f"Exception: {str(e)}")
        return False

def print_summary():
    """Print test summary"""
    print("\n" + "="*60)
    print("DELIVERY FEE CALCULATION TEST SUMMARY")
    print("="*60)
    print(f"Total Tests: {tests_passed + tests_failed}")
    print(f"✅ Passed: {tests_passed}")
    print(f"❌ Failed: {tests_failed}")
    print(f"Success Rate: {(tests_passed / (tests_passed + tests_failed) * 100):.1f}%")
    print("="*60)
    
    if tests_failed > 0:
        print("\n❌ FAILED TESTS:")
        for result in test_results:
            if not result["passed"]:
                print(f"  - {result['test']}: {result['message']}")
    
    return tests_failed == 0

if __name__ == "__main__":
    print("="*60)
    print("DELIVERY FEE CALCULATION INTEGRATION TESTING")
    print("Testing: /app/app/api/orders/create")
    print("="*60)
    
    # Run all tests
    test_delivery_fee_below_threshold()
    test_delivery_fee_above_threshold()
    test_delivery_fee_at_threshold()
    
    # Print summary
    all_passed = print_summary()
    
    # Exit with appropriate code
    sys.exit(0 if all_passed else 1)
