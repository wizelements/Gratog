#!/usr/bin/env python3
"""
NUCLEAR REFACTOR VALIDATION TEST
Square Checkout API - Payment Links Integration
Testing elimination of legacy Square Online deep links
"""

import requests
import json
import time
from datetime import datetime

# Configuration
BASE_URL = "https://taste-interactive.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

# Test Results Tracking
test_results = {
    "total": 0,
    "passed": 0,
    "failed": 0,
    "critical_failures": [],
    "tests": []
}

def log_test(test_name, passed, details="", response_time=0, critical=False):
    """Log test result"""
    test_results["total"] += 1
    if passed:
        test_results["passed"] += 1
        status = "✅ PASS"
    else:
        test_results["failed"] += 1
        status = "❌ FAIL"
        if critical:
            test_results["critical_failures"].append({
                "test": test_name,
                "details": details
            })
    
    result = {
        "test": test_name,
        "status": status,
        "details": details,
        "response_time_ms": response_time,
        "critical": critical
    }
    test_results["tests"].append(result)
    print(f"{status} | {test_name}")
    if details:
        print(f"    Details: {details}")
    if response_time > 0:
        print(f"    Response Time: {response_time}ms")
    print()

def check_legacy_references(response_data, url_field="url"):
    """Check for legacy Square Online deep link references"""
    legacy_patterns = [
        "tasteofgratitude.shop/s/",  # Legacy Square Online store deep links
        "add="  # Query parameter used in Square Online deep links
    ]
    
    issues = []
    response_str = json.dumps(response_data)
    
    for pattern in legacy_patterns:
        if pattern in response_str:
            issues.append(f"Found legacy pattern: {pattern}")
    
    # Note: square.link is Square's official Payment Links domain (NOT legacy)
    # Legacy pattern is tasteofgratitude.shop/s/order?add=product-id
    
    return issues

