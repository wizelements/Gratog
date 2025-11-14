#!/usr/bin/env python3
"""
COMPREHENSIVE BACKEND BUG FIXES TESTING
Taste of Gratitude E-commerce Platform
Testing 3 critical bug fixes:
1. Catalog Webhook Fix - Handle incomplete data
2. Passport Stamp API Enhancement - Email parameter support
3. Quiz Recommendations Enhancement - Better matching with 3-4 products
"""

import requests
import json
import time
from datetime import datetime

# Configuration
BASE_URL = "https://typebug-hunter.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

# Test Results Tracking
test_results = {
    "total": 0,
    "passed": 0,
    "failed": 0,
    "tests": []
}

def log_test(category, test_name, passed, details="", response_time=0):
    """Log test result"""
    test_results["total"] += 1
    if passed:
        test_results["passed"] += 1
        status = "✅ PASS"
    else:
        test_results["failed"] += 1
        status = "❌ FAIL"
    
    result = {
        "category": category,
        "test": test_name,
        "status": status,
        "details": details,
        "response_time_ms": response_time
    }
    test_results["tests"].append(result)
    print(f"{status} | {category} | {test_name}")
    if details:
        print(f"    Details: {details}")
    if response_time > 0:
        print(f"    Response Time: {response_time}ms")
    print()

def test_catalog_webhook_fix():
    """Test 1: Catalog Webhook Fix - Handle incomplete data without 500 errors"""
    print("\n" + "="*80)
    print("TEST 1: CATALOG WEBHOOK FIX - INCOMPLETE DATA HANDLING")
    print("="*80 + "\n")
    
    # Test A: Empty data object
    try:
        start = time.time()
        payload = {
            "type": "catalog.version.updated",
            "event_id": "test_456",
            "created_at": "2025-01-30T00:00:00Z",
            "data": {}
        }
        response = requests.post(f"{API_BASE}/webhooks/square", json=payload, timeout=10)
        elapsed = int((time.time() - start) * 1000)
        
        # Should NOT return 500 error
        if response.status_code == 200:
            data = response.json()
            log_test(
                "Catalog Webhook",
                "Empty data object handling",
                True,
                f"Webhook processed successfully with empty data. Response: {json.dumps(data)}",
                elapsed
            )
        else:
            log_test(
                "Catalog Webhook",
                "Empty data object handling",
                response.status_code != 500,
                f"Status: {response.status_code}, Response: {response.text[:200]}"
            )
    except Exception as e:
        log_test("Catalog Webhook", "Empty data object handling", False, f"Error: {str(e)}")
    
    # Test B: Partial data with missing object properties
    try:
        start = time.time()
        payload = {
            "type": "catalog.version.updated",
            "event_id": "test_789",
            "created_at": "2025-01-30T00:00:00Z",
            "data": {
                "object": {}
            }
        }
        response = requests.post(f"{API_BASE}/webhooks/square", json=payload, timeout=10)
        elapsed = int((time.time() - start) * 1000)
        
        # Should NOT return 500 error
        if response.status_code == 200:
            data = response.json()
            log_test(
                "Catalog Webhook",
                "Partial data with empty object",
                True,
                f"Webhook processed successfully with partial data. Response: {json.dumps(data)}",
                elapsed
            )
        else:
            log_test(
                "Catalog Webhook",
                "Partial data with empty object",
                response.status_code != 500,
                f"Status: {response.status_code}, Response: {response.text[:200]}"
            )
    except Exception as e:
        log_test("Catalog Webhook", "Partial data with empty object", False, f"Error: {str(e)}")
    
    # Test C: Missing object_id and object_type
    try:
        start = time.time()
        payload = {
            "type": "catalog.version.updated",
            "event_id": "test_999",
            "created_at": "2025-01-30T00:00:00Z",
            "data": {
                "object": {
                    "catalog_version": {
                        "version": "12345"
                    }
                }
            }
        }
        response = requests.post(f"{API_BASE}/webhooks/square", json=payload, timeout=10)
        elapsed = int((time.time() - start) * 1000)
        
        # Should NOT return 500 error
        if response.status_code == 200:
            data = response.json()
            received = data.get("received", False)
            log_test(
                "Catalog Webhook",
                "Missing object_id and object_type",
                received == True,
                f"Webhook processed with safe defaults. Received: {received}",
                elapsed
            )
        else:
            log_test(
                "Catalog Webhook",
                "Missing object_id and object_type",
                response.status_code != 500,
                f"Status: {response.status_code}, Response: {response.text[:200]}"
            )
    except Exception as e:
        log_test("Catalog Webhook", "Missing object_id and object_type", False, f"Error: {str(e)}")
    
    # Test D: Verify sync queue entry creation
    try:
        start = time.time()
        payload = {
            "type": "catalog.version.updated",
            "event_id": "test_sync_queue",
            "created_at": "2025-01-30T00:00:00Z",
            "data": {
                "object": {
                    "object_id": "TEST_ITEM_123",
                    "object_type": "ITEM",
                    "version": "v1"
                }
            }
        }
        response = requests.post(f"{API_BASE}/webhooks/square", json=payload, timeout=10)
        elapsed = int((time.time() - start) * 1000)
        
        if response.status_code == 200:
            data = response.json()
            success_msg = data.get("received", False)
            log_test(
                "Catalog Webhook",
                "Sync queue entry creation",
                success_msg == True,
                f"Webhook created sync queue entry successfully",
                elapsed
            )
        else:
            log_test(
                "Catalog Webhook",
                "Sync queue entry creation",
                False,
                f"Status: {response.status_code}"
            )
    except Exception as e:
        log_test("Catalog Webhook", "Sync queue entry creation", False, f"Error: {str(e)}")

