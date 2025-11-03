#!/usr/bin/env python3
"""
Phase II Email Automation - Comprehensive Backend Testing
Tests email queue, scheduler, and conversion tracking
"""

import requests
import json
import time
from datetime import datetime, timedelta
from pymongo import MongoClient

# Configuration
BASE_URL = "https://cart-rescue-1.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "taste_of_gratitude"
CRON_SECRET = "cron-secret-taste-of-gratitude-2024"

# MongoDB connection
client = MongoClient(MONGO_URL)
db = client[DB_NAME]

def print_test(test_name):
    """Print test header"""
    print(f"\n{'='*80}")
    print(f"TEST: {test_name}")
    print(f"{'='*80}")

def print_result(success, message):
    """Print test result"""
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"{status}: {message}")

def cleanup_test_data():
    """Clean up test data before starting"""
    print_test("Cleanup Test Data")
    try:
        # Delete test quiz results
        result = db.quiz_results.delete_many({"customer.email": {"$regex": "test.*@example.com"}})
        print(f"Deleted {result.deleted_count} test quiz results")
        
        # Delete test email queue entries
        result = db.email_queue.delete_many({"recipient.email": {"$regex": "test.*@example.com"}})
        print(f"Deleted {result.deleted_count} test email queue entries")
        
        print_result(True, "Test data cleaned up")
    except Exception as e:
        print_result(False, f"Cleanup failed: {str(e)}")

def test_quiz_submit_with_auto_scheduling():
    """Test 1: Submit quiz and verify 2 emails are auto-scheduled"""
    print_test("Quiz Submit with Auto-Scheduling")
    
    try:
        # Submit quiz
        quiz_data = {
            "answers": {
                "goal": "immune",
                "texture": "smooth",
                "adventure": "classic"
            },
            "customer": {
                "name": "Test User Phase2",
                "email": "testphase2@example.com"
            },
            "recommendations": [
                {
                    "name": "Elderberry Sea Moss",
                    "slug": "elderberry-sea-moss-16oz",
                    "matchScore": 95,
                    "confidence": 0.85
                }
            ]
        }
        
        response = requests.post(f"{API_BASE}/quiz/submit", json=quiz_data, timeout=30)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print_result(False, f"Quiz submit failed: {response.text}")
            return None
        
        data = response.json()
        quiz_id = data.get("quizId")
        print(f"Quiz ID: {quiz_id}")
        
        # Wait for email queue processing
        time.sleep(2)
        
        # Check email_queue collection
        queue_entries = list(db.email_queue.find({"quizId": quiz_id}))
        print(f"Email queue entries: {len(queue_entries)}")
        
        if len(queue_entries) != 2:
            print_result(False, f"Expected 2 queued emails, found {len(queue_entries)}")
            return quiz_id
        
        # Verify email types
        email_types = [entry["emailType"] for entry in queue_entries]
        if "followUp3Day" not in email_types or "followUp7Day" not in email_types:
            print_result(False, f"Missing email types. Found: {email_types}")
            return quiz_id
        
        # Verify scheduled dates
        now = datetime.now()
        for entry in queue_entries:
            scheduled_for = entry["scheduledFor"]
            email_type = entry["emailType"]
            
            if email_type == "followUp3Day":
                expected_days = 3
            else:
                expected_days = 7
            
            days_diff = (scheduled_for - now).days
            print(f"{email_type}: scheduled for {scheduled_for} ({days_diff} days from now)")
            
            if abs(days_diff - expected_days) > 1:
                print_result(False, f"{email_type} scheduled incorrectly: {days_diff} days instead of {expected_days}")
                return quiz_id
            
            # Verify status
            if entry["status"] != "pending":
                print_result(False, f"{email_type} status is {entry['status']}, expected 'pending'")
                return quiz_id
        
        # Verify emailData for 3-day email
        three_day_email = next((e for e in queue_entries if e["emailType"] == "followUp3Day"), None)
        if three_day_email and "emailData" in three_day_email:
            if "topProduct" in three_day_email["emailData"]:
                print(f"✓ 3-day email includes topProduct: {three_day_email['emailData']['topProduct'].get('name', 'N/A')}")
            else:
                print_result(False, "3-day email missing topProduct in emailData")
                return quiz_id
        
        print_result(True, "Quiz submit auto-scheduled 2 emails correctly")
        return quiz_id
        
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")
        return None

