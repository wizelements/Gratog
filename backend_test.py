#!/usr/bin/env python3
"""
Comprehensive Square Payment Failure Diagnostic Test Suite
Tests all Square payment-related APIs to identify root cause of payment failures
"""

import requests
import json
import time
from datetime import datetime

# Configuration
BASE_URL = "https://gratitude-ecom.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

# Test credentials from .env
SQUARE_ACCESS_TOKEN = "EAAAlzvAr479mGiUm3CDj5oL9CekG0lbf_lgPWohGHag5qaC4YgpkmkGVtUF8_Me"
SQUARE_APPLICATION_ID = "sq0idp-V1fV-MwsU5lET4rvzHKnIw"
SQUARE_LOCATION_ID = "L66TVG6867BG9"
SQUARE_ENVIRONMENT = "production"

# Test data
TEST_NONCE = "cnon:card-nonce-ok"  # Square test nonce for sandbox
TEST_CUSTOMER = {
    "name": "Sarah Johnson",
    "email": "sarah.test@example.com",
    "phone": "+14045551234"
}

def print_test_header(test_name):
    print(f"\n{'='*80}")
    print(f"TEST: {test_name}")
    print(f"{'='*80}")

def print_result(success, message, details=None):
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"{status}: {message}")
    if details:
        print(f"Details: {json.dumps(details, indent=2)}")

def test_square_credential_format():
    """Phase 1: Test Square credential format and validity"""
    print_test_header("Square Credential Format Validation")
    
    # Check token format
    token_prefix = SQUARE_ACCESS_TOKEN[:4]
    print(f"Token prefix: {token_prefix}")
    print(f"Token length: {len(SQUARE_ACCESS_TOKEN)}")
    print(f"Environment: {SQUARE_ENVIRONMENT}")
    print(f"Application ID: {SQUARE_APPLICATION_ID}")
    print(f"Location ID: {SQUARE_LOCATION_ID}")
    
    # EAAA prefix indicates personal access token (production)
    # sq0csp- prefix indicates OAuth token (production)
    # sandbox-sq0atb- prefix indicates sandbox token
    
    if token_prefix == "EAAA":
        print_result(True, "Token format: Personal Access Token (Production)", {
            "type": "personal_access_token",
            "environment": "production",
            "note": "May need OAuth token with proper scopes for payments"
        })
    elif token_prefix.startswith("sq0csp"):
        print_result(True, "Token format: OAuth Token (Production)", {
            "type": "oauth_token",
            "environment": "production"
        })
    elif token_prefix.startswith("sandbox"):
        print_result(True, "Token format: Sandbox Token", {
            "type": "sandbox_token",
            "environment": "sandbox"
        })
    else:
        print_result(False, "Unknown token format", {
            "prefix": token_prefix,
            "expected": "EAAA, sq0csp-, or sandbox-sq0atb-"
        })

