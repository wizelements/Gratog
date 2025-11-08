#!/usr/bin/env python3
"""
Comprehensive Checkout Flow Testing
Tests the complete payment and checkout flow after fixing 404 issues
"""

import requests
import json
import sys
from datetime import datetime

BASE_URL = "http://localhost:3000"
RESULTS = []

def log_test(name, passed, details=""):
    """Log test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    result = {
        "test": name,
        "status": status,
        "passed": passed,
        "details": details,
        "timestamp": datetime.now().isoformat()
    }
    RESULTS.append(result)
    print(f"{status}: {name}")
    if details:
        print(f"   {details}")
    return passed

def test_server_running():
    """Test if server is running"""
    try:
        response = requests.get(f"{BASE_URL}/api/health", timeout=5)
        return log_test(
            "Server Health Check",
            response.status_code == 200,
            f"Status: {response.status_code}"
        )
    except Exception as e:
        return log_test("Server Health Check", False, f"Server not running: {e}")

def test_checkout_api_validation():
    """Test checkout API validation"""
    print("\n🔍 Testing Checkout API Validation...")
    
    # Test 1: Empty lineItems should fail
    try:
        response = requests.post(
            f"{BASE_URL}/api/checkout",
            json={"lineItems": []},
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        log_test(
            "Checkout API - Empty Items Validation",
            response.status_code == 400,
            f"Status: {response.status_code}, Expected: 400"
        )
    except Exception as e:
        log_test("Checkout API - Empty Items Validation", False, str(e))
    
    # Test 2: Missing lineItems should fail
    try:
        response = requests.post(
            f"{BASE_URL}/api/checkout",
            json={},
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        log_test(
            "Checkout API - Missing lineItems",
            response.status_code == 400,
            f"Status: {response.status_code}, Expected: 400"
        )
    except Exception as e:
        log_test("Checkout API - Missing lineItems", False, str(e))
    
    # Test 3: Invalid lineItem structure
    try:
        response = requests.post(
            f"{BASE_URL}/api/checkout",
            json={"lineItems": [{"invalidField": "value"}]},
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        log_test(
            "Checkout API - Invalid Item Structure",
            response.status_code == 400,
            f"Status: {response.status_code}, Expected: 400"
        )
    except Exception as e:
        log_test("Checkout API - Invalid Item Structure", False, str(e))

def test_products_api():
    """Test products API for getting catalog items"""
    print("\n🔍 Testing Products API...")
    
    try:
        response = requests.get(f"{BASE_URL}/api/products", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            products = data.get('products', [])
            
            log_test(
                "Products API - GET /api/products",
                len(products) > 0,
                f"Found {len(products)} products"
            )
            
            # Return first product with Square catalog ID for testing
            for product in products:
                if product.get('squareCatalogId'):
                    return product
            
            return products[0] if products else None
        else:
            log_test(
                "Products API - GET /api/products",
                False,
                f"Status: {response.status_code}"
            )
            return None
    except Exception as e:
        log_test("Products API - GET /api/products", False, str(e))
        return None

def test_cart_price_calculation():
    """Test cart price calculation API"""
    print("\n🔍 Testing Cart Price Calculation...")
    
    test_cart = [
        {
            "productId": "test-product-1",
            "name": "Test Product",
            "price": 15.00,
            "size": "16 oz",
            "quantity": 2
        }
    ]
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/cart/price",
            json={
                "cart": test_cart,
                "fulfillmentType": "pickup",
                "shippingAddress": None
            },
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            log_test(
                "Cart Price API - Calculation",
                True,
                f"Subtotal: ${data.get('subtotal', 0)}, Total: ${data.get('total', 0)}"
            )
            return data
        else:
            log_test(
                "Cart Price API - Calculation",
                False,
                f"Status: {response.status_code}"
            )
            return None
    except Exception as e:
        log_test("Cart Price API - Calculation", False, str(e))
        return None

def test_checkout_with_real_product():
    """Test checkout with real Square catalog product"""
    print("\n🔍 Testing Checkout with Real Product...")
    
    # Get a real product
    product = test_products_api()
    
    if not product:
        log_test(
            "Checkout API - Real Product Test",
            False,
            "No products available for testing"
        )
        return
    
    catalog_id = product.get('squareCatalogId')
    if not catalog_id:
        log_test(
            "Checkout API - Real Product Test",
            False,
            f"Product '{product.get('name')}' has no Square catalog ID"
        )
        return
    
    # Create checkout payload
    checkout_payload = {
        "lineItems": [
            {
                "catalogObjectId": catalog_id,
                "quantity": 1,
                "name": product.get('name', 'Test Product'),
                "variationName": product.get('sizes', [{}])[0].get('name', '16 oz') if product.get('sizes') else '16 oz',
                "productId": product.get('_id', 'test-id'),
                "category": product.get('category', 'spreads'),
                "size": product.get('sizes', [{}])[0].get('name', '16 oz') if product.get('sizes') else '16 oz'
            }
        ],
        "redirectUrl": f"{BASE_URL}/checkout/success",
        "customer": {
            "email": "test@example.com",
            "name": "Test Customer",
            "phone": "+15555555555"
        },
        "fulfillmentType": "pickup",
        "orderId": f"test-order-{int(datetime.now().timestamp())}"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/checkout",
            json=checkout_payload,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            payment_link = data.get('paymentLink', {})
            
            if payment_link.get('url'):
                log_test(
                    "Checkout API - Create Payment Link",
                    True,
                    f"Payment link created: {payment_link['url'][:50]}..."
                )
                return payment_link
            else:
                log_test(
                    "Checkout API - Create Payment Link",
                    False,
                    "No payment link URL in response"
                )
        elif response.status_code == 503:
            log_test(
                "Checkout API - Create Payment Link",
                False,
                "Square API unavailable (503) - Check Square credentials"
            )
        else:
            error_data = response.json() if response.content else {}
            log_test(
                "Checkout API - Create Payment Link",
                False,
                f"Status: {response.status_code}, Error: {error_data.get('error', 'Unknown')}"
            )
    except Exception as e:
        log_test("Checkout API - Create Payment Link", False, str(e))

def test_page_routes():
    """Test that checkout page routes are accessible"""
    print("\n🔍 Testing Checkout Page Routes...")
    
    routes = [
        ("/order", "Order Page"),
        ("/checkout", "Checkout Page"),
        ("/checkout/square", "Square Checkout Page"),
        ("/checkout/success", "Success Page"),
    ]
    
    for route, name in routes:
        try:
            response = requests.get(f"{BASE_URL}{route}", timeout=10)
            log_test(
                f"Route - {name}",
                response.status_code == 200,
                f"Status: {response.status_code}, Route: {route}"
            )
        except Exception as e:
            log_test(f"Route - {name}", False, str(e))

def test_coupon_validation():
    """Test coupon validation API"""
    print("\n🔍 Testing Coupon Validation...")
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/coupons/validate",
            json={"code": "INVALID_COUPON_CODE", "orderTotal": 50.00},
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        log_test(
            "Coupon API - Invalid Coupon",
            response.status_code in [400, 404],
            f"Status: {response.status_code}"
        )
    except Exception as e:
        log_test("Coupon API - Invalid Coupon", False, str(e))

def generate_report():
    """Generate test report"""
    print("\n" + "="*60)
    print("COMPREHENSIVE CHECKOUT FLOW TEST REPORT")
    print("="*60)
    
    total_tests = len(RESULTS)
    passed_tests = sum(1 for r in r.get('passed', False) for r in RESULTS if 'passed' in r)
    failed_tests = total_tests - passed_tests
    
    print(f"\n📊 Test Summary:")
    print(f"   Total Tests: {total_tests}")
    print(f"   ✅ Passed: {passed_tests}")
    print(f"   ❌ Failed: {failed_tests}")
    print(f"   Success Rate: {(passed_tests/total_tests*100):.1f}%")
    
    if failed_tests > 0:
        print(f"\n❌ Failed Tests:")
        for result in RESULTS:
            if not result.get('passed', False):
                print(f"   - {result['test']}")
                if result.get('details'):
                    print(f"     {result['details']}")
    
    # Save to file
    report_file = "checkout_flow_test_results.json"
    with open(report_file, 'w') as f:
        json.dump({
            "timestamp": datetime.now().isoformat(),
            "summary": {
                "total": total_tests,
                "passed": passed_tests,
                "failed": failed_tests,
                "success_rate": f"{(passed_tests/total_tests*100):.1f}%"
            },
            "results": RESULTS
        }, f, indent=2)
    
    print(f"\n📄 Full report saved to: {report_file}")
    
    return failed_tests == 0

def main():
    """Run all tests"""
    print("🚀 Starting Comprehensive Checkout Flow Testing")
    print(f"📍 Testing against: {BASE_URL}")
    print("="*60 + "\n")
    
    # Test server
    if not test_server_running():
        print("\n❌ Server is not running. Please start the server with:")
        print("   npm run dev")
        sys.exit(1)
    
    # Run test suites
    test_page_routes()
    test_checkout_api_validation()
    test_cart_price_calculation()
    test_coupon_validation()
    test_checkout_with_real_product()
    
    # Generate report
    success = generate_report()
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
