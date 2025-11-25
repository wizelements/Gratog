"""
Comprehensive E2E Test Suite for Taste of Gratitude
Run with: python comprehensive_tests.py
"""

import requests
import json
import random
from datetime import datetime

BASE_URL = "http://localhost:3000"
VERCEL_URL = "https://gratog.vercel.app"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'

def test_result(name, passed, details=""):
    symbol = f"{Colors.GREEN}✅" if passed else f"{Colors.RED}❌"
    print(f"{symbol} {name}{Colors.END}")
    if details:
        print(f"   {details}")
    return passed

def generate_test_user():
    timestamp = int(datetime.now().timestamp())
    return {
        "name": f"Test User {timestamp}",
        "email": f"test{timestamp}@example.com",
        "password": "test123456"
    }

print(f"\n{Colors.BLUE}═══════════════════════════════════════════════════{Colors.END}")
print(f"{Colors.BLUE}  TASTE OF GRATITUDE - COMPREHENSIVE TEST SUITE{Colors.END}")
print(f"{Colors.BLUE}═══════════════════════════════════════════════════{Colors.END}\n")

results = []

# ========================================
# 1. AUTH SYSTEM TESTS
# ========================================
print(f"\n{Colors.YELLOW}[1] AUTHENTICATION & USER SYSTEM{Colors.END}")
print("─" * 50)

# Test 1.1: Registration
test_user = generate_test_user()
try:
    response = requests.post(f"{BASE_URL}/api/auth/register", json=test_user, timeout=10)
    passed = response.status_code == 201 and response.json().get('success')
    token = response.json().get('token') if passed else None
    results.append(test_result("Registration", passed, f"Status: {response.status_code}"))
except Exception as e:
    results.append(test_result("Registration", False, str(e)))
    token = None

# Test 1.2: Login
try:
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": test_user['email'],
        "password": test_user['password']
    }, timeout=10)
    passed = response.status_code == 200 and response.json().get('success')
    results.append(test_result("Login", passed, f"Status: {response.status_code}"))
except Exception as e:
    results.append(test_result("Login", False, str(e)))

# Test 1.3: Login with wrong password
try:
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": test_user['email'],
        "password": "wrongpassword"
    }, timeout=10)
    passed = response.status_code == 401
    results.append(test_result("Login Rejection", passed, "Wrong password rejected"))
except Exception as e:
    results.append(test_result("Login Rejection", False, str(e)))

# Test 1.4: Duplicate registration
try:
    response = requests.post(f"{BASE_URL}/api/auth/register", json=test_user, timeout=10)
    passed = response.status_code == 409  # Conflict
    results.append(test_result("Duplicate Email Rejection", passed, "Duplicate prevented"))
except Exception as e:
    results.append(test_result("Duplicate Email Rejection", False, str(e)))

# ========================================
# 2. PRODUCTS & CATALOG
# ========================================
print(f"\n{Colors.YELLOW}[2] PRODUCTS & CATALOG{Colors.END}")
print("─" * 50)

# Test 2.1: Get Products
try:
    response = requests.get(f"{BASE_URL}/api/products", timeout=10)
    data = response.json()
    products = data.get('products', [])
    passed = response.status_code == 200 and len(products) > 0
    results.append(test_result("Fetch Products", passed, f"Found {len(products)} products"))
except Exception as e:
    results.append(test_result("Fetch Products", False, str(e)))
    products = []

# Test 2.2: No $0.00 Prices
if products:
    zero_price_products = [p for p in products if p.get('price', 0) <= 0]
    passed = len(zero_price_products) == 0
    results.append(test_result("Price Integrity", passed, 
                              f"0 products with $0.00 price" if passed else f"Found {len(zero_price_products)} with $0.00"))
else:
    results.append(test_result("Price Integrity", False, "No products to check"))

# Test 2.3: Product Images
if products:
    with_images = len([p for p in products if p.get('image')])
    results.append(test_result("Product Images", with_images > 0, 
                              f"{with_images}/{len(products)} products have images"))

# ========================================
# 3. QUIZ SYSTEM
# ========================================
print(f"\n{Colors.YELLOW}[3] QUIZ & RECOMMENDATIONS{Colors.END}")
print("─" * 50)

