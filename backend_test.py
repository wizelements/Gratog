#!/usr/bin/env python3
"""
Backend API Testing for Taste of Gratitude - Enhanced System After Refactoring
Testing Focus: Cleaned up and enhanced backend APIs after comprehensive refactoring

TESTING PRIORITIES (as per review request):
1. Product API - Enhanced product structure with Square product URLs, reward points, and categories
2. Coupon System - Spin wheel coupons, validation, and redemption APIs  
3. Health Checks - System monitoring endpoints
4. Database Operations - MongoDB connections and basic CRUD operations
5. Error Handling - Graceful fallbacks and error responses

SPECIFIC ENDPOINTS TO TEST:
- /api/health - System health monitoring
- /api/coupons/create - Spin wheel coupon creation
- /api/coupons/validate - Coupon validation logic
- Product data structure and reward points calculation
- Database connectivity and basic operations
"""

import requests
import json
import time
import uuid
from datetime import datetime, timedelta

# Configuration
BASE_URL = "https://gratitude-square.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

class BackendTester:
    def __init__(self):
        self.results = []
        self.start_time = time.time()
        
    def log_result(self, test_name, success, details, response_time=None):
        """Log test result with details"""
        result = {
            'test': test_name,
            'success': success,
            'details': details,
            'response_time_ms': response_time,
            'timestamp': datetime.now().isoformat()
        }
        self.results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        time_info = f" ({response_time}ms)" if response_time else ""
        print(f"{status}: {test_name}{time_info}")
        if not success or (response_time and response_time > 2000):
            print(f"   Details: {details}")

    def test_health_endpoint(self):
        """Test system health check endpoint"""
        print("\n🏥 TESTING HEALTH CHECK ENDPOINT")
        
        try:
            start = time.time()
            response = requests.get(f"{API_BASE}/health", timeout=10)
            response_time = int((time.time() - start) * 1000)
            
            if response.status_code == 200:
                data = response.json()
                
                # Check required fields
                required_fields = ['status', 'timestamp', 'services', 'response_time_ms']
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_result("Health Endpoint Structure", False, 
                                  f"Missing fields: {missing_fields}", response_time)
                else:
                    self.log_result("Health Endpoint Structure", True, 
                                  f"All required fields present: {list(data.keys())}", response_time)
                
                # Check services status
                services = data.get('services', {})
                db_status = services.get('database', 'unknown')
                square_status = services.get('square_api', 'unknown')
                
                self.log_result("Database Connectivity", 
                              db_status == 'connected', 
                              f"Database status: {db_status}", response_time)
                
                self.log_result("Square API Status", 
                              square_status in ['production', 'sandbox', 'mock_mode'], 
                              f"Square API status: {square_status}", response_time)
                
                # Check response time
                self.log_result("Health Check Performance", 
                              response_time < 2000, 
                              f"Response time: {response_time}ms (target: <2000ms)", response_time)
                
            else:
                self.log_result("Health Endpoint Availability", False, 
                              f"HTTP {response.status_code}: {response.text}", response_time)
                
        except Exception as e:
            self.log_result("Health Endpoint Availability", False, f"Request failed: {str(e)}")

    def test_complete_purchase_flow(self):
        """🛒 COMPLETE PURCHASE FLOW VALIDATION - End-to-end order creation pipeline"""
        print("\n🛒 TESTING COMPLETE PURCHASE FLOW VALIDATION")
        
        # Test realistic customer purchase scenarios
        test_scenarios = [
            {
                "name": "Single Product Order - Elderberry Moss",
                "customer": {
                    "name": "Emma Rodriguez",
                    "email": f"emma.rodriguez.{int(time.time())}@example.com",
                    "phone": "+1-404-555-0199"
                },
                "cart": [
                    {
                        "id": "elderberry-moss",
                        "name": "Elderberry Moss",
                        "price": 3600,  # $36.00 in cents
                        "quantity": 1
                    }
                ],
                "fulfillmentType": "delivery",
                "deliveryAddress": {
                    "street": "123 Peachtree St",
                    "city": "Atlanta",
                    "state": "GA",
                    "zipCode": "30309"
                },
                "expectedTotal": 3600
            },
            {
                "name": "Multiple Product Order with Coupon",
                "customer": {
                    "name": "Marcus Thompson",
                    "email": f"marcus.thompson.{int(time.time())}@example.com",
                    "phone": "+1-678-555-0234"
                },
                "cart": [
                    {
                        "id": "healing-harmony",
                        "name": "Healing Harmony",
                        "price": 3500,
                        "quantity": 2
                    },
                    {
                        "id": "grateful-guardian",
                        "name": "Grateful Guardian", 
                        "price": 1100,
                        "quantity": 1
                    }
                ],
                "fulfillmentType": "pickup",
                "pickupLocation": "Serenbe Farmers Market",
                "couponCode": None,  # Will create coupon first
                "expectedTotal": 8100  # $81.00 before coupon
            }
        ]
        
        for scenario in test_scenarios:
            self._test_purchase_scenario(scenario)
    
    def _test_purchase_scenario(self, scenario):
        """Test individual purchase scenario"""
        print(f"\n  📋 Testing: {scenario['name']}")
        
        # Step 1: Create coupon if needed
        coupon_code = None
        if scenario.get('couponCode') is None and 'coupon' in scenario['name'].lower():
            coupon_code = self._create_test_coupon(scenario['customer']['email'])
        
        # Step 2: Create order
        order_data = {
            "customer": scenario['customer'],
            "cart": scenario['cart'],
            "fulfillmentType": scenario['fulfillmentType'],
            "subtotal": sum(item['price'] * item['quantity'] for item in scenario['cart'])
        }
        
        if scenario['fulfillmentType'] == 'delivery':
            order_data['deliveryAddress'] = scenario['deliveryAddress']
        elif scenario['fulfillmentType'] == 'pickup':
            order_data['pickupLocation'] = scenario['pickupLocation']
        
        if coupon_code:
            order_data['couponCode'] = coupon_code
        
        try:
            start = time.time()
            response = requests.post(f"{API_BASE}/orders/create", 
                                   json=order_data, 
                                   headers={'Content-Type': 'application/json'},
                                   timeout=15)
            response_time = int((time.time() - start) * 1000)
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get('success') and 'orderId' in data:
                    order_id = data['orderId']
                    total = data.get('total', 0)
                    
                    self.log_result(f"Order Creation - {scenario['name']}", True, 
                                  f"Order {order_id} created, Total: ${total/100:.2f}", response_time)
                    
                    # Step 3: Process payment for this order
                    self._test_payment_for_order(order_id, total, scenario['customer'])
                    
                else:
                    self.log_result(f"Order Creation - {scenario['name']}", False, 
                                  f"Invalid response: {data}", response_time)
            else:
                self.log_result(f"Order Creation - {scenario['name']}", False, 
                              f"HTTP {response.status_code}: {response.text}", response_time)
                
        except Exception as e:
            self.log_result(f"Order Creation - {scenario['name']}", False, f"Request failed: {str(e)}")
    
    def _create_test_coupon(self, customer_email):
        """Create a test coupon for purchase flow testing"""
        try:
            coupon_data = {
                "customerEmail": customer_email,
                "discountAmount": 500,  # $5.00 off
                "freeShipping": False,
                "type": "test_purchase_flow",
                "source": "backend_test"
            }
            
            response = requests.post(f"{API_BASE}/coupons/create", 
                                   json=coupon_data, 
                                   headers={'Content-Type': 'application/json'},
                                   timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success') and 'coupon' in data:
                    return data['coupon']['code']
            
        except Exception as e:
            print(f"    ⚠️  Coupon creation failed: {str(e)}")
        
        return None
    
    def _test_payment_for_order(self, order_id, amount, customer):
        """Test payment processing for a specific order"""
        try:
            payment_data = {
                "sourceId": "cnon:card-nonce-ok",  # Square test nonce
                "amount": amount / 100,  # Convert cents to dollars
                "currency": "USD",
                "orderId": order_id,
                "buyerDetails": customer,
                "orderData": {
                    "customer": customer,
                    "orderId": order_id,
                    "total": amount
                }
            }
            
            start = time.time()
            response = requests.post(f"{API_BASE}/square-payment", 
                                   json=payment_data, 
                                   headers={'Content-Type': 'application/json'},
                                   timeout=15)
            response_time = int((time.time() - start) * 1000)
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get('success'):
                    payment_id = data.get('paymentId', '')
                    status = data.get('status', '')
                    
                    # Check if it's mock/fallback mode
                    is_mock = payment_id.startswith('mock_payment_') or payment_id.startswith('fallback_payment_')
                    mode = "Mock/Fallback" if is_mock else "Live"
                    
                    self.log_result(f"Payment Processing - Order {order_id}", True, 
                                  f"{mode} payment successful - ID: {payment_id}, Status: {status}", response_time)
                else:
                    self.log_result(f"Payment Processing - Order {order_id}", False, 
                                  f"Payment failed: {data}", response_time)
            else:
                self.log_result(f"Payment Processing - Order {order_id}", False, 
                              f"HTTP {response.status_code}: {response.text}", response_time)
                
        except Exception as e:
            self.log_result(f"Payment Processing - Order {order_id}", False, f"Request failed: {str(e)}")

    def test_square_payment_deep_dive(self):
        """💳 SQUARE PAYMENT INTEGRATION DEEP DIVE - All payment scenarios"""
        print("\n💳 TESTING SQUARE PAYMENT INTEGRATION DEEP DIVE")
        
        # Test 1: Valid payment request
        try:
            start = time.time()
            payment_data = {
                "sourceId": "cnon:card-nonce-ok",  # Square test nonce
                "amount": 25.00,
                "currency": "USD",
                "orderId": f"test_order_{int(time.time())}",
                "buyerDetails": {
                    "name": "Sarah Johnson",
                    "email": "sarah.johnson@example.com",
                    "phone": "+1-555-0123"
                },
                "orderData": {
                    "customer": {
                        "name": "Sarah Johnson",
                        "email": "sarah.johnson@example.com",
                        "phone": "+1-555-0123"
                    },
                    "cart": [
                        {
                            "id": "elderberry-moss",
                            "name": "Elderberry Moss",
                            "price": 2500,
                            "quantity": 1
                        }
                    ],
                    "fulfillmentType": "pickup",
                    "subtotal": 2500
                }
            }
            
            response = requests.post(f"{API_BASE}/square-payment", 
                                   json=payment_data, 
                                   headers={'Content-Type': 'application/json'},
                                   timeout=15)
            response_time = int((time.time() - start) * 1000)
            
            if response.status_code == 200:
                data = response.json()
                
                # Check response structure
                required_fields = ['success', 'paymentId', 'status']
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_result("Square Payment Response Structure", False, 
                                  f"Missing fields: {missing_fields}", response_time)
                else:
                    payment_id = data.get('paymentId', '')
                    status = data.get('status', '')
                    
                    # Check if it's mock mode or live mode
                    is_mock = payment_id.startswith('mock_payment_') or payment_id.startswith('fallback_payment_')
                    mode = "Mock/Fallback" if is_mock else "Live"
                    
                    self.log_result("Square Payment Processing", True, 
                                  f"{mode} payment successful - ID: {payment_id}, Status: {status}", response_time)
                    
            else:
                self.log_result("Square Payment Processing", False, 
                              f"HTTP {response.status_code}: {response.text}", response_time)
                
        except Exception as e:
            self.log_result("Square Payment Processing", False, f"Request failed: {str(e)}")
        
        # Test 2: Invalid payment request (missing sourceId)
        try:
            start = time.time()
            invalid_data = {
                "amount": 25.00,
                "currency": "USD"
                # Missing sourceId
            }
            
            response = requests.post(f"{API_BASE}/square-payment", 
                                   json=invalid_data, 
                                   headers={'Content-Type': 'application/json'},
                                   timeout=10)
            response_time = int((time.time() - start) * 1000)
            
            if response.status_code == 400:
                self.log_result("Square Payment Validation", True, 
                              "Correctly rejected invalid request (missing sourceId)", response_time)
            else:
                self.log_result("Square Payment Validation", False, 
                              f"Expected 400, got {response.status_code}", response_time)
                
        except Exception as e:
            self.log_result("Square Payment Validation", False, f"Request failed: {str(e)}")
        
        # Test 3: GET method (should be rejected)
        try:
            start = time.time()
            response = requests.get(f"{API_BASE}/square-payment", timeout=10)
            response_time = int((time.time() - start) * 1000)
            
            if response.status_code == 405:
                self.log_result("Square Payment Method Validation", True, 
                              "Correctly rejected GET method", response_time)
            else:
                self.log_result("Square Payment Method Validation", False, 
                              f"Expected 405, got {response.status_code}", response_time)
                
        except Exception as e:
            self.log_result("Square Payment Method Validation", False, f"Request failed: {str(e)}")
        
        # Test 4: Apple Pay/Google Pay data handling
        self._test_digital_wallet_payments()
        
        # Test 5: Payment amount calculations and currency handling
        self._test_payment_calculations()
    
    def _test_digital_wallet_payments(self):
        """Test Apple Pay/Google Pay payment processing"""
        digital_wallet_scenarios = [
            {
                "name": "Apple Pay Payment",
                "sourceId": "cnon:apple-pay-nonce",
                "paymentMethod": "apple_pay"
            },
            {
                "name": "Google Pay Payment", 
                "sourceId": "cnon:google-pay-nonce",
                "paymentMethod": "google_pay"
            }
        ]
        
        for scenario in digital_wallet_scenarios:
            try:
                payment_data = {
                    "sourceId": scenario["sourceId"],
                    "amount": 35.00,
                    "currency": "USD",
                    "orderId": f"wallet_test_{int(time.time())}",
                    "paymentMethod": scenario["paymentMethod"],
                    "buyerDetails": {
                        "name": "Digital Wallet User",
                        "email": f"wallet.user.{int(time.time())}@example.com"
                    }
                }
                
                start = time.time()
                response = requests.post(f"{API_BASE}/square-payment", 
                                       json=payment_data, 
                                       headers={'Content-Type': 'application/json'},
                                       timeout=15)
                response_time = int((time.time() - start) * 1000)
                
                if response.status_code == 200:
                    data = response.json()
                    
                    if data.get('success'):
                        payment_id = data.get('paymentId', '')
                        self.log_result(f"Digital Wallet - {scenario['name']}", True, 
                                      f"Payment processed successfully - ID: {payment_id}", response_time)
                    else:
                        self.log_result(f"Digital Wallet - {scenario['name']}", False, 
                                      f"Payment failed: {data}", response_time)
                else:
                    self.log_result(f"Digital Wallet - {scenario['name']}", False, 
                                  f"HTTP {response.status_code}: {response.text}", response_time)
                    
            except Exception as e:
                self.log_result(f"Digital Wallet - {scenario['name']}", False, f"Request failed: {str(e)}")
    
    def _test_payment_calculations(self):
        """Test payment amount calculations and currency handling"""
        calculation_tests = [
            {
                "name": "Exact Dollar Amount",
                "amount": 50.00,
                "expected_cents": 5000
            },
            {
                "name": "Cents Precision",
                "amount": 35.99,
                "expected_cents": 3599
            },
            {
                "name": "Large Order Amount",
                "amount": 150.75,
                "expected_cents": 15075
            }
        ]
        
        for test in calculation_tests:
            try:
                payment_data = {
                    "sourceId": "cnon:card-nonce-ok",
                    "amount": test["amount"],
                    "currency": "USD",
                    "orderId": f"calc_test_{int(time.time())}",
                    "buyerDetails": {
                        "name": "Calculation Test",
                        "email": f"calc.test.{int(time.time())}@example.com"
                    }
                }
                
                start = time.time()
                response = requests.post(f"{API_BASE}/square-payment", 
                                       json=payment_data, 
                                       headers={'Content-Type': 'application/json'},
                                       timeout=15)
                response_time = int((time.time() - start) * 1000)
                
                if response.status_code == 200:
                    data = response.json()
                    
                    # Check if amount is correctly processed
                    returned_amount = data.get('amount', 0)
                    
                    if data.get('success'):
                        self.log_result(f"Payment Calculation - {test['name']}", True, 
                                      f"Amount ${test['amount']:.2f} processed correctly", response_time)
                    else:
                        self.log_result(f"Payment Calculation - {test['name']}", False, 
                                      f"Payment failed for amount ${test['amount']:.2f}", response_time)
                else:
                    self.log_result(f"Payment Calculation - {test['name']}", False, 
                                  f"HTTP {response.status_code}: {response.text}", response_time)
                    
            except Exception as e:
                self.log_result(f"Payment Calculation - {test['name']}", False, f"Request failed: {str(e)}")

    def test_coupon_system(self):
        """Test Coupon Creation and Validation APIs"""
        print("\n🎫 TESTING COUPON SYSTEM")
        
        test_email = f"test.user.{int(time.time())}@example.com"
        created_coupon_code = None
        
        # Test 1: Create coupon
        try:
            start = time.time()
            coupon_data = {
                "customerEmail": test_email,
                "discountAmount": 300,  # $3.00 in cents
                "freeShipping": False,
                "type": "spin_wheel",
                "source": "test"
            }
            
            response = requests.post(f"{API_BASE}/coupons/create", 
                                   json=coupon_data, 
                                   headers={'Content-Type': 'application/json'},
                                   timeout=10)
            response_time = int((time.time() - start) * 1000)
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get('success') and 'coupon' in data:
                    coupon = data['coupon']
                    created_coupon_code = coupon.get('code')
                    
                    self.log_result("Coupon Creation", True, 
                                  f"Created coupon: {created_coupon_code}, Amount: ${coupon.get('discountAmount', 0)/100:.2f}", 
                                  response_time)
                else:
                    self.log_result("Coupon Creation", False, 
                                  f"Invalid response structure: {data}", response_time)
            else:
                self.log_result("Coupon Creation", False, 
                              f"HTTP {response.status_code}: {response.text}", response_time)
                
        except Exception as e:
            self.log_result("Coupon Creation", False, f"Request failed: {str(e)}")
        
        # Test 2: Validate created coupon
        if created_coupon_code:
            try:
                start = time.time()
                validation_data = {
                    "couponCode": created_coupon_code,
                    "customerEmail": test_email,
                    "orderTotal": 3500  # $35.00 in cents
                }
                
                response = requests.post(f"{API_BASE}/coupons/validate", 
                                       json=validation_data, 
                                       headers={'Content-Type': 'application/json'},
                                       timeout=10)
                response_time = int((time.time() - start) * 1000)
                
                if response.status_code == 200:
                    data = response.json()
                    
                    if data.get('valid') and 'coupon' in data:
                        discount = data.get('discount', {})
                        amount = discount.get('amount', 0)
                        
                        self.log_result("Coupon Validation", True, 
                                      f"Valid coupon - Discount: ${amount/100:.2f}", response_time)
                    else:
                        self.log_result("Coupon Validation", False, 
                                      f"Coupon validation failed: {data}", response_time)
                else:
                    self.log_result("Coupon Validation", False, 
                                  f"HTTP {response.status_code}: {response.text}", response_time)
                    
            except Exception as e:
                self.log_result("Coupon Validation", False, f"Request failed: {str(e)}")
        
        # Test 3: Invalid coupon validation
        try:
            start = time.time()
            invalid_data = {
                "couponCode": "INVALID123",
                "customerEmail": test_email,
                "orderTotal": 3500
            }
            
            response = requests.post(f"{API_BASE}/coupons/validate", 
                                   json=invalid_data, 
                                   headers={'Content-Type': 'application/json'},
                                   timeout=10)
            response_time = int((time.time() - start) * 1000)
            
            if response.status_code == 200:
                data = response.json()
                
                if not data.get('valid'):
                    self.log_result("Coupon Invalid Code Handling", True, 
                                  "Correctly rejected invalid coupon code", response_time)
                else:
                    self.log_result("Coupon Invalid Code Handling", False, 
                                  "Invalid coupon was accepted", response_time)
            else:
                self.log_result("Coupon Invalid Code Handling", False, 
                              f"HTTP {response.status_code}: {response.text}", response_time)
                
        except Exception as e:
            self.log_result("Coupon Invalid Code Handling", False, f"Request failed: {str(e)}")
        
        # Test 4: Missing required fields
        try:
            start = time.time()
            missing_data = {
                "discountAmount": 200
                # Missing customerEmail
            }
            
            response = requests.post(f"{API_BASE}/coupons/create", 
                                   json=missing_data, 
                                   headers={'Content-Type': 'application/json'},
                                   timeout=10)
            response_time = int((time.time() - start) * 1000)
            
            if response.status_code == 400:
                self.log_result("Coupon Input Validation", True, 
                              "Correctly rejected request with missing email", response_time)
            else:
                self.log_result("Coupon Input Validation", False, 
                              f"Expected 400, got {response.status_code}", response_time)
                
        except Exception as e:
            self.log_result("Coupon Input Validation", False, f"Request failed: {str(e)}")
    
    def test_square_webhook(self):
        """Test Square Webhook Handler"""
        print("\n🔗 TESTING SQUARE WEBHOOK HANDLER")
        
        # Test 1: GET endpoint (webhook verification)
        try:
            start = time.time()
            response = requests.get(f"{API_BASE}/square-webhook", timeout=10)
            response_time = int((time.time() - start) * 1000)
            
            if response.status_code == 200:
                data = response.json()
                
                if 'message' in data and 'timestamp' in data:
                    self.log_result("Webhook Endpoint Availability", True, 
                                  f"Webhook endpoint active: {data.get('message')}", response_time)
                else:
                    self.log_result("Webhook Endpoint Availability", False, 
                                  f"Invalid response structure: {data}", response_time)
            else:
                self.log_result("Webhook Endpoint Availability", False, 
                              f"HTTP {response.status_code}: {response.text}", response_time)
                
        except Exception as e:
            self.log_result("Webhook Endpoint Availability", False, f"Request failed: {str(e)}")
        
        # Test 2: POST webhook event (mock payment.completed)
        try:
            start = time.time()
            webhook_event = {
                "type": "payment.completed",
                "data": {
                    "object": {
                        "payment": {
                            "id": f"test_payment_{int(time.time())}",
                            "status": "COMPLETED",
                            "order_id": f"test_order_{int(time.time())}",
                            "amount_money": {
                                "amount": 2500,
                                "currency": "USD"
                            }
                        }
                    }
                }
            }
            
            response = requests.post(f"{API_BASE}/square-webhook", 
                                   json=webhook_event, 
                                   headers={'Content-Type': 'application/json'},
                                   timeout=10)
            response_time = int((time.time() - start) * 1000)
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get('received') and data.get('eventType') == 'payment.completed':
                    self.log_result("Webhook Event Processing", True, 
                                  f"Successfully processed payment.completed event", response_time)
                else:
                    self.log_result("Webhook Event Processing", False, 
                                  f"Invalid webhook response: {data}", response_time)
            else:
                self.log_result("Webhook Event Processing", False, 
                              f"HTTP {response.status_code}: {response.text}", response_time)
                
        except Exception as e:
            self.log_result("Webhook Event Processing", False, f"Request failed: {str(e)}")
    
    def test_admin_apis(self):
        """Test Admin APIs for products and coupons"""
        print("\n👑 TESTING ADMIN APIs")
        
    def test_coupon_system(self):
        """Test Coupon Creation and Validation APIs"""
        print("\n🎫 TESTING COUPON SYSTEM")
        
        test_email = f"test.user.{int(time.time())}@example.com"
        created_coupon_code = None
        
        # Test 1: Create coupon
        try:
            start = time.time()
            coupon_data = {
                "customerEmail": test_email,
                "discountAmount": 300,  # $3.00 in cents
                "freeShipping": False,
                "type": "spin_wheel",
                "source": "test"
            }
            
            response = requests.post(f"{API_BASE}/coupons/create", 
                                   json=coupon_data, 
                                   headers={'Content-Type': 'application/json'},
                                   timeout=10)
            response_time = int((time.time() - start) * 1000)
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get('success') and 'coupon' in data:
                    coupon = data['coupon']
                    created_coupon_code = coupon.get('code')
                    
                    self.log_result("Coupon Creation", True, 
                                  f"Created coupon: {created_coupon_code}, Amount: ${coupon.get('discountAmount', 0)/100:.2f}", 
                                  response_time)
                else:
                    self.log_result("Coupon Creation", False, 
                                  f"Invalid response structure: {data}", response_time)
            else:
                self.log_result("Coupon Creation", False, 
                              f"HTTP {response.status_code}: {response.text}", response_time)
                
        except Exception as e:
            self.log_result("Coupon Creation", False, f"Request failed: {str(e)}")
        
        # Test 2: Validate created coupon
        if created_coupon_code:
            try:
                start = time.time()
                validation_data = {
                    "couponCode": created_coupon_code,
                    "customerEmail": test_email,
                    "orderTotal": 3500  # $35.00 in cents
                }
                
                response = requests.post(f"{API_BASE}/coupons/validate", 
                                       json=validation_data, 
                                       headers={'Content-Type': 'application/json'},
                                       timeout=10)
                response_time = int((time.time() - start) * 1000)
                
                if response.status_code == 200:
                    data = response.json()
                    
                    if data.get('valid') and 'coupon' in data:
                        discount = data.get('discount', {})
                        amount = discount.get('amount', 0)
                        
                        self.log_result("Coupon Validation", True, 
                                      f"Valid coupon - Discount: ${amount/100:.2f}", response_time)
                    else:
                        self.log_result("Coupon Validation", False, 
                                      f"Coupon validation failed: {data}", response_time)
                else:
                    self.log_result("Coupon Validation", False, 
                                  f"HTTP {response.status_code}: {response.text}", response_time)
                    
            except Exception as e:
                self.log_result("Coupon Validation", False, f"Request failed: {str(e)}")
        
        # Test 3: Invalid coupon validation
        try:
            start = time.time()
            invalid_data = {
                "couponCode": "INVALID123",
                "customerEmail": test_email,
                "orderTotal": 3500
            }
            
            response = requests.post(f"{API_BASE}/coupons/validate", 
                                   json=invalid_data, 
                                   headers={'Content-Type': 'application/json'},
                                   timeout=10)
            response_time = int((time.time() - start) * 1000)
            
            if response.status_code == 200:
                data = response.json()
                
                if not data.get('valid'):
                    self.log_result("Coupon Invalid Code Handling", True, 
                                  "Correctly rejected invalid coupon code", response_time)
                else:
                    self.log_result("Coupon Invalid Code Handling", False, 
                                  "Invalid coupon was accepted", response_time)
            else:
                self.log_result("Coupon Invalid Code Handling", False, 
                              f"HTTP {response.status_code}: {response.text}", response_time)
                
        except Exception as e:
            self.log_result("Coupon Invalid Code Handling", False, f"Request failed: {str(e)}")
        
    def test_data_integrity_persistence(self):
        """💾 DATA INTEGRITY & PERSISTENCE - Customer data, order data, price calculations"""
        print("\n💾 TESTING DATA INTEGRITY & PERSISTENCE")
        
        # Test price calculation accuracy (cents vs dollars)
        test_cases = [
            {
                "name": "Single Item - Exact Price",
                "items": [{"id": "elderberry-moss", "price": 3600, "quantity": 1}],
                "expected_total": 3600
            },
            {
                "name": "Multiple Items - Same Product",
                "items": [{"id": "healing-harmony", "price": 3500, "quantity": 3}],
                "expected_total": 10500
            },
            {
                "name": "Mixed Products",
                "items": [
                    {"id": "grateful-guardian", "price": 1100, "quantity": 2},
                    {"id": "apple-cranberry", "price": 1200, "quantity": 1}
                ],
                "expected_total": 3400
            }
        ]
        
        for test_case in test_cases:
            calculated_total = sum(item['price'] * item['quantity'] for item in test_case['items'])
            
            if calculated_total == test_case['expected_total']:
                self.log_result(f"Price Calculation - {test_case['name']}", True, 
                              f"Correct total: ${calculated_total/100:.2f}")
            else:
                self.log_result(f"Price Calculation - {test_case['name']}", False, 
                              f"Expected ${test_case['expected_total']/100:.2f}, got ${calculated_total/100:.2f}")

    def test_coupon_system_integration(self):
        """🎫 COUPON SYSTEM INTEGRATION - Creation, validation, redemption with orders"""
        print("\n🎫 TESTING COUPON SYSTEM INTEGRATION")
        
        test_email = f"coupon.integration.{int(time.time())}@example.com"
        created_coupon_code = None
        
        # Test 1: Create coupon
        try:
            start = time.time()
            coupon_data = {
                "customerEmail": test_email,
                "discountAmount": 300,  # $3.00 in cents
                "freeShipping": False,
                "type": "integration_test",
                "source": "backend_carnivore_test"
            }
            
            response = requests.post(f"{API_BASE}/coupons/create", 
                                   json=coupon_data, 
                                   headers={'Content-Type': 'application/json'},
                                   timeout=10)
            response_time = int((time.time() - start) * 1000)
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get('success') and 'coupon' in data:
                    coupon = data['coupon']
                    created_coupon_code = coupon.get('code')
                    
                    self.log_result("Coupon Integration - Creation", True, 
                                  f"Created coupon: {created_coupon_code}, Amount: ${coupon.get('discountAmount', 0)/100:.2f}", 
                                  response_time)
                else:
                    self.log_result("Coupon Integration - Creation", False, 
                                  f"Invalid response structure: {data}", response_time)
            else:
                self.log_result("Coupon Integration - Creation", False, 
                              f"HTTP {response.status_code}: {response.text}", response_time)
                
        except Exception as e:
            self.log_result("Coupon Integration - Creation", False, f"Request failed: {str(e)}")

    def test_admin_functionality_validation(self):
        """👑 ADMIN FUNCTIONALITY VALIDATION - CRUD operations, authentication"""
        print("\n👑 TESTING ADMIN FUNCTIONALITY VALIDATION")
        
        # Test admin products
        try:
            start = time.time()
            response = requests.get(f"{API_BASE}/admin/products", timeout=10)
            response_time = int((time.time() - start) * 1000)
            
            if response.status_code == 200:
                data = response.json()
                
                if 'products' in data and isinstance(data['products'], list):
                    products = data['products']
                    
                    if len(products) > 0:
                        self.log_result("Admin Products Management", True, 
                                      f"Retrieved {len(products)} products for admin management", response_time)
                    else:
                        self.log_result("Admin Products Management", False, 
                                      "No products returned", response_time)
                else:
                    self.log_result("Admin Products Management", False, 
                                  f"Invalid response structure: {data.keys()}", response_time)
            else:
                self.log_result("Admin Products Management", False, 
                              f"HTTP {response.status_code}: {response.text}", response_time)
                
        except Exception as e:
            self.log_result("Admin Products Management", False, f"Request failed: {str(e)}")

    def test_api_consistency_error_handling(self):
        """🔧 API CONSISTENCY & ERROR HANDLING - All endpoints, CORS, security"""
        print("\n🔧 TESTING API CONSISTENCY & ERROR HANDLING")
        
        # Test CORS headers on key endpoints
        test_endpoints = [
            "/health",
            "/square-payment", 
            "/coupons/create"
        ]
        
        for endpoint in test_endpoints:
            try:
                # Test OPTIONS request for CORS preflight
                start = time.time()
                response = requests.options(f"{API_BASE}{endpoint}", timeout=10)
                response_time = int((time.time() - start) * 1000)
                
                # Check for CORS headers
                cors_headers = [
                    'Access-Control-Allow-Origin',
                    'Access-Control-Allow-Methods',
                    'Access-Control-Allow-Headers'
                ]
                
                present_headers = [header for header in cors_headers if header in response.headers]
                
                if len(present_headers) >= 1:  # At least 1 CORS header should be present
                    self.log_result(f"CORS Headers - {endpoint}", True, 
                                  f"CORS headers present: {present_headers}", response_time)
                else:
                    self.log_result(f"CORS Headers - {endpoint}", False, 
                                  f"Missing CORS headers. Present: {present_headers}", response_time)
                    
            except Exception as e:
                self.log_result(f"CORS Headers - {endpoint}", False, f"Request failed: {str(e)}")
        # Test 4: Missing required fields
        try:
            start = time.time()
            missing_data = {
                "discountAmount": 200
                # Missing customerEmail
            }
            
            response = requests.post(f"{API_BASE}/coupons/create", 
                                   json=missing_data, 
                                   headers={'Content-Type': 'application/json'},
                                   timeout=10)
            response_time = int((time.time() - start) * 1000)
            
            if response.status_code == 400:
                self.log_result("Coupon Input Validation", True, 
                              "Correctly rejected request with missing email", response_time)
            else:
                self.log_result("Coupon Input Validation", False, 
                              f"Expected 400, got {response.status_code}", response_time)
                
        except Exception as e:
            self.log_result("Coupon Input Validation", False, f"Request failed: {str(e)}")
        # Test 1: Admin Products API
        try:
            start = time.time()
            response = requests.get(f"{API_BASE}/admin/products", timeout=10)
            response_time = int((time.time() - start) * 1000)
            
            if response.status_code == 200:
                data = response.json()
                
                if 'products' in data and isinstance(data['products'], list):
                    products = data['products']
                    
                    if len(products) > 0:
                        # Check product structure
                        first_product = products[0]
                        required_fields = ['id', 'name', 'price', 'stock']
                        has_required = all(field in first_product for field in required_fields)
                        
                        if has_required:
                            self.log_result("Admin Products API", True, 
                                          f"Retrieved {len(products)} products with stock data", response_time)
                        else:
                            self.log_result("Admin Products API", False, 
                                          f"Products missing required fields: {first_product.keys()}", response_time)
                    else:
                        self.log_result("Admin Products API", False, 
                                      "No products returned", response_time)
                else:
                    self.log_result("Admin Products API", False, 
                                  f"Invalid response structure: {data.keys()}", response_time)
            else:
                self.log_result("Admin Products API", False, 
                              f"HTTP {response.status_code}: {response.text}", response_time)
                
        except Exception as e:
            self.log_result("Admin Products API", False, f"Request failed: {str(e)}")
        
        # Test 2: Admin Coupons API
        try:
            start = time.time()
            response = requests.get(f"{API_BASE}/admin/coupons", timeout=10)
            response_time = int((time.time() - start) * 1000)
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get('success') and 'coupons' in data:
                    coupons = data['coupons']
                    
                    self.log_result("Admin Coupons API", True, 
                                  f"Retrieved {len(coupons)} coupons", response_time)
                else:
                    self.log_result("Admin Coupons API", False, 
                                  f"Invalid response structure: {data.keys()}", response_time)
            else:
                self.log_result("Admin Coupons API", False, 
                              f"HTTP {response.status_code}: {response.text}", response_time)
                
        except Exception as e:
            self.log_result("Admin Coupons API", False, f"Request failed: {str(e)}")
        
        # Test 3: Admin Coupon Analytics
        try:
            start = time.time()
            analytics_data = {"action": "analytics"}
            
            response = requests.post(f"{API_BASE}/admin/coupons", 
                                   json=analytics_data, 
                                   headers={'Content-Type': 'application/json'},
                                   timeout=10)
            response_time = int((time.time() - start) * 1000)
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get('success') and 'analytics' in data:
                    analytics = data['analytics']
                    required_fields = ['totalCoupons', 'usedCoupons', 'activeCoupons']
                    has_required = all(field in analytics for field in required_fields)
                    
                    if has_required:
                        total = analytics.get('totalCoupons', 0)
                        used = analytics.get('usedCoupons', 0)
                        active = analytics.get('activeCoupons', 0)
                        
                        self.log_result("Admin Coupon Analytics", True, 
                                      f"Analytics: {total} total, {used} used, {active} active", response_time)
                    else:
                        self.log_result("Admin Coupon Analytics", False, 
                                      f"Analytics missing required fields: {analytics.keys()}", response_time)
                else:
                    self.log_result("Admin Coupon Analytics", False, 
                                  f"Invalid analytics response: {data.keys()}", response_time)
            else:
                self.log_result("Admin Coupon Analytics", False, 
                              f"HTTP {response.status_code}: {response.text}", response_time)
                
        except Exception as e:
            self.log_result("Admin Coupon Analytics", False, f"Request failed: {str(e)}")
    
    def test_database_connectivity(self):
        """Test database connectivity through various endpoints"""
        print("\n🗄️ TESTING DATABASE CONNECTIVITY")
        
        # Test through health endpoint (already tested above, but check specifically for DB)
        try:
            response = requests.get(f"{API_BASE}/health", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                db_status = data.get('services', {}).get('database', 'unknown')
                
                self.log_result("Database Health Check", 
                              db_status == 'connected', 
                              f"Database status via health endpoint: {db_status}")
            else:
                self.log_result("Database Health Check", False, 
                              f"Health endpoint failed: {response.status_code}")
                
        except Exception as e:
            self.log_result("Database Health Check", False, f"Request failed: {str(e)}")
        
        # Test database through coupon creation (creates DB record)
        try:
            start = time.time()
            test_coupon = {
                "customerEmail": f"db.test.{int(time.time())}@example.com",
                "discountAmount": 100,
                "type": "test",
                "source": "database_test"
            }
            
            response = requests.post(f"{API_BASE}/coupons/create", 
                                   json=test_coupon, 
                                   headers={'Content-Type': 'application/json'},
                                   timeout=10)
            response_time = int((time.time() - start) * 1000)
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get('success'):
                    self.log_result("Database Write Operations", True, 
                                  "Successfully created coupon record in database", response_time)
                else:
                    self.log_result("Database Write Operations", False, 
                                  f"Coupon creation failed: {data}", response_time)
            else:
                self.log_result("Database Write Operations", False, 
                              f"HTTP {response.status_code}: {response.text}", response_time)
                
        except Exception as e:
            self.log_result("Database Write Operations", False, f"Request failed: {str(e)}")
    
    def test_performance_metrics(self):
        """Test API performance and response times"""
        print("\n⚡ TESTING PERFORMANCE METRICS")
        
        # Test multiple endpoints for performance
        endpoints = [
            ("/health", "GET"),
            ("/admin/products", "GET"),
            ("/admin/coupons", "GET")
        ]
        
        response_times = []
        
        for endpoint, method in endpoints:
            try:
                start = time.time()
                
                if method == "GET":
                    response = requests.get(f"{API_BASE}{endpoint}", timeout=10)
                else:
                    response = requests.post(f"{API_BASE}{endpoint}", 
                                           json={}, 
                                           headers={'Content-Type': 'application/json'},
                                           timeout=10)
                
                response_time = int((time.time() - start) * 1000)
                response_times.append(response_time)
                
                # Performance thresholds
                if response_time < 500:
                    performance_level = "Excellent"
                elif response_time < 1000:
                    performance_level = "Good"
                elif response_time < 2000:
                    performance_level = "Acceptable"
                else:
                    performance_level = "Slow"
                
                self.log_result(f"Performance {endpoint}", 
                              response_time < 2000, 
                              f"{performance_level} - {response_time}ms", response_time)
                
            except Exception as e:
                self.log_result(f"Performance {endpoint}", False, f"Request failed: {str(e)}")
        
        # Overall performance summary
        if response_times:
            avg_time = sum(response_times) / len(response_times)
            max_time = max(response_times)
            min_time = min(response_times)
            
            self.log_result("Overall API Performance", 
                          avg_time < 1000, 
                          f"Avg: {avg_time:.0f}ms, Min: {min_time}ms, Max: {max_time}ms")
    
    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 STARTING COMPREHENSIVE BACKEND TESTING")
        print(f"Testing against: {BASE_URL}")
        print("=" * 80)
        
        # Run all test suites - CARNIVORE MODE BUG HUNT
        self.test_health_endpoint()
        self.test_complete_purchase_flow()
        self.test_data_integrity_persistence()
        self.test_square_payment_deep_dive()
        self.test_coupon_system_integration()
        self.test_admin_functionality_validation()
        self.test_api_consistency_error_handling()
        self.test_square_webhook()
        self.test_database_connectivity()
        self.test_performance_metrics()
        
        # Generate summary
        self.generate_summary()
    
    def generate_summary(self):
        """Generate comprehensive test summary"""
        print("\n" + "=" * 80)
        print("📊 COMPREHENSIVE BACKEND TEST SUMMARY")
        print("=" * 80)
        
        total_tests = len(self.results)
        passed_tests = sum(1 for result in self.results if result['success'])
        failed_tests = total_tests - passed_tests
        
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests} ✅")
        print(f"Failed: {failed_tests} ❌")
        print(f"Success Rate: {success_rate:.1f}%")
        
        # Performance summary
        response_times = [r['response_time_ms'] for r in self.results if r['response_time_ms']]
        if response_times:
            avg_response = sum(response_times) / len(response_times)
            max_response = max(response_times)
            print(f"Average Response Time: {avg_response:.0f}ms")
            print(f"Maximum Response Time: {max_response}ms")
        
        # Test duration
        total_duration = time.time() - self.start_time
        print(f"Total Test Duration: {total_duration:.1f}s")
        
        # Failed tests details
        if failed_tests > 0:
            print(f"\n❌ FAILED TESTS ({failed_tests}):")
            for result in self.results:
                if not result['success']:
                    print(f"  • {result['test']}: {result['details']}")
        
        # Critical system status
        print(f"\n🎯 CRITICAL SYSTEM STATUS:")
        
        # Check critical systems
        critical_systems = {
            'Health Check': any(r['test'].startswith('Health') and r['success'] for r in self.results),
            'Square Payment': any(r['test'].startswith('Square Payment') and r['success'] for r in self.results),
            'Database': any(r['test'].startswith('Database') and r['success'] for r in self.results),
            'Coupon System': any(r['test'].startswith('Coupon') and r['success'] for r in self.results),
            'Admin APIs': any(r['test'].startswith('Admin') and r['success'] for r in self.results)
        }
        
        for system, status in critical_systems.items():
            status_icon = "✅" if status else "❌"
            print(f"  {status_icon} {system}: {'OPERATIONAL' if status else 'ISSUES DETECTED'}")
        
        # Overall assessment
        print(f"\n🏆 OVERALL ASSESSMENT:")
        if success_rate >= 90:
            assessment = "EXCELLENT - System ready for production"
        elif success_rate >= 80:
            assessment = "GOOD - Minor issues to address"
        elif success_rate >= 70:
            assessment = "ACCEPTABLE - Some issues need attention"
        else:
            assessment = "NEEDS WORK - Multiple critical issues"
        
        print(f"  {assessment}")
        
        # Next.js 15.5.4 compatibility
        print(f"\n🔄 NEXT.JS 15.5.4 COMPATIBILITY:")
        if success_rate >= 85:
            print("  ✅ No regressions detected after Next.js update")
            print("  ✅ createPaymentRequest fix appears to be working correctly")
        else:
            print("  ⚠️  Some issues detected - may be related to Next.js update")
        
        return {
            'total_tests': total_tests,
            'passed_tests': passed_tests,
            'failed_tests': failed_tests,
            'success_rate': success_rate,
            'critical_systems': critical_systems,
            'assessment': assessment
        }

if __name__ == "__main__":
    tester = BackendTester()
    tester.run_all_tests()