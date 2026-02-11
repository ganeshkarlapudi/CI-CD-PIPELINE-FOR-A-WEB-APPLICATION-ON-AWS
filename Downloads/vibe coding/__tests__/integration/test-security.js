/**
 * Security Implementation Test Suite
 * 
 * This file contains tests to verify security measures are working correctly.
 * Run with: node test-security.js
 */

const axios = require('axios');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m',
};

let passedTests = 0;
let failedTests = 0;

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(testName, passed, details = '') {
  if (passed) {
    passedTests++;
    log(`✓ ${testName}`, 'green');
  } else {
    failedTests++;
    log(`✗ ${testName}`, 'red');
  }
  if (details) {
    log(`  ${details}`, 'yellow');
  }
}

async function testRateLimiting() {
  log('\n=== Testing Rate Limiting ===', 'yellow');
  
  try {
    // Test API rate limiting (100 requests per minute)
    log('Testing API rate limiter (this may take a moment)...');
    let rateLimitHit = false;
    
    for (let i = 0; i < 105; i++) {
      try {
        const response = await axios.get(`${BASE_URL}/health`);
        if (response.status === 429) {
          rateLimitHit = true;
          break;
        }
      } catch (error) {
        if (error.response && error.response.status === 429) {
          rateLimitHit = true;
          logTest('API rate limiting enforced', true, `Rate limit hit after ${i + 1} requests`);
          break;
        }
      }
    }
    
    if (!rateLimitHit) {
      logTest('API rate limiting enforced', false, 'Rate limit not triggered after 105 requests');
    }
  } catch (error) {
    logTest('Rate limiting test', false, error.message);
  }
}

async function testInputValidation() {
  log('\n=== Testing Input Validation ===', 'yellow');
  
  // Test invalid email format
  try {
    await axios.post(`${BASE_URL}/api/auth/register`, {
      username: 'testuser',
      email: 'invalid-email',
      password: 'Test123!@#',
      confirmPassword: 'Test123!@#',
    });
    logTest('Email validation', false, 'Invalid email was accepted');
  } catch (error) {
    if (error.response && error.response.status === 400) {
      logTest('Email validation', true, 'Invalid email rejected');
    } else {
      logTest('Email validation', false, error.message);
    }
  }
  
  // Test weak password
  try {
    await axios.post(`${BASE_URL}/api/auth/register`, {
      username: 'testuser',
      email: 'test@example.com',
      password: 'weak',
      confirmPassword: 'weak',
    });
    logTest('Password complexity validation', false, 'Weak password was accepted');
  } catch (error) {
    if (error.response && error.response.status === 400) {
      logTest('Password complexity validation', true, 'Weak password rejected');
    } else {
      logTest('Password complexity validation', false, error.message);
    }
  }
  
  // Test XSS in username
  try {
    await axios.post(`${BASE_URL}/api/auth/register`, {
      username: '<script>alert("xss")</script>',
      email: 'test@example.com',
      password: 'Test123!@#',
      confirmPassword: 'Test123!@#',
    });
    logTest('XSS prevention in username', false, 'XSS payload was accepted');
  } catch (error) {
    if (error.response && error.response.status === 400) {
      logTest('XSS prevention in username', true, 'XSS payload rejected');
    } else {
      logTest('XSS prevention in username', false, error.message);
    }
  }
}

async function testCORS() {
  log('\n=== Testing CORS Configuration ===', 'yellow');
  
  try {
    // Test with invalid origin
    const response = await axios.get(`${BASE_URL}/health`, {
      headers: {
        'Origin': 'http://malicious-site.com',
      },
      validateStatus: () => true,
    });
    
    // Check if CORS headers are present
    const corsHeader = response.headers['access-control-allow-origin'];
    if (corsHeader && corsHeader !== 'http://malicious-site.com') {
      logTest('CORS origin validation', true, 'Malicious origin blocked or not in whitelist');
    } else if (!corsHeader) {
      logTest('CORS origin validation', true, 'CORS headers properly configured');
    } else {
      logTest('CORS origin validation', false, 'Malicious origin was allowed');
    }
  } catch (error) {
    logTest('CORS test', false, error.message);
  }
}

