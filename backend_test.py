#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Unified Intelligent Flow
Tests all new intelligent APIs and verifies backward compatibility
"""

import requests
import json
from datetime import datetime

# Backend URL
BASE_URL = "https://cart-rescue-1.preview.emergentagent.com/api"

# Test results tracking
test_results = {
    "passed": 0,
    "failed": 0,
    "tests": []
}

def log_test(name, passed, details=""):
    """Log test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    test_results["tests"].append({
        "name": name,
        "passed": passed,
        "details": details
    })
    if passed:
        test_results["passed"] += 1
        print(f"{status}: {name}")
    else:
        test_results["failed"] += 1
        print(f"{status}: {name}")
        if details:
            print(f"   Details: {details}")

def test_get_products_unified():
    """Test GET /api/products (Unified Intelligent)"""
    print("\n🧪 Testing GET /api/products (Unified Intelligent)...")
    
    try:
        # Test 1: Get all products
        response = requests.get(f"{BASE_URL}/products", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            products = data.get('products', [])
            
            # Check product count
            if len(products) == 29:
                log_test("GET /api/products - Returns 29 products", True)
            else:
                log_test("GET /api/products - Returns 29 products", False, 
                        f"Expected 29 products, got {len(products)}")
            
            # Check product structure
            if products:
                product = products[0]
                has_intelligent_category = 'intelligentCategory' in product
                has_ingredients = 'ingredients' in product
                has_benefit_story = 'benefitStory' in product
                has_ingredient_icons = 'ingredientIcons' in product
                has_tags = 'tags' in product
                has_price = product.get('price') is not None
                
                log_test("GET /api/products - Products have intelligentCategory", has_intelligent_category)
                log_test("GET /api/products - Products have ingredients[]", has_ingredients)
                log_test("GET /api/products - Products have benefitStory", has_benefit_story)
                log_test("GET /api/products - Products have ingredientIcons[]", has_ingredient_icons)
                log_test("GET /api/products - Products have tags[]", has_tags)
                log_test("GET /api/products - Prices showing correctly (not null)", has_price)
            
            # Test 2: Filter by category
            response = requests.get(f"{BASE_URL}/products?category=Lemonades & Juices", timeout=10)
            if response.status_code == 200:
                data = response.json()
                filtered_products = data.get('products', [])
                log_test("GET /api/products?category=Lemonades & Juices", True, 
                        f"Returned {len(filtered_products)} products")
            else:
                log_test("GET /api/products?category=Lemonades & Juices", False, 
                        f"Status: {response.status_code}")
            
            # Test 3: Filter by tag
            response = requests.get(f"{BASE_URL}/products?tag=detox", timeout=10)
            if response.status_code == 200:
                data = response.json()
                log_test("GET /api/products?tag=detox", True, 
                        f"Returned {len(data.get('products', []))} products")
            else:
                log_test("GET /api/products?tag=detox", False, f"Status: {response.status_code}")
            
            # Test 4: Filter by ingredient
            response = requests.get(f"{BASE_URL}/products?ingredient=ginger", timeout=10)
            if response.status_code == 200:
                data = response.json()
                log_test("GET /api/products?ingredient=ginger", True, 
                        f"Returned {len(data.get('products', []))} products")
            else:
                log_test("GET /api/products?ingredient=ginger", False, 
                        f"Status: {response.status_code}")
        else:
            log_test("GET /api/products - Basic request", False, 
                    f"Status: {response.status_code}, Response: {response.text[:200]}")
    
    except Exception as e:
        log_test("GET /api/products - Exception", False, str(e))

def test_unified_products():
    """Test GET /api/unified/products"""
    print("\n🧪 Testing GET /api/unified/products...")
    
    try:
        # Test 1: Get all products
        response = requests.get(f"{BASE_URL}/unified/products", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            log_test("GET /api/unified/products - Basic request", True, 
                    f"Returned {data.get('count', 0)} products")
            
            # Test 2: Category filtering
            response = requests.get(f"{BASE_URL}/unified/products?category=Lemonades & Juices", timeout=10)
            if response.status_code == 200:
                data = response.json()
                log_test("GET /api/unified/products - Category filtering", True, 
                        f"Returned {data.get('count', 0)} products")
            else:
                log_test("GET /api/unified/products - Category filtering", False, 
                        f"Status: {response.status_code}")
            
            # Test 3: Search functionality
            response = requests.get(f"{BASE_URL}/unified/products?search=ginger", timeout=10)
            if response.status_code == 200:
                data = response.json()
                log_test("GET /api/unified/products - Search functionality", True, 
                        f"Returned {data.get('count', 0)} products")
            else:
                log_test("GET /api/unified/products - Search functionality", False, 
                        f"Status: {response.status_code}")
        else:
            log_test("GET /api/unified/products - Basic request", False, 
                    f"Status: {response.status_code}")
    
    except Exception as e:
        log_test("GET /api/unified/products - Exception", False, str(e))

def test_unified_sync():
    """Test GET /api/unified/sync"""
    print("\n🧪 Testing GET /api/unified/sync...")
    
    try:
        response = requests.get(f"{BASE_URL}/unified/sync", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            stats = data.get('stats', {})
            
            has_total_products = 'totalProducts' in stats
            has_last_sync = 'lastSync' in stats
            
            log_test("GET /api/unified/sync - Returns sync stats", True, 
                    f"Total products: {stats.get('totalProducts', 'N/A')}")
            log_test("GET /api/unified/sync - Has totalProducts", has_total_products)
            log_test("GET /api/unified/sync - Has lastSync timestamp", has_last_sync)
        else:
            log_test("GET /api/unified/sync", False, f"Status: {response.status_code}")
    
    except Exception as e:
        log_test("GET /api/unified/sync - Exception", False, str(e))

def test_unified_sync_post():
    """Test POST /api/unified/sync"""
    print("\n🧪 Testing POST /api/unified/sync...")
    
    try:
        # Test sync action
        payload = {"action": "sync"}
        response = requests.post(f"{BASE_URL}/unified/sync", json=payload, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            log_test("POST /api/unified/sync - Sync action", True, 
                    f"Message: {data.get('message', 'N/A')}")
        else:
            log_test("POST /api/unified/sync - Sync action", False, 
                    f"Status: {response.status_code}")
    
    except Exception as e:
        log_test("POST /api/unified/sync - Exception", False, str(e))

def test_recommendations():
    """Test GET /api/recommendations"""
    print("\n🧪 Testing GET /api/recommendations...")
    
    try:
        # Test 1: Ingredient recommendations
        response = requests.get(f"{BASE_URL}/recommendations?type=ingredient&ingredient=ginger", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            products = data.get('products', [])
            
            log_test("GET /api/recommendations?type=ingredient&ingredient=ginger", True, 
                    f"Returned {len(products)} products")
            
            # Check if benefit data is included
            if products:
                has_benefit_data = any('benefit' in p or 'benefitStory' in p for p in products)
                log_test("GET /api/recommendations - Benefit data included", has_benefit_data)
        else:
            log_test("GET /api/recommendations?type=ingredient", False, 
                    f"Status: {response.status_code}")
        
        # Test 2: Basic recommendations endpoint
        response = requests.get(f"{BASE_URL}/recommendations", timeout=10)
        if response.status_code == 200:
            log_test("GET /api/recommendations - Basic endpoint", True)
        else:
            log_test("GET /api/recommendations - Basic endpoint", False, 
                    f"Status: {response.status_code}")
    
    except Exception as e:
        log_test("GET /api/recommendations - Exception", False, str(e))

def test_analytics():
    """Test GET /api/analytics"""
    print("\n🧪 Testing GET /api/analytics...")
    
    try:
        response = requests.get(f"{BASE_URL}/analytics", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            dashboard = data.get('dashboard', {})
            
            log_test("GET /api/analytics - Dashboard data", True, 
                    f"Keys: {list(dashboard.keys())}")
            log_test("GET /api/analytics - Metrics structure", 'dashboard' in data)
        else:
            log_test("GET /api/analytics", False, f"Status: {response.status_code}")
    
    except Exception as e:
        log_test("GET /api/analytics - Exception", False, str(e))

def test_admin_dashboard():
    """Test GET /api/admin/dashboard"""
    print("\n🧪 Testing GET /api/admin/dashboard...")
    
    try:
        response = requests.get(f"{BASE_URL}/admin/dashboard", timeout=15)
        
        if response.status_code == 200:
            data = response.json()
            dashboard = data.get('dashboard', {})
            
            has_analytics = 'analytics' in dashboard
            has_sync_stats = 'syncStats' in dashboard
            has_product_stats = 'productStats' in dashboard
            has_recent_orders = 'recentOrders' in dashboard
            has_payment_stats = 'paymentStats' in dashboard
            
            log_test("GET /api/admin/dashboard - Basic request", True)
            log_test("GET /api/admin/dashboard - Has analytics", has_analytics)
            log_test("GET /api/admin/dashboard - Has syncStats", has_sync_stats)
            log_test("GET /api/admin/dashboard - Has productStats", has_product_stats)
            log_test("GET /api/admin/dashboard - Has recentOrders", has_recent_orders)
            log_test("GET /api/admin/dashboard - Has paymentStats", has_payment_stats)
        else:
            log_test("GET /api/admin/dashboard", False, f"Status: {response.status_code}")
    
    except Exception as e:
        log_test("GET /api/admin/dashboard - Exception", False, str(e))

def test_transaction_stats():
    """Test GET /api/transactions/stats"""
    print("\n🧪 Testing GET /api/transactions/stats...")
    
    try:
        response = requests.get(f"{BASE_URL}/transactions/stats", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            stats = data.get('stats', {})
            
            has_success_rate = 'successRate' in stats
            
            log_test("GET /api/transactions/stats - Basic request", True, 
                    f"Total transactions: {stats.get('total', 0)}")
            log_test("GET /api/transactions/stats - Success rate calculation", has_success_rate, 
                    f"Success rate: {stats.get('successRate', 'N/A')}%")
        else:
            log_test("GET /api/transactions/stats", False, f"Status: {response.status_code}")
    
    except Exception as e:
        log_test("GET /api/transactions/stats - Exception", False, str(e))

def test_original_square_apis():
    """Test original Square APIs for backward compatibility"""
    print("\n🧪 Testing Original Square APIs (Backward Compatibility)...")
    
    try:
        # Test 1: Health check
        response = requests.get(f"{BASE_URL}/health", timeout=10)
        if response.status_code == 200:
            log_test("GET /api/health - System health", True)
        else:
            log_test("GET /api/health - System health", False, f"Status: {response.status_code}")
        
        # Test 2: Order creation (validation test)
        payload = {
            "cart": [],
            "customer": {"name": "Test User", "email": "test@example.com", "phone": "1234567890"},
            "fulfillment": {"type": "pickup"}
        }
        response = requests.post(f"{BASE_URL}/orders/create", json=payload, timeout=10)
        # Should fail validation for empty cart
        if response.status_code == 400:
            log_test("POST /api/orders/create - Validation working", True, "Empty cart rejected")
        else:
            log_test("POST /api/orders/create - Validation", False, 
                    f"Expected 400, got {response.status_code}")
        
        # Test 3: Checkout endpoint (validation test)
        payload = {"lineItems": []}
        response = requests.post(f"{BASE_URL}/checkout", json=payload, timeout=10)
        # Should fail validation for empty items
        if response.status_code == 400:
            log_test("POST /api/checkout - Validation working", True, "Empty items rejected")
        else:
            log_test("POST /api/checkout - Validation", False, 
                    f"Expected 400, got {response.status_code}")
    
    except Exception as e:
        log_test("Original Square APIs - Exception", False, str(e))

def print_summary():
    """Print test summary"""
    print("\n" + "="*80)
    print("📊 TEST SUMMARY")
    print("="*80)
    print(f"Total Tests: {test_results['passed'] + test_results['failed']}")
    print(f"✅ Passed: {test_results['passed']}")
    print(f"❌ Failed: {test_results['failed']}")
    
    success_rate = (test_results['passed'] / (test_results['passed'] + test_results['failed']) * 100) if (test_results['passed'] + test_results['failed']) > 0 else 0
    print(f"Success Rate: {success_rate:.1f}%")
    
    if test_results['failed'] > 0:
        print("\n❌ FAILED TESTS:")
        for test in test_results['tests']:
            if not test['passed']:
                print(f"  - {test['name']}")
                if test['details']:
                    print(f"    {test['details']}")
    
    print("="*80)

if __name__ == "__main__":
    print("🚀 Starting Comprehensive Backend API Testing")
    print(f"Backend URL: {BASE_URL}")
    print(f"Timestamp: {datetime.now().isoformat()}")
    
    # Run all tests
    test_get_products_unified()
    test_unified_products()
    test_unified_sync()
    test_unified_sync_post()
    test_recommendations()
    test_analytics()
    test_admin_dashboard()
    test_transaction_stats()
    test_original_square_apis()
    
    # Print summary
    print_summary()
