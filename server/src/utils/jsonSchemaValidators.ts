import { z } from 'zod';
import { PATTERNS } from './validators';

/**
 * Enhanced JSON Schema validators for complex payloads
 */

// Base schemas for common patterns
export const baseSchemas = {
  objectId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId format'),
  
  timestamp: z.date().or(z.string().datetime()).transform((val) => new Date(val)),
  
  currency: z.enum(['USD', 'EUR', 'GBP', 'ZAR', 'JPY', 'CNY', 'AUD']),
  
  amount: z
    .string()
    .regex(PATTERNS.amount, 'Invalid amount format')
    .transform((val) => parseFloat(val))
    .refine((val) => val > 0, 'Amount must be greater than $0'),

  
  email: z
    .string()
    .email('Invalid email format')
    .max(254, 'Email too long'),
  
  phone: z
    .string()
    .regex(/^[\+]?[\d\s\-\(\)]{7,20}$/, 'Invalid phone number format'),
  
  url: z
    .string()
    .url('Invalid URL format')
    .refine((url) => {
      try {
        const parsed = new URL(url);
        return ['http:', 'https:'].includes(parsed.protocol);
      } catch {
        return false;
      }
    }, 'Only HTTP and HTTPS URLs are allowed'),
  
  ipAddress: z
    .string()
    .refine((ip) => {
      const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
      const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
      return ipv4Regex.test(ip) || ipv6Regex.test(ip);
    }, 'Invalid IP address format'),
};

// Complex transaction schema
export const complexTransactionSchema = z.object({
  // Basic transaction info
  customerId: baseSchemas.objectId,
  amount: baseSchemas.amount,
  currency: baseSchemas.currency,
  
  // Payment details
  paymentMethod: z.enum(['SWIFT', 'SEPA', 'ACH', 'WIRE']),
  
  // Payee information
  payeeInfo: z.object({
    name: z
      .string()
      .min(2, 'Payee name must be at least 2 characters')
      .max(100, 'Payee name too long')
      .regex(PATTERNS.fullName, 'Invalid payee name format'),
    
    accountNumber: z
      .string()
      .regex(PATTERNS.accountNumber, 'Invalid account number format'),
    
    bankCode: z
      .string()
      .regex(PATTERNS.swiftCode, 'Invalid bank code format'),
    
    address: z.object({
      street: z.string().min(5).max(100),
      city: z.string().min(2).max(50),
      country: z.string().length(2, 'Country code must be 2 characters'),
      postalCode: z.string().regex(/^[A-Z0-9\s\-]{3,10}$/, 'Invalid postal code'),
    }).optional(),
    
    contact: z.object({
      email: baseSchemas.email.optional(),
      phone: baseSchemas.phone.optional(),
    }).optional(),
  }),
  
  // Transaction metadata
  metadata: z.object({
    reference: z.string().max(50).optional(),
    description: z.string().max(200).optional(),
    tags: z.array(z.string().max(20)).max(10).optional(),
    source: z.enum(['web', 'mobile', 'api', 'admin']).default('web'),
    userAgent: z.string().max(500).optional(),
    ipAddress: baseSchemas.ipAddress.optional(),
  }).optional(),
  
  // Compliance fields
  compliance: z.object({
    purpose: z.enum(['business', 'personal', 'investment', 'other']),
    declaration: z.boolean().refine((val) => val === true, 'Compliance declaration required'),
    riskLevel: z.enum(['low', 'medium', 'high']).default('medium'),
  }),
  
  // Timestamps
  createdAt: baseSchemas.timestamp.optional(),
  updatedAt: baseSchemas.timestamp.optional(),
});

// Bulk transaction schema
export const bulkTransactionSchema = z.object({
  transactions: z
    .array(complexTransactionSchema)
    .min(1, 'At least one transaction required')
    .max(100, 'Maximum 100 transactions per batch'),
  
  batchInfo: z.object({
    reference: z.string().max(50),
    description: z.string().max(200).optional(),
    priority: z.enum(['low', 'normal', 'high']).default('normal'),
  }),
});

// User profile update schema
export const userProfileUpdateSchema = z.object({
  personalInfo: z.object({
    fullName: z
      .string()
      .regex(PATTERNS.fullName, 'Invalid name format')
      .optional(),
    
    email: baseSchemas.email.optional(),
    
    phone: baseSchemas.phone.optional(),
    
    address: z.object({
      street: z.string().min(5).max(100),
      city: z.string().min(2).max(50),
      state: z.string().min(2).max(50),
      country: z.string().length(2),
      postalCode: z.string().regex(/^[A-Z0-9\s\-]{3,10}$/),
    }).optional(),
    
    dateOfBirth: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
      .refine((date) => {
        const birthDate = new Date(date);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        return age >= 18 && age <= 120;
      }, 'Must be between 18 and 120 years old')
      .optional(),
  }).optional(),
  
  preferences: z.object({
    language: z.enum(['en', 'es', 'fr', 'de']).default('en'),
    timezone: z.string().max(50).default('UTC'),
    notifications: z.object({
      email: z.boolean().default(true),
      sms: z.boolean().default(false),
      push: z.boolean().default(true),
    }).optional(),
  }).optional(),
  
  security: z.object({
    twoFactorEnabled: z.boolean().optional(),
    passwordChangeRequired: z.boolean().optional(),
    lastPasswordChange: baseSchemas.timestamp.optional(),
  }).optional(),
});

