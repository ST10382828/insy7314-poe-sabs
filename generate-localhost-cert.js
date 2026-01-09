// Generate a proper localhost certificate
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const certDir = path.join(__dirname, 'server', 'certs');

// Create a proper localhost certificate
const opensslConfig = `
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
req_extensions = v3_req

[dn]
C=US
ST=Development
L=Development
O=Development
OU=IT Department
CN=localhost

[v3_req]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = *.localhost
IP.1 = 127.0.0.1
IP.2 = ::1
`;

console.log('🔐 Generating new localhost SSL certificate...');

try {
  // Write config file
  fs.writeFileSync(path.join(certDir, 'localhost.conf'), opensslConfig);
  
  // Generate private key
  console.log('📝 Generating private key...');
  execSync(`openssl genrsa -out "${path.join(certDir, 'localhost-key.pem')}" 2048`, { stdio: 'inherit' });
  
  // Generate certificate signing request
  console.log('📝 Generating certificate signing request...');
  execSync(`openssl req -new -key "${path.join(certDir, 'localhost-key.pem')}" -out "${path.join(certDir, 'localhost.csr')}" -config "${path.join(certDir, 'localhost.conf')}"`, { stdio: 'inherit' });
  
  // Generate self-signed certificate
  console.log('📝 Generating self-signed certificate...');
  execSync(`openssl x509 -req -in "${path.join(certDir, 'localhost.csr')}" -signkey "${path.join(certDir, 'localhost-key.pem')}" -out "${path.join(certDir, 'localhost-cert.pem')}" -days 365 -extensions v3_req -extfile "${path.join(certDir, 'localhost.conf')}"`, { stdio: 'inherit' });
  
  console.log('✅ Certificate generated successfully!');
  console.log('📁 Files created:');
  console.log(`   - ${path.join(certDir, 'localhost-key.pem')}`);
  console.log(`   - ${path.join(certDir, 'localhost-cert.pem')}`);
  
} catch (error) {
  console.error('❌ Error generating certificate:', error.message);
  console.log('\n💡 Alternative: Use the existing certificates and accept the browser warning');
}

