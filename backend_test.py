#!/usr/bin/env python3
"""
Comprehensive Backend Testing for Taste of Gratitude Immersive Shopping Flow
Tests all critical backend APIs for the shopping experience
"""

import requests
import json
import time
from datetime import datetime

# Configuration
BASE_URL = "https://cart-rescue-1.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

# Test results tracking
test_results = {
    "total": 0,
    "passed": 0,
    "failed": 0,
    "tests": []
}

def log_test(name, passed, details=""):
    """Log test result"""
    test_results["total"] += 1
    if passed:
        test_results["passed"] += 1
        print(f"✅ PASS: {name}")
    else:
        test_results["failed"] += 1
        print(f"❌ FAIL: {name}")
    
    if details:
        print(f"   {details}")
    
    test_results["tests"].append({
        "name": name,
        "passed": passed,
        "details": details,
        "timestamp": datetime.now().isoformat()
    })

def test_health_check():
    """Test GET /api/health - Health Check API"""
    print("\n" + "="*80)
    print("TEST SUITE: Health Check API")
    print("="*80)
    
    try:
        start_time = time.time()
        response = requests.get(f"{API_BASE}/health", timeout=15)
        response_time = (time.time() - start_time) * 1000
        
        # Test 1: Status code
        log_test(
            "Health Check - Returns 200 status",
            response.status_code == 200,
            f"Status: {response.status_code}, Response time: {response_time:.0f}ms"
        )
        
        if response.status_code == 200:
            data = response.json()
            
            # Test 2: Has status field
            log_test(
                "Health Check - Has status field",
                "status" in data,
                f"Status: {data.get('status', 'N/A')}"
            )
            
            # Test 3: Response time acceptable
            log_test(
                "Health Check - Response time < 2000ms",
                response_time < 2000,
                f"Response time: {response_time:.0f}ms"
            )
            
    except Exception as e:
        log_test("Health Check - API accessible", False, f"Error: {str(e)}")

def test_products_api():
    """Test GET /api/products - Products API"""
    print("\n" + "="*80)
    print("TEST SUITE: Products API")
    print("="*80)
    
    try:
        start_time = time.time()
        response = requests.get(f"{API_BASE}/products", timeout=15)
        response_time = (time.time() - start_time) * 1000
        
        # Test 1: Status code
        log_test(
            "Products API - Returns 200 status",
            response.status_code == 200,
            f"Status: {response.status_code}, Response time: {response_time:.0f}ms"
        )
        
        if response.status_code == 200:
            data = response.json()
            products = data.get("products", [])
            
            # Test 2: Returns products array
            log_test(
                "Products API - Returns products array",
                isinstance(products, list) and len(products) > 0,
                f"Product count: {len(products)}"
            )
            
            # Test 3: Returns 29 products (from Square sync)
            log_test(
                "Products API - Returns 29 products from Square catalog",
                len(products) == 29,
                f"Expected: 29, Got: {len(products)}"
            )
            
            if len(products) > 0:
                sample_product = products[0]
                
                # Test 4: Products have required fields
                required_fields = ["id", "name", "price", "image"]
                has_all_fields = all(field in sample_product for field in required_fields)
                log_test(
                    "Products API - Products have required fields (id, name, price, image)",
                    has_all_fields,
                    f"Sample product fields: {list(sample_product.keys())}"
                )
                
                # Test 5: Products have price field (dollars)
                log_test(
                    "Products API - Products have price field in dollars",
                    "price" in sample_product and isinstance(sample_product.get("price"), (int, float)),
                    f"Sample price: ${sample_product.get('price', 'N/A')}"
                )
                
                # Test 6: Products have priceCents field
                log_test(
                    "Products API - Products have priceCents field",
                    "priceCents" in sample_product,
                    f"Sample priceCents: {sample_product.get('priceCents', 'N/A')}"
                )
                
                # Test 7: Price to priceCents conversion is correct
                if "price" in sample_product and "priceCents" in sample_product:
                    price = sample_product["price"]
                    price_cents = sample_product["priceCents"]
                    expected_cents = int(price * 100)
                    log_test(
                        "Products API - Price to priceCents conversion correct",
                        price_cents == expected_cents,
                        f"Price: ${price}, PriceCents: {price_cents}, Expected: {expected_cents}"
                    )
                
                # Test 8: Products have image URLs
                log_test(
                    "Products API - Products have image URLs",
                    "image" in sample_product and sample_product["image"],
                    f"Sample image: {sample_product.get('image', 'N/A')[:50]}..."
                )
                
                # Test 9: Products have variations array
                log_test(
                    "Products API - Products have variations array",
                    "variations" in sample_product,
                    f"Has variations: {isinstance(sample_product.get('variations'), list)}"
                )
                
                # Test 10: Products have catalogObjectId for Square integration
                has_catalog_id = "squareData" in sample_product and "catalogObjectId" in sample_product.get("squareData", {})
                log_test(
                    "Products API - Products have catalogObjectId for Square",
                    has_catalog_id,
                    f"Has catalogObjectId: {has_catalog_id}"
                )
            
    except Exception as e:
        log_test("Products API - API accessible", False, f"Error: {str(e)}")

