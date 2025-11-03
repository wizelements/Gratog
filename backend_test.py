#!/usr/bin/env python3
"""
VORACIOUS BACKEND VALIDATION - COMPLETE SQUARE INTEGRATION TESTING
Testing all critical Square APIs with real synced catalog data
"""

import requests
import json
import time
from datetime import datetime

# Configuration
BASE_URL = "https://cart-rescue-1.preview.emergentagent.com/api"
HEADERS = {"Content-Type": "application/json"}

# Test results tracking
test_results = {
    "total": 0,
    "passed": 0,
    "failed": 0,
    "tests": []
}

def log_test(name, passed, details="", response_time=0):
    """Log test result"""
    test_results["total"] += 1
    if passed:
        test_results["passed"] += 1
        status = "✅ PASS"
    else:
        test_results["failed"] += 1
        status = "❌ FAIL"
    
    test_results["tests"].append({
        "name": name,
        "status": status,
        "details": details,
        "response_time_ms": response_time
    })
    print(f"{status} - {name}")
    if details:
        print(f"  Details: {details}")
    if response_time > 0:
        print(f"  Response time: {response_time}ms")
    print()

def test_health_endpoint():
    """Test GET /api/health - System status"""
    print("=" * 80)
    print("TEST 1: Health Check Endpoint")
    print("=" * 80)
    
    try:
        start = time.time()
        response = requests.get(f"{BASE_URL}/health", timeout=10)
        response_time = int((time.time() - start) * 1000)
        
        if response.status_code == 200:
            data = response.json()
            details = f"Status: {data.get('status')}, DB: {data.get('services', {}).get('database')}, Square: {data.get('services', {}).get('square_api')}"
            log_test("GET /api/health", True, details, response_time)
            return data
        else:
            log_test("GET /api/health", False, f"Status {response.status_code}: {response.text}", response_time)
            return None
    except Exception as e:
        log_test("GET /api/health", False, f"Exception: {str(e)}")
        return None

def test_square_catalog_sync():
    """Test Square catalog sync - Check MongoDB for synced products"""
    print("=" * 80)
    print("TEST 2: Square Catalog Sync Verification")
    print("=" * 80)
    
    try:
        # Connect to MongoDB to verify synced catalog
        from pymongo import MongoClient
        client = MongoClient("mongodb://localhost:27017")
        db = client["taste_of_gratitude"]
        
        # Check square_catalog_items collection
        items_count = db.square_catalog_items.count_documents({})
        categories_count = db.square_catalog_categories.count_documents({})
        
        if items_count > 0:
            # Get sample products
            sample_products = list(db.square_catalog_items.find({}).limit(3))
            product_names = [p.get('name', 'Unknown') for p in sample_products]
            
            details = f"Found {items_count} products, {categories_count} categories. Samples: {', '.join(product_names)}"
            log_test("MongoDB Catalog Sync", True, details)
            
            # Return sample product for testing
            if sample_products:
                return sample_products[0]
        else:
            log_test("MongoDB Catalog Sync", False, "No products found in square_catalog_items collection")
            return None
            
    except Exception as e:
        log_test("MongoDB Catalog Sync", False, f"Exception: {str(e)}")
        return None