def test_passport_stamp_api_enhancement():
    """Test 2: Passport Stamp API Enhancement - Email parameter support"""
    print("\n" + "="*80)
    print("TEST 2: PASSPORT STAMP API ENHANCEMENT - EMAIL PARAMETER")
    print("="*80 + "\n")
    
    # Create a test passport first
    test_email = f"stamp-test-{int(time.time())}@example.com"
    passport_id = None
    
    # Test A: Create passport for testing
    try:
        start = time.time()
        payload = {
            "email": test_email
        }
        response = requests.post(f"{API_BASE}/rewards/passport", json=payload, timeout=10)
        elapsed = int((time.time() - start) * 1000)
        
        if response.status_code == 200:
            data = response.json()
            passport_id = data.get("passport", {}).get("_id", "")
            log_test(
                "Passport Stamp API",
                "Create test passport",
                bool(passport_id),
                f"Passport created: {passport_id}",
                elapsed
            )
        else:
            log_test("Passport Stamp API", "Create test passport", False, f"Status: {response.status_code}")
    except Exception as e:
        log_test("Passport Stamp API", "Create test passport", False, f"Error: {str(e)}")
    
    # Test B: Add stamp using email parameter (NEW FUNCTIONALITY)
    if passport_id:
        try:
            start = time.time()
            payload = {
                "email": test_email,
                "marketName": "Serenbe",
                "activityType": "visit"
            }
            response = requests.post(f"{API_BASE}/rewards/stamp", json=payload, timeout=10)
            elapsed = int((time.time() - start) * 1000)
            
            if response.status_code == 200:
                data = response.json()
                success = data.get("success", False)
                stamp = data.get("stamp", {})
                passport = data.get("passport", {})
                stamps_array = passport.get("stamps", [])
                stamps_count = len(stamps_array) if isinstance(stamps_array, list) else passport.get("totalStamps", 0)
                
                # Verify all required response fields
                has_all_fields = all([
                    "success" in data,
                    "stamp" in data,
                    "rewards" in data,
                    "newVouchers" in data,
                    "passport" in data
                ])
                
                log_test(
                    "Passport Stamp API",
                    "Add stamp with email parameter",
                    success and has_all_fields and stamps_count > 0,
                    f"Stamp added successfully using email. Stamps: {stamps_count}, All fields present: {has_all_fields}",
                    elapsed
                )
            else:
                log_test(
                    "Passport Stamp API",
                    "Add stamp with email parameter",
                    False,
                    f"Status: {response.status_code}, Response: {response.text[:200]}"
                )
        except Exception as e:
            log_test("Passport Stamp API", "Add stamp with email parameter", False, f"Error: {str(e)}")
    
    # Test C: Add stamp using passportId (existing functionality still works)
    if passport_id:
        try:
            start = time.time()
            payload = {
                "passportId": passport_id,
                "marketName": "East Atlanta Village",
                "activityType": "visit"
            }
            response = requests.post(f"{API_BASE}/rewards/stamp", json=payload, timeout=10)
            elapsed = int((time.time() - start) * 1000)
            
            if response.status_code == 200:
                data = response.json()
                success = data.get("success", False)
                passport = data.get("passport", {})
                stamps_array = passport.get("stamps", [])
                stamps_count = len(stamps_array) if isinstance(stamps_array, list) else passport.get("totalStamps", 0)
                
                log_test(
                    "Passport Stamp API",
                    "Add stamp with passportId (existing)",
                    success and stamps_count >= 2,
                    f"Stamp added successfully using passportId. Total stamps: {stamps_count}",
                    elapsed
                )
            else:
                log_test(
                    "Passport Stamp API",
                    "Add stamp with passportId (existing)",
                    False,
                    f"Status: {response.status_code}"
                )
        except Exception as e:
            log_test("Passport Stamp API", "Add stamp with passportId (existing)", False, f"Error: {str(e)}")
    
    # Test D: Error case - email with no passport
    try:
        start = time.time()
        payload = {
            "email": "nonexistent-user@example.com",
            "marketName": "Serenbe",
            "activityType": "visit"
        }
        response = requests.post(f"{API_BASE}/rewards/stamp", json=payload, timeout=10)
        elapsed = int((time.time() - start) * 1000)
        
        # Should return 404 error
        if response.status_code == 404:
            data = response.json()
            error_msg = data.get("error", "")
            log_test(
                "Passport Stamp API",
                "Error case - email with no passport",
                "no passport" in error_msg.lower() or "not found" in error_msg.lower(),
                f"Correctly returned 404: {error_msg}",
                elapsed
            )
        else:
            log_test(
                "Passport Stamp API",
                "Error case - email with no passport",
                False,
                f"Expected 404, got {response.status_code}"
            )
    except Exception as e:
        log_test("Passport Stamp API", "Error case - email with no passport", False, f"Error: {str(e)}")
    
    # Test E: Verify response structure completeness
    if passport_id:
        try:
            start = time.time()
            payload = {
                "email": test_email,
                "marketName": "Ponce City Market",
                "activityType": "purchase"
            }
            response = requests.post(f"{API_BASE}/rewards/stamp", json=payload, timeout=10)
            elapsed = int((time.time() - start) * 1000)
            
            if response.status_code == 200:
                data = response.json()
                
                # Check all required fields
                required_fields = ["success", "stamp", "rewards", "newVouchers", "passport"]
                missing_fields = [field for field in required_fields if field not in data]
                
                log_test(
                    "Passport Stamp API",
                    "Response structure completeness",
                    len(missing_fields) == 0,
                    f"All required fields present. Missing: {missing_fields if missing_fields else 'None'}",
                    elapsed
                )
            else:
                log_test(
                    "Passport Stamp API",
                    "Response structure completeness",
                    False,
                    f"Status: {response.status_code}"
                )
        except Exception as e:
            log_test("Passport Stamp API", "Response structure completeness", False, f"Error: {str(e)}")

