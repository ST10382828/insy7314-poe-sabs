import { z } from "zod";

// RegEx patterns for input whitelisting
export const PATTERNS = {
  // Full name: letters, spaces, hyphens, apostrophes only
  fullName: /^[a-zA-Z\s'-]{2,100}$/,
  
  // ID Number: alphanumeric, 6-20 characters
  idNumber: /^[A-Z0-9]{6,20}$/,
  
  // Account number: digits only, 8-20 characters
  accountNumber: /^\d{8,20}$/,
  
  // Employee number: alphanumeric, 4-15 characters
  employeeNumber: /^[A-Z0-9]{4,15}$/,
  
  // SWIFT code: alphanumeric, 8 or 11 characters
  swiftCode: /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/,
  
  // Amount: positive decimal with up to 2 decimal places
  amount: /^\d+(\.\d{1,2})?$/,
  
  // Username: alphanumeric, underscores, hyphens, 3-30 characters
  username: /^[a-zA-Z0-9_-]{3,30}$/,
};

// Customer Registration Schema
export const customerRegistrationSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name must not exceed 100 characters")
    .regex(PATTERNS.fullName, "Full name can only contain letters, spaces, hyphens, and apostrophes"),
  
  idNumber: z
    .string()
    .trim()
    .toUpperCase()
    .min(6, "ID number must be at least 6 characters")
    .max(20, "ID number must not exceed 20 characters")
    .regex(PATTERNS.idNumber, "ID number can only contain uppercase letters and numbers"),
  
  accountNumber: z
    .string()
    .trim()
    .min(8, "Account number must be at least 8 digits")
    .max(20, "Account number must not exceed 20 digits")
    .regex(PATTERNS.accountNumber, "Account number can only contain digits"),
  
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must not exceed 30 characters")
    .regex(PATTERNS.username, "Username can only contain letters, numbers, underscores, and hyphens"),
  
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must not exceed 128 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  
  confirmPassword: z
    .string()
    .min(1, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export type CustomerRegistrationInput = z.infer<typeof customerRegistrationSchema>;

// Customer Login Schema
export const customerLoginSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Username is required")
    .regex(PATTERNS.username, "Invalid username format"),
  
  accountNumber: z
    .string()
    .trim()
    .min(8, "Account number is required")
    .regex(PATTERNS.accountNumber, "Account number can only contain digits"),
  
  password: z
    .string()
    .min(1, "Password is required"),
});

export type CustomerLoginInput = z.infer<typeof customerLoginSchema>;

// Employee Login Schema
export const employeeLoginSchema = z.object({
  employeeNumber: z
    .string()
    .trim()
    .toUpperCase()
    .min(4, "Employee number is required")
    .regex(PATTERNS.employeeNumber, "Employee number can only contain uppercase letters and numbers"),
  
  password: z
    .string()
    .min(1, "Password is required"),
});

export type EmployeeLoginInput = z.infer<typeof employeeLoginSchema>;

// Payment Creation Schema
export const paymentSchema = z.object({
  amount: z
    .string()
    .trim()
    .min(1, "Amount is required")
    .regex(PATTERNS.amount, "Amount must be a valid positive number with up to 2 decimal places")
    .refine((val) => parseFloat(val) > 0, "Amount must be greater than 0")
    .refine((val) => parseFloat(val) <= 999999999.99, "Amount exceeds maximum limit"),
  
  currency: z.enum(["USD", "EUR", "GBP", "ZAR", "JPY", "CNY", "AUD"], {
    required_error: "Please select a currency",
  }),
  
  provider: z.string().default("SWIFT"),
  
  payeeName: z
    .string()
    .trim()
    .min(2, "Payee name must be at least 2 characters")
    .max(100, "Payee name must not exceed 100 characters")
    .regex(PATTERNS.fullName, "Payee name can only contain letters, spaces, hyphens, and apostrophes"),
  
  payeeAccountNumber: z
    .string()
    .trim()
    .min(8, "Payee account number must be at least 8 digits")
    .max(20, "Payee account number must not exceed 20 digits")
    .regex(PATTERNS.accountNumber, "Payee account number can only contain digits"),
  
  swiftCode: z
    .string()
    .trim()
    .toUpperCase()
    .min(8, "SWIFT code must be 8 or 11 characters")
    .max(11, "SWIFT code must be 8 or 11 characters")
    .regex(PATTERNS.swiftCode, "Invalid SWIFT code format. Must start with 6 letters followed by 2 alphanumeric characters")
    .refine((val) => val.length === 8 || val.length === 11, "SWIFT code must be exactly 8 or 11 characters"),
});

export type PaymentInput = z.infer<typeof paymentSchema>;
