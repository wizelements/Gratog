#!/usr/bin/env python3
"""
Production Square Payment Integration Test
Tests live Square API with production credentials
"""

import requests
import json
import time
from datetime import datetime

# Production Configuration
BASE_URL = "http://localhost:3000"
API_BASE = f"{BASE_URL}/api"

class SquareProductionTester:
    def __init__(self):
        self.results = []
        self.start_time = time.time()
        
    def log(self, message, level="INFO"):
        timestamp = datetime.now().strftime("%H:%M:%S")
        prefix = {
            "INFO": "ℹ️",
            "SUCCESS": "✅",
            "ERROR": "❌",
            "WARNING": "⚠️",
            "TEST": "🧪"
        }.get(level, "•")
        print(f"[{timestamp}] {prefix} {message}")
        
    def test_api(self, endpoint, method="GET", data=None, expected_status=200):
        """Test API endpoint"""
        url = f"{API_BASE}{endpoint}"
        self.log(f"Testing {method} {endpoint}", "TEST")
        
        try:
            if method == "GET":
                response = requests.get(url, timeout=30)
            elif method == "POST":
                response = requests.post(url, json=data, timeout=30)
            else:
                return {"success": False, "error": f"Unsupported method: {method}"}
            
            success = response.status_code == expected_status
            
            try:
                response_data = response.json()
            except:
                response_data = {"raw": response.text[:200]}
            
            result = {
                "success": success,
                "status": response.status_code,
                "data": response_data,
                "url": url
            }
            
            if success:
                self.log(f"✓ {endpoint} - Status {response.status_code}", "SUCCESS")
            else:
                self.log(f"✗ {endpoint} - Status {response.status_code} (expected {expected_status})", "ERROR")
            
            return result
            
        except Exception as e:
            self.log(f"✗ {endpoint} - Exception: {str(e)}", "ERROR")
            return {"success": False, "error": str(e), "url": url}
    
    def test_health_check(self):
        """Test 1: Health Check with Square Status"""
        self.log("\n" + "="*60, "INFO")
        self.log("TEST 1: HEALTH CHECK & SQUARE CONFIGURATION", "INFO")
        self.log("="*60, "INFO")
        
        result = self.test_api("/health")
        self.results.append(("Health Check", result))
        
        if result["success"]:
            data = result["data"]
            self.log(f"Status: {data.get('status', 'unknown')}", "INFO")
            
            services = data.get('services', {})
            self.log(f"Database: {services.get('database', 'unknown')}", "INFO")
            self.log(f"Square API: {services.get('square_api', 'unknown')}", "INFO")
            
            if services.get('square_api') == 'production':
                self.log("✓ Square API in PRODUCTION mode", "SUCCESS")
            else:
                self.log(f"⚠ Square API mode: {services.get('square_api')}", "WARNING")
    
    def test_square_authentication(self):
        """Test 2: Square Authentication Check"""
        self.log("\n" + "="*60, "INFO")
        self.log("TEST 2: SQUARE AUTHENTICATION", "INFO")
        self.log("="*60, "INFO")
        
        # Try a simple Square API test payment request
        test_payment_data = {
            "amount": 1000,  # $10.00 in cents
            "currency": "USD",
            "sourceId": "cnon:card-nonce-ok",  # Square test nonce for successful payment
            "locationId": "L66TVG6867BG9",
            "customerName": "Test Customer",
            "customerEmail": "test@example.com",
            "items": [
                {
                    "name": "Test Product",
                    "quantity": 1,
                    "price": 1000
                }
            ]
        }
        
        result = self.test_api("/square-payment", "POST", test_payment_data)
        self.results.append(("Square Payment Test", result))
        
        if result["success"]:
            data = result["data"]
            
            # Check if we're in mock mode or live mode
            payment_id = data.get('paymentId', '')
            processing_time = data.get('processingTime', 0)
            
            if 'MOCK' in payment_id or 'mock' in str(data).lower():
                self.log("⚠ Payment processed in MOCK/FALLBACK mode", "WARNING")
                self.log("This means Square credentials are not working properly", "WARNING")
            else:
                self.log(f"✓ Live Square payment processed: {payment_id}", "SUCCESS")
                self.log(f"Processing time: {processing_time}ms", "INFO")
                
                if 'receiptUrl' in data:
                    self.log(f"Receipt URL: {data['receiptUrl']}", "INFO")
    
    def test_order_creation_flow(self):
        """Test 3: Full Order Creation Flow"""
        self.log("\n" + "="*60, "INFO")
        self.log("TEST 3: ORDER CREATION FLOW", "INFO")
        self.log("="*60, "INFO")
        
        order_data = {
            "cart": [
                {
                    "id": "elderberry-moss",
                    "name": "Elderberry Moss",
                    "price": 25.00,
                    "quantity": 1,
                    "rewardPoints": 25
                }
            ],
            "customer": {
                "name": "Production Test Customer",
                "email": "production-test@tasteofgratitude.com",
                "phone": "+14045551234"
            },
            "fulfillmentType": "pickup_market",
            "subtotal": 25.00,
            "total": 25.00,
            "source": "production_test"
        }
        
        result = self.test_api("/orders/create", "POST", order_data)
        self.results.append(("Order Creation", result))
        
        if result["success"]:
            order = result["data"].get('order', {})
            self.log(f"✓ Order created: {order.get('id', 'unknown')}", "SUCCESS")
            self.log(f"Order status: {order.get('status', 'unknown')}", "INFO")
            return order.get('id')
        else:
            self.log("✗ Order creation failed", "ERROR")
            return None
    
    def test_rewards_system(self):
        """Test 4: Rewards System"""
        self.log("\n" + "="*60, "INFO")
        self.log("TEST 4: REWARDS SYSTEM", "INFO")
        self.log("="*60, "INFO")
        
        # Test passport creation
        passport_data = {
            "email": "production-test@tasteofgratitude.com",
            "name": "Production Test Customer"
        }
        
        result = self.test_api("/rewards/passport", "POST", passport_data)
        self.results.append(("Rewards Passport", result))
        
        if result["success"]:
            passport = result["data"].get('passport', {})
            self.log(f"✓ Passport points: {passport.get('points', 0)}", "SUCCESS")
            self.log(f"Level: {passport.get('level', 'unknown')}", "INFO")
    
    def test_webhook_endpoint(self):
        """Test 5: Square Webhook Endpoint"""
        self.log("\n" + "="*60, "INFO")
        self.log("TEST 5: SQUARE WEBHOOK ENDPOINT", "INFO")
        self.log("="*60, "INFO")
        
        result = self.test_api("/square-webhook", "GET")
        self.results.append(("Square Webhook Status", result))
        
        if result["success"]:
            self.log("✓ Webhook endpoint is active", "SUCCESS")
            self.log(f"Message: {result['data'].get('message', 'N/A')}", "INFO")
    
    def print_summary(self):
        """Print test summary"""
        elapsed = time.time() - self.start_time
        
        self.log("\n" + "="*60, "INFO")
        self.log("PRODUCTION TEST SUMMARY", "INFO")
        self.log("="*60, "INFO")
        
        total = len(self.results)
        passed = sum(1 for _, r in self.results if r.get('success'))
        failed = total - passed
        
        self.log(f"Total Tests: {total}", "INFO")
        self.log(f"Passed: {passed}", "SUCCESS" if passed == total else "INFO")
        self.log(f"Failed: {failed}", "ERROR" if failed > 0 else "INFO")
        self.log(f"Execution Time: {elapsed:.2f}s", "INFO")
        
        if failed > 0:
            self.log("\nFailed Tests:", "ERROR")
            for name, result in self.results:
                if not result.get('success'):
                    self.log(f"  - {name}: {result.get('error', 'Unknown error')}", "ERROR")
        
        # Square-specific status
        self.log("\n" + "="*60, "INFO")
        self.log("SQUARE PRODUCTION STATUS", "INFO")
        self.log("="*60, "INFO")
        
        health_result = next((r for n, r in self.results if n == "Health Check"), None)
        if health_result and health_result.get('success'):
            square_status = health_result['data'].get('services', {}).get('square_api', 'unknown')
            
            if square_status == 'production':
                self.log("✓ Square API: PRODUCTION MODE", "SUCCESS")
                self.log("✓ Using live credentials", "SUCCESS")
            elif square_status == 'sandbox':
                self.log("⚠ Square API: SANDBOX MODE", "WARNING")
            else:
                self.log(f"❌ Square API: {square_status}", "ERROR")
        
        # Payment test result
        payment_result = next((r for n, r in self.results if n == "Square Payment Test"), None)
        if payment_result:
            if payment_result.get('success'):
                payment_data = payment_result.get('data', {})
                payment_id = payment_data.get('paymentId', '')
                
                if 'MOCK' in payment_id or 'mock' in str(payment_data).lower():
                    self.log("❌ Payments using MOCK/FALLBACK mode", "ERROR")
                    self.log("   Check Square credentials configuration", "WARNING")
                else:
                    self.log("✓ Live Square payments working", "SUCCESS")
            else:
                self.log("❌ Square payment test failed", "ERROR")
    
    def run_all_tests(self):
        """Run all production tests"""
        self.log("="*60, "INFO")
        self.log("SQUARE PRODUCTION INTEGRATION TEST", "INFO")
        self.log("="*60, "INFO")
        self.log(f"Base URL: {BASE_URL}", "INFO")
        self.log(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", "INFO")
        
        try:
            self.test_health_check()
            self.test_square_authentication()
            self.test_order_creation_flow()
            self.test_rewards_system()
            self.test_webhook_endpoint()
        except KeyboardInterrupt:
            self.log("\nTest interrupted by user", "WARNING")
        except Exception as e:
            self.log(f"\nUnexpected error: {str(e)}", "ERROR")
        finally:
            self.print_summary()

if __name__ == "__main__":
    tester = SquareProductionTester()
    tester.run_all_tests()