def test_quiz_recommendations_enhancement():
    """Test 3: Quiz Recommendations Enhancement - Better matching with 3-4 products"""
    print("\n" + "="*80)
    print("TEST 3: QUIZ RECOMMENDATIONS ENHANCEMENT - IMPROVED MATCHING")
    print("="*80 + "\n")
    
    # Test A: Energy + Lemonade + Bold
    try:
        start = time.time()
        payload = {
            "goal": "energy",
            "texture": "lemonade",
            "adventure": "bold"
        }
        response = requests.post(f"{API_BASE}/quiz/recommendations", json=payload, timeout=10)
        elapsed = int((time.time() - start) * 1000)
        
        if response.status_code == 200:
            data = response.json()
            recommendations = data.get("recommendations", [])
            
            # Check for 3-4 products
            count_valid = 3 <= len(recommendations) <= 4
            
            # Check confidence scores (70-95% range)
            confidence_scores = [r.get("confidence", 0) for r in recommendations]
            confidence_valid = all(0.70 <= score <= 0.95 for score in confidence_scores)
            
            # Check match scores exist
            match_scores = [r.get("matchScore", -1) for r in recommendations]
            match_scores_exist = all(score >= 0 for score in match_scores)
            
            # Check for lemonade products prioritized
            product_names = [r.get("name", "").lower() for r in recommendations]
            has_lemonade = any("lemonade" in name or "mango" in name for name in product_names)
            
            log_test(
                "Quiz Recommendations",
                "Energy + Lemonade + Bold",
                count_valid and confidence_valid and match_scores_exist,
                f"Products: {len(recommendations)}, Confidence: {confidence_scores}, Match Scores: {match_scores}, Has Lemonade: {has_lemonade}",
                elapsed
            )
        else:
            log_test(
                "Quiz Recommendations",
                "Energy + Lemonade + Bold",
                False,
                f"Status: {response.status_code}"
            )
    except Exception as e:
        log_test("Quiz Recommendations", "Energy + Lemonade + Bold", False, f"Error: {str(e)}")
    
    # Test B: Immune + Shot + Bold
    try:
        start = time.time()
        payload = {
            "goal": "immune",
            "texture": "shot",
            "adventure": "bold"
        }
        response = requests.post(f"{API_BASE}/quiz/recommendations", json=payload, timeout=10)
        elapsed = int((time.time() - start) * 1000)
        
        if response.status_code == 200:
            data = response.json()
            recommendations = data.get("recommendations", [])
            
            # Check for 3-4 products
            count_valid = 3 <= len(recommendations) <= 4
            
            # Check confidence scores (70-95% range)
            confidence_scores = [r.get("confidence", 0) for r in recommendations]
            confidence_valid = all(0.70 <= score <= 0.95 for score in confidence_scores)
            
            # Check for shot format products (2oz)
            product_names = [r.get("name", "").lower() for r in recommendations]
            has_shot = any("2oz" in name or "shot" in name for name in product_names)
            
            # Check recommendation reasons
            reasons = [r.get("recommendationReason", "") for r in recommendations]
            has_reasons = all(len(reason) > 0 for reason in reasons)
            
            log_test(
                "Quiz Recommendations",
                "Immune + Shot + Bold",
                count_valid and confidence_valid and has_reasons,
                f"Products: {len(recommendations)}, Confidence: {confidence_scores}, Has Shot: {has_shot}, Has Reasons: {has_reasons}",
                elapsed
            )
        else:
            log_test(
                "Quiz Recommendations",
                "Immune + Shot + Bold",
                False,
                f"Status: {response.status_code}"
            )
    except Exception as e:
        log_test("Quiz Recommendations", "Immune + Shot + Bold", False, f"Error: {str(e)}")
    
    # Test C: Gut + Gel + Mild
    try:
        start = time.time()
        payload = {
            "goal": "gut",
            "texture": "gel",
            "adventure": "mild"
        }
        response = requests.post(f"{API_BASE}/quiz/recommendations", json=payload, timeout=10)
        elapsed = int((time.time() - start) * 1000)
        
        if response.status_code == 200:
            data = response.json()
            recommendations = data.get("recommendations", [])
            
            # Check for 3-4 products
            count_valid = 3 <= len(recommendations) <= 4
            
            # Check match scores properly reflect alignment
            match_scores = [r.get("matchScore", 0) for r in recommendations]
            scores_sorted = match_scores == sorted(match_scores, reverse=True)
            
            log_test(
                "Quiz Recommendations",
                "Gut + Gel + Mild",
                count_valid and scores_sorted,
                f"Products: {len(recommendations)}, Match Scores Sorted: {scores_sorted}, Scores: {match_scores}",
                elapsed
            )
        else:
            log_test(
                "Quiz Recommendations",
                "Gut + Gel + Mild",
                False,
                f"Status: {response.status_code}"
            )
    except Exception as e:
        log_test("Quiz Recommendations", "Gut + Gel + Mild", False, f"Error: {str(e)}")
    
    # Test D: Skin + Lemonade + Mild
    try:
        start = time.time()
        payload = {
            "goal": "skin",
            "texture": "lemonade",
            "adventure": "mild"
        }
        response = requests.post(f"{API_BASE}/quiz/recommendations", json=payload, timeout=10)
        elapsed = int((time.time() - start) * 1000)
        
        if response.status_code == 200:
            data = response.json()
            recommendations = data.get("recommendations", [])
            
            # Check for 3-4 products
            count_valid = 3 <= len(recommendations) <= 4
            
            # Verify recommendationReason field provides meaningful descriptions
            reasons = [r.get("recommendationReason", "") for r in recommendations]
            meaningful_reasons = all(len(reason) > 20 for reason in reasons)
            
            log_test(
                "Quiz Recommendations",
                "Skin + Lemonade + Mild",
                count_valid and meaningful_reasons,
                f"Products: {len(recommendations)}, Meaningful Reasons: {meaningful_reasons}",
                elapsed
            )
        else:
            log_test(
                "Quiz Recommendations",
                "Skin + Lemonade + Mild",
                False,
                f"Status: {response.status_code}"
            )
    except Exception as e:
        log_test("Quiz Recommendations", "Skin + Lemonade + Mild", False, f"Error: {str(e)}")
    
    # Test E: Calm + Shot + Bold
    try:
        start = time.time()
        payload = {
            "goal": "calm",
            "texture": "shot",
            "adventure": "bold"
        }
        response = requests.post(f"{API_BASE}/quiz/recommendations", json=payload, timeout=10)
        elapsed = int((time.time() - start) * 1000)
        
        if response.status_code == 200:
            data = response.json()
            recommendations = data.get("recommendations", [])
            
            # Check for 3-4 products
            count_valid = 3 <= len(recommendations) <= 4
            
            # Check all required fields exist
            required_fields = ["id", "name", "price", "confidence", "matchScore", "recommendationReason"]
            all_have_fields = all(
                all(field in rec for field in required_fields)
                for rec in recommendations
            )
            
            log_test(
                "Quiz Recommendations",
                "Calm + Shot + Bold",
                count_valid and all_have_fields,
                f"Products: {len(recommendations)}, All Required Fields: {all_have_fields}",
                elapsed
            )
        else:
            log_test(
                "Quiz Recommendations",
                "Calm + Shot + Bold",
                False,
                f"Status: {response.status_code}"
            )
    except Exception as e:
        log_test("Quiz Recommendations", "Calm + Shot + Bold", False, f"Error: {str(e)}")

