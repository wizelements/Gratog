#!/usr/bin/env python3
"""
Comprehensive cosmetic and payment fixes verification script.
Tests all critical issues identified in the audit.
"""

import subprocess
import json
import sys
import re
from pathlib import Path

def run_command(cmd, cwd=None):
    """Run a shell command and return output"""
    try:
        result = subprocess.run(
            cmd,
            shell=True,
            cwd=cwd,
            capture_output=True,
            text=True,
            timeout=30
        )
        return result.returncode, result.stdout, result.stderr
    except subprocess.TimeoutExpired:
        return 1, "", "Command timed out"
    except Exception as e:
        return 1, "", str(e)

def check_file_content(filepath, pattern, should_exist=True):
    """Check if a pattern exists in a file"""
    try:
        with open(filepath, 'r') as f:
            content = f.read()
            found = pattern in content
            return found == should_exist
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
        return False

def check_regex_in_file(filepath, pattern, should_exist=True):
    """Check if a regex pattern exists in a file"""
    try:
        with open(filepath, 'r') as f:
            content = f.read()
            found = re.search(pattern, content) is not None
            return found == should_exist
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
        return False

def test_cosmetic_fixes():
    """Test cosmetic/UI fixes"""
    print("\n" + "="*60)
    print("COSMETIC FIXES VERIFICATION")
    print("="*60)
    
    tests_passed = 0
    tests_failed = 0
    
    # Test 1: Google Pay button uses conditional rendering, not 'hidden' class
    print("\n[1/6] Google Pay button visibility fix...")
    if check_file_content(
        'components/checkout/SquarePaymentForm.tsx',
        '{googlePayAvailable && (\n            <div id="google-pay-button" />\n          )}'
    ):
        print("✅ PASS: Google Pay uses conditional rendering")
        tests_passed += 1
    else:
        print("❌ FAIL: Google Pay button still using hidden class or wrong pattern")
        tests_failed += 1
    
    # Test 2: Apple Pay button has correct label
    print("[2/6] Apple Pay button label fix...")
    if check_file_content(
        'components/checkout/SquarePaymentForm.tsx',
        'Apple Pay'
    ) and not check_regex_in_file(
        'components/checkout/SquarePaymentForm.tsx',
        r'<Smartphone[^>]*\/>\s+Pay\s*</Button>'
    ):
        print("✅ PASS: Apple Pay button correctly labeled")
        tests_passed += 1
    else:
        print("❌ FAIL: Apple Pay button label not fixed")
        tests_failed += 1
    
    # Test 3: Contact form icons use conditional rendering, not both visible
    print("[3/6] Contact form icon overlay fix...")
    if check_file_content(
        'components/checkout/ContactForm.tsx',
        '!completedFields.has(\'firstName\') || errors.firstName'
    ) and check_file_content(
        'components/checkout/ContactForm.tsx',
        'pointer-events-none'
    ):
        print("✅ PASS: Contact form icons properly conditional")
        tests_passed += 1
    else:
        print("❌ FAIL: Contact form icons still overlapping")
        tests_failed += 1
    
    # Test 4: All icon variants fixed (email, phone, lastname)
    print("[4/6] All form field icons fixed...")
    icon_fields = ['email', 'phone', 'lastName']
    all_fixed = all(
        check_file_content(
            'components/checkout/ContactForm.tsx',
            f'!completedFields.has(\'{field}\') || errors.{field}'
        )
        for field in icon_fields
    )
    if all_fixed:
        print("✅ PASS: All form field icons properly handled")
        tests_passed += 1
    else:
        print("❌ FAIL: Some form fields still have overlapping icons")
        tests_failed += 1
    
    # Test 5: Accessibility improvements - pointer-events-none on icons
    print("[5/6] Icon accessibility improvements...")
    if check_regex_in_file(
        'components/checkout/ContactForm.tsx',
        r'className="[^"]*pointer-events-none[^"]*"'
    ):
        print("✅ PASS: Icons have pointer-events-none")
        tests_passed += 1
    else:
        print("❌ FAIL: Icons missing pointer-events-none")
        tests_failed += 1
    
    # Test 6: Error message color still visible
    print("[6/6] Error message visibility...")
    if check_file_content(
        'components/checkout/ContactForm.tsx',
        'text-red-500'
    ):
        print("✅ PASS: Error messages have proper color")
        tests_passed += 1
    else:
        print("❌ FAIL: Error message styling missing")
        tests_failed += 1
    
    return tests_passed, tests_failed