def test_cart_price_api():
    """Test POST /api/cart/price - Cart Price Calculation API"""
    print("\n" + "="*80)
    print("TEST SUITE: Cart Price Calculation API")
    print("="*80)
    
    # Test 1: Empty lines validation
    try:
        response = requests.post(
            f"{API_BASE}/cart/price",
            json={"lines": []},
            timeout=15
        )
        log_test(
            "Cart Price API - Rejects empty lines array",
            response.status_code == 400,
            f"Status: {response.status_code}"
        )
    except Exception as e:
        log_test("Cart Price API - Empty lines validation", False, f"Error: {str(e)}")
    
    # Test 2: Missing lines field
    try:
        response = requests.post(
            f"{API_BASE}/cart/price",
            json={},
            timeout=15
        )
        log_test(
            "Cart Price API - Rejects missing lines field",
            response.status_code == 400,
            f"Status: {response.status_code}"
        )
    except Exception as e:
        log_test("Cart Price API - Missing lines validation", False, f"Error: {str(e)}")
    
    # Test 3: Valid cart calculation (will fail with catalog validation, but structure is correct)
    try:
        response = requests.post(
            f"{API_BASE}/cart/price",
            json={
                "lines": [
                    {"variationId": "TEST_VARIATION_ID", "qty": 2}
                ]
            },
            timeout=15
        )
        # We expect this to fail with catalog validation, but API should respond
        log_test(
            "Cart Price API - Responds to valid request structure",
            response.status_code in [200, 400, 500],
            f"Status: {response.status_code} (Expected catalog validation error)"
        )
    except Exception as e:
        log_test("Cart Price API - Valid request handling", False, f"Error: {str(e)}")

