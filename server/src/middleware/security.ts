import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import ExpressBrute from "express-brute";
// @ts-ignore - express-brute MemoryStore doesn't have proper types
import MemoryStore from "express-brute/lib/MemoryStore";
import { ENV } from "../config/env";
import { type RequestHandler } from "express";

export const securityMiddleware = [
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "default-src": ["'self'"],
        "script-src": ["'self'", "'unsafe-inline'"],
        "style-src": ["'self'", "'unsafe-inline'"],
        "img-src": ["'self'", "data:", "blob:"],
        "connect-src": ["'self'", ENV.CORS_ORIGIN],
        "frame-ancestors": ["'none'"],
      },
    },
    frameguard: { action: "deny" },
    referrerPolicy: { policy: "no-referrer" },
    xssFilter: true,
    hsts: {
      maxAge: 15552000, // 180 days
      includeSubDomains: true,
      preload: true,
    },
  }),
  cors({
    origin: ENV.CORS_ORIGIN,
    credentials: true,
  }),
  compression(),
  mongoSanitize(),
  rateLimit({
    windowMs: 60 * 1000,
    limit: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: "Too many requests, please try again later.",
  }) as unknown as RequestHandler,
];

// Express Brute setup for brute force protection
const store = new MemoryStore();

export const bruteForceProtection = new ExpressBrute(store, {
  freeRetries: 5, // Number of free retries
  minWait: 5 * 60 * 1000, // 5 minutes
  maxWait: 15 * 60 * 1000, // 15 minutes
  lifetime: 24 * 60 * 60, // 24 hours
  failCallback: (req, res, next, nextValidRequestDate) => {
    res.status(429).json({
      error: "Too many failed attempts, please try again later.",
      nextValidRequestDate: nextValidRequestDate
    });
  }
});

export const enforceHttps: RequestHandler = (req, res, next) => {
  if (!ENV.HTTPS_ONLY) return next();
  // trust proxy should be enabled in app when behind reverse proxy
  if (req.secure) return next();
  const host = req.headers.host;
  return res.redirect(301, `https://${host}${req.originalUrl}`);
};

// Export aliases for test compatibility
export const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 20, // Limit each IP to 20 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many authentication attempts, please try again later.",
});

export const globalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many requests, please try again later.",
});