def test_payment_fixes():
    """Test Square payment fixes"""
    print("\n" + "="*60)
    print("SQUARE PAYMENT FIXES VERIFICATION")
    print("="*60)
    
    tests_passed = 0
    tests_failed = 0
    
    # Test 1: Deprecated SQUARE_LOCATION_ID not used in payments route
    print("\n[1/7] Deprecated constant removal...")
    if not check_file_content(
        'app/api/payments/route.ts',
        'SQUARE_LOCATION_ID'
    ):
        print("✅ PASS: SQUARE_LOCATION_ID constant not imported")
        tests_passed += 1
    else:
        print("❌ FAIL: Still using deprecated SQUARE_LOCATION_ID")
        tests_failed += 1
    
    # Test 2: Using getSquareLocationId() function instead
    print("[2/7] New getter function usage...")
    if check_file_content(
        'app/api/payments/route.ts',
        'getSquareLocationId'
    ):
        print("✅ PASS: Using getSquareLocationId() function")
        tests_passed += 1
    else:
        print("❌ FAIL: Not using proper getter function")
        tests_failed += 1
    
    # Test 3: Location ID validation in payments route
    print("[3/7] Location ID validation...")
    if check_file_content(
        'app/api/payments/route.ts',
        'try {\n      locationId = getSquareLocationId();'
    ):
        print("✅ PASS: Location ID properly validated")
        tests_passed += 1
    else:
        print("❌ FAIL: Location ID validation missing")
        tests_failed += 1
    
    # Test 4: Idempotency key support in payment form
    print("[4/7] Idempotency key tracking...")
    if check_file_content(
        'components/checkout/SquarePaymentForm.tsx',
        'idempotencyKey'
    ) and check_file_content(
        'components/checkout/SquarePaymentForm.tsx',
        'paymentIdempotencyKeyRef'
    ):
        print("✅ PASS: Idempotency key properly tracked")
        tests_passed += 1
    else:
        print("❌ FAIL: Idempotency key tracking missing")
        tests_failed += 1
    
    # Test 5: Payment abort controller for cancellation
    print("[5/7] Payment request abort handling...")
    if check_file_content(
        'components/checkout/SquarePaymentForm.tsx',
        'abortControllerRef'
    ) and check_file_content(
        'components/checkout/SquarePaymentForm.tsx',
        'signal: abortControllerRef.current.signal'
    ):
        print("✅ PASS: Abort controller properly implemented")
        tests_passed += 1
    else:
        print("❌ FAIL: Abort controller missing")
        tests_failed += 1
    
    # Test 6: Config fetch error handling
    print("[6/7] Config fetch error handling...")
    if check_file_content(
        'components/checkout/SquarePaymentForm.tsx',
        'validatedata.applicationId || !data.locationId'
    ) or check_file_content(
        'components/checkout/SquarePaymentForm.tsx',
        'Missing required Square configuration'
    ):
        print("✅ PASS: Config validation properly handled")
        tests_passed += 1
    else:
        print("❌ FAIL: Config validation missing")
        tests_failed += 1
    
    # Test 7: useCallback for stabilizing onError dependency
    print("[7/7] Memory leak prevention...")
    if check_file_content(
        'components/checkout/SquarePaymentForm.tsx',
        'const stableOnError = useCallback(onError, []);'
    ):
        print("✅ PASS: useCallback prevents unnecessary refetches")
        tests_passed += 1
    else:
        print("❌ FAIL: useCallback optimization missing")
        tests_failed += 1
    
    return tests_passed, tests_failed

def test_accessibility_fixes():
    """Test accessibility improvements"""
    print("\n" + "="*60)
    print("ACCESSIBILITY FIXES VERIFICATION")
    print("="*60)
    
    tests_passed = 0
    tests_failed = 0
    
    # Test 1: ARIA attributes on form fields
    print("\n[1/4] ARIA attributes on form inputs...")
    if check_file_content(
        'components/checkout/ContactForm.tsx',
        'aria-invalid={!!errors'
    ):
        print("✅ PASS: Form inputs have aria-invalid attributes")
        tests_passed += 1
    else:
        print("❌ FAIL: aria-invalid attributes missing")
        tests_failed += 1
    
    # Test 2: aria-describedby linking errors to inputs
    print("[2/4] Error message linking...")
    if check_file_content(
        'components/checkout/ContactForm.tsx',
        'aria-describedby={errors'
    ):
        print("✅ PASS: Errors properly linked with aria-describedby")
        tests_passed += 1
    else:
        print("❌ FAIL: aria-describedby missing")
        tests_failed += 1
    
    # Test 3: Icons have pointer-events-none to prevent blocking
    print("[3/4] Icon pointer events disabled...")
    if check_file_content(
        'components/checkout/ContactForm.tsx',
        'pointer-events-none'
    ):
        print("✅ PASS: Icons properly non-interactive")
        tests_passed += 1
    else:
        print("❌ FAIL: Icons might block interactions")
        tests_failed += 1
    
    # Test 4: Button accessibility
    print("[4/4] Button disabled states...")
    if check_file_content(
        'components/ui/button.tsx',
        'disabled:pointer-events-none'
    ):
        print("✅ PASS: Disabled buttons properly handled")
        tests_passed += 1
    else:
        print("❌ FAIL: Disabled button handling issue")
        tests_failed += 1
    
    return tests_passed, tests_failed

def main():
    """Run all tests"""
    print("\n" + "="*60)
    print("COSMETIC & PAYMENT FIXES COMPREHENSIVE TEST SUITE")
    print("="*60)
    
    total_passed = 0
    total_failed = 0
    
    # Cosmetic fixes
    p, f = test_cosmetic_fixes()
    total_passed += p
    total_failed += f
    
    # Payment fixes
    p, f = test_payment_fixes()
    total_passed += p
    total_failed += f
    
    # Accessibility fixes
    p, f = test_accessibility_fixes()
    total_passed += p
    total_failed += f
    
    # Summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    print(f"✅ Passed: {total_passed}")
    print(f"❌ Failed: {total_failed}")
    print(f"📊 Total:  {total_passed + total_failed}")
    
    if total_failed == 0:
        print("\n🎉 ALL TESTS PASSED!")
        return 0
    else:
        print(f"\n⚠️  {total_failed} test(s) failed. Review the output above.")
        return 1

if __name__ == '__main__':
    sys.exit(main())
