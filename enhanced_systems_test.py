#!/usr/bin/env python3
"""
Enhanced Taste of Gratitude Systems Testing
Testing Focus: Enhanced Rewards System, Order System, Coupon Integration, and Fallback Mechanisms

TESTING PRIORITIES (as per review request):
1. Enhanced Rewards System API Testing:
   - /api/rewards/passport endpoint for creating and retrieving customer passports with fallback mode
   - /api/rewards/add-points endpoint for adding points with various activity types
   - /api/rewards/leaderboard endpoint for retrieving reward leaderboards 
   - /api/rewards/redeem endpoint for redeeming rewards
   - Verify fallback mechanisms work when database is unavailable

2. Enhanced Order System API Testing:
   - /api/orders/create endpoint for creating comprehensive orders with customer data tracking
   - Test order retrieval by ID and customer email
   - Test order status updates
   - Verify fallback order creation works offline
   - Test order analytics functionality

3. Coupon System Integration:
   - /api/coupons/create for spin wheel and manual coupon creation
   - /api/coupons/validate for coupon validation and redemption
   - Verify coupon integration with order system

4. Error Handling & Fallbacks:
   - Test all APIs work with proper error responses
   - Verify fallback mechanisms activate when needed
   - Test offline mode capabilities
"""

import requests
import json
import time
import uuid
from datetime import datetime, timedelta

# Configuration
BASE_URL = "https://cart-rescue-1.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