def test_email_scheduler_stats():
    """Test 2: Get email queue statistics"""
    print_test("Email Scheduler Statistics (GET)")
    
    try:
        response = requests.get(f"{API_BASE}/quiz/email-scheduler", timeout=10)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print_result(False, f"Failed to get stats: {response.text}")
            return
        
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        # Verify structure
        if not data.get("success"):
            print_result(False, "Response success is false")
            return
        
        stats = data.get("stats", {})
        required_fields = ["pending", "sent", "failed", "cancelled", "total"]
        
        for field in required_fields:
            if field not in stats:
                print_result(False, f"Missing field: {field}")
                return
            if not isinstance(stats[field], int):
                print_result(False, f"Field {field} is not a number: {stats[field]}")
                return
        
        print(f"Stats: pending={stats['pending']}, sent={stats['sent']}, failed={stats['failed']}, cancelled={stats['cancelled']}, total={stats['total']}")
        print_result(True, "Email queue statistics retrieved successfully")
        
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")

def test_email_scheduler_no_pending():
    """Test 3: Process emails when none are pending"""
    print_test("Email Scheduler - No Pending Emails")
    
    try:
        headers = {"Authorization": f"Bearer {CRON_SECRET}"}
        response = requests.post(f"{API_BASE}/quiz/email-scheduler", headers=headers, timeout=30)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print_result(False, f"Scheduler failed: {response.text}")
            return
        
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        if data.get("processed", 0) == 0:
            print_result(True, "Scheduler correctly reports no pending emails")
        else:
            print_result(False, f"Expected 0 processed, got {data.get('processed')}")
        
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")

def test_email_scheduler_process_pending(quiz_id):
    """Test 4: Process pending emails by forcing scheduledFor to past"""
    print_test("Email Scheduler - Process Pending Emails")
    
    if not quiz_id:
        print_result(False, "No quiz_id provided, skipping test")
        return
    
    try:
        # Update scheduledFor to past for this quiz's emails
        past_date = datetime.now() - timedelta(minutes=5)
        result = db.email_queue.update_many(
            {"quizId": quiz_id, "status": "pending"},
            {"$set": {"scheduledFor": past_date}}
        )
        print(f"Updated {result.modified_count} emails to past date")
        
        # Call scheduler
        headers = {"Authorization": f"Bearer {CRON_SECRET}"}
        response = requests.post(f"{API_BASE}/quiz/email-scheduler", headers=headers, timeout=30)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print_result(False, f"Scheduler failed: {response.text}")
            return
        
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        # Verify processing
        if data.get("processed", 0) != 2:
            print_result(False, f"Expected 2 processed, got {data.get('processed')}")
            return
        
        if data.get("sent", 0) != 2:
            print_result(False, f"Expected 2 sent, got {data.get('sent')}")
            return
        
        # Wait for database updates
        time.sleep(2)
        
        # Verify email queue status
        queue_entries = list(db.email_queue.find({"quizId": quiz_id}))
        for entry in queue_entries:
            if entry["status"] != "sent":
                print_result(False, f"Email {entry['emailType']} status is {entry['status']}, expected 'sent'")
                return
        
        # Verify quiz emailsSent tracking
        quiz = db.quiz_results.find_one({"_id": quiz_id})
        if not quiz:
            print_result(False, "Quiz not found in database")
            return
        
        emails_sent = quiz.get("emailsSent", {})
        if not emails_sent.get("followUp3Day"):
            print_result(False, "followUp3Day not marked as sent in quiz")
            return
        
        if not emails_sent.get("followUp7Day"):
            print_result(False, "followUp7Day not marked as sent in quiz")
            return
        
        print_result(True, "Scheduler processed 2 pending emails successfully")
        
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")