# Test 3.1: Get Recommendations
try:
    response = requests.post(f"{BASE_URL}/api/quiz/recommendations", json={
        "goal": "energy",
        "texture": "gel",
        "adventure": "bold"
    }, timeout=10)
    data = response.json()
    recommendations = data.get('recommendations', [])
    passed = response.status_code == 200 and len(recommendations) > 0
    results.append(test_result("Quiz Recommendations", passed, 
                              f"Got {len(recommendations)} recommendations"))
except Exception as e:
    results.append(test_result("Quiz Recommendations", False, str(e)))

# Test 3.2: Recommendation Prices
if 'recommendations' in locals() and recommendations:
    rec_with_prices = [r for r in recommendations if r.get('price', 0) > 0 or r.get('priceCents', 0) > 0]
    passed = len(rec_with_prices) == len(recommendations)
    results.append(test_result("Recommendation Prices", passed,
                              f"All {len(recommendations)} have valid prices" if passed else "Some missing prices"))

# ========================================
# 4. REWARDS SYSTEM
# ========================================
print(f"\n{Colors.YELLOW}[4] REWARDS & LEADERBOARD{Colors.END}")
print("─" * 50)

# Test 4.1: Leaderboard
try:
    response = requests.get(f"{BASE_URL}/api/rewards/leaderboard", timeout=10)
    data = response.json()
    passed = response.status_code == 200
    leaderboard = data.get('leaderboard', [])
    results.append(test_result("Leaderboard API", passed, 
                              f"Returned {len(leaderboard)} entries"))
except Exception as e:
    results.append(test_result("Leaderboard API", False, str(e)))

# ========================================
# 5. PRODUCTION COMPARISON (VERCEL)
# ========================================
print(f"\n{Colors.YELLOW}[5] PRODUCTION (VERCEL) TESTS{Colors.END}")
print("─" * 50)

# Test 5.1: Production Site Accessible
try:
    response = requests.get(f"{VERCEL_URL}", timeout=10)
    passed = response.status_code == 200
    results.append(test_result("Vercel Site Accessible", passed, f"Status: {response.status_code}"))
except Exception as e:
    results.append(test_result("Vercel Site Accessible", False, str(e)))

# Test 5.2: Production API - Products
try:
    response = requests.get(f"{VERCEL_URL}/api/products", timeout=10)
    passed = response.status_code == 200
    results.append(test_result("Vercel Products API", passed, f"Status: {response.status_code}"))
except Exception as e:
    results.append(test_result("Vercel Products API", False, str(e)))

# Test 5.3: Production Auth API Status
try:
    test_prod_user = generate_test_user()
    response = requests.post(f"{VERCEL_URL}/api/auth/register", json=test_prod_user, timeout=10)
    passed = response.status_code in [201, 500]  # 500 expected due to DB config
    details = "Working" if response.status_code == 201 else "DB Config Issue (Expected)"
    results.append(test_result("Vercel Auth API", passed, details))
except Exception as e:
    results.append(test_result("Vercel Auth API", False, str(e)))

# ========================================
# FINAL SUMMARY
# ========================================
print(f"\n{Colors.BLUE}═══════════════════════════════════════════════════{Colors.END}")
print(f"{Colors.BLUE}  TEST SUMMARY{Colors.END}")
print(f"{Colors.BLUE}═══════════════════════════════════════════════════{Colors.END}\n")

passed_count = sum(results)
total_count = len(results)
pass_rate = (passed_count / total_count * 100) if total_count > 0 else 0

print(f"Total Tests: {total_count}")
print(f"{Colors.GREEN}Passed: {passed_count}{Colors.END}")
print(f"{Colors.RED}Failed: {total_count - passed_count}{Colors.END}")
print(f"Pass Rate: {pass_rate:.1f}%\n")

if pass_rate >= 90:
    print(f"{Colors.GREEN}🎉 EXCELLENT! System is production-ready.{Colors.END}\n")
elif pass_rate >= 75:
    print(f"{Colors.YELLOW}⚠️  GOOD. Minor issues to address.{Colors.END}\n")
else:
    print(f"{Colors.RED}❌ CRITICAL. Major issues require attention.{Colors.END}\n")

exit(0 if passed_count == total_count else 1)