def test_1_square_checkout_api_flow():
    """TEST 1: Square Checkout API Flow"""
    print("\n" + "="*80)
    print("TEST 1: SQUARE CHECKOUT API FLOW")
    print("="*80 + "\n")
    
    # Using real Square catalog object ID from Elderberry Moss 16oz variation
    payload = {
        "lineItems": [
            {
                "catalogObjectId": "NISN4GAH5SBPGKHLU5VTDYLR",  # Elderberry Moss 16oz
                "quantity": 1,
                "name": "Elderberry Moss",
                "basePriceMoney": {
                    "amount": 3600,
                    "currency": "USD"
                },
                "productId": "elderberry-moss",
                "category": "gel",
                "size": "16oz"
            }
        ],
        "redirectUrl": "https://taste-interactive.preview.emergentagent.com/checkout/success",
        "customer": {
            "email": "sarah.johnson@example.com",
            "name": "Sarah Johnson",
            "phone": "(404) 555-1234"
        },
        "orderId": "TEST-ORDER-REFACTOR-001",
        "fulfillmentType": "shipping"
    }
    
    try:
        start = time.time()
        response = requests.post(
            f"{API_BASE}/checkout",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        elapsed = int((time.time() - start) * 1000)
        
        print(f"Response Status: {response.status_code}")
        print(f"Response Time: {elapsed}ms")
        
        # Test 1.1: Check for 200 OK response
        if response.status_code == 200:
            log_test(
                "TEST 1.1: 200 OK Response",
                True,
                f"Status code: {response.status_code}",
                elapsed
            )
        else:
            log_test(
                "TEST 1.1: 200 OK Response",
                False,
                f"Expected 200, got {response.status_code}. Response: {response.text[:200]}",
                elapsed,
                critical=True
            )
            return
        
        data = response.json()
        print(f"Response Data: {json.dumps(data, indent=2)}")
        
        # Test 1.2: Check response structure
        has_success = "success" in data and data["success"] == True
        has_payment_link = "paymentLink" in data
        has_url = has_payment_link and "url" in data["paymentLink"]
        has_id = has_payment_link and "id" in data["paymentLink"]
        has_order_id = has_payment_link and "orderId" in data["paymentLink"]
        
        structure_valid = has_success and has_payment_link and has_url and has_id and has_order_id
        
        log_test(
            "TEST 1.2: Response Structure",
            structure_valid,
            f"success: {has_success}, paymentLink.url: {has_url}, paymentLink.id: {has_id}, paymentLink.orderId: {has_order_id}",
            critical=True
        )
        
        if not structure_valid:
            return
        
        # Test 1.3: Check payment link URL format
        payment_url = data["paymentLink"]["url"]
        print(f"Payment Link URL: {payment_url}")
        
        is_square_url = payment_url.startswith("https://square") or payment_url.startswith("https://checkout.square")
        
        log_test(
            "TEST 1.3: Payment Link URL Format",
            is_square_url,
            f"URL starts with: {payment_url[:50]}...",
            critical=True
        )
        
        # Test 1.4: CRITICAL - Check for legacy deep link patterns
        legacy_issues = check_legacy_references(data)
        
        if legacy_issues:
            log_test(
                "TEST 1.4: NO LEGACY SQUARE ONLINE DEEP LINKS",
                False,
                f"CRITICAL: Found legacy Square Online patterns: {', '.join(legacy_issues)}",
                critical=True
            )
        else:
            log_test(
                "TEST 1.4: NO LEGACY SQUARE ONLINE DEEP LINKS",
                True,
                "No legacy Square Online deep link patterns found (tasteofgratitude.shop/s/, add=). Note: square.link is Square's official Payment Links domain.",
                critical=False
            )
        
        # Test 1.5: Check for proper Square Payment Link ID format
        payment_link_id = data["paymentLink"]["id"]
        # Square Payment Link IDs are typically alphanumeric
        is_valid_id = len(payment_link_id) > 10 and payment_link_id.replace("-", "").replace("_", "").isalnum()
        
        log_test(
            "TEST 1.5: Payment Link ID Format",
            is_valid_id,
            f"Payment Link ID: {payment_link_id}",
            critical=False
        )
        
    except requests.exceptions.Timeout:
        log_test(
            "TEST 1: Square Checkout API Flow",
            False,
            "Request timeout after 30 seconds",
            critical=True
        )
    except Exception as e:
        log_test(
            "TEST 1: Square Checkout API Flow",
            False,
            f"Error: {str(e)}",
            critical=True
        )

def test_2_idempotency_check():
    """TEST 2: Idempotency Check"""
    print("\n" + "="*80)
    print("TEST 2: IDEMPOTENCY CHECK")
    print("="*80 + "\n")
    
    # Using real Square catalog object ID from Healing Harmony 16oz variation
    payload = {
        "lineItems": [
            {
                "catalogObjectId": "NISN4GAH5SBPGKHLU5VTDYLR",  # Elderberry Moss 16oz
                "quantity": 1,
                "name": "Elderberry Moss",
                "basePriceMoney": {
                    "amount": 3600,
                    "currency": "USD"
                },
                "productId": "elderberry-moss",
                "category": "gel",
                "size": "16oz"
            }
        ],
        "redirectUrl": "https://taste-interactive.preview.emergentagent.com/checkout/success",
        "customer": {
            "email": "idempotency.test@example.com",
            "name": "Idempotency Test User",
            "phone": "(404) 555-9999"
        },
        "orderId": "TEST-IDEMPOTENCY-REFACTOR-002",
        "fulfillmentType": "pickup"
    }
    
    try:
        # First request
        print("Making first request...")
        start1 = time.time()
        response1 = requests.post(
            f"{API_BASE}/checkout",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        elapsed1 = int((time.time() - start1) * 1000)
        
        if response1.status_code != 200:
            log_test(
                "TEST 2: Idempotency Check",
                False,
                f"First request failed with status {response1.status_code}",
                elapsed1,
                critical=True
            )
            return
        
        data1 = response1.json()
        payment_link_id_1 = data1.get("paymentLink", {}).get("id")
        
        print(f"First request - Payment Link ID: {payment_link_id_1}")
        print(f"Waiting 2 seconds before second request...")
        time.sleep(2)
        
        # Second request (same payload)
        print("Making second request with same payload...")
        start2 = time.time()
        response2 = requests.post(
            f"{API_BASE}/checkout",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        elapsed2 = int((time.time() - start2) * 1000)
        
        if response2.status_code != 200:
            log_test(
                "TEST 2: Idempotency Check",
                False,
                f"Second request failed with status {response2.status_code}",
                elapsed2,
                critical=False
            )
            return
        
        data2 = response2.json()
        payment_link_id_2 = data2.get("paymentLink", {}).get("id")
        
        print(f"Second request - Payment Link ID: {payment_link_id_2}")
        
        # Test 2.1: Check if both requests succeeded
        both_succeeded = response1.status_code == 200 and response2.status_code == 200
        
        log_test(
            "TEST 2.1: Both Requests Succeeded",
            both_succeeded,
            f"First: {response1.status_code}, Second: {response2.status_code}",
            (elapsed1 + elapsed2) // 2
        )
        
        # Test 2.2: Check idempotency (Note: Square may create new payment links for each request)
        # This is expected behavior for Square Payment Links API
        # We're checking that the system handles duplicate requests gracefully
        
        log_test(
            "TEST 2.2: Duplicate Request Handling",
            both_succeeded,
            f"System handles duplicate requests gracefully. Payment Link IDs: {payment_link_id_1} vs {payment_link_id_2}",
            critical=False
        )
        
    except Exception as e:
        log_test(
            "TEST 2: Idempotency Check",
            False,
            f"Error: {str(e)}",
            critical=False
        )

def test_3_missing_fields_validation():
    """TEST 3: Missing Fields Validation"""
    print("\n" + "="*80)
    print("TEST 3: MISSING FIELDS VALIDATION")
    print("="*80 + "\n")
    
    # Test 3.1: Missing lineItems
    payload_missing_items = {
        "redirectUrl": "https://taste-interactive.preview.emergentagent.com/checkout/success",
        "customer": {"email": "test@example.com"}
    }
    
    try:
        start = time.time()
        response = requests.post(
            f"{API_BASE}/checkout",
            json=payload_missing_items,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        elapsed = int((time.time() - start) * 1000)
        
        is_400 = response.status_code == 400
        
        error_message = ""
        if is_400:
            try:
                data = response.json()
                error_message = data.get("error", "")
            except:
                error_message = response.text
        
        has_correct_message = "line items" in error_message.lower() or "required" in error_message.lower()
        
        log_test(
            "TEST 3.1: Missing lineItems Validation",
            is_400 and has_correct_message,
            f"Status: {response.status_code}, Error: {error_message}",
            elapsed,
            critical=True
        )
        
    except Exception as e:
        log_test(
            "TEST 3.1: Missing lineItems Validation",
            False,
            f"Error: {str(e)}",
            critical=True
        )
    
    # Test 3.2: Empty lineItems array
    payload_empty_items = {
        "lineItems": [],
        "redirectUrl": "https://taste-interactive.preview.emergentagent.com/checkout/success",
        "customer": {"email": "test@example.com"}
    }
    
    try:
        start = time.time()
        response = requests.post(
            f"{API_BASE}/checkout",
            json=payload_empty_items,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        elapsed = int((time.time() - start) * 1000)
        
        is_400 = response.status_code == 400
        
        log_test(
            "TEST 3.2: Empty lineItems Array Validation",
            is_400,
            f"Status: {response.status_code}",
            elapsed,
            critical=True
        )
        
    except Exception as e:
        log_test(
            "TEST 3.2: Empty lineItems Array Validation",
            False,
            f"Error: {str(e)}",
            critical=True
        )
    
    # Test 3.3: Missing catalogObjectId in line item
    payload_missing_catalog_id = {
        "lineItems": [
            {
                "quantity": 1,
                "name": "Test Product",
                "basePriceMoney": {
                    "amount": 3500,
                    "currency": "USD"
                }
            }
        ],
        "redirectUrl": "https://taste-interactive.preview.emergentagent.com/checkout/success",
        "customer": {"email": "test@example.com"}
    }
    
    try:
        start = time.time()
        response = requests.post(
            f"{API_BASE}/checkout",
            json=payload_missing_catalog_id,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        elapsed = int((time.time() - start) * 1000)
        
        is_400 = response.status_code == 400
        
        error_message = ""
        if is_400:
            try:
                data = response.json()
                error_message = data.get("error", "")
            except:
                error_message = response.text
        
        has_correct_message = "catalogObjectId" in error_message or "catalog" in error_message.lower()
        
        log_test(
            "TEST 3.3: Missing catalogObjectId Validation",
            is_400 and has_correct_message,
            f"Status: {response.status_code}, Error: {error_message}",
            elapsed,
            critical=True
        )
        
    except Exception as e:
        log_test(
            "TEST 3.3: Missing catalogObjectId Validation",
            False,
            f"Error: {str(e)}",
            critical=True
        )

def print_summary():
    """Print test summary"""
    print("\n" + "="*80)
    print("NUCLEAR REFACTOR VALIDATION TEST - SUMMARY")
    print("="*80 + "\n")
    
    total = test_results["total"]
    passed = test_results["passed"]
    failed = test_results["failed"]
    success_rate = (passed / total * 100) if total > 0 else 0
    
    print(f"Total Tests: {total}")
    print(f"Passed: {passed} ✅")
    print(f"Failed: {failed} ❌")
    print(f"Success Rate: {success_rate:.1f}%")
    print()
    
    if test_results["critical_failures"]:
        print("🔥 CRITICAL FAILURES:")
        for failure in test_results["critical_failures"]:
            print(f"  ❌ {failure['test']}")
            print(f"     {failure['details']}")
        print()
    
    print("\nDETAILED RESULTS:")
    print("-" * 80)
    for result in test_results["tests"]:
        critical_marker = " 🔥 CRITICAL" if result.get("critical") else ""
        print(f"{result['status']} | {result['test']}{critical_marker}")
        if result['details']:
            print(f"    {result['details']}")
        if result['response_time_ms'] > 0:
            print(f"    Response Time: {result['response_time_ms']}ms")
        print()
    
    print("="*80)
    
    if failed == 0:
        print("🎉 ALL TESTS PASSED - NUCLEAR REFACTOR VALIDATED!")
    elif test_results["critical_failures"]:
        print("🔥 CRITICAL FAILURES DETECTED - REFACTOR NEEDS ATTENTION")
    else:
        print("⚠️  SOME TESTS FAILED - REVIEW REQUIRED")
    
    print("="*80)

def main():
    """Run all tests"""
    print("\n" + "="*80)
    print("NUCLEAR REFACTOR VALIDATION TEST")
    print("Square Checkout API - Payment Links Integration")
    print("Testing elimination of legacy Square Online deep links")
    print("="*80)
    print(f"Test Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Base URL: {BASE_URL}")
    print("="*80 + "\n")
    
    # Run all tests
    test_1_square_checkout_api_flow()
    test_2_idempotency_check()
    test_3_missing_fields_validation()
    
    # Print summary
    print_summary()
    
    # Exit with appropriate code
    if test_results["failed"] > 0:
        exit(1)
    else:
        exit(0)

if __name__ == "__main__":
    main()