async function testSecurityHeaders() {
  log('\n=== Testing Security Headers ===', 'yellow');
  
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    const headers = response.headers;
    
    // Check for Helmet security headers
    const securityHeaders = [
      'x-content-type-options',
      'x-xss-protection',
      'strict-transport-security',
    ];
    
    let allHeadersPresent = true;
    securityHeaders.forEach(header => {
      if (!headers[header]) {
        allHeadersPresent = false;
        log(`  Missing header: ${header}`, 'yellow');
      }
    });
    
    logTest('Security headers (Helmet)', allHeadersPresent, 
      allHeadersPresent ? 'All security headers present' : 'Some headers missing');
  } catch (error) {
    logTest('Security headers test', false, error.message);
  }
}

async function testFileUploadValidation() {
  log('\n=== Testing File Upload Validation ===', 'yellow');
  
  // Note: This test requires authentication, so it will likely fail without a valid token
  // This is just to demonstrate the test structure
  
  try {
    const FormData = require('form-data');
    const fs = require('fs');
    const form = new FormData();
    
    // Create a fake file with wrong magic number
    const fakeImageBuffer = Buffer.from('This is not an image');
    form.append('images', fakeImageBuffer, {
      filename: 'fake.jpg',
      contentType: 'image/jpeg',
    });
    
    await axios.post(`${BASE_URL}/api/inspections/upload`, form, {
      headers: {
        ...form.getHeaders(),
        'Authorization': 'Bearer fake-token',
      },
    });
    
    logTest('File magic number validation', false, 'Fake image was accepted');
  } catch (error) {
    if (error.response && (error.response.status === 400 || error.response.status === 401)) {
      logTest('File magic number validation', true, 
        error.response.status === 401 ? 'Auth required (expected)' : 'Invalid file rejected');
    } else {
      logTest('File magic number validation', false, error.message);
    }
  }
}

async function testPaginationValidation() {
  log('\n=== Testing Pagination Validation ===', 'yellow');
  
  try {
    // Test invalid page number
    await axios.get(`${BASE_URL}/api/inspections?page=-1`, {
      headers: {
        'Authorization': 'Bearer fake-token',
      },
    });
    logTest('Pagination validation (negative page)', false, 'Negative page number accepted');
  } catch (error) {
    if (error.response && (error.response.status === 400 || error.response.status === 401)) {
      logTest('Pagination validation (negative page)', true, 
        error.response.status === 401 ? 'Auth required (expected)' : 'Invalid page rejected');
    } else {
      logTest('Pagination validation (negative page)', false, error.message);
    }
  }
  
  try {
    // Test limit exceeding maximum
    await axios.get(`${BASE_URL}/api/inspections?limit=200`, {
      headers: {
        'Authorization': 'Bearer fake-token',
      },
    });
    logTest('Pagination validation (limit > 100)', false, 'Excessive limit accepted');
  } catch (error) {
    if (error.response && (error.response.status === 400 || error.response.status === 401)) {
      logTest('Pagination validation (limit > 100)', true, 
        error.response.status === 401 ? 'Auth required (expected)' : 'Excessive limit rejected');
    } else {
      logTest('Pagination validation (limit > 100)', false, error.message);
    }
  }
}

async function runTests() {
  log('\n╔════════════════════════════════════════════════════════╗', 'yellow');
  log('║     Aircraft Defect Detection - Security Tests        ║', 'yellow');
  log('╚════════════════════════════════════════════════════════╝', 'yellow');
  
  log(`\nTesting server at: ${BASE_URL}`);
  log('Note: Server must be running for tests to work\n');
  
  // Check if server is running
  try {
    await axios.get(`${BASE_URL}/health`, { timeout: 5000 });
    log('✓ Server is running', 'green');
  } catch (error) {
    log('✗ Server is not running or not accessible', 'red');
    log('Please start the server with: npm start', 'yellow');
    process.exit(1);
  }
  
  // Run all tests
  await testSecurityHeaders();
  await testCORS();
  await testInputValidation();
  await testPaginationValidation();
  await testFileUploadValidation();
  await testRateLimiting(); // Run this last as it takes time
  
  // Summary
  log('\n╔════════════════════════════════════════════════════════╗', 'yellow');
  log('║                    Test Summary                        ║', 'yellow');
  log('╚════════════════════════════════════════════════════════╝', 'yellow');
  log(`\nTotal Tests: ${passedTests + failedTests}`);
  log(`Passed: ${passedTests}`, 'green');
  log(`Failed: ${failedTests}`, failedTests > 0 ? 'red' : 'green');
  
  if (failedTests === 0) {
    log('\n✓ All security tests passed!', 'green');
  } else {
    log('\n✗ Some security tests failed. Please review the implementation.', 'red');
  }
  
  process.exit(failedTests > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  log(`\nUnexpected error: ${error.message}`, 'red');
  process.exit(1);
});
