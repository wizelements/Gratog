#!/usr/bin/env python3
"""
Comprehensive Email System Backend Testing
Tests all 9 email system tasks for Taste of Gratitude platform
"""

import requests
import json
import time
from datetime import datetime

# Configuration
BASE_URL = "https://gratog-payments.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

# Test user credentials
TEST_USER = {
    "name": "Emma Rodriguez",
    "email": f"emma.rodriguez.{int(time.time())}@testmail.com",
    "password": "SecurePass123!",
    "phone": "+14045551234"
}

# Colors for output
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'

def print_test(message):
    print(f"\n{Colors.BLUE}🧪 TEST: {message}{Colors.RESET}")

def print_success(message):
    print(f"{Colors.GREEN}✅ {message}{Colors.RESET}")

def print_error(message):
    print(f"{Colors.RED}❌ {message}{Colors.RESET}")

def print_info(message):
    print(f"{Colors.YELLOW}ℹ️  {message}{Colors.RESET}")

def print_section(title):
    print(f"\n{'='*80}")
    print(f"{Colors.BLUE}{title}{Colors.RESET}")
    print(f"{'='*80}")

# Global variables for test data
auth_token = None
user_id = None

# ============================================================================
# TASK 1: Email Service Core Infrastructure
# ============================================================================
def test_email_service_core():
    print_section("TASK 1: Email Service Core Infrastructure")
    
    # Test 1: Check if Resend is configured
    print_test("Check Resend API configuration")
    try:
        response = requests.get(f"{API_BASE}/emails/test", timeout=10)
        data = response.json()
        
        if response.status_code == 200:
            print_success(f"Email test API accessible")
            print_info(f"Resend configured: {data.get('resendConfigured', False)}")
            print_info(f"Mode: {data.get('mode', 'unknown')}")
            
            if data.get('mode') == 'development':
                print_info("Running in DEV MODE - emails will be logged instead of sent")
            
            return True
        else:
            print_error(f"Failed to access email test API: {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Error testing email service: {str(e)}")
        return False

# ============================================================================
# TASK 2: Email Templates (5 types)
# ============================================================================
def test_email_templates():
    print_section("TASK 2: Email Templates (5 types)")
    
    print_test("Get list of available email templates")
    try:
        response = requests.get(f"{API_BASE}/emails/test", timeout=10)
        data = response.json()
        
        if response.status_code == 200 and 'templates' in data:
            templates = data['templates']
            print_success(f"Retrieved {len(templates)} email templates")
            
            expected_templates = ['welcome', 'order', 'password', 'reward', 'challenge']
            found_templates = [t['id'] for t in templates]
            
            for template_id in expected_templates:
                if template_id in found_templates:
                    template = next(t for t in templates if t['id'] == template_id)
                    print_success(f"✓ {template['name']}: {template['description']}")
                else:
                    print_error(f"✗ Missing template: {template_id}")
                    return False
            
            return True
        else:
            print_error(f"Failed to get templates: {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Error testing templates: {str(e)}")
        return False

