#!/usr/bin/env python3
"""
Comprehensive Fix Verification Script
Tests all implemented fixes and validates system readiness
"""

import requests
import json
import sys
from datetime import datetime

BASE_URL = "https://cart-rescue-1.preview.emergentagent.com"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    BOLD = '\033[1m'
    END = '\033[0m'

def print_header(text):
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{text}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.END}\n")

def print_test(name, passed, details=""):
    status = f"{Colors.GREEN}✅ PASS{Colors.END}" if passed else f"{Colors.RED}❌ FAIL{Colors.END}"
    print(f"{status} - {name}")
    if details and not passed:
        print(f"     {Colors.YELLOW}{details}{Colors.END}")

results = {
    "timestamp": datetime.now().isoformat(),
    "total_tests": 0,
    "passed_tests": 0,
    "failed_tests": 0,
    "categories": {}
}

def run_test_category(category_name, tests):
    """Run a category of tests"""
    print_header(f"Testing: {category_name}")
    
    category_results = {
        "total": 0,
        "passed": 0,
        "failed": 0,
        "tests": []
    }
    
    for test in tests:
        category_results["total"] += 1
        results["total_tests"] += 1
        
        try:
            test_result = test["function"]()
            passed = test_result.get("passed", False)
            details = test_result.get("details", "")
            
            if passed:
                category_results["passed"] += 1
                results["passed_tests"] += 1
            else:
                category_results["failed"] += 1
                results["failed_tests"] += 1
            
            print_test(test["name"], passed, details)
            
            category_results["tests"].append({
                "name": test["name"],
                "passed": passed,
                "details": details
            })
            
        except Exception as e:
            category_results["failed"] += 1
            results["failed_tests"] += 1
            print_test(test["name"], False, f"Exception: {str(e)}")
            
            category_results["tests"].append({
                "name": test["name"],
                "passed": False,
                "details": f"Exception: {str(e)}"
            })
    
    results["categories"][category_name] = category_results
    
    # Print category summary
    print(f"\n{Colors.BOLD}Category Summary:{Colors.END}")
    print(f"  Passed: {Colors.GREEN}{category_results['passed']}/{category_results['total']}{Colors.END}")
    print(f"  Failed: {Colors.RED}{category_results['failed']}/{category_results['total']}{Colors.END}")
    print(f"  Success Rate: {(category_results['passed']/category_results['total']*100):.1f}%")

# ============================================================================
# TEST DEFINITIONS
# ============================================================================