def test_email_scheduler_skip_purchased():
    """Test 5: Skip emails for purchased customers"""
    print_test("Email Scheduler - Skip Purchased Customer")
    
    try:
        # Submit new quiz
        quiz_data = {
            "answers": {
                "goal": "energy",
                "texture": "chunky",
                "adventure": "adventurous"
            },
            "customer": {
                "name": "Test Purchased User",
                "email": "testpurchased@example.com"
            },
            "recommendations": [
                {
                    "name": "Ginger Turmeric Sea Moss",
                    "slug": "ginger-turmeric-sea-moss-16oz",
                    "matchScore": 90,
                    "confidence": 0.80
                }
            ]
        }
        
        response = requests.post(f"{API_BASE}/quiz/submit", json=quiz_data, timeout=30)
        if response.status_code != 200:
            print_result(False, f"Quiz submit failed: {response.text}")
            return
        
        data = response.json()
        quiz_id = data.get("quizId")
        print(f"Quiz ID: {quiz_id}")
        
        time.sleep(2)
        
        # Mark quiz as purchased
        result = db.quiz_results.update_one(
            {"_id": quiz_id},
            {"$set": {"conversionStatus.purchased": True}}
        )
        print(f"Marked quiz as purchased: {result.modified_count} updated")
        
        # Force emails to past date
        past_date = datetime.now() - timedelta(minutes=5)
        result = db.email_queue.update_many(
            {"quizId": quiz_id, "status": "pending"},
            {"$set": {"scheduledFor": past_date}}
        )
        print(f"Updated {result.modified_count} emails to past date")
        
        # Call scheduler
        headers = {"Authorization": f"Bearer {CRON_SECRET}"}
        response = requests.post(f"{API_BASE}/quiz/email-scheduler", headers=headers, timeout=30)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print_result(False, f"Scheduler failed: {response.text}")
            return
        
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        # Verify emails were cancelled
        if data.get("cancelled", 0) < 1:
            print_result(False, f"Expected at least 1 cancelled, got {data.get('cancelled')}")
            return
        
        # Verify email queue status
        time.sleep(2)
        queue_entries = list(db.email_queue.find({"quizId": quiz_id}))
        for entry in queue_entries:
            if entry["status"] != "cancelled":
                print_result(False, f"Email {entry['emailType']} status is {entry['status']}, expected 'cancelled'")
                return
            error_msg = entry.get("error", "").lower()
            if "customer" not in error_msg and "purchased" not in error_msg:
                print_result(False, f"Email {entry['emailType']} error field doesn't mention customer/purchased: {entry.get('error')}")
                return
        
        print_result(True, "Scheduler correctly skipped emails for purchased customer")
        
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")

def test_email_scheduler_auth():
    """Test 6: Email scheduler requires authentication"""
    print_test("Email Scheduler - Authentication Required")
    
    try:
        # Call without auth header
        response = requests.post(f"{API_BASE}/quiz/email-scheduler", timeout=10)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 401:
            print_result(True, "Scheduler correctly requires authentication")
        else:
            print_result(False, f"Expected 401, got {response.status_code}")
        
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")