// Search and filter schemas
export const searchFilterSchema = z.object({
  query: z.string().max(100).optional(),
  
  filters: z.object({
    dateRange: z.object({
      from: baseSchemas.timestamp,
      to: baseSchemas.timestamp,
    }).refine((range) => range.from <= range.to, 'From date must be before to date').optional(),
    
    amountRange: z.object({
      min: z.number().min(0).optional(),
      max: z.number().min(0).optional(),
    }).refine((range) => 
      !range.min || !range.max || range.min <= range.max, 
      'Min amount must be less than max amount'
    ).optional(),
    
    currency: baseSchemas.currency.optional(),
    
    status: z.array(z.enum(['pending', 'verified', 'submitted', 'completed', 'failed'])).optional(),
    
    tags: z.array(z.string().max(20)).optional(),
  }).optional(),
  
  pagination: z.object({
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(20),
    sortBy: z.string().max(50).optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }).optional(),
});

// API request validation schema
export const apiRequestSchema = z.object({
  headers: z.object({
    'content-type': z.string().optional(),
    'user-agent': z.string().max(500).optional(),
    'x-request-id': z.string().uuid().optional(),
    'x-api-key': z.string().max(100).optional(),
  }).optional(),
  
  body: z.any().optional(),
  
  query: z.record(z.string(), z.string()).optional(),
  
  params: z.record(z.string(), z.string()).optional(),
});

// File upload schema
export const fileUploadSchema = z.object({
  filename: z.string().max(255).regex(/^[a-zA-Z0-9._-]+$/, 'Invalid filename'),
  
  mimetype: z.enum([
    'application/pdf',
    'image/jpeg',
    'image/png',
    'text/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ]),
  
  size: z.number().int().min(1).max(10 * 1024 * 1024), // 10MB max
  
  category: z.enum(['document', 'receipt', 'statement', 'other']),
  
  metadata: z.object({
    description: z.string().max(200).optional(),
    tags: z.array(z.string().max(20)).max(5).optional(),
  }).optional(),
});

// Notification schema
export const notificationSchema = z.object({
  type: z.enum(['transaction', 'security', 'system', 'marketing']),
  
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  
  channels: z.array(z.enum(['email', 'sms', 'push', 'in-app'])).min(1),
  
  content: z.object({
    subject: z.string().max(100),
    body: z.string().max(1000),
    actionUrl: baseSchemas.url.optional(),
    actionText: z.string().max(50).optional(),
  }),
  
  recipients: z.array(z.union([
    baseSchemas.objectId, // User ID
    baseSchemas.email,    // Email address
  ])).min(1),
  
  scheduledFor: baseSchemas.timestamp.optional(),
  
  expiresAt: baseSchemas.timestamp.optional(),
});

// Audit log schema
export const auditLogSchema = z.object({
  userId: baseSchemas.objectId.optional(),
  
  action: z.enum([
    'login', 'logout', 'register', 'password_change',
    'transaction_create', 'transaction_update', 'transaction_delete',
    'profile_update', 'security_settings_change',
  ]),
  
  resource: z.string().max(100).optional(),
  
  resourceId: baseSchemas.objectId.optional(),
  
  details: z.record(z.string(), z.any()).optional(),
  
  ipAddress: baseSchemas.ipAddress.optional(),
  
  userAgent: z.string().max(500).optional(),
  
  timestamp: baseSchemas.timestamp.default(() => new Date()),
  
  success: z.boolean().default(true),
  
  errorMessage: z.string().max(500).optional(),
});

// Export all schemas
export const jsonSchemas = {
  baseSchemas,
  complexTransaction: complexTransactionSchema,
  bulkTransaction: bulkTransactionSchema,
  userProfileUpdate: userProfileUpdateSchema,
  searchFilter: searchFilterSchema,
  apiRequest: apiRequestSchema,
  fileUpload: fileUploadSchema,
  notification: notificationSchema,
  auditLog: auditLogSchema,
};

// Utility functions for schema validation
export class SchemaValidator {
  /**
   * Validate data against a schema with detailed error reporting
   */
  static validate<T>(schema: z.ZodSchema<T>, data: unknown): {
    success: boolean;
    data?: T;
    errors?: z.ZodError;
  } {
    try {
      const result = schema.safeParse(data);
      if (result.success) {
        return { success: true, data: result.data };
      } else {
        return { success: false, errors: result.error };
      }
    } catch (error) {
      return {
        success: false,
        errors: new z.ZodError([{
          code: 'custom',
          message: 'Validation failed',
          path: [],
        }])
      };
    }
  }
  
  /**
   * Sanitize and validate data
   */
  static sanitizeAndValidate<T>(schema: z.ZodSchema<T>, data: unknown): {
    success: boolean;
    data?: T;
    errors?: z.ZodError;
  } {
    // Basic sanitization before validation
    const sanitized = typeof data === 'string' ? data.trim() : data;
    return this.validate(schema, sanitized);
  }
  
  /**
   * Validate array of data
   */
  static validateArray<T>(schema: z.ZodSchema<T>, dataArray: unknown[]): {
    success: boolean;
    data?: T[];
    errors?: z.ZodError[];
  } {
    const results = dataArray.map(item => this.validate(schema, item));
    const errors = results.filter(r => !r.success).map(r => r.errors!);
    
    if (errors.length > 0) {
      return { success: false, errors };
    }
    
    const validData = results.map(r => r.data!);
    return { success: true, data: validData };
  }
}

export default jsonSchemas;
