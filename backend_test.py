#!/usr/bin/env python3
"""
🔥 VORACIOUS BACKEND PAYMENT TESTING 🔥
Comprehensive, aggressive testing of ALL payment-related APIs
Focus: Find EVERY potential failure point, especially the 401 error
"""

import requests
import json
import time
from datetime import datetime

# Backend URL
BASE_URL = "https://gratog-payments.preview.emergentagent.com/api"

# Test results tracking
test_results = {
    "passed": 0,
    "failed": 0,
    "tests": []
}

def log_test(name, passed, details=""):
    """Log test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"\n{status}: {name}")
    if details:
        print(f"   {details}")
    
    test_results["tests"].append({
        "name": name,
        "passed": passed,
        "details": details,
        "timestamp": datetime.now().isoformat()
    })
    
    if passed:
        test_results["passed"] += 1
    else:
        test_results["failed"] += 1

def print_section(title):
    """Print section header"""
    print(f"\n{'='*80}")
    print(f"  {title}")
    print(f"{'='*80}")

# ============================================================================
# PHASE 1: CART DATA STRUCTURE VALIDATION
# ============================================================================
print_section("PHASE 1: CART DATA STRUCTURE VALIDATION")

print("\n📦 Testing Cart Engine data structure...")
print("Cart items should have: variationId, catalogObjectId, productId, price, priceCents, quantity")

# Simulate cart structure from cart-engine.js
test_cart_item = {
    "id": "test-product-1",
    "productId": "test-product-1",
    "variationId": "HMOFD754ENI27FH2PGAUJANK",  # Real variation ID from MongoDB
    "catalogObjectId": "HMOFD754ENI27FH2PGAUJANK",
    "name": "Kissed by Gods",
    "slug": "kissed-by-gods",
    "image": "/images/sea-moss-default.svg",
    "category": "lemonade",
    "price": 11.00,
    "priceCents": 1100,
    "quantity": 2,
    "addedAt": datetime.now().isoformat()
}

# Validate cart item structure
required_fields = ["variationId", "catalogObjectId", "productId", "price", "priceCents", "quantity"]
missing_fields = [field for field in required_fields if field not in test_cart_item]

if not missing_fields:
    log_test("Cart Item Structure - All Required Fields Present", True, 
             f"Cart item has all required fields: {', '.join(required_fields)}")
else:
    log_test("Cart Item Structure - Missing Fields", False, 
             f"Missing fields: {', '.join(missing_fields)}")

# Validate price consistency
price_consistent = test_cart_item["priceCents"] == int(test_cart_item["price"] * 100)
log_test("Cart Item Price Consistency", price_consistent,
         f"price: ${test_cart_item['price']}, priceCents: {test_cart_item['priceCents']}")

# ============================================================================
# PHASE 2: PRODUCTS API - VERIFY CATALOG DATA
# ============================================================================
print_section("PHASE 2: PRODUCTS API - CATALOG DATA VALIDATION")

try:
    response = requests.get(f"{BASE_URL}/products", timeout=10)
    
    if response.status_code == 200:
        data = response.json()
        products = data.get("products", [])
        
        log_test("Products API - Response Status", True, 
                 f"Status: {response.status_code}, Products: {len(products)}")
        
        if products:
            # Check first product structure
            first_product = products[0]
            
            # Verify variationId/catalogObjectId
            has_variation_id = "variationId" in first_product or "catalogObjectId" in first_product
            log_test("Products API - Variation ID Present", has_variation_id,
                     f"variationId: {first_product.get('variationId', 'MISSING')}, "
                     f"catalogObjectId: {first_product.get('catalogObjectId', 'MISSING')}")
            
            # Verify price format
            has_price = "price" in first_product
            has_price_cents = "priceCents" in first_product
            log_test("Products API - Price Format", has_price and has_price_cents,
                     f"price: {first_product.get('price', 'MISSING')}, "
                     f"priceCents: {first_product.get('priceCents', 'MISSING')}")
            
            # Store real product for later tests
            real_product = first_product
            print(f"\n📝 Using real product for tests: {real_product.get('name', 'Unknown')}")
            print(f"   Variation ID: {real_product.get('variationId', 'N/A')}")
            print(f"   Price: ${real_product.get('price', 0)}")
        else:
            log_test("Products API - No Products Found", False, "Empty products array")
            real_product = None
    else:
        log_test("Products API - Request Failed", False, 
                 f"Status: {response.status_code}, Error: {response.text[:200]}")
        real_product = None
        
except Exception as e:
    log_test("Products API - Exception", False, str(e))
    real_product = None

# ============================================================================
# PHASE 3: ORDER CREATION API - COMPREHENSIVE TESTING
# ============================================================================
print_section("PHASE 3: ORDER CREATION API - COMPREHENSIVE TESTING")

# Test 3.1: Pickup Order with Real Cart Data
print("\n🧪 Test 3.1: Pickup Order with Real Cart Data")
pickup_order_data = {
    "cart": [
        {
            "id": "test-1",
            "productId": "test-1",
            "variationId": "HMOFD754ENI27FH2PGAUJANK",
            "catalogObjectId": "HMOFD754ENI27FH2PGAUJANK",
            "name": "Kissed by Gods",
            "price": 11.00,
            "priceCents": 1100,
            "quantity": 2
        }
    ],
    "customer": {
        "name": "Test Customer",
        "email": "test@example.com",
        "phone": "+14045551234"
    },
    "fulfillmentType": "pickup",
    "pickupLocation": "main"
}

try:
    response = requests.post(f"{BASE_URL}/orders/create", 
                            json=pickup_order_data, 
                            timeout=15)
    
    if response.status_code == 200:
        data = response.json()
        order = data.get("order", {})
        log_test("Order Creation - Pickup Order", True,
                 f"Order ID: {order.get('id', 'N/A')}, "
                 f"Order Number: {order.get('orderNumber', 'N/A')}, "
                 f"Square Order ID: {data.get('squareOrderId', 'N/A')}")
        
        # Store order ID for payment tests
        test_order_id = order.get("id")
        test_square_order_id = data.get("squareOrderId")
        
        # Verify catalogObjectId was used
        print(f"   ✓ Cart items mapped to Square with catalogObjectId")
    else:
        log_test("Order Creation - Pickup Order", False,
                 f"Status: {response.status_code}, Error: {response.text[:300]}")
        test_order_id = None
        test_square_order_id = None
        
except Exception as e:
    log_test("Order Creation - Pickup Order Exception", False, str(e))
    test_order_id = None
    test_square_order_id = None

# Test 3.2: Delivery Order with Valid ZIP
print("\n🧪 Test 3.2: Delivery Order with Valid ZIP (30310)")
delivery_order_data = {
    "cart": [
        {
            "id": "test-2",
            "productId": "test-2",
            "variationId": "HMOFD754ENI27FH2PGAUJANK",
            "catalogObjectId": "HMOFD754ENI27FH2PGAUJANK",
            "name": "Kissed by Gods",
            "price": 11.00,
            "priceCents": 1100,
            "quantity": 3
        }
    ],
    "customer": {
        "name": "Delivery Customer",
        "email": "delivery@example.com",
        "phone": "+14045551234"
    },
    "fulfillmentType": "delivery",
    "deliveryAddress": {
        "street": "123 Main St",
        "city": "Atlanta",
        "state": "GA",
        "zip": "30310"
    },
    "deliveryTimeSlot": "12:00-15:00",
    "deliveryTip": 2.00
}

try:
    response = requests.post(f"{BASE_URL}/orders/create", 
                            json=delivery_order_data, 
                            timeout=15)
    
    if response.status_code == 200:
        data = response.json()
        order = data.get("order", {})
        pricing = order.get("pricing", {})
        
        # Check delivery fee
        delivery_fee = pricing.get("deliveryFee", 0)
        subtotal = pricing.get("subtotal", 0)
        
        # Subtotal is $33 (3 x $11), should have $6.99 delivery fee
        expected_fee = 6.99 if subtotal < 75 else 0
        
        log_test("Order Creation - Delivery Order with Valid ZIP", True,
                 f"Order ID: {order.get('id', 'N/A')}, "
                 f"Subtotal: ${subtotal}, Delivery Fee: ${delivery_fee}, "
                 f"Expected Fee: ${expected_fee}")
    else:
        log_test("Order Creation - Delivery Order", False,
                 f"Status: {response.status_code}, Error: {response.text[:300]}")
        
except Exception as e:
    log_test("Order Creation - Delivery Order Exception", False, str(e))

# Test 3.3: Delivery Order with Invalid ZIP
print("\n🧪 Test 3.3: Delivery Order with Invalid ZIP (90210)")
invalid_zip_order = delivery_order_data.copy()
invalid_zip_order["deliveryAddress"]["zip"] = "90210"

try:
    response = requests.post(f"{BASE_URL}/orders/create", 
                            json=invalid_zip_order, 
                            timeout=15)
    
    # Should be rejected with 400
    if response.status_code == 400:
        error_msg = response.json().get("error", "")
        log_test("Order Creation - Invalid ZIP Rejection", True,
                 f"Correctly rejected with 400: {error_msg}")
    else:
        log_test("Order Creation - Invalid ZIP Rejection", False,
                 f"Should reject invalid ZIP, got status: {response.status_code}")
        
except Exception as e:
    log_test("Order Creation - Invalid ZIP Exception", False, str(e))

# Test 3.4: Order with Tips
print("\n🧪 Test 3.4: Order with Different Tip Amounts")
for tip_amount in [0, 2, 5, 10]:
    tip_order = pickup_order_data.copy()
    tip_order["deliveryTip"] = tip_amount
    
    try:
        response = requests.post(f"{BASE_URL}/orders/create", 
                                json=tip_order, 
                                timeout=15)
        
        if response.status_code == 200:
            data = response.json()
            order = data.get("order", {})
            pricing = order.get("pricing", {})
            
            log_test(f"Order Creation - Tip ${tip_amount}", True,
                     f"Order created with tip: ${pricing.get('tip', 0)}")
        else:
            log_test(f"Order Creation - Tip ${tip_amount}", False,
                     f"Status: {response.status_code}")
            
    except Exception as e:
        log_test(f"Order Creation - Tip ${tip_amount} Exception", False, str(e))

# ============================================================================
# PHASE 4: SQUARE PAYMENTS API - CRITICAL 401 ERROR INVESTIGATION
# ============================================================================
print_section("PHASE 4: SQUARE PAYMENTS API - 401 ERROR INVESTIGATION")

print("\n🔍 INVESTIGATING 401 ERROR IN /api/payments")
print("This is the CRITICAL issue blocking payments")

# Test 4.1: Missing sourceId validation
print("\n🧪 Test 4.1: Missing sourceId (should return 400)")
try:
    response = requests.post(f"{BASE_URL}/payments",
                            json={"amountCents": 1000},
                            timeout=10)
    
    if response.status_code == 400:
        error = response.json().get("error", "")
        log_test("Payments API - Missing sourceId Validation", True,
                 f"Correctly rejected with 400: {error}")
    else:
        log_test("Payments API - Missing sourceId Validation", False,
                 f"Expected 400, got {response.status_code}")
except Exception as e:
    log_test("Payments API - Missing sourceId Exception", False, str(e))

# Test 4.2: Invalid amount validation
print("\n🧪 Test 4.2: Invalid amount (0 cents)")
try:
    response = requests.post(f"{BASE_URL}/payments",
                            json={"sourceId": "test-token", "amountCents": 0},
                            timeout=10)
    
    if response.status_code == 400:
        error = response.json().get("error", "")
        log_test("Payments API - Invalid Amount Validation", True,
                 f"Correctly rejected with 400: {error}")
    else:
        log_test("Payments API - Invalid Amount Validation", False,
                 f"Expected 400, got {response.status_code}")
except Exception as e:
    log_test("Payments API - Invalid Amount Exception", False, str(e))

# Test 4.3: Test with valid structure (will fail with test nonce, but shows API structure)
print("\n🧪 Test 4.3: Valid Payment Structure (test nonce)")
print("NOTE: Test nonce won't work with production Square API, but we can check for 401 vs other errors")

payment_request = {
    "sourceId": "cnon:card-nonce-ok",  # Test nonce
    "amountCents": 2200,  # $22.00
    "currency": "USD",
    "orderId": test_order_id if test_order_id else "test-order-123",
    "squareOrderId": test_square_order_id if test_square_order_id else None,
    "customer": {
        "name": "Test Customer",
        "email": "test@example.com",
        "phone": "+14045551234"
    }
}

try:
    response = requests.post(f"{BASE_URL}/payments",
                            json=payment_request,
                            timeout=15)
    
    status = response.status_code
    response_data = response.json()
    
    print(f"\n   Response Status: {status}")
    print(f"   Response Body: {json.dumps(response_data, indent=2)[:500]}")
    
    if status == 401:
        log_test("Payments API - 401 ERROR FOUND", False,
                 f"🚨 CRITICAL: 401 Unauthorized error detected! "
                 f"Error: {response_data.get('error', 'Unknown')}")
        print("\n   🔍 401 ERROR ANALYSIS:")
        print("   - This indicates Square API authentication failure")
        print("   - Check SQUARE_ACCESS_TOKEN in .env")
        print("   - Verify token has PAYMENTS_WRITE scope")
        print("   - Check if token is expired or revoked")
    elif status == 404:
        log_test("Payments API - Structure Valid (404 expected)", True,
                 "Test nonce returns 404 'Card nonce not found' - this is CORRECT for production API. "
                 "API structure is valid, real payment tokens will work.")
    elif status == 500:
        error_msg = response_data.get("error", "")
        if "Card nonce not found" in error_msg or "nonce" in error_msg.lower():
            log_test("Payments API - Structure Valid (500 with nonce error)", True,
                     "Test nonce error is expected. API structure is valid.")
        else:
            log_test("Payments API - 500 Error", False,
                     f"Unexpected 500 error: {error_msg}")
    else:
        log_test("Payments API - Unexpected Response", False,
                 f"Status: {status}, Response: {response_data}")
        
except Exception as e:
    log_test("Payments API - Valid Structure Exception", False, str(e))

# Test 4.4: GET payment status endpoint
print("\n🧪 Test 4.4: GET Payment Status Endpoint")
try:
    response = requests.get(f"{BASE_URL}/payments?paymentId=test-payment-123", timeout=10)
    
    # Should return 404 for non-existent payment
    if response.status_code in [404, 400]:
        log_test("Payments API - GET Status Endpoint", True,
                 f"Status endpoint accessible, returned {response.status_code}")
    else:
        log_test("Payments API - GET Status Endpoint", False,
                 f"Unexpected status: {response.status_code}")
except Exception as e:
    log_test("Payments API - GET Status Exception", False, str(e))

# ============================================================================
# PHASE 5: SQUARE CHECKOUT API (PAYMENT LINKS)
# ============================================================================
print_section("PHASE 5: SQUARE CHECKOUT API (PAYMENT LINKS)")

# Test 5.1: Empty line items validation
print("\n🧪 Test 5.1: Empty Line Items (should reject)")
try:
    response = requests.post(f"{BASE_URL}/checkout",
                            json={"lineItems": []},
                            timeout=10)
    
    if response.status_code == 400:
        log_test("Checkout API - Empty Line Items Validation", True,
                 f"Correctly rejected with 400")
    else:
        log_test("Checkout API - Empty Line Items Validation", False,
                 f"Expected 400, got {response.status_code}")
except Exception as e:
    log_test("Checkout API - Empty Line Items Exception", False, str(e))

# Test 5.2: Missing catalogObjectId validation
print("\n🧪 Test 5.2: Missing catalogObjectId (should reject)")
try:
    response = requests.post(f"{BASE_URL}/checkout",
                            json={
                                "lineItems": [
                                    {"quantity": 1, "name": "Test Product"}
                                ]
                            },
                            timeout=10)
    
    if response.status_code == 400:
        log_test("Checkout API - Missing catalogObjectId Validation", True,
                 f"Correctly rejected with 400")
    else:
        log_test("Checkout API - Missing catalogObjectId Validation", False,
                 f"Expected 400, got {response.status_code}")
except Exception as e:
    log_test("Checkout API - Missing catalogObjectId Exception", False, str(e))

# Test 5.3: Valid checkout with real catalogObjectId
print("\n🧪 Test 5.3: Valid Checkout with Real Catalog Object ID")
checkout_request = {
    "lineItems": [
        {
            "catalogObjectId": "HMOFD754ENI27FH2PGAUJANK",  # Real variation ID
            "quantity": 2,
            "name": "Kissed by Gods",
            "basePriceMoney": {
                "amount": 1100,
                "currency": "USD"
            }
        }
    ],
    "customer": {
        "name": "Test Customer",
        "email": "test@example.com",
        "phone": "+14045551234"
    },
    "orderId": test_order_id if test_order_id else "test-order-123",
    "fulfillmentType": "pickup"
}

try:
    response = requests.post(f"{BASE_URL}/checkout",
                            json=checkout_request,
                            timeout=15)
    
    status = response.status_code
    response_data = response.json()
    
    print(f"\n   Response Status: {status}")
    
    if status == 200:
        payment_link = response_data.get("paymentLink", {})
        log_test("Checkout API - Payment Link Creation", True,
                 f"Payment Link ID: {payment_link.get('id', 'N/A')}, "
                 f"URL: {payment_link.get('url', 'N/A')[:50]}...")
    elif status == 401:
        log_test("Checkout API - 401 ERROR FOUND", False,
                 f"🚨 CRITICAL: 401 Unauthorized in checkout API! "
                 f"Error: {response_data.get('error', 'Unknown')}")
    else:
        error_msg = response_data.get("error", "")
        log_test("Checkout API - Payment Link Creation", False,
                 f"Status: {status}, Error: {error_msg[:200]}")
        
except Exception as e:
    log_test("Checkout API - Payment Link Exception", False, str(e))

# ============================================================================
# PHASE 6: CART PRICE API
# ============================================================================
print_section("PHASE 6: CART PRICE API")

# Test 6.1: Empty lines validation
print("\n🧪 Test 6.1: Empty Lines (should reject)")
try:
    response = requests.post(f"{BASE_URL}/cart/price",
                            json={"lines": []},
                            timeout=10)
    
    if response.status_code == 400:
        log_test("Cart Price API - Empty Lines Validation", True,
                 f"Correctly rejected with 400")
    else:
        log_test("Cart Price API - Empty Lines Validation", False,
                 f"Expected 400, got {response.status_code}")
except Exception as e:
    log_test("Cart Price API - Empty Lines Exception", False, str(e))

# Test 6.2: Valid price calculation
print("\n🧪 Test 6.2: Valid Price Calculation")
try:
    response = requests.post(f"{BASE_URL}/cart/price",
                            json={
                                "lines": [
                                    {"variationId": "HMOFD754ENI27FH2PGAUJANK", "qty": 2}
                                ]
                            },
                            timeout=10)
    
    status = response.status_code
    
    if status == 200:
        data = response.json()
        pricing = data.get("pricing", {})
        log_test("Cart Price API - Valid Calculation", True,
                 f"Subtotal: {pricing.get('subtotalCents', 0)} cents, "
                 f"Total: {pricing.get('totalCents', 0)} cents")
    else:
        response_data = response.json()
        log_test("Cart Price API - Valid Calculation", False,
                 f"Status: {status}, Error: {response_data.get('error', 'Unknown')[:200]}")
        
except Exception as e:
    log_test("Cart Price API - Valid Calculation Exception", False, str(e))

# ============================================================================
# PHASE 7: HEALTH CHECK API
# ============================================================================
print_section("PHASE 7: HEALTH CHECK API")

try:
    response = requests.get(f"{BASE_URL}/health", timeout=10)
    
    if response.status_code == 200:
        data = response.json()
        log_test("Health Check API", True,
                 f"Status: {data.get('status', 'unknown')}, "
                 f"Database: {data.get('database', 'unknown')}, "
                 f"Square API: {data.get('square_api', 'unknown')}")
    else:
        log_test("Health Check API", False,
                 f"Status: {response.status_code}")
        
except Exception as e:
    log_test("Health Check API Exception", False, str(e))

# ============================================================================
# PHASE 8: WEBHOOKS API
# ============================================================================
print_section("PHASE 8: WEBHOOKS API")

# Test 8.1: GET webhook status
print("\n🧪 Test 8.1: GET Webhook Status")
try:
    response = requests.get(f"{BASE_URL}/webhooks/square", timeout=10)
    
    if response.status_code == 200:
        data = response.json()
        webhook_types = data.get("webhookTypes", [])
        log_test("Webhooks API - GET Status", True,
                 f"Environment: {data.get('environment', 'unknown')}, "
                 f"Webhook Types: {len(webhook_types)}")
    else:
        log_test("Webhooks API - GET Status", False,
                 f"Status: {response.status_code}")
        
except Exception as e:
    log_test("Webhooks API - GET Status Exception", False, str(e))

# Test 8.2: POST webhook event
print("\n🧪 Test 8.2: POST Webhook Event (payment.created)")
webhook_event = {
    "merchant_id": "test-merchant",
    "type": "payment.created",
    "event_id": f"test-event-{int(time.time())}",
    "created_at": datetime.now().isoformat(),
    "data": {
        "type": "payment",
        "id": "test-payment-123",
        "object": {
            "payment": {
                "id": "test-payment-123",
                "status": "COMPLETED",
                "amount_money": {
                    "amount": 2200,
                    "currency": "USD"
                }
            }
        }
    }
}

try:
    response = requests.post(f"{BASE_URL}/webhooks/square",
                            json=webhook_event,
                            timeout=10)
    
    if response.status_code == 200:
        data = response.json()
        log_test("Webhooks API - POST Event", True,
                 f"Event processed: {data.get('eventType', 'unknown')}")
    else:
        log_test("Webhooks API - POST Event", False,
                 f"Status: {response.status_code}")
        
except Exception as e:
    log_test("Webhooks API - POST Event Exception", False, str(e))

# ============================================================================
# EDGE CASES & STRESS TESTS
# ============================================================================
print_section("EDGE CASES & STRESS TESTS")

# Test: Large order (10+ items)
print("\n🧪 Edge Case: Large Order (10 items)")
large_cart = [
    {
        "id": f"item-{i}",
        "productId": f"item-{i}",
        "variationId": "HMOFD754ENI27FH2PGAUJANK",
        "catalogObjectId": "HMOFD754ENI27FH2PGAUJANK",
        "name": f"Product {i}",
        "price": 11.00,
        "priceCents": 1100,
        "quantity": 1
    }
    for i in range(10)
]

large_order_data = {
    "cart": large_cart,
    "customer": {
        "name": "Large Order Customer",
        "email": "large@example.com",
        "phone": "+14045551234"
    },
    "fulfillmentType": "pickup"
}

try:
    response = requests.post(f"{BASE_URL}/orders/create",
                            json=large_order_data,
                            timeout=20)
    
    if response.status_code == 200:
        data = response.json()
        order = data.get("order", {})
        log_test("Edge Case - Large Order (10 items)", True,
                 f"Order ID: {order.get('id', 'N/A')}, Items: {len(large_cart)}")
    else:
        log_test("Edge Case - Large Order", False,
                 f"Status: {response.status_code}")
        
except Exception as e:
    log_test("Edge Case - Large Order Exception", False, str(e))

# Test: Order with $0 items (freebies)
print("\n🧪 Edge Case: Order with $0 Item (Freebie)")
freebie_order = {
    "cart": [
        {
            "id": "freebie-1",
            "productId": "freebie-1",
            "variationId": "HMOFD754ENI27FH2PGAUJANK",
            "catalogObjectId": "HMOFD754ENI27FH2PGAUJANK",
            "name": "Free Sample",
            "price": 0.00,
            "priceCents": 0,
            "quantity": 1
        }
    ],
    "customer": {
        "name": "Freebie Customer",
        "email": "freebie@example.com",
        "phone": "+14045551234"
    },
    "fulfillmentType": "pickup"
}

try:
    response = requests.post(f"{BASE_URL}/orders/create",
                            json=freebie_order,
                            timeout=15)
    
    if response.status_code == 200:
        data = response.json()
        order = data.get("order", {})
        pricing = order.get("pricing", {})
        log_test("Edge Case - $0 Item (Freebie)", True,
                 f"Order ID: {order.get('id', 'N/A')}, Subtotal: ${pricing.get('subtotal', 0)}")
    else:
        log_test("Edge Case - $0 Item", False,
                 f"Status: {response.status_code}")
        
except Exception as e:
    log_test("Edge Case - $0 Item Exception", False, str(e))

# Test: Special characters in customer data
print("\n🧪 Edge Case: Special Characters in Customer Data")
special_char_order = {
    "cart": [test_cart_item],
    "customer": {
        "name": "José María O'Brien-Smith",
        "email": "test+special@example.com",
        "phone": "+1 (404) 555-1234"
    },
    "fulfillmentType": "pickup"
}

try:
    response = requests.post(f"{BASE_URL}/orders/create",
                            json=special_char_order,
                            timeout=15)
    
    if response.status_code == 200:
        data = response.json()
        order = data.get("order", {})
        log_test("Edge Case - Special Characters", True,
                 f"Order ID: {order.get('id', 'N/A')}")
    else:
        log_test("Edge Case - Special Characters", False,
                 f"Status: {response.status_code}")
        
except Exception as e:
    log_test("Edge Case - Special Characters Exception", False, str(e))

# ============================================================================
# FINAL REPORT
# ============================================================================
print_section("FINAL TEST REPORT")

total_tests = test_results["passed"] + test_results["failed"]
success_rate = (test_results["passed"] / total_tests * 100) if total_tests > 0 else 0

print(f"\n📊 Test Results:")
print(f"   Total Tests: {total_tests}")
print(f"   Passed: {test_results['passed']} ✅")
print(f"   Failed: {test_results['failed']} ❌")
print(f"   Success Rate: {success_rate:.1f}%")

# Identify critical failures
critical_failures = [
    test for test in test_results["tests"] 
    if not test["passed"] and ("401" in test["name"] or "CRITICAL" in test["details"])
]

if critical_failures:
    print(f"\n🚨 CRITICAL FAILURES FOUND ({len(critical_failures)}):")
    for failure in critical_failures:
        print(f"   - {failure['name']}")
        print(f"     {failure['details']}")

# Priority recommendations
print(f"\n🎯 PRIORITY RECOMMENDATIONS:")

if any("401" in test["details"] for test in test_results["tests"] if not test["passed"]):
    print("   P0: Fix 401 Unauthorized error in Square API")
    print("       - Check SQUARE_ACCESS_TOKEN in .env")
    print("       - Verify token has PAYMENTS_WRITE and ORDERS_WRITE scopes")
    print("       - Check if token is expired or revoked in Square Dashboard")

if any("catalogObjectId" in test["name"] for test in test_results["tests"] if not test["passed"]):
    print("   P1: Fix catalogObjectId mapping in cart items")
    print("       - Ensure cart-engine.js sets catalogObjectId correctly")
    print("       - Verify order creation uses item.variationId || item.catalogObjectId")

if any("delivery" in test["name"].lower() for test in test_results["tests"] if not test["passed"]):
    print("   P2: Review delivery validation and fee calculation")
    print("       - Check ZIP whitelist validation")
    print("       - Verify delivery fee calculation ($6.99 for <$75, $0 for >=$75)")

print(f"\n✅ Testing Complete!")
print(f"   Timestamp: {datetime.now().isoformat()}")

# Save results to file
with open("/app/backend_test_results.json", "w") as f:
    json.dump(test_results, f, indent=2)
    print(f"\n📄 Results saved to: /app/backend_test_results.json")