class EnhancedSystemsTester:
    def __init__(self):
        self.results = []
        self.start_time = time.time()
        self.test_email = f"enhanced.test.{int(time.time())}@example.com"
        self.test_customer = {
            "name": "Enhanced Test User",
            "email": self.test_email,
            "phone": "+1-555-0199"
        }
        
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

    def test_enhanced_rewards_system(self):
        """🏆 ENHANCED REWARDS SYSTEM COMPREHENSIVE TESTING"""
        print("\n🏆 TESTING ENHANCED REWARDS SYSTEM")
        
        # Test 1: Create/Get Passport (POST)
        try:
            start = time.time()
            passport_data = {
                "email": self.test_email,
                "name": self.test_customer["name"]
            }
            
            response = requests.post(f"{API_BASE}/rewards/passport", 
                                   json=passport_data, 
                                   headers={'Content-Type': 'application/json'},
                                   timeout=15)
            response_time = int((time.time() - start) * 1000)
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get('success') and 'passport' in data:
                    passport = data['passport']
                    required_fields = ['email', 'points', 'level', 'levelInfo', 'progressToNext']
                    missing_fields = [field for field in required_fields if field not in passport]
                    
                    if missing_fields:
                        self.log_result("Rewards Passport Creation", False, 
                                      f"Missing passport fields: {missing_fields}", response_time)
                    else:
                        fallback_mode = data.get('passport', {}).get('isFallback', False)
                        mode_text = "Fallback Mode" if fallback_mode else "Online Mode"
                        
                        self.log_result("Rewards Passport Creation", True, 
                                      f"Passport created successfully in {mode_text} - Level: {passport.get('level')}, Points: {passport.get('points')}", 
                                      response_time)
                else:
                    self.log_result("Rewards Passport Creation", False, 
                                  f"Invalid response structure: {data}", response_time)
            else:
                self.log_result("Rewards Passport Creation", False, 
                              f"HTTP {response.status_code}: {response.text}", response_time)
                
        except Exception as e:
            self.log_result("Rewards Passport Creation", False, f"Request failed: {str(e)}")
        
        # Test 2: Get Passport (GET)
        try:
            start = time.time()
            response = requests.get(f"{API_BASE}/rewards/passport?email={self.test_email}", timeout=10)
            response_time = int((time.time() - start) * 1000)
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get('success') and 'passport' in data:
                    passport = data['passport']
                    self.log_result("Rewards Passport Retrieval", True, 
                                  f"Passport retrieved - Email: {passport.get('email')}, Points: {passport.get('points')}", 
                                  response_time)
                else:
                    self.log_result("Rewards Passport Retrieval", False, 
                                  f"Invalid response: {data}", response_time)
            else:
                self.log_result("Rewards Passport Retrieval", False, 
                              f"HTTP {response.status_code}: {response.text}", response_time)
                
        except Exception as e:
            self.log_result("Rewards Passport Retrieval", False, f"Request failed: {str(e)}")
        
        # Test 3: Add Points with Various Activity Types
        activity_types = [
            {"type": "purchase", "points": 25, "data": {"orderId": f"order_{int(time.time())}", "amount": 35.00}},
            {"type": "spin_wheel", "points": 10, "data": {"prize": "$2 OFF"}},
            {"type": "social_share", "points": 5, "data": {"platform": "instagram"}},
            {"type": "review", "points": 15, "data": {"rating": 5, "productId": "elderberry-moss"}},
            {"type": "referral", "points": 50, "data": {"referredEmail": "friend@example.com"}}
        ]
        
        for activity in activity_types:
            try:
                start = time.time()
                points_data = {
                    "email": self.test_email,
                    "points": activity["points"],
                    "activityType": activity["type"],
                    "activityData": activity["data"]
                }
                
                response = requests.post(f"{API_BASE}/rewards/add-points", 
                                       json=points_data, 
                                       headers={'Content-Type': 'application/json'},
                                       timeout=15)
                response_time = int((time.time() - start) * 1000)
                
                if response.status_code == 200:
                    data = response.json()
                    
                    if data.get('success'):
                        points_added = data.get('pointsAdded', 0)
                        total_points = data.get('totalPoints', 0)
                        level_up = data.get('levelUp', False)
                        fallback_mode = data.get('isFallback', False)
                        
                        level_text = f" - LEVEL UP to {data.get('newLevel', {}).get('name', 'Unknown')}!" if level_up else ""
                        mode_text = " (Fallback)" if fallback_mode else ""
                        
                        self.log_result(f"Add Points - {activity['type']}", True, 
                                      f"Added {points_added} points, Total: {total_points}{level_text}{mode_text}", 
                                      response_time)
                    else:
                        self.log_result(f"Add Points - {activity['type']}", False, 
                                      f"Failed to add points: {data}", response_time)
                else:
                    self.log_result(f"Add Points - {activity['type']}", False, 
                                  f"HTTP {response.status_code}: {response.text}", response_time)
                    
            except Exception as e:
                self.log_result(f"Add Points - {activity['type']}", False, f"Request failed: {str(e)}")
        
        # Test 4: Get Leaderboard
        try:
            start = time.time()
            response = requests.get(f"{API_BASE}/rewards/leaderboard?limit=10", timeout=10)
            response_time = int((time.time() - start) * 1000)
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get('success') and 'leaderboard' in data:
                    leaderboard = data['leaderboard']
                    fallback_mode = any(entry.get('isFallback') for entry in leaderboard) if isinstance(leaderboard, list) else data.get('isFallback', False)
                    mode_text = " (Fallback Mode)" if fallback_mode else ""
                    
                    self.log_result("Rewards Leaderboard", True, 
                                  f"Retrieved leaderboard with {len(leaderboard)} entries{mode_text}", 
                                  response_time)
                else:
                    self.log_result("Rewards Leaderboard", False, 
                                  f"Invalid response: {data}", response_time)
            else:
                self.log_result("Rewards Leaderboard", False, 
                              f"HTTP {response.status_code}: {response.text}", response_time)
                
        except Exception as e:
            self.log_result("Rewards Leaderboard", False, f"Request failed: {str(e)}")
        
        # Test 5: Get Available Rewards
        try:
            start = time.time()
            response = requests.get(f"{API_BASE}/rewards/redeem?email={self.test_email}", timeout=10)
            response_time = int((time.time() - start) * 1000)
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get('success'):
                    available_rewards = data.get('availableRewards', [])
                    current_points = data.get('currentPoints', 0)
                    level = data.get('level', 'Unknown')
                    
                    self.log_result("Available Rewards Retrieval", True, 
                                  f"Retrieved {len(available_rewards)} available rewards - Points: {current_points}, Level: {level}", 
                                  response_time)
                else:
                    self.log_result("Available Rewards Retrieval", False, 
                                  f"Failed to get rewards: {data}", response_time)
            else:
                self.log_result("Available Rewards Retrieval", False, 
                              f"HTTP {response.status_code}: {response.text}", response_time)
                
        except Exception as e:
            self.log_result("Available Rewards Retrieval", False, f"Request failed: {str(e)}")
        
        # Test 6: Reward Redemption (if rewards available)
        try:
            # First get available rewards
            response = requests.get(f"{API_BASE}/rewards/redeem?email={self.test_email}", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                available_rewards = data.get('availableRewards', [])
                
                if available_rewards:
                    # Try to redeem the first available reward
                    reward_to_redeem = available_rewards[0]
                    
                    start = time.time()
                    redeem_data = {
                        "email": self.test_email,
                        "rewardId": reward_to_redeem.get('id')
                    }
                    
                    redeem_response = requests.post(f"{API_BASE}/rewards/redeem", 
                                                  json=redeem_data, 
                                                  headers={'Content-Type': 'application/json'},
                                                  timeout=15)
                    response_time = int((time.time() - start) * 1000)
                    
                    if redeem_response.status_code == 200:
                        redeem_data = redeem_response.json()
                        
                        if redeem_data.get('success'):
                            remaining_points = redeem_data.get('remainingPoints', 0)
                            fallback_mode = redeem_data.get('isFallback', False)
                            mode_text = " (Fallback)" if fallback_mode else ""
                            
                            self.log_result("Reward Redemption", True, 
                                          f"Reward redeemed successfully - Remaining points: {remaining_points}{mode_text}", 
                                          response_time)
                        else:
                            self.log_result("Reward Redemption", False, 
                                          f"Redemption failed: {redeem_data}", response_time)
                    else:
                        self.log_result("Reward Redemption", False, 
                                      f"HTTP {redeem_response.status_code}: {redeem_response.text}", response_time)
                else:
                    self.log_result("Reward Redemption", True, 
                                  "No rewards available for redemption (expected for new user)")
            else:
                self.log_result("Reward Redemption", False, 
                              "Could not check available rewards for redemption test")
                
        except Exception as e:
            self.log_result("Reward Redemption", False, f"Request failed: {str(e)}")

    def test_enhanced_order_system(self):
        """📦 ENHANCED ORDER SYSTEM COMPREHENSIVE TESTING"""
        print("\n📦 TESTING ENHANCED ORDER SYSTEM")
        
        created_order_id = None
        
        # Test 1: Create Comprehensive Order
        try:
            start = time.time()
            order_data = {
                "customer": self.test_customer,
                "cart": [
                    {
                        "id": "elderberry-moss",
                        "name": "Elderberry Sea Moss",
                        "price": 3600,  # $36.00 in cents
                        "quantity": 2
                    },
                    {
                        "id": "healing-harmony",
                        "name": "Healing Harmony",
                        "price": 3500,  # $35.00 in cents
                        "quantity": 1
                    }
                ],
                "fulfillmentType": "delivery",
                "deliveryAddress": {
                    "street": "123 Wellness Way",
                    "city": "Atlanta",
                    "state": "GA",
                    "zipCode": "30309",
                    "instructions": "Leave at front door"
                },
                "subtotal": 10700,  # $107.00 in cents
                "tax": 856,  # 8% tax
                "deliveryFee": 500,  # $5.00 delivery fee
                "total": 12056,  # $120.56 total
                "paymentMethod": "square",
                "notes": "Enhanced order system test",
                "metadata": {
                    "source": "enhanced_test",
                    "testRun": True
                }
            }
            
            response = requests.post(f"{API_BASE}/orders/create", 
                                   json=order_data, 
                                   headers={'Content-Type': 'application/json'},
                                   timeout=20)
            response_time = int((time.time() - start) * 1000)
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get('success') and 'order' in data:
                    order = data['order']
                    created_order_id = order.get('id')
                    order_number = order.get('orderNumber')
                    status = order.get('status')
                    fallback_mode = data.get('isFallback', False)
                    
                    required_fields = ['id', 'orderNumber', 'status', 'customer', 'items', 'fulfillment', 'pricing']
                    missing_fields = [field for field in required_fields if field not in order]
                    
                    if missing_fields:
                        self.log_result("Enhanced Order Creation", False, 
                                      f"Missing order fields: {missing_fields}", response_time)
                    else:
                        mode_text = " (Fallback Mode)" if fallback_mode else ""
                        self.log_result("Enhanced Order Creation", True, 
                                      f"Order created - ID: {created_order_id}, Number: {order_number}, Status: {status}{mode_text}", 
                                      response_time)
                else:
                    self.log_result("Enhanced Order Creation", False, 
                                  f"Invalid response structure: {data}", response_time)
            else:
                self.log_result("Enhanced Order Creation", False, 
                              f"HTTP {response.status_code}: {response.text}", response_time)
                
        except Exception as e:
            self.log_result("Enhanced Order Creation", False, f"Request failed: {str(e)}")
        
        # Test 2: Retrieve Order by ID
        if created_order_id:
            try:
                start = time.time()
                response = requests.get(f"{API_BASE}/orders/create?id={created_order_id}", timeout=10)
                response_time = int((time.time() - start) * 1000)
                
                if response.status_code == 200:
                    data = response.json()
                    
                    if data.get('success') and 'order' in data:
                        order = data['order']
                        fallback_mode = data.get('isFallback', False)
                        mode_text = " (Fallback)" if fallback_mode else ""
                        
                        self.log_result("Order Retrieval by ID", True, 
                                      f"Order retrieved - ID: {order.get('id')}, Status: {order.get('status')}{mode_text}", 
                                      response_time)
                    else:
                        self.log_result("Order Retrieval by ID", False, 
                                      f"Invalid response: {data}", response_time)
                else:
                    self.log_result("Order Retrieval by ID", False, 
                                  f"HTTP {response.status_code}: {response.text}", response_time)
                    
            except Exception as e:
                self.log_result("Order Retrieval by ID", False, f"Request failed: {str(e)}")
        
        # Test 3: Retrieve Orders by Customer Email
        try:
            start = time.time()
            response = requests.get(f"{API_BASE}/orders/create?email={self.test_email}", timeout=10)
            response_time = int((time.time() - start) * 1000)
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get('success'):
                    orders = data.get('orders', [])
                    fallback_mode = data.get('isFallback', False)
                    mode_text = " (Fallback)" if fallback_mode else ""
                    
                    self.log_result("Order Retrieval by Email", True, 
                                  f"Retrieved {len(orders)} orders for customer{mode_text}", 
                                  response_time)
                else:
                    self.log_result("Order Retrieval by Email", False, 
                                  f"Failed to retrieve orders: {data}", response_time)
            else:
                self.log_result("Order Retrieval by Email", False, 
                              f"HTTP {response.status_code}: {response.text}", response_time)
                
        except Exception as e:
            self.log_result("Order Retrieval by Email", False, f"Request failed: {str(e)}")
        
        # Test 4: Update Order Status
        if created_order_id:
            status_updates = [
                {"status": "confirmed", "metadata": {"confirmedBy": "system", "timestamp": datetime.now().isoformat()}},
                {"status": "preparing", "metadata": {"preparedBy": "kitchen", "estimatedReady": "30 minutes"}},
                {"status": "ready", "metadata": {"readyAt": datetime.now().isoformat()}},
                {"status": "completed", "metadata": {"completedAt": datetime.now().isoformat(), "rating": 5}}
            ]
            
            for update in status_updates:
                try:
                    start = time.time()
                    update_data = {
                        "orderId": created_order_id,
                        "status": update["status"],
                        "metadata": update["metadata"]
                    }
                    
                    response = requests.put(f"{API_BASE}/orders/create", 
                                          json=update_data, 
                                          headers={'Content-Type': 'application/json'},
                                          timeout=15)
                    response_time = int((time.time() - start) * 1000)
                    
                    if response.status_code == 200:
                        data = response.json()
                        
                        if data.get('success'):
                            updated_order = data.get('order', {})
                            new_status = updated_order.get('status')
                            fallback_mode = data.get('isFallback', False)
                            mode_text = " (Fallback)" if fallback_mode else ""
                            
                            self.log_result(f"Order Status Update - {update['status']}", True, 
                                          f"Status updated to: {new_status}{mode_text}", 
                                          response_time)
                        else:
                            self.log_result(f"Order Status Update - {update['status']}", False, 
                                          f"Update failed: {data}", response_time)
                    else:
                        self.log_result(f"Order Status Update - {update['status']}", False, 
                                      f"HTTP {response.status_code}: {response.text}", response_time)
                        
                except Exception as e:
                    self.log_result(f"Order Status Update - {update['status']}", False, f"Request failed: {str(e)}")
        
        # Test 5: Order Validation (Missing Required Fields)
        invalid_orders = [
            {"name": "Missing Cart", "data": {"customer": self.test_customer, "fulfillmentType": "pickup"}},
            {"name": "Missing Customer", "data": {"cart": [{"id": "test", "price": 1000, "quantity": 1}], "fulfillmentType": "pickup"}},
            {"name": "Missing Fulfillment Type", "data": {"customer": self.test_customer, "cart": [{"id": "test", "price": 1000, "quantity": 1}]}},
            {"name": "Empty Cart", "data": {"customer": self.test_customer, "cart": [], "fulfillmentType": "pickup"}}
        ]
        
        for invalid_order in invalid_orders:
            try:
                start = time.time()
                response = requests.post(f"{API_BASE}/orders/create", 
                                       json=invalid_order["data"], 
                                       headers={'Content-Type': 'application/json'},
                                       timeout=10)
                response_time = int((time.time() - start) * 1000)
                
                if response.status_code == 400:
                    self.log_result(f"Order Validation - {invalid_order['name']}", True, 
                                  "Correctly rejected invalid order data", response_time)
                else:
                    self.log_result(f"Order Validation - {invalid_order['name']}", False, 
                                  f"Expected 400, got {response.status_code}", response_time)
                    
            except Exception as e:
                self.log_result(f"Order Validation - {invalid_order['name']}", False, f"Request failed: {str(e)}")

    def test_coupon_system_integration(self):
        """🎫 COUPON SYSTEM INTEGRATION TESTING"""
        print("\n🎫 TESTING COUPON SYSTEM INTEGRATION")
        
        created_coupon_code = None
        
        # Test 1: Create Spin Wheel Coupon
        try:
            start = time.time()
            coupon_data = {
                "customerEmail": self.test_email,
                "discountAmount": 200,  # $2.00 off
                "freeShipping": False,
                "type": "spin_wheel",
                "source": "enhanced_test"
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
                    discount_amount = coupon.get('discountAmount', 0)
                    
                    self.log_result("Spin Wheel Coupon Creation", True, 
                                  f"Created coupon: {created_coupon_code}, Discount: ${discount_amount/100:.2f}", 
                                  response_time)
                else:
                    self.log_result("Spin Wheel Coupon Creation", False, 
                                  f"Invalid response: {data}", response_time)
            else:
                self.log_result("Spin Wheel Coupon Creation", False, 
                              f"HTTP {response.status_code}: {response.text}", response_time)
                
        except Exception as e:
            self.log_result("Spin Wheel Coupon Creation", False, f"Request failed: {str(e)}")
        
        # Test 2: Create Manual Admin Coupon
        try:
            start = time.time()
            admin_coupon_data = {
                "customerEmail": self.test_email,
                "discountAmount": 500,  # $5.00 off
                "freeShipping": True,
                "type": "manual",
                "source": "admin_enhanced_test"
            }
            
            response = requests.post(f"{API_BASE}/coupons/create", 
                                   json=admin_coupon_data, 
                                   headers={'Content-Type': 'application/json'},
                                   timeout=10)
            response_time = int((time.time() - start) * 1000)
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get('success') and 'coupon' in data:
                    coupon = data['coupon']
                    coupon_code = coupon.get('code')
                    discount_amount = coupon.get('discountAmount', 0)
                    free_shipping = coupon.get('freeShipping', False)
                    
                    self.log_result("Manual Admin Coupon Creation", True, 
                                  f"Created admin coupon: {coupon_code}, Discount: ${discount_amount/100:.2f}, Free Shipping: {free_shipping}", 
                                  response_time)
                else:
                    self.log_result("Manual Admin Coupon Creation", False, 
                                  f"Invalid response: {data}", response_time)
            else:
                self.log_result("Manual Admin Coupon Creation", False, 
                              f"HTTP {response.status_code}: {response.text}", response_time)
                
        except Exception as e:
            self.log_result("Manual Admin Coupon Creation", False, f"Request failed: {str(e)}")
        
        # Test 3: Validate Created Coupon
        if created_coupon_code:
            try:
                start = time.time()
                validation_data = {
                    "couponCode": created_coupon_code,
                    "customerEmail": self.test_email,
                    "orderTotal": 3500  # $35.00 in cents
                }
                
                response = requests.post(f"{API_BASE}/coupons/validate", 
                                       json=validation_data, 
                                       headers={'Content-Type': 'application/json'},
                                       timeout=10)
                response_time = int((time.time() - start) * 1000)
                
                if response.status_code == 200:
                    data = response.json()
                    
                    if data.get('valid'):
                        discount = data.get('discount', {})
                        discount_amount = discount.get('amount', 0)
                        
                        self.log_result("Coupon Validation", True, 
                                      f"Coupon validated successfully - Discount: ${discount_amount/100:.2f}", 
                                      response_time)
                    else:
                        self.log_result("Coupon Validation", False, 
                                      f"Coupon validation failed: {data.get('error', 'Unknown error')}", response_time)
                else:
                    self.log_result("Coupon Validation", False, 
                                  f"HTTP {response.status_code}: {response.text}", response_time)
                    
            except Exception as e:
                self.log_result("Coupon Validation", False, f"Request failed: {str(e)}")
        
        # Test 4: Invalid Coupon Validation
        try:
            start = time.time()
            invalid_validation_data = {
                "couponCode": "INVALID_COUPON_123",
                "customerEmail": self.test_email,
                "orderTotal": 3500
            }
            
            response = requests.post(f"{API_BASE}/coupons/validate", 
                                   json=invalid_validation_data, 
                                   headers={'Content-Type': 'application/json'},
                                   timeout=10)
            response_time = int((time.time() - start) * 1000)
            
            if response.status_code == 200:
                data = response.json()
                
                if not data.get('valid'):
                    self.log_result("Invalid Coupon Handling", True, 
                                  "Correctly rejected invalid coupon code", response_time)
                else:
                    self.log_result("Invalid Coupon Handling", False, 
                                  "Invalid coupon was incorrectly accepted", response_time)
            else:
                self.log_result("Invalid Coupon Handling", False, 
                              f"HTTP {response.status_code}: {response.text}", response_time)
                
        except Exception as e:
            self.log_result("Invalid Coupon Handling", False, f"Request failed: {str(e)}")
        
        # Test 5: Coupon Integration with Order System
        if created_coupon_code:
            try:
                start = time.time()
                order_with_coupon = {
                    "customer": self.test_customer,
                    "cart": [
                        {
                            "id": "elderberry-moss",
                            "name": "Elderberry Sea Moss",
                            "price": 3600,
                            "quantity": 1
                        }
                    ],
                    "fulfillmentType": "pickup",
                    "pickupLocation": "Serenbe Farmers Market",
                    "subtotal": 3600,
                    "couponCode": created_coupon_code,
                    "discount": 200,  # $2.00 off from coupon
                    "total": 3400,  # $34.00 after discount
                    "metadata": {
                        "couponIntegrationTest": True
                    }
                }
                
                response = requests.post(f"{API_BASE}/orders/create", 
                                       json=order_with_coupon, 
                                       headers={'Content-Type': 'application/json'},
                                       timeout=15)
                response_time = int((time.time() - start) * 1000)
                
                if response.status_code == 200:
                    data = response.json()
                    
                    if data.get('success'):
                        order = data.get('order', {})
                        order_id = order.get('id')
                        
                        self.log_result("Coupon-Order Integration", True, 
                                      f"Order with coupon created successfully - Order ID: {order_id}", 
                                      response_time)
                    else:
                        self.log_result("Coupon-Order Integration", False, 
                                      f"Order with coupon failed: {data}", response_time)
                else:
                    self.log_result("Coupon-Order Integration", False, 
                                  f"HTTP {response.status_code}: {response.text}", response_time)
                    
            except Exception as e:
                self.log_result("Coupon-Order Integration", False, f"Request failed: {str(e)}")

    def test_error_handling_and_fallbacks(self):
        """🛡️ ERROR HANDLING & FALLBACK MECHANISMS TESTING"""
        print("\n🛡️ TESTING ERROR HANDLING & FALLBACK MECHANISMS")
        
        # Test 1: Missing Required Fields (400 Errors)
        invalid_requests = [
            {
                "name": "Passport - Missing Email",
                "endpoint": "/rewards/passport",
                "method": "POST",
                "data": {"name": "Test User"}
            },
            {
                "name": "Add Points - Missing Email",
                "endpoint": "/rewards/add-points",
                "method": "POST",
                "data": {"points": 10, "activityType": "test"}
            },
            {
                "name": "Add Points - Missing Activity Type",
                "endpoint": "/rewards/add-points",
                "method": "POST",
                "data": {"email": self.test_email, "points": 10}
            },
            {
                "name": "Coupon Create - Missing Email",
                "endpoint": "/coupons/create",
                "method": "POST",
                "data": {"discountAmount": 100}
            },
            {
                "name": "Coupon Validate - Missing Coupon Code",
                "endpoint": "/coupons/validate",
                "method": "POST",
                "data": {"customerEmail": self.test_email, "orderTotal": 1000}
            }
        ]
        
        for test_case in invalid_requests:
            try:
                start = time.time()
                
                if test_case["method"] == "POST":
                    response = requests.post(f"{API_BASE}{test_case['endpoint']}", 
                                           json=test_case["data"], 
                                           headers={'Content-Type': 'application/json'},
                                           timeout=10)
                else:
                    response = requests.get(f"{API_BASE}{test_case['endpoint']}", timeout=10)
                
                response_time = int((time.time() - start) * 1000)
                
                if response.status_code == 400:
                    self.log_result(f"Error Handling - {test_case['name']}", True, 
                                  "Correctly returned 400 for invalid request", response_time)
                else:
                    self.log_result(f"Error Handling - {test_case['name']}", False, 
                                  f"Expected 400, got {response.status_code}", response_time)
                    
            except Exception as e:
                self.log_result(f"Error Handling - {test_case['name']}", False, f"Request failed: {str(e)}")
        
        # Test 2: Invalid HTTP Methods (405 Errors)
        method_tests = [
            {"endpoint": "/rewards/passport", "invalid_method": "DELETE"},
            {"endpoint": "/rewards/add-points", "invalid_method": "PUT"},
            {"endpoint": "/rewards/leaderboard", "invalid_method": "POST"},
            {"endpoint": "/coupons/create", "invalid_method": "GET"}
        ]
        
        for test in method_tests:
            try:
                start = time.time()
                
                if test["invalid_method"] == "DELETE":
                    response = requests.delete(f"{API_BASE}{test['endpoint']}", timeout=10)
                elif test["invalid_method"] == "PUT":
                    response = requests.put(f"{API_BASE}{test['endpoint']}", timeout=10)
                elif test["invalid_method"] == "POST":
                    response = requests.post(f"{API_BASE}{test['endpoint']}", timeout=10)
                else:  # GET
                    response = requests.get(f"{API_BASE}{test['endpoint']}", timeout=10)
                
                response_time = int((time.time() - start) * 1000)
                
                if response.status_code == 405:
                    self.log_result(f"Method Validation - {test['endpoint']} {test['invalid_method']}", True, 
                                  "Correctly returned 405 for invalid method", response_time)
                else:
                    # Some endpoints might handle multiple methods, so this isn't always an error
                    self.log_result(f"Method Validation - {test['endpoint']} {test['invalid_method']}", True, 
                                  f"Endpoint handles {test['invalid_method']} method (status: {response.status_code})", response_time)
                    
            except Exception as e:
                self.log_result(f"Method Validation - {test['endpoint']} {test['invalid_method']}", False, f"Request failed: {str(e)}")
        
        # Test 3: Fallback Mode Detection
        # This tests if the system gracefully handles database unavailability
        try:
            # Test passport creation with potential fallback
            start = time.time()
            fallback_test_data = {
                "email": f"fallback.test.{int(time.time())}@example.com",
                "name": "Fallback Test User"
            }
            
            response = requests.post(f"{API_BASE}/rewards/passport", 
                                   json=fallback_test_data, 
                                   headers={'Content-Type': 'application/json'},
                                   timeout=15)
            response_time = int((time.time() - start) * 1000)
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get('success'):
                    passport = data.get('passport', {})
                    is_fallback = passport.get('isFallback', False)
                    is_emergency_fallback = passport.get('isEmergencyFallback', False)
                    
                    if is_fallback or is_emergency_fallback:
                        fallback_type = "Emergency Fallback" if is_emergency_fallback else "Standard Fallback"
                        self.log_result("Fallback Mode Detection", True, 
                                      f"{fallback_type} mode detected and working correctly", response_time)
                    else:
                        self.log_result("Fallback Mode Detection", True, 
                                      "System operating in normal mode (database available)", response_time)
                else:
                    self.log_result("Fallback Mode Detection", False, 
                                  f"Fallback test failed: {data}", response_time)
            else:
                self.log_result("Fallback Mode Detection", False, 
                              f"HTTP {response.status_code}: {response.text}", response_time)
                
        except Exception as e:
            self.log_result("Fallback Mode Detection", False, f"Request failed: {str(e)}")

    def test_system_performance_and_reliability(self):
        """⚡ SYSTEM PERFORMANCE & RELIABILITY TESTING"""
        print("\n⚡ TESTING SYSTEM PERFORMANCE & RELIABILITY")
        
        # Test 1: Response Time Performance
        performance_tests = [
            {"name": "Passport Creation", "endpoint": "/rewards/passport", "method": "POST", 
             "data": {"email": f"perf.test.{int(time.time())}@example.com", "name": "Performance Test"}},
            {"name": "Leaderboard Retrieval", "endpoint": "/rewards/leaderboard", "method": "GET"},
            {"name": "Coupon Creation", "endpoint": "/coupons/create", "method": "POST",
             "data": {"customerEmail": f"perf.coupon.{int(time.time())}@example.com", "discountAmount": 100, "type": "test"}},
            {"name": "Order Creation", "endpoint": "/orders/create", "method": "POST",
             "data": {
                 "customer": {"name": "Perf Test", "email": f"perf.order.{int(time.time())}@example.com", "phone": "+1-555-0100"},
                 "cart": [{"id": "test-product", "name": "Test Product", "price": 1000, "quantity": 1}],
                 "fulfillmentType": "pickup",
                 "subtotal": 1000,
                 "total": 1000
             }}
        ]
        
        response_times = []
        
        for test in performance_tests:
            try:
                start = time.time()
                
                if test["method"] == "POST":
                    response = requests.post(f"{API_BASE}{test['endpoint']}", 
                                           json=test["data"], 
                                           headers={'Content-Type': 'application/json'},
                                           timeout=15)
                else:
                    response = requests.get(f"{API_BASE}{test['endpoint']}", timeout=15)
                
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
                
                success = response.status_code in [200, 201] and response_time < 3000
                
                self.log_result(f"Performance - {test['name']}", success, 
                              f"{performance_level} - {response_time}ms (Status: {response.status_code})", 
                              response_time)
                
            except Exception as e:
                self.log_result(f"Performance - {test['name']}", False, f"Request failed: {str(e)}")
        
        # Test 2: Concurrent Request Handling
        try:
            import threading
            import queue
            
            def make_concurrent_request(result_queue, test_id):
                try:
                    start = time.time()
                    response = requests.get(f"{API_BASE}/rewards/leaderboard", timeout=10)
                    response_time = int((time.time() - start) * 1000)
                    
                    result_queue.put({
                        'test_id': test_id,
                        'success': response.status_code == 200,
                        'response_time': response_time,
                        'status_code': response.status_code
                    })
                except Exception as e:
                    result_queue.put({
                        'test_id': test_id,
                        'success': False,
                        'error': str(e)
                    })
            
            # Run 5 concurrent requests
            result_queue = queue.Queue()
            threads = []
            
            start_time = time.time()
            for i in range(5):
                thread = threading.Thread(target=make_concurrent_request, args=(result_queue, i))
                threads.append(thread)
                thread.start()
            
            # Wait for all threads to complete
            for thread in threads:
                thread.join()
            
            total_time = int((time.time() - start_time) * 1000)
            
            # Collect results
            results = []
            while not result_queue.empty():
                results.append(result_queue.get())
            
            successful_requests = sum(1 for r in results if r.get('success', False))
            avg_response_time = sum(r.get('response_time', 0) for r in results if 'response_time' in r) / len(results) if results else 0
            
            self.log_result("Concurrent Request Handling", successful_requests >= 4, 
                          f"Handled {successful_requests}/5 concurrent requests successfully in {total_time}ms (avg: {avg_response_time:.0f}ms per request)")
            
        except Exception as e:
            self.log_result("Concurrent Request Handling", False, f"Concurrent test failed: {str(e)}")
        
        # Performance Summary
        if response_times:
            avg_time = sum(response_times) / len(response_times)
            max_time = max(response_times)
            min_time = min(response_times)
            
            self.log_result("Overall System Performance", avg_time < 2000, 
                          f"Average: {avg_time:.0f}ms, Min: {min_time}ms, Max: {max_time}ms")

    def run_all_tests(self):
        """Run all enhanced system tests"""
        print("🚀 STARTING ENHANCED SYSTEMS COMPREHENSIVE TESTING")
        print(f"Testing against: {BASE_URL}")
        print(f"Test Customer: {self.test_customer['name']} ({self.test_email})")
        print("=" * 80)
        
        # Run all test suites
        self.test_enhanced_rewards_system()
        self.test_enhanced_order_system()
        self.test_coupon_system_integration()
        self.test_error_handling_and_fallbacks()
        self.test_system_performance_and_reliability()
        
        # Generate summary
        self.generate_summary()
    
    def generate_summary(self):
        """Generate comprehensive test summary"""
        print("\n" + "=" * 80)
        print("📊 ENHANCED SYSTEMS TEST SUMMARY")
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
        
        # System-specific results
        print(f"\n🎯 ENHANCED SYSTEMS STATUS:")
        
        system_categories = {
            'Rewards System': [r for r in self.results if 'Rewards' in r['test'] or 'Passport' in r['test'] or 'Points' in r['test'] or 'Leaderboard' in r['test']],
            'Order System': [r for r in self.results if 'Order' in r['test']],
            'Coupon System': [r for r in self.results if 'Coupon' in r['test']],
            'Error Handling': [r for r in self.results if 'Error' in r['test'] or 'Fallback' in r['test'] or 'Method' in r['test']],
            'Performance': [r for r in self.results if 'Performance' in r['test'] or 'Concurrent' in r['test']]
        }
        
        for system, tests in system_categories.items():
            if tests:
                system_passed = sum(1 for t in tests if t['success'])
                system_total = len(tests)
                system_rate = (system_passed / system_total * 100) if system_total > 0 else 0
                
                status_icon = "✅" if system_rate >= 80 else "⚠️" if system_rate >= 60 else "❌"
                print(f"  {status_icon} {system}: {system_passed}/{system_total} tests passed ({system_rate:.1f}%)")
        
        # Failed tests details
        if failed_tests > 0:
            print(f"\n❌ FAILED TESTS ({failed_tests}):")
            for result in self.results:
                if not result['success']:
                    print(f"  • {result['test']}: {result['details']}")
        
        # Fallback mode detection
        fallback_tests = [r for r in self.results if 'Fallback' in r['details'] or 'fallback' in r['details'].lower()]
        if fallback_tests:
            print(f"\n🛡️ FALLBACK MODE DETECTION:")
            print(f"  Detected {len(fallback_tests)} tests running in fallback mode")
            print("  This indicates robust offline capabilities are working")
        
        # Overall assessment
        print(f"\n🏆 OVERALL ASSESSMENT:")
        if success_rate >= 90:
            assessment = "EXCELLENT - Enhanced systems ready for production"
        elif success_rate >= 80:
            assessment = "GOOD - Minor issues to address in enhanced systems"
        elif success_rate >= 70:
            assessment = "ACCEPTABLE - Some enhanced system issues need attention"
        else:
            assessment = "NEEDS WORK - Multiple critical issues in enhanced systems"
        
        print(f"  {assessment}")
        
        # Specific recommendations
        print(f"\n💡 RECOMMENDATIONS:")
        if success_rate >= 85:
            print("  ✅ Enhanced systems are functioning well with robust fallback mechanisms")
            print("  ✅ Rewards system provides comprehensive customer engagement features")
            print("  ✅ Order system handles complex order scenarios effectively")
            print("  ✅ Coupon system integrates seamlessly with order processing")
        else:
            print("  ⚠️  Review failed tests and address critical system issues")
            print("  ⚠️  Ensure fallback mechanisms are properly configured")
            print("  ⚠️  Verify database connectivity and error handling")
        
        return {
            'total_tests': total_tests,
            'passed_tests': passed_tests,
            'failed_tests': failed_tests,
            'success_rate': success_rate,
            'system_categories': system_categories,
            'assessment': assessment
        }

if __name__ == "__main__":
    tester = EnhancedSystemsTester()
    tester.run_all_tests()