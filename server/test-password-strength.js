// Test password strength endpoint
const http = require('http');

function testPasswordStrength(password) {
  const postData = JSON.stringify({ password });

  const options = {
    hostname: 'localhost',
    port: 3011,
    path: '/api/auth/check-password-strength',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve({ status: res.statusCode, data: response });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('🔐 Testing Password Security Features...\n');
  
  // Test strong password
  console.log('1. Testing strong password:');
  const strongResult = await testPasswordStrength('TestPassword123!');
  console.log(`   Status: ${strongResult.status}`);
  if (strongResult.status === 200) {
    console.log(`   ✅ Strong password accepted`);
    console.log(`   Strength: ${strongResult.data.strength?.isStrong ? 'Strong' : 'Weak'}`);
    console.log(`   Breached: ${strongResult.data.isBreached ? 'Yes' : 'No'}`);
  } else {
    console.log(`   Response: ${JSON.stringify(strongResult.data)}`);
  }
  
  // Test weak password
  console.log('\n2. Testing weak password:');
  const weakResult = await testPasswordStrength('123');
  console.log(`   Status: ${weakResult.status}`);
  if (weakResult.status === 200) {
    console.log(`   Strength: ${weakResult.data.strength?.isStrong ? 'Strong' : 'Weak'}`);
    console.log(`   Breached: ${weakResult.data.isBreached ? 'Yes' : 'No'}`);
  } else {
    console.log(`   Response: ${JSON.stringify(weakResult.data)}`);
  }
  
  // Test breached password
  console.log('\n3. Testing breached password:');
  const breachedResult = await testPasswordStrength('password');
  console.log(`   Status: ${breachedResult.status}`);
  if (breachedResult.status === 200) {
    console.log(`   Strength: ${breachedResult.data.strength?.isStrong ? 'Strong' : 'Weak'}`);
    console.log(`   Breached: ${breachedResult.data.isBreached ? 'Yes' : 'No'}`);
  } else {
    console.log(`   Response: ${JSON.stringify(breachedResult.data)}`);
  }
  
  console.log('\n🎯 Password security testing complete!');
}

runTests();