def test_conversion_webhook_by_quiz_id():
    """Test 7: Conversion webhook cancels emails by quiz ID"""
    print_test("Conversion Webhook - Cancel by Quiz ID")
    
    try:
        # Submit new quiz
        quiz_data = {
            "answers": {
                "goal": "digestion",
                "texture": "smooth",
                "adventure": "classic"
            },
            "customer": {
                "name": "Test Webhook User",
                "email": "testwebhook@example.com"
            },
            "recommendations": [
                {
                    "name": "Original Sea Moss",
                    "slug": "original-sea-moss-16oz",
                    "matchScore": 88,
                    "confidence": 0.75
                }
            ]
        }
        
        response = requests.post(f"{API_BASE}/quiz/submit", json=quiz_data, timeout=30)
        if response.status_code != 200:
            print_result(False, f"Quiz submit failed: {response.text}")
            return
        
        data = response.json()
        quiz_id = data.get("quizId")
        print(f"Quiz ID: {quiz_id}")
        
        time.sleep(2)
        
        # Verify emails are pending
        pending_count = db.email_queue.count_documents({"quizId": quiz_id, "status": "pending"})
        print(f"Pending emails before webhook: {pending_count}")
        
        if pending_count == 0:
            print_result(False, "No pending emails found")
            return
        
        # Call conversion webhook
        webhook_data = {
            "quizId": quiz_id,
            "action": "purchased"
        }
        
        response = requests.post(f"{API_BASE}/quiz/conversion-webhook", json=webhook_data, timeout=10)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print_result(False, f"Webhook failed: {response.text}")
            return
        
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        if data.get("cancelledCount", 0) != pending_count:
            print_result(False, f"Expected {pending_count} cancelled, got {data.get('cancelledCount')}")
            return
        
        # Verify emails are cancelled
        time.sleep(1)
        cancelled_count = db.email_queue.count_documents({"quizId": quiz_id, "status": "cancelled"})
        print(f"Cancelled emails after webhook: {cancelled_count}")
        
        if cancelled_count != pending_count:
            print_result(False, f"Expected {pending_count} cancelled in DB, found {cancelled_count}")
            return
        
        # Verify error field
        cancelled_emails = list(db.email_queue.find({"quizId": quiz_id, "status": "cancelled"}))
        for email in cancelled_emails:
            if "customer_purchased" not in email.get("error", "").lower():
                print_result(False, f"Email error field doesn't mention customer_purchased: {email.get('error')}")
                return
        
        print_result(True, "Conversion webhook cancelled emails by quiz ID")
        
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")

def test_conversion_webhook_by_email():
    """Test 8: Conversion webhook cancels emails by customer email"""
    print_test("Conversion Webhook - Cancel by Email")
    
    try:
        # Submit new quiz
        quiz_data = {
            "answers": {
                "goal": "immune",
                "texture": "chunky",
                "adventure": "adventurous"
            },
            "customer": {
                "name": "Test Email Webhook",
                "email": "testemailwebhook@example.com"
            },
            "recommendations": [
                {
                    "name": "Blueberry Sea Moss",
                    "slug": "blueberry-sea-moss-16oz",
                    "matchScore": 92,
                    "confidence": 0.82
                }
            ]
        }
        
        response = requests.post(f"{API_BASE}/quiz/submit", json=quiz_data, timeout=30)
        if response.status_code != 200:
            print_result(False, f"Quiz submit failed: {response.text}")
            return
        
        data = response.json()
        quiz_id = data.get("quizId")
        print(f"Quiz ID: {quiz_id}")
        
        time.sleep(2)
        
        # Verify emails are pending
        pending_count = db.email_queue.count_documents({"quizId": quiz_id, "status": "pending"})
        print(f"Pending emails before webhook: {pending_count}")
        
        # Call conversion webhook with email
        webhook_data = {
            "customerEmail": "testemailwebhook@example.com",
            "action": "purchased"
        }
        
        response = requests.post(f"{API_BASE}/quiz/conversion-webhook", json=webhook_data, timeout=10)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print_result(False, f"Webhook failed: {response.text}")
            return
        
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        if data.get("cancelledCount", 0) == 0:
            print_result(False, "No emails cancelled")
            return
        
        # Verify emails are cancelled
        time.sleep(1)
        cancelled_count = db.email_queue.count_documents({"quizId": quiz_id, "status": "cancelled"})
        print(f"Cancelled emails after webhook: {cancelled_count}")
        
        print_result(True, "Conversion webhook cancelled emails by customer email")
        
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")

def test_conversion_webhook_invalid_action():
    """Test 9: Conversion webhook rejects invalid action"""
    print_test("Conversion Webhook - Invalid Action")
    
    try:
        webhook_data = {
            "quizId": "test-quiz-id",
            "action": "invalid_action"
        }
        
        response = requests.post(f"{API_BASE}/quiz/conversion-webhook", json=webhook_data, timeout=10)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 400:
            print_result(True, "Webhook correctly rejects invalid action")
        else:
            print_result(False, f"Expected 400, got {response.status_code}")
        
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")

