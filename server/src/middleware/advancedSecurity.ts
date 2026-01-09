import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { ENV } from '../config/env';
import { auditLogSchema } from '../utils/jsonSchemaValidators';
import { z } from 'zod';

// Security event types
export type SecurityEventType = 
  | 'login_attempt'
  | 'login_success'
  | 'login_failure'
  | 'account_locked'
  | 'suspicious_activity'
  | 'rate_limit_exceeded'
  | 'honeypot_triggered'
  | 'invalid_input'
  | 'csrf_violation'
  | 'unauthorized_access';

// Security event interface
export interface SecurityEvent {
  type: SecurityEventType;
  userId?: string;
  ipAddress: string;
  userAgent: string;
  requestId: string;
  timestamp: Date;
  details: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// Request fingerprint interface
export interface RequestFingerprint {
  ip: string;
  userAgent: string;
  acceptLanguage: string;
  acceptEncoding: string;
  connection: string;
  fingerprint: string;
}

// Security logger class
class SecurityLogger {
  private events: SecurityEvent[] = [];
  private readonly maxEvents = 1000; // Keep last 1000 events in memory

  log(event: SecurityEvent): void {
    // Add to memory store
    this.events.push(event);
    
    // Keep only recent events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Log to console with appropriate level
    const logMessage = `[SECURITY] ${event.type.toUpperCase()}: ${event.ipAddress} - ${JSON.stringify(event.details)}`;
    
    switch (event.severity) {
      case 'critical':
        console.error(logMessage);
        break;
      case 'high':
        console.warn(logMessage);
        break;
      case 'medium':
        console.log(logMessage);
        break;
      case 'low':
        console.debug(logMessage);
        break;
    }

    // In production, this would be sent to a security monitoring system
    // Example: await sendToSecuritySystem(event);
  }

  getRecentEvents(limit: number = 100): SecurityEvent[] {
    return this.events.slice(-limit);
  }

  getEventsByType(type: SecurityEventType, limit: number = 50): SecurityEvent[] {
    return this.events
      .filter(event => event.type === type)
      .slice(-limit);
  }

