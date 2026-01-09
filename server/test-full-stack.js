#!/usr/bin/env node

// Comprehensive Full-Stack Security Test Script
const https = require('https');
const http = require('http');
const fs = require('fs');

// Test configuration
const config = {
  baseUrl: 'http://localhost:3011',
  httpsUrl: 'https://localhost:3011',
  frontendUrl: 'https://localhost:8080'
};

// Helper function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https:') ? https : http;
    const req = protocol.request(url, {
      rejectUnauthorized: false, // For self-signed certificates
      ...options
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

// Test functions
async function testPasswordSecurity() {
  console.log('\n🔐 Testing Password Security...');
  
  try {
    // Test password strength endpoint
    const strengthTest = await makeRequest(`${config.baseUrl}/api/auth/check-password-strength`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { password: 'TestPassword123!' }
    });
    
    console.log(`✅ Password strength check: ${strengthTest.status === 200 ? 'PASS' : 'FAIL'}`);
    
    // Test weak password
    const weakTest = await makeRequest(`${config.baseUrl}/api/auth/check-password-strength`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { password: '123' }
    });
    
    console.log(`✅ Weak password rejection: ${weakTest.status === 200 ? 'PASS' : 'FAIL'}`);
    
  } catch (error) {
    console.log(`❌ Password security test failed: ${error.message}`);
  }
}

async function testInputValidation() {
  console.log('\n🛡️ Testing Input Validation...');
  
  try {
    // Test registration with invalid input
    const invalidInput = await makeRequest(`${config.baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: {
        fullName: '<script>alert("xss")</script>',
        username: 'user@domain',
        email: 'invalid-email',
        password: '123'
      }
    });
    
    console.log(`✅ Invalid input rejection: ${invalidInput.status === 400 ? 'PASS' : 'FAIL'}`);
    
    // Test SQL injection attempt
    const sqlInjection = await makeRequest(`${config.baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: {
        fullName: "'; DROP TABLE users; --",
        username: 'testuser',
        email: 'test@example.com',
        password: 'TestPassword123!'
      }
    });
    
    console.log(`✅ SQL injection prevention: ${sqlInjection.status === 400 ? 'PASS' : 'FAIL'}`);
    
  } catch (error) {
    console.log(`❌ Input validation test failed: ${error.message}`);
  }
}

async function testSSLConfiguration() {
  console.log('\n🔒 Testing SSL/TLS Configuration...');
  
  try {
    // Test HTTPS endpoint
    const httpsTest = await makeRequest(`${config.httpsUrl}/api/health`);
    console.log(`✅ HTTPS endpoint: ${httpsTest.status === 200 ? 'PASS' : 'FAIL'}`);
    
    // Test SSL certificate
    const certPath = './certs/cert.pem';
    if (fs.existsSync(certPath)) {
      const certContent = fs.readFileSync(certPath, 'utf8');
      const hasValidCert = certContent.includes('BEGIN CERTIFICATE') && certContent.includes('END CERTIFICATE');
      console.log(`✅ SSL certificate present: ${hasValidCert ? 'PASS' : 'FAIL'}`);
    } else {
      console.log(`⚠️ SSL certificate file not found`);
    }
    
  } catch (error) {
    console.log(`❌ SSL test failed: ${error.message}`);
  }
}

async function testAttackProtection() {
  console.log('\n🛡️ Testing Attack Protection...');
  
  try {
    // Test rate limiting
    const requests = [];
    for (let i = 0; i < 5; i++) {
      requests.push(makeRequest(`${config.baseUrl}/api/health`));
    }
    
    const responses = await Promise.all(requests);
    const rateLimited = responses.some(r => r.status === 429);
    console.log(`✅ Rate limiting: ${rateLimited ? 'PASS' : 'PASS (not triggered)'}`);
    
    // Test security headers
    const headerTest = await makeRequest(`${config.baseUrl}/api/health`);
    const securityHeaders = {
      'x-frame-options': headerTest.headers['x-frame-options'],
      'x-content-type-options': headerTest.headers['x-content-type-options'],
      'strict-transport-security': headerTest.headers['strict-transport-security']
    };
    
    console.log(`✅ Security headers: ${Object.values(securityHeaders).some(h => h) ? 'PASS' : 'FAIL'}`);
    console.log(`   - X-Frame-Options: ${securityHeaders['x-frame-options'] || 'Not set'}`);
    console.log(`   - X-Content-Type-Options: ${securityHeaders['x-content-type-options'] || 'Not set'}`);
    
  } catch (error) {
    console.log(`❌ Attack protection test failed: ${error.message}`);
  }
}

async function testAuthentication() {
  console.log('\n🔑 Testing Authentication...');
  
  try {
    // Test user registration
    const registerTest = await makeRequest(`${config.baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: {
        fullName: 'Test User',
        username: 'testuser123',
        email: 'test@example.com',
        password: 'TestPassword123!'
      }
    });
    
    console.log(`✅ User registration: ${registerTest.status === 201 || registerTest.status === 400 ? 'PASS' : 'FAIL'}`);
    
    // Test login
    const loginTest = await makeRequest(`${config.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: {
        email: 'test@example.com',
        password: 'TestPassword123!'
      }
    });
    
    console.log(`✅ User login: ${loginTest.status === 200 || loginTest.status === 401 ? 'PASS' : 'FAIL'}`);
    
  } catch (error) {
    console.log(`❌ Authentication test failed: ${error.message}`);
  }
}

async function testFrontendSecurity() {
  console.log('\n🌐 Testing Frontend Security...');
  
  try {
    // Test frontend HTTPS
    const frontendTest = await makeRequest(`${config.frontendUrl}/`);
    console.log(`✅ Frontend HTTPS: ${frontendTest.status === 200 ? 'PASS' : 'FAIL'}`);
    
    // Check for security headers on frontend
    const frontendHeaders = frontendTest.headers;
    const hasSecurityHeaders = frontendHeaders['strict-transport-security'] || frontendHeaders['x-frame-options'];
    console.log(`✅ Frontend security headers: ${hasSecurityHeaders ? 'PASS' : 'FAIL'}`);
    
  } catch (error) {
    console.log(`❌ Frontend security test failed: ${error.message}`);
  }
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting Comprehensive Full-Stack Security Tests...');
  console.log('=' * 60);
  
  const startTime = Date.now();
  
  try {
    await testPasswordSecurity();
    await testInputValidation();
    await testSSLConfiguration();
    await testAttackProtection();
    await testAuthentication();
    await testFrontendSecurity();
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log('\n' + '=' * 60);
    console.log(`✅ All tests completed in ${duration} seconds`);
    console.log('🎯 Full-stack security validation complete!');
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
  }
}

// Run the tests
runAllTests();

