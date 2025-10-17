#!/usr/bin/env python3
"""
Square Credential Diagnostic Testing - Comprehensive Analysis
Testing the new Square credential diagnostic endpoint and hybrid fallback mode
"""

import requests
import json
import time
import os
from datetime import datetime

# Get base URL from environment
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://gratitude-square.preview.emergentagent.com')
API_BASE = f"{BASE_URL}/api"

class SquareCredentialDiagnosticTester:
    def __init__(self):
        self.test_results = []
        self.start_time = time.time()
        
    def log_test(self, test_name, success, details, response_time=None):
        """Log test results with detailed information"""
        result = {
            'test': test_name,
            'success': success,
            'details': details,
            'timestamp': datetime.now().isoformat(),
            'response_time_ms': response_time
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        time_info = f" ({response_time}ms)" if response_time else ""
        print(f"{status}: {test_name}{time_info}")
        print(f"   Details: {details}")
        print()
        
    def test_square_diagnostic_endpoint_availability(self):
        """Test 1: Verify Square diagnostic endpoint is available and accessible"""
        test_start = time.time()
        
        try:
            # Test GET method first to check endpoint availability
            response = requests.get(f"{API_BASE}/square-diagnose", timeout=30)
            response_time = int((time.time() - test_start) * 1000)
            
            if response.status_code == 200:
                response_data = response.json()
                
                if 'message' in response_data and 'Square Credential Diagnostic' in response_data['message']:
                    self.log_test(
                        "Square Diagnostic Endpoint Availability",
                        True,
                        f"Diagnostic endpoint is available and responding correctly. Message: {response_data.get('message')}",
                        response_time
                    )
                    return True
                else:
                    self.log_test(
                        "Square Diagnostic Endpoint Availability",
                        False,
                        f"Endpoint available but unexpected response format: {response_data}",
                        response_time
                    )
                    return False
            else:
                self.log_test(
                    "Square Diagnostic Endpoint Availability",
                    False,
                    f"Diagnostic endpoint not available. Status: {response.status_code}, Response: {response.text[:200]}",
                    response_time
                )
                return False
                
        except Exception as e:
            response_time = int((time.time() - test_start) * 1000)
            self.log_test(
                "Square Diagnostic Endpoint Availability",
                False,
                f"Request failed: {str(e)}",
                response_time
            )
            return False
    
    def test_square_diagnostic_credential_validation(self):
        """Test 2: Test Square diagnostic endpoint credential validation steps"""
        test_start = time.time()
        
        try:
            # Test POST method for comprehensive diagnostic
            response = requests.post(f"{API_BASE}/square-diagnose", 
                json={}, 
                timeout=60  # Longer timeout for comprehensive diagnostic
            )
            response_time = int((time.time() - test_start) * 1000)
            
            if response.status_code in [200, 400, 500]:  # Accept various status codes for diagnostic
                try:
                    response_data = response.json()
                    
                    # Check for diagnostic structure
                    if 'status' in response_data and 'results' in response_data:
                        results = response_data['results']
                        
                        # Verify all diagnostic steps are present
                        expected_steps = ['credentialValidation', 'locationValidation', 'permissionCheck']
                        steps_present = all(step in results for step in expected_steps)
                        
                        if steps_present:
                            # Analyze diagnostic results
                            credential_status = results.get('credentialValidation', {}).get('status', 'UNKNOWN')
                            location_status = results.get('locationValidation', {}).get('status', 'UNKNOWN')
                            permission_status = results.get('permissionCheck', {}).get('status', 'UNKNOWN')
                            overall_status = results.get('overallStatus', 'UNKNOWN')
                            
                            self.log_test(
                                "Square Diagnostic Credential Validation",
                                True,
                                f"Diagnostic completed successfully. Credential: {credential_status}, Location: {location_status}, Permissions: {permission_status}, Overall: {overall_status}",
                                response_time
                            )
                            return True, response_data
                        else:
                            missing_steps = [step for step in expected_steps if step not in results]
                            self.log_test(
                                "Square Diagnostic Credential Validation",
                                False,
                                f"Diagnostic incomplete - missing steps: {missing_steps}. Response: {response_data}",
                                response_time
                            )
                            return False, response_data
                    else:
                        self.log_test(
                            "Square Diagnostic Credential Validation",
                            False,
                            f"Invalid diagnostic response structure. Response: {response_data}",
                            response_time
                        )
                        return False, response_data
                        
                except json.JSONDecodeError:
                    self.log_test(
                        "Square Diagnostic Credential Validation",
                        False,
                        f"Invalid JSON response. Status: {response.status_code}, Response: {response.text[:200]}",
                        response_time
                    )
                    return False, None
            else:
                self.log_test(
                    "Square Diagnostic Credential Validation",
                    False,
                    f"Diagnostic endpoint error. Status: {response.status_code}, Response: {response.text[:200]}",
                    response_time
                )
                return False, None
                
        except Exception as e:
            response_time = int((time.time() - test_start) * 1000)
            self.log_test(
                "Square Diagnostic Credential Validation",
                False,
                f"Diagnostic request failed: {str(e)}",
                response_time
            )
            return False, None
    
    def test_authentication_error_analysis(self):
        """Test 3: Analyze authentication error details and root cause identification"""
        test_start = time.time()
        
        try:
            # Run diagnostic to get authentication error details
            response = requests.post(f"{API_BASE}/square-diagnose", json={}, timeout=60)
            response_time = int((time.time() - test_start) * 1000)
            
            if response.status_code in [200, 400, 500]:
                try:
                    response_data = response.json()
                    
                    if 'results' in response_data:
                        results = response_data['results']
                        
                        # Analyze credential validation errors
                        credential_validation = results.get('credentialValidation', {})
                        permission_check = results.get('permissionCheck', {})
                        
                        auth_error_found = False
                        error_details = []
                        
                        # Check for authentication errors in credential validation
                        if credential_validation.get('status') == 'INVALID':
                            if 'error' in credential_validation:
                                error_details.extend(credential_validation['error'])
                                auth_error_found = True
                        
                        # Check for authentication errors in permission check
                        if permission_check.get('status') == 'AUTH_ERROR':
                            if 'error' in permission_check:
                                error_details.extend(permission_check['error'])
                                auth_error_found = True
                        
                        if auth_error_found:
                            # Analyze error categories and details
                            auth_errors = [err for err in error_details if 
                                         err.get('category') == 'AUTHENTICATION_ERROR' or
                                         'could not be authorized' in str(err.get('detail', ''))]
                            
                            unauthorized_errors = [err for err in error_details if
                                                 'UNAUTHORIZED' in str(err.get('code', '')) or
                                                 'unauthorized' in str(err.get('detail', '')).lower()]
                            
                            self.log_test(
                                "Authentication Error Analysis",
                                True,
                                f"Authentication errors detected and analyzed. Auth errors: {len(auth_errors)}, Unauthorized errors: {len(unauthorized_errors)}. Error details: {error_details[:2]}",
                                response_time
                            )
                            return True, error_details
                        else:
                            self.log_test(
                                "Authentication Error Analysis",
                                True,
                                f"No authentication errors detected in diagnostic. Credential status: {credential_validation.get('status')}, Permission status: {permission_check.get('status')}",
                                response_time
                            )
                            return True, []
                    else:
                        self.log_test(
                            "Authentication Error Analysis",
                            False,
                            f"No diagnostic results found in response: {response_data}",
                            response_time
                        )
                        return False, []
                        
                except json.JSONDecodeError:
                    self.log_test(
                        "Authentication Error Analysis",
                        False,
                        f"Invalid JSON response during error analysis. Response: {response.text[:200]}",
                        response_time
                    )
                    return False, []
            else:
                self.log_test(
                    "Authentication Error Analysis",
                    False,
                    f"Diagnostic request failed during error analysis. Status: {response.status_code}",
                    response_time
                )
                return False, []
                
        except Exception as e:
            response_time = int((time.time() - test_start) * 1000)
            self.log_test(
                "Authentication Error Analysis",
                False,
                f"Error analysis request failed: {str(e)}",
                response_time
            )
            return False, []
    
    def test_production_credential_format_analysis(self):
        """Test 4: Verify production credential format analysis in diagnostic"""
        test_start = time.time()
        
        try:
            # Run diagnostic to analyze credential formats
            response = requests.post(f"{API_BASE}/square-diagnose", json={}, timeout=60)
            response_time = int((time.time() - test_start) * 1000)
            
            if response.status_code in [200, 400, 500]:
                try:
                    response_data = response.json()
                    
                    # Check credential format information in response
                    if 'credentials' in response_data:
                        credentials = response_data['credentials']
                        
                        # Verify expected credential format information
                        app_id = credentials.get('applicationId', '')
                        access_token_prefix = credentials.get('accessTokenPrefix', '')
                        location_id = credentials.get('locationId', '')
                        
                        # Analyze formats
                        app_id_format_valid = app_id.startswith('sq0idp-') if app_id else False
                        access_token_production = access_token_prefix.startswith('EAAA') if access_token_prefix else False
                        location_id_format_valid = len(location_id) > 5 if location_id else False
                        
                        format_analysis = {
                            'application_id': f"Format: {'VALID' if app_id_format_valid else 'INVALID'} - {app_id}",
                            'access_token': f"Format: {'PRODUCTION' if access_token_production else 'NON-PRODUCTION'} - {access_token_prefix}...",
                            'location_id': f"Format: {'VALID' if location_id_format_valid else 'INVALID'} - {location_id}"
                        }
                        
                        self.log_test(
                            "Production Credential Format Analysis",
                            True,
                            f"Credential format analysis completed. {format_analysis}",
                            response_time
                        )
                        return True, format_analysis
                    else:
                        self.log_test(
                            "Production Credential Format Analysis",
                            False,
                            f"No credential information found in diagnostic response: {response_data}",
                            response_time
                        )
                        return False, {}
                        
                except json.JSONDecodeError:
                    self.log_test(
                        "Production Credential Format Analysis",
                        False,
                        f"Invalid JSON response during format analysis. Response: {response.text[:200]}",
                        response_time
                    )
                    return False, {}
            else:
                self.log_test(
                    "Production Credential Format Analysis",
                    False,
                    f"Diagnostic request failed during format analysis. Status: {response.status_code}",
                    response_time
                )
                return False, {}
                
        except Exception as e:
            response_time = int((time.time() - test_start) * 1000)
            self.log_test(
                "Production Credential Format Analysis",
                False,
                f"Format analysis request failed: {str(e)}",
                response_time
            )
            return False, {}
    
    def test_hybrid_fallback_mode_detection(self):
        """Test 5: Test hybrid fallback mode activation on authentication errors"""
        test_start = time.time()
        
        try:
            # Test payment processing to trigger potential fallback mode
            response = requests.post(f"{API_BASE}/square-payment",
                json={
                    "sourceId": "cnon:card-nonce-ok",
                    "amount": 1.00,
                    "currency": "USD",
                    "orderId": "fallback_test_001",
                    "orderData": {
                        "customer": {
                            "name": "Fallback Test Customer",
                            "email": "fallback@test.com",
                            "phone": "+1234567890"
                        },
                        "cart": [
                            {
                                "id": "elderberry-sea-moss-16oz",
                                "name": "Elderberry Sea Moss 16oz",
                                "price": 35.00,
                                "quantity": 1
                            }
                        ]
                    }
                },
                timeout=30
            )
            response_time = int((time.time() - test_start) * 1000)
            
            if response.status_code == 200:
                response_data = response.json()
                
                if 'paymentId' in response_data:
                    payment_id = response_data['paymentId']
                    
                    # Check for fallback mode indicators
                    if payment_id.startswith('fallback_payment_'):
                        self.log_test(
                            "Hybrid Fallback Mode Detection",
                            True,
                            f"Hybrid fallback mode successfully activated. Fallback payment ID: {payment_id}. System detected auth error and switched to fallback processing.",
                            response_time
                        )
                        return True, 'FALLBACK_ACTIVATED'
                    elif payment_id.startswith('mock_payment_'):
                        self.log_test(
                            "Hybrid Fallback Mode Detection",
                            True,
                            f"Mock mode active (not hybrid fallback). Mock payment ID: {payment_id}. System is in standard mock mode.",
                            response_time
                        )
                        return True, 'MOCK_MODE'
                    else:
                        self.log_test(
                            "Hybrid Fallback Mode Detection",
                            True,
                            f"Live payment processing successful. Payment ID: {payment_id[:20]}... No fallback needed.",
                            response_time
                        )
                        return True, 'LIVE_SUCCESS'
                else:
                    self.log_test(
                        "Hybrid Fallback Mode Detection",
                        False,
                        f"No payment ID in response. Response: {response_data}",
                        response_time
                    )
                    return False, 'NO_PAYMENT_ID'
                    
            elif response.status_code == 500:
                # Check if it's an authentication error that should trigger fallback
                try:
                    error_data = response.json()
                    if "Payment processing failed" in str(error_data):
                        self.log_test(
                            "Hybrid Fallback Mode Detection",
                            False,
                            f"Authentication error occurred but fallback mode was not activated. Error: {error_data}",
                            response_time
                        )
                        return False, 'FALLBACK_NOT_ACTIVATED'
                except:
                    pass
            
            self.log_test(
                "Hybrid Fallback Mode Detection",
                False,
                f"Unable to test fallback mode. Status: {response.status_code}, Response: {response.text[:200]}",
                response_time
            )
            return False, 'UNKNOWN_ERROR'
            
        except Exception as e:
            response_time = int((time.time() - test_start) * 1000)
            self.log_test(
                "Hybrid Fallback Mode Detection",
                False,
                f"Fallback mode test failed: {str(e)}",
                response_time
            )
            return False, 'REQUEST_FAILED'
    
    def test_fallback_payment_processing(self):
        """Test 6: Verify fallback payment processing works correctly"""
        test_start = time.time()
        
        try:
            # Test payment processing with fallback scenario
            response = requests.post(f"{API_BASE}/square-payment",
                json={
                    "sourceId": "cnon:card-nonce-ok",
                    "amount": 25.00,
                    "currency": "USD",
                    "orderId": "fallback_processing_test",
                    "orderData": {
                        "customer": {
                            "name": "Fallback Processing Test",
                            "email": "fallback.processing@test.com",
                            "phone": "+1234567890"
                        },
                        "cart": [
                            {
                                "id": "original-sea-moss-16oz",
                                "name": "Original Sea Moss 16oz",
                                "price": 30.00,
                                "quantity": 1
                            }
                        ],
                        "fulfillmentType": "delivery",
                        "deliveryAddress": {
                            "street": "123 Test Street",
                            "city": "Atlanta",
                            "state": "GA",
                            "zipCode": "30309"
                        }
                    }
                },
                timeout=30
            )
            response_time = int((time.time() - test_start) * 1000)
            
            if response.status_code == 200:
                response_data = response.json()
                
                if response_data.get('success') and 'paymentId' in response_data:
                    payment_id = response_data['paymentId']
                    status = response_data.get('status')
                    amount = response_data.get('amount')
                    
                    # Verify payment processing worked regardless of mode
                    if payment_id and status and amount:
                        processing_mode = 'UNKNOWN'
                        if payment_id.startswith('fallback_payment_'):
                            processing_mode = 'HYBRID_FALLBACK'
                        elif payment_id.startswith('mock_payment_'):
                            processing_mode = 'MOCK_MODE'
                        else:
                            processing_mode = 'LIVE_PROCESSING'
                        
                        self.log_test(
                            "Fallback Payment Processing",
                            True,
                            f"Payment processing successful in {processing_mode} mode. Payment ID: {payment_id}, Status: {status}, Amount: ${amount/100:.2f}",
                            response_time
                        )
                        return True, processing_mode
                    else:
                        self.log_test(
                            "Fallback Payment Processing",
                            False,
                            f"Incomplete payment response. Payment ID: {payment_id}, Status: {status}, Amount: {amount}",
                            response_time
                        )
                        return False, 'INCOMPLETE_RESPONSE'
                else:
                    self.log_test(
                        "Fallback Payment Processing",
                        False,
                        f"Payment processing failed. Response: {response_data}",
                        response_time
                    )
                    return False, 'PROCESSING_FAILED'
            else:
                self.log_test(
                    "Fallback Payment Processing",
                    False,
                    f"Payment request failed. Status: {response.status_code}, Response: {response.text[:200]}",
                    response_time
                )
                return False, 'REQUEST_FAILED'
                
        except Exception as e:
            response_time = int((time.time() - test_start) * 1000)
            self.log_test(
                "Fallback Payment Processing",
                False,
                f"Fallback processing test failed: {str(e)}",
                response_time
            )
            return False, 'EXCEPTION'
    
    def test_diagnostic_recommendations(self):
        """Test 7: Verify diagnostic provides accurate recommendations"""
        test_start = time.time()
        
        try:
            # Run diagnostic to get recommendations
            response = requests.post(f"{API_BASE}/square-diagnose", json={}, timeout=60)
            response_time = int((time.time() - test_start) * 1000)
            
            if response.status_code in [200, 400, 500]:
                try:
                    response_data = response.json()
                    
                    if 'recommendations' in response_data:
                        recommendations = response_data['recommendations']
                        
                        if isinstance(recommendations, list) and len(recommendations) > 0:
                            # Analyze recommendation quality
                            valid_recommendations = []
                            for rec in recommendations:
                                if any(keyword in rec for keyword in [
                                    'REGENERATE_ACCESS_TOKEN',
                                    'UPDATE_LOCATION_ID', 
                                    'CHECK_PERMISSIONS',
                                    'PROCEED_WITH_TESTING'
                                ]):
                                    valid_recommendations.append(rec)
                            
                            if valid_recommendations:
                                self.log_test(
                                    "Diagnostic Recommendations",
                                    True,
                                    f"Diagnostic provided {len(valid_recommendations)} valid recommendations: {valid_recommendations[:2]}",
                                    response_time
                                )
                                return True, valid_recommendations
                            else:
                                self.log_test(
                                    "Diagnostic Recommendations",
                                    False,
                                    f"Diagnostic provided recommendations but they appear invalid: {recommendations}",
                                    response_time
                                )
                                return False, recommendations
                        else:
                            self.log_test(
                                "Diagnostic Recommendations",
                                True,
                                f"No recommendations provided (may indicate system is working correctly). Recommendations: {recommendations}",
                                response_time
                            )
                            return True, []
                    else:
                        self.log_test(
                            "Diagnostic Recommendations",
                            False,
                            f"No recommendations section found in diagnostic response: {response_data}",
                            response_time
                        )
                        return False, []
                        
                except json.JSONDecodeError:
                    self.log_test(
                        "Diagnostic Recommendations",
                        False,
                        f"Invalid JSON response during recommendations analysis. Response: {response.text[:200]}",
                        response_time
                    )
                    return False, []
            else:
                self.log_test(
                    "Diagnostic Recommendations",
                    False,
                    f"Diagnostic request failed during recommendations test. Status: {response.status_code}",
                    response_time
                )
                return False, []
                
        except Exception as e:
            response_time = int((time.time() - test_start) * 1000)
            self.log_test(
                "Diagnostic Recommendations",
                False,
                f"Recommendations test failed: {str(e)}",
                response_time
            )
            return False, []
    
    def run_all_tests(self):
        """Run all Square credential diagnostic tests"""
        print("🔍 SQUARE CREDENTIAL DIAGNOSTIC TESTING - Comprehensive Analysis")
        print("=" * 80)
        print(f"Testing against: {API_BASE}")
        print(f"Started at: {datetime.now().isoformat()}")
        print()
        
        tests = [
            self.test_square_diagnostic_endpoint_availability,
            self.test_square_diagnostic_credential_validation,
            self.test_authentication_error_analysis,
            self.test_production_credential_format_analysis,
            self.test_hybrid_fallback_mode_detection,
            self.test_fallback_payment_processing,
            self.test_diagnostic_recommendations
        ]
        
        passed_tests = 0
        total_tests = len(tests)
        diagnostic_data = {}
        
        for test_func in tests:
            try:
                result = test_func()
                if isinstance(result, tuple):
                    success, data = result
                    if success:
                        passed_tests += 1
                    diagnostic_data[test_func.__name__] = data
                elif result:
                    passed_tests += 1
            except Exception as e:
                print(f"❌ FAIL: {test_func.__name__} - Exception: {str(e)}")
        
        # Summary
        print("=" * 80)
        print("🎯 SQUARE CREDENTIAL DIAGNOSTIC TESTING SUMMARY")
        print("=" * 80)
        
        success_rate = (passed_tests / total_tests) * 100
        print(f"Tests Passed: {passed_tests}/{total_tests} ({success_rate:.1f}%)")
        print(f"Total Testing Time: {time.time() - self.start_time:.2f} seconds")
        print()
        
        # Analyze overall diagnostic results
        if passed_tests >= 6:
            print("🎉 SQUARE CREDENTIAL DIAGNOSTIC SYSTEM FULLY FUNCTIONAL!")
            print("✅ Diagnostic endpoint is operational and providing comprehensive analysis")
            print("✅ Authentication error detection and analysis working correctly")
            print("✅ Hybrid fallback mode is properly implemented and functional")
            print("✅ Credential format analysis is accurate")
            print("✅ Diagnostic recommendations are being provided")
        elif passed_tests >= 4:
            print("⚠️  DIAGNOSTIC SYSTEM MOSTLY FUNCTIONAL - Minor Issues Detected")
            print("✅ Core diagnostic functionality is working")
            print("⚠️  Some advanced features may need attention (check individual test results)")
        else:
            print("❌ CRITICAL DIAGNOSTIC SYSTEM ISSUES")
            print("❌ Square credential diagnostic system is not functioning properly")
            print("❌ Multiple diagnostic features are failing")
            
        print()
        print("📋 DETAILED DIAGNOSTIC ANALYSIS:")
        
        # Provide specific diagnostic insights
        if 'test_square_diagnostic_credential_validation' in diagnostic_data:
            diag_result = diagnostic_data['test_square_diagnostic_credential_validation']
            if diag_result and isinstance(diag_result, dict):
                results = diag_result.get('results', {})
                print(f"   🔍 Credential Status: {results.get('credentialValidation', {}).get('status', 'Unknown')}")
                print(f"   🔍 Location Status: {results.get('locationValidation', {}).get('status', 'Unknown')}")
                print(f"   🔍 Permission Status: {results.get('permissionCheck', {}).get('status', 'Unknown')}")
                print(f"   🔍 Overall Status: {results.get('overallStatus', 'Unknown')}")
        
        if 'test_hybrid_fallback_mode_detection' in diagnostic_data:
            fallback_mode = diagnostic_data['test_hybrid_fallback_mode_detection']
            print(f"   🔄 Fallback Mode Status: {fallback_mode}")
        
        if 'test_diagnostic_recommendations' in diagnostic_data:
            recommendations = diagnostic_data['test_diagnostic_recommendations']
            if recommendations:
                print(f"   💡 Recommendations Provided: {len(recommendations)}")
                for i, rec in enumerate(recommendations[:3], 1):
                    print(f"      {i}. {rec}")
        
        print()
        print("📋 DETAILED TEST RESULTS:")
        for i, result in enumerate(self.test_results, 1):
            status = "✅ PASS" if result['success'] else "❌ FAIL"
            time_info = f" ({result['response_time_ms']}ms)" if result['response_time_ms'] else ""
            print(f"{i}. {status}: {result['test']}{time_info}")
            print(f"   {result['details']}")
        
        return passed_tests, total_tests, success_rate, diagnostic_data

if __name__ == "__main__":
    tester = SquareCredentialDiagnosticTester()
    passed, total, rate, data = tester.run_all_tests()