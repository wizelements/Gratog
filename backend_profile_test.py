#!/usr/bin/env python3
"""
Comprehensive User Profile Dashboard Backend Testing
Tests all 7 new backend APIs for User Profile & Dashboard system
"""

import requests
import json
import time
from datetime import datetime, timedelta

# Configuration
BASE_URL = "https://taste-interactive.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

# Test user credentials
TEST_USER = {
    "name": "Alex Johnson",
    "email": f"alex.johnson.{int(time.time())}@testmail.com",
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
auth_cookie = None

# ============================================================================
# SETUP: Register Test User
# ============================================================================
def setup_test_user():
    print_section("SETUP: Register Test User")
    
    global auth_token, user_id, auth_cookie
    
    print_test("Register test user for profile dashboard testing")
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
            
            # Get auth cookie from response
            if 'set-cookie' in response.headers:
                auth_cookie = response.headers['set-cookie']
            
            print_success(f"Test user registered: {TEST_USER['email']}")
            print_info(f"User ID: {user_id}")
            print_info(f"Auth Token: {auth_token[:20]}..." if auth_token else "No token")
            return True
        else:
            print_error(f"Failed to register test user: {response.status_code}")
            print_error(f"Response: {response.text}")
            return False
    except Exception as e:
        print_error(f"Registration error: {str(e)}")
        return False

# ============================================================================
# TASK 1: User Stats API
# ============================================================================
def test_user_stats_api():
    print_section("TASK 1: User Stats API (GET /api/user/stats)")
    
    results = []
    
    # Test 1: Without authentication (should fail)
    print_test("GET /api/user/stats - Without authentication")
    try:
        response = requests.get(f"{API_BASE}/user/stats", timeout=10)
        if response.status_code == 401:
            print_success("Stats API properly requires authentication (401)")
            results.append(True)
        else:
            print_error(f"Should require auth but got: {response.status_code}")
            results.append(False)
    except Exception as e:
        print_error(f"Auth test error: {str(e)}")
        results.append(False)
    
    # Test 2: With authentication - new user (should return zeros)
    print_test("GET /api/user/stats - New user stats (should be zeros)")
    try:
        cookies = {'auth_token': auth_token}
        response = requests.get(
            f"{API_BASE}/user/stats",
            cookies=cookies,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            stats = data.get('stats', {})
            
            print_success("Stats API returned successfully")
            print_info(f"Total Orders: {stats.get('totalOrders', 'N/A')}")
            print_info(f"Reward Points: {stats.get('rewardPoints', 'N/A')}")
            print_info(f"Lifetime Points: {stats.get('lifetimePoints', 'N/A')}")
            print_info(f"Streak Days: {stats.get('streakDays', 'N/A')}")
            print_info(f"Total Check-Ins: {stats.get('totalCheckIns', 'N/A')}")
            
            # Verify all stats are 0 for new user
            if (stats.get('totalOrders') == 0 and 
                stats.get('rewardPoints') == 0 and
                stats.get('lifetimePoints') == 0 and
                stats.get('streakDays') == 0 and
                stats.get('totalCheckIns') == 0):
                print_success("All stats correctly initialized to 0 for new user")
                results.append(True)
            else:
                print_error("Stats not all zero for new user")
                results.append(False)
        else:
            print_error(f"Failed to get stats: {response.status_code}")
            print_error(f"Response: {response.text}")
            results.append(False)
    except Exception as e:
        print_error(f"Stats API error: {str(e)}")
        results.append(False)
    
    return all(results)

# ============================================================================
# TASK 2: User Orders API
# ============================================================================
def test_user_orders_api():
    print_section("TASK 2: User Orders API (GET /api/user/orders)")
    
    results = []
    
    # Test 1: Without authentication (should fail)
    print_test("GET /api/user/orders - Without authentication")
    try:
        response = requests.get(f"{API_BASE}/user/orders", timeout=10)
        if response.status_code == 401:
            print_success("Orders API properly requires authentication (401)")
            results.append(True)
        else:
            print_error(f"Should require auth but got: {response.status_code}")
            results.append(False)
    except Exception as e:
        print_error(f"Auth test error: {str(e)}")
        results.append(False)
    
    # Test 2: With authentication - new user (should return empty array)
    print_test("GET /api/user/orders - New user orders (should be empty)")
    try:
        cookies = {'auth_token': auth_token}
        response = requests.get(
            f"{API_BASE}/user/orders",
            cookies=cookies,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            orders = data.get('orders', [])
            
            print_success("Orders API returned successfully")
            print_info(f"Number of orders: {len(orders)}")
            
            if len(orders) == 0:
                print_success("Orders correctly empty for new user")
                results.append(True)
            else:
                print_error(f"Expected 0 orders but got {len(orders)}")
                results.append(False)
        else:
            print_error(f"Failed to get orders: {response.status_code}")
            print_error(f"Response: {response.text}")
            results.append(False)
    except Exception as e:
        print_error(f"Orders API error: {str(e)}")
        results.append(False)
    
    return all(results)

# ============================================================================
# TASK 3: User Rewards API
# ============================================================================
def test_user_rewards_api():
    print_section("TASK 3: User Rewards API (GET /api/user/rewards)")
    
    results = []
    
    # Test 1: Without authentication (should fail)
    print_test("GET /api/user/rewards - Without authentication")
    try:
        response = requests.get(f"{API_BASE}/user/rewards", timeout=10)
        if response.status_code == 401:
            print_success("Rewards API properly requires authentication (401)")
            results.append(True)
        else:
            print_error(f"Should require auth but got: {response.status_code}")
            results.append(False)
    except Exception as e:
        print_error(f"Auth test error: {str(e)}")
        results.append(False)
    
    # Test 2: With authentication - new user (should return default values)
    print_test("GET /api/user/rewards - New user rewards (should be defaults)")
    try:
        cookies = {'auth_token': auth_token}
        response = requests.get(
            f"{API_BASE}/user/rewards",
            cookies=cookies,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            rewards = data.get('rewards', {})
            
            print_success("Rewards API returned successfully")
            print_info(f"Points: {rewards.get('points', 'N/A')}")
            print_info(f"Lifetime Points: {rewards.get('lifetimePoints', 'N/A')}")
            print_info(f"History Length: {len(rewards.get('history', []))}")
            
            # Verify structure
            if (rewards.get('points') == 0 and 
                rewards.get('lifetimePoints') == 0 and
                isinstance(rewards.get('history'), list)):
                print_success("Rewards structure correct with default values")
                results.append(True)
            else:
                print_error("Rewards structure incorrect")
                results.append(False)
        else:
            print_error(f"Failed to get rewards: {response.status_code}")
            print_error(f"Response: {response.text}")
            results.append(False)
    except Exception as e:
        print_error(f"Rewards API error: {str(e)}")
        results.append(False)
    
    return all(results)

# ============================================================================
# TASK 4: User Challenge API
# ============================================================================
def test_user_challenge_api():
    print_section("TASK 4: User Challenge API (GET /api/user/challenge)")
    
    results = []
    
    # Test 1: Without authentication (should fail)
    print_test("GET /api/user/challenge - Without authentication")
    try:
        response = requests.get(f"{API_BASE}/user/challenge", timeout=10)
        if response.status_code == 401:
            print_success("Challenge API properly requires authentication (401)")
            results.append(True)
        else:
            print_error(f"Should require auth but got: {response.status_code}")
            results.append(False)
    except Exception as e:
        print_error(f"Auth test error: {str(e)}")
        results.append(False)
    
    # Test 2: With authentication - new user (should return defaults with canCheckIn=true)
    print_test("GET /api/user/challenge - New user challenge (canCheckIn should be true)")
    try:
        cookies = {'auth_token': auth_token}
        response = requests.get(
            f"{API_BASE}/user/challenge",
            cookies=cookies,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            challenge = data.get('challenge', {})
            
            print_success("Challenge API returned successfully")
            print_info(f"Streak Days: {challenge.get('streakDays', 'N/A')}")
            print_info(f"Last Check-In: {challenge.get('lastCheckIn', 'N/A')}")
            print_info(f"Total Check-Ins: {challenge.get('totalCheckIns', 'N/A')}")
            print_info(f"Can Check In: {challenge.get('canCheckIn', 'N/A')}")
            
            # Verify structure and canCheckIn is true for new user
            if (challenge.get('streakDays') == 0 and 
                challenge.get('totalCheckIns') == 0 and
                challenge.get('canCheckIn') == True):
                print_success("Challenge structure correct with canCheckIn=true for new user")
                results.append(True)
            else:
                print_error("Challenge structure incorrect or canCheckIn not true")
                results.append(False)
        else:
            print_error(f"Failed to get challenge: {response.status_code}")
            print_error(f"Response: {response.text}")
            results.append(False)
    except Exception as e:
        print_error(f"Challenge API error: {str(e)}")
        results.append(False)
    
    return all(results)

# ============================================================================
# TASK 5: Challenge Check-In API
# ============================================================================
def test_challenge_checkin_api():
    print_section("TASK 5: Challenge Check-In API (POST /api/user/challenge/checkin)")
    
    results = []
    
    # Test 1: Without authentication (should fail)
    print_test("POST /api/user/challenge/checkin - Without authentication")
    try:
        response = requests.post(f"{API_BASE}/user/challenge/checkin", timeout=10)
        if response.status_code == 401:
            print_success("Check-in API properly requires authentication (401)")
            results.append(True)
        else:
            print_error(f"Should require auth but got: {response.status_code}")
            results.append(False)
    except Exception as e:
        print_error(f"Auth test error: {str(e)}")
        results.append(False)
    
    # Test 2: First check-in (streak should be 1, points should be 5)
    print_test("POST /api/user/challenge/checkin - First check-in")
    try:
        cookies = {'auth_token': auth_token}
        response = requests.post(
            f"{API_BASE}/user/challenge/checkin",
            cookies=cookies,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            
            print_success("First check-in successful")
            print_info(f"Streak Days: {data.get('streakDays', 'N/A')}")
            print_info(f"Points Earned: {data.get('pointsEarned', 'N/A')}")
            print_info(f"Milestone: {data.get('milestoneReached', 'None')}")
            
            # Verify first check-in
            if (data.get('streakDays') == 1 and 
                data.get('pointsEarned') == 5 and
                data.get('milestoneReached') is None):
                print_success("First check-in correct: streak=1, points=5, no milestone")
                results.append(True)
            else:
                print_error("First check-in values incorrect")
                results.append(False)
        else:
            print_error(f"Failed first check-in: {response.status_code}")
            print_error(f"Response: {response.text}")
            results.append(False)
    except Exception as e:
        print_error(f"First check-in error: {str(e)}")
        results.append(False)
    
    # Test 3: Duplicate check-in same day (should fail)
    print_test("POST /api/user/challenge/checkin - Duplicate check-in (should fail)")
    try:
        cookies = {'auth_token': auth_token}
        response = requests.post(
            f"{API_BASE}/user/challenge/checkin",
            cookies=cookies,
            timeout=10
        )
        
        if response.status_code == 400:
            data = response.json()
            print_success("Duplicate check-in properly rejected with 400")
            print_info(f"Error message: {data.get('error', 'N/A')}")
            results.append(True)
        else:
            print_error(f"Duplicate check-in should fail but got: {response.status_code}")
            results.append(False)
    except Exception as e:
        print_error(f"Duplicate check-in test error: {str(e)}")
        results.append(False)
    
    # Test 4: Verify canCheckIn is now false
    print_test("GET /api/user/challenge - Verify canCheckIn is false after check-in")
    try:
        cookies = {'auth_token': auth_token}
        response = requests.get(
            f"{API_BASE}/user/challenge",
            cookies=cookies,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            challenge = data.get('challenge', {})
            
            if challenge.get('canCheckIn') == False:
                print_success("canCheckIn correctly set to false after check-in")
                print_info(f"Streak Days: {challenge.get('streakDays')}")
                print_info(f"Total Check-Ins: {challenge.get('totalCheckIns')}")
                results.append(True)
            else:
                print_error("canCheckIn should be false but is true")
                results.append(False)
        else:
            print_error(f"Failed to verify canCheckIn: {response.status_code}")
            results.append(False)
    except Exception as e:
        print_error(f"Verify canCheckIn error: {str(e)}")
        results.append(False)
    
    # Test 5: Verify rewards points updated
    print_test("GET /api/user/rewards - Verify points added from check-in")
    try:
        cookies = {'auth_token': auth_token}
        response = requests.get(
            f"{API_BASE}/user/rewards",
            cookies=cookies,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            rewards = data.get('rewards', {})
            
            if (rewards.get('points') == 5 and 
                rewards.get('lifetimePoints') == 5 and
                len(rewards.get('history', [])) >= 1):
                print_success("Rewards correctly updated: 5 points added, history entry created")
                print_info(f"Points: {rewards.get('points')}")
                print_info(f"Lifetime Points: {rewards.get('lifetimePoints')}")
                print_info(f"History entries: {len(rewards.get('history', []))}")
                results.append(True)
            else:
                print_error("Rewards not correctly updated after check-in")
                print_error(f"Points: {rewards.get('points')}, Expected: 5")
                results.append(False)
        else:
            print_error(f"Failed to verify rewards: {response.status_code}")
            results.append(False)
    except Exception as e:
        print_error(f"Verify rewards error: {str(e)}")
        results.append(False)
    
    # Test 6: Verify stats updated
    print_test("GET /api/user/stats - Verify stats reflect check-in")
    try:
        cookies = {'auth_token': auth_token}
        response = requests.get(
            f"{API_BASE}/user/stats",
            cookies=cookies,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            stats = data.get('stats', {})
            
            if (stats.get('rewardPoints') == 5 and 
                stats.get('lifetimePoints') == 5 and
                stats.get('streakDays') == 1 and
                stats.get('totalCheckIns') == 1):
                print_success("Stats correctly reflect check-in")
                print_info(f"Reward Points: {stats.get('rewardPoints')}")
                print_info(f"Streak Days: {stats.get('streakDays')}")
                print_info(f"Total Check-Ins: {stats.get('totalCheckIns')}")
                results.append(True)
            else:
                print_error("Stats not correctly updated after check-in")
                results.append(False)
        else:
            print_error(f"Failed to verify stats: {response.status_code}")
            results.append(False)
    except Exception as e:
        print_error(f"Verify stats error: {str(e)}")
        results.append(False)
    
    return all(results)

# ============================================================================
# TASK 6: User Profile Update API
# ============================================================================
def test_user_profile_api():
    print_section("TASK 6: User Profile Update API (PUT /api/user/profile)")
    
    results = []
    
    # Test 1: GET profile without authentication (should fail)
    print_test("GET /api/user/profile - Without authentication")
    try:
        response = requests.get(f"{API_BASE}/user/profile", timeout=10)
        if response.status_code == 401:
            print_success("Profile GET properly requires authentication (401)")
            results.append(True)
        else:
            print_error(f"Should require auth but got: {response.status_code}")
            results.append(False)
    except Exception as e:
        print_error(f"Auth test error: {str(e)}")
        results.append(False)
    
    # Test 2: GET profile with authentication
    print_test("GET /api/user/profile - Get current profile")
    try:
        cookies = {'auth_token': auth_token}
        response = requests.get(
            f"{API_BASE}/user/profile",
            cookies=cookies,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            user = data.get('user', {})
            
            print_success("Profile retrieved successfully")
            print_info(f"Name: {user.get('name', 'N/A')}")
            print_info(f"Email: {user.get('email', 'N/A')}")
            print_info(f"Phone: {user.get('phone', 'N/A')}")
            results.append(True)
        else:
            print_error(f"Failed to get profile: {response.status_code}")
            print_error(f"Response: {response.text}")
            results.append(False)
    except Exception as e:
        print_error(f"Get profile error: {str(e)}")
        results.append(False)
    
    # Test 3: PUT without authentication (should fail)
    print_test("PUT /api/user/profile - Without authentication")
    try:
        response = requests.put(
            f"{API_BASE}/user/profile",
            json={"name": "New Name"},
            timeout=10
        )
        if response.status_code == 401:
            print_success("Profile PUT properly requires authentication (401)")
            results.append(True)
        else:
            print_error(f"Should require auth but got: {response.status_code}")
            results.append(False)
    except Exception as e:
        print_error(f"Auth test error: {str(e)}")
        results.append(False)
    
    # Test 4: PUT with empty name (should fail validation)
    print_test("PUT /api/user/profile - Empty name validation")
    try:
        cookies = {'auth_token': auth_token}
        response = requests.put(
            f"{API_BASE}/user/profile",
            cookies=cookies,
            json={"name": ""},
            timeout=10
        )
        
        if response.status_code == 400:
            print_success("Empty name properly rejected with 400")
            results.append(True)
        else:
            print_error(f"Empty name should fail but got: {response.status_code}")
            results.append(False)
    except Exception as e:
        print_error(f"Empty name validation error: {str(e)}")
        results.append(False)
    
    # Test 5: PUT with valid name update
    print_test("PUT /api/user/profile - Update name")
    try:
        cookies = {'auth_token': auth_token}
        new_name = "Alex Johnson Updated"
        response = requests.put(
            f"{API_BASE}/user/profile",
            cookies=cookies,
            json={"name": new_name},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            print_success("Name updated successfully")
            print_info(f"New name: {data.get('user', {}).get('name', 'N/A')}")
            
            if data.get('user', {}).get('name') == new_name:
                print_success("Name correctly updated in response")
                results.append(True)
            else:
                print_error("Name not correctly updated")
                results.append(False)
        else:
            print_error(f"Failed to update name: {response.status_code}")
            print_error(f"Response: {response.text}")
            results.append(False)
    except Exception as e:
        print_error(f"Name update error: {str(e)}")
        results.append(False)
    
    # Test 6: PUT with phone update
    print_test("PUT /api/user/profile - Update phone")
    try:
        cookies = {'auth_token': auth_token}
        new_phone = "+14045559999"
        response = requests.put(
            f"{API_BASE}/user/profile",
            cookies=cookies,
            json={"phone": new_phone},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            print_success("Phone updated successfully")
            print_info(f"New phone: {data.get('user', {}).get('phone', 'N/A')}")
            
            if data.get('user', {}).get('phone') == new_phone:
                print_success("Phone correctly updated in response")
                results.append(True)
            else:
                print_error("Phone not correctly updated")
                results.append(False)
        else:
            print_error(f"Failed to update phone: {response.status_code}")
            print_error(f"Response: {response.text}")
            results.append(False)
    except Exception as e:
        print_error(f"Phone update error: {str(e)}")
        results.append(False)
    
    # Test 7: GET profile again to verify persistence
    print_test("GET /api/user/profile - Verify updates persisted")
    try:
        cookies = {'auth_token': auth_token}
        response = requests.get(
            f"{API_BASE}/user/profile",
            cookies=cookies,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            user = data.get('user', {})
            
            if (user.get('name') == "Alex Johnson Updated" and 
                user.get('phone') == "+14045559999"):
                print_success("Profile updates correctly persisted")
                print_info(f"Name: {user.get('name')}")
                print_info(f"Phone: {user.get('phone')}")
                results.append(True)
            else:
                print_error("Profile updates not persisted correctly")
                results.append(False)
        else:
            print_error(f"Failed to verify profile: {response.status_code}")
            results.append(False)
    except Exception as e:
        print_error(f"Verify profile error: {str(e)}")
        results.append(False)
    
    return all(results)

# ============================================================================
# TASK 7: User Favorites API
# ============================================================================
def test_user_favorites_api():
    print_section("TASK 7: User Favorites API (GET /api/user/favorites)")
    
    results = []
    
    # Test 1: Without authentication (should fail)
    print_test("GET /api/user/favorites - Without authentication")
    try:
        response = requests.get(f"{API_BASE}/user/favorites", timeout=10)
        if response.status_code == 401:
            print_success("Favorites API properly requires authentication (401)")
            results.append(True)
        else:
            print_error(f"Should require auth but got: {response.status_code}")
            results.append(False)
    except Exception as e:
        print_error(f"Auth test error: {str(e)}")
        results.append(False)
    
    # Test 2: With authentication - new user with no orders (should return empty array)
    print_test("GET /api/user/favorites - New user with no orders (should be empty)")
    try:
        cookies = {'auth_token': auth_token}
        response = requests.get(
            f"{API_BASE}/user/favorites",
            cookies=cookies,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            favorites = data.get('favorites', [])
            
            print_success("Favorites API returned successfully")
            print_info(f"Number of favorites: {len(favorites)}")
            
            if len(favorites) == 0:
                print_success("Favorites correctly empty for user with no orders")
                results.append(True)
            else:
                print_error(f"Expected 0 favorites but got {len(favorites)}")
                results.append(False)
        else:
            print_error(f"Failed to get favorites: {response.status_code}")
            print_error(f"Response: {response.text}")
            results.append(False)
    except Exception as e:
        print_error(f"Favorites API error: {str(e)}")
        results.append(False)
    
    return all(results)

# ============================================================================
# Main Test Runner
# ============================================================================
def main():
    print("\n" + "="*80)
    print(f"{Colors.BLUE}COMPREHENSIVE USER PROFILE DASHBOARD BACKEND TESTING{Colors.RESET}")
    print(f"{Colors.BLUE}Taste of Gratitude Platform - Phases 6-15{Colors.RESET}")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print(f"Test Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*80)
    
    # Setup test user
    if not setup_test_user():
        print_error("Failed to setup test user. Aborting tests.")
        return 1
    
    results = {}
    
    # Run all tests
    results['Task 1: User Stats API'] = test_user_stats_api()
    results['Task 2: User Orders API'] = test_user_orders_api()
    results['Task 3: User Rewards API'] = test_user_rewards_api()
    results['Task 4: User Challenge API'] = test_user_challenge_api()
    results['Task 5: Challenge Check-In API'] = test_challenge_checkin_api()
    results['Task 6: User Profile Update API'] = test_user_profile_api()
    results['Task 7: User Favorites API'] = test_user_favorites_api()
    
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
        print(f"{Colors.GREEN}🎉 ALL TESTS PASSED! User Profile Dashboard system is fully functional.{Colors.RESET}\n")
        return 0
    else:
        print(f"{Colors.RED}⚠️  Some tests failed. Review errors above.{Colors.RESET}\n")
        return 1

if __name__ == "__main__":
    exit(main())
