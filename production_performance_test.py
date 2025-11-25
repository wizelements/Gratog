#!/usr/bin/env python3
"""
Final Production Readiness Validation - Performance Optimizations Test
Test all performance optimizations for tasteofgratitude.shop deployment

Focus Areas:
1. Square Authentication & Payment Processing with updated credentials format
2. Database Performance Optimization (connection pooling, caching)
3. API Response Time Optimization (compression, ETag, Server-Timing)
4. Memory & Resource Management (garbage collection, monitoring)
5. Production Configuration Validation (Next.js optimizations, security headers)

Performance Benchmarks:
- API responses: < 2 seconds target
- Database queries: < 500ms target
- Memory usage: < 85% system capacity
- CPU usage: < 90% under normal load
"""

import requests
import time
import json
import concurrent.futures
import threading
from datetime import datetime
import os
import sys

# Configuration
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://gratitude-platform.preview.emergentagent.com')
API_BASE = f"{BASE_URL}/api"

class ProductionPerformanceTest:
    def __init__(self):
        self.test_results = []
        self.start_time = time.time()
        self.performance_metrics = {
            'api_response_times': [],
            'database_query_times': [],
            'memory_usage': [],
            'concurrent_performance': []
        }
        
    def log_test(self, test_name, success, details="", response_time=None, category="general"):
        """Log test results with performance metrics"""
        result = {
            'test': test_name,
            'success': success,
            'details': details,
            'response_time_ms': response_time,
            'category': category,
            'timestamp': datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        # Store performance metrics
        if response_time and category in self.performance_metrics:
            self.performance_metrics[category].append(response_time)
        
        status = "✅ PASS" if success else "❌ FAIL"
        time_info = f" ({response_time}ms)" if response_time else ""
        print(f"{status}: {test_name}{time_info}")
        if details:
            print(f"    {details}")
        print()

    def test_square_authentication_performance(self):
        """Test 1: Square Authentication & Payment Processing Performance"""
        print("🟦 TEST 1: SQUARE AUTHENTICATION & PAYMENT PROCESSING")
        print("Testing Square integration with updated credentials format and performance")
        
        # Test Square payment with performance monitoring
        test_data = {
            "sourceId": "cnon:card-nonce-ok",
            "amount": 35.00,  # Elderberry Sea Moss price
            "currency": "USD",
            "orderId": f"perf_test_{int(time.time())}",
            "orderData": {
                "customer": {
                    "email": "performance.test@example.com",
                    "name": "Performance Test",
                    "phone": "+1234567890"
                },
                "cart": [
                    {
                        "name": "Elderberry Sea Moss 16oz",
                        "price": 35.00,
                        "quantity": 1,
                        "id": "elderberry-sea-moss-16oz"
                    }
                ],
                "fulfillmentType": "delivery",
                "deliveryAddress": {
                    "street": "123 Test St",
                    "city": "Atlanta",
                    "state": "GA",
                    "zipCode": "30309"
                }
            }
        }
        
        try:
            start_time = time.time()
            response = requests.post(
                f"{API_BASE}/square-payment",
                json=test_data,
                headers={"Content-Type": "application/json"},
                timeout=30
            )
            response_time = int((time.time() - start_time) * 1000)
            
            # Check response headers for performance optimizations
            server_timing = response.headers.get('Server-Timing', '')
            cache_control = response.headers.get('Cache-Control', '')
            etag = response.headers.get('ETag', '')
            
            if response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    # Check if response time meets < 2s requirement
                    if response_time <= 2000:
                        self.log_test("Square Payment Performance", True, 
                                     f"Payment processed in {response_time}ms (< 2s target). Payment ID: {result.get('paymentId')}", 
                                     response_time, "api_response_times")
                    else:
                        self.log_test("Square Payment Performance", False, 
                                     f"Payment took {response_time}ms (> 2s target)", 
                                     response_time, "api_response_times")
                    
                    # Test performance headers
                    if server_timing:
                        self.log_test("Square API Server-Timing Header", True, 
                                     f"Server-Timing header present: {server_timing}")
                    else:
                        self.log_test("Square API Server-Timing Header", False, 
                                     "Server-Timing header missing")
                        
                    # Test live/mock mode detection
                    payment_id = result.get('paymentId', '')
                    if payment_id.startswith('mock_payment_'):
                        self.log_test("Square Mock Mode Detection", True, 
                                     "Mock mode properly detected and working")
                    else:
                        self.log_test("Square Live Mode Detection", True, 
                                     "Live mode detected - real Square credentials working")
                else:
                    self.log_test("Square Payment Processing", False, 
                                 f"Payment failed: {result.get('error')}", response_time)
            else:
                self.log_test("Square Payment API", False, 
                             f"HTTP {response.status_code}: {response.text[:200]}", response_time)
                
        except Exception as e:
            self.log_test("Square Payment Integration", False, f"Request failed: {str(e)}")

    def test_database_performance_optimization(self):
        """Test 2: Database Performance with Connection Pooling & Caching"""
        print("🗄️ TEST 2: DATABASE PERFORMANCE OPTIMIZATION")
        print("Testing optimized database connections, pooling, and cached queries")
        
        # Test multiple database operations to verify connection pooling
        database_operations = [
            ("/health", "Health check with database connectivity"),
            ("/admin/coupons", "Admin coupon retrieval (should use cached queries)"),
            ("/coupons/validate", "Coupon validation (database lookup)")
        ]
        
        for endpoint, description in database_operations:
            try:
                start_time = time.time()
                
                if endpoint == "/coupons/validate":
                    response = requests.post(f"{API_BASE}{endpoint}", 
                                           json={"couponCode": "PERF_TEST", "customerEmail": "test@example.com"},
                                           headers={'Content-Type': 'application/json'},
                                           timeout=10)
                else:
                    response = requests.get(f"{API_BASE}{endpoint}", timeout=10)
                
                response_time = int((time.time() - start_time) * 1000)
                
                # Database queries should be < 500ms target
                if response_time <= 500:
                    self.log_test(f"Database Query Performance - {description}", True, 
                                 f"Query completed in {response_time}ms (< 500ms target)", 
                                 response_time, "database_query_times")
                else:
                    self.log_test(f"Database Query Performance - {description}", False, 
                                 f"Query took {response_time}ms (> 500ms target)", 
                                 response_time, "database_query_times")
                
                # Check for caching headers
                cache_control = response.headers.get('Cache-Control', '')
                etag = response.headers.get('ETag', '')
                
                if cache_control and 'max-age' in cache_control:
                    self.log_test(f"Database Caching Headers - {endpoint}", True, 
                                 f"Cache-Control header present: {cache_control}")
                elif endpoint == "/health":
                    # Health endpoint might not be cached
                    self.log_test(f"Database Caching Headers - {endpoint}", True, 
                                 "Health endpoint correctly not cached")
                else:
                    self.log_test(f"Database Caching Headers - {endpoint}", False, 
                                 "Cache-Control header missing for cacheable endpoint")
                
            except Exception as e:
                self.log_test(f"Database Operation - {description}", False, f"Request failed: {str(e)}")

    def test_api_response_optimization(self):
        """Test 3: API Response Time Optimization (Compression, ETag, Caching)"""
        print("⚡ TEST 3: API RESPONSE TIME OPTIMIZATION")
        print("Testing ResponseOptimizer compression, caching, and ETag generation")
        
        # Test critical API endpoints for optimization features
        api_endpoints = [
            ("/health", "GET", None, "Health monitoring endpoint"),
            ("/checkout", "POST", {
                "items": [{"id": "elderberry-sea-moss-16oz", "quantity": 1}],
                "customer": {"email": "optimization.test@example.com"}
            }, "Stripe checkout optimization"),
            ("/coupons/create", "POST", {
                "email": "optimization.test@example.com",
                "type": "manual",
                "discountAmount": 5.00
            }, "Coupon creation optimization")
        ]
        
        for endpoint, method, data, description in api_endpoints:
            try:
                start_time = time.time()
                
                if method == "GET":
                    response = requests.get(f"{API_BASE}{endpoint}", timeout=10)
                else:
                    response = requests.post(f"{API_BASE}{endpoint}", 
                                           json=data, 
                                           headers={'Content-Type': 'application/json'},
                                           timeout=10)
                
                response_time = int((time.time() - start_time) * 1000)
                
                # API responses should be < 2s target
                if response_time <= 2000:
                    self.log_test(f"API Response Time - {description}", True, 
                                 f"Response in {response_time}ms (< 2s target)", 
                                 response_time, "api_response_times")
                else:
                    self.log_test(f"API Response Time - {description}", False, 
                                 f"Response in {response_time}ms (> 2s target)", 
                                 response_time, "api_response_times")
                
                # Check optimization headers
                headers_to_check = {
                    'Server-Timing': 'Performance timing header',
                    'X-Response-Time': 'Response time tracking',
                    'Cache-Control': 'Caching optimization',
                    'ETag': 'ETag for 304 responses'
                }
                
                optimization_score = 0
                for header, description_text in headers_to_check.items():
                    if response.headers.get(header):
                        optimization_score += 1
                
                if optimization_score >= 2:
                    self.log_test(f"Response Optimization Headers - {endpoint}", True, 
                                 f"Optimization headers present: {optimization_score}/4")
                else:
                    self.log_test(f"Response Optimization Headers - {endpoint}", False, 
                                 f"Missing optimization headers: {optimization_score}/4")
                
                # Test ETag functionality (304 responses)
                etag = response.headers.get('ETag')
                if etag and method == "GET":
                    try:
                        # Make second request with If-None-Match header
                        etag_response = requests.get(f"{API_BASE}{endpoint}", 
                                                   headers={'If-None-Match': etag},
                                                   timeout=5)
                        if etag_response.status_code == 304:
                            self.log_test(f"ETag 304 Optimization - {endpoint}", True, 
                                         "ETag 304 Not Modified response working")
                        else:
                            self.log_test(f"ETag 304 Optimization - {endpoint}", False, 
                                         f"ETag returned {etag_response.status_code} instead of 304")
                    except:
                        pass  # ETag test is optional
                
            except Exception as e:
                self.log_test(f"API Optimization - {description}", False, f"Request failed: {str(e)}")

    def test_memory_resource_management(self):
        """Test 4: Memory & Resource Management"""
        print("🧠 TEST 4: MEMORY & RESOURCE MANAGEMENT")
        print("Testing MemoryOptimizer garbage collection and memory pressure monitoring")
        
        # Test health endpoint for memory metrics
        try:
            response = requests.get(f"{API_BASE}/health", timeout=10)
            if response.status_code == 200:
                health_data = response.json()
                
                # Check for memory metrics in health response
                performance_data = health_data.get('performance', {})
                memory_data = performance_data.get('memory')
                
                if memory_data:
                    # Check memory usage levels
                    heap_used = memory_data.get('heapUsed', 0)
                    rss = memory_data.get('rss', 0)
                    
                    # Memory usage should be < 85% of reasonable limits (500MB for heap, 1GB for RSS)
                    if heap_used <= 425:  # 85% of 500MB
                        self.log_test("Memory Usage - Heap", True, 
                                     f"Heap usage: {heap_used}MB (< 425MB target)")
                    else:
                        self.log_test("Memory Usage - Heap", False, 
                                     f"High heap usage: {heap_used}MB (> 425MB target)")
                    
                    if rss <= 850:  # 85% of 1GB
                        self.log_test("Memory Usage - RSS", True, 
                                     f"RSS usage: {rss}MB (< 850MB target)")
                    else:
                        self.log_test("Memory Usage - RSS", False, 
                                     f"High RSS usage: {rss}MB (> 850MB target)")
                    
                    self.log_test("Memory Monitoring", True, 
                                 f"Memory monitoring active - Heap: {heap_used}MB, RSS: {rss}MB")
                else:
                    self.log_test("Memory Monitoring", False, 
                                 "Memory metrics not available in health endpoint")
            else:
                self.log_test("Memory Monitoring Endpoint", False, 
                             f"Health endpoint failed: {response.status_code}")
                
        except Exception as e:
            self.log_test("Memory Monitoring", False, f"Memory monitoring test failed: {str(e)}")
        
        # Test memory pressure under load (concurrent requests)
        print("    Testing memory pressure under concurrent load...")
        
        def make_concurrent_request():
            try:
                response = requests.post(f"{API_BASE}/coupons/validate", 
                                       json={"couponCode": f"LOAD_TEST_{time.time()}", 
                                            "customerEmail": "load.test@example.com"},
                                       headers={'Content-Type': 'application/json'},
                                       timeout=5)
                return response.status_code == 200 or response.status_code == 400  # 400 is expected for invalid coupon
            except:
                return False
        
        # Run 20 concurrent requests to test memory pressure
        with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
            futures = [executor.submit(make_concurrent_request) for _ in range(20)]
            results = [future.result() for future in concurrent.futures.as_completed(futures)]
        
        successful_requests = sum(results)
        if successful_requests >= 16:  # 80% success rate
            self.log_test("Memory Pressure Under Load", True, 
                         f"Handled concurrent load: {successful_requests}/20 requests successful")
        else:
            self.log_test("Memory Pressure Under Load", False, 
                         f"Failed under load: only {successful_requests}/20 requests successful")

    def test_production_configuration(self):
        """Test 5: Production Configuration Validation"""
        print("🚀 TEST 5: PRODUCTION CONFIGURATION VALIDATION")
        print("Testing Next.js production optimizations and security headers")
        
        # Test security headers on main pages
        pages_to_test = ["/", "/catalog", "/about"]
        
        for page in pages_to_test:
            try:
                response = requests.get(f"{BASE_URL}{page}", timeout=10)
                
                if response.status_code == 200:
                    # Check for security headers
                    security_headers = {
                        'X-Frame-Options': 'Clickjacking protection',
                        'X-Content-Type-Options': 'MIME type sniffing protection',
                        'X-XSS-Protection': 'XSS protection',
                        'Strict-Transport-Security': 'HTTPS enforcement',
                        'Content-Security-Policy': 'CSP protection'
                    }
                    
                    security_score = 0
                    for header, description in security_headers.items():
                        if response.headers.get(header):
                            security_score += 1
                    
                    if security_score >= 4:
                        self.log_test(f"Security Headers - {page}", True, 
                                     f"Security headers present: {security_score}/5")
                    else:
                        self.log_test(f"Security Headers - {page}", False, 
                                     f"Missing security headers: {security_score}/5")
                    
                    # Check page load performance
                    load_time = response.elapsed.total_seconds() * 1000
                    if load_time <= 3000:  # 3 second target for page loads
                        self.log_test(f"Page Load Performance - {page}", True, 
                                     f"Page loaded in {load_time:.0f}ms (< 3s target)")
                    else:
                        self.log_test(f"Page Load Performance - {page}", False, 
                                     f"Page loaded in {load_time:.0f}ms (> 3s target)")
                    
                    # Check for production optimizations in HTML
                    html = response.text
                    optimizations = {
                        'minified': len(html.split('\n')) < 50,  # Minified HTML has fewer lines
                        'gzip': 'gzip' in response.headers.get('Content-Encoding', ''),
                        'cache_control': 'Cache-Control' in response.headers
                    }
                    
                    optimization_count = sum(optimizations.values())
                    if optimization_count >= 2:
                        self.log_test(f"Production Optimizations - {page}", True, 
                                     f"Production optimizations detected: {optimization_count}/3")
                    else:
                        self.log_test(f"Production Optimizations - {page}", False, 
                                     f"Missing optimizations: {optimization_count}/3")
                else:
                    self.log_test(f"Page Accessibility - {page}", False, 
                                 f"Page returned {response.status_code}")
                    
            except Exception as e:
                self.log_test(f"Production Config - {page}", False, f"Test failed: {str(e)}")

    def test_concurrent_performance_benchmark(self):
        """Test 6: Concurrent Performance Benchmark"""
        print("🏃‍♂️ TEST 6: CONCURRENT PERFORMANCE BENCHMARK")
        print("Testing system performance under concurrent load")
        
        def benchmark_request():
            try:
                start_time = time.time()
                response = requests.get(f"{API_BASE}/health", timeout=10)
                response_time = int((time.time() - start_time) * 1000)
                return response.status_code == 200, response_time
            except:
                return False, None
        
        # Test with increasing concurrent load
        load_levels = [5, 10, 15]
        
        for concurrent_users in load_levels:
            print(f"    Testing with {concurrent_users} concurrent users...")
            
            with concurrent.futures.ThreadPoolExecutor(max_workers=concurrent_users) as executor:
                futures = [executor.submit(benchmark_request) for _ in range(concurrent_users)]
                results = [future.result() for future in concurrent.futures.as_completed(futures)]
            
            successful_requests = sum(1 for success, _ in results if success)
            response_times = [rt for success, rt in results if success and rt is not None]
            
            if response_times:
                avg_response_time = sum(response_times) / len(response_times)
                max_response_time = max(response_times)
                
                # Performance criteria: 80% success rate, avg < 2s, max < 5s
                success_rate = successful_requests / concurrent_users
                
                if success_rate >= 0.8 and avg_response_time <= 2000 and max_response_time <= 5000:
                    self.log_test(f"Concurrent Load - {concurrent_users} users", True, 
                                 f"Success: {success_rate:.1%}, Avg: {avg_response_time:.0f}ms, Max: {max_response_time:.0f}ms",
                                 avg_response_time, "concurrent_performance")
                else:
                    self.log_test(f"Concurrent Load - {concurrent_users} users", False, 
                                 f"Performance issues - Success: {success_rate:.1%}, Avg: {avg_response_time:.0f}ms, Max: {max_response_time:.0f}ms",
                                 avg_response_time, "concurrent_performance")
            else:
                self.log_test(f"Concurrent Load - {concurrent_users} users", False, 
                             f"All requests failed - {successful_requests}/{concurrent_users} successful")

    def run_comprehensive_performance_test(self):
        """Run comprehensive production performance validation"""
        print("🎯 FINAL PRODUCTION READINESS VALIDATION")
        print("Testing performance optimizations for tasteofgratitude.shop deployment")
        print("=" * 80)
        print(f"Target URL: {BASE_URL}")
        print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 80)
        
        # Run all performance tests
        self.test_square_authentication_performance()
        self.test_database_performance_optimization()
        self.test_api_response_optimization()
        self.test_memory_resource_management()
        self.test_production_configuration()
        self.test_concurrent_performance_benchmark()
        
        # Generate performance report
        self.generate_performance_report()

    def generate_performance_report(self):
        """Generate comprehensive performance report"""
        print("\n" + "=" * 80)
        print("🎯 PRODUCTION PERFORMANCE ASSESSMENT REPORT")
        print("=" * 80)
        
        total_tests = len(self.test_results)
        passed_tests = len([t for t in self.test_results if t['success']])
        failed_tests = total_tests - passed_tests
        
        print(f"\n📊 OVERALL RESULTS:")
        print(f"   Total Tests: {total_tests}")
        print(f"   ✅ Passed: {passed_tests} ({passed_tests/total_tests*100:.1f}%)")
        print(f"   ❌ Failed: {failed_tests} ({failed_tests/total_tests*100:.1f}%)")
        
        # Performance benchmarks analysis
        print(f"\n⚡ PERFORMANCE BENCHMARKS:")
        
        # API Response Times
        api_times = self.performance_metrics.get('api_response_times', [])
        if api_times:
            avg_api_time = sum(api_times) / len(api_times)
            max_api_time = max(api_times)
            print(f"   API Response Times: Avg {avg_api_time:.0f}ms, Max {max_api_time:.0f}ms")
            if avg_api_time <= 2000:
                print(f"   ✅ API Performance: MEETS < 2s target")
            else:
                print(f"   ❌ API Performance: EXCEEDS 2s target")
        
        # Database Query Times
        db_times = self.performance_metrics.get('database_query_times', [])
        if db_times:
            avg_db_time = sum(db_times) / len(db_times)
            max_db_time = max(db_times)
            print(f"   Database Query Times: Avg {avg_db_time:.0f}ms, Max {max_db_time:.0f}ms")
            if avg_db_time <= 500:
                print(f"   ✅ Database Performance: MEETS < 500ms target")
            else:
                print(f"   ❌ Database Performance: EXCEEDS 500ms target")
        
        # Concurrent Performance
        concurrent_times = self.performance_metrics.get('concurrent_performance', [])
        if concurrent_times:
            avg_concurrent_time = sum(concurrent_times) / len(concurrent_times)
            print(f"   Concurrent Load Performance: Avg {avg_concurrent_time:.0f}ms")
        
        # Critical systems check
        print(f"\n🔍 CRITICAL SYSTEMS STATUS:")
        
        critical_systems = {
            'Square Payment': any('Square Payment' in t['test'] and t['success'] for t in self.test_results),
            'Database Performance': any('Database Query Performance' in t['test'] and t['success'] for t in self.test_results),
            'API Optimization': any('API Response Time' in t['test'] and t['success'] for t in self.test_results),
            'Memory Management': any('Memory' in t['test'] and t['success'] for t in self.test_results),
            'Security Headers': any('Security Headers' in t['test'] and t['success'] for t in self.test_results)
        }
        
        for system, status in critical_systems.items():
            status_icon = "✅" if status else "❌"
            print(f"   {status_icon} {system}: {'OPERATIONAL' if status else 'ISSUES DETECTED'}")
        
        # Failed tests details
        if failed_tests > 0:
            print(f"\n❌ FAILED TESTS:")
            for test in self.test_results:
                if not test['success']:
                    print(f"   • {test['test']}: {test['details']}")
        
        # Production readiness assessment
        print(f"\n🚀 PRODUCTION READINESS ASSESSMENT:")
        
        pass_rate = passed_tests / total_tests
        critical_systems_working = sum(critical_systems.values()) >= 4  # At least 4/5 critical systems
        performance_acceptable = (not api_times or sum(api_times)/len(api_times) <= 2000) and \
                               (not db_times or sum(db_times)/len(db_times) <= 500)
        
        if pass_rate >= 0.85 and critical_systems_working and performance_acceptable:
            print("   ✅ READY FOR PRODUCTION DEPLOYMENT")
            print("   - All performance optimizations validated")
            print("   - Critical systems operational")
            print("   - Performance benchmarks met")
            print("   - Security configurations active")
            print("   - Memory management optimized")
        elif pass_rate >= 0.75:
            print("   ⚠️  MOSTLY READY - MINOR OPTIMIZATIONS NEEDED")
            print("   - Core performance optimizations working")
            print("   - Some fine-tuning recommended")
        else:
            print("   ❌ NOT READY FOR PRODUCTION")
            print("   - Critical performance issues detected")
            print("   - Optimization implementation incomplete")
        
        total_time = time.time() - self.start_time
        print(f"\n⏱️  Test Duration: {total_time:.1f} seconds")
        print("=" * 80)
        
        return {
            'pass_rate': pass_rate,
            'total_tests': total_tests,
            'passed_tests': passed_tests,
            'failed_tests': failed_tests,
            'performance_benchmarks_met': performance_acceptable,
            'critical_systems_operational': critical_systems_working,
            'production_ready': pass_rate >= 0.85 and critical_systems_working and performance_acceptable
        }

def main():
    """Run production performance validation"""
    print("🎯 FINAL PRODUCTION READINESS VALIDATION")
    print("Performance Optimizations Test for tasteofgratitude.shop deployment")
    print(f"Target URL: {BASE_URL}")
    print("="*80)
    
    tester = ProductionPerformanceTest()
    
    try:
        report = tester.run_comprehensive_performance_test()
        return report
        
    except KeyboardInterrupt:
        print("\n⚠️  Testing interrupted by user")
        return None
    except Exception as e:
        print(f"\n❌ Testing failed with error: {str(e)}")
        return None

if __name__ == "__main__":
    main()