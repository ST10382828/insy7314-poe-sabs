import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { ENV } from '../config/env';

export interface PasswordHistoryEntry {
  passwordHash: string;
  createdAt: Date;
}

export interface PasswordStrengthResult {
  score: number; // 0-100
  feedback: string[];
  isStrong: boolean;
}

export interface AccountLockoutInfo {
  failedAttempts: number;
  lockoutUntil?: Date;
  lastAttempt: Date;
}

export class PasswordSecurityManager {
  private readonly saltRounds = 12;
  private readonly pepper: string;
  private readonly maxPasswordHistory = 5;
  private readonly maxFailedAttempts = 5;
  private readonly lockoutDuration = 15 * 60 * 1000; // 15 minutes

  constructor() {
    // Use environment pepper or generate one (in production, this should be in env)
    this.pepper = ENV.PASSWORD_PEPPER || 'default-pepper-change-in-production';
  }

  /**
   * Hash password with bcrypt, salt, and pepper
   */
  public async hashPassword(password: string): Promise<string> {
    // Add pepper before hashing
    const pepperedPassword = password + this.pepper;
    
    // Hash with bcrypt (includes salt)
    const hash = await bcrypt.hash(pepperedPassword, this.saltRounds);
    
    return hash;
  }

  /**
   * Verify password against hash
   */
  public async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      // Add pepper before verification
      const pepperedPassword = password + this.pepper;
      