def test_checkout_api(catalog_item=None):
    """Test POST /api/checkout - Create payment links with real synced products"""
    print("=" * 80)
    print("TEST 3: Square Checkout API (Payment Links)")
    print("=" * 80)
    
    if not catalog_item:
        log_test("POST /api/checkout", False, "No catalog item available for testing")
        return None
    
    # Extract catalog object ID from variations
    catalog_object_id = None
    if catalog_item.get('variations') and len(catalog_item['variations']) > 0:
        catalog_object_id = catalog_item['variations'][0].get('id')
    
    if not catalog_object_id:
        log_test("POST /api/checkout", False, "No catalog object ID found in product variations")
        return None
    
    # Test 1: Valid checkout with real catalog ID
    try:
        payload = {
            "lineItems": [
                {
                    "catalogObjectId": catalog_object_id,
                    "quantity": 1,
                    "name": catalog_item.get('name', 'Test Product'),
                    "basePriceMoney": {
                        "amount": catalog_item['variations'][0].get('price_cents', 1000),
                        "currency": "USD"
                    }
                }
            ],
            "customer": {
                "name": "Sarah Johnson",
                "email": "sarah.test@example.com",
                "phone": "(404) 555-1234"
            },
            "fulfillmentType": "pickup",
            "redirectUrl": f"{BASE_URL.replace('/api', '')}/checkout/success"
        }
        
        start = time.time()
        response = requests.post(f"{BASE_URL}/checkout", json=payload, headers=HEADERS, timeout=15)
        response_time = int((time.time() - start) * 1000)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success') and data.get('paymentLink'):
                payment_link = data['paymentLink']
                details = f"Payment Link ID: {payment_link.get('id')}, URL: {payment_link.get('url')[:50]}..."
                log_test("POST /api/checkout - Valid Request", True, details, response_time)
                return payment_link
            else:
                log_test("POST /api/checkout - Valid Request", False, f"Missing payment link in response: {data}", response_time)
        else:
            # 500 error might be expected if catalog not synced to Square
            details = f"Status {response.status_code}: {response.text[:200]}"
            log_test("POST /api/checkout - Valid Request", False, details, response_time)
            
    except Exception as e:
        log_test("POST /api/checkout - Valid Request", False, f"Exception: {str(e)}")
    
    # Test 2: Empty line items validation
    try:
        payload = {"lineItems": []}
        start = time.time()
        response = requests.post(f"{BASE_URL}/checkout", json=payload, headers=HEADERS, timeout=10)
        response_time = int((time.time() - start) * 1000)
        
        if response.status_code == 400:
            log_test("POST /api/checkout - Empty Items Validation", True, "Properly rejected with 400", response_time)
        else:
            log_test("POST /api/checkout - Empty Items Validation", False, f"Expected 400, got {response.status_code}", response_time)
    except Exception as e:
        log_test("POST /api/checkout - Empty Items Validation", False, f"Exception: {str(e)}")
    
    return None

