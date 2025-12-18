#!/usr/bin/env python3
"""
Production Issue Verification Script
Comprehensive testing of live site issues against gap matrix
"""

import requests
import json
import time
from urllib.parse import urljoin
from bs4 import BeautifulSoup
from datetime import datetime

# Configuration
PRODUCTION_URL = "https://tasteofgratitude.shop"
VERCEL_URL = "https://gratog.vercel.app"
TIMEOUT = 10

class ProductionVerifier:
    def __init__(self):
        self.results = {
            "timestamp": datetime.now().isoformat(),
            "tests": [],
            "critical_issues": [],
            "major_issues": [],
            "minor_issues": []
        }
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })

    def test(self, category, issue_name, test_name, test_fn):
        """Run a test and record results"""
        try:
            result = test_fn()
            test_result = {
                "category": category,
                "issue": issue_name,
                "test": test_name,
                "passed": result["passed"],
                "message": result.get("message", ""),
                "timestamp": datetime.now().isoformat()
            }
            self.results["tests"].append(test_result)
            
            status = "✓ PASS" if result["passed"] else "✗ FAIL"
            print(f"{status} | {category} | {issue_name} | {test_name}")
            if result.get("message"):
                print(f"     └─ {result['message']}")
            return result["passed"]
        except Exception as e:
            print(f"✗ ERROR | {category} | {issue_name} | {test_name}")
            print(f"     └─ {str(e)}")
            self.results["tests"].append({
                "category": category,
                "issue": issue_name,
                "test": test_name,
                "passed": False,
                "error": str(e)
            })
            return False

    # CRITICAL TESTS
    def test_ssl_certificate(self):
        """Test 1.1: Check SSL certificate validity"""
        def run_test():
            try:
                response = self.session.get(f"{PRODUCTION_URL}/", timeout=TIMEOUT)
                return {
                    "passed": response.status_code < 500,
                    "message": f"Status: {response.status_code}"
                }
            except requests.exceptions.SSLError as e:
                return {
                    "passed": False,
                    "message": f"SSL Error: {str(e)[:50]}..."
                }
            except Exception as e:
                return {
                    "passed": False,
                    "message": f"Connection Error: {str(e)[:50]}..."
                }
        
        return self.test("CRITICAL", "SSL Configuration", "SSL Certificate Valid", run_test)

    def test_502_errors(self):
        """Test 1.2: Check for 502 Bad Gateway errors"""
        def run_test():
            errors = []
            for attempt in range(3):
                try:
                    response = self.session.get(f"{PRODUCTION_URL}/api/health", timeout=TIMEOUT)
                    if response.status_code == 502:
                        errors.append(f"Attempt {attempt+1}: 502")
                except Exception as e:
                    errors.append(f"Attempt {attempt+1}: {str(e)[:30]}")
                time.sleep(1)
            
            return {
                "passed": len(errors) == 0,
                "message": ", ".join(errors) if errors else "No 502 errors"
            }
        
        return self.test("CRITICAL", "SSL Configuration", "No 502 Bad Gateway", run_test)

    def test_canonical_domain(self):
        """Test 1.3: Check canonical link points to custom domain"""
        def run_test():
            try:
                response = self.session.get(f"{PRODUCTION_URL}/", timeout=TIMEOUT)
                soup = BeautifulSoup(response.content, 'html.parser')
                canonical = soup.find('link', {'rel': 'canonical'})
                
                if not canonical:
                    return {
                        "passed": False,
                        "message": "No canonical link found"
                    }
                
                href = canonical.get('href', '')
                is_correct = 'tasteofgratitude.shop' in href
                
                return {
                    "passed": is_correct,
                    "message": f"Canonical: {href}"
                }
            except Exception as e:
                return {
                    "passed": False,
                    "message": f"Error: {str(e)[:50]}..."
                }
        
        return self.test("CRITICAL", "SSL Configuration", "Canonical Domain Correct", run_test)

    def test_ingredient_explorer(self):
        """Test 2: Ingredient Explorer page loads"""
        def run_test():
            try:
                response = self.session.get(
                    f"{PRODUCTION_URL}/explore/ingredients",
                    timeout=TIMEOUT
                )
                
                if response.status_code == 404:
                    return {
                        "passed": False,
                        "message": "Page returns 404"
                    }
                
                if "debug" in response.text.lower() and "error" in response.text.lower():
                    return {
                        "passed": False,
                        "message": "Debug error detected in response"
                    }
                
                return {
                    "passed": response.status_code == 200,
                    "message": f"Status: {response.status_code}"
                }
            except Exception as e:
                return {
                    "passed": False,
                    "message": f"Error: {str(e)[:50]}..."
                }
        
        return self.test("CRITICAL", "Ingredient Explorer", "Page Loads", run_test)

    def test_games_accessible(self):
        """Test 3: Games pages are accessible"""
        def run_test():
            games = [
                ('/explore/games', 'Games Index'),
                ('/explore/games/memory-match', 'Memory Match'),
                ('/explore/games/ingredient-quiz', 'Ingredient Quiz')
            ]
            
            results = []
            for path, name in games:
                try:
                    response = self.session.get(f"{PRODUCTION_URL}{path}", timeout=TIMEOUT)
                    accessible = response.status_code != 404
                    results.append((name, accessible, response.status_code))
                except Exception as e:
                    results.append((name, False, str(e)[:30]))
            
            all_accessible = all(r[1] for r in results)
            messages = [f"{r[0]}: {r[2]}" for r in results]
            
            return {
                "passed": all_accessible,
                "message": "; ".join(messages)
            }
        
        return self.test("CRITICAL", "Interactive Games", "Games Accessible", run_test)

    def test_3d_showcase(self):
        """Test 4: 3D Showcase loads"""
        def run_test():
            try:
                response = self.session.get(
                    f"{PRODUCTION_URL}/explore/showcase",
                    timeout=TIMEOUT
                )
                
                if response.status_code == 404:
                    return {
                        "passed": False,
                        "message": "Page returns 404"
                    }
                
                # Check if model-viewer is loaded
                has_model_viewer = '@google/model-viewer' in response.text or 'model-viewer' in response.text
                
                return {
                    "passed": response.status_code == 200,
                    "message": f"Status: {response.status_code}, Model Viewer: {'Found' if has_model_viewer else 'Not found'}"
                }
            except Exception as e:
                return {
                    "passed": False,
                    "message": f"Error: {str(e)[:50]}..."
                }
        
        return self.test("CRITICAL", "3D Showcase", "Page Loads", run_test)

    def test_learning_center(self):
        """Test 5: Learning Center page"""
        def run_test():
            try:
                response = self.session.get(
                    f"{PRODUCTION_URL}/explore/learn",
                    timeout=TIMEOUT
                )
                
                is_available = response.status_code != 404
                
                return {
                    "passed": is_available,
                    "message": f"Status: {response.status_code}"
                }
            except Exception as e:
                return {
                    "passed": False,
                    "message": f"Error: {str(e)[:50]}..."
                }
        
        return self.test("CRITICAL", "Learning Center", "Page Loads", run_test)

    def test_wellness_quiz(self):
        """Test 6: Wellness Quiz functionality"""
        def run_test():
            try:
                response = self.session.get(
                    f"{PRODUCTION_URL}/quiz",
                    timeout=TIMEOUT
                )
                
                if response.status_code == 404:
                    return {
                        "passed": False,
                        "message": "Quiz page returns 404"
                    }
                
                # Check if form exists
                has_form = '<form' in response.text or 'quiz' in response.text.lower()
                
                return {
                    "passed": response.status_code == 200 and has_form,
                    "message": f"Status: {response.status_code}, Has form: {has_form}"
                }
            except Exception as e:
                return {
                    "passed": False,
                    "message": f"Error: {str(e)[:50]}..."
                }
        
        return self.test("CRITICAL", "Wellness Quiz", "Page Loads", run_test)

    def test_wishlist(self):
        """Test 7: Wishlist page loads"""
        def run_test():
            try:
                response = self.session.get(
                    f"{PRODUCTION_URL}/wishlist",
                    timeout=TIMEOUT
                )
                
                is_available = response.status_code != 404
                
                return {
                    "passed": is_available,
                    "message": f"Status: {response.status_code}"
                }
            except Exception as e:
                return {
                    "passed": False,
                    "message": f"Error: {str(e)[:50]}..."
                }
        
        return self.test("CRITICAL", "Wishlist", "Page Loads", run_test)

    def test_sitemaps(self):
        """Test 8: Sitemap files accessible"""
        def run_test():
            sitemaps = ['/sitemap.xml', '/robots.txt']
            results = []
            
            for sitemap in sitemaps:
                try:
                    response = self.session.get(f"{PRODUCTION_URL}{sitemap}", timeout=TIMEOUT)
                    accessible = response.status_code != 404
                    results.append((sitemap, accessible, response.status_code))
                except Exception as e:
                    results.append((sitemap, False, str(e)[:30]))
            
            all_accessible = all(r[1] for r in results)
            messages = [f"{r[0]}: {r[2]}" for r in results]
            
            return {
                "passed": all_accessible,
                "message": "; ".join(messages)
            }
        
        return self.test("CRITICAL", "Sitemap", "Files Accessible", run_test)

    def test_accessibility_headers(self):
        """Test: Accessibility-related headers present"""
        def run_test():
            try:
                response = self.session.get(f"{PRODUCTION_URL}/", timeout=TIMEOUT)
                
                # Check for security headers
                headers_present = {
                    'X-Content-Type-Options': 'X-Content-Type-Options' in response.headers,
                    'Referrer-Policy': 'Referrer-Policy' in response.headers
                }
                
                all_present = all(headers_present.values())
                messages = [f"{k}: {'✓' if v else '✗'}" for k, v in headers_present.items()]
                
                return {
                    "passed": all_present,
                    "message": "; ".join(messages)
                }
            except Exception as e:
                return {
                    "passed": False,
                    "message": f"Error: {str(e)[:50]}..."
                }
        
        return self.test("MAJOR", "Accessibility", "Security Headers", run_test)

    def test_performance_headers(self):
        """Test: Performance optimization headers"""
        def run_test():
            try:
                response = self.session.get(f"{PRODUCTION_URL}/", timeout=TIMEOUT)
                
                # Check for caching headers
                cache_control = response.headers.get('Cache-Control', '')
                has_cache = len(cache_control) > 0
                
                # Check response time
                response_time = response.elapsed.total_seconds()
                good_performance = response_time < 2.0
                
                return {
                    "passed": has_cache and good_performance,
                    "message": f"Cache: {cache_control or 'None'}, Response Time: {response_time:.2f}s"
                }
            except Exception as e:
                return {
                    "passed": False,
                    "message": f"Error: {str(e)[:50]}..."
                }
        
        return self.test("MAJOR", "Performance", "Cache Headers & Response Time", run_test)

    def run_all_tests(self):
        """Execute all verification tests"""
        print("\n" + "="*80)
        print("PRODUCTION ISSUE VERIFICATION SUITE")
        print(f"Target: {PRODUCTION_URL}")
        print("="*80 + "\n")

        # CRITICAL TESTS
        print("CRITICAL ISSUES:\n")
        self.test_ssl_certificate()
        self.test_502_errors()
        self.test_canonical_domain()
        self.test_ingredient_explorer()
        self.test_games_accessible()
        self.test_3d_showcase()
        self.test_learning_center()
        self.test_wellness_quiz()
        self.test_wishlist()
        self.test_sitemaps()

        # MAJOR TESTS
        print("\nMAJOR ISSUES:\n")
        self.test_accessibility_headers()
        self.test_performance_headers()

        # Summary
        print("\n" + "="*80)
        passed = sum(1 for t in self.results["tests"] if t["passed"])
        total = len(self.results["tests"])
        print(f"RESULTS: {passed}/{total} tests passed ({passed*100//total}%)")
        print("="*80 + "\n")

        # Save results
        with open('production-verification-results.json', 'w') as f:
            json.dump(self.results, f, indent=2)
        
        print(f"Results saved to: production-verification-results.json")

if __name__ == "__main__":
    verifier = ProductionVerifier()
    verifier.run_all_tests()
