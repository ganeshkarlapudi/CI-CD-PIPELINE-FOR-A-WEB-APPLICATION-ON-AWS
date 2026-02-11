/**
 * Test script for trend analysis endpoints
 * Run with: node test-trend-endpoints.js
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';

// Test credentials (use existing user or create one)
const TEST_USER = {
  username: 'testuser',
  password: 'Test123!@#'
};

let authToken = null;

async function login() {
  try {
    console.log('Logging in...');
    const response = await axios.post(`${API_BASE_URL}/auth/login`, TEST_USER);
    
    if (response.data.success) {
      authToken = response.data.data.token;
      console.log('✓ Login successful');
      return true;
    } else {
      console.log('✗ Login failed:', response.data.error);
      return false;
    }
  } catch (error) {
    console.log('✗ Login error:', error.response?.data?.error?.message || error.message);
    return false;
  }
}

async function testDefectTrends() {
  try {
    console.log('\nTesting GET /api/inspections/trends/defects...');
    
    const response = await axios.get(`${API_BASE_URL}/inspections/trends/defects`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      params: {
        groupBy: 'day'
      }
    });
    
    if (response.data.success) {
      console.log('✓ Defect trends endpoint working');
      console.log(`  Found ${response.data.data.trends.length} trend data points`);
      
      if (response.data.data.trends.length > 0) {
        const sample = response.data.data.trends[0];
        console.log(`  Sample: ${sample.date} - ${sample.totalDefects} defects`);
      }
      
      return true;
    } else {
      console.log('✗ Defect trends failed:', response.data.error);
      return false;
    }
  } catch (error) {
    console.log('✗ Defect trends error:', error.response?.data?.error?.message || error.message);
    return false;
  }
}

async function testTrendSummary() {
  try {
    console.log('\nTesting GET /api/inspections/trends/summary...');
    
    const response = await axios.get(`${API_BASE_URL}/inspections/trends/summary`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (response.data.success) {
      console.log('✓ Trend summary endpoint working');
      const summary = response.data.data;
      
      console.log(`  Total inspections: ${summary.overallStats.totalInspections}`);
      console.log(`  Total defects: ${summary.overallStats.totalDefects}`);
      console.log(`  Defect classes found: ${summary.defectsByClass.length}`);
      
      return true;
    } else {
      console.log('✗ Trend summary failed:', response.data.error);
      return false;
    }
  } catch (error) {
    console.log('✗ Trend summary error:', error.response?.data?.error?.message || error.message);
    return false;
  }
}

async function testWithDateRange() {
  try {
    console.log('\nTesting with date range...');
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    const response = await axios.get(`${API_BASE_URL}/inspections/trends/defects`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      params: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        groupBy: 'week'
      }
    });
    
    if (response.data.success) {
      console.log('✓ Date range filtering working');
      console.log(`  Found ${response.data.data.trends.length} weekly trend data points`);
      return true;
    } else {
      console.log('✗ Date range filtering failed:', response.data.error);
      return false;
    }
  } catch (error) {
    console.log('✗ Date range filtering error:', error.response?.data?.error?.message || error.message);
    return false;
  }
}

async function runTests() {
  console.log('=== Trend Analysis Endpoints Test ===\n');
  
  // Login first
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('\n✗ Cannot proceed without authentication');
    return;
  }
  
  // Run tests
  await testDefectTrends();
  await testTrendSummary();
  await testWithDateRange();
  
  console.log('\n=== Test Complete ===');
}

// Run tests
runTests().catch(error => {
  console.error('Test suite error:', error);
  process.exit(1);
});
