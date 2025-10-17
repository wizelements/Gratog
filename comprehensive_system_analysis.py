#!/usr/bin/env python3
"""
Comprehensive Application State Analysis - Taste of Gratitude E-commerce Platform
Complete System Inventory and Functionality Assessment
"""

import requests
import json
import time
import sys
from datetime import datetime
from typing import Dict, List, Any

class ComprehensiveSystemAnalyzer:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip('/')
        self.api_base = f"{self.base_url}/api"
        self.results = {
            'timestamp': datetime.now().isoformat(),
            'base_url': base_url,
            'api_endpoints': {},
            'database_integration': {},
            'payment_processing': {},
            'feature_completeness': {},
            'performance_metrics': {},
            'production_readiness': {},
            'overall_assessment': {}
        }
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'ComprehensiveSystemAnalyzer/1.0'
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

    def analyze_api_endpoints(self):
        """Complete API Endpoint Inventory and Testing"""
        self.log("🔍 STARTING COMPLETE API ENDPOINT INVENTORY", "INFO")
        
        # Core API endpoints to test
        endpoints = [
            # Health and Status
            {'endpoint': '/health', 'method': 'GET', 'name': 'Health Check'},
            {'endpoint': '/root', 'method': 'GET', 'name': 'Root API'},
            {'endpoint': '/status', 'method': 'GET', 'name': 'Status Check (GET)'},
            {'endpoint': '/status', 'method': 'POST', 'name': 'Status Check (POST)', 
             'data': {'client_name': 'system_analyzer'}},
            
            # Square Payment System
            {'endpoint': '/square-payment', 'method': 'GET', 'name': 'Square Payment Info'},
            {'endpoint': '/square-payment', 'method': 'POST', 'name': 'Square Payment Processing',
             'data': {
                 'sourceId': 'cnon:card-nonce-ok',
                 'amount': 25.00,
                 'currency': 'USD',
                 'orderId': f'test_order_{int(time.time())}',
                 'orderData': {
                     'customer': {
                         'name': 'System Analyzer',
                         'email': 'analyzer@test.com',
                         'phone': '555-0123'
                     },
                     'cart': [{'name': 'Test Product', 'price': 25.00, 'quantity': 1}],
                     'fulfillmentType': 'pickup'
                 }
             }},
            {'endpoint': '/square-diagnose', 'method': 'POST', 'name': 'Square Diagnostic'},
            {'endpoint': '/square-diagnose', 'method': 'GET', 'name': 'Square Diagnostic Info'},
            {'endpoint': '/square-webhook', 'method': 'GET', 'name': 'Square Webhook Status'},
            {'endpoint': '/square-webhook', 'method': 'POST', 'name': 'Square Webhook Processing',
             'data': {'type': 'payment.completed', 'data': {'payment': {'id': 'test_payment'}}}},
            
            # Coupon System
            {'endpoint': '/coupons/create', 'method': 'POST', 'name': 'Coupon Creation',
             'data': {
                 'customerEmail': 'analyzer@test.com',
                 'discountAmount': 5.00,
                 'type': 'system_test',
                 'source': 'analyzer'
             }},
            {'endpoint': '/coupons/create?email=analyzer@test.com', 'method': 'GET', 'name': 'Coupon Retrieval'},
            {'endpoint': '/coupons/validate', 'method': 'POST', 'name': 'Coupon Validation',
             'data': {'couponCode': 'TEST123', 'customerEmail': 'analyzer@test.com'}},
            
            # Admin System
            {'endpoint': '/admin/coupons', 'method': 'GET', 'name': 'Admin Coupon Management'},
            {'endpoint': '/admin/auth', 'method': 'POST', 'name': 'Admin Authentication',
             'data': {'username': 'admin', 'password': 'test'}},
            
            # Customer Management
            {'endpoint': '/customers', 'method': 'GET', 'name': 'Customer List'},
            {'endpoint': '/customers', 'method': 'POST', 'name': 'Customer Creation',
             'data': {
                 'name': 'System Analyzer',
                 'email': 'analyzer@test.com',
                 'phone': '555-0123'
             }},
            
            # Order Management
            {'endpoint': '/orders/create', 'method': 'POST', 'name': 'Order Creation',
             'data': {
                 'customer': {'name': 'Test', 'email': 'test@test.com'},
                 'items': [{'name': 'Test Product', 'price': 25.00}],
                 'total': 25.00
             }},
            
            # Analytics
            {'endpoint': '/analytics', 'method': 'GET', 'name': 'Analytics Data'},
            
            # Waitlist
            {'endpoint': '/waitlist', 'method': 'POST', 'name': 'Waitlist Registration',
             'data': {'email': 'analyzer@test.com', 'name': 'System Analyzer'}},
        ]
        
        api_results = {}
        successful_endpoints = 0
        total_response_time = 0
        
        for endpoint_config in endpoints:
            endpoint = endpoint_config['endpoint']
            method = endpoint_config['method']
            name = endpoint_config['name']
            data = endpoint_config.get('data')
            
            self.log(f"Testing {name} ({method} {endpoint})")
            
            result = self.test_endpoint(endpoint, method, data)
            api_results[name] = result
            
            if result['success']:
                successful_endpoints += 1
                total_response_time += result.get('response_time_ms', 0)
                self.log(f"✅ {name}: {result['status_code']} ({result.get('response_time_ms', 0):.0f}ms)")
            else:
                self.log(f"❌ {name}: {result.get('error', 'Failed')}")
        
        # Calculate metrics
        success_rate = (successful_endpoints / len(endpoints)) * 100
        avg_response_time = total_response_time / successful_endpoints if successful_endpoints > 0 else 0
        
        self.results['api_endpoints'] = {
            'total_tested': len(endpoints),
            'successful': successful_endpoints,
            'success_rate_percent': round(success_rate, 1),
            'average_response_time_ms': round(avg_response_time, 2),
            'detailed_results': api_results
        }
        
        self.log(f"📊 API ENDPOINT ANALYSIS COMPLETE: {successful_endpoints}/{len(endpoints)} successful ({success_rate:.1f}%)")

    def analyze_database_integration(self):
        """Database Integration Status Analysis"""
        self.log("🗄️ ANALYZING DATABASE INTEGRATION STATUS", "INFO")
        
        db_tests = []
        
        # Test database connectivity through health endpoint
        health_result = self.test_endpoint('/health')
        if health_result['success'] and 'response_data' in health_result:
            health_data = health_result['response_data']
            db_status = health_data.get('services', {}).get('database', 'unknown')
            db_tests.append({
                'test': 'Database Connectivity',
                'status': db_status,
                'success': db_status == 'connected'
            })
        
        # Test data operations through status endpoint
        status_post = self.test_endpoint('/status', 'POST', {'client_name': 'db_test'})
        db_tests.append({
            'test': 'Database Write Operation',
            'status': 'success' if status_post['success'] else 'failed',
            'success': status_post['success']
        })
        
        # Test data retrieval
        status_get = self.test_endpoint('/status')
        db_tests.append({
            'test': 'Database Read Operation',
            'status': 'success' if status_get['success'] else 'failed',
            'success': status_get['success']
        })
        
        # Test coupon system (database operations)
        coupon_create = self.test_endpoint('/coupons/create', 'POST', {
            'customerEmail': 'db_test@test.com',
            'discountAmount': 2.00,
            'type': 'db_test'
        })
        db_tests.append({
            'test': 'Coupon Database Operations',
            'status': 'success' if coupon_create['success'] else 'failed',
            'success': coupon_create['success']
        })
        
        successful_db_tests = sum(1 for test in db_tests if test['success'])
        
        self.results['database_integration'] = {
            'total_tests': len(db_tests),
            'successful_tests': successful_db_tests,
            'success_rate_percent': round((successful_db_tests / len(db_tests)) * 100, 1),
            'detailed_tests': db_tests
        }
        
        self.log(f"📊 DATABASE INTEGRATION: {successful_db_tests}/{len(db_tests)} tests passed")

    def analyze_payment_processing(self):
        """Payment Processing Pipeline Analysis"""
        self.log("💳 ANALYZING PAYMENT PROCESSING PIPELINE", "INFO")
        
        payment_tests = []
        
        # Test Square diagnostic system
        square_diag = self.test_endpoint('/square-diagnose', 'POST')
        payment_tests.append({
            'test': 'Square Credential Diagnostic',
            'success': square_diag['success'],
            'details': square_diag.get('response_data', {})
        })
        
        # Test Square payment processing
        square_payment = self.test_endpoint('/square-payment', 'POST', {
            'sourceId': 'cnon:card-nonce-ok',
            'amount': 1.00,
            'currency': 'USD',
            'orderId': f'payment_test_{int(time.time())}',
            'orderData': {
                'customer': {'name': 'Payment Test', 'email': 'payment@test.com'},
                'cart': [{'name': 'Test Item', 'price': 1.00}]
            }
        })
        payment_tests.append({
            'test': 'Square Payment Processing',
            'success': square_payment['success'],
            'details': square_payment.get('response_data', {})
        })
        
        # Test webhook system
        webhook_test = self.test_endpoint('/square-webhook', 'POST', {
            'type': 'payment.completed',
            'data': {'payment': {'id': 'test_payment_webhook'}}
        })
        payment_tests.append({
            'test': 'Square Webhook Processing',
            'success': webhook_test['success'],
            'details': webhook_test.get('response_data', {})
        })
        
        # Analyze payment system status
        payment_mode = 'unknown'
        authentication_status = 'unknown'
        
        if square_diag['success'] and 'response_data' in square_diag:
            diag_data = square_diag['response_data']
            if 'results' in diag_data:
                results = diag_data['results']
                authentication_status = results.get('overallStatus', 'unknown')
        
        if square_payment['success'] and 'response_data' in square_payment:
            payment_data = square_payment['response_data']
            payment_id = payment_data.get('paymentId', '')
            if payment_id.startswith('mock_') or payment_id.startswith('fallback_'):
                payment_mode = 'hybrid_fallback'
            else:
                payment_mode = 'live_square'
        
        successful_payment_tests = sum(1 for test in payment_tests if test['success'])
        
        self.results['payment_processing'] = {
            'total_tests': len(payment_tests),
            'successful_tests': successful_payment_tests,
            'success_rate_percent': round((successful_payment_tests / len(payment_tests)) * 100, 1),
            'payment_mode': payment_mode,
            'authentication_status': authentication_status,
            'detailed_tests': payment_tests
        }
        
        self.log(f"📊 PAYMENT PROCESSING: {successful_payment_tests}/{len(payment_tests)} tests passed")
        self.log(f"💳 Payment Mode: {payment_mode}, Auth Status: {authentication_status}")

    def analyze_feature_completeness(self):
        """Feature Completeness Assessment"""
        self.log("🎯 ANALYZING FEATURE COMPLETENESS", "INFO")
        
        features = []
        
        # Customer Management
        customer_test = self.test_endpoint('/customers', 'POST', {
            'name': 'Feature Test',
            'email': 'feature@test.com',
            'phone': '555-0199'
        })
        features.append({
            'feature': 'Customer Management',
            'status': 'functional' if customer_test['success'] else 'non_functional',
            'success': customer_test['success']
        })
        
        # Coupon System
        coupon_test = self.test_endpoint('/coupons/create', 'POST', {
            'customerEmail': 'feature@test.com',
            'discountAmount': 3.00,
            'type': 'feature_test'
        })
        features.append({
            'feature': 'Coupon System',
            'status': 'functional' if coupon_test['success'] else 'non_functional',
            'success': coupon_test['success']
        })
        
        # Order Processing
        order_test = self.test_endpoint('/orders/create', 'POST', {
            'customer': {'name': 'Feature Test', 'email': 'feature@test.com'},
            'items': [{'name': 'Feature Test Product', 'price': 15.00}],
            'total': 15.00
        })
        features.append({
            'feature': 'Order Processing',
            'status': 'functional' if order_test['success'] else 'non_functional',
            'success': order_test['success']
        })
        
        # Admin System
        admin_test = self.test_endpoint('/admin/coupons')
        features.append({
            'feature': 'Admin Management',
            'status': 'functional' if admin_test['success'] else 'non_functional',
            'success': admin_test['success']
        })
        
        # Analytics
        analytics_test = self.test_endpoint('/analytics')
        features.append({
            'feature': 'Analytics System',
            'status': 'functional' if analytics_test['success'] else 'non_functional',
            'success': analytics_test['success']
        })
        
        # Waitlist
        waitlist_test = self.test_endpoint('/waitlist', 'POST', {
            'email': 'feature@test.com',
            'name': 'Feature Test'
        })
        features.append({
            'feature': 'Waitlist Management',
            'status': 'functional' if waitlist_test['success'] else 'non_functional',
            'success': waitlist_test['success']
        })
        
        functional_features = sum(1 for feature in features if feature['success'])
        
        self.results['feature_completeness'] = {
            'total_features': len(features),
            'functional_features': functional_features,
            'completeness_percent': round((functional_features / len(features)) * 100, 1),
            'detailed_features': features
        }
        
        self.log(f"📊 FEATURE COMPLETENESS: {functional_features}/{len(features)} features functional")

    def analyze_performance_metrics(self):
        """Performance and Optimization Status"""
        self.log("⚡ ANALYZING PERFORMANCE METRICS", "INFO")
        
        # Test multiple endpoints for performance analysis
        performance_tests = [
            {'endpoint': '/health', 'name': 'Health Check'},
            {'endpoint': '/status', 'name': 'Status Endpoint'},
            {'endpoint': '/coupons/create', 'method': 'POST', 'name': 'Coupon Creation',
             'data': {'customerEmail': 'perf@test.com', 'discountAmount': 1.00}},
            {'endpoint': '/square-diagnose', 'method': 'POST', 'name': 'Square Diagnostic'},
        ]
        
        response_times = []
        
        for test in performance_tests:
            method = test.get('method', 'GET')
            data = test.get('data')
            
            # Run test multiple times for average
            times = []
            for i in range(3):
                result = self.test_endpoint(test['endpoint'], method, data)
                if result['success']:
                    times.append(result['response_time_ms'])
            
            if times:
                avg_time = sum(times) / len(times)
                response_times.append({
                    'endpoint': test['name'],
                    'average_response_time_ms': round(avg_time, 2),
                    'min_time_ms': min(times),
                    'max_time_ms': max(times)
                })
        
        overall_avg = sum(rt['average_response_time_ms'] for rt in response_times) / len(response_times) if response_times else 0
        
        self.results['performance_metrics'] = {
            'overall_average_response_time_ms': round(overall_avg, 2),
            'performance_grade': 'excellent' if overall_avg < 500 else 'good' if overall_avg < 1000 else 'needs_improvement',
            'detailed_metrics': response_times
        }
        
        self.log(f"📊 PERFORMANCE: Average response time {overall_avg:.0f}ms")

    def analyze_production_readiness(self):
        """Production Readiness Evaluation"""
        self.log("🚀 ANALYZING PRODUCTION READINESS", "INFO")
        
        readiness_checks = []
        
        # Health endpoint check
        health_result = self.test_endpoint('/health')
        if health_result['success'] and 'response_data' in health_result:
            health_data = health_result['response_data']
            readiness_checks.append({
                'check': 'Health Monitoring',
                'status': health_data.get('status', 'unknown'),
                'success': health_data.get('status') == 'healthy'
            })
            
            # Service status checks
            services = health_data.get('services', {})
            for service, status in services.items():
                readiness_checks.append({
                    'check': f'{service.title()} Service',
                    'status': status,
                    'success': status in ['connected', 'configured', 'production', 'sandbox']
                })
        
        # Error handling check
        error_test = self.test_endpoint('/nonexistent-endpoint')
        readiness_checks.append({
            'check': 'Error Handling',
            'status': 'proper_404' if error_test['status_code'] == 404 else 'improper',
            'success': error_test['status_code'] == 404
        })
        
        # CORS headers check
        cors_test = self.test_endpoint('/health')
        has_cors = 'access-control-allow-origin' in cors_test.get('headers', {})
        readiness_checks.append({
            'check': 'CORS Configuration',
            'status': 'configured' if has_cors else 'not_configured',
            'success': has_cors
        })
        
        # Performance check
        avg_response_time = self.results.get('performance_metrics', {}).get('overall_average_response_time_ms', 0)
        readiness_checks.append({
            'check': 'Performance Standards',
            'status': 'meets_standards' if avg_response_time < 2000 else 'needs_improvement',
            'success': avg_response_time < 2000
        })
        
        passed_checks = sum(1 for check in readiness_checks if check['success'])
        readiness_score = (passed_checks / len(readiness_checks)) * 100
        
        self.results['production_readiness'] = {
            'total_checks': len(readiness_checks),
            'passed_checks': passed_checks,
            'readiness_score_percent': round(readiness_score, 1),
            'readiness_level': 'production_ready' if readiness_score >= 90 else 'needs_work' if readiness_score >= 70 else 'not_ready',
            'detailed_checks': readiness_checks
        }
        
        self.log(f"📊 PRODUCTION READINESS: {passed_checks}/{len(readiness_checks)} checks passed ({readiness_score:.1f}%)")

    def generate_overall_assessment(self):
        """Generate Overall System Assessment"""
        self.log("📋 GENERATING OVERALL SYSTEM ASSESSMENT", "INFO")
        
        # Calculate overall scores
        api_score = self.results['api_endpoints']['success_rate_percent']
        db_score = self.results['database_integration']['success_rate_percent']
        payment_score = self.results['payment_processing']['success_rate_percent']
        feature_score = self.results['feature_completeness']['completeness_percent']
        performance_score = 100 if self.results['performance_metrics']['performance_grade'] == 'excellent' else 80 if self.results['performance_metrics']['performance_grade'] == 'good' else 60
        readiness_score = self.results['production_readiness']['readiness_score_percent']
        
        overall_score = (api_score + db_score + payment_score + feature_score + performance_score + readiness_score) / 6
        
        # Determine system status
        if overall_score >= 90:
            system_status = 'EXCELLENT'
        elif overall_score >= 80:
            system_status = 'GOOD'
        elif overall_score >= 70:
            system_status = 'ACCEPTABLE'
        else:
            system_status = 'NEEDS_IMPROVEMENT'
        
        # Identify critical issues
        critical_issues = []
        if db_score < 80:
            critical_issues.append('Database integration issues')
        if payment_score < 70:
            critical_issues.append('Payment processing problems')
        if api_score < 80:
            critical_issues.append('API endpoint failures')
        if readiness_score < 80:
            critical_issues.append('Production readiness concerns')
        
        # Generate recommendations
        recommendations = []
        if self.results['payment_processing']['authentication_status'] == 'AUTHENTICATION_FAILED':
            recommendations.append('Resolve Square authentication issues in Developer Dashboard')
        if performance_score < 80:
            recommendations.append('Optimize API response times')
        if readiness_score < 90:
            recommendations.append('Address production readiness gaps')
        
        self.results['overall_assessment'] = {
            'overall_score_percent': round(overall_score, 1),
            'system_status': system_status,
            'critical_issues': critical_issues,
            'recommendations': recommendations,
            'deployment_ready': overall_score >= 80 and len(critical_issues) == 0,
            'component_scores': {
                'api_endpoints': api_score,
                'database_integration': db_score,
                'payment_processing': payment_score,
                'feature_completeness': feature_score,
                'performance': performance_score,
                'production_readiness': readiness_score
            }
        }
        
        self.log(f"📊 OVERALL ASSESSMENT: {system_status} ({overall_score:.1f}%)")

    def run_comprehensive_analysis(self):
        """Execute complete system analysis"""
        self.log("🚀 STARTING COMPREHENSIVE SYSTEM ANALYSIS", "INFO")
        self.log("=" * 80)
        
        try:
            # Run all analysis components
            self.analyze_api_endpoints()
            self.analyze_database_integration()
            self.analyze_payment_processing()
            self.analyze_feature_completeness()
            self.analyze_performance_metrics()
            self.analyze_production_readiness()
            self.generate_overall_assessment()
            
            self.log("=" * 80)
            self.log("✅ COMPREHENSIVE SYSTEM ANALYSIS COMPLETE", "SUCCESS")
            
            return self.results
            
        except Exception as e:
            self.log(f"❌ ANALYSIS FAILED: {str(e)}", "ERROR")
            return {'error': str(e), 'partial_results': self.results}

    def print_summary(self):
        """Print executive summary of analysis"""
        print("\n" + "=" * 80)
        print("🎯 TASTE OF GRATITUDE E-COMMERCE PLATFORM - SYSTEM ANALYSIS SUMMARY")
        print("=" * 80)
        
        assessment = self.results.get('overall_assessment', {})
        
        print(f"📊 OVERALL SYSTEM STATUS: {assessment.get('system_status', 'UNKNOWN')}")
        print(f"📈 OVERALL SCORE: {assessment.get('overall_score_percent', 0):.1f}%")
        print(f"🚀 DEPLOYMENT READY: {'YES' if assessment.get('deployment_ready', False) else 'NO'}")
        
        print("\n📋 COMPONENT BREAKDOWN:")
        scores = assessment.get('component_scores', {})
        for component, score in scores.items():
            status = "✅" if score >= 80 else "⚠️" if score >= 70 else "❌"
            print(f"  {status} {component.replace('_', ' ').title()}: {score:.1f}%")
        
        critical_issues = assessment.get('critical_issues', [])
        if critical_issues:
            print(f"\n🚨 CRITICAL ISSUES ({len(critical_issues)}):")
            for issue in critical_issues:
                print(f"  ❌ {issue}")
        
        recommendations = assessment.get('recommendations', [])
        if recommendations:
            print(f"\n💡 RECOMMENDATIONS ({len(recommendations)}):")
            for rec in recommendations:
                print(f"  🔧 {rec}")
        
        print("\n" + "=" * 80)

def main():
    """Main execution function"""
    # Get base URL from environment or use default
    import os
    base_url = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://square-payments-2.preview.emergentagent.com')
    
    print("🎯 TASTE OF GRATITUDE E-COMMERCE PLATFORM")
    print("📊 COMPREHENSIVE SYSTEM ANALYSIS STARTING...")
    print(f"🌐 Base URL: {base_url}")
    print("=" * 80)
    
    # Initialize and run analyzer
    analyzer = ComprehensiveSystemAnalyzer(base_url)
    results = analyzer.run_comprehensive_analysis()
    
    # Print summary
    analyzer.print_summary()
    
    # Save detailed results
    with open('/app/comprehensive_analysis_results.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"\n📄 Detailed results saved to: /app/comprehensive_analysis_results.json")
    
    return results

if __name__ == "__main__":
    main()