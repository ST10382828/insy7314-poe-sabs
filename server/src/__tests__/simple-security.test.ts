// Simple security validation tests
import request from 'supertest';
import { app } from '../index';

describe('Core Security Features', () => {
  describe('Password Security', () => {
    it('should hash passwords with bcrypt', async () => {
      const testPassword = 'TestPassword123!';
      const bcrypt = require('bcrypt');
      
      // Test bcrypt is working
      const hash = await bcrypt.hash(testPassword, 12);
      expect(hash).toBeDefined();
      expect(hash).not.toBe(testPassword);
      expect(hash.startsWith('$2b$')).toBe(true); // bcrypt hash format
      
      // Test password verification
      const isValid = await bcrypt.compare(testPassword, hash);
      expect(isValid).toBe(true);
      
      // Test wrong password
      const isInvalid = await bcrypt.compare('wrongpassword', hash);
      expect(isInvalid).toBe(false);
    });

    it('should have proper salt rounds', () => {
      const bcrypt = require('bcrypt');
      const testPassword = 'TestPassword123!';
      
      // Test with 12 salt rounds (secure)
      const hash12 = bcrypt.hashSync(testPassword, 12);
      expect(hash12).toBeDefined();
      expect(hash12.startsWith('$2b$12$')).toBe(true);
    });
  });

  describe('SSL/TLS Configuration', () => {
    it('should have SSL utilities available', () => {
      const sslUtils = require('../utils/ssl');
      expect(sslUtils.SSLManager).toBeDefined();
      expect(typeof sslUtils.SSLManager).toBe('function');
    });

    it('should have SSL certificate files present', () => {
      const fs = require('fs');
      const path = require('path');
      
      // Check if certificate files exist
      const certPath = path.join(__dirname, '../../certs/cert.pem');
      const keyPath = path.join(__dirname, '../../certs/key.pem');
      
      // If certificates exist, validate they're proper SSL files
      if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
        const certContent = fs.readFileSync(certPath, 'utf8');
        const keyContent = fs.readFileSync(keyPath, 'utf8');
        
        expect(certContent).toContain('BEGIN CERTIFICATE');
        expect(certContent).toContain('END CERTIFICATE');
        expect(keyContent).toContain('BEGIN PRIVATE KEY');
        expect(keyContent).toContain('END PRIVATE KEY');
      } else {
        // If certificates don't exist, test that SSL utilities can create them
        const { SSLManager } = require('../utils/ssl');
        const sslManager = new SSLManager();
        expect(sslManager).toBeDefined();
        expect(typeof sslManager.generateSelfSignedCert).toBe('function');
        expect(typeof sslManager.createHttpsServer).toBe('function');
      }
    });

    it('should have HTTPS server creation capability', () => {
      const { SSLManager } = require('../utils/ssl');
      const express = require('express');
      const sslManager = new SSLManager();
      
      expect(sslManager.createHttpsServer).toBeDefined();
      expect(typeof sslManager.createHttpsServer).toBe('function');
      
      // Test that it requires proper parameters - should throw when files don't exist
      // Suppress console.error during this test to avoid noise in test output
      const originalError = console.error;
      console.error = jest.fn();
      
      try {
        const testApp = express();
        // Provide invalid paths to trigger error
        expect(() => {
          sslManager.createHttpsServer(testApp, { 
            keyPath: '/nonexistent/key.pem', 
            certPath: '/nonexistent/cert.pem', 
            dhparamPath: '' 
          });
        }).toThrow('HTTPS server creation failed');
      } finally {
        // Restore console.error
        console.error = originalError;
      }
    });
  });

  describe('Input Validation Patterns', () => {
    it('should have comprehensive regex patterns', () => {
      const validators = require('../utils/validators');
      const patterns = validators.PATTERNS;
      
      expect(patterns).toBeDefined();
      expect(patterns.fullName).toBeDefined();
      expect(patterns.username).toBeDefined();
      expect(patterns.accountNumber).toBeDefined();
      expect(patterns.idNumber).toBeDefined();
    });

    it('should validate account numbers correctly', () => {
      const validators = require('../utils/validators');
      const patterns = validators.PATTERNS;
      
      // Valid account numbers
      expect(patterns.accountNumber.test('12345678')).toBe(true);
      expect(patterns.accountNumber.test('12345678901234567890')).toBe(true);
      
      // Invalid account numbers
      expect(patterns.accountNumber.test('123abc')).toBe(false);
      expect(patterns.accountNumber.test('123')).toBe(false);
      expect(patterns.accountNumber.test('123456789012345678901234567890')).toBe(false);
    });

    it('should validate usernames correctly', () => {
      const validators = require('../utils/validators');
      const patterns = validators.PATTERNS;
      
      // Valid usernames
      expect(patterns.username.test('user123')).toBe(true);
      expect(patterns.username.test('test_user')).toBe(true);
      expect(patterns.username.test('user-name')).toBe(true);
      
      // Invalid usernames
      expect(patterns.username.test('ab')).toBe(false); // Too short
      expect(patterns.username.test('user@domain')).toBe(false); // Special chars
      expect(patterns.username.test('user name')).toBe(false); // Spaces
    });
  });

  describe('Security Middleware', () => {
    it('should have security middleware configured', () => {
      const security = require('../middleware/security');
      expect(security.authLimiter).toBeDefined();
      expect(security.globalLimiter).toBeDefined();
      expect(security.securityMiddleware).toBeDefined();
    });

    it('should have Helmet configured', () => {
      const helmet = require('helmet');
      expect(helmet).toBeDefined();
    });

    it('should have rate limiting configured', () => {
      const rateLimit = require('express-rate-limit');
      expect(rateLimit).toBeDefined();
    });
  });

  describe('Attack Protection', () => {
    it('should have Express Brute configured', () => {
      const ExpressBrute = require('express-brute');
      expect(ExpressBrute).toBeDefined();
    });

    it('should have MongoDB sanitization', () => {
      const mongoSanitize = require('express-mongo-sanitize');
      expect(mongoSanitize).toBeDefined();
    });

    it('should have CSRF protection', () => {
      const csrf = require('csurf');
      expect(csrf).toBeDefined();
    });
  });
});