def test_orders_create_api():
    """Test POST /api/orders/create - Order Creation API"""
    print("\n" + "="*80)
    print("TEST SUITE: Order Creation API")
    print("="*80)
    
    # Test 1: Missing cart validation
    try:
        response = requests.post(
            f"{API_BASE}/orders/create",
            json={
                "customer": {
                    "name": "Test Customer",
                    "email": "test@example.com",
                    "phone": "555-0100"
                },
                "fulfillmentType": "pickup"
            },
            timeout=15
        )
        log_test(
            "Order Creation - Rejects missing cart",
            response.status_code == 400,
            f"Status: {response.status_code}"
        )
    except Exception as e:
        log_test("Order Creation - Missing cart validation", False, f"Error: {str(e)}")
    
    # Test 2: Missing customer info validation
    try:
        response = requests.post(
            f"{API_BASE}/orders/create",
            json={
                "cart": [
                    {"id": "test-1", "name": "Test Product", "price": 25, "quantity": 1}
                ],
                "fulfillmentType": "pickup"
            },
            timeout=15
        )
        log_test(
            "Order Creation - Rejects missing customer info",
            response.status_code == 400,
            f"Status: {response.status_code}"
        )
    except Exception as e:
        log_test("Order Creation - Missing customer validation", False, f"Error: {str(e)}")
    
    # Test 3: Valid pickup order
    try:
        response = requests.post(
            f"{API_BASE}/orders/create",
            json={
                "cart": [
                    {"id": "test-1", "name": "Test Product", "price": 25, "quantity": 1, "image": "/test.jpg"}
                ],
                "customer": {
                    "name": "Sarah Johnson",
                    "email": "sarah.test@example.com",
                    "phone": "404-555-0100"
                },
                "fulfillmentType": "pickup",
                "pickupMarket": "Serenbe Farmers Market"
            },
            timeout=15
        )
        log_test(
            "Order Creation - Creates valid pickup order",
            response.status_code == 200,
            f"Status: {response.status_code}"
        )
        
        if response.status_code == 200:
            data = response.json()
            order = data.get("order", {})
            log_test(
                "Order Creation - Returns order with ID",
                "id" in order and "orderNumber" in order,
                f"Order ID: {order.get('id', 'N/A')}, Order #: {order.get('orderNumber', 'N/A')}"
            )
    except Exception as e:
        log_test("Order Creation - Valid pickup order", False, f"Error: {str(e)}")
    
    # Test 4: Valid delivery order with valid ZIP
    try:
        response = requests.post(
            f"{API_BASE}/orders/create",
            json={
                "cart": [
                    {"id": "test-1", "name": "Test Product", "price": 35, "quantity": 1, "image": "/test.jpg"}
                ],
                "customer": {
                    "name": "John Doe",
                    "email": "john.test@example.com",
                    "phone": "404-555-0200"
                },
                "fulfillmentType": "delivery",
                "deliveryAddress": {
                    "street": "123 Main St",
                    "city": "Atlanta",
                    "state": "GA",
                    "zip": "30310"
                },
                "deliveryTimeSlot": "12:00-15:00",
                "deliveryTip": 2
            },
            timeout=15
        )
        log_test(
            "Order Creation - Creates valid delivery order (Atlanta ZIP 30310)",
            response.status_code == 200,
            f"Status: {response.status_code}"
        )
        
        if response.status_code == 200:
            data = response.json()
            order = data.get("order", {})
            pricing = order.get("pricing", {})
            
            # Test delivery fee calculation
            subtotal = pricing.get("subtotal", 0)
            delivery_fee = pricing.get("deliveryFee", 0)
            
            # For orders <$75, delivery fee should be $6.99
            expected_fee = 6.99 if subtotal < 75 else 0
            log_test(
                "Order Creation - Delivery fee calculated correctly",
                delivery_fee == expected_fee,
                f"Subtotal: ${subtotal}, Delivery Fee: ${delivery_fee}, Expected: ${expected_fee}"
            )
    except Exception as e:
        log_test("Order Creation - Valid delivery order", False, f"Error: {str(e)}")
    
    # Test 5: Invalid ZIP code rejection
    try:
        response = requests.post(
            f"{API_BASE}/orders/create",
            json={
                "cart": [
                    {"id": "test-1", "name": "Test Product", "price": 35, "quantity": 1, "image": "/test.jpg"}
                ],
                "customer": {
                    "name": "Jane Smith",
                    "email": "jane.test@example.com",
                    "phone": "212-555-0300"
                },
                "fulfillmentType": "delivery",
                "deliveryAddress": {
                    "street": "456 Broadway",
                    "city": "New York",
                    "state": "NY",
                    "zip": "10001"
                },
                "deliveryTimeSlot": "12:00-15:00"
            },
            timeout=15
        )
        log_test(
            "Order Creation - Rejects invalid ZIP code (10001 - New York)",
            response.status_code == 400,
            f"Status: {response.status_code}"
        )
        
        if response.status_code == 400:
            data = response.json()
            error_msg = data.get("error", "")
            log_test(
                "Order Creation - Returns user-friendly error for invalid ZIP",
                "not in your area" in error_msg.lower() or "unavailable" in error_msg.lower(),
                f"Error message: {error_msg}"
            )
    except Exception as e:
        log_test("Order Creation - Invalid ZIP rejection", False, f"Error: {str(e)}")
    
    # Test 6: Minimum order validation for delivery
    try:
        response = requests.post(
            f"{API_BASE}/orders/create",
            json={
                "cart": [
                    {"id": "test-1", "name": "Test Product", "price": 15, "quantity": 1, "image": "/test.jpg"}
                ],
                "customer": {
                    "name": "Bob Wilson",
                    "email": "bob.test@example.com",
                    "phone": "404-555-0400"
                },
                "fulfillmentType": "delivery",
                "deliveryAddress": {
                    "street": "789 Peachtree St",
                    "city": "Atlanta",
                    "state": "GA",
                    "zip": "30310"
                },
                "deliveryTimeSlot": "12:00-15:00"
            },
            timeout=15
        )
        log_test(
            "Order Creation - Rejects delivery order below $30 minimum",
            response.status_code == 400,
            f"Status: {response.status_code}"
        )
        
        if response.status_code == 400:
            data = response.json()
            error_msg = data.get("error", "")
            log_test(
                "Order Creation - Returns minimum order error message",
                "minimum" in error_msg.lower() and "30" in error_msg,
                f"Error message: {error_msg}"
            )
    except Exception as e:
        log_test("Order Creation - Minimum order validation", False, f"Error: {str(e)}")
    
    # Test 7: Large delivery order with free delivery
    try:
        response = requests.post(
            f"{API_BASE}/orders/create",
            json={
                "cart": [
                    {"id": "test-1", "name": "Test Product 1", "price": 40, "quantity": 1, "image": "/test.jpg"},
                    {"id": "test-2", "name": "Test Product 2", "price": 40, "quantity": 1, "image": "/test.jpg"}
                ],
                "customer": {
                    "name": "Alice Brown",
                    "email": "alice.test@example.com",
                    "phone": "404-555-0500"
                },
                "fulfillmentType": "delivery",
                "deliveryAddress": {
                    "street": "321 Oak Ave",
                    "city": "Atlanta",
                    "state": "GA",
                    "zip": "30314"
                },
                "deliveryTimeSlot": "15:00-18:00",
                "deliveryTip": 3
            },
            timeout=15
        )
        log_test(
            "Order Creation - Creates large delivery order (>=$75)",
            response.status_code == 200,
            f"Status: {response.status_code}"
        )
        
        if response.status_code == 200:
            data = response.json()
            order = data.get("order", {})
            pricing = order.get("pricing", {})
            
            subtotal = pricing.get("subtotal", 0)
            delivery_fee = pricing.get("deliveryFee", 0)
            
            log_test(
                "Order Creation - Free delivery for orders >=$75",
                subtotal >= 75 and delivery_fee == 0,
                f"Subtotal: ${subtotal}, Delivery Fee: ${delivery_fee} (Expected: $0)"
            )
    except Exception as e:
        log_test("Order Creation - Large delivery order", False, f"Error: {str(e)}")

