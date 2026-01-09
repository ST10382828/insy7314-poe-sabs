import DOMPurify from 'dompurify';

/**
 * Sanitization utilities for preventing XSS attacks
 */

// Configure DOMPurify for maximum security
const sanitizer = DOMPurify.sanitize;

// Custom configuration for different contexts
const sanitizeConfig = {
  ALLOWED_TAGS: [], // No HTML tags allowed by default
  ALLOWED_ATTR: [], // No attributes allowed by default
  ALLOW_DATA_ATTR: false,
  ALLOW_UNKNOWN_PROTOCOLS: false,
  SANITIZE_DOM: true,
  KEEP_CONTENT: true,
  RETURN_DOM: false,
  RETURN_DOM_FRAGMENT: false,
  RETURN_DOM_IMPORT: false,
  SANITIZE_NAMED_PROPS: true,
  FORCE_BODY: false,
  ADD_ATTR: [],
  FORBID_ATTR: [],
  FORBID_TAGS: [],
  FORBID_CONTENTS: [],
  ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  ADD_TAGS: [],
  ADD_ATTR: [],
  WHOLE_DOCUMENT: false,
  ALLOW_UNKNOWN_PROTOCOLS: false,
  RETURN_TRUSTED_TYPE: false,
};

// Allow specific tags for rich text content (use with caution)
const richTextConfig = {
  ...sanitizeConfig,
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'span'],
  ALLOWED_ATTR: ['class'],
};

/**
 * Sanitize HTML content for maximum security
 */
export function sanitizeHtml(html: string): string {
  return sanitizer(html, sanitizeConfig);
}

/**
 * Sanitize HTML content for rich text (allows limited formatting)
 */
export function sanitizeRichText(html: string): string {
  return sanitizer(html, richTextConfig);
}

/**
 * Sanitize plain text (removes all HTML)
 */
export function sanitizeText(text: string): string {
  return sanitizer(text, { ...sanitizeConfig, KEEP_CONTENT: true });
}

/**
 * Sanitize URL to prevent javascript: and data: URLs
 */
export function sanitizeUrl(url: string): string {
  const cleanUrl = sanitizer(url, {
    ALLOWED_URI_REGEXP: /^(?:(?:https?|ftp|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
  
  // Additional validation for URLs
  if (!cleanUrl || cleanUrl.startsWith('javascript:') || cleanUrl.startsWith('data:')) {
    return '';
  }
  
  return cleanUrl;
}

/**
 * Sanitize JSON data recursively
 */
export function sanitizeJson<T>(data: T): T {
  if (typeof data === 'string') {
    return sanitizeText(data) as T;
  }
  
  if (Array.isArray(data)) {
    return data.map(item => sanitizeJson(item)) as T;
  }
  
  if (data && typeof data === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      const sanitizedKey = sanitizeText(key);
      sanitized[sanitizedKey] = sanitizeJson(value);
    }
    return sanitized as T;
  }
  
  return data;
}

/**
 * Sanitize form data
 */
export function sanitizeFormData(formData: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(formData)) {
    const sanitizedKey = sanitizeText(key);
    
    if (typeof value === 'string') {
      sanitized[sanitizedKey] = sanitizeText(value);
    } else if (Array.isArray(value)) {
      sanitized[sanitizedKey] = value.map(item => 
        typeof item === 'string' ? sanitizeText(item) : item
      );
    } else if (value && typeof value === 'object') {
      sanitized[sanitizedKey] = sanitizeJson(value);
    } else {
      sanitized[sanitizedKey] = value;
    }
  }
  
  return sanitized;
}

/**
 * Sanitize user input for display
 */
export function sanitizeUserInput(input: string): string {
  // Remove potentially dangerous characters
  let sanitized = input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .replace(/data:/gi, '') // Remove data: protocol
    .trim();
  
  // Apply DOMPurify sanitization
  sanitized = sanitizeText(sanitized);
  
  return sanitized;
}

/**
 * Validate and sanitize email address
 */
export function sanitizeEmail(email: string): string {
  const sanitized = sanitizeText(email.toLowerCase().trim());
  
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(sanitized)) {
    throw new Error('Invalid email format');
  }
  
  return sanitized;
}

/**
 * Validate and sanitize phone number
 */
export function sanitizePhoneNumber(phone: string): string {
  const sanitized = sanitizeText(phone.replace(/[^\d+\-\(\)\s]/g, ''));
  
  // Basic phone validation (adjust regex as needed)
  const phoneRegex = /^[\+]?[\d\s\-\(\)]{7,20}$/;
  if (!phoneRegex.test(sanitized)) {
    throw new Error('Invalid phone number format');
  }
  
  return sanitized;
}

/**
 * Create a safe HTML string for trusted content
 */
export function createSafeHtml(html: string): string {
  return sanitizeHtml(html);
}

/**
 * Check if a string contains potentially dangerous content
 */
export function isPotentiallyDangerous(content: string): boolean {
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /data:/i,
    /vbscript:/i,
    /on\w+\s*=/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /<link/i,
    /<meta/i,
    /<style/i,
    /expression\s*\(/i,
    /url\s*\(/i,
  ];
  
  return dangerousPatterns.some(pattern => pattern.test(content));
}

/**
 * Sanitize content for different contexts
 */
export class ContentSanitizer {
  /**
   * Sanitize for plain text display
   */
  static forDisplay(content: string): string {
    return sanitizeText(content);
  }
  
  /**
   * Sanitize for rich text display
   */
  static forRichDisplay(content: string): string {
    return sanitizeRichText(content);
  }
  
  /**
   * Sanitize for form input
   */
  static forFormInput(content: string): string {
    return sanitizeUserInput(content);
  }
  
  /**
   * Sanitize for URL
   */
  static forUrl(content: string): string {
    return sanitizeUrl(content);
  }
  
  /**
   * Sanitize for JSON storage
   */
  static forStorage<T>(data: T): T {
    return sanitizeJson(data);
  }
}

// Export DOMPurify instance for advanced usage
export { DOMPurify };

// Export sanitization functions
export default {
  sanitizeHtml,
  sanitizeRichText,
  sanitizeText,
  sanitizeUrl,
  sanitizeJson,
  sanitizeFormData,
  sanitizeUserInput,
  sanitizeEmail,
  sanitizePhoneNumber,
  createSafeHtml,
  isPotentiallyDangerous,
  ContentSanitizer,
};
