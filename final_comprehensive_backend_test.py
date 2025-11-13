#!/usr/bin/env python3
"""
Final Comprehensive Backend Test - Complete System Verification
Testing all critical backend systems for production readiness assessment
"""

import requests
import json
import time
from datetime import datetime

class FinalBackendTester:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip('/')
        self.api_base = f"{self.base_url}/api"
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
        self.test_results = []

    def log(self, message: str, level: str = "INFO"):
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")

    def test_api(self, endpoint: str, method: str = 'GET', data: dict = None, expected_status: int = 200):
        """Test API endpoint and return detailed results"""
        url = f"{self.api_base}{endpoint}"
        start_time = time.time()
        
        try:
            if method == 'GET':
                response = self.session.get(url, timeout=30)
            elif method == 'POST':
                response = self.session.post(url, json=data, timeout=30)
            
            response_time = (time.time() - start_time) * 1000
            
            success = response.status_code == expected_status
            
            result = {
                'endpoint': endpoint,
                'method': method,
                'status_code': response.status_code,
                'success': success,
                'response_time_ms': round(response_time, 2),
                'timestamp': datetime.now().isoformat()
            }
            
            try:
                result['response_data'] = response.json()
            except:
                result['response_text'] = response.text[:200]
            
            return result
            
        except Exception as e:
            return {
                'endpoint': endpoint,
                'method': method,
                'success': False,
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }

    def run_comprehensive_tests(self):
        """Run all comprehensive backend tests"""
        self.log("🚀 STARTING FINAL COMPREHENSIVE BACKEND TESTING")
        self.log("=" * 80)
        
        # 1. HEALTH & SYSTEM STATUS
        self.log("🏥 Testing Health & System Status")
        health_result = self.test_api('/health')
        self.test_results.append(('Health Check System', health_result))
        
        if health_result['success']:
            health_data = health_result.get('response_data', {})
            self.log(f"✅ System Status: {health_data.get('status', 'unknown')}")
            self.log(f"📊 Database: {health_data.get('services', {}).get('database', 'unknown')}")
            self.log(f"💳 Square API: {health_data.get('services', {}).get('square_api', 'unknown')}")
        
        # 2. SQUARE PAYMENT SYSTEM
        self.log("\n💳 Testing Square Payment System")
        
        # Square diagnostic
        diag_result = self.test_api('/square-diagnose', 'POST')
        self.test_results.append(('Square Credential Diagnostic', diag_result))
        
        if diag_result['success']:
            diag_data = diag_result.get('response_data', {})
            auth_status = diag_data.get('results', {}).get('overallStatus', 'unknown')
            self.log(f"🔍 Square Authentication: {auth_status}")
        
        # Square payment processing
        payment_data = {
            'sourceId': 'cnon:card-nonce-ok',
            'amount': 35.00,
            'currency': 'USD',
            'orderId': f'final_test_{int(time.time())}',
            'orderData': {
                'customer': {
                    'name': 'Final Test Customer',
                    'email': 'final_test@tasteofgratitude.com',
                    'phone': '555-0123'
                },
                'cart': [
                    {'name': 'Elderberry Sea Moss 16oz', 'price': 35.00, 'quantity': 1}
                ],
                'fulfillmentType': 'delivery',
                'deliveryAddress': {
                    'street': '123 Test Street',
                    'city': 'Atlanta',
                    'state': 'GA',
                    'zipCode': '30309'
                }
            }
        }
        
        payment_result = self.test_api('/square-payment', 'POST', payment_data)
        self.test_results.append(('Square Payment Processing', payment_result))
        
        if payment_result['success']:
            payment_resp = payment_result.get('response_data', {})
            payment_id = payment_resp.get('paymentId', '')
            processing_time = payment_resp.get('processingTime', 0)
            
            if payment_id.startswith('fallback_'):
                self.log(f"🔄 Payment Mode: Hybrid Fallback Active ({processing_time}ms)")
            elif payment_id.startswith('mock_'):
                self.log(f"🧪 Payment Mode: Mock Mode ({processing_time}ms)")
            else:
                self.log(f"✅ Payment Mode: Live Square ({processing_time}ms)")
        
        # 3. COUPON SYSTEM
        self.log("\n🎫 Testing Coupon System")
        
        # Create coupon
        coupon_data = {
            'customerEmail': 'final_test@tasteofgratitude.com',
            'discountAmount': 5.00,
            'freeShipping': False,
            'type': 'final_test',
            'source': 'comprehensive_test'
        }
        
        coupon_create_result = self.test_api('/coupons/create', 'POST', coupon_data)
        self.test_results.append(('Coupon Creation System', coupon_create_result))
        
        coupon_code = None
        if coupon_create_result['success']:
            coupon_resp = coupon_create_result.get('response_data', {})
            coupon_code = coupon_resp.get('coupon', {}).get('code')
            self.log(f"✅ Coupon Created: {coupon_code}")
        
        # Validate coupon
        if coupon_code:
            validate_data = {
                'couponCode': coupon_code,
                'customerEmail': 'final_test@tasteofgratitude.com'
            }
            
            validate_result = self.test_api('/coupons/validate', 'POST', validate_data)
            self.test_results.append(('Coupon Validation System', validate_result))
            
            if validate_result['success']:
                validate_resp = validate_result.get('response_data', {})
                discount = validate_resp.get('discountAmount', 0)
                self.log(f"✅ Coupon Validation: ${discount:.2f} discount")
        
        # 4. ADMIN SYSTEM
        self.log("\n👨‍💼 Testing Admin Management System")
        
        admin_result = self.test_api('/admin/coupons')
        self.test_results.append(('Admin Coupon Management', admin_result))
        
        if admin_result['success']:
            admin_data = admin_result.get('response_data', {})
            total_coupons = admin_data.get('totalCoupons', 0)
            used_coupons = admin_data.get('usedCoupons', 0)
            self.log(f"📊 Admin Dashboard: {total_coupons} total coupons, {used_coupons} used")
        
        # 5. CUSTOMER SYSTEM
        self.log("\n👥 Testing Customer Management")
        
        customer_data = {
            'name': 'Final Test Customer',
            'email': 'final_customer@tasteofgratitude.com',
            'phone': '555-0199'
        }
        
        customer_result = self.test_api('/customers', 'POST', customer_data)
        self.test_results.append(('Customer Management System', customer_result))
        
        # 6. WEBHOOK SYSTEM
        self.log("\n🔗 Testing Webhook System")
        
        webhook_result = self.test_api('/square-webhook')
        self.test_results.append(('Square Webhook System', webhook_result))
        
        # Calculate final results
        self.calculate_final_results()

    def calculate_final_results(self):
        """Calculate and display final test results"""
        self.log("\n" + "=" * 80)
        self.log("📊 CALCULATING FINAL RESULTS")
        
        total_tests = len(self.test_results)
        successful_tests = sum(1 for _, result in self.test_results if result['success'])
        success_rate = (successful_tests / total_tests) * 100 if total_tests > 0 else 0
        
        # Calculate average response time for successful tests
        response_times = [result['response_time_ms'] for _, result in self.test_results 
                         if result['success'] and 'response_time_ms' in result]
        avg_response_time = sum(response_times) / len(response_times) if response_times else 0
        
        self.log(f"📈 SUCCESS RATE: {successful_tests}/{total_tests} ({success_rate:.1f}%)")
        self.log(f"⚡ AVERAGE RESPONSE TIME: {avg_response_time:.0f}ms")
        
        # Detailed results
        self.log("\n📋 DETAILED TEST RESULTS:")
        for test_name, result in self.test_results:
            status = "✅" if result['success'] else "❌"
            response_time = result.get('response_time_ms', 0)
            status_code = result.get('status_code', 'N/A')
            self.log(f"  {status} {test_name}: {status_code} ({response_time:.0f}ms)")
        
        # Overall assessment
        if success_rate >= 90:
            overall_status = "EXCELLENT - PRODUCTION READY"
        elif success_rate >= 80:
            overall_status = "GOOD - MINOR ISSUES"
        elif success_rate >= 70:
            overall_status = "ACCEPTABLE - NEEDS ATTENTION"
        else:
            overall_status = "NEEDS IMPROVEMENT"
        
        self.log(f"\n🎯 OVERALL ASSESSMENT: {overall_status}")
        
        # Save results
        final_results = {
            'timestamp': datetime.now().isoformat(),
            'total_tests': total_tests,
            'successful_tests': successful_tests,
            'success_rate_percent': round(success_rate, 1),
            'average_response_time_ms': round(avg_response_time, 2),
            'overall_status': overall_status,
            'detailed_results': {name: result for name, result in self.test_results}
        }
        
        with open('/app/final_backend_test_results.json', 'w') as f:
            json.dump(final_results, f, indent=2)
        
        self.log(f"📄 Results saved to: /app/final_backend_test_results.json")
        
        return final_results

def main():
    import os
    base_url = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://taste-gratitude-pay.preview.emergentagent.com')
    
    print("🎯 TASTE OF GRATITUDE E-COMMERCE PLATFORM")
    print("🔬 FINAL COMPREHENSIVE BACKEND TESTING")
    print(f"🌐 Base URL: {base_url}")
    print("=" * 80)
    
    tester = FinalBackendTester(base_url)
    results = tester.run_comprehensive_tests()
    
    return results

if __name__ == "__main__":
    main()