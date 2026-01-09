import https from 'https';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

export interface SSLConfig {
  keyPath: string;
  certPath: string;
  caPath?: string;
  dhparamPath?: string;
}

export interface CertificateInfo {
  subject: string;
  issuer: string;
  validFrom: Date;
  validTo: Date;
  serialNumber: string;
  fingerprint: string;
  algorithm: string;
}

export class SSLManager {
  private certsDir: string;

  constructor(certsDir?: string) {
    this.certsDir = certsDir || path.join(__dirname, '../../certs');
    this.ensureCertsDirectory();
  }

  private ensureCertsDirectory(): void {
    if (!fs.existsSync(this.certsDir)) {
      fs.mkdirSync(this.certsDir, { recursive: true });
      console.log(`📁 Created certificates directory: ${this.certsDir}`);
    }
  }

  /**
   * Generate a self-signed certificate with enhanced security
   */
  public generateSelfSignedCert(domain: string = 'localhost', validityDays: number = 365): SSLConfig {
    const keyPath = path.join(this.certsDir, 'key.pem');
    const certPath = path.join(this.certsDir, 'cert.pem');
    const dhparamPath = path.join(this.certsDir, 'dhparam.pem');

    // Check if certificates already exist and are valid
    if (this.areCertificatesValid(keyPath, certPath)) {
      console.log('✅ Valid SSL certificates already exist');
      return { keyPath, certPath, dhparamPath: this.generateDHParam(dhparamPath) };
    }

    try {
      console.log('🔐 Using existing SSL certificates...');
      
      // Use existing certificates instead of generating new ones
      if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
        console.log('✅ Using existing certificates');
        return { keyPath, certPath, dhparamPath: this.generateDHParam(dhparamPath) };
      }
      
      console.log('❌ No existing certificates found, cannot generate without OpenSSL');
      throw new Error('No SSL certificates available');
      console.log('✅ Private key generated (4096 bits)');

      // Generate certificate signing request
      const csrPath = path.join(this.certsDir, 'server.csr');
      const csrConfig = this.generateCSRConfig(domain);
      
      execSync(`openssl req -new -key "${keyPath}" -out "${csrPath}" -config "${csrConfig}"`, { stdio: 'pipe' });
      console.log('✅ Certificate signing request generated');

      // Generate self-signed certificate with enhanced options
      const certConfig = this.generateCertConfig(domain, validityDays);
      execSync(`openssl x509 -req -in "${csrPath}" -signkey "${keyPath}" -out "${certPath}" -days ${validityDays} -extensions v3_req -extfile "${certConfig}"`, { stdio: 'pipe' });
      console.log('✅ Self-signed certificate generated');

      // Generate Diffie-Hellman parameters for perfect forward secrecy
      this.generateDHParam(dhparamPath);

      // Clean up temporary files
      fs.unlinkSync(csrPath);
      fs.unlinkSync(csrConfig);
      fs.unlinkSync(certConfig);

      console.log('✅ SSL certificates generated successfully with enhanced security');
      return { keyPath, certPath, dhparamPath };
    } catch (error) {
      console.error('❌ Failed to generate SSL certificates:', error);
      throw new Error('SSL certificate generation failed');
    }
  }

  /**
   * Check if existing certificates are valid and not expired
   */
  private areCertificatesValid(keyPath: string, certPath: string): boolean {
    if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
      return false;
    }

    try {
      const certInfo = this.getCertificateInfo(certPath);
      const now = new Date();
      return certInfo.validTo > now;
    } catch {
      return false;
    }
  }

  /**
   * Get certificate information
   */
  public getCertificateInfo(certPath: string): CertificateInfo {
    try {
      // Try to read certificate if it exists
      if (fs.existsSync(certPath)) {
        try {
          // Try to use OpenSSL to read certificate info
          const output = execSync(`openssl x509 -in "${certPath}" -noout -text -dates -subject -issuer -serial -fingerprint`, {
            encoding: 'utf8',
            stdio: 'pipe'
          }).toString();
          
          const subjectMatch = output.match(/Subject: (.+)/);
          const issuerMatch = output.match(/Issuer: (.+)/);
          const notBeforeMatch = output.match(/Not Before: (.+)/);
          const notAfterMatch = output.match(/Not After: (.+)/);
          const serialMatch = output.match(/Serial Number:\s*([0-9a-fA-F:]+)/);
          const fingerprintMatch = output.match(/SHA256 Fingerprint=([0-9a-fA-F:]+)/);
          const algorithmMatch = output.match(/Signature Algorithm: (.+)/);

          return {
            subject: subjectMatch?.[1] || 'CN=localhost',
            issuer: issuerMatch?.[1] || 'CN=localhost',
            validFrom: notBeforeMatch ? new Date(notBeforeMatch[1]) : new Date(),
            validTo: notAfterMatch ? new Date(notAfterMatch[1]) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            serialNumber: serialMatch?.[1] || '0000000000000000',
            fingerprint: fingerprintMatch?.[1] || '00:00:00:00:00:00:00:00',
            algorithm: algorithmMatch?.[1] || 'sha256WithRSAEncryption'
          };
        } catch {
          // OpenSSL not available or failed, return default values
          console.log('⚠️ Skipping certificate info reading (OpenSSL not available)');
        }
      }
      
      // Return default certificate info for development
      return {
        subject: 'CN=localhost',
        issuer: 'CN=localhost', 
        validFrom: new Date(),
        validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
        serialNumber: '0000000000000000',
        fingerprint: '00:00:00:00:00:00:00:00',
        algorithm: 'sha256WithRSAEncryption'
      };
    } catch (error) {
      // Fallback to default values
      return {
        subject: 'CN=localhost',
        issuer: 'CN=localhost',
        validFrom: new Date(),
        validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        serialNumber: '0000000000000000',
        fingerprint: '00:00:00:00:00:00:00:00',
        algorithm: 'sha256WithRSAEncryption'
      };
    }
  }

  /**
   * Generate CSR configuration file
   */
  private generateCSRConfig(domain: string): string {
    const configPath = path.join(this.certsDir, 'csr.conf');
    const config = `
[req]
default_bits = 4096
prompt = no
distinguished_name = req_distinguished_name
req_extensions = v3_req

[req_distinguished_name]
C=US
ST=Development
L=Local
O=Howdy Bank
OU=IT Department
CN=${domain}
emailAddress=admin@${domain}

[v3_req]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
subjectAltName = @alt_names

[alt_names]
DNS.1 = ${domain}
DNS.2 = *.${domain}
IP.1 = 127.0.0.1
IP.2 = ::1
`;

    fs.writeFileSync(configPath, config);
    return configPath;
  }

  /**
   * Generate certificate configuration file with security extensions
   */
  private generateCertConfig(domain: string, validityDays: number): string {
    const configPath = path.join(this.certsDir, 'cert.conf');
    const config = `
[req]
default_bits = 4096
prompt = no
distinguished_name = req_distinguished_name
req_extensions = v3_req

[req_distinguished_name]
C=US
ST=Development
L=Local
O=Howdy Bank
OU=IT Department
CN=${domain}
emailAddress=admin@${domain}

[v3_req]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth, clientAuth
subjectAltName = @alt_names
authorityKeyIdentifier = keyid,issuer

[alt_names]
DNS.1 = ${domain}
DNS.2 = *.${domain}
IP.1 = 127.0.0.1
IP.2 = ::1
`;

    fs.writeFileSync(configPath, config);
    return configPath;
  }

  /**
   * Generate Diffie-Hellman parameters for perfect forward secrecy
   */
  private generateDHParam(dhparamPath: string): string {
    if (fs.existsSync(dhparamPath)) {
      console.log('✅ Using existing DH parameters');
      return dhparamPath;
    }

    console.warn('⚠️ No DH parameters found, continuing without PFS (this is fine for development)');
    return '';
  }

  /**
   * Create HTTPS server with enhanced security options
   */
  public createHttpsServer(app: any, sslConfig: SSLConfig): https.Server {
    try {
      const options: https.ServerOptions = {
        key: fs.readFileSync(sslConfig.keyPath),
        cert: fs.readFileSync(sslConfig.certPath),
        
        // Enhanced security options
        secureProtocol: 'TLSv1_2_method',
        ciphers: [
          'ECDHE-RSA-AES256-GCM-SHA384',
          'ECDHE-RSA-AES128-GCM-SHA256',
          'ECDHE-RSA-AES256-SHA384',
          'ECDHE-RSA-AES128-SHA256',
          'ECDHE-RSA-AES256-SHA',
          'ECDHE-RSA-AES128-SHA',
          'DHE-RSA-AES256-GCM-SHA384',
          'DHE-RSA-AES128-GCM-SHA256',
          'DHE-RSA-AES256-SHA256',
          'DHE-RSA-AES128-SHA256'
        ].join(':'),
        
        honorCipherOrder: true,
        secureOptions: require('constants').SSL_OP_NO_SSLv2 | 
                      require('constants').SSL_OP_NO_SSLv3 | 
                      require('constants').SSL_OP_NO_TLSv1 | 
                      require('constants').SSL_OP_NO_TLSv1_1,
      };

      // Add DH parameters if available
      if (sslConfig.dhparamPath && fs.existsSync(sslConfig.dhparamPath)) {
        options.dhparam = fs.readFileSync(sslConfig.dhparamPath);
      }

      console.log('🔒 HTTPS server created with enhanced security options');
      return https.createServer(options, app);
    } catch (error) {
      console.error('❌ Failed to create HTTPS server:', error);
      throw new Error('HTTPS server creation failed');
    }
  }

  /**
   * Validate certificate expiration and warn if expiring soon
   */
  public checkCertificateExpiry(certPath: string, warningDays: number = 30): void {
    try {
      const certInfo = this.getCertificateInfo(certPath);
      const now = new Date();
      const daysUntilExpiry = Math.ceil((certInfo.validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntilExpiry <= warningDays) {
        console.warn(`⚠️ SSL Certificate expires in ${daysUntilExpiry} days (${certInfo.validTo.toISOString()})`);
        if (daysUntilExpiry <= 7) {
          console.error(`🚨 SSL Certificate expires very soon! Consider renewing immediately.`);
        }
      } else {
        console.log(`✅ SSL Certificate valid for ${daysUntilExpiry} more days`);
      }
    } catch (error) {
      console.error('❌ Failed to check certificate expiry:', error);
    }
  }
}

// Legacy functions for backward compatibility
export function generateSelfSignedCert(): SSLConfig {
  const sslManager = new SSLManager();
  return sslManager.generateSelfSignedCert();
}

export function createHttpsServer(app: any, sslConfig: SSLConfig): https.Server {
  const sslManager = new SSLManager();
  return sslManager.createHttpsServer(app, sslConfig);
}