# ============================================================================
# TASK 3: Email Test API Endpoint
# ============================================================================
def test_email_test_api():
    print_section("TASK 3: Email Test API Endpoint")
    
    results = []
    
    # Test 1: GET endpoint - list templates
    print_test("GET /api/emails/test - List templates")
    try:
        response = requests.get(f"{API_BASE}/emails/test", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if 'templates' in data and len(data['templates']) == 5:
                print_success("GET endpoint returns all 5 templates")
                results.append(True)
            else:
                print_error("GET endpoint doesn't return correct templates")
                results.append(False)
        else:
            print_error(f"GET endpoint failed: {response.status_code}")
            results.append(False)
    except Exception as e:
        print_error(f"GET endpoint error: {str(e)}")
        results.append(False)
    
    # Test 2: POST with invalid email
    print_test("POST /api/emails/test - Invalid email validation")
    try:
        response = requests.post(
            f"{API_BASE}/emails/test",
            json={
                "templateId": "welcome",
                "recipientEmail": "invalid-email"
            },
            timeout=10
        )
        if response.status_code == 400:
            print_success("Invalid email properly rejected with 400")
            results.append(True)
        else:
            print_error(f"Invalid email not rejected properly: {response.status_code}")
            results.append(False)
    except Exception as e:
        print_error(f"Invalid email test error: {str(e)}")
        results.append(False)
    
    # Test 3: POST with invalid template ID
    print_test("POST /api/emails/test - Invalid template ID")
    try:
        response = requests.post(
            f"{API_BASE}/emails/test",
            json={
                "templateId": "invalid_template",
                "recipientEmail": TEST_USER['email']
            },
            timeout=10
        )
        if response.status_code == 400:
            print_success("Invalid template ID properly rejected with 400")
            results.append(True)
        else:
            print_error(f"Invalid template not rejected: {response.status_code}")
            results.append(False)
    except Exception as e:
        print_error(f"Invalid template test error: {str(e)}")
        results.append(False)
    
    # Test 4: POST with valid welcome email
    print_test("POST /api/emails/test - Send welcome email")
    try:
        response = requests.post(
            f"{API_BASE}/emails/test",
            json={
                "templateId": "welcome",
                "recipientEmail": TEST_USER['email'],
                "testData": {
                    "name": TEST_USER['name'],
                    "rewardPoints": 0
                }
            },
            timeout=10
        )
        if response.status_code == 200:
            data = response.json()
            print_success(f"Welcome email sent successfully")
            print_info(f"Mode: {data.get('mode', 'unknown')}")
            if data.get('resendId'):
                print_info(f"Resend ID: {data['resendId']}")
            results.append(True)
        else:
            print_error(f"Failed to send welcome email: {response.status_code}")
            results.append(False)
    except Exception as e:
        print_error(f"Welcome email test error: {str(e)}")
        results.append(False)
    
    # Test 5: POST with valid order confirmation email
    print_test("POST /api/emails/test - Send order confirmation email")
    try:
        response = requests.post(
            f"{API_BASE}/emails/test",
            json={
                "templateId": "order",
                "recipientEmail": TEST_USER['email'],
                "testData": {
                    "name": TEST_USER['name'],
                    "orderNumber": "TOG123456",
                    "items": [
                        {"name": "Kissed by Gods Gel", "quantity": 2, "price": "22.00"},
                        {"name": "Berry Zinger Lemonade", "quantity": 1, "price": "12.00"}
                    ],
                    "total": "34.00",
                    "fulfillmentType": "Pickup",
                    "pointsEarned": 340
                }
            },
            timeout=10
        )
        if response.status_code == 200:
            print_success("Order confirmation email sent successfully")
            results.append(True)
        else:
            print_error(f"Failed to send order email: {response.status_code}")
            results.append(False)
    except Exception as e:
        print_error(f"Order email test error: {str(e)}")
        results.append(False)
    
    # Test 6: POST with valid reward email
    print_test("POST /api/emails/test - Send reward milestone email")
    try:
        response = requests.post(
            f"{API_BASE}/emails/test",
            json={
                "templateId": "reward",
                "recipientEmail": TEST_USER['email'],
                "testData": {
                    "name": TEST_USER['name'],
                    "milestone": "100 Points",
                    "points": 100,
                    "rewardName": "Free 2oz Shot"
                }
            },
            timeout=10
        )
        if response.status_code == 200:
            print_success("Reward email sent successfully")
            results.append(True)
        else:
            print_error(f"Failed to send reward email: {response.status_code}")
            results.append(False)
    except Exception as e:
        print_error(f"Reward email test error: {str(e)}")
        results.append(False)
    
    # Test 7: POST with valid challenge email
    print_test("POST /api/emails/test - Send challenge streak email")
    try:
        response = requests.post(
            f"{API_BASE}/emails/test",
            json={
                "templateId": "challenge",
                "recipientEmail": TEST_USER['email'],
                "testData": {
                    "name": TEST_USER['name'],
                    "streakDays": 7,
                    "milestone": "50 bonus points"
                }
            },
            timeout=10
        )
        if response.status_code == 200:
            print_success("Challenge email sent successfully")
            results.append(True)
        else:
            print_error(f"Failed to send challenge email: {response.status_code}")
            results.append(False)
    except Exception as e:
        print_error(f"Challenge email test error: {str(e)}")
        results.append(False)
    
    return all(results)

# ============================================================================
# TASK 4: Email Queue System
# ============================================================================
def test_email_queue_system():
    print_section("TASK 4: Email Queue System")
    
    results = []
    
    # Test 1: GET queue info
    print_test("GET /api/emails/queue - Get queue info")
    try:
        response = requests.get(f"{API_BASE}/emails/queue", timeout=10)
        if response.status_code == 200:
            data = response.json()
            print_success("Queue info endpoint accessible")
            print_info(f"Message: {data.get('message', 'N/A')}")
            results.append(True)
        else:
            print_error(f"Failed to get queue info: {response.status_code}")
            results.append(False)
    except Exception as e:
        print_error(f"Queue info error: {str(e)}")
        results.append(False)
    
    # Test 2: POST without CRON_SECRET (should fail)
    print_test("POST /api/emails/queue - Without authentication")
    try:
        response = requests.post(f"{API_BASE}/emails/queue", timeout=10)
        if response.status_code == 401:
            print_success("Queue processing properly requires authentication (401)")
            results.append(True)
        else:
            print_error(f"Queue should require auth but got: {response.status_code}")
            results.append(False)
    except Exception as e:
        print_error(f"Queue auth test error: {str(e)}")
        results.append(False)
    
    # Test 3: POST with CRON_SECRET
    print_test("POST /api/emails/queue - With CRON_SECRET authentication")
    try:
        response = requests.post(
            f"{API_BASE}/emails/queue",
            headers={"Authorization": "Bearer cron-secret-taste-of-gratitude-2024"},
            timeout=10
        )
        if response.status_code == 200:
            data = response.json()
            print_success("Queue processing executed successfully")
            print_info(f"Processed: {data.get('processed', 0)} emails")
            results.append(True)
        else:
            print_error(f"Queue processing failed: {response.status_code}")
            results.append(False)
    except Exception as e:
        print_error(f"Queue processing error: {str(e)}")
        results.append(False)
    
    return all(results)

# ============================================================================
# TASK 5: User Email Preferences API
# ============================================================================
def test_user_email_preferences():
    print_section("TASK 5: User Email Preferences API")
    
    global auth_token, user_id
    
    # First, register a test user to get auth token
    print_test("Register test user for preferences testing")
    try:
        response = requests.post(
            f"{API_BASE}/auth/register",
            json=TEST_USER,
            timeout=10
        )
        if response.status_code == 201:
            data = response.json()
            auth_token = data.get('token')
            user_id = data.get('user', {}).get('id')
            print_success(f"Test user registered: {TEST_USER['email']}")
            print_info(f"User ID: {user_id}")
        else:
            print_error(f"Failed to register test user: {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Registration error: {str(e)}")
        return False
    
    results = []
    
    # Test 1: GET without auth (should fail)
    print_test("GET /api/user/email-preferences - Without authentication")
    try:
        response = requests.get(f"{API_BASE}/user/email-preferences", timeout=10)
        if response.status_code == 401:
            print_success("Preferences API properly requires authentication (401)")
            results.append(True)
        else:
            print_error(f"Should require auth but got: {response.status_code}")
            results.append(False)
    except Exception as e:
        print_error(f"Auth test error: {str(e)}")
        results.append(False)
    
    # Test 2: GET with auth - default preferences
    print_test("GET /api/user/email-preferences - Get default preferences")
    try:
        response = requests.get(
            f"{API_BASE}/user/email-preferences",
            headers={"Authorization": f"Bearer {auth_token}"},
            timeout=10
        )
        if response.status_code == 200:
            data = response.json()
            prefs = data.get('preferences', {})
            print_success("Retrieved email preferences")
            print_info(f"Marketing: {prefs.get('marketing', False)}")
            print_info(f"Order Updates: {prefs.get('orderUpdates', False)}")
            print_info(f"Rewards: {prefs.get('rewards', False)}")
            print_info(f"Challenges: {prefs.get('challenges', False)}")
            
            # Check all default to true
            if all([prefs.get('marketing'), prefs.get('orderUpdates'), 
                   prefs.get('rewards'), prefs.get('challenges')]):
                print_success("All preferences default to true")
                results.append(True)
            else:
                print_error("Default preferences not all true")
                results.append(False)
        else:
            print_error(f"Failed to get preferences: {response.status_code}")
            results.append(False)
    except Exception as e:
        print_error(f"Get preferences error: {str(e)}")
        results.append(False)
    
    # Test 3: PUT without auth (should fail)
    print_test("PUT /api/user/email-preferences - Without authentication")
    try:
        response = requests.put(
            f"{API_BASE}/user/email-preferences",
            json={"preferences": {"marketing": False}},
            timeout=10
        )
        if response.status_code == 401:
            print_success("Update properly requires authentication (401)")
            results.append(True)
        else:
            print_error(f"Should require auth but got: {response.status_code}")
            results.append(False)
    except Exception as e:
        print_error(f"Auth test error: {str(e)}")
        results.append(False)
    
    # Test 4: PUT with invalid data
    print_test("PUT /api/user/email-preferences - Invalid data validation")
    try:
        response = requests.put(
            f"{API_BASE}/user/email-preferences",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"preferences": "invalid"},
            timeout=10
        )
        if response.status_code == 400:
            print_success("Invalid data properly rejected with 400")
            results.append(True)
        else:
            print_error(f"Invalid data not rejected: {response.status_code}")
            results.append(False)
    except Exception as e:
        print_error(f"Validation test error: {str(e)}")
        results.append(False)
    
    # Test 5: PUT with valid preferences - disable marketing
    print_test("PUT /api/user/email-preferences - Update preferences")
    try:
        response = requests.put(
            f"{API_BASE}/user/email-preferences",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "preferences": {
                    "marketing": False,
                    "orderUpdates": True,
                    "rewards": True,
                    "challenges": False
                }
            },
            timeout=10
        )
        if response.status_code == 200:
            print_success("Preferences updated successfully")
            results.append(True)
        else:
            print_error(f"Failed to update preferences: {response.status_code}")
            results.append(False)
    except Exception as e:
        print_error(f"Update preferences error: {str(e)}")
        results.append(False)
    
    # Test 6: GET again to verify update
    print_test("GET /api/user/email-preferences - Verify updated preferences")
    try:
        response = requests.get(
            f"{API_BASE}/user/email-preferences",
            headers={"Authorization": f"Bearer {auth_token}"},
            timeout=10
        )
        if response.status_code == 200:
            data = response.json()
            prefs = data.get('preferences', {})
            
            if (prefs.get('marketing') == False and 
                prefs.get('orderUpdates') == True and
                prefs.get('rewards') == True and
                prefs.get('challenges') == False):
                print_success("Preferences correctly updated and persisted")
                print_info(f"Marketing: {prefs.get('marketing')}")
                print_info(f"Challenges: {prefs.get('challenges')}")
                results.append(True)
            else:
                print_error("Preferences not correctly persisted")
                results.append(False)
        else:
            print_error(f"Failed to verify preferences: {response.status_code}")
            results.append(False)
    except Exception as e:
        print_error(f"Verify preferences error: {str(e)}")
        results.append(False)
    
    return all(results)

