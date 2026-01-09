import { z } from "zod";

export const PATTERNS = {
  swiftCode: /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/,
  payeeAccount: /^[A-Z0-9]{8,34}$/,
  amount: /^\d+(\.\d{1,2})?$/,
};

export const createTransactionSchema = z.object({
  amount: z
    .string()
    .regex(PATTERNS.amount, "Amount must be a valid number with up to 2 decimal places")
    .transform((val) => parseFloat(val))
    .refine((val) => val > 0 && val <= 1000000, "Amount must be between $0.01 and $1,000,000"),
  currency: z.enum(["USD", "EUR", "GBP", "ZAR"]),
  provider: z.literal("SWIFT"),
  payeeAccountInfo: z
    .string()
    .trim()
    .min(8)
    .max(34)
    .regex(PATTERNS.payeeAccount, "Invalid payee account format"),
  swiftCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(PATTERNS.swiftCode, "Invalid SWIFT code format"),
});

export const verifyTransactionSchema = z.object({
  transactionId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid transaction ID"),
});

export const declineTransactionSchema = z.object({
  transactionId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid transaction ID"),
  reason: z
    .string()
    .trim()
    .min(10, "Decline reason must be at least 10 characters")
    .max(500, "Decline reason must be at most 500 characters"),
});

export const submitToSwiftSchema = z.object({
  transactionIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid transaction ID")).min(1),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type VerifyTransactionInput = z.infer<typeof verifyTransactionSchema>;
export type DeclineTransactionInput = z.infer<typeof declineTransactionSchema>;
export type SubmitToSwiftInput = z.infer<typeof submitToSwiftSchema>;

