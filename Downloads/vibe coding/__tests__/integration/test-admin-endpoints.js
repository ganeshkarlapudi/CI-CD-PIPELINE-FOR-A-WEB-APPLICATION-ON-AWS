/**
 * Manual test script for admin user management endpoints
 * Run this after starting the server with: node test-admin-endpoints.js
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

let adminToken = '';
let testUserId = '';

// Helper function to log results
function logResult(testName, success, data) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`TEST: ${testName}`);
  console.log(`STATUS: ${success ? '✓ PASSED' : '✗ FAILED'}`);
  console.log(`RESPONSE:`, JSON.stringify(data, null, 2));
  console.log('='.repeat(60));
}

// Test 1: Register an admin user (manual step - you need to create admin in DB first)
async function loginAsAdmin() {
  try {
    console.log('\n🔐 Logging in as admin...');
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'Admin123!',
    });
    
    adminToken = response.data.token;
    logResult('Admin Login', true, response.data);
    return true;
  } catch (error) {
    logResult('Admin Login', false, error.response?.data || error.message);
    console.log('\n⚠️  NOTE: You need to create an admin user first.');
    console.log('You can do this by registering a user and manually updating their role to "admin" in MongoDB.');
    return false;
  }
}

// Test 2: Create a new user via admin endpoint
async function testCreateUser() {
  try {
    console.log('\n👤 Creating new user via admin endpoint...');
    const response = await axios.post(
      `${BASE_URL}/admin/users`,
      {
        username: 'testuser123',
        email: 'testuser123@example.com',
        password: 'Test123!@#',
        role: 'user',
      },
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );
    
    testUserId = response.data.userId;
    logResult('Create User', true, response.data);
    return true;
  } catch (error) {
    logResult('Create User', false, error.response?.data || error.message);
    return false;
  }
}

// Test 3: Get all users with pagination
async function testGetUsers() {
  try {
    console.log('\n📋 Fetching users list...');
    const response = await axios.get(`${BASE_URL}/admin/users?page=1&limit=10`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    
    logResult('Get Users', true, response.data);
    return true;
  } catch (error) {
    logResult('Get Users', false, error.response?.data || error.message);
    return false;
  }
}

// Test 4: Search users
async function testSearchUsers() {
  try {
    console.log('\n🔍 Searching users...');
    const response = await axios.get(`${BASE_URL}/admin/users?search=test`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    
    logResult('Search Users', true, response.data);
    return true;
  } catch (error) {
    logResult('Search Users', false, error.response?.data || error.message);
    return false;
  }
}

// Test 5: Update user role
async function testUpdateUserRole() {
  try {
    console.log('\n✏️  Updating user role...');
    const response = await axios.put(
      `${BASE_URL}/admin/users/${testUserId}`,
      {
        role: 'admin',
      },
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );
    
    logResult('Update User Role', true, response.data);
    return true;
  } catch (error) {
    logResult('Update User Role', false, error.response?.data || error.message);
    return false;
  }
}

// Test 6: Update user status
async function testUpdateUserStatus() {
  try {
    console.log('\n✏️  Updating user status...');
    const response = await axios.put(
      `${BASE_URL}/admin/users/${testUserId}`,
      {
        status: 'inactive',
      },
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );
    
    logResult('Update User Status', true, response.data);
    return true;
  } catch (error) {
    logResult('Update User Status', false, error.response?.data || error.message);
    return false;
  }
}

// Test 7: Deactivate user
async function testDeactivateUser() {
  try {
    console.log('\n🚫 Deactivating user...');
    const response = await axios.delete(`${BASE_URL}/admin/users/${testUserId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    
    logResult('Deactivate User', true, response.data);
    return true;
  } catch (error) {
    logResult('Deactivate User', false, error.response?.data || error.message);
    return false;
  }
}

// Test 8: Test authorization (non-admin user should be denied)
async function testUnauthorizedAccess() {
  try {
    console.log('\n🔒 Testing unauthorized access...');
    // First register a regular user
    await axios.post(`${BASE_URL}/auth/register`, {
      username: 'regularuser',
      email: 'regular@example.com',
      password: 'Regular123!',
    });
    
    // Login as regular user
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'regularuser',
      password: 'Regular123!',
    });
    
    const userToken = loginResponse.data.token;
    
    // Try to access admin endpoint
    try {
      await axios.get(`${BASE_URL}/admin/users`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      logResult('Unauthorized Access Test', false, 'Regular user was able to access admin endpoint!');
      return false;
    } catch (error) {
      if (error.response?.status === 403) {
        logResult('Unauthorized Access Test', true, 'Access correctly denied for non-admin user');
        return true;
      }
      throw error;
    }
  } catch (error) {
    logResult('Unauthorized Access Test', false, error.response?.data || error.message);
    return false;
  }
}

// Test 9: Get monitoring metrics
async function testGetMonitoringMetrics() {
  try {
    console.log('\n📊 Fetching monitoring metrics...');
    const response = await axios.get(`${BASE_URL}/admin/monitoring/metrics`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    
    logResult('Get Monitoring Metrics', true, response.data);
    return true;
  } catch (error) {
    logResult('Get Monitoring Metrics', false, error.response?.data || error.message);
    return false;
  }
}

// Test 10: Get monitoring metrics with date range
async function testGetMonitoringMetricsWithDateRange() {
  try {
    console.log('\n📊 Fetching monitoring metrics with date range...');
    const endDate = new Date().toISOString();
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(); // Last 7 days
    
    const response = await axios.get(
      `${BASE_URL}/admin/monitoring/metrics?startDate=${startDate}&endDate=${endDate}`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );
    
    logResult('Get Monitoring Metrics with Date Range', true, response.data);
    return true;
  } catch (error) {
    logResult('Get Monitoring Metrics with Date Range', false, error.response?.data || error.message);
    return false;
  }
}

// Test 11: Get system logs
async function testGetSystemLogs() {
  try {
    console.log('\n📝 Fetching system logs...');
    const response = await axios.get(`${BASE_URL}/admin/monitoring/logs`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    
    logResult('Get System Logs', true, response.data);
    return true;
  } catch (error) {
    logResult('Get System Logs', false, error.response?.data || error.message);
    return false;
  }
}

// Test 12: Get system logs with severity filter
async function testGetSystemLogsWithSeverityFilter() {
  try {
    console.log('\n📝 Fetching system logs with severity filter (error, critical)...');
    const response = await axios.get(`${BASE_URL}/admin/monitoring/logs?severity=error,critical`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    
    logResult('Get System Logs with Severity Filter', true, response.data);
    return true;
  } catch (error) {
    logResult('Get System Logs with Severity Filter', false, error.response?.data || error.message);
    return false;
  }
}

// Test 13: Get system logs with date range
async function testGetSystemLogsWithDateRange() {
  try {
    console.log('\n📝 Fetching system logs with date range...');
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // Last 7 days
    
    const response = await axios.get(
      `${BASE_URL}/admin/monitoring/logs?startDate=${startDate}&endDate=${endDate}`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );
    
    logResult('Get System Logs with Date Range', true, response.data);
    return true;
  } catch (error) {
    logResult('Get System Logs with Date Range', false, error.response?.data || error.message);
    return false;
  }
}

// Test 14: Get system logs with pagination
async function testGetSystemLogsWithPagination() {
  try {
    console.log('\n📝 Fetching system logs with pagination...');
    const response = await axios.get(`${BASE_URL}/admin/monitoring/logs?page=1&limit=5`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    
    logResult('Get System Logs with Pagination', true, response.data);
    return true;
  } catch (error) {
    logResult('Get System Logs with Pagination', false, error.response?.data || error.message);
    return false;
  }
}

// Test 15: Get system logs with multiple filters
async function testGetSystemLogsWithMultipleFilters() {
  try {
    console.log('\n📝 Fetching system logs with multiple filters...');
    const response = await axios.get(
      `${BASE_URL}/admin/monitoring/logs?severity=info,warning&page=1&limit=10&resolved=false`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );
    
    logResult('Get System Logs with Multiple Filters', true, response.data);
    return true;
  } catch (error) {
    logResult('Get System Logs with Multiple Filters', false, error.response?.data || error.message);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('\n🚀 Starting Admin User Management Endpoint Tests...\n');
  console.log('Make sure the server is running on http://localhost:3000');
  console.log('Make sure MongoDB and Redis are running');
  
  const results = {
    passed: 0,
    failed: 0,
  };
  
  // Login as admin
  if (!(await loginAsAdmin())) {
    console.log('\n❌ Cannot proceed without admin login. Exiting...');
    return;
  }
  
  // Run tests
  const tests = [
    testCreateUser,
    testGetUsers,
    testSearchUsers,
    testUpdateUserRole,
    testUpdateUserStatus,
    testDeactivateUser,
    testUnauthorizedAccess,
    testGetMonitoringMetrics,
    testGetMonitoringMetricsWithDateRange,
    testGetSystemLogs,
    testGetSystemLogsWithSeverityFilter,
    testGetSystemLogsWithDateRange,
    testGetSystemLogsWithPagination,
    testGetSystemLogsWithMultipleFilters,
  ];
  
  for (const test of tests) {
    const result = await test();
    if (result) {
      results.passed++;
    } else {
      results.failed++;
    }
    // Wait a bit between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`✓ Passed: ${results.passed}`);
  console.log(`✗ Failed: ${results.failed}`);
  console.log(`Total: ${results.passed + results.failed}`);
  console.log('='.repeat(60));
}

// Run the tests
runTests().catch(error => {
  console.error('\n❌ Test execution failed:', error.message);
  process.exit(1);
});