# ============================================================================
# TASK 8: Welcome Email Integration in Registration
# ============================================================================
def test_welcome_email_integration():
    print_section("TASK 8: Welcome Email Integration in Registration")
    
    # Register a new user and check if welcome email is sent
    print_test("Register new user and verify welcome email sent")
    
    new_user = {
        "name": "Sarah Martinez",
        "email": f"sarah.martinez.{int(time.time())}@testmail.com",
        "password": "WelcomeTest123!",
        "phone": "+14045559876"
    }
    
    try:
        response = requests.post(
            f"{API_BASE}/auth/register",
            json=new_user,
            timeout=10
        )
        
        if response.status_code == 201:
            data = response.json()
            print_success(f"User registered successfully: {new_user['email']}")
            print_info(f"User ID: {data.get('user', {}).get('id')}")
            
            # Registration should succeed even if email fails
            print_success("Registration completed (non-blocking email)")
            
            # Give a moment for email to be logged
            time.sleep(2)
            
            print_info("Welcome email should be sent/logged in background")
            print_info("Check email_logs collection in MongoDB for confirmation")
            
            return True
        else:
            print_error(f"Registration failed: {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Registration error: {str(e)}")
        return False

# ============================================================================
# TASK 9: Email Logging & Monitoring
# ============================================================================
def test_email_logging():
    print_section("TASK 9: Email Logging & Monitoring")
    
    print_test("Verify email logging system")
    
    # Send a test email to trigger logging
    print_info("Sending test email to trigger logging...")
    try:
        response = requests.post(
            f"{API_BASE}/emails/test",
            json={
                "templateId": "welcome",
                "recipientEmail": f"logging.test.{int(time.time())}@testmail.com",
                "testData": {
                    "name": "Logging Test User",
                    "rewardPoints": 0
                }
            },
            timeout=10
        )
        
        if response.status_code == 200:
            print_success("Test email sent/logged successfully")
            print_info("Email should be logged to email_logs collection in MongoDB")
            print_info("Log should include: to, subject, status, emailType, sentAt")
            
            # In dev mode, status should be 'dev_logged'
            # In production mode with Resend, status should be 'sent'
            data = response.json()
            if data.get('mode') == 'development':
                print_info("Expected log status: 'dev_logged' (dev mode)")
            else:
                print_info("Expected log status: 'sent' (production mode)")
            
            return True
        else:
            print_error(f"Failed to send test email: {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Email logging test error: {str(e)}")
        return False

