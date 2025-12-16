/**
 * Form Validation Testing Script
 * 
 * Run this in browser console on /register page to test all validation scenarios
 */

// Color helpers for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ ${msg}${colors.reset}`),
  test: (msg) => console.log(`${colors.yellow}▶ ${msg}${colors.reset}`)
};

// Test utilities
const tests = {
  // Get input element
  getInput: (name) => document.querySelector(`input[name="${name}"]`),
  
  // Get error message for field
  getError: (fieldName) => {
    const field = tests.getInput(fieldName);
    const parent = field?.closest('.space-y-2');
    return parent?.querySelector('p.text-red-600')?.textContent || null;
  },
  
  // Get validation icon
  hasCheckmark: (fieldName) => {
    const field = tests.getInput(fieldName);
    const parent = field?.closest('.space-y-2');
    return parent?.querySelector('svg.text-green-500') !== null;
  },
  
  // Type in field
  typeValue: (name, value, delay = 50) => {
    return new Promise((resolve) => {
      const input = tests.getInput(name);
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      
      setTimeout(() => {
        // Wait for 300ms debounce
        setTimeout(resolve, 350);
      }, delay);
    });
  },
  
  // Check submit button state
  isSubmitEnabled: () => {
    const btn = document.querySelector('button[type="submit"]');
    return !btn?.disabled;
  },
  
  // Get submit button
  getSubmitBtn: () => document.querySelector('button[type="submit"]')
};

// Actual tests
async function runTests() {
  console.clear();
  console.log(`${colors.blue}═══════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}  FORM VALIDATION TEST SUITE${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════${colors.reset}\n`);
  
  let passed = 0;
  let failed = 0;
  
  // Test 1: Name validation
  log.test('Name Field Validation');
  try {
    await tests.typeValue('name', 'J');
    if (tests.getError('name')?.includes('at least 2')) {
      log.success('Short name shows error');
      passed++;
    } else {
      log.error('Short name should show error');
      failed++;
    }
    
    await tests.typeValue('name', 'John Doe');
    if (!tests.getError('name')) {
      log.success('Valid name clears error');
      passed++;
    } else {
      log.error('Valid name should clear error');
      failed++;
    }
  } catch (e) {
    log.error(`Name validation test failed: ${e.message}`);
    failed++;
  }
  
  // Test 2: Email validation
  log.test('Email Field Validation');
  try {
    await tests.typeValue('email', 'invalid-email');
    if (tests.getError('email')?.includes('Invalid email')) {
      log.success('Invalid email shows error');
      passed++;
    } else {
      log.error('Invalid email should show error');
      failed++;
    }
    
    await tests.typeValue('email', 'test@example.com');
    if (!tests.getError('email')) {
      log.success('Valid email clears error');
      passed++;
    } else {
      log.error('Valid email should clear error');
      failed++;
    }
  } catch (e) {
    log.error(`Email validation test failed: ${e.message}`);
    failed++;
  }
  
  // Test 3: Password validation
  log.test('Password Field Validation');
  try {
    await tests.typeValue('password', 'weak');
    if (tests.getError('password')?.includes('Password must contain')) {
      log.success('Weak password shows error');
      passed++;
    } else {
      log.error('Weak password should show error');
      failed++;
    }
    
    await tests.typeValue('password', 'Strong!Pass123');
    if (!tests.getError('password')) {
      log.success('Strong password clears error');
      passed++;
    } else {
      log.error('Strong password should clear error');
      failed++;
    }
  } catch (e) {
    log.error(`Password validation test failed: ${e.message}`);
    failed++;
  }
  
  // Test 4: Confirm password validation
  log.test('Confirm Password Field Validation');
  try {
    await tests.typeValue('password', 'Strong!Pass123');
    await tests.typeValue('confirmPassword', 'Strong!Pass12');
    
    if (tests.getError('confirmPassword')?.includes('do not match')) {
      log.success('Mismatched password shows error');
      passed++;
    } else {
      log.error('Mismatched password should show error');
      failed++;
    }
    
    await tests.typeValue('confirmPassword', 'Strong!Pass123');
    if (!tests.getError('confirmPassword')) {
      log.success('Matching password clears error');
      passed++;
    } else {
      log.error('Matching password should clear error');
      failed++;
    }
  } catch (e) {
    log.error(`Confirm password validation test failed: ${e.message}`);
    failed++;
  }
  
  // Test 5: Phone validation (optional)
  log.test('Phone Field Validation (Optional)');
  try {
    await tests.typeValue('phone', '');
    if (!tests.getError('phone')) {
      log.success('Empty phone has no error (optional)');
      passed++;
    } else {
      log.error('Empty phone should have no error');
      failed++;
    }
    
    await tests.typeValue('phone', '555');
    if (tests.getError('phone')?.includes('10-15 digits')) {
      log.success('Short phone shows error');
      passed++;
    } else {
      log.error('Short phone should show error');
      failed++;
    }
    
    await tests.typeValue('phone', '+1-555-123-4567');
    if (!tests.getError('phone')) {
      log.success('Valid phone format clears error');
      passed++;
    } else {
      log.error('Valid phone format should clear error');
      failed++;
    }
  } catch (e) {
    log.error(`Phone validation test failed: ${e.message}`);
    failed++;
  }
  
  // Test 6: Submit button state
  log.test('Submit Button State Management');
  try {
    // Clear all fields
    await tests.typeValue('name', '');
    await tests.typeValue('email', '');
    await tests.typeValue('password', '');
    await tests.typeValue('confirmPassword', '');
    
    if (!tests.isSubmitEnabled()) {
      log.success('Submit disabled when fields empty');
      passed++;
    } else {
      log.error('Submit should be disabled when empty');
      failed++;
    }
    
    // Fill with valid data
    await tests.typeValue('name', 'John Doe');
    await tests.typeValue('email', 'john@example.com');
    await tests.typeValue('password', 'Strong!Pass123');
    await tests.typeValue('confirmPassword', 'Strong!Pass123');
    
    const termsCheckbox = document.querySelector('input[id="terms"]');
    if (termsCheckbox && !termsCheckbox.checked) {
      log.info('Checking terms checkbox...');
      termsCheckbox.click();
      await new Promise(r => setTimeout(r, 350));
    }
    
    if (tests.isSubmitEnabled()) {
      log.success('Submit enabled with valid form');
      passed++;
    } else {
      log.error('Submit should be enabled with valid form');
      failed++;
    }
  } catch (e) {
    log.error(`Submit button test failed: ${e.message}`);
    failed++;
  }
  
  // Summary
  console.log(`\n${colors.blue}═══════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}  TEST RESULTS${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════${colors.reset}\n`);
  console.log(`${colors.green}Passed: ${passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failed}${colors.reset}`);
  console.log(`Total:  ${passed + failed}\n`);
  
  if (failed === 0) {
    console.log(`${colors.green}✓ ALL TESTS PASSED!${colors.reset}\n`);
  } else {
    console.log(`${colors.red}✗ ${failed} TEST(S) FAILED${colors.reset}\n`);
  }
}

// Run tests
console.log('Starting form validation tests...');
console.log('Please wait for results...\n');

runTests().catch(err => {
  console.error('Test suite error:', err);
});
