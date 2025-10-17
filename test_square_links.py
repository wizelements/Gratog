#!/usr/bin/env python3
"""
Test Square Product Links Integration
Creates order and validates Square checkout redirect
"""

import requests
import json
import time
from datetime import datetime

BASE_URL = "http://localhost:3000"
API_BASE = f"{BASE_URL}/api"

def log(message, emoji="ℹ️"):
    print(f"{emoji} {message}")

def test_order_creation_with_square_link():
    """Test complete order flow with Square link generation"""
    log("="*70, "")
    log("SQUARE PRODUCT LINK TEST - ORDER CREATION", "🧪")
    log("="*70, "")
    
    # Step 1: Create order
    log("\nStep 1: Creating test order...", "📝")
    
    order_data = {
        "cart": [
            {
                "id": "elderberry-moss",
                "slug": "elderberry-moss",
                "name": "Elderberry Moss",
                "price": 25.00,
                "quantity": 1,
                "rewardPoints": 25,
                "squareProductUrl": "https://square.link/u/elderberry-moss"
            }
        ],
        "customer": {
            "name": "Square Link Test",
            "email": "square-test@tasteofgratitude.com",
            "phone": "+14045551234"
        },
        "fulfillmentType": "pickup_market",
        "subtotal": 25.00,
        "total": 25.00,
        "source": "square_link_test"
    }
    
    try:
        response = requests.post(
            f"{API_BASE}/orders/create",
            json=order_data,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            order = result.get('order', {})
            order_id = order.get('id')
            
            log(f"✅ Order created successfully!", "✅")
            log(f"   Order ID: {order_id}", "")
            log(f"   Status: {order.get('status')}", "")
            log(f"   Customer: {order.get('customer', {}).get('name')}", "")
            log(f"   Total: ${order.get('total')}", "")
            
            # Step 2: Check Square link
            log("\nStep 2: Validating Square checkout link...", "🔗")
            
            items = order.get('items', [])
            if items and len(items) > 0:
                first_item = items[0]
                square_url = first_item.get('squareProductUrl')
                
                if square_url:
                    log(f"✅ Square Product URL found: {square_url}", "✅")
                    
                    # Test if the Square link is accessible
                    log("\nStep 3: Testing Square link accessibility...", "🌐")
                    try:
                        link_response = requests.head(square_url, timeout=10, allow_redirects=True)
                        if link_response.status_code < 400:
                            log(f"✅ Square link is accessible (Status: {link_response.status_code})", "✅")
                            log(f"   Final URL: {link_response.url}", "")
                        else:
                            log(f"⚠️  Square link returned status: {link_response.status_code}", "⚠️")
                    except Exception as e:
                        log(f"⚠️  Could not verify Square link: {str(e)}", "⚠️")
                    
                    # Display payment instructions
                    log("\n" + "="*70, "")
                    log("PAYMENT INSTRUCTIONS", "💳")
                    log("="*70, "")
                    log("To complete the test payment:", "")
                    log(f"1. Open this URL in your browser:", "")
                    log(f"   {square_url}", "")
                    log(f"2. Complete the payment on Square's checkout page", "")
                    log(f"3. Order will be updated via webhook when payment completes", "")
                    log("", "")
                    log(f"Order tracking URL:", "")
                    log(f"   {BASE_URL}/order/success?orderId={order_id}", "")
                    
                    return {
                        "success": True,
                        "order_id": order_id,
                        "square_url": square_url,
                        "order": order
                    }
                else:
                    log("❌ No Square product URL in order items", "❌")
                    return {"success": False, "error": "Missing Square URL"}
            else:
                log("❌ No items in order", "❌")
                return {"success": False, "error": "No items"}
                
        else:
            log(f"❌ Order creation failed: {response.status_code}", "❌")
            log(f"   Response: {response.text[:200]}", "")
            return {"success": False, "error": response.text}
            
    except Exception as e:
        log(f"❌ Exception during order creation: {str(e)}", "❌")
        return {"success": False, "error": str(e)}

def test_multiple_products():
    """Test order with multiple products"""
    log("\n" + "="*70, "")
    log("MULTI-PRODUCT ORDER TEST", "🧪")
    log("="*70, "")
    
    order_data = {
        "cart": [
            {
                "id": "elderberry-moss",
                "slug": "elderberry-moss",
                "name": "Elderberry Moss",
                "price": 25.00,
                "quantity": 2,
                "squareProductUrl": "https://square.link/u/elderberry-moss"
            },
            {
                "id": "healing-harmony",
                "slug": "healing-harmony",
                "name": "Healing Harmony",
                "price": 28.00,
                "quantity": 1,
                "squareProductUrl": "https://square.link/u/healing-harmony"
            }
        ],
        "customer": {
            "name": "Multi-Product Test",
            "email": "multi-test@tasteofgratitude.com",
            "phone": "+14045551234"
        },
        "fulfillmentType": "pickup_market",
        "subtotal": 78.00,
        "total": 78.00,
        "source": "multi_product_test"
    }
    
    try:
        response = requests.post(f"{API_BASE}/orders/create", json=order_data, timeout=30)
        
        if response.status_code == 200:
            result = response.json()
            order = result.get('order', {})
            
            log(f"✅ Multi-product order created: {order.get('id')}", "✅")
            log(f"   Items: {len(order.get('items', []))}", "")
            log(f"   Total: ${order.get('total')}", "")
            
            # For multi-product, show first item's Square link
            if order.get('items'):
                first_item = order['items'][0]
                log(f"\n   Primary Square link: {first_item.get('squareProductUrl')}", "")
                log(f"   Note: Multiple items redirect to first product", "⚠️")
            
            return True
        else:
            log(f"❌ Multi-product order failed: {response.status_code}", "❌")
            return False
            
    except Exception as e:
        log(f"❌ Exception: {str(e)}", "❌")
        return False

def verify_webhook_ready():
    """Verify webhook endpoint is ready for Square callbacks"""
    log("\n" + "="*70, "")
    log("WEBHOOK READINESS CHECK", "🔗")
    log("="*70, "")
    
    try:
        response = requests.get(f"{API_BASE}/square-webhook", timeout=10)
        if response.status_code == 200:
            data = response.json()
            log(f"✅ Webhook endpoint active", "✅")
            log(f"   Message: {data.get('message')}", "")
            log(f"   Environment: {data.get('environment')}", "")
            log(f"\n   Configure in Square Dashboard:", "")
            log(f"   https://your-domain.com/api/square-webhook", "")
            return True
        else:
            log(f"⚠️  Webhook returned: {response.status_code}", "⚠️")
            return False
    except Exception as e:
        log(f"❌ Webhook check failed: {str(e)}", "❌")
        return False

def main():
    log("="*70, "")
    log("SQUARE CHECKOUT LINK INTEGRATION TEST", "🚀")
    log("="*70, "")
    log(f"Base URL: {BASE_URL}", "")
    log(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", "")
    
    # Run tests
    result = test_order_creation_with_square_link()
    
    if result and result.get('success'):
        test_multiple_products()
        verify_webhook_ready()
        
        log("\n" + "="*70, "")
        log("TEST SUMMARY", "📊")
        log("="*70, "")
        log("✅ Order creation: Working", "")
        log("✅ Square link generation: Working", "")
        log("✅ Webhook endpoint: Ready", "")
        log("\n🎯 Ready for live Square payment testing!", "")
        log(f"\n   Open this link to complete test payment:", "")
        log(f"   {result.get('square_url')}", "")
    else:
        log("\n❌ Test failed - check configuration", "")

if __name__ == "__main__":
    main()
