import { Router } from "express";
import bcrypt from "bcrypt";
import { User } from "../models/User";
import { loginSchema, registerSchema, employeeLoginSchema } from "../utils/validators";
import rateLimit from "express-rate-limit";
import { bruteForceProtection } from "../middleware/security";
import { passwordSecurity } from "../utils/passwordSecurity";

const router = Router();

// Extra rate limit on auth endpoints
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/register", authLimiter, async (req, res) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    }

    const { username, password, fullName, idNumber, accountNumber } = parsed.data;
    const email = `${username}@securbank.internal`;

    const existing = await User.findOne({ $or: [{ username }, { email }, { accountNumber }] }).lean();
    if (existing) {
      return res.status(409).json({ error: "User already exists" });
    }

    // Check password strength
    const strengthResult = passwordSecurity.checkPasswordStrength(password);
    if (!strengthResult.isStrong) {
      return res.status(400).json({ 
        error: "Password does not meet security requirements", 
        details: strengthResult.feedback 
      });
    }

    // Check if password is in breach database
    const isBreached = await passwordSecurity.isPasswordBreached(password);
    if (isBreached) {
      return res.status(400).json({ 
        error: "Password has been found in data breaches. Please choose a different password." 
      });
    }

    // Hash password with enhanced security (bcrypt + pepper)
    const passwordHash = await passwordSecurity.hashPassword(password);

    // Add to password history
    const passwordHistory = await passwordSecurity.addToPasswordHistory(password);

    const user = await User.create({
      username,
      email,
      fullName,
      idNumber,
      accountNumber,
      passwordHash,
      passwordHistory,
      lastPasswordChange: new Date(),
    });

    // Rotate session
    req.session.regenerate((err) => {
      if (err) return res.status(500).json({ error: "Session error" });
      (req.session as any).uid = (user._id as any).toString();
      res.status(201).json({ message: "Registered", user: { username, fullName, accountNumber } });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/login", authLimiter, bruteForceProtection.prevent, async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    }
    const { username, password, accountNumber } = parsed.data;

    const user = await User.findOne({ username, accountNumber });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    // Check if account is locked out
    if (passwordSecurity.isAccountLocked(user.lockoutInfo)) {
      const timeRemaining = passwordSecurity.getLockoutTimeRemaining(user.lockoutInfo);
      const minutesRemaining = Math.ceil(timeRemaining / (1000 * 60));
      
      return res.status(423).json({ 
        error: "Account temporarily locked due to too many failed attempts",
        lockoutMinutesRemaining: minutesRemaining
      });
    }

    const ok = await passwordSecurity.verifyPassword(password, user.passwordHash);
    
    if (!ok) {
      // Record failed attempt
      const updatedLockoutInfo = passwordSecurity.recordFailedAttempt(user.lockoutInfo);
      await User.findByIdAndUpdate(user._id, { lockoutInfo: updatedLockoutInfo });
      
      // Check if account is now locked
      if (passwordSecurity.isAccountLocked(updatedLockoutInfo)) {
        return res.status(423).json({ 
          error: "Account locked due to too many failed attempts",
          lockoutMinutesRemaining: 15
        });
      }
      
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Reset failed attempts on successful login
    const resetLockoutInfo = passwordSecurity.resetFailedAttempts(user.lockoutInfo);
    await User.findByIdAndUpdate(user._id, { lockoutInfo: resetLockoutInfo });

    req.session.regenerate((err) => {
      if (err) return res.status(500).json({ error: "Session error" });
      (req.session as any).uid = (user._id as any).toString();
      res.json({ message: "Logged in", user: { username: user.username, fullName: user.fullName, accountNumber: user.accountNumber } });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/logout", authLimiter, (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: "Failed to logout" });
    res.clearCookie("sid");
    res.json({ message: "Logged out" });
  });
});

router.post("/employee/login", authLimiter, bruteForceProtection.prevent, async (req, res) => {
  try {
    const parsed = employeeLoginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    }
    const { employeeNumber, password } = parsed.data;

    // For employee login, we'll use a simple approach where employeeNumber is the username
    // In production, you'd have a separate Employee model with proper authentication
    const user = await User.findOne({ 
      $or: [
        { username: employeeNumber },
        { idNumber: employeeNumber }
      ]
    });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await passwordSecurity.verifyPassword(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    req.session.regenerate((err) => {
      if (err) return res.status(500).json({ error: "Session error" });
      (req.session as any).uid = (user._id as any).toString();
      (req.session as any).role = "employee";
      res.json({ 
        message: "Employee logged in", 
        user: { 
          username: user.username, 
          fullName: user.fullName, 
          accountNumber: user.accountNumber,
          role: "employee"
        } 
      });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/me", authLimiter, async (req, res) => {
  const uid = (req.session as any).uid as string | undefined;
  if (!uid) return res.status(401).json({ error: "Unauthorized" });
  const user = await User.findById(uid).select("username fullName accountNumber").lean();
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  const role = (req.session as any).role || "customer";
  res.json({ user: { ...user, role } });
});

// Password strength checking endpoint
router.post("/check-password-strength", authLimiter, async (req, res) => {
  try {
    const { password } = req.body;
    
    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: "Password is required" });
    }

    const strengthResult = passwordSecurity.checkPasswordStrength(password);
    const isBreached = await passwordSecurity.isPasswordBreached(password);
    
    res.json({
      strength: strengthResult,
      isBreached,
      recommendations: passwordSecurity.getSecurityRecommendations()
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Generate secure password endpoint
router.get("/generate-password", authLimiter, async (req, res) => {
  try {
    const length = parseInt(req.query.length as string) || 16;
    
    if (length < 8 || length > 128) {
      return res.status(400).json({ error: "Password length must be between 8 and 128 characters" });
    }

    const password = passwordSecurity.generateSecurePassword(length);
    const strengthResult = passwordSecurity.checkPasswordStrength(password);
    
    res.json({
      password,
      strength: strengthResult,
      recommendations: passwordSecurity.getSecurityRecommendations()
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