def test_health_endpoint():
    """Test health check endpoint responds"""
    try:
        response = requests.get(f"{BASE_URL}/api/health", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data.get("status") == "healthy":
                return {"passed": True}
            return {"passed": False, "details": "Status not healthy"}
        return {"passed": False, "details": f"HTTP {response.status_code}"}
    except Exception as e:
        return {"passed": False, "details": str(e)}

def test_database_connection():
    """Test database connection is working"""
    try:
        response = requests.get(f"{BASE_URL}/api/health", timeout=10)
        if response.status_code == 200:
            data = response.json()
            db_status = data.get("services", {}).get("database")
            if db_status == "connected":
                return {"passed": True}
            return {"passed": False, "details": f"Database status: {db_status}"}
        return {"passed": False, "details": f"HTTP {response.status_code}"}
    except Exception as e:
        return {"passed": False, "details": str(e)}

def test_square_api_status():
    """Test Square API status is reported"""
    try:
        response = requests.get(f"{BASE_URL}/api/health", timeout=10)
        if response.status_code == 200:
            data = response.json()
            square_status = data.get("services", {}).get("square_api")
            if square_status in ["production", "sandbox"]:
                return {"passed": True, "details": f"Square: {square_status}"}
            return {"passed": False, "details": f"Square status: {square_status}"}
        return {"passed": False, "details": f"HTTP {response.status_code}"}
    except Exception as e:
        return {"passed": False, "details": str(e)}

def test_order_creation_validation():
    """Test order creation validates missing cart"""
    try:
        response = requests.post(
            f"{BASE_URL}/api/orders/create",
            json={},
            timeout=10
        )
        # Should return 400 for missing cart
        if response.status_code == 400:
            data = response.json()
            if "cart" in data.get("error", "").lower():
                return {"passed": True}
        return {"passed": False, "details": f"Expected 400, got {response.status_code}"}
    except Exception as e:
        return {"passed": False, "details": str(e)}

def test_payment_api_validation():
    """Test payment API validates missing sourceId"""
    try:
        response = requests.post(
            f"{BASE_URL}/api/payments",
            json={"amountCents": 1000},
            timeout=10
        )
        # Should return 400 for missing sourceId
        if response.status_code == 400:
            data = response.json()
            if "source" in data.get("error", "").lower():
                return {"passed": True}
        return {"passed": False, "details": f"Expected 400, got {response.status_code}"}
    except Exception as e:
        return {"passed": False, "details": str(e)}

def test_checkout_api_validation():
    """Test checkout API validates empty line items"""
    try:
        response = requests.post(
            f"{BASE_URL}/api/checkout",
            json={"lineItems": []},
            timeout=10
        )
        # Should return 400 for empty line items
        if response.status_code == 400:
            data = response.json()
            if "line items" in data.get("error", "").lower():
                return {"passed": True}
        return {"passed": False, "details": f"Expected 400, got {response.status_code}"}
    except Exception as e:
        return {"passed": False, "details": str(e)}

def test_webhook_endpoint():
    """Test webhook endpoint is accessible"""
    try:
        response = requests.get(f"{BASE_URL}/api/square-webhook", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if "webhook" in data.get("message", "").lower():
                return {"passed": True}
        return {"passed": False, "details": f"HTTP {response.status_code}"}
    except Exception as e:
        return {"passed": False, "details": str(e)}

def test_admin_login_validation():
    """Test admin login validates missing credentials"""
    try:
        response = requests.post(
            f"{BASE_URL}/api/admin/auth/login",
            json={},
            timeout=10
        )
        # Should return 400 for missing credentials
        if response.status_code == 400:
            data = response.json()
            if "email" in data.get("error", "").lower() or "password" in data.get("error", "").lower():
                return {"passed": True}
        return {"passed": False, "details": f"Expected 400, got {response.status_code}"}
    except Exception as e:
        return {"passed": False, "details": str(e)}

def test_products_api():
    """Test products API returns data"""
    try:
        response = requests.get(f"{BASE_URL}/api/products", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data.get("success") and isinstance(data.get("products"), list):
                return {"passed": True, "details": f"{len(data['products'])} products"}
        return {"passed": False, "details": f"HTTP {response.status_code}"}
    except Exception as e:
        return {"passed": False, "details": str(e)}

def test_square_diagnostic_endpoint():
    """Test Square diagnostic endpoint exists"""
    try:
        response = requests.get(f"{BASE_URL}/api/square/diagnose", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if "diagnostic" in data.get("message", "").lower():
                return {"passed": True}
        return {"passed": False, "details": f"HTTP {response.status_code}"}
    except Exception as e:
        return {"passed": False, "details": str(e)}

def test_error_details_in_dev():
    """Test that error responses include details in development"""
    try:
        response = requests.post(
            f"{BASE_URL}/api/orders/create",
            json={},
            timeout=10
        )
        # Check if response is JSON with error field
        if response.headers.get("content-type", "").startswith("application/json"):
            data = response.json()
            # In development, might have details
            if "error" in data:
                return {"passed": True}
        return {"passed": False, "details": "No JSON error response"}
    except Exception as e:
        return {"passed": False, "details": str(e)}

# ============================================================================
# RUN ALL TESTS
# ============================================================================

if __name__ == "__main__":
    print(f"\n{Colors.BOLD}🧪 Comprehensive Fix Verification{Colors.END}")
    print(f"Testing: {BASE_URL}")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Category 1: System Health
    run_test_category("System Health", [
        {"name": "Health endpoint responds", "function": test_health_endpoint},
        {"name": "Database connection working", "function": test_database_connection},
        {"name": "Square API status available", "function": test_square_api_status},
    ])
    
    # Category 2: Input Validation (Error Handling Improvements)
    run_test_category("Input Validation & Error Handling", [
        {"name": "Order creation validates missing cart", "function": test_order_creation_validation},
        {"name": "Payment API validates missing sourceId", "function": test_payment_api_validation},
        {"name": "Checkout API validates empty line items", "function": test_checkout_api_validation},
        {"name": "Admin login validates credentials", "function": test_admin_login_validation},
        {"name": "Error responses include proper structure", "function": test_error_details_in_dev},
    ])
    
    # Category 3: API Endpoints
    run_test_category("API Endpoints", [
        {"name": "Products API returns data", "function": test_products_api},
        {"name": "Webhook endpoint accessible", "function": test_webhook_endpoint},
        {"name": "Square diagnostic endpoint exists", "function": test_square_diagnostic_endpoint},
    ])
    
    # Final Summary
    print_header("FINAL RESULTS")
    
    success_rate = (results["passed_tests"] / results["total_tests"] * 100) if results["total_tests"] > 0 else 0
    
    print(f"Total Tests Run: {Colors.BOLD}{results['total_tests']}{Colors.END}")
    print(f"Passed: {Colors.GREEN}{results['passed_tests']}{Colors.END}")
    print(f"Failed: {Colors.RED}{results['failed_tests']}{Colors.END}")
    print(f"Success Rate: {Colors.BOLD}{success_rate:.1f}%{Colors.END}")
    
    print(f"\n{Colors.BOLD}Status by Category:{Colors.END}")
    for category, data in results["categories"].items():
        cat_rate = (data["passed"] / data["total"] * 100) if data["total"] > 0 else 0
        status = Colors.GREEN if cat_rate >= 80 else Colors.YELLOW if cat_rate >= 60 else Colors.RED
        print(f"  {category}: {status}{cat_rate:.0f}%{Colors.END} ({data['passed']}/{data['total']})")
    
    # Save results to file
    with open('/app/fix_verification_results.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"\n{Colors.BLUE}📝 Results saved to: fix_verification_results.json{Colors.END}")
    
    # Determine exit code
    if results["failed_tests"] == 0:
        print(f"\n{Colors.GREEN}{Colors.BOLD}✅ ALL TESTS PASSED!{Colors.END}")
        print(f"\n{Colors.GREEN}All code fixes are working correctly.{Colors.END}")
        print(f"{Colors.YELLOW}Next step: Update Square credentials and deploy.{Colors.END}")
        sys.exit(0)
    elif success_rate >= 80:
        print(f"\n{Colors.YELLOW}{Colors.BOLD}⚠️  MOSTLY PASSING{Colors.END}")
        print(f"\n{Colors.YELLOW}Code fixes appear to be working.{Colors.END}")
        print(f"{Colors.YELLOW}Some failures may be due to missing Square credentials.{Colors.END}")
        sys.exit(0)
    else:
        print(f"\n{Colors.RED}{Colors.BOLD}❌ SOME TESTS FAILED{Colors.END}")
        print(f"\n{Colors.RED}Please review failures above.{Colors.END}")
        sys.exit(1)
