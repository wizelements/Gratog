#!/usr/bin/env python3
"""
Comprehensive Backend Testing for Enhanced Square Payment System
Tests all three options: Production Ready Integration, Enhanced Features, Performance & Security
"""

import requests
import json
import time
import uuid
from datetime import datetime
import os
import sys

# Configuration
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://taste-ecommerce.preview.emergentagent.com')
API_BASE = f"{BASE_URL}/api"

class SquarePaymentSystemTester:
    def __init__(self):
        self.test_results = []
        self.start_time = time.time()
        
    def log_test(self, test_name, success, details="", response_time=None):
        """Log test results with detailed information"""
        result = {
            'test': test_name,
            'success': success,
            'details': details,
            'response_time_ms': response_time,
            'timestamp': datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        time_info = f" ({response_time}ms)" if response_time else ""
        print(f"{status}: {test_name}{time_info}")
        if details:
            print(f"    Details: {details}")
        print()

def test_square_payment_mock_mode():
    """Test Square Payment API in Mock Mode - Comprehensive Testing"""
    print("🟦 TESTING SQUARE PAYMENT API MOCK MODE")
    print("=" * 60)
    
    # Test 1: Valid Mock Payment Processing
    print("Test 1: Valid Mock Payment Processing")
    try:
        valid_payment_data = {
            "sourceId": "cnon:card-nonce-ok",  # Square test nonce
            "amount": 35.00,
            "currency": "USD",
            "orderId": f"ORDER_{int(time.time())}",
            "buyerDetails": {
                "name": "Sarah Johnson",
                "email": "sarah.johnson@example.com",
                "phone": "+1-555-0123"
            },
            "orderData": {
                "items": [
                    {
                        "name": "Elderberry Sea Moss 16oz",
                        "price": 35.00,
                        "quantity": 1
                    }
                ],
                "fulfillment": {
                    "type": "pickup",
                    "location": "Serenbe Farmers Market"
                }
            }
        }
        
        response = requests.post(
            f"{API_BASE}/square-payment",
            json=valid_payment_data,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            if (data.get("success") and 
                data.get("paymentId") and 
                data.get("paymentId").startswith("mock_payment_") and
                data.get("status") == "COMPLETED" and
                data.get("amount") == 3500 and  # 35.00 in cents
                data.get("currency") == "USD"):
                log_test("Valid Mock Payment", "PASS", 
                        f"Payment ID: {data.get('paymentId')}, Amount: ${data.get('amount')/100:.2f}")
            else:
                log_test("Valid Mock Payment", "FAIL", 
                        f"Invalid response structure: {data}")
        else:
            log_test("Valid Mock Payment", "FAIL", 
                    f"Status: {response.status_code}, Response: {response.text}")
            
    except Exception as e:
        log_test("Valid Mock Payment", "FAIL", f"Exception: {str(e)}")
    
    # Test 2: Multiple Product Mock Payment
    print("Test 2: Multiple Product Mock Payment")
    try:
        multi_product_data = {
            "sourceId": "cnon:card-nonce-ok",
            "amount": 100.00,  # 3 products
            "currency": "USD",
            "orderId": f"ORDER_MULTI_{int(time.time())}",
            "buyerDetails": {
                "name": "Michael Chen",
                "email": "michael.chen@example.com",
                "phone": "+1-555-0456"
            },
            "orderData": {
                "items": [
                    {"name": "Elderberry Sea Moss 16oz", "price": 35.00, "quantity": 1},
                    {"name": "Original Sea Moss 16oz", "price": 30.00, "quantity": 1},
                    {"name": "Ginger Turmeric Sea Moss 16oz", "price": 35.00, "quantity": 1}
                ],
                "fulfillment": {
                    "type": "delivery",
                    "address": {
                        "street": "123 Wellness Ave",
                        "city": "Atlanta",
                        "state": "GA",
                        "zip": "30309"
                    }
                }
            }
        }
        
        response = requests.post(
            f"{API_BASE}/square-payment",
            json=multi_product_data,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            if (data.get("success") and 
                data.get("paymentId") and 
                data.get("status") == "COMPLETED" and
                data.get("amount") == 10000):  # 100.00 in cents
                log_test("Multiple Product Mock Payment", "PASS", 
                        f"Payment ID: {data.get('paymentId')}, Total: ${data.get('amount')/100:.2f}")
            else:
                log_test("Multiple Product Mock Payment", "FAIL", 
                        f"Invalid response: {data}")
        else:
            log_test("Multiple Product Mock Payment", "FAIL", 
                    f"Status: {response.status_code}")
            
    except Exception as e:
        log_test("Multiple Product Mock Payment", "FAIL", f"Exception: {str(e)}")
    
    # Test 3: Mock Payment with Delivery Order
    print("Test 3: Mock Payment with Delivery Order")
    try:
        delivery_order_data = {
            "sourceId": "cnon:card-nonce-ok",
            "amount": 70.00,
            "currency": "USD",
            "orderId": f"ORDER_DELIVERY_{int(time.time())}",
            "buyerDetails": {
                "name": "Emma Rodriguez",
                "email": "emma.rodriguez@example.com",
                "phone": "+1-555-0789"
            },
            "orderData": {
                "items": [
                    {"name": "Blueberry Sea Moss 16oz", "price": 35.00, "quantity": 2}
                ],
                "fulfillment": {
                    "type": "delivery",
                    "address": {
                        "street": "456 Health Street",
                        "city": "Decatur",
                        "state": "GA",
                        "zip": "30030"
                    },
                    "deliveryInstructions": "Leave at front door"
                }
            }
        }
        
        response = requests.post(
            f"{API_BASE}/square-payment",
            json=delivery_order_data,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            if (data.get("success") and 
                data.get("paymentId") and 
                data.get("status") == "COMPLETED"):
                log_test("Delivery Order Mock Payment", "PASS", 
                        f"Payment processed for delivery order: {data.get('paymentId')}")
            else:
                log_test("Delivery Order Mock Payment", "FAIL", 
                        f"Invalid response: {data}")
        else:
            log_test("Delivery Order Mock Payment", "FAIL", 
                    f"Status: {response.status_code}")
            
    except Exception as e:
        log_test("Delivery Order Mock Payment", "FAIL", f"Exception: {str(e)}")
    
    # Test 4: Mock Payment Response Format Validation
    print("Test 4: Mock Payment Response Format Validation")
    try:
        format_test_data = {
            "sourceId": "cnon:card-nonce-ok",
            "amount": 30.00,
            "currency": "USD",
            "orderId": f"ORDER_FORMAT_{int(time.time())}"
        }
        
        response = requests.post(
            f"{API_BASE}/square-payment",
            json=format_test_data,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            required_fields = ["success", "paymentId", "orderId", "status", "amount", "currency"]
            missing_fields = [field for field in required_fields if field not in data]
            
            if not missing_fields and data.get("success") == True:
                log_test("Mock Response Format", "PASS", 
                        f"All required fields present: {required_fields}")
            else:
                log_test("Mock Response Format", "FAIL", 
                        f"Missing fields: {missing_fields}, Response: {data}")
        else:
            log_test("Mock Response Format", "FAIL", 
                    f"Status: {response.status_code}")
            
    except Exception as e:
        log_test("Mock Response Format", "FAIL", f"Exception: {str(e)}")
    
    # Test 5: Input Validation Still Works in Mock Mode
    print("Test 5: Input Validation in Mock Mode")
    try:
        # Test missing sourceId
        invalid_data = {
            "amount": 35.00,
            "currency": "USD"
        }
        
        response = requests.post(
            f"{API_BASE}/square-payment",
            json=invalid_data,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        if response.status_code == 400:
            data = response.json()
            if not data.get("success") and "sourceId" in data.get("error", ""):
                log_test("Mock Mode Input Validation", "PASS", 
                        "Missing sourceId properly rejected with 400")
            else:
                log_test("Mock Mode Input Validation", "FAIL", 
                        f"Unexpected error response: {data}")
        else:
            log_test("Mock Mode Input Validation", "FAIL", 
                    f"Expected 400, got {response.status_code}")
            
    except Exception as e:
        log_test("Mock Mode Input Validation", "FAIL", f"Exception: {str(e)}")
    
    # Test 6: Mock Mode Performance Test
    print("Test 6: Mock Mode Performance Test")
    try:
        start_time = time.time()
        
        performance_data = {
            "sourceId": "cnon:card-nonce-ok",
            "amount": 35.00,
            "currency": "USD",
            "orderId": f"ORDER_PERF_{int(time.time())}"
        }
        
        response = requests.post(
            f"{API_BASE}/square-payment",
            json=performance_data,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        end_time = time.time()
        response_time = end_time - start_time
        
        if response.status_code == 200 and response_time < 10.0:  # Should be reasonably fast in mock mode
            data = response.json()
            if data.get("success"):
                log_test("Mock Mode Performance", "PASS", 
                        f"Response time: {response_time:.2f}s (under 10s threshold)")
            else:
                log_test("Mock Mode Performance", "FAIL", 
                        f"Payment failed: {data}")
        else:
            log_test("Mock Mode Performance", "FAIL", 
                    f"Slow response: {response_time:.2f}s or error: {response.status_code}")
            
    except Exception as e:
        log_test("Mock Mode Performance", "FAIL", f"Exception: {str(e)}")
    
    # Test 7: Error Handling in Mock Mode
    print("Test 7: Error Handling in Mock Mode")
    try:
        # Test invalid amount
        error_test_data = {
            "sourceId": "cnon:card-nonce-ok",
            "amount": -10.00,  # Invalid negative amount
            "currency": "USD"
        }
        
        response = requests.post(
            f"{API_BASE}/square-payment",
            json=error_test_data,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        if response.status_code == 400:
            data = response.json()
            if not data.get("success") and "amount" in data.get("error", "").lower():
                log_test("Mock Mode Error Handling", "PASS", 
                        "Invalid amount properly rejected")
            else:
                log_test("Mock Mode Error Handling", "FAIL", 
                        f"Unexpected error response: {data}")
        else:
            log_test("Mock Mode Error Handling", "FAIL", 
                    f"Expected 400, got {response.status_code}")
            
    except Exception as e:
        log_test("Mock Mode Error Handling", "FAIL", f"Exception: {str(e)}")
    
    # Test 8: Mock Receipt URL Generation
    print("Test 8: Mock Receipt URL Generation")
    try:
        receipt_test_data = {
            "sourceId": "cnon:card-nonce-ok",
            "amount": 35.00,
            "currency": "USD",
            "orderId": f"ORDER_RECEIPT_{int(time.time())}"
        }
        
        response = requests.post(
            f"{API_BASE}/square-payment",
            json=receipt_test_data,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            receipt_url = data.get("receiptUrl", "")
            if receipt_url and "mock-square.com/receipt/" in receipt_url:
                log_test("Mock Receipt URL", "PASS", 
                        f"Mock receipt URL generated: {receipt_url}")
            else:
                log_test("Mock Receipt URL", "FAIL", 
                        f"Invalid or missing receipt URL: {receipt_url}")
        else:
            log_test("Mock Receipt URL", "FAIL", 
                    f"Status: {response.status_code}")
            
    except Exception as e:
        log_test("Mock Receipt URL", "FAIL", f"Exception: {str(e)}")
def main():
    """Run all Square Payment Mock Mode tests"""
    print("🚀 STARTING SQUARE PAYMENT MOCK MODE TESTING")
    print("=" * 60)
    print(f"Testing against: {BASE_URL}")
    print(f"API Base: {API_BASE}")
    print()
    
    # Test Square Payment Mock Mode
    test_square_payment_mock_mode()
    
    print("🏁 SQUARE PAYMENT MOCK MODE TESTING COMPLETE")
    print("=" * 60)

if __name__ == "__main__":
    main()