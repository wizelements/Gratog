#!/usr/bin/env python3
"""
FINAL PRODUCTION VERIFICATION - COMPREHENSIVE TEST SUITE
Tests all critical systems for production deployment readiness
"""

import requests
import json
import sys
from datetime import datetime
from typing import Dict, List, Any

BASE_URL = "https://gratog-payments.preview.emergentagent.com"

class bcolors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

class ProductionVerifier:
    def __init__(self):
        self.results = {
            "timestamp": datetime.now().isoformat(),
            "base_url": BASE_URL,
            "categories": {},
            "total_tests": 0,
            "passed_tests": 0,
            "failed_tests": 0,
            "warnings": []
        }
    
    def print_header(self, text: str):
        print(f"\n{bcolors.BOLD}{bcolors.HEADER}{'='*70}{bcolors.ENDC}")
        print(f"{bcolors.BOLD}{bcolors.HEADER}{text:^70}{bcolors.ENDC}")
        print(f"{bcolors.BOLD}{bcolors.HEADER}{'='*70}{bcolors.ENDC}\n")
    
    def print_test(self, name: str, passed: bool, details: str = "", response_time: int = 0):
        self.results["total_tests"] += 1
        if passed:
            self.results["passed_tests"] += 1
            status = f"{bcolors.OKGREEN}✅ PASS{bcolors.ENDC}"
        else:
            self.results["failed_tests"] += 1
            status = f"{bcolors.FAIL}❌ FAIL{bcolors.ENDC}"
        
        time_str = f"({response_time}ms)" if response_time > 0 else ""
        print(f"{status} {name} {time_str}")
        if details:
            color = bcolors.OKCYAN if passed else bcolors.WARNING
            print(f"     {color}{details}{bcolors.ENDC}")
    
    def test_endpoint(self, name: str, method: str, url: str, 
                     expected_status: int = 200, 
                     expected_field: str = None,
                     json_data: Dict = None) -> Dict[str, Any]:
        """Generic endpoint tester"""
        start_time = datetime.now()
        
        try:
            if method == "GET":
                response = requests.get(url, timeout=10)
            elif method == "POST":
                response = requests.post(url, json=json_data, timeout=10)
            else:
                response = requests.request(method, url, json=json_data, timeout=10)
            
            response_time = int((datetime.now() - start_time).total_seconds() * 1000)
            
            passed = response.status_code == expected_status
            
            details = f"Status: {response.status_code}"
            if expected_field and response.status_code == expected_status:
                try:
                    data = response.json()
                    if expected_field in str(data):
                        details += f", Found: {expected_field}"
                    else:
                        passed = False
                        details += f", Missing: {expected_field}"
                except:
                    details += ", Invalid JSON"
            
            self.print_test(name, passed, details, response_time)
            
            return {
                "passed": passed,
                "status_code": response.status_code,
                "response_time": response_time,
                "details": details
            }
        except Exception as e:
            self.print_test(name, False, f"Exception: {str(e)}")
            return {"passed": False, "error": str(e)}
    
    def run_category(self, category_name: str, tests: List[Dict]):
        """Run a category of tests"""
        self.print_header(category_name)
        
        category_results = []
        for test in tests:
            result = self.test_endpoint(**test)
            category_results.append({
                "name": test["name"],
                **result
            })
        
        self.results["categories"][category_name] = category_results
        
        passed = sum(1 for r in category_results if r.get("passed"))
        total = len(category_results)
        rate = (passed / total * 100) if total > 0 else 0
        
        print(f"\n{bcolors.BOLD}Category: {passed}/{total} passed ({rate:.0f}%){bcolors.ENDC}")
    
    def run_all_tests(self):
        """Execute all production verification tests"""
        
        # Category 1: Core System Health
        self.run_category("CORE SYSTEM HEALTH", [
            {
                "name": "Health endpoint responds",
                "method": "GET",
                "url": f"{BASE_URL}/api/health",
                "expected_status": 200,
                "expected_field": "healthy"
            },
            {
                "name": "Database connection working",
                "method": "GET",
                "url": f"{BASE_URL}/api/health",
                "expected_status": 200,
                "expected_field": "connected"
            },
            {
                "name": "Square API configured",
                "method": "GET",
                "url": f"{BASE_URL}/api/health",
                "expected_status": 200,
                "expected_field": "square_api"
            },
            {
                "name": "Startup validation endpoint",
                "method": "GET",
                "url": f"{BASE_URL}/api/startup",
                "expected_status": 200
            }
        ])
        
        # Category 2: Product & Catalog APIs
        self.run_category("PRODUCT & CATALOG", [
            {
                "name": "Products API returns data",
                "method": "GET",
                "url": f"{BASE_URL}/api/products",
                "expected_status": 200,
                "expected_field": "success"
            },
            {
                "name": "Products have catalog IDs",
                "method": "GET",
                "url": f"{BASE_URL}/api/products",
                "expected_status": 200,
                "expected_field": "catalogObjectId"
            }
        ])
        
        # Category 3: Input Validation (Error Handling)
        self.run_category("INPUT VALIDATION & ERROR HANDLING", [
            {
                "name": "Payment API validates missing sourceId",
                "method": "POST",
                "url": f"{BASE_URL}/api/payments",
                "expected_status": 400,
                "expected_field": "Payment source ID",
                "json_data": {"amountCents": 1000}
            },
            {
                "name": "Payment API validates invalid amount",
                "method": "POST",
                "url": f"{BASE_URL}/api/payments",
                "expected_status": 400,
                "expected_field": "amount",
                "json_data": {"sourceId": "test", "amountCents": 0}
            },
            {
                "name": "Checkout API validates empty items",
                "method": "POST",
                "url": f"{BASE_URL}/api/checkout",
                "expected_status": 400,
                "expected_field": "Line items",
                "json_data": {"lineItems": []}
            },
            {
                "name": "Order API validates missing cart",
                "method": "POST",
                "url": f"{BASE_URL}/api/orders/create",
                "expected_status": 400,
                "expected_field": "Cart items",
                "json_data": {}
            },
            {
                "name": "Admin login validates credentials",
                "method": "POST",
                "url": f"{BASE_URL}/api/admin/auth/login",
                "expected_status": 400,
                "expected_field": "Email",
                "json_data": {}
            }
        ])
        
        # Category 4: Webhook & Integration
        self.run_category("WEBHOOKS & INTEGRATIONS", [
            {
                "name": "Square webhook endpoint accessible",
                "method": "GET",
                "url": f"{BASE_URL}/api/square-webhook",
                "expected_status": 200,
                "expected_field": "webhook"
            },
            {
                "name": "Modern webhook endpoint accessible",
                "method": "GET",
                "url": f"{BASE_URL}/api/webhooks/square",
                "expected_status": 200
            }
        ])
        
        # Category 5: Square-Specific APIs
        self.run_category("SQUARE API ENDPOINTS", [
            {
                "name": "Square diagnostic endpoint exists",
                "method": "GET",
                "url": f"{BASE_URL}/api/square/diagnose",
                "expected_status": 200,
                "expected_field": "Square"
            },
            {
                "name": "Square OAuth status endpoint",
                "method": "GET",
                "url": f"{BASE_URL}/api/oauth/square/status",
                "expected_status": 200,
                "expected_field": "redirectUrls"
            }
        ])
        
        # Category 6: Customer & Order Management
        self.run_category("CUSTOMER & ORDER MANAGEMENT", [
            {
                "name": "Customer creation validation",
                "method": "POST",
                "url": f"{BASE_URL}/api/customers",
                "expected_status": 400,
                "json_data": {}
            },
            {
                "name": "Order creation with valid pickup data",
                "method": "POST",
                "url": f"{BASE_URL}/api/orders/create",
                "expected_status": 200,
                "json_data": {
                    "cart": [{"id": "test", "name": "Test", "price": 10, "quantity": 1, "variationId": "test"}],
                    "customer": {"name": "Test User", "email": "test@test.com", "phone": "1234567890"},
                    "fulfillmentType": "pickup",
                    "pickupLocation": "serenbe"
                }
            }
        ])
        
        # Category 7: Coupon & Rewards System
        self.run_category("COUPON & REWARDS SYSTEM", [
            {
                "name": "Coupon creation validation",
                "method": "POST",
                "url": f"{BASE_URL}/api/coupons/create",
                "expected_status": 200,
                "json_data": {
                    "email": "test@example.com",
                    "type": "test",
                    "discountAmount": 5
                }
            },
            {
                "name": "Coupon validation with invalid code",
                "method": "POST",
                "url": f"{BASE_URL}/api/coupons/validate",
                "expected_status": 200,
                "expected_field": "valid",
                "json_data": {
                    "code": "INVALID",
                    "email": "test@test.com"
                }
            }
        ])
    
    def print_final_summary(self):
        """Print comprehensive final summary"""
        self.print_header("FINAL PRODUCTION VERIFICATION RESULTS")
        
        total = self.results["total_tests"]
        passed = self.results["passed_tests"]
        failed = self.results["failed_tests"]
        rate = (passed / total * 100) if total > 0 else 0
        
        print(f"{bcolors.BOLD}OVERALL RESULTS:{bcolors.ENDC}")
        print(f"  Total Tests:   {total}")
        print(f"  {bcolors.OKGREEN}Passed:        {passed}{bcolors.ENDC}")
        print(f"  {bcolors.FAIL}Failed:        {failed}{bcolors.ENDC}")
        print(f"  {bcolors.BOLD}Success Rate:  {rate:.1f}%{bcolors.ENDC}")
        
        print(f"\n{bcolors.BOLD}CATEGORY BREAKDOWN:{bcolors.ENDC}")
        for category, tests in self.results["categories"].items():
            cat_passed = sum(1 for t in tests if t.get("passed"))
            cat_total = len(tests)
            cat_rate = (cat_passed / cat_total * 100) if cat_total > 0 else 0
            
            if cat_rate >= 80:
                status = f"{bcolors.OKGREEN}✅{bcolors.ENDC}"
            elif cat_rate >= 60:
                status = f"{bcolors.WARNING}⚠️{bcolors.ENDC}"
            else:
                status = f"{bcolors.FAIL}❌{bcolors.ENDC}"
            
            print(f"  {status} {category}: {cat_passed}/{cat_total} ({cat_rate:.0f}%)")
        
        # Save results to file
        with open('/tmp/production_verification_results.json', 'w') as f:
            json.dump(self.results, f, indent=2)
        
        print(f"\n{bcolors.OKCYAN}📝 Results saved to: /tmp/production_verification_results.json{bcolors.ENDC}")
        
        # Production readiness assessment
        print(f"\n{bcolors.BOLD}PRODUCTION READINESS ASSESSMENT:{bcolors.ENDC}")
        
        if rate >= 90:
            print(f"{bcolors.OKGREEN}🎉 EXCELLENT - READY FOR PRODUCTION!{bcolors.ENDC}")
            print(f"{bcolors.OKGREEN}All critical systems are operational.{bcolors.ENDC}")
            deployment_ready = True
        elif rate >= 75:
            print(f"{bcolors.WARNING}⚠️  GOOD - MOSTLY READY{bcolors.ENDC}")
            print(f"{bcolors.WARNING}Minor issues detected. Review failures before deploying.{bcolors.ENDC}")
            deployment_ready = True
        elif rate >= 50:
            print(f"{bcolors.WARNING}⚠️  FAIR - NEEDS ATTENTION{bcolors.ENDC}")
            print(f"{bcolors.WARNING}Several issues detected. Fix critical failures before deploying.{bcolors.ENDC}")
            deployment_ready = False
        else:
            print(f"{bcolors.FAIL}❌ POOR - NOT READY{bcolors.ENDC}")
            print(f"{bcolors.FAIL}Critical issues prevent deployment. Fix all failures first.{bcolors.ENDC}")
            deployment_ready = False
        
        print(f"\n{bcolors.BOLD}NEXT STEPS:{bcolors.ENDC}")
        if deployment_ready:
            print(f"{bcolors.OKGREEN}1. Update Square Production credentials{bcolors.ENDC}")
            print(f"{bcolors.OKGREEN}2. Deploy to Vercel{bcolors.ENDC}")
            print(f"{bcolors.OKGREEN}3. Run post-deployment verification{bcolors.ENDC}")
        else:
            print(f"{bcolors.WARNING}1. Review failed tests above{bcolors.ENDC}")
            print(f"{bcolors.WARNING}2. Fix critical issues{bcolors.ENDC}")
            print(f"{bcolors.WARNING}3. Re-run this verification{bcolors.ENDC}")
        
        return deployment_ready

if __name__ == "__main__":
    print(f"{bcolors.BOLD}{bcolors.OKBLUE}")
    print("""
    ╔══════════════════════════════════════════════════════════╗
    ║  FINAL PRODUCTION VERIFICATION - COMPREHENSIVE TEST      ║
    ║  Taste of Gratitude E-commerce Platform                 ║
    ╚══════════════════════════════════════════════════════════╝
    """)
    print(f"{bcolors.ENDC}")
    
    print(f"Target: {BASE_URL}")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')}")
    
    verifier = ProductionVerifier()
    verifier.run_all_tests()
    deployment_ready = verifier.print_final_summary()
    
    sys.exit(0 if deployment_ready else 1)
