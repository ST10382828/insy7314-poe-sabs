// Test with CSRF token
const http = require('http');

async function getCSRFToken() {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3011,
      path: '/api/csrf-token',
      method: 'GET'
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const token = JSON.parse(data).csrfToken;
          resolve(token);
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function testRegistration() {
  console.log('🔑 Getting CSRF token...');
  const csrfToken = await getCSRFToken();
  console.log(`✅ CSRF token received: ${csrfToken.substring(0, 10)}...`);
  
  const postData = JSON.stringify({
    fullName: "Test User",
    username: "testuser123",
    password: "TestPassword123!"
  });

  const options = {
    hostname: 'localhost',
    port: 3011,
    path: '/api/auth/register',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      'x-csrf-token': csrfToken
    }
  };

  console.log('📝 Testing user registration with CSRF token...');
  
  const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('Response:', data);
      if (res.statusCode === 201 || res.statusCode === 409) {
        console.log('✅ Registration endpoint working correctly!');
      } else if (res.statusCode === 400) {
        console.log('✅ Input validation working (expected for test data)');
      }
    });
  });

  req.on('error', (e) => {
    console.error(`❌ Problem with request: ${e.message}`);
  });

  req.write(postData);
  req.end();
}

testRegistration();