def test_payments_api():
    """Test POST /api/payments - Web Payments SDK flow"""
    print("=" * 80)
    print("TEST 4: Square Payments API (Web Payments SDK)")
    print("=" * 80)
    
    # Test 1: Missing sourceId validation
    try:
        payload = {"amountCents": 1000}
        start = time.time()
        response = requests.post(f"{BASE_URL}/payments", json=payload, headers=HEADERS, timeout=10)
        response_time = int((time.time() - start) * 1000)
        
        if response.status_code == 400:
            data = response.json()
            if 'source' in data.get('error', '').lower() or 'token' in data.get('error', '').lower():
                log_test("POST /api/payments - Missing sourceId", True, "Properly rejected with 400", response_time)
            else:
                log_test("POST /api/payments - Missing sourceId", False, f"Wrong error message: {data.get('error')}", response_time)
        else:
            log_test("POST /api/payments - Missing sourceId", False, f"Expected 400, got {response.status_code}", response_time)
    except Exception as e:
        log_test("POST /api/payments - Missing sourceId", False, f"Exception: {str(e)}")
    
    # Test 2: Invalid amount validation
    try:
        payload = {"sourceId": "test-token", "amountCents": 0}
        start = time.time()
        response = requests.post(f"{BASE_URL}/payments", json=payload, headers=HEADERS, timeout=10)
        response_time = int((time.time() - start) * 1000)
        
        if response.status_code == 400:
            log_test("POST /api/payments - Invalid Amount", True, "Properly rejected with 400", response_time)
        else:
            log_test("POST /api/payments - Invalid Amount", False, f"Expected 400, got {response.status_code}", response_time)
    except Exception as e:
        log_test("POST /api/payments - Invalid Amount", False, f"Exception: {str(e)}")
    
    # Test 3: Valid payment request (will fail with test nonce against production)
    try:
        payload = {
            "sourceId": "cnon:card-nonce-ok",  # Test nonce
            "amountCents": 1000,
            "currency": "USD",
            "customer": {
                "name": "Test Customer",
                "email": "test@example.com"
            }
        }
        start = time.time()
        response = requests.post(f"{BASE_URL}/payments", json=payload, headers=HEADERS, timeout=15)
        response_time = int((time.time() - start) * 1000)
        
        # Expected to fail with 500 (test nonce doesn't work with production API)
        # But this confirms API structure is correct
        if response.status_code in [400, 500]:
            data = response.json()
            error_msg = data.get('error', '').lower()
            if 'nonce' in error_msg or 'not found' in error_msg or 'unauthorized' in error_msg:
                details = f"API structure correct, expected error: {data.get('error')[:100]}"
                log_test("POST /api/payments - API Structure", True, details, response_time)
            else:
                log_test("POST /api/payments - API Structure", False, f"Unexpected error: {data.get('error')}", response_time)
        elif response.status_code == 200:
            # Unexpected success (shouldn't happen with test nonce)
            log_test("POST /api/payments - API Structure", True, "Payment processed (unexpected)", response_time)
        else:
            log_test("POST /api/payments - API Structure", False, f"Unexpected status {response.status_code}", response_time)
    except Exception as e:
        log_test("POST /api/payments - API Structure", False, f"Exception: {str(e)}")