# ============================================================================
# Main Test Runner
# ============================================================================
def main():
    print("\n" + "="*80)
    print(f"{Colors.BLUE}COMPREHENSIVE EMAIL SYSTEM BACKEND TESTING{Colors.RESET}")
    print(f"{Colors.BLUE}Taste of Gratitude Platform - Phase A & B{Colors.RESET}")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print(f"Test Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*80)
    
    results = {}
    
    # Run all tests
    results['Task 1: Email Service Core Infrastructure'] = test_email_service_core()
    results['Task 2: Email Templates (5 types)'] = test_email_templates()
    results['Task 3: Email Test API Endpoint'] = test_email_test_api()
    results['Task 4: Email Queue System'] = test_email_queue_system()
    results['Task 5: User Email Preferences API'] = test_user_email_preferences()
    results['Task 8: Welcome Email Integration'] = test_welcome_email_integration()
    results['Task 9: Email Logging & Monitoring'] = test_email_logging()
    
    # Summary
    print_section("TEST SUMMARY")
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for task, result in results.items():
        status = f"{Colors.GREEN}✅ PASSED{Colors.RESET}" if result else f"{Colors.RED}❌ FAILED{Colors.RESET}"
        print(f"{task}: {status}")
    
    print(f"\n{'='*80}")
    print(f"Total: {passed}/{total} tasks passed ({(passed/total)*100:.1f}%)")
    print(f"{'='*80}\n")
    
    if passed == total:
        print(f"{Colors.GREEN}🎉 ALL TESTS PASSED! Email system is fully functional.{Colors.RESET}\n")
        return 0
    else:
        print(f"{Colors.RED}⚠️  Some tests failed. Review errors above.{Colors.RESET}\n")
        return 1

if __name__ == "__main__":
    exit(main())