  getEventsByIp(ip: string, limit: number = 50): SecurityEvent[] {
    return this.events
      .filter(event => event.ipAddress === ip)
      .slice(-limit);
  }
}

// Create global security logger instance
export const securityLogger = new SecurityLogger();

// Honeypot field names (hidden fields that should never be filled by humans)
const HONEYPOT_FIELDS = [
  'website', 'url', 'homepage', 'home_page', 'website_url',
  'email_confirm', 'email_confirmation', 'email_verify',
  'phone_confirm', 'phone_confirmation',
  'address_confirm', 'address_confirmation',
  'captcha', 'recaptcha', 'hcaptcha',
  'bot_check', 'human_check', 'spam_check',
  'timestamp', 'time_check', 'delay',
  'company', 'company_name', 'business_name',
  'website_url', 'personal_website', 'blog_url',
  'social_media', 'facebook', 'twitter', 'instagram',
  'linkedin', 'github', 'portfolio', 'cv', 'resume'
];

/**
 * Generate request fingerprint for tracking
 */
export function generateRequestFingerprint(req: Request): RequestFingerprint {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const userAgent = req.get('User-Agent') || '';
  const acceptLanguage = req.get('Accept-Language') || '';
  const acceptEncoding = req.get('Accept-Encoding') || '';
  const connection = req.get('Connection') || '';

  // Create fingerprint hash
  const fingerprintString = `${ip}-${userAgent}-${acceptLanguage}-${acceptEncoding}-${connection}`;
  const fingerprint = crypto.createHash('sha256').update(fingerprintString).digest('hex');

  return {
    ip,
    userAgent,
    acceptLanguage,
    acceptEncoding,
    connection,
    fingerprint
  };
}

/**
 * Check for honeypot fields in request body
 */
export function checkHoneypotFields(req: Request): boolean {
  const body = req.body || {};
  
  for (const field of HONEYPOT_FIELDS) {
    if (body[field] && body[field].toString().trim() !== '') {
      return true; // Honeypot triggered
    }
  }
  
  return false;
}

/**
 * Detect suspicious request patterns
 */
export function detectSuspiciousActivity(req: Request, fingerprint: RequestFingerprint): string[] {
  const suspiciousPatterns: string[] = [];
  
  // Check for common bot patterns
  const userAgent = fingerprint.userAgent.toLowerCase();
  const suspiciousUserAgents = [
    'bot', 'crawler', 'spider', 'scraper', 'curl', 'wget', 'python',
    'java', 'php', 'perl', 'ruby', 'go-http', 'node-fetch'
  ];
  
  if (suspiciousUserAgents.some(pattern => userAgent.includes(pattern))) {
    suspiciousPatterns.push('suspicious_user_agent');
  }
  
  // Check for missing or unusual headers
  if (!req.get('Accept')) {
    suspiciousPatterns.push('missing_accept_header');
  }
  
  if (!req.get('Accept-Language')) {
    suspiciousPatterns.push('missing_language_header');
  }
  
  // Check for unusual request timing (too fast)
  const requestTime = Date.now();
  if (req.body && req.body._requestTime) {
    const timeDiff = requestTime - parseInt(req.body._requestTime);
    if (timeDiff < 1000) { // Less than 1 second
      suspiciousPatterns.push('too_fast_request');
    }
  }
  
  // Check for unusual request patterns
  if (req.body && typeof req.body === 'object') {
    const bodyKeys = Object.keys(req.body);
    
    // Check for too many fields (potential spam)
    if (bodyKeys.length > 20) {
      suspiciousPatterns.push('too_many_fields');
    }
    
    // Check for suspicious field names
    const suspiciousFields = ['password', 'pwd', 'pass', 'secret', 'token', 'key'];
    if (bodyKeys.some(key => suspiciousFields.some(sus => key.toLowerCase().includes(sus)))) {
      suspiciousPatterns.push('suspicious_field_names');
    }
  }
  
  return suspiciousPatterns;
}

/**
 * Enhanced rate limiting with fingerprinting
 */
export function enhancedRateLimit() {
  const requests = new Map<string, { count: number; resetTime: number }>();
  
  return (req: Request, res: Response, next: NextFunction) => {
    const fingerprint = generateRequestFingerprint(req);
    const key = fingerprint.fingerprint;
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutes
    const maxRequests = 100;
    
    const current = requests.get(key);
    
    if (!current || now > current.resetTime) {
      requests.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    if (current.count >= maxRequests) {
      // Log rate limit exceeded event
      securityLogger.log({
        type: 'rate_limit_exceeded',
        ipAddress: fingerprint.ip,
        userAgent: fingerprint.userAgent,
        requestId: crypto.randomUUID(),
        timestamp: new Date(),
        details: {
          fingerprint: key,
          requestCount: current.count,
          limit: maxRequests,
          windowMs
        },
        severity: 'high'
      });
      
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil((current.resetTime - now) / 1000)
      });
    }
    
    current.count++;
    requests.set(key, current);
    next();
  };
}

/**
 * Honeypot middleware
 */
export function honeypotMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      if (checkHoneypotFields(req)) {
        const fingerprint = generateRequestFingerprint(req);
        
        // Log honeypot trigger
        securityLogger.log({
          type: 'honeypot_triggered',
          ipAddress: fingerprint.ip,
          userAgent: fingerprint.userAgent,
          requestId: crypto.randomUUID(),
          timestamp: new Date(),
          details: {
            method: req.method,
            url: req.url,
            body: req.body
          },
          severity: 'high'
        });
        
        // Return success to avoid revealing the honeypot
        return res.status(200).json({ success: true });
      }
    }
    
    next();
  };
}

/**
 * Request fingerprinting middleware
 */
export function requestFingerprinting() {
  return (req: Request, res: Response, next: NextFunction) => {
    const fingerprint = generateRequestFingerprint(req);
    
    // Add fingerprint to request object
    (req as any).fingerprint = fingerprint;
    
    // Detect suspicious activity
    const suspiciousPatterns = detectSuspiciousActivity(req, fingerprint);
    
    if (suspiciousPatterns.length > 0) {
      securityLogger.log({
        type: 'suspicious_activity',
        ipAddress: fingerprint.ip,
        userAgent: fingerprint.userAgent,
        requestId: crypto.randomUUID(),
        timestamp: new Date(),
        details: {
          patterns: suspiciousPatterns,
          method: req.method,
          url: req.url,
          fingerprint: fingerprint.fingerprint
        },
        severity: 'medium'
      });
    }
    
    next();
  };
}