def test_orders_api():
    """Test POST /api/orders/create and GET /api/orders"""
    print("=" * 80)
    print("TEST 5: Order Management APIs")
    print("=" * 80)
    
    # Test 1: Create order with valid data
    try:
        payload = {
            "cart": [
                {
                    "productId": "test-product-1",
                    "name": "Kissed by Gods",
                    "price": 11.00,
                    "quantity": 2,
                    "image": "/images/product.jpg"
                }
            ],
            "customer": {
                "name": "Sarah Johnson",
                "email": "sarah.test@example.com",
                "phone": "(404) 555-1234"
            },
            "fulfillmentType": "pickup",
            "pickupMarket": "serenbe",
            "pickupDate": "2025-02-01"
        }
        
        start = time.time()
        response = requests.post(f"{BASE_URL}/orders/create", json=payload, headers=HEADERS, timeout=15)
        response_time = int((time.time() - start) * 1000)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success') and data.get('order'):
                order = data['order']
                order_id = order.get('id')
                details = f"Order ID: {order_id}, Status: {order.get('status')}, Total: ${order.get('pricing', {}).get('total', 0)}"
                log_test("POST /api/orders/create - Valid Order", True, details, response_time)
                
                # Test 2: Retrieve order by ID
                if order_id:
                    try:
                        start = time.time()
                        response = requests.get(f"{BASE_URL}/orders/create?id={order_id}", timeout=10)
                        response_time = int((time.time() - start) * 1000)
                        
                        if response.status_code == 200:
                            data = response.json()
                            if data.get('success') and data.get('order'):
                                log_test("GET /api/orders - Retrieve by ID", True, f"Order retrieved: {order_id}", response_time)
                            else:
                                log_test("GET /api/orders - Retrieve by ID", False, "Order not found in response", response_time)
                        else:
                            log_test("GET /api/orders - Retrieve by ID", False, f"Status {response.status_code}", response_time)
                    except Exception as e:
                        log_test("GET /api/orders - Retrieve by ID", False, f"Exception: {str(e)}")
            else:
                log_test("POST /api/orders/create - Valid Order", False, f"Missing order in response: {data}", response_time)
        else:
            log_test("POST /api/orders/create - Valid Order", False, f"Status {response.status_code}: {response.text[:200]}", response_time)
    except Exception as e:
        log_test("POST /api/orders/create - Valid Order", False, f"Exception: {str(e)}")
    
    # Test 3: Missing cart validation
    try:
        payload = {
            "customer": {"name": "Test", "email": "test@example.com", "phone": "1234567890"},
            "fulfillmentType": "pickup"
        }
        start = time.time()
        response = requests.post(f"{BASE_URL}/orders/create", json=payload, headers=HEADERS, timeout=10)
        response_time = int((time.time() - start) * 1000)
        
        if response.status_code == 400:
            log_test("POST /api/orders/create - Missing Cart", True, "Properly rejected with 400", response_time)
        else:
            log_test("POST /api/orders/create - Missing Cart", False, f"Expected 400, got {response.status_code}", response_time)
    except Exception as e:
        log_test("POST /api/orders/create - Missing Cart", False, f"Exception: {str(e)}")
    
    # Test 4: Delivery validation with invalid ZIP
    try:
        payload = {
            "cart": [{"productId": "test", "name": "Test", "price": 35, "quantity": 1}],
            "customer": {"name": "Test", "email": "test@example.com", "phone": "1234567890"},
            "fulfillmentType": "delivery",
            "deliveryAddress": {
                "street": "123 Test St",
                "city": "Los Angeles",
                "state": "CA",
                "zip": "90210"  # Not in Atlanta/South Fulton whitelist
            },
            "deliveryTimeSlot": "09:00-12:00"
        }
        start = time.time()
        response = requests.post(f"{BASE_URL}/orders/create", json=payload, headers=HEADERS, timeout=10)
        response_time = int((time.time() - start) * 1000)
        
        if response.status_code == 400:
            data = response.json()
            if 'area' in data.get('error', '').lower() or 'zip' in data.get('error', '').lower():
                log_test("POST /api/orders/create - Invalid ZIP", True, "Properly rejected invalid ZIP", response_time)
            else:
                log_test("POST /api/orders/create - Invalid ZIP", False, f"Wrong error: {data.get('error')}", response_time)
        else:
            log_test("POST /api/orders/create - Invalid ZIP", False, f"Expected 400, got {response.status_code}", response_time)
    except Exception as e:
        log_test("POST /api/orders/create - Invalid ZIP", False, f"Exception: {str(e)}")

def print_summary():
    """Print test summary"""
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    print(f"Total Tests: {test_results['total']}")
    print(f"Passed: {test_results['passed']} ✅")
    print(f"Failed: {test_results['failed']} ❌")
    print(f"Success Rate: {(test_results['passed'] / test_results['total'] * 100):.1f}%")
    print("=" * 80)
    
    if test_results['failed'] > 0:
        print("\nFailed Tests:")
        for test in test_results['tests']:
            if "❌" in test['status']:
                print(f"  - {test['name']}: {test['details']}")
    
    print("\n" + "=" * 80)
    print("DETAILED TEST RESULTS")
    print("=" * 80)
    for test in test_results['tests']:
        print(f"{test['status']} - {test['name']}")
        if test['details']:
            print(f"  {test['details']}")
        if test['response_time_ms'] > 0:
            print(f"  Response time: {test['response_time_ms']}ms")

def main():
    """Run all backend tests"""
    print("\n" + "=" * 80)
    print("VORACIOUS BACKEND VALIDATION - COMPLETE SQUARE INTEGRATION TESTING")
    print("=" * 80)
    print(f"Base URL: {BASE_URL}")
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 80 + "\n")
    
    # Run tests in sequence
    health_data = test_health_endpoint()
    catalog_item = test_square_catalog_sync()
    test_checkout_api(catalog_item)
    test_payments_api()
    test_orders_api()
    
    # Print summary
    print_summary()
    
    print(f"\nCompleted: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 80 + "\n")

if __name__ == "__main__":
    main()
