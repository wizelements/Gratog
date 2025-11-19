#!/usr/bin/env python3
"""
Focused Backend Analysis - Taste of Gratitude E-commerce Platform
Comprehensive testing of actual implemented backend APIs
"""

import requests
import json
import time
import sys
from datetime import datetime
from typing import Dict, List, Any

class FocusedBackendAnalyzer:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip('/')
        self.api_base = f"{self.base_url}/api"
        self.results = {
            'timestamp': datetime.now().isoformat(),
            'base_url': base_url,
            'test_summary': {},
            'detailed_results': {}
        }
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'FocusedBackendAnalyzer/1.0'
        })

    def log(self, message: str, level: str = "INFO"):
        """Enhanced logging with timestamps"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")

    def test_endpoint(self, endpoint: str, method: str = 'GET', data: Dict = None, 
                     expected_status: int = 200, timeout: int = 30) -> Dict[str, Any]:
        """Test individual API endpoint with comprehensive analysis"""
        url = f"{self.api_base}{endpoint}"
        start_time = time.time()
        
        try:
            if method == 'GET':
                response = self.session.get(url, timeout=timeout)
            elif method == 'POST':
                response = self.session.post(url, json=data, timeout=timeout)
            elif method == 'PUT':
                response = self.session.put(url, json=data, timeout=timeout)
            elif method == 'DELETE':
                response = self.session.delete(url, timeout=timeout)
            else:
                return {'error': f'Unsupported method: {method}', 'status': 'FAILED'}
            
            response_time = (time.time() - start_time) * 1000  # Convert to milliseconds
            
            result = {
                'url': url,
                'method': method,
                'status_code': response.status_code,
                'response_time_ms': round(response_time, 2),
                'success': response.status_code == expected_status,
                'headers': dict(response.headers),
                'content_type': response.headers.get('content-type', ''),
            }
            
            # Try to parse JSON response
            try:
                result['response_data'] = response.json()
            except:
                result['response_text'] = response.text[:500]  # First 500 chars
            
            return result
            
        except requests.exceptions.Timeout:
            return {
                'url': url,
                'method': method,
                'error': 'Request timeout',
                'response_time_ms': timeout * 1000,
                'success': False,
                'status': 'TIMEOUT'
            }
        except requests.exceptions.ConnectionError:
            return {
                'url': url,
                'method': method,
                'error': 'Connection error',
                'success': False,
                'status': 'CONNECTION_ERROR'
            }
        except Exception as e:
            return {
                'url': url,
                'method': method,
                'error': str(e),
                'success': False,
                'status': 'ERROR'
            }

    def test_health_system(self):
        """Test health and monitoring endpoints"""
        self.log("🏥 TESTING HEALTH & MONITORING SYSTEM")
        
        tests = []
        
        # Health endpoint
        health_result = self.test_endpoint('/health')
        tests.append({
            'name': 'Health Check Endpoint',
            'result': health_result,
            'critical': True
        })
        
        if health_result['success']:
            health_data = health_result.get('response_data', {})
            self.log(f"✅ Health Status: {health_data.get('status', 'unknown')}")
            self.log(f"📊 Database: {health_data.get('services', {}).get('database', 'unknown')}")
            self.log(f"💳 Square API: {health_data.get('services', {}).get('square_api', 'unknown')}")
        
        return tests

    def test_square_payment_system(self):
        """Test Square payment integration"""
        self.log("💳 TESTING SQUARE PAYMENT SYSTEM")
        
        tests = []
        
        # Square diagnostic
        diag_result = self.test_endpoint('/square-diagnose', 'POST')
        tests.append({
            'name': 'Square Credential Diagnostic',
            'result': diag_result,
            'critical': True
        })
        
        if diag_result['success']:
            diag_data = diag_result.get('response_data', {})
            overall_status = diag_data.get('results', {}).get('overallStatus', 'unknown')
            self.log(f"🔍 Square Auth Status: {overall_status}")
        
        # Square payment processing
        payment_data = {
            'sourceId': 'cnon:card-nonce-ok',
            'amount': 25.00,
            'currency': 'USD',
            'orderId': f'test_order_{int(time.time())}',
            'orderData': {
                'customer': {
                    'name': 'Backend Test User',
                    'email': 'backend@test.com',
                    'phone': '555-0123'
                },
                'cart': [{'name': 'Test Product', 'price': 25.00, 'quantity': 1}],
                'fulfillmentType': 'pickup'
            }
        }
        
        payment_result = self.test_endpoint('/square-payment', 'POST', payment_data)
        tests.append({
            'name': 'Square Payment Processing',
            'result': payment_result,
            'critical': True
        })
        
        if payment_result['success']:
            payment_resp = payment_result.get('response_data', {})
            payment_id = payment_resp.get('paymentId', '')
            if payment_id.startswith('mock_') or payment_id.startswith('fallback_'):
                self.log(f"🔄 Payment Mode: Hybrid Fallback ({payment_id})")
            else:
                self.log(f"✅ Payment Mode: Live Square ({payment_id})")
        
        # Square webhook
        webhook_result = self.test_endpoint('/square-webhook', 'GET')
        tests.append({
            'name': 'Square Webhook Status',
            'result': webhook_result,
            'critical': False
        })
        
        return tests

    def test_coupon_system(self):
        """Test coupon management system"""
        self.log("🎫 TESTING COUPON SYSTEM")
        
        tests = []
        
        # Create coupon
        coupon_data = {
            'customerEmail': 'backend_test@test.com',
            'discountAmount': 5.00,
            'type': 'backend_test',
            'source': 'analyzer'
        }
        
        create_result = self.test_endpoint('/coupons/create', 'POST', coupon_data)
        tests.append({
            'name': 'Coupon Creation',
            'result': create_result,
            'critical': True
        })
        
        coupon_code = None
        if create_result['success']:
            coupon_resp = create_result.get('response_data', {})
            coupon_code = coupon_resp.get('coupon', {}).get('code')
            self.log(f"✅ Coupon Created: {coupon_code}")
        
        # Validate coupon
        if coupon_code:
            validate_data = {
                'couponCode': coupon_code,
                'customerEmail': 'backend_test@test.com'
            }
            
            validate_result = self.test_endpoint('/coupons/validate', 'POST', validate_data)
            tests.append({
                'name': 'Coupon Validation',
                'result': validate_result,
                'critical': True
            })
        
        # Get customer coupons
        get_result = self.test_endpoint('/coupons/create?email=backend_test@test.com')
        tests.append({
            'name': 'Coupon Retrieval',
            'result': get_result,
            'critical': False
        })
        
        return tests

    def test_admin_system(self):
        """Test admin management APIs"""
        self.log("👨‍💼 TESTING ADMIN SYSTEM")
        
        tests = []
        
        # Admin coupon management
        admin_coupons_result = self.test_endpoint('/admin/coupons')
        tests.append({
            'name': 'Admin Coupon Management',
            'result': admin_coupons_result,
            'critical': False
        })
        
        if admin_coupons_result['success']:
            admin_data = admin_coupons_result.get('response_data', {})
            total_coupons = admin_data.get('totalCoupons', 0)
            self.log(f"📊 Total Coupons in System: {total_coupons}")
        
        return tests

    def test_customer_system(self):
        """Test customer management"""
        self.log("👥 TESTING CUSTOMER SYSTEM")
        
        tests = []
        
        # Customer creation
        customer_data = {
            'name': 'Backend Test Customer',
            'email': 'customer_test@test.com',
            'phone': '555-0199'
        }
        
        customer_result = self.test_endpoint('/customers', 'POST', customer_data)
        tests.append({
            'name': 'Customer Creation',
            'result': customer_result,
            'critical': False
        })
        
        return tests

    def test_analytics_system(self):
        """Test analytics endpoints"""
        self.log("📊 TESTING ANALYTICS SYSTEM")
        
        tests = []
        
        # Analytics endpoint
        analytics_result = self.test_endpoint('/analytics')
        tests.append({
            'name': 'Analytics Data',
            'result': analytics_result,
            'critical': False
        })
        
        return tests

    def run_comprehensive_backend_analysis(self):
        """Execute complete backend analysis"""
        self.log("🚀 STARTING FOCUSED BACKEND ANALYSIS")
        self.log("=" * 80)
        
        all_tests = []
        
        try:
            # Run all test suites
            all_tests.extend(self.test_health_system())
            all_tests.extend(self.test_square_payment_system())
            all_tests.extend(self.test_coupon_system())
            all_tests.extend(self.test_admin_system())
            all_tests.extend(self.test_customer_system())
            all_tests.extend(self.test_analytics_system())
            
            # Calculate results
            total_tests = len(all_tests)
            successful_tests = sum(1 for test in all_tests if test['result']['success'])
            critical_tests = [test for test in all_tests if test.get('critical', False)]
            successful_critical = sum(1 for test in critical_tests if test['result']['success'])
            
            # Calculate response times
            response_times = [test['result']['response_time_ms'] for test in all_tests 
                            if test['result']['success'] and 'response_time_ms' in test['result']]
            avg_response_time = sum(response_times) / len(response_times) if response_times else 0
            
            # Generate summary
            success_rate = (successful_tests / total_tests) * 100 if total_tests > 0 else 0
            critical_success_rate = (successful_critical / len(critical_tests)) * 100 if critical_tests else 0
            
            self.results['test_summary'] = {
                'total_tests': total_tests,
                'successful_tests': successful_tests,
                'success_rate_percent': round(success_rate, 1),
                'critical_tests': len(critical_tests),
                'successful_critical': successful_critical,
                'critical_success_rate_percent': round(critical_success_rate, 1),
                'average_response_time_ms': round(avg_response_time, 2),
                'overall_status': 'EXCELLENT' if critical_success_rate >= 90 else 'GOOD' if critical_success_rate >= 80 else 'NEEDS_WORK'
            }
            
            self.results['detailed_results'] = {test['name']: test['result'] for test in all_tests}
            
            self.log("=" * 80)
            self.log("✅ FOCUSED BACKEND ANALYSIS COMPLETE", "SUCCESS")
            
            return self.results
            
        except Exception as e:
            self.log(f"❌ ANALYSIS FAILED: {str(e)}", "ERROR")
            return {'error': str(e), 'partial_results': self.results}

    def print_summary(self):
        """Print executive summary of backend analysis"""
        print("\n" + "=" * 80)
        print("🎯 TASTE OF GRATITUDE - FOCUSED BACKEND ANALYSIS SUMMARY")
        print("=" * 80)
        
        summary = self.results.get('test_summary', {})
        
        print(f"📊 OVERALL STATUS: {summary.get('overall_status', 'UNKNOWN')}")
        print(f"📈 SUCCESS RATE: {summary.get('success_rate_percent', 0):.1f}% ({summary.get('successful_tests', 0)}/{summary.get('total_tests', 0)} tests)")
        print(f"🔥 CRITICAL SYSTEMS: {summary.get('critical_success_rate_percent', 0):.1f}% ({summary.get('successful_critical', 0)}/{summary.get('critical_tests', 0)} critical tests)")
        print(f"⚡ AVG RESPONSE TIME: {summary.get('average_response_time_ms', 0):.0f}ms")
        
        print(f"\n📋 DETAILED TEST RESULTS:")
        for test_name, result in self.results.get('detailed_results', {}).items():
            status = "✅" if result['success'] else "❌"
            response_time = result.get('response_time_ms', 0)
            print(f"  {status} {test_name}: {result.get('status_code', 'N/A')} ({response_time:.0f}ms)")
        
        print("\n" + "=" * 80)

def main():
    """Main execution function"""
    # Get base URL from environment or use default
    import os
    base_url = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://gratog-payments.preview.emergentagent.com')
    
    print("🎯 TASTE OF GRATITUDE E-COMMERCE PLATFORM")
    print("📊 FOCUSED BACKEND ANALYSIS STARTING...")
    print(f"🌐 Base URL: {base_url}")
    print("=" * 80)
    
    # Initialize and run analyzer
    analyzer = FocusedBackendAnalyzer(base_url)
    results = analyzer.run_comprehensive_backend_analysis()
    
    # Print summary
    analyzer.print_summary()
    
    # Save detailed results
    with open('/app/focused_backend_results.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"\n📄 Detailed results saved to: /app/focused_backend_results.json")
    
    return results

if __name__ == "__main__":
    main()