/**
 * Security headers middleware
 */
export function securityHeaders() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Remove server identification
    res.removeHeader('X-Powered-By');
    
    // Add security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    
    // Add custom security headers
    res.setHeader('X-Security-Level', 'high');
    res.setHeader('X-Request-ID', crypto.randomUUID());
    
    // Content Security Policy
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ');
    
    res.setHeader('Content-Security-Policy', csp);
    
    next();
  };
}

/**
 * Request validation middleware
 */
export function requestValidation() {
  return (req: Request, res: Response, next: NextFunction) => {
    const fingerprint = (req as any).fingerprint;
    
    // Validate request size
    const contentLength = parseInt(req.get('Content-Length') || '0');
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    if (contentLength > maxSize) {
      securityLogger.log({
        type: 'invalid_input',
        ipAddress: fingerprint?.ip || req.ip || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        requestId: crypto.randomUUID(),
        timestamp: new Date(),
        details: {
          reason: 'request_too_large',
          size: contentLength,
          maxSize
        },
        severity: 'medium'
      });
      
      return res.status(413).json({ error: 'Request too large' });
    }
    
    // Validate content type for POST/PUT/PATCH requests
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      const contentType = req.get('Content-Type');
      
      if (!contentType || !contentType.includes('application/json')) {
        securityLogger.log({
          type: 'invalid_input',
          ipAddress: fingerprint?.ip || req.ip || 'unknown',
          userAgent: req.get('User-Agent') || 'unknown',
          requestId: crypto.randomUUID(),
          timestamp: new Date(),
          details: {
            reason: 'invalid_content_type',
            contentType
          },
          severity: 'low'
        });
        
        return res.status(400).json({ error: 'Invalid content type' });
      }
    }
    
    next();
  };
}

/**
 * Audit logging middleware
 */
export function auditLogging() {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const fingerprint = (req as any).fingerprint;
    
    // Override res.json to capture response
    const originalJson = res.json;
    res.json = function(body: any) {
      const duration = Date.now() - startTime;
      
      // Log audit event
      const auditEvent = {
        userId: (req.session as any)?.uid,
        action: req.method.toLowerCase() + '_' + req.route?.path?.replace(/[^a-zA-Z0-9]/g, '_'),
        resource: req.url,
        resourceId: req.params?.id,
        details: {
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          duration,
          fingerprint: fingerprint?.fingerprint,
          userAgent: req.get('User-Agent'),
          referer: req.get('Referer')
        },
        ipAddress: fingerprint?.ip || req.ip || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        timestamp: new Date(),
        success: res.statusCode < 400
      };
      
      // Validate audit event
      const validation = auditLogSchema.safeParse(auditEvent);
      if (validation.success) {
        securityLogger.log({
          type: 'login_success', // This would be dynamic based on the actual action
          ipAddress: auditEvent.ipAddress,
          userAgent: auditEvent.userAgent,
          requestId: crypto.randomUUID(),
          timestamp: auditEvent.timestamp,
          details: auditEvent.details,
          severity: 'low'
        });
      }
      
      return originalJson.call(this, body);
    };
    
    next();
  };
}

/**
 * Combine all advanced security middleware
 */
export function advancedSecurityMiddleware() {
  return [
    securityHeaders(),
    requestFingerprinting(),
    enhancedRateLimit(),
    honeypotMiddleware(),
    requestValidation(),
    auditLogging()
  ];
}

export default {
  generateRequestFingerprint,
  checkHoneypotFields,
  detectSuspiciousActivity,
  enhancedRateLimit,
  honeypotMiddleware,
  requestFingerprinting,
  securityHeaders,
  requestValidation,
  auditLogging,
  advancedSecurityMiddleware,
  securityLogger
};