      return await bcrypt.compare(pepperedPassword, hash);
    } catch (error) {
      console.error('Password verification error:', error);
      return false;
    }
  }

  /**
   * Check password strength
   */
  public checkPasswordStrength(password: string): PasswordStrengthResult {
    const feedback: string[] = [];
    let score = 0;

    // Length check
    if (password.length >= 8) {
      score += 20;
    } else {
      feedback.push('Password should be at least 8 characters long');
    }

    if (password.length >= 12) {
      score += 10;
    }

    if (password.length >= 16) {
      score += 10;
    }

    // Character variety checks
    if (/[a-z]/.test(password)) {
      score += 10;
    } else {
      feedback.push('Password should contain lowercase letters');
    }

    if (/[A-Z]/.test(password)) {
      score += 10;
    } else {
      feedback.push('Password should contain uppercase letters');
    }

    if (/[0-9]/.test(password)) {
      score += 10;
    } else {
      feedback.push('Password should contain numbers');
    }

    if (/[^A-Za-z0-9]/.test(password)) {
      score += 10;
    } else {
      feedback.push('Password should contain special characters');
    }

    // Pattern checks (deduct points for weak patterns)
    if (/(.)\1{2,}/.test(password)) {
      score -= 10;
      feedback.push('Avoid repeating characters');
    }

    if (/123|abc|qwe|password|admin/i.test(password)) {
      score -= 20;
      feedback.push('Avoid common patterns or dictionary words');
    }

    // Entropy check
    const uniqueChars = new Set(password).size;
    if (uniqueChars < 4) {
      score -= 10;
      feedback.push('Use more diverse characters');
    }

    // Bonus for very strong passwords (check current score, not future score)
    if (password.length >= 16 && uniqueChars >= 10) {
      score += 10; // Bonus for length + diversity
    }

    // Additional bonus for exceptional passwords
    if (password.length >= 20 && uniqueChars >= 15) {
      score += 10; // Extra points for truly exceptional passwords
    }

    // Ensure score is between 0 and 100
    score = Math.max(0, Math.min(100, score));

    const isStrong = score >= 70;

    if (score < 30) {
      feedback.unshift('Password is very weak');
    } else if (score < 50) {
      feedback.unshift('Password is weak');
    } else if (score < 70) {
      feedback.unshift('Password is moderate');
    } else if (score < 90) {
      feedback.unshift('Password is strong');
    } else if (score < 100) {
      feedback.unshift('Password is very strong');
    } else {
      feedback.unshift('Password is perfect! Maximum security achieved');
    }

    return {
      score,
      feedback,
      isStrong
    };
  }

  /**
   * Check if password has been used recently (password history)
   */
  public async isPasswordInHistory(
    password: string, 
    passwordHistory: PasswordHistoryEntry[]
  ): Promise<boolean> {
    if (passwordHistory.length === 0) {
      return false;
    }

    // Check against recent passwords (last 5)
    const recentHistory = passwordHistory.slice(-this.maxPasswordHistory);
    
    for (const entry of recentHistory) {
      const isMatch = await this.verifyPassword(password, entry.passwordHash);
      if (isMatch) {
        return true;
      }
    }

    return false;
  }

  /**
   * Add password to history
   */
  public async addToPasswordHistory(
    password: string,
    existingHistory: PasswordHistoryEntry[] = []
  ): Promise<PasswordHistoryEntry[]> {
    const hash = await this.hashPassword(password);
    const newEntry: PasswordHistoryEntry = {
      passwordHash: hash,
      createdAt: new Date()
    };

    // Add to history and keep only the last N entries
    const updatedHistory = [...existingHistory, newEntry];
    return updatedHistory.slice(-this.maxPasswordHistory);
  }

  /**
   * Check if account should be locked out
   */
  public isAccountLocked(lockoutInfo: AccountLockoutInfo): boolean {
    if (!lockoutInfo.lockoutUntil) {
      return false;
    }

    return new Date() < lockoutInfo.lockoutUntil;
  }

  /**
   * Record failed login attempt
   */
  public recordFailedAttempt(lockoutInfo: AccountLockoutInfo): AccountLockoutInfo {
    const now = new Date();
    const failedAttempts = lockoutInfo.failedAttempts + 1;
    
    let lockoutUntil: Date | undefined;
    
    if (failedAttempts >= this.maxFailedAttempts) {
      lockoutUntil = new Date(now.getTime() + this.lockoutDuration);
    }

    return {
      failedAttempts,
      lockoutUntil,
      lastAttempt: now
    };
  }

  /**
   * Reset failed attempts (on successful login)
   */
  public resetFailedAttempts(lockoutInfo: AccountLockoutInfo): AccountLockoutInfo {
    return {
      failedAttempts: 0,
      lockoutUntil: undefined,
      lastAttempt: new Date()
    };
  }

  /**
   * Get time until lockout expires
   */
  public getLockoutTimeRemaining(lockoutInfo: AccountLockoutInfo): number {
    if (!lockoutInfo.lockoutUntil) {
      return 0;
    }

    const now = new Date();
    const remaining = lockoutInfo.lockoutUntil.getTime() - now.getTime();
    
    return Math.max(0, remaining);
  }

  /**
   * Generate secure random password
   */
  public generateSecurePassword(length: number = 16): string {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    const allChars = uppercase + lowercase + numbers + symbols;
    
    let password = '';
    
    // Ensure at least one character from each category
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];
    
    // Fill the rest with random characters
    for (let i = 4; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  /**
   * Check password against common breach databases (simplified implementation)
   */
  public async isPasswordBreached(password: string): Promise<boolean> {
    // In a real implementation, you would:
    // 1. Hash the password with SHA-1
    // 2. Send first 5 characters to HaveIBeenPwned API
    // 3. Check if the full hash exists in their database
    
    // For this implementation, we'll check against a small local list
    const commonBreachedPasswords = [
      'password', '123456', 'password123', 'admin', 'qwerty',
      'letmein', 'welcome', 'monkey', '1234567890', 'abc123'
    ];
    
    return commonBreachedPasswords.includes(password.toLowerCase());
  }

  /**
   * Get password security recommendations
   */
  public getSecurityRecommendations(): string[] {
    return [
      'Use a unique password for this account',
      'Enable two-factor authentication if available',
      'Change your password regularly (every 90 days)',
      'Never share your password with anyone',
      'Use a password manager to generate and store passwords',
      'Avoid using personal information in passwords',
      'Log out from shared or public computers',
      'Report any suspicious account activity immediately'
    ];
  }
}

// Export singleton instance
export const passwordSecurity = new PasswordSecurityManager();