def print_summary():
    """Print comprehensive test summary"""
    print("\n" + "="*80)
    print("BUG FIXES TESTING SUMMARY")
    print("="*80 + "\n")
    
    total = test_results["total"]
    passed = test_results["passed"]
    failed = test_results["failed"]
    success_rate = (passed / total * 100) if total > 0 else 0
    
    print(f"Total Tests: {total}")
    print(f"Passed: {passed} ✅")
    print(f"Failed: {failed} ❌")
    print(f"Success Rate: {success_rate:.1f}%\n")
    
    # Group by category
    categories = {}
    for test in test_results["tests"]:
        category = test["category"]
        if category not in categories:
            categories[category] = {"passed": 0, "failed": 0, "tests": []}
        
        if "✅" in test["status"]:
            categories[category]["passed"] += 1
        else:
            categories[category]["failed"] += 1
        categories[category]["tests"].append(test)
    
    # Print category summaries
    for category, data in sorted(categories.items()):
        total_cat = data["passed"] + data["failed"]
        rate = (data["passed"] / total_cat * 100) if total_cat > 0 else 0
        print(f"\n{category}: {data['passed']}/{total_cat} passed ({rate:.1f}%)")
        
        # Show failed tests
        failed_tests = [t for t in data["tests"] if "❌" in t["status"]]
        if failed_tests:
            print("  Failed Tests:")
            for test in failed_tests:
                print(f"    - {test['test']}: {test['details']}")
    
    # Overall assessment
    print("\n" + "="*80)
    if success_rate == 100:
        print("✅ ALL BUG FIXES WORKING PERFECTLY")
        print("All 3 critical bug fixes validated and operational.")
    elif success_rate >= 85:
        print("✅ BUG FIXES MOSTLY WORKING - MINOR ISSUES")
        print("Most fixes operational. Review failed tests for minor adjustments.")
    else:
        print("❌ BUG FIXES NEED ATTENTION")
        print("Some fixes not working as expected. Review failed tests.")
    print("="*80 + "\n")

def main():
    """Run all bug fix tests"""
    print("\n" + "="*80)
    print("COMPREHENSIVE BACKEND BUG FIXES TESTING")
    print("Taste of Gratitude E-commerce Platform")
    print(f"Test Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*80)
    
    # Run all test categories
    test_catalog_webhook_fix()
    test_passport_stamp_api_enhancement()
    test_quiz_recommendations_enhancement()
    
    # Print summary
    print_summary()
    
    # Save results to file
    with open("/app/test_results_bug_fixes.json", "w") as f:
        json.dump(test_results, f, indent=2)
    print(f"Detailed results saved to: /app/test_results_bug_fixes.json\n")

if __name__ == "__main__":
    main()