def test_conversion_webhook_missing_params():
    """Test 10: Conversion webhook requires quizId or email"""
    print_test("Conversion Webhook - Missing Parameters")
    
    try:
        webhook_data = {
            "action": "purchased"
        }
        
        response = requests.post(f"{API_BASE}/quiz/conversion-webhook", json=webhook_data, timeout=10)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 400:
            data = response.json()
            if "quizId or customerEmail required" in data.get("error", ""):
                print_result(True, "Webhook correctly requires quizId or email")
            else:
                print_result(False, f"Wrong error message: {data.get('error')}")
        else:
            print_result(False, f"Expected 400, got {response.status_code}")
        
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")

def verify_database_structure():
    """Test 11: Verify database collections and indexes"""
    print_test("Database Structure Verification")
    
    try:
        # Check email_queue collection
        if "email_queue" not in db.list_collection_names():
            print_result(False, "email_queue collection not found")
            return
        
        # Check indexes
        indexes = db.email_queue.index_information()
        required_indexes = ["scheduledFor_1", "status_1", "quizId_1", "recipient.email_1"]
        
        for idx in required_indexes:
            if idx not in indexes:
                print_result(False, f"Missing index: {idx}")
                return
        
        print(f"✓ All required indexes present: {', '.join(required_indexes)}")
        
        # Check sample document structure
        sample = db.email_queue.find_one()
        if sample:
            required_fields = ["_id", "quizId", "recipient", "emailType", "scheduledFor", 
                             "status", "attempts", "emailData", "createdAt", "updatedAt"]
            
            for field in required_fields:
                if field not in sample:
                    print_result(False, f"Missing field in email_queue: {field}")
                    return
            
            print(f"✓ All required fields present in email_queue documents")
            
            # Verify status values
            valid_statuses = ["pending", "sent", "failed", "cancelled"]
            if sample["status"] not in valid_statuses:
                print_result(False, f"Invalid status value: {sample['status']}")
                return
        
        # Check quiz_results emailsSent structure
        quiz_sample = db.quiz_results.find_one({"emailsSent": {"$exists": True}})
        if quiz_sample:
            emails_sent = quiz_sample.get("emailsSent", {})
            if "results" in emails_sent:
                print(f"✓ Quiz emailsSent structure includes results: {emails_sent.get('results')}")
            if "followUp3Day" in emails_sent:
                print(f"✓ Quiz emailsSent structure includes followUp3Day: {emails_sent.get('followUp3Day')}")
            if "followUp7Day" in emails_sent:
                print(f"✓ Quiz emailsSent structure includes followUp7Day: {emails_sent.get('followUp7Day')}")
        
        print_result(True, "Database structure verified successfully")
        
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")

def main():
    """Run all Phase II Email Automation tests"""
    print("\n" + "="*80)
    print("PHASE II EMAIL AUTOMATION - COMPREHENSIVE BACKEND TESTING")
    print("="*80)
    
    # Cleanup first
    cleanup_test_data()
    
    # Test 1: Quiz submit with auto-scheduling
    quiz_id = test_quiz_submit_with_auto_scheduling()
    
    # Test 2: Get email queue stats
    test_email_scheduler_stats()
    
    # Test 3: Process when no pending emails
    test_email_scheduler_no_pending()
    
    # Test 4: Process pending emails
    if quiz_id:
        test_email_scheduler_process_pending(quiz_id)
    
    # Test 5: Skip emails for purchased customers
    test_email_scheduler_skip_purchased()
    
    # Test 6: Authentication required
    test_email_scheduler_auth()
    
    # Test 7: Conversion webhook by quiz ID
    test_conversion_webhook_by_quiz_id()
    
    # Test 8: Conversion webhook by email
    test_conversion_webhook_by_email()
    
    # Test 9: Invalid action
    test_conversion_webhook_invalid_action()
    
    # Test 10: Missing parameters
    test_conversion_webhook_missing_params()
    
    # Test 11: Database structure
    verify_database_structure()
    
    print("\n" + "="*80)
    print("PHASE II EMAIL AUTOMATION TESTING COMPLETE")
    print("="*80)

if __name__ == "__main__":
    main()
