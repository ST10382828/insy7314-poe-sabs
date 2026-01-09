import { z } from "zod";

export const PATTERNS = {
  // Full name: Unicode letters (including accented), spaces (not tabs/newlines), hyphens, apostrophes only
  // \p{L} = Unicode letters, \p{M} = combining marks (for accented chars), ' ' = space only (not \s which includes newlines/tabs), ' = apostrophe, - = hyphen
  fullName: /^[\p{L}\p{M} '-]{2,100}$/u,
  idNumber: /^[A-Z0-9]{6,20}$/,
  accountNumber: /^\d{8,20}$/,
  username: /^[a-zA-Z0-9_-]{3,30}$/,
  swiftCode: /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/,
  payeeAccount: /^[A-Z0-9]{8,34}$/,
  amount: /^\d+(\.\d{1,2})?$/,
  employeeNumber: /^[A-Z0-9]{4,15}$/,
};

export const registerSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2)
    .max(100)
    .regex(PATTERNS.fullName),
  idNumber: z
    .string()
    .trim()
    .toUpperCase()
    .min(6)
    .max(20)
    .regex(PATTERNS.idNumber),
  accountNumber: z
    .string()
    .trim()
    .min(8)
    .max(20)
    .regex(PATTERNS.accountNumber),
  username: z
    .string()
    .trim()
    .min(3)
    .max(30)
    .regex(PATTERNS.username),
  password: z
    .string()
    .min(8)
    .max(128)
    .regex(/[A-Z]/)
    .regex(/[a-z]/)
    .regex(/[0-9]/)
    .regex(/[^A-Za-z0-9]/),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  username: z.string().trim().min(3).regex(PATTERNS.username),
  accountNumber: z.string().trim().min(8).regex(PATTERNS.accountNumber),
  password: z.string().min(1),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const employeeLoginSchema = z.object({
  employeeNumber: z.string().trim().toUpperCase().min(4).regex(PATTERNS.employeeNumber),
  password: z.string().min(1),
});

export type EmployeeLoginInput = z.infer<typeof employeeLoginSchema>;
