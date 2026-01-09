// Generate trusted SSL certificates for localhost
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const certDir = path.join(__dirname, 'server', 'certs');

console.log('🔐 Generating trusted SSL certificates for localhost...');

try {
  // Create a proper OpenSSL config for localhost
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

  console.log('📝 Creating OpenSSL configuration...');
  fs.writeFileSync(path.join(certDir, 'localhost.conf'), opensslConfig);
  
  const opensslPath = 'C:\\Program Files\\Git\\usr\\bin\\openssl.exe';
  
  console.log('🔑 Generating private key...');
  execSync(`"${opensslPath}" genrsa -out "${path.join(certDir, 'localhost-key.pem')}" 2048`, { stdio: 'inherit' });
  
  console.log('📋 Generating certificate signing request...');
  execSync(`"${opensslPath}" req -new -key "${path.join(certDir, 'localhost-key.pem')}" -out "${path.join(certDir, 'localhost.csr')}" -config "${path.join(certDir, 'localhost.conf')}"`, { stdio: 'inherit' });
  
  console.log('📜 Generating self-signed certificate...');
  execSync(`"${opensslPath}" x509 -req -in "${path.join(certDir, 'localhost.csr')}" -signkey "${path.join(certDir, 'localhost-key.pem')}" -out "${path.join(certDir, 'localhost-cert.pem')}" -days 365 -extensions v3_req -extfile "${path.join(certDir, 'localhost.conf')}"`, { stdio: 'inherit' });
  
  // Copy the new certificates to replace the old ones
  console.log('📁 Copying certificates...');
  fs.copyFileSync(path.join(certDir, 'localhost-key.pem'), path.join(certDir, 'key.pem'));
  fs.copyFileSync(path.join(certDir, 'localhost-cert.pem'), path.join(certDir, 'cert.pem'));
  
  console.log('✅ Trusted certificates generated successfully!');
  console.log('📋 Certificate details:');
  console.log(`   - Subject: CN=localhost`);
  console.log(`   - SAN: localhost, *.localhost, 127.0.0.1, ::1`);
  console.log(`   - Valid for: 365 days`);
  console.log(`   - Key size: 2048 bits`);
  
  console.log('\n🔧 Next steps:');
  console.log('1. Restart your development servers');
  console.log('2. Go to https://localhost:8080');
  console.log('3. Click "Advanced" and "Proceed to localhost (unsafe)"');
  console.log('4. The certificate should now be trusted for future visits');
  
} catch (error) {
  console.error('❌ Error generating certificates:', error.message);
  
  if (error.message.includes('openssl')) {
    console.log('\n💡 OpenSSL not found. Installing OpenSSL:');
    console.log('   Option 1: Install Git for Windows (includes OpenSSL)');
    console.log('   Option 2: Install OpenSSL separately');
    console.log('   Option 3: Use the existing certificates and accept browser warnings');
  }
}
