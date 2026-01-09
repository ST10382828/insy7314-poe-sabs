import express from "express";
import session from "express-session";
// import MongoStore from "connect-mongo"; // Disabled for testing
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import csurf from "csurf";
import https from "https";
import fs from "fs";
import path from "path";
import { ENV } from "./config/env";
import { securityMiddleware, enforceHttps } from "./middleware/security";
import { SSLManager } from "./utils/ssl";
import authRouter from "./routes/auth";
import transactionRouter from "./routes/transactions";
import seedRouter from "./routes/seed";

const app = express();

// Export app for testing
export { app };

// Trust proxy for HTTPS detection behind reverse proxies
app.set("trust proxy", 1);

// Optional HTTP → HTTPS redirect in production
if (ENV.NODE_ENV === "production") {
  app.use((req, res, next) => {
    if (!req.secure) {
      return res.redirect(`https://${req.headers.host}${req.url}`);
    }
    next();
  });
}

// Core middleware
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: false, limit: "100kb" }));
app.use(cookieParser());

// Security middleware
app.use(enforceHttps);
app.use(securityMiddleware);

// Sessions (using memory store for testing without MongoDB)
// Session security: httpOnly prevents XSS, sameSite prevents CSRF, secure flag for HTTPS
app.use(
  session({
    name: "sid",
    secret: ENV.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    // store: sessionStore, // Disabled for testing
    cookie: {
      httpOnly: true, // Prevents XSS attacks by blocking JavaScript access to cookies
      sameSite: ENV.NODE_ENV === 'production' ? 'none' : 'strict', // 'none' for cross-origin in production
      secure: ENV.NODE_ENV === 'production' ? true : (ENV.NODE_ENV !== 'test'), // true in production, flexible in dev
      maxAge: 1000 * 60 * 60, // 1 hour session timeout
    },
  })
);

// CSRF protection using double-submit cookie pattern
// Disable CSRF in test environment to simplify testing
const csrfProtection = (() => {
  if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) {
    return ((req: any, res: any, next: any) => next()) as any;
  }
  return csurf({
    cookie: { 
      httpOnly: true, 
      sameSite: ENV.NODE_ENV === 'production' ? 'none' : 'strict',
      secure: ENV.NODE_ENV === 'production' ? true : (ENV.NODE_ENV !== 'test')
    },
  });
})();

// Expose CSRF token endpoint for the SPA to fetch and use
app.get("/api/csrf-token", csrfProtection, (req, res) => {
  if (process.env.NODE_ENV === 'test') {
    return res.json({ csrfToken: 'test-token' });
  }
  res.json({ csrfToken: req.csrfToken() });
});

// Protected API routes
app.use("/api/auth", csrfProtection, authRouter);
app.use("/api/transactions", csrfProtection, transactionRouter);
app.use("/api", seedRouter); // No CSRF needed for seed endpoint

// Health check
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

async function start() {
  try {
    // Don't start server if running tests
    if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined) {
      return;
    }

    const port = ENV.PORT || 3011;

    // Connect to MongoDB if URI is provided
    if (ENV.MONGODB_URI && ENV.MONGODB_URI.startsWith("mongodb")) {
      console.log("🔌 Connecting to MongoDB Atlas...");
      await mongoose.connect(ENV.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
      console.log("✅ Connected to MongoDB Atlas");
    } else {
      console.warn("⚠️ Skipping MongoDB connection (MONGODB_URI missing or invalid)");
    }

    // Use HTTPS only in local development, not in production (Render/Netlify handle SSL)
    if (ENV.NODE_ENV !== 'production') {
      const sslManager = new SSLManager();
      
      // Generate or use existing certificates
      const sslConfig = sslManager.generateSelfSignedCert('localhost', 365);
      
      // Check certificate expiry
      sslManager.checkCertificateExpiry(sslConfig.certPath);
      
      // Create HTTPS server with enhanced security
      const httpsServer = sslManager.createHttpsServer(app, sslConfig);
      
      httpsServer.listen(port, () => {
        console.log(`🔒 HTTPS API listening on https://localhost:${port}`);
        console.log(`🔐 SSL Certificate: ${sslManager.getCertificateInfo(sslConfig.certPath).subject}`);
        console.log(`📅 Valid until: ${sslManager.getCertificateInfo(sslConfig.certPath).validTo.toISOString()}`);
      });
    } else {
      // Production: Use HTTP (SSL termination handled by Render/hosting platform)
      app.listen(port, () => {
        console.log(`🚀 API listening on port ${port}`);
        console.log(`🔒 SSL/TLS handled by hosting platform (Render)`);
        console.log(`🌍 Environment: ${ENV.NODE_ENV}`);
      });
    }
  } catch (err) {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  }
}

// Only start server if not in test environment
if (process.env.NODE_ENV !== 'test' && !process.env.JEST_WORKER_ID) {
  start();
}
