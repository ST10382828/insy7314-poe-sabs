// Simple API test
const http = require('http');

function testAPI() {
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
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Headers:`, res.headers);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('Response:', data);
    });
  });

  req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
  });

  req.write(postData);
  req.end();
}

console.log('Testing API registration endpoint...');
testAPI();