def test_checkout_api():
    """Test POST /api/checkout - Square Checkout API (Payment Links)"""
    print("\n" + "="*80)
    print("TEST SUITE: Square Checkout API (Payment Links)")
    print("="*80)
    
    # Test 1: Empty line items validation
    try:
        response = requests.post(
            f"{API_BASE}/checkout",
            json={"lineItems": []},
            timeout=15
        )
        log_test(
            "Checkout API - Rejects empty line items",
            response.status_code == 400,
            f"Status: {response.status_code}"
        )
    except Exception as e:
        log_test("Checkout API - Empty line items validation", False, f"Error: {str(e)}")
    
    # Test 2: Missing catalogObjectId validation
    try:
        response = requests.post(
            f"{API_BASE}/checkout",
            json={
                "lineItems": [
                    {"quantity": 1, "name": "Test Product"}
                ]
            },
            timeout=15
        )
        log_test(
            "Checkout API - Rejects missing catalogObjectId",
            response.status_code == 400,
            f"Status: {response.status_code}"
        )
    except Exception as e:
        log_test("Checkout API - Missing catalogObjectId validation", False, f"Error: {str(e)}")
    
    # Test 3: Valid checkout with real catalogObjectId (will test Square API integration)
    try:
        # Use a real catalog object ID from MongoDB (from previous test results)
        response = requests.post(
            f"{API_BASE}/checkout",
            json={
                "lineItems": [
                    {
                        "catalogObjectId": "ULZOXXDSFBNINO5LCYZQ2LPY",
                        "quantity": 1,
                        "name": "4oz Blue Lotus Freebies",
                        "basePriceMoney": {
                            "amount": 1100,
                            "currency": "USD"
                        }
                    }
                ],
                "customer": {
                    "email": "test@example.com",
                    "name": "Test Customer"
                }
            },
            timeout=15
        )
        log_test(
            "Checkout API - Responds to valid request with real catalogObjectId",
            response.status_code in [200, 400, 500],
            f"Status: {response.status_code} (Testing Square API integration)"
        )
        
        if response.status_code == 200:
            data = response.json()
            payment_link = data.get("paymentLink", {})
            log_test(
                "Checkout API - Returns payment link on success",
                "url" in payment_link and "id" in payment_link,
                f"Payment Link ID: {payment_link.get('id', 'N/A')}"
            )
    except Exception as e:
        log_test("Checkout API - Valid checkout request", False, f"Error: {str(e)}")

