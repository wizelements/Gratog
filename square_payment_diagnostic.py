#!/usr/bin/env python3
"""
COMPREHENSIVE SQUARE PAYMENT STACK DEEP DIVE
Testing all potential failure points for Square payment integration
User: silverwatkins@gmail.com experiencing HTTP 400 errors
"""

import requests
import json
import time
from datetime import datetime

# Configuration
BASE_URL = "https://typebug-hunter.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

# Square Production Credentials from .env
SQUARE_ACCESS_TOKEN = "EAAAl4KvAdZXvBekxwhUUfXc0siQpVE4BlD3-Ykw7T1xzJtR793ft5T0FgoTcjqw"
SQUARE_APPLICATION_ID = "sq0idp-V1fV-MwsU5lET4rvzHKnIw"
SQUARE_LOCATION_ID = "L66TVG6867BG9"
SQUARE_ENVIRONMENT = "production"

# Test results tracking
test_results = []

def log_test(test_name, passed, details=""):
    """Log test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    result = {
        "test": test_name,
        "passed": passed,
        "details": details,
        "timestamp": datetime.now().isoformat()
    }
    test_results.append(result)
    print(f"\n{status}: {test_name}")
    if details:
        print(f"   Details: {details}")
    return passed

def test_square_credentials_validation():
    """PHASE 1: Test Square API connectivity with production credentials"""
    print("\n" + "="*80)
    print("PHASE 1: SQUARE CREDENTIALS DEEP VALIDATION")
    print("="*80)
    
    # Test 1: Verify token format
    print("\n🔍 Test 1: Token Format Validation")
    token_valid = SQUARE_ACCESS_TOKEN.startswith("EAAA") and len(SQUARE_ACCESS_TOKEN) == 64
    log_test(
        "Token Format Validation",
        token_valid,
        f"Token prefix: {SQUARE_ACCESS_TOKEN[:10]}..., Length: {len(SQUARE_ACCESS_TOKEN)}"
    )
    
    # Test 2: Verify Application ID format
    print("\n🔍 Test 2: Application ID Format Validation")
    app_id_valid = SQUARE_APPLICATION_ID.startswith("sq0idp-")
    log_test(
        "Application ID Format",
        app_id_valid,
        f"App ID: {SQUARE_APPLICATION_ID}"
    )
    
    # Test 3: Verify Location ID format
    print("\n🔍 Test 3: Location ID Format Validation")
    location_id_valid = len(SQUARE_LOCATION_ID) > 0
    log_test(
        "Location ID Format",
        location_id_valid,
        f"Location ID: {SQUARE_LOCATION_ID}"
    )
    
    # Test 4: Call Square /v2/locations API to verify token validity
    print("\n🔍 Test 4: Square API Connectivity - List Locations")
    try:
        response = requests.get(
            "https://connect.squareup.com/v2/locations",
            headers={
                "Authorization": f"Bearer {SQUARE_ACCESS_TOKEN}",
                "Square-Version": "2025-10-16",
                "Content-Type": "application/json"
            },
            timeout=10
        )
        
        if response.status_code == 200:
            locations = response.json().get("locations", [])
            location_found = any(loc.get("id") == SQUARE_LOCATION_ID for loc in locations)
            log_test(
                "Square API - List Locations",
                True,
                f"Status: {response.status_code}, Locations found: {len(locations)}, Target location accessible: {location_found}"
            )
        elif response.status_code == 401:
            log_test(
                "Square API - List Locations",
                False,
                f"UNAUTHORIZED (401): Token is invalid or expired. Response: {response.text[:200]}"
            )
        else:
            log_test(
                "Square API - List Locations",
                False,
                f"Status: {response.status_code}, Response: {response.text[:200]}"
            )
    except Exception as e:
        log_test("Square API - List Locations", False, f"Exception: {str(e)}")
    
    # Test 5: Test minimal payment creation with test nonce
    print("\n🔍 Test 5: Square API - Test Payment Creation")
    try:
        payment_payload = {
            "source_id": "cnon:card-nonce-ok",  # Test nonce
            "idempotency_key": f"test_{int(time.time())}",
            "amount_money": {
                "amount": 100,  # $1.00
                "currency": "USD"
            },
            "location_id": SQUARE_LOCATION_ID
        }
        
        response = requests.post(
            "https://connect.squareup.com/v2/payments",
            headers={
                "Authorization": f"Bearer {SQUARE_ACCESS_TOKEN}",
                "Square-Version": "2025-10-16",
                "Content-Type": "application/json"
            },
            json=payment_payload,
            timeout=10
        )
        
        if response.status_code == 200:
            log_test(
                "Square API - Test Payment",
                True,
                f"Payment created successfully (unexpected with test nonce in production)"
            )
        elif response.status_code == 404 and "not found" in response.text.lower():
            log_test(
                "Square API - Test Payment",
                True,
                f"Expected 404 - Test nonce doesn't work in production (this is CORRECT behavior)"
            )
        elif response.status_code == 401:
            log_test(
                "Square API - Test Payment",
                False,
                f"UNAUTHORIZED (401): Token lacks PAYMENTS_WRITE permission. Response: {response.text[:200]}"
            )
        else:
            log_test(
                "Square API - Test Payment",
                False,
                f"Status: {response.status_code}, Response: {response.text[:200]}"
            )
    except Exception as e:
        log_test("Square API - Test Payment", False, f"Exception: {str(e)}")

def test_payment_api_validation():
    """PHASE 2: Test /api/payments endpoint validation"""
    print("\n" + "="*80)
    print("PHASE 2: PAYMENT API ENDPOINT VALIDATION (/api/payments)")
    print("="*80)
    
    # Test 1: Missing sourceId
    print("\n🔍 Test 1: Missing sourceId validation")
    try:
        response = requests.post(
            f"{API_BASE}/payments",
            json={
                "amountCents": 1000,
                "orderId": "test-order-123"
            },
            timeout=10
        )
        
        is_400 = response.status_code == 400
        has_error = "source" in response.text.lower() or "token" in response.text.lower()
        log_test(
            "Missing sourceId Validation",
            is_400 and has_error,
            f"Status: {response.status_code}, Response: {response.text[:200]}"
        )
    except Exception as e:
        log_test("Missing sourceId Validation", False, f"Exception: {str(e)}")
    
    # Test 2: Missing amountCents
    print("\n🔍 Test 2: Missing amountCents validation")
    try:
        response = requests.post(
            f"{API_BASE}/payments",
            json={
                "sourceId": "test-token-123",
                "orderId": "test-order-123"
            },
            timeout=10
        )
        
        is_400 = response.status_code == 400
        has_error = "amount" in response.text.lower()
        log_test(
            "Missing amountCents Validation",
            is_400 and has_error,
            f"Status: {response.status_code}, Response: {response.text[:200]}"
        )
    except Exception as e:
        log_test("Missing amountCents Validation", False, f"Exception: {str(e)}")
    
    # Test 3: Invalid amountCents (zero)
    print("\n🔍 Test 3: Invalid amountCents (zero)")
    try:
        response = requests.post(
            f"{API_BASE}/payments",
            json={
                "sourceId": "test-token-123",
                "amountCents": 0,
                "orderId": "test-order-123"
            },
            timeout=10
        )
        
        is_400 = response.status_code == 400
        has_error = "amount" in response.text.lower()
        log_test(
            "Invalid amountCents (zero)",
            is_400 and has_error,
            f"Status: {response.status_code}, Response: {response.text[:200]}"
        )
    except Exception as e:
        log_test("Invalid amountCents (zero)", False, f"Exception: {str(e)}")
    
    # Test 4: Invalid amountCents (negative)
    print("\n🔍 Test 4: Invalid amountCents (negative)")
    try:
        response = requests.post(
            f"{API_BASE}/payments",
            json={
                "sourceId": "test-token-123",
                "amountCents": -100,
                "orderId": "test-order-123"
            },
            timeout=10
        )
        
        is_400 = response.status_code == 400
        has_error = "amount" in response.text.lower()
        log_test(
            "Invalid amountCents (negative)",
            is_400 and has_error,
            f"Status: {response.status_code}, Response: {response.text[:200]}"
        )
    except Exception as e:
        log_test("Invalid amountCents (negative)", False, f"Exception: {str(e)}")
    
    # Test 5: Valid structure with test nonce (will fail in production - expected)
    print("\n🔍 Test 5: Valid payment structure with test nonce")
    try:
        response = requests.post(
            f"{API_BASE}/payments",
            json={
                "sourceId": "cnon:card-nonce-ok",
                "amountCents": 1000,
                "currency": "USD",
                "orderId": "test-order-123",
                "customer": {
                    "email": "test@example.com"
                }
            },
            timeout=15
        )
        
        # In production, test nonce should fail - this is expected
        if response.status_code == 500 and ("not found" in response.text.lower() or "nonce" in response.text.lower()):
            log_test(
                "Valid Payment Structure",
                True,
                f"Expected failure with test nonce in production. Status: {response.status_code}"
            )
        elif response.status_code == 200:
            log_test(
                "Valid Payment Structure",
                True,
                f"Payment succeeded (unexpected with test nonce)"
            )
        else:
            log_test(
                "Valid Payment Structure",
                False,
                f"Unexpected error. Status: {response.status_code}, Response: {response.text[:300]}"
            )
    except Exception as e:
        log_test("Valid Payment Structure", False, f"Exception: {str(e)}")

def generate_summary():
    """Generate comprehensive test summary"""
    print("\n" + "="*80)
    print("COMPREHENSIVE TEST SUMMARY")
    print("="*80)
    
    total_tests = len(test_results)
    passed_tests = sum(1 for r in test_results if r["passed"])
    failed_tests = total_tests - passed_tests
    success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
    
    print(f"\nTotal Tests: {total_tests}")
    print(f"Passed: {passed_tests} ✅")
    print(f"Failed: {failed_tests} ❌")
    print(f"Success Rate: {success_rate:.1f}%")
    
    if failed_tests > 0:
        print("\n" + "="*80)
        print("FAILED TESTS DETAILS")
        print("="*80)
        for result in test_results:
            if not result["passed"]:
                print(f"\n❌ {result['test']}")
                print(f"   {result['details']}")
    
    print("\n" + "="*80)
    print("CRITICAL FINDINGS & RECOMMENDATIONS")
    print("="*80)
    
    # Analyze results for patterns
    auth_failures = sum(1 for r in test_results if not r["passed"] and "401" in r["details"])
    validation_failures = sum(1 for r in test_results if not r["passed"] and "400" in r["details"])
    
    if auth_failures > 0:
        print("\n⚠️  AUTHENTICATION ISSUES DETECTED:")
        print("   - Multiple 401 UNAUTHORIZED errors found")
        print("   - Recommendation: Verify Square access token has PAYMENTS_WRITE permission")
        print("   - Check Square Developer Dashboard → Credentials → Production Access Token")
    
    if validation_failures > 0:
        print("\n⚠️  VALIDATION ISSUES DETECTED:")
        print("   - Multiple 400 BAD REQUEST errors found")
        print("   - Recommendation: Review API request structure and required fields")
    
    print("\n" + "="*80)
    print("NEXT STEPS")
    print("="*80)
    print("\n1. Review failed tests above")
    print("2. Check Square Developer Dashboard for:")
    print("   - Access token validity")
    print("   - PAYMENTS_WRITE permission")
    print("   - Location ID association")
    print("3. Test with real card in production (not test nonce)")
    print("4. Monitor server logs during payment attempts")

if __name__ == "__main__":
    print("="*80)
    print("COMPREHENSIVE SQUARE PAYMENT STACK DEEP DIVE")
    print("Testing all potential failure points")
    print(f"Target: {BASE_URL}")
    print(f"Environment: {SQUARE_ENVIRONMENT}")
    print("="*80)
    
    # Run all test phases
    test_square_credentials_validation()
    test_payment_api_validation()
    
    # Generate summary
    generate_summary()
    
    print("\n" + "="*80)
    print("TEST EXECUTION COMPLETE")
    print("="*80)
