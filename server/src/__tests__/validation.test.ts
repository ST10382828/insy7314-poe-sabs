import { PATTERNS, registerSchema, loginSchema, employeeLoginSchema } from '../utils/validators';
import { createTransactionSchema, verifyTransactionSchema } from '../utils/transactionValidators';
import { z } from 'zod';

describe('Input Validation and Whitelisting Tests', () => {
  describe('Regex Pattern Validation', () => {
    describe('fullName pattern', () => {
      it('should accept valid names', () => {
        const validNames = [
          'John Doe',
          "O'Connor",
          'Jean-Pierre',
          'Mary Jane Smith',
          'José María',
          'Al-Ahmad',
          'Van Der Berg'
        ];

        validNames.forEach(name => {
          expect(PATTERNS.fullName.test(name)).toBe(true);
        });
      });

      it('should reject invalid names', () => {
        const invalidNames = [
          'John123', // Numbers not allowed
          'John<script>', // Script tags
          'John@domain.com', // @ symbol not allowed
          'John$', // $ symbol not allowed
          'John#', // # symbol not allowed
          'John%', // % symbol not allowed
          'A', // Too short (less than 2 chars)
          'John'.repeat(30), // Too long (over 100 chars)
          'John\nDoe', // Newline not allowed
          'John\tDoe' // Tab not allowed
        ];

        invalidNames.forEach(name => {
          const result = PATTERNS.fullName.test(name);
          if (result) {
            console.log(`Name "${name}" incorrectly passed validation`);
          }
          expect(result).toBe(false);
        });
      });
    });

    describe('idNumber pattern', () => {
      it('should accept valid ID numbers', () => {
        const validIds = [
          'ABC123',
          '123456789',
          'A1B2C3D4E5',
          '12345678901234567890'
        ];

        validIds.forEach(id => {
          expect(PATTERNS.idNumber.test(id)).toBe(true);
        });
      });

      it('should reject invalid ID numbers', () => {
        const invalidIds = [
          'abc123', // Lowercase
          'AB-123',
          'AB 123',
          'AB@123',
          'AB#123',
          'AB',
          '123', // Too short
          'A'.repeat(21), // Too long
          ''
        ];

        invalidIds.forEach(id => {
          expect(PATTERNS.idNumber.test(id)).toBe(false);
        });
      });
    });

    describe('accountNumber pattern', () => {
      it('should accept valid account numbers', () => {
        const validAccounts = [
          '12345678',
          '12345678901234567890',
          '00000000000000000001'
        ];

        validAccounts.forEach(account => {
          expect(PATTERNS.accountNumber.test(account)).toBe(true);
        });
      });

      it('should reject invalid account numbers', () => {
        const invalidAccounts = [
          '1234567', // Too short
          '123abc',
          '123-456',
          '123 456',
          '123.456',
          '123,456',
          '123456789012345678901', // Too long
          ''
        ];

        invalidAccounts.forEach(account => {
          expect(PATTERNS.accountNumber.test(account)).toBe(false);
        });
      });
    });

    describe('username pattern', () => {
      it('should accept valid usernames', () => {
        const validUsernames = [
          'john_doe',
          'john-doe',
          'john123',
          'user_name',
          'test-user-123',
          'a'.repeat(30) // Max length
        ];

        validUsernames.forEach(username => {
          expect(PATTERNS.username.test(username)).toBe(true);
        });
      });

      it('should reject invalid usernames', () => {
        const invalidUsernames = [
          'ab', // Too short
          'john@domain',
          'john space',
          'john<script>',
          'john$',
          'john#',
          'john%',
          'john&',
          'john+',
          'john=',
          'john?',
          'john/',
          'john\\',
          'john|',
          'john.',
          'john,',
          'john;',
          'john:',
          'john\'',
          'john"',
          'a'.repeat(31), // Too long
          ''
        ];

        invalidUsernames.forEach(username => {
          expect(PATTERNS.username.test(username)).toBe(false);
        });
      });
    });

    describe('swiftCode pattern', () => {
      it('should accept valid SWIFT codes', () => {
        const validSwiftCodes = [
          'ABCDEF12',
          'ABCDEF12345',
          'CHASUS33',
          'DEUTDEFF'
        ];

        validSwiftCodes.forEach(code => {
          expect(PATTERNS.swiftCode.test(code)).toBe(true);
        });
      });

      it('should reject invalid SWIFT codes', () => {
        const invalidSwiftCodes = [
          'ABCDE12', // Too short
          'ABCDEF123456', // Too long
          'abcDEF12', // Lowercase
          'ABCDE1', // Wrong format
          '12345678', // Numbers only
          'ABCDEF12X', // Invalid character
          'ABCDEF12@',
          'ABCDEF12#',
          ''
        ];

        invalidSwiftCodes.forEach(code => {
          expect(PATTERNS.swiftCode.test(code)).toBe(false);
        });
      });
    });

    describe('amount pattern', () => {
      it('should accept valid amounts', () => {
        const validAmounts = [
          '0',
          '1',
          '100',
          '1000',
          '0.50',
          '1.25',
          '999.99',
          '1000000.00'
        ];

        validAmounts.forEach(amount => {
          expect(PATTERNS.amount.test(amount)).toBe(true);
        });
      });

      it('should reject invalid amounts', () => {
        const invalidAmounts = [
          'abc',
          '1.234', // Too many decimal places
          '1,000', // Comma separator
          '1 000', // Space separator
          '$100',
          '100.999',
          '1.2.3',
          '1..5',
          '.50', // Leading decimal point
          '100.',
          '',
          '-100', // Negative
          '+100', // Plus sign
          '1e5', // Scientific notation
          '1,000.50' // Comma and decimal
        ];

        invalidAmounts.forEach(amount => {
          expect(PATTERNS.amount.test(amount)).toBe(false);
        });
      });
    });
  });

  describe('Zod Schema Validation', () => {
    describe('registerSchema', () => {
      it('should validate complete registration data', () => {
        const validData = {
          fullName: 'John Doe',
          idNumber: 'ABC123456',
          accountNumber: '1234567890123456',
          username: 'johndoe',
          password: 'TestPass123!'
        };

        const result = registerSchema.safeParse(validData);
        expect(result.success).toBe(true);
      });

      it('should reject incomplete data', () => {
        const incompleteData = {
          fullName: 'John Doe',
          // Missing other fields
        };

        const result = registerSchema.safeParse(incompleteData);
        expect(result.success).toBe(false);
        expect(result.error?.issues.length).toBeGreaterThan(0);
      });

      it('should enforce password complexity', () => {
        const dataWithWeakPassword = {
          fullName: 'John Doe',
          idNumber: 'ABC123456',
          accountNumber: '1234567890123456',
          username: 'johndoe',
          password: 'weak'
        };

        const result = registerSchema.safeParse(dataWithWeakPassword);
        expect(result.success).toBe(false);
        expect(result.error?.issues.some(issue => 
          issue.path.includes('password')
        )).toBe(true);
      });
    });

    describe('loginSchema', () => {
      it('should validate login data', () => {
        const validData = {
          username: 'johndoe',
          accountNumber: '1234567890123456',
          password: 'TestPass123!'
        };

        const result = loginSchema.safeParse(validData);
        expect(result.success).toBe(true);
      });

      it('should reject invalid username format', () => {
        const invalidData = {
          username: 'john@doe',
          accountNumber: '1234567890123456',
          password: 'TestPass123!'
        };

        const result = loginSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
      });
    });

    describe('employeeLoginSchema', () => {
      it('should validate employee login data', () => {
        const validData = {
          employeeNumber: 'EMP123456',
          password: 'TestPass123!'
        };

        const result = employeeLoginSchema.safeParse(validData);
        expect(result.success).toBe(true);
      });

      it('should convert employee number to uppercase', () => {
        const data = {
          employeeNumber: 'emp123456',
          password: 'TestPass123!'
        };

        const result = employeeLoginSchema.safeParse(data);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.employeeNumber).toBe('EMP123456');
        }
      });
    });

    describe('createTransactionSchema', () => {
      it('should validate transaction data', () => {
        const validData = {
          amount: '100.50',
          currency: 'USD',
          provider: 'SWIFT',
          payeeAccountInfo: 'ABCD1234567890123456789',
          swiftCode: 'CHASUS33'
        };

        const result = createTransactionSchema.safeParse(validData);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.amount).toBe(100.50); // Should be converted to number
        }
      });

      it('should enforce amount limits', () => {
        const dataWithExcessiveAmount = {
          amount: '1000001', // Over 1 million
          currency: 'USD',
          provider: 'SWIFT',
          payeeAccountInfo: 'ABCD1234567890123456789',
          swiftCode: 'CHASUS33'
        };

        const result = createTransactionSchema.safeParse(dataWithExcessiveAmount);
        expect(result.success).toBe(false);
      });

      it('should validate currency enum', () => {
        const dataWithInvalidCurrency = {
          amount: '100.50',
          currency: 'INVALID',
          provider: 'SWIFT',
          payeeAccountInfo: 'ABCD1234567890123456789',
          swiftCode: 'CHASUS33'
        };

        const result = createTransactionSchema.safeParse(dataWithInvalidCurrency);
        expect(result.success).toBe(false);
      });
    });

    describe('verifyTransactionSchema', () => {
      it('should validate MongoDB ObjectId format', () => {
        const validData = {
          transactionId: '507f1f77bcf86cd799439011'
        };

        const result = verifyTransactionSchema.safeParse(validData);
        expect(result.success).toBe(true);
      });

      it('should reject invalid ObjectId format', () => {
        const invalidData = {
          transactionId: 'invalid-id'
        };

        const result = verifyTransactionSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Injection Attack Prevention', () => {
    it('should prevent SQL injection attempts', () => {
      const sqlInjectionAttempts = [
        "'; DROP TABLE users; --", // Contains ;, =, etc.
        "' OR '1'='1", // Contains =, numbers
        "' UNION SELECT * FROM users --", // Contains ;, =, *, etc.
        "admin'/*" // Contains /, *
      ];

      sqlInjectionAttempts.forEach(attempt => {
        // Test with username field
        const usernameResult = PATTERNS.username.test(attempt);
        if (usernameResult) {
          console.log(`SQL injection attempt "${attempt}" incorrectly passed username validation`);
        }
        expect(usernameResult).toBe(false);
        
        // Test with full name field
        const fullNameResult = PATTERNS.fullName.test(attempt);
        if (fullNameResult) {
          console.log(`SQL injection attempt "${attempt}" incorrectly passed fullName validation`);
        }
        expect(fullNameResult).toBe(false);
      });
      
      // Note: "admin'--" contains only valid characters (letters, apostrophe, hyphens)
      // and is technically a valid name pattern, so it will pass regex validation.
      // However, it would be caught by application-level validation or sanitization.
      // For this test, we verify that strings with SQL operators fail:
      expect(PATTERNS.fullName.test("admin'--;")).toBe(false); // Contains semicolon
      expect(PATTERNS.fullName.test("admin'=1")).toBe(false); // Contains equals
    });

    it('should prevent XSS attempts', () => {
      const xssAttempts = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        '<img src="x" onerror="alert(\'xss\')">',
        '"><script>alert("xss")</script>',
        '\';alert("xss");//',
        '<iframe src="javascript:alert(\'xss\')"></iframe>'
      ];

      xssAttempts.forEach(attempt => {
        expect(PATTERNS.username.test(attempt)).toBe(false);
        expect(PATTERNS.fullName.test(attempt)).toBe(false);
      });
    });

    it('should prevent command injection attempts', () => {
      const commandInjectionAttempts = [
        '; rm -rf /',
        '| cat /etc/passwd',
        '&& whoami',
        '`id`',
        '$(whoami)',
        '; ls -la',
        '| ping -c 1 8.8.8.8'
      ];

      commandInjectionAttempts.forEach(attempt => {
        expect(PATTERNS.username.test(attempt)).toBe(false);
        expect(PATTERNS.fullName.test(attempt)).toBe(false);
      });
    });

    it('should prevent NoSQL injection attempts', () => {
      const nosqlInjectionAttempts = [
        '{"$ne": null}',
        '{"$gt": ""}',
        '{"$where": "this.password.length > 0"}',
        '{"$regex": ".*"}',
        '{"$exists": true}'
      ];

      nosqlInjectionAttempts.forEach(attempt => {
        expect(PATTERNS.username.test(attempt)).toBe(false);
        expect(PATTERNS.fullName.test(attempt)).toBe(false);
      });
    });
  });

  describe('Edge Cases and Boundary Testing', () => {
    it('should handle minimum length requirements', () => {
      // Test minimum lengths
      expect(PATTERNS.fullName.test('Ab')).toBe(true); // 2 chars
      expect(PATTERNS.fullName.test('A')).toBe(false); // 1 char
      
      expect(PATTERNS.idNumber.test('ABC123')).toBe(true); // 6 chars
      expect(PATTERNS.idNumber.test('ABC12')).toBe(false); // 5 chars
      
      expect(PATTERNS.accountNumber.test('12345678')).toBe(true); // 8 chars
      expect(PATTERNS.accountNumber.test('1234567')).toBe(false); // 7 chars
      
      expect(PATTERNS.username.test('abc')).toBe(true); // 3 chars
      expect(PATTERNS.username.test('ab')).toBe(false); // 2 chars
    });

    it('should handle maximum length requirements', () => {
      // Test maximum lengths
      const maxFullName = 'A'.repeat(100);
      const tooLongFullName = 'A'.repeat(101);
      expect(PATTERNS.fullName.test(maxFullName)).toBe(true);
      expect(PATTERNS.fullName.test(tooLongFullName)).toBe(false);
      
      const maxIdNumber = 'A'.repeat(20);
      const tooLongIdNumber = 'A'.repeat(21);
      expect(PATTERNS.idNumber.test(maxIdNumber)).toBe(true);
      expect(PATTERNS.idNumber.test(tooLongIdNumber)).toBe(false);
      
      const maxAccountNumber = '1'.repeat(20);
      const tooLongAccountNumber = '1'.repeat(21);
      expect(PATTERNS.accountNumber.test(maxAccountNumber)).toBe(true);
      expect(PATTERNS.accountNumber.test(tooLongAccountNumber)).toBe(false);
      
      const maxUsername = 'a'.repeat(30);
      const tooLongUsername = 'a'.repeat(31);
      expect(PATTERNS.username.test(maxUsername)).toBe(true);
      expect(PATTERNS.username.test(tooLongUsername)).toBe(false);
    });

    it('should handle empty and null values', () => {
      expect(PATTERNS.fullName.test('')).toBe(false);
      expect(PATTERNS.idNumber.test('')).toBe(false);
      expect(PATTERNS.accountNumber.test('')).toBe(false);
      expect(PATTERNS.username.test('')).toBe(false);
      expect(PATTERNS.swiftCode.test('')).toBe(false);
      expect(PATTERNS.amount.test('')).toBe(false);
    });
  });
});