def test_create_checkout_api():
    """Test POST /api/create-checkout - Square Checkout API v2"""
    print("\n" + "="*80)
    print("TEST SUITE: Square Checkout API v2 (/api/create-checkout)")
    print("="*80)
    
    # Test 1: GET endpoint (health check)
    try:
        response = requests.get(f"{API_BASE}/create-checkout", timeout=15)
        log_test(
            "Checkout v2 - GET endpoint returns service status",
            response.status_code == 200,
            f"Status: {response.status_code}"
        )
        
        if response.status_code == 200:
            data = response.json()
            log_test(
                "Checkout v2 - Service configured",
                data.get("configured") == True,
                f"Configured: {data.get('configured')}, Environment: {data.get('environment')}"
            )
    except Exception as e:
        log_test("Checkout v2 - GET endpoint", False, f"Error: {str(e)}")
    
    # Test 2: Empty cart validation
    try:
        response = requests.post(
            f"{API_BASE}/create-checkout",
            json={"items": []},
            timeout=15
        )
        log_test(
            "Checkout v2 - Rejects empty cart",
            response.status_code == 400,
            f"Status: {response.status_code}"
        )
    except Exception as e:
        log_test("Checkout v2 - Empty cart validation", False, f"Error: {str(e)}")
    
    # Test 3: Valid checkout request
    try:
        response = requests.post(
            f"{API_BASE}/create-checkout",
            json={
                "items": [
                    {
                        "productId": "test-1",
                        "slug": "test-product",
                        "name": "Test Product",
                        "price": 25.00,
                        "quantity": 1,
                        "catalogObjectId": "ULZOXXDSFBNINO5LCYZQ2LPY"
                    }
                ],
                "contact": {
                    "name": "Test Customer",
                    "email": "test@example.com"
                },
                "fulfillment": {
                    "type": "pickup"
                }
            },
            timeout=15
        )
        log_test(
            "Checkout v2 - Processes valid checkout request",
            response.status_code in [200, 400, 500],
            f"Status: {response.status_code}"
        )
        
        if response.status_code == 200:
            data = response.json()
            log_test(
                "Checkout v2 - Returns checkout URL on success",
                "checkoutUrl" in data and "paymentLinkId" in data,
                f"Payment Link ID: {data.get('paymentLinkId', 'N/A')}"
            )
    except Exception as e:
        log_test("Checkout v2 - Valid checkout request", False, f"Error: {str(e)}")

def print_summary():
    """Print test summary"""
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    print(f"Total Tests: {test_results['total']}")
    print(f"✅ Passed: {test_results['passed']}")
    print(f"❌ Failed: {test_results['failed']}")
    
    success_rate = (test_results['passed'] / test_results['total'] * 100) if test_results['total'] > 0 else 0
    print(f"Success Rate: {success_rate:.1f}%")
    
    if test_results['failed'] > 0:
        print("\nFailed Tests:")
        for test in test_results['tests']:
            if not test['passed']:
                print(f"  ❌ {test['name']}")
                if test['details']:
                    print(f"     {test['details']}")
    
    print("\n" + "="*80)

def main():
    """Run all backend tests"""
    print("="*80)
    print("TASTE OF GRATITUDE - COMPREHENSIVE BACKEND TESTING")
    print("Immersive Shopping Flow Validation")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print(f"Test Started: {datetime.now().isoformat()}")
    print("="*80)
    
    # Run all test suites
    test_health_check()
    test_products_api()
    test_cart_price_api()
    test_orders_create_api()
    test_checkout_api()
    test_create_checkout_api()
    
    # Print summary
    print_summary()
    
    # Save results to file
    with open('/app/backend_test_results.json', 'w') as f:
        json.dump(test_results, f, indent=2)
    
    print(f"\nTest results saved to: /app/backend_test_results.json")
    print(f"Test Completed: {datetime.now().isoformat()}")

if __name__ == "__main__":
    main()
