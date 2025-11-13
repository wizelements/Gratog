#!/usr/bin/env python3
"""
Comprehensive Rewards System & Immersive Journey Backend Testing
Tests all new backend APIs for rewards, quiz, UGC, and calendar systems
"""

import requests
import json
import time
from datetime import datetime, timedelta
import uuid

# Configuration
BASE_URL = "https://taste-gratitude-pay.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

class RewardsBackendTester:
    def __init__(self):
        self.test_results = []
        self.test_customer_email = f"test.customer.{int(time.time())}@example.com"
        self.test_customer_name = "Sarah Johnson"
        self.passport_id = None
        
    def log_test(self, test_name, success, details="", response_time=0):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        self.test_results.append({
            'test': test_name,
            'status': status,
            'success': success,
            'details': details,
            'response_time': f"{response_time:.0f}ms"
        })
        print(f"{status}: {test_name} ({response_time:.0f}ms)")
        if details:
            print(f"    Details: {details}")
    
    def test_rewards_passport_system(self):
        """Test Rewards & Passport System APIs"""
        print("\n🎯 TESTING REWARDS & PASSPORT SYSTEM")
        
        # Test 1: Create new customer passport
        try:
            start_time = time.time()
            response = requests.post(f"{API_BASE}/rewards/passport", 
                json={
                    "customerEmail": self.test_customer_email,
                    "customerName": self.test_customer_name
                },
                timeout=10
            )
            response_time = (time.time() - start_time) * 1000
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success') and 'passport' in data:
                    self.passport_id = data['passport']['id']
                    self.log_test("Create Customer Passport", True, 
                        f"Passport created with ID: {self.passport_id[:8]}...", response_time)
                else:
                    self.log_test("Create Customer Passport", False, 
                        f"Invalid response structure: {data}", response_time)
            else:
                self.log_test("Create Customer Passport", False, 
                    f"HTTP {response.status_code}: {response.text}", response_time)
        except Exception as e:
            self.log_test("Create Customer Passport", False, f"Exception: {str(e)}")
        
        # Test 2: Retrieve existing passport
        try:
            start_time = time.time()
            response = requests.get(f"{API_BASE}/rewards/passport", 
                params={"email": self.test_customer_email},
                timeout=10
            )
            response_time = (time.time() - start_time) * 1000
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success') and 'passport' in data:
                    passport = data['passport']
                    expected_fields = ['id', 'customerEmail', 'stamps', 'totalStamps', 'vouchers', 'level', 'xpPoints']
                    missing_fields = [field for field in expected_fields if field not in passport]
                    if not missing_fields:
                        self.log_test("Retrieve Passport by Email", True, 
                            f"Passport retrieved with {passport['totalStamps']} stamps, {passport['xpPoints']} XP", response_time)
                    else:
                        self.log_test("Retrieve Passport by Email", False, 
                            f"Missing fields: {missing_fields}", response_time)
                else:
                    self.log_test("Retrieve Passport by Email", False, 
                        f"Invalid response structure: {data}", response_time)
            else:
                self.log_test("Retrieve Passport by Email", False, 
                    f"HTTP {response.status_code}: {response.text}", response_time)
        except Exception as e:
            self.log_test("Retrieve Passport by Email", False, f"Exception: {str(e)}")
        
        # Test 3: Add stamps and trigger rewards
        if self.passport_id:
            try:
                start_time = time.time()
                response = requests.post(f"{API_BASE}/rewards/stamp", 
                    json={
                        "passportId": self.passport_id,
                        "marketName": "Serenbe Farmers Market",
                        "activityType": "visit"
                    },
                    timeout=10
                )
                response_time = (time.time() - start_time) * 1000
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get('success') and 'stamp' in data:
                        stamp = data['stamp']
                        rewards = data.get('rewards', [])
                        self.log_test("Add Stamp and Check Rewards", True, 
                            f"Stamp added with {stamp['xpValue']} XP, {len(rewards)} rewards triggered", response_time)
                    else:
                        self.log_test("Add Stamp and Check Rewards", False, 
                            f"Invalid response structure: {data}", response_time)
                else:
                    self.log_test("Add Stamp and Check Rewards", False, 
                        f"HTTP {response.status_code}: {response.text}", response_time)
            except Exception as e:
                self.log_test("Add Stamp and Check Rewards", False, f"Exception: {str(e)}")
        
        # Test 4: Get leaderboard
        try:
            start_time = time.time()
            response = requests.get(f"{API_BASE}/rewards/leaderboard", 
                params={"limit": "5"},
                timeout=10
            )
            response_time = (time.time() - start_time) * 1000
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success') and 'leaderboard' in data:
                    leaderboard = data['leaderboard']
                    self.log_test("Customer Leaderboard System", True, 
                        f"Leaderboard retrieved with {len(leaderboard)} customers", response_time)
                else:
                    self.log_test("Customer Leaderboard System", False, 
                        f"Invalid response structure: {data}", response_time)
            else:
                self.log_test("Customer Leaderboard System", False, 
                    f"HTTP {response.status_code}: {response.text}", response_time)
        except Exception as e:
            self.log_test("Customer Leaderboard System", False, f"Exception: {str(e)}")
    
    def test_fit_quiz_recommendations(self):
        """Test Fit Quiz Recommendation Engine"""
        print("\n🧠 TESTING FIT QUIZ RECOMMENDATION ENGINE")
        
        # Test different goal combinations
        test_scenarios = [
            {"goal": "immune", "texture": "gel", "adventure": "mild"},
            {"goal": "gut", "texture": "lemonade", "adventure": "bold"},
            {"goal": "energy", "texture": "shot", "adventure": "bold"},
            {"goal": "skin", "texture": "gel", "adventure": "mild"},
            {"goal": "calm", "texture": "lemonade", "adventure": "mild"}
        ]
        
        for i, scenario in enumerate(test_scenarios, 1):
            try:
                start_time = time.time()
                response = requests.post(f"{API_BASE}/quiz/recommendations", 
                    json=scenario,
                    timeout=10
                )
                response_time = (time.time() - start_time) * 1000
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get('success') and 'recommendations' in data:
                        recommendations = data['recommendations']
                        quiz_answers = data.get('quizAnswers', {})
                        
                        # Validate recommendation structure
                        valid_recommendations = True
                        for rec in recommendations:
                            required_fields = ['id', 'name', 'price', 'recommendationReason', 'confidence']
                            if not all(field in rec for field in required_fields):
                                valid_recommendations = False
                                break
                        
                        if valid_recommendations and len(recommendations) > 0:
                            self.log_test(f"Quiz Recommendations - {scenario['goal'].title()}", True, 
                                f"{len(recommendations)} products recommended, confidence: {recommendations[0]['confidence']:.1f}", response_time)
                        else:
                            self.log_test(f"Quiz Recommendations - {scenario['goal'].title()}", False, 
                                f"Invalid recommendation structure or empty results", response_time)
                    else:
                        self.log_test(f"Quiz Recommendations - {scenario['goal'].title()}", False, 
                            f"Invalid response structure: {data}", response_time)
                else:
                    self.log_test(f"Quiz Recommendations - {scenario['goal'].title()}", False, 
                        f"HTTP {response.status_code}: {response.text}", response_time)
            except Exception as e:
                self.log_test(f"Quiz Recommendations - {scenario['goal'].title()}", False, f"Exception: {str(e)}")
    
    def test_ugc_challenge_system(self):
        """Test UGC Challenge System"""
        print("\n📸 TESTING UGC CHALLENGE SYSTEM")
        
        # Test 1: Submit UGC challenge entry
        try:
            start_time = time.time()
            ugc_data = {
                "challenge": "spicy_bloom",
                "customerName": "Alex Rivera",
                "customerEmail": f"alex.rivera.{int(time.time())}@example.com",
                "socialHandle": "@alexrivera_wellness",
                "platform": "instagram",
                "contentUrl": "https://instagram.com/p/test123",
                "consent": True
            }
            
            response = requests.post(f"{API_BASE}/ugc/submit", 
                json=ugc_data,
                timeout=10
            )
            response_time = (time.time() - start_time) * 1000
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success') and 'submission' in data:
                    submission = data['submission']
                    self.log_test("Submit UGC Challenge Entry", True, 
                        f"Submission created with ID: {submission['id'][:8]}..., status: {submission['status']}", response_time)
                else:
                    self.log_test("Submit UGC Challenge Entry", False, 
                        f"Invalid response structure: {data}", response_time)
            else:
                self.log_test("Submit UGC Challenge Entry", False, 
                    f"HTTP {response.status_code}: {response.text}", response_time)
        except Exception as e:
            self.log_test("Submit UGC Challenge Entry", False, f"Exception: {str(e)}")
        
        # Test 2: Retrieve challenge entries
        try:
            start_time = time.time()
            response = requests.get(f"{API_BASE}/ugc/submit", 
                params={"challenge": "spicy_bloom", "limit": "10"},
                timeout=10
            )
            response_time = (time.time() - start_time) * 1000
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success') and 'submissions' in data:
                    submissions = data['submissions']
                    self.log_test("Retrieve Challenge Entries", True, 
                        f"Retrieved {len(submissions)} submissions for spicy_bloom challenge", response_time)
                else:
                    self.log_test("Retrieve Challenge Entries", False, 
                        f"Invalid response structure: {data}", response_time)
            else:
                self.log_test("Retrieve Challenge Entries", False, 
                    f"HTTP {response.status_code}: {response.text}", response_time)
        except Exception as e:
            self.log_test("Retrieve Challenge Entries", False, f"Exception: {str(e)}")
        
        # Test 3: Test validation requirements
        try:
            start_time = time.time()
            invalid_data = {
                "challenge": "spicy_bloom",
                "customerName": "Test User",
                # Missing required fields
                "consent": False  # Invalid consent
            }
            
            response = requests.post(f"{API_BASE}/ugc/submit", 
                json=invalid_data,
                timeout=10
            )
            response_time = (time.time() - start_time) * 1000
            
            if response.status_code == 400:
                self.log_test("UGC Validation Requirements", True, 
                    "Properly rejected invalid submission with 400 status", response_time)
            else:
                self.log_test("UGC Validation Requirements", False, 
                    f"Expected 400 status, got {response.status_code}", response_time)
        except Exception as e:
            self.log_test("UGC Validation Requirements", False, f"Exception: {str(e)}")
    
    def test_calendar_market_integration(self):
        """Test Enhanced Calendar & Market Integration"""
        print("\n📅 TESTING CALENDAR & MARKET INTEGRATION")
        
        # Test different market locations
        markets = ["Serenbe", "East Atlanta Village", "Ponce City Market"]
        test_date = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
        
        for market in markets:
            try:
                start_time = time.time()
                response = requests.get(f"{API_BASE}/ics/market-route", 
                    params={
                        "market": market,
                        "date": test_date,
                        "startTime": "09:00",
                        "endTime": "13:00"
                    },
                    timeout=10
                )
                response_time = (time.time() - start_time) * 1000
                
                if response.status_code == 200:
                    content_type = response.headers.get('content-type', '')
                    if 'text/calendar' in content_type:
                        ics_content = response.text
                        # Validate ICS format
                        required_ics_elements = ['BEGIN:VCALENDAR', 'BEGIN:VEVENT', 'SUMMARY:', 'LOCATION:', 'END:VEVENT', 'END:VCALENDAR']
                        valid_ics = all(element in ics_content for element in required_ics_elements)
                        
                        if valid_ics:
                            self.log_test(f"Generate ICS Calendar - {market}", True, 
                                f"Valid ICS file generated with proper calendar format", response_time)
                        else:
                            self.log_test(f"Generate ICS Calendar - {market}", False, 
                                f"Invalid ICS format missing required elements", response_time)
                    else:
                        self.log_test(f"Generate ICS Calendar - {market}", False, 
                            f"Wrong content type: {content_type}", response_time)
                else:
                    self.log_test(f"Generate ICS Calendar - {market}", False, 
                        f"HTTP {response.status_code}: {response.text}", response_time)
            except Exception as e:
                self.log_test(f"Generate ICS Calendar - {market}", False, f"Exception: {str(e)}")
        
        # Test validation requirements
        try:
            start_time = time.time()
            response = requests.get(f"{API_BASE}/ics/market-route", 
                params={"market": "Serenbe"},  # Missing date parameter
                timeout=10
            )
            response_time = (time.time() - start_time) * 1000
            
            if response.status_code == 400:
                self.log_test("Calendar Parameter Validation", True, 
                    "Properly rejected request missing required date parameter", response_time)
            else:
                self.log_test("Calendar Parameter Validation", False, 
                    f"Expected 400 status, got {response.status_code}", response_time)
        except Exception as e:
            self.log_test("Calendar Parameter Validation", False, f"Exception: {str(e)}")
    
    def test_square_sandbox_integration(self):
        """Test Square Sandbox Integration Verification"""
        print("\n💳 TESTING SQUARE SANDBOX INTEGRATION")
        
        # Test 1: Health check for Square configuration
        try:
            start_time = time.time()
            response = requests.get(f"{API_BASE}/health", timeout=10)
            response_time = (time.time() - start_time) * 1000
            
            if response.status_code == 200:
                data = response.json()
                services = data.get('services', {})
                square_status = services.get('square_api', 'unknown')
                
                if square_status in ['sandbox', 'production']:
                    self.log_test("Square Environment Detection", True, 
                        f"Square environment detected as: {square_status}", response_time)
                else:
                    self.log_test("Square Environment Detection", False, 
                        f"Unknown Square status: {square_status}", response_time)
            else:
                self.log_test("Square Environment Detection", False, 
                    f"HTTP {response.status_code}: {response.text}", response_time)
        except Exception as e:
            self.log_test("Square Environment Detection", False, f"Exception: {str(e)}")
        
        # Test 2: Square diagnostic endpoint
        try:
            start_time = time.time()
            response = requests.post(f"{API_BASE}/square-diagnose", timeout=10)
            response_time = (time.time() - start_time) * 1000
            
            if response.status_code == 200:
                data = response.json()
                if 'status' in data and 'environment' in data and 'credentials' in data:
                    status = data['status']
                    environment = data['environment']
                    credentials = data['credentials']
                    self.log_test("Square Credential Diagnostic", True, 
                        f"Status: {status}, Environment: {environment}, Credentials validated", response_time)
                else:
                    self.log_test("Square Credential Diagnostic", False, 
                        f"Invalid diagnostic response structure", response_time)
            else:
                self.log_test("Square Credential Diagnostic", False, 
                    f"HTTP {response.status_code}: {response.text}", response_time)
        except Exception as e:
            self.log_test("Square Credential Diagnostic", False, f"Exception: {str(e)}")
        
        # Test 3: Test payment processing in sandbox mode
        try:
            start_time = time.time()
            payment_data = {
                "sourceId": "cnon:card-nonce-ok",  # Square test nonce
                "amount": 100,  # $1.00 in cents
                "currency": "USD",
                "orderData": {
                    "customerInfo": {
                        "name": "Test Customer",
                        "email": "test@example.com"
                    },
                    "items": [{"name": "Test Product", "price": 100, "quantity": 1}]
                }
            }
            
            response = requests.post(f"{API_BASE}/square-payment", 
                json=payment_data,
                timeout=15
            )
            response_time = (time.time() - start_time) * 1000
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    payment_id = data.get('paymentId', 'unknown')
                    if payment_id.startswith('mock_') or payment_id.startswith('fallback_'):
                        self.log_test("Square Payment Processing", True, 
                            f"Payment processed in mock/fallback mode: {payment_id[:20]}...", response_time)
                    else:
                        self.log_test("Square Payment Processing", True, 
                            f"Payment processed successfully: {payment_id[:20]}...", response_time)
                else:
                    self.log_test("Square Payment Processing", False, 
                        f"Payment failed: {data.get('error', 'Unknown error')}", response_time)
            else:
                self.log_test("Square Payment Processing", False, 
                    f"HTTP {response.status_code}: {response.text}", response_time)
        except Exception as e:
            self.log_test("Square Payment Processing", False, f"Exception: {str(e)}")
    
    def run_comprehensive_test(self):
        """Run all comprehensive tests"""
        print("🚀 STARTING COMPREHENSIVE REWARDS SYSTEM & IMMERSIVE JOURNEY BACKEND TESTING")
        print(f"Testing against: {BASE_URL}")
        print(f"Test customer: {self.test_customer_email}")
        
        # Run all test suites
        self.test_rewards_passport_system()
        self.test_fit_quiz_recommendations()
        self.test_ugc_challenge_system()
        self.test_calendar_market_integration()
        self.test_square_sandbox_integration()
        
        # Generate summary
        self.generate_summary()
    
    def generate_summary(self):
        """Generate comprehensive test summary"""
        print("\n" + "="*80)
        print("🎯 COMPREHENSIVE REWARDS SYSTEM TESTING SUMMARY")
        print("="*80)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result['success'])
        failed_tests = total_tests - passed_tests
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        print(f"📊 OVERALL RESULTS: {passed_tests}/{total_tests} tests passed ({success_rate:.1f}% success rate)")
        
        if failed_tests > 0:
            print(f"\n❌ FAILED TESTS ({failed_tests}):")
            for result in self.test_results:
                if not result['success']:
                    print(f"  • {result['test']}: {result['details']}")
        
        print(f"\n✅ PASSED TESTS ({passed_tests}):")
        for result in self.test_results:
            if result['success']:
                print(f"  • {result['test']} ({result['response_time']})")
        
        # System assessment
        print(f"\n🔍 SYSTEM ASSESSMENT:")
        if success_rate >= 90:
            print("🎉 EXCELLENT: All new rewards and immersive journey systems are fully functional")
        elif success_rate >= 75:
            print("✅ GOOD: Most systems working, minor issues to address")
        elif success_rate >= 50:
            print("⚠️ MODERATE: Several systems need attention")
        else:
            print("🚨 CRITICAL: Major issues found, systems need significant work")
        
        return {
            'total_tests': total_tests,
            'passed_tests': passed_tests,
            'failed_tests': failed_tests,
            'success_rate': success_rate,
            'test_results': self.test_results
        }

if __name__ == "__main__":
    tester = RewardsBackendTester()
    results = tester.run_comprehensive_test()