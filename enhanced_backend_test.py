#!/usr/bin/env python3
"""
Enhanced Backend API Testing - Post-Refactoring Validation
Focus: Testing cleaned up and enhanced Taste of Gratitude backend APIs

TESTING SCOPE (as per review request):
1. Product API - Enhanced product structure with Square product URLs, reward points, and categories
2. Coupon System - Spin wheel coupons, validation, and redemption APIs  
3. Health Checks - System monitoring endpoints
4. Database Operations - MongoDB connections and basic CRUD operations
5. Error Handling - Graceful fallbacks and error responses

SPECIFIC ENDPOINTS:
- /api/health - System health monitoring
- /api/coupons/create - Spin wheel coupon creation
- /api/coupons/validate - Coupon validation logic
- Product data structure and reward points calculation
- Database connectivity and basic operations
"""

import requests
import json
import time
import sys
import os
from datetime import datetime

# Configuration
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://square-payments-2.preview.emergentagent.com')
API_BASE = f"{BASE_URL}/api"

class EnhancedBackendTester:
    def __init__(self):
        self.results = []
        self.total_tests = 0
        self.passed_tests = 0
        
    def log_result(self, test_name, success, message, response_time=None):
        """Log test result"""
        self.total_tests += 1
        if success:
            self.passed_tests += 1
            
        result = {
            'test': test_name,
            'success': success,
            'message': message,
            'response_time': response_time,
            'timestamp': datetime.now().isoformat()
        }
        self.results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        time_info = f" ({response_time}ms)" if response_time else ""
        print(f"{status}: {test_name}{time_info}")
        if not success:
            print(f"   {message}")
        
    def test_health_endpoint(self):
        """Test /api/health - System health monitoring"""
        print("\n🔍 Testing Health Check Endpoint...")
        
        try:
            start_time = time.time()
            response = requests.get(f"{API_BASE}/health", timeout=10)
            response_time = int((time.time() - start_time) * 1000)
            
            if response.status_code == 200:
                data = response.json()
                
                # Check required fields
                required_fields = ['status', 'timestamp', 'services']
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    services = data.get('services', {})
                    database_status = services.get('database', 'unknown')
                    square_status = services.get('square_api', 'unknown')
                    
                    self.log_result(
                        "Health Endpoint - Structure & Response", 
                        True, 
                        f"Status: {data['status']}, Database: {database_status}, Square: {square_status}",
                        response_time
                    )
                    
                    # Test performance
                    if response_time < 2000:
                        self.log_result(
                            "Health Endpoint - Performance", 
                            True, 
                            f"Response time {response_time}ms within acceptable limits",
                            response_time
                        )
                    else:
                        self.log_result(
                            "Health Endpoint - Performance", 
                            False, 
                            f"Response time {response_time}ms exceeds 2s threshold",
                            response_time
                        )
                else:
                    self.log_result(
                        "Health Endpoint - Structure", 
                        False, 
                        f"Missing required fields: {missing_fields}",
                        response_time
                    )
            else:
                self.log_result(
                    "Health Endpoint - Availability", 
                    False, 
                    f"HTTP {response.status_code}: {response.text[:200]}",
                    response_time
                )
                
        except requests.exceptions.RequestException as e:
            self.log_result(
                "Health Endpoint - Connectivity", 
                False, 
                f"Connection error: {str(e)}"
            )
    
    def test_coupon_system(self):
        """Test coupon creation and validation APIs"""
        print("\n🎯 Testing Coupon System...")
        
        # Test coupon creation
        try:
            coupon_data = {
                "customerEmail": "test.enhanced@example.com",
                "discountAmount": 200,  # $2.00 in cents
                "freeShipping": False,
                "type": "spin_wheel",
                "source": "enhanced_testing"
            }
            
            start_time = time.time()
            response = requests.post(
                f"{API_BASE}/coupons/create", 
                json=coupon_data,
                timeout=10
            )
            response_time = int((time.time() - start_time) * 1000)
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get('success') and 'coupon' in data:
                    coupon = data['coupon']
                    self.created_coupon_code = coupon['code']
                    self.created_customer_email = coupon_data['customerEmail']
                    
                    self.log_result(
                        "Coupon Creation - Valid Request", 
                        True, 
                        f"Created coupon {coupon['code']} with ${coupon['discountAmount']/100:.2f} discount",
                        response_time
                    )
                else:
                    self.log_result(
                        "Coupon Creation - Response Format", 
                        False, 
                        f"Invalid response format: {data}",
                        response_time
                    )
            else:
                self.log_result(
                    "Coupon Creation - API Response", 
                    False, 
                    f"HTTP {response.status_code}: {response.text[:200]}",
                    response_time
                )
                
        except requests.exceptions.RequestException as e:
            self.log_result(
                "Coupon Creation - Connectivity", 
                False, 
                f"Connection error: {str(e)}"
            )
        
        # Test coupon validation
        if hasattr(self, 'created_coupon_code'):
            try:
                validation_data = {
                    "couponCode": self.created_coupon_code,
                    "customerEmail": self.created_customer_email,
                    "orderTotal": 3500  # $35.00 in cents
                }
                
                start_time = time.time()
                response = requests.post(
                    f"{API_BASE}/coupons/validate", 
                    json=validation_data,
                    timeout=10
                )
                response_time = int((time.time() - start_time) * 1000)
                
                if response.status_code == 200:
                    data = response.json()
                    
                    if data.get('valid') and 'coupon' in data and 'discount' in data:
                        discount_amount = data['discount']['amount']
                        self.log_result(
                            "Coupon Validation - Valid Coupon", 
                            True, 
                            f"Validated coupon with ${discount_amount/100:.2f} discount",
                            response_time
                        )
                    else:
                        self.log_result(
                            "Coupon Validation - Response Structure", 
                            False, 
                            f"Invalid validation response: {data}",
                            response_time
                        )
                else:
                    self.log_result(
                        "Coupon Validation - API Response", 
                        False, 
                        f"HTTP {response.status_code}: {response.text[:200]}",
                        response_time
                    )
                    
            except requests.exceptions.RequestException as e:
                self.log_result(
                    "Coupon Validation - Connectivity", 
                    False, 
                    f"Connection error: {str(e)}"
                )
        
        # Test invalid coupon validation
        try:
            invalid_validation = {
                "couponCode": "INVALID123",
                "customerEmail": "test@example.com",
                "orderTotal": 3500
            }
            
            start_time = time.time()
            response = requests.post(
                f"{API_BASE}/coupons/validate", 
                json=invalid_validation,
                timeout=10
            )
            response_time = int((time.time() - start_time) * 1000)
            
            if response.status_code == 200:
                data = response.json()
                
                if not data.get('valid') and 'error' in data:
                    self.log_result(
                        "Coupon Validation - Invalid Coupon Handling", 
                        True, 
                        f"Correctly rejected invalid coupon: {data['error']}",
                        response_time
                    )
                else:
                    self.log_result(
                        "Coupon Validation - Invalid Coupon Handling", 
                        False, 
                        f"Should reject invalid coupon: {data}",
                        response_time
                    )
            else:
                self.log_result(
                    "Coupon Validation - Invalid Coupon Handling", 
                    False, 
                    f"HTTP {response.status_code}: {response.text[:200]}",
                    response_time
                )
                
        except requests.exceptions.RequestException as e:
            self.log_result(
                "Coupon Validation - Invalid Coupon Test", 
                False, 
                f"Connection error: {str(e)}"
            )
    
    def test_product_structure(self):
        """Test enhanced product structure with Square URLs and reward points"""
        print("\n📦 Testing Enhanced Product Structure...")
        
        try:
            # Add the lib directory to Python path
            sys.path.insert(0, '/app')
            
            from lib.products import PRODUCTS, calculateRewardPoints, getProductsByCategory, PRODUCT_CATEGORIES
            
            if len(PRODUCTS) > 0:
                sample_product = PRODUCTS[0]
                
                # Check enhanced fields
                enhanced_fields = ['squareProductUrl', 'rewardPoints', 'category', 'stock']
                missing_fields = [field for field in enhanced_fields if field not in sample_product]
                
                if not missing_fields:
                    self.log_result(
                        "Product Structure - Enhanced Fields", 
                        True, 
                        f"All enhanced fields present: Square URL, reward points ({sample_product['rewardPoints']}), category ({sample_product['category']}), stock ({sample_product['stock']})"
                    )
                else:
                    self.log_result(
                        "Product Structure - Enhanced Fields", 
                        False, 
                        f"Missing enhanced fields: {missing_fields}"
                    )
                
                # Test Square product URLs
                products_with_square_urls = [p for p in PRODUCTS if p.get('squareProductUrl', '').startswith('https://square.link/')]
                
                if len(products_with_square_urls) > 0:
                    self.log_result(
                        "Product Structure - Square Integration", 
                        True, 
                        f"{len(products_with_square_urls)} of {len(PRODUCTS)} products have valid Square URLs"
                    )
                else:
                    self.log_result(
                        "Product Structure - Square Integration", 
                        False, 
                        "No products have valid Square product URLs"
                    )
                
                # Test reward points calculation
                test_product_ids = [PRODUCTS[0]['id'], PRODUCTS[1]['id']] if len(PRODUCTS) > 1 else [PRODUCTS[0]['id']]
                total_points = calculateRewardPoints(test_product_ids)
                
                if total_points > 0:
                    self.log_result(
                        "Product Structure - Reward Points Calculation", 
                        True, 
                        f"Reward points calculation working: {total_points} points for {len(test_product_ids)} products"
                    )
                else:
                    self.log_result(
                        "Product Structure - Reward Points Calculation", 
                        False, 
                        f"Reward points calculation returned 0"
                    )
                
                # Test category system
                categories = list(PRODUCT_CATEGORIES.keys())
                category_counts = {cat: len(getProductsByCategory(cat)) for cat in categories}
                total_categorized = sum(category_counts.values())
                
                if total_categorized > 0:
                    category_summary = ', '.join([f"{count} {cat}" for cat, count in category_counts.items() if count > 0])
                    self.log_result(
                        "Product Structure - Category System", 
                        True, 
                        f"Category filtering working: {category_summary}"
                    )
                else:
                    self.log_result(
                        "Product Structure - Category System", 
                        False, 
                        "No products found in any category"
                    )
                    
            else:
                self.log_result(
                    "Product Structure - Data Availability", 
                    False, 
                    "No products found in PRODUCTS array"
                )
                
        except ImportError as e:
            self.log_result(
                "Product Structure - Module Import", 
                False, 
                f"Could not import products module: {str(e)}"
            )
        except Exception as e:
            self.log_result(
                "Product Structure - General Test", 
                False, 
                f"Error testing product structure: {str(e)}"
            )
    
    def test_database_operations(self):
        """Test MongoDB connections and basic CRUD operations"""
        print("\n🗄️ Testing Database Operations...")
        
        # Test basic database operations via status endpoint
        try:
            test_data = {
                "client_name": "enhanced_backend_test"
            }
            
            start_time = time.time()
            response = requests.post(
                f"{API_BASE}/status", 
                json=test_data,
                timeout=10
            )
            response_time = int((time.time() - start_time) * 1000)
            
            if response.status_code == 200:
                data = response.json()
                
                if 'id' in data and 'client_name' in data and 'timestamp' in data:
                    self.log_result(
                        "Database Operations - CREATE Operation", 
                        True, 
                        f"Successfully created record with ID: {data['id'][:8]}...",
                        response_time
                    )
                    
                    # Test READ operation
                    try:
                        start_time = time.time()
                        read_response = requests.get(f"{API_BASE}/status", timeout=10)
                        read_response_time = int((time.time() - start_time) * 1000)
                        
                        if read_response.status_code == 200:
                            read_data = read_response.json()
                            
                            if isinstance(read_data, list) and len(read_data) > 0:
                                test_record = next((r for r in read_data if r.get('client_name') == 'enhanced_backend_test'), None)
                                
                                if test_record:
                                    self.log_result(
                                        "Database Operations - READ Operation", 
                                        True, 
                                        f"Successfully retrieved {len(read_data)} records, found test record",
                                        read_response_time
                                    )
                                else:
                                    self.log_result(
                                        "Database Operations - READ Operation", 
                                        False, 
                                        f"Test record not found in {len(read_data)} records",
                                        read_response_time
                                    )
                            else:
                                self.log_result(
                                    "Database Operations - READ Operation", 
                                    False, 
                                    f"Invalid read response: {read_data}",
                                    read_response_time
                                )
                        else:
                            self.log_result(
                                "Database Operations - READ Operation", 
                                False, 
                                f"HTTP {read_response.status_code}: {read_response.text[:200]}",
                                read_response_time
                            )
                            
                    except requests.exceptions.RequestException as e:
                        self.log_result(
                            "Database Operations - READ Operation", 
                            False, 
                            f"Connection error: {str(e)}"
                        )
                        
                else:
                    self.log_result(
                        "Database Operations - CREATE Operation", 
                        False, 
                        f"Invalid response structure: {data}",
                        response_time
                    )
            else:
                self.log_result(
                    "Database Operations - CREATE Operation", 
                    False, 
                    f"HTTP {response.status_code}: {response.text[:200]}",
                    response_time
                )
                
        except requests.exceptions.RequestException as e:
            self.log_result(
                "Database Operations - Connectivity", 
                False, 
                f"Connection error: {str(e)}"
            )
    
    def test_error_handling(self):
        """Test graceful fallbacks and error responses"""
        print("\n🛡️ Testing Error Handling...")
        
        # Test 404 handling
        try:
            start_time = time.time()
            response = requests.get(f"{API_BASE}/nonexistent-endpoint", timeout=10)
            response_time = int((time.time() - start_time) * 1000)
            
            if response.status_code == 404:
                try:
                    data = response.json()
                    if 'error' in data:
                        self.log_result(
                            "Error Handling - 404 Not Found", 
                            True, 
                            f"Correctly returned 404 with error message",
                            response_time
                        )
                    else:
                        self.log_result(
                            "Error Handling - 404 Not Found", 
                            False, 
                            f"404 response missing error field",
                            response_time
                        )
                except json.JSONDecodeError:
                    self.log_result(
                        "Error Handling - 404 Not Found", 
                        False, 
                        "404 response is not valid JSON",
                        response_time
                    )
            else:
                self.log_result(
                    "Error Handling - 404 Not Found", 
                    False, 
                    f"Expected 404, got {response.status_code}",
                    response_time
                )
                
        except requests.exceptions.RequestException as e:
            self.log_result(
                "Error Handling - 404 Test", 
                False, 
                f"Connection error: {str(e)}"
            )
        
        # Test input validation
        try:
            invalid_data = {}  # Missing required fields
            
            start_time = time.time()
            response = requests.post(
                f"{API_BASE}/coupons/create", 
                json=invalid_data,
                timeout=10
            )
            response_time = int((time.time() - start_time) * 1000)
            
            if response.status_code == 400:
                self.log_result(
                    "Error Handling - Input Validation", 
                    True, 
                    "Correctly rejected invalid input with 400 status",
                    response_time
                )
            else:
                self.log_result(
                    "Error Handling - Input Validation", 
                    False, 
                    f"Expected 400 for invalid input, got {response.status_code}",
                    response_time
                )
                
        except requests.exceptions.RequestException as e:
            self.log_result(
                "Error Handling - Input Validation Test", 
                False, 
                f"Connection error: {str(e)}"
            )
        
        # Test CORS headers
        try:
            start_time = time.time()
            response = requests.options(f"{API_BASE}/health", timeout=10)
            response_time = int((time.time() - start_time) * 1000)
            
            cors_headers = [
                'Access-Control-Allow-Origin',
                'Access-Control-Allow-Methods',
                'Access-Control-Allow-Headers'
            ]
            
            present_headers = [header for header in cors_headers if header in response.headers]
            
            if len(present_headers) >= 2:
                self.log_result(
                    "Error Handling - CORS Headers", 
                    True, 
                    f"CORS headers present: {', '.join(present_headers)}",
                    response_time
                )
            else:
                self.log_result(
                    "Error Handling - CORS Headers", 
                    False, 
                    f"Missing CORS headers. Present: {present_headers}",
                    response_time
                )
                
        except requests.exceptions.RequestException as e:
            self.log_result(
                "Error Handling - CORS Test", 
                False, 
                f"Connection error: {str(e)}"
            )
    
    def run_enhanced_tests(self):
        """Run all enhanced backend tests"""
        print("🚀 Starting Enhanced Backend API Testing (Post-Refactoring)")
        print(f"Testing against: {API_BASE}")
        print("=" * 70)
        
        # Run focused test suites
        self.test_health_endpoint()
        self.test_coupon_system()
        self.test_product_structure()
        self.test_database_operations()
        self.test_error_handling()
        
        # Print summary
        print("\n" + "=" * 70)
        print("📊 ENHANCED BACKEND TEST SUMMARY")
        print("=" * 70)
        
        success_rate = (self.passed_tests / self.total_tests * 100) if self.total_tests > 0 else 0
        
        print(f"Total Tests: {self.total_tests}")
        print(f"Passed: {self.passed_tests}")
        print(f"Failed: {self.total_tests - self.passed_tests}")
        print(f"Success Rate: {success_rate:.1f}%")
        
        # Status assessment
        if success_rate >= 90:
            print("🎉 OVERALL STATUS: EXCELLENT - Enhanced APIs working perfectly")
        elif success_rate >= 75:
            print("✅ OVERALL STATUS: GOOD - Most enhanced APIs functional")
        elif success_rate >= 50:
            print("⚠️ OVERALL STATUS: NEEDS ATTENTION - Some issues found")
        else:
            print("❌ OVERALL STATUS: CRITICAL - Major issues detected")
        
        # Print failed tests
        failed_tests = [r for r in self.results if not r['success']]
        if failed_tests:
            print(f"\n🔍 FAILED TESTS ({len(failed_tests)}):")
            for test in failed_tests:
                print(f"❌ {test['test']}: {test['message']}")
        else:
            print("\n🎉 ALL TESTS PASSED!")
        
        return {
            'total_tests': self.total_tests,
            'passed_tests': self.passed_tests,
            'success_rate': success_rate,
            'results': self.results
        }

if __name__ == "__main__":
    tester = EnhancedBackendTester()
    results = tester.run_enhanced_tests()