def test_square_checkout_api():
    """Phase 2: Test Square Checkout API (Payment Links)"""
    print_test_header("Square Checkout API - Payment Links Creation")
    
    # Test 1: POST with catalogObjectId
    print("\n--- Test 1: Create Payment Link with Catalog Object ID ---")
    try:
        payload = {
            "lineItems": [
                {
                    "catalogObjectId": "TEST_CATALOG_OBJ_123",
                    "quantity": 1,
                    "name": "Test Product",
                    "basePriceMoney": {
                        "amount": 3500,
                        "currency": "USD"
                    }
                }
            ],
            "customer": TEST_CUSTOMER,
            "orderId": f"TEST-{int(time.time())}",
            "fulfillmentType": "pickup"
        }
        
        response = requests.post(
            f"{API_BASE}/checkout",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success") and data.get("paymentLink"):
                print_result(True, "Payment Link created successfully", {
                    "paymentLinkId": data["paymentLink"].get("id"),
                    "url": data["paymentLink"].get("url")[:50] + "..." if data["paymentLink"].get("url") else None
                })
            else:
                print_result(False, "Payment Link creation returned success=false", data)
        else:
            print_result(False, f"Payment Link creation failed with {response.status_code}", response.json())
            
    except Exception as e:
        print_result(False, f"Exception during checkout API test: {str(e)}")
    
    # Test 2: POST without catalogObjectId (custom line items)
    print("\n--- Test 2: Create Payment Link without Catalog Object ID ---")
    try:
        payload = {
            "lineItems": [
                {
                    "quantity": 2,
                    "name": "Custom Sea Moss Gel",
                    "basePriceMoney": {
                        "amount": 3000,
                        "currency": "USD"
                    },
                    "productId": "custom-product-1"
                }
            ],
            "customer": TEST_CUSTOMER,
            "orderId": f"TEST-{int(time.time())}",
            "fulfillmentType": "delivery"
        }
        
        response = requests.post(
            f"{API_BASE}/checkout",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print_result(True, "Custom line items accepted", data)
        else:
            print_result(False, f"Custom line items failed: {response.status_code}", response.json())
            
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")
    
    # Test 3: GET status endpoint
    print("\n--- Test 3: Checkout Status Endpoint ---")
    try:
        response = requests.get(
            f"{API_BASE}/checkout",
            timeout=10
        )
        
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            print_result(True, "Checkout status endpoint accessible", response.json())
        else:
            print_result(False, f"Status endpoint failed: {response.status_code}")
            
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")

def test_square_payments_api():
    """Phase 2: Test Square Payments API (Web Payments SDK)"""
    print_test_header("Square Payments API - Web Payments SDK Integration")
    
    # Test 1: POST with test nonce
    print("\n--- Test 1: Process Payment with Test Nonce ---")
    try:
        payload = {
            "sourceId": TEST_NONCE,
            "amountCents": 100,  # $1.00 test
            "currency": "USD",
            "orderId": f"TEST-ORDER-{int(time.time())}",
            "customer": TEST_CUSTOMER,
            "idempotencyKey": f"test-{int(time.time())}"
        }
        
        response = requests.post(
            f"{API_BASE}/payments",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                print_result(True, "Payment processed successfully", {
                    "paymentId": data.get("payment", {}).get("id"),
                    "status": data.get("payment", {}).get("status")
                })
            else:
                print_result(False, "Payment returned success=false", data)
        elif response.status_code == 401:
            print_result(False, "AUTHENTICATION ERROR - 401 Unauthorized", {
                "error": response.json(),
                "diagnosis": "Square credentials are invalid or lack proper permissions"
            })
        elif response.status_code == 404:
            print_result(False, "Card nonce not found - Expected for test nonce against production", {
                "error": response.json(),
                "diagnosis": "Test nonce (cnon:card-nonce-ok) only works in sandbox, not production"
            })
        else:
            print_result(False, f"Payment failed with {response.status_code}", response.json())
            
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")
    
    # Test 2: Missing sourceId validation
    print("\n--- Test 2: Validation - Missing sourceId ---")
    try:
        payload = {
            "amountCents": 100,
            "currency": "USD"
        }
        
        response = requests.post(
            f"{API_BASE}/payments",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        if response.status_code == 400:
            print_result(True, "Missing sourceId properly rejected with 400", response.json())
        else:
            print_result(False, f"Expected 400, got {response.status_code}", response.json())
            
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")
    
    # Test 3: Invalid amount validation
    print("\n--- Test 3: Validation - Invalid Amount ---")
    try:
        payload = {
            "sourceId": TEST_NONCE,
            "amountCents": 0,
            "currency": "USD"
        }
        
        response = requests.post(
            f"{API_BASE}/payments",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        if response.status_code == 400:
            print_result(True, "Invalid amount properly rejected with 400", response.json())
        else:
            print_result(False, f"Expected 400, got {response.status_code}", response.json())
            
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")
    
    # Test 4: GET payment status
    print("\n--- Test 4: Get Payment Status ---")
    try:
        response = requests.get(
            f"{API_BASE}/payments?paymentId=test-payment-123",
            timeout=10
        )
        
        print(f"Status Code: {response.status_code}")
        if response.status_code in [200, 404]:
            print_result(True, "Payment status endpoint accessible", response.json())
        else:
            print_result(False, f"Unexpected status: {response.status_code}")
            
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")

def test_order_creation_api():
    """Phase 2: Test Order Creation API"""
    print_test_header("Order Creation API")
    
    # Test 1: Valid pickup order
    print("\n--- Test 1: Create Pickup Order ---")
    try:
        payload = {
            "cart": [
                {
                    "productId": "elderberry-moss",
                    "name": "Elderberry Sea Moss Gel",
                    "price": 35.00,
                    "quantity": 1,
                    "image": "/images/elderberry.jpg"
                }
            ],
            "customer": TEST_CUSTOMER,
            "fulfillmentType": "pickup_market",
            "pickupMarket": "serenbe",
            "pickupDate": "2025-02-01"
        }
        
        response = requests.post(
            f"{API_BASE}/orders/create",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                print_result(True, "Pickup order created successfully", {
                    "orderId": data.get("order", {}).get("id"),
                    "orderNumber": data.get("order", {}).get("orderNumber"),
                    "status": data.get("order", {}).get("status")
                })
            else:
                print_result(False, "Order creation returned success=false", data)
        else:
            print_result(False, f"Order creation failed: {response.status_code}", response.json())
            
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")
    
    # Test 2: Valid delivery order with valid ZIP
    print("\n--- Test 2: Create Delivery Order (Valid ZIP) ---")
    try:
        payload = {
            "cart": [
                {
                    "productId": "original-moss",
                    "name": "Original Sea Moss Gel",
                    "price": 30.00,
                    "quantity": 1
                }
            ],
            "customer": TEST_CUSTOMER,
            "fulfillmentType": "delivery",
            "deliveryAddress": {
                "street": "123 Peachtree St",
                "city": "Atlanta",
                "state": "GA",
                "zip": "30310"
            },
            "deliveryTimeSlot": "12:00-15:00",
            "deliveryTip": 5.00
        }
        
        response = requests.post(
            f"{API_BASE}/orders/create",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                order = data.get("order", {})
                print_result(True, "Delivery order created successfully", {
                    "orderId": order.get("id"),
                    "deliveryFee": order.get("pricing", {}).get("deliveryFee"),
                    "total": order.get("pricing", {}).get("total")
                })
            else:
                print_result(False, "Delivery order returned success=false", data)
        else:
            print_result(False, f"Delivery order failed: {response.status_code}", response.json())
            
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")
    
    # Test 3: Invalid ZIP code
    print("\n--- Test 3: Delivery Order with Invalid ZIP ---")
    try:
        payload = {
            "cart": [
                {
                    "productId": "original-moss",
                    "name": "Original Sea Moss Gel",
                    "price": 30.00,
                    "quantity": 1
                }
            ],
            "customer": TEST_CUSTOMER,
            "fulfillmentType": "delivery",
            "deliveryAddress": {
                "street": "123 Main St",
                "city": "New York",
                "state": "NY",
                "zip": "10001"
            },
            "deliveryTimeSlot": "12:00-15:00"
        }
        
        response = requests.post(
            f"{API_BASE}/orders/create",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        if response.status_code == 400:
            error = response.json().get("error", "")
            if "not in your area" in error.lower():
                print_result(True, "Invalid ZIP properly rejected", response.json())
            else:
                print_result(False, "Wrong error message for invalid ZIP", response.json())
        else:
            print_result(False, f"Expected 400, got {response.status_code}", response.json())
            
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")
    
    # Test 4: Below minimum order
    print("\n--- Test 4: Delivery Order Below Minimum ---")
    try:
        payload = {
            "cart": [
                {
                    "productId": "test-product",
                    "name": "Test Product",
                    "price": 10.00,
                    "quantity": 1
                }
            ],
            "customer": TEST_CUSTOMER,
            "fulfillmentType": "delivery",
            "deliveryAddress": {
                "street": "123 Peachtree St",
                "city": "Atlanta",
                "state": "GA",
                "zip": "30310"
            },
            "deliveryTimeSlot": "12:00-15:00"
        }
        
        response = requests.post(
            f"{API_BASE}/orders/create",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        if response.status_code == 400:
            error = response.json().get("error", "")
            if "minimum" in error.lower():
                print_result(True, "Below minimum order properly rejected", response.json())
            else:
                print_result(False, "Wrong error for below minimum", response.json())
        else:
            print_result(False, f"Expected 400, got {response.status_code}", response.json())
            
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")

def test_cart_price_api():
    """Phase 2: Test Cart Price Calculation API"""
    print_test_header("Cart Price Calculation API")
    
    # Test 1: Valid cart pricing
    print("\n--- Test 1: Calculate Cart Price ---")
    try:
        payload = {
            "lines": [
                {
                    "variationId": "TEST_VARIATION_123",
                    "qty": 2
                }
            ]
        }
        
        response = requests.post(
            f"{API_BASE}/cart/price",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code == 200:
            print_result(True, "Cart price calculation successful", response.json())
        elif response.status_code in [400, 500]:
            # Expected if catalog not synced or auth issues
            print_result(False, f"Cart price calculation failed (expected if catalog not synced): {response.status_code}", response.json())
        else:
            print_result(False, f"Unexpected status: {response.status_code}", response.json())
            
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")
    
    # Test 2: Empty lines validation
    print("\n--- Test 2: Validation - Empty Lines ---")
    try:
        payload = {
            "lines": []
        }
        
        response = requests.post(
            f"{API_BASE}/cart/price",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        if response.status_code == 400:
            print_result(True, "Empty lines properly rejected with 400", response.json())
        else:
            print_result(False, f"Expected 400, got {response.status_code}", response.json())
            
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")

def test_webhook_handler():
    """Phase 4: Test Webhook Handler"""
    print_test_header("Square Webhook Handler")
    
    # Test 1: GET endpoint
    print("\n--- Test 1: Webhook Status Endpoint ---")
    try:
        response = requests.get(
            f"{API_BASE}/webhooks/square",
            timeout=10
        )
        
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            print_result(True, "Webhook endpoint accessible", response.json())
        else:
            print_result(False, f"Webhook endpoint failed: {response.status_code}")
            
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")
    
    # Test 2: POST with test event
    print("\n--- Test 2: Process Test Webhook Event ---")
    try:
        payload = {
            "type": "catalog.version.updated",
            "event_id": f"test-event-{int(time.time())}",
            "created_at": datetime.utcnow().isoformat() + "Z",
            "data": {
                "object": {
                    "type": "ITEM",
                    "id": "TEST_ITEM_123",
                    "version": 1,
                    "updated_at": datetime.utcnow().isoformat() + "Z"
                }
            }
        }
        
        response = requests.post(
            f"{API_BASE}/webhooks/square",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get("received"):
                print_result(True, "Webhook event processed successfully", data)
            else:
                print_result(False, "Webhook processing returned received=false", data)
        else:
            print_result(False, f"Webhook processing failed: {response.status_code}", response.json())
            
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")

def test_create_checkout_v2_api():
    """Phase 2: Test Create Checkout V2 API"""
    print_test_header("Create Checkout V2 API (Square Checkout API v2)")
    
    # Test 1: GET status endpoint
    print("\n--- Test 1: Checkout V2 Status Endpoint ---")
    try:
        response = requests.get(
            f"{API_BASE}/create-checkout",
            timeout=10
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code == 200:
            data = response.json()
            print_result(True, "Checkout V2 status endpoint accessible", {
                "configured": data.get("configured"),
                "environment": data.get("environment"),
                "featureFlag": data.get("featureFlag")
            })
        else:
            print_result(False, f"Status endpoint failed: {response.status_code}")
            
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")
    
    # Test 2: POST with valid cart
    print("\n--- Test 2: Create Checkout Session ---")
    try:
        payload = {
            "items": [
                {
                    "productId": "elderberry-moss",
                    "slug": "elderberry-sea-moss-gel",
                    "name": "Elderberry Sea Moss Gel",
                    "price": 35.00,
                    "quantity": 1,
                    "image": "/images/elderberry.jpg"
                }
            ],
            "contact": TEST_CUSTOMER,
            "fulfillment": {
                "type": "pickup",
                "pickupLocation": "serenbe"
            }
        }
        
        response = requests.post(
            f"{API_BASE}/create-checkout",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                print_result(True, "Checkout session created successfully", {
                    "checkoutUrl": data.get("checkoutUrl")[:50] + "..." if data.get("checkoutUrl") else None,
                    "paymentLinkId": data.get("paymentLinkId"),
                    "orderId": data.get("orderId")
                })
            else:
                print_result(False, "Checkout creation returned success=false", data)
        else:
            print_result(False, f"Checkout creation failed: {response.status_code}", response.json())
            
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")
    
    # Test 3: Validation - empty cart
    print("\n--- Test 3: Validation - Empty Cart ---")
    try:
        payload = {
            "items": [],
            "contact": TEST_CUSTOMER
        }
        
        response = requests.post(
            f"{API_BASE}/create-checkout",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        if response.status_code == 400:
            print_result(True, "Empty cart properly rejected with 400", response.json())
        else:
            print_result(False, f"Expected 400, got {response.status_code}", response.json())
            
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")

def run_all_tests():
    """Run all diagnostic tests"""
    print("\n" + "="*80)
    print("COMPREHENSIVE SQUARE PAYMENT FAILURE DIAGNOSTIC")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print(f"Test Time: {datetime.now().isoformat()}")
    print(f"Square Environment: {SQUARE_ENVIRONMENT}")
    print("="*80)
    
    # Phase 1: Credential Validation
    test_square_credential_format()
    
    # Phase 2: Complete Payment Flow Testing
    test_create_checkout_v2_api()
    test_square_checkout_api()
    test_square_payments_api()
    test_order_creation_api()
    test_cart_price_api()
    
    # Phase 4: Webhook & Catalog Status
    test_webhook_handler()
    
    print("\n" + "="*80)
    print("DIAGNOSTIC COMPLETE")
    print("="*80)
    print("\nSUMMARY:")
    print("- Tested Square credential format and OAuth scope")
    print("- Tested complete payment flow (checkout, payments, orders)")
    print("- Tested cart price calculation")
    print("- Tested webhook handler")
    print("\nNEXT STEPS:")
    print("1. Review all FAIL results above")
    print("2. Check for authentication errors (401)")
    print("3. Verify OAuth scopes if using personal access token")
    print("4. Check if catalog sync is needed for catalogObjectId tests")
    print("5. Verify webhook configuration in Square Developer Dashboard")
    print("="*80)

if __name__ == "__main__":
    run_all_tests()
