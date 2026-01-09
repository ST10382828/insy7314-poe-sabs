import { Router } from "express";
import { Transaction } from "../models/Transaction";
import { User } from "../models/User";
import { Employee } from "../models/Employee";
import {
  createTransactionSchema,
  verifyTransactionSchema,
  declineTransactionSchema,
  submitToSwiftSchema,
} from "../utils/transactionValidators";
import rateLimit from "express-rate-limit";

const router = Router();

// Rate limiting for transaction endpoints
const transactionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 10, // 10 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
});

// Customer endpoints (create transactions, view own transactions)
router.post("/", transactionLimiter, async (req, res) => {
  try {
    const uid = (req.session as any).uid as string | undefined;
    if (!uid) return res.status(401).json({ error: "Unauthorized" });

    const parsed = createTransactionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    }

    const { amount, currency, provider, payeeAccountInfo, swiftCode } = parsed.data;

    // Create transaction
    const transaction = await Transaction.create({
      customerId: uid,
      amount,
      currency,
      provider,
      payeeAccountInfo,
      swiftCode,
      status: "pending",
    });

    res.status(201).json({ 
      message: "Payment submitted successfully", 
      transaction: {
        id: transaction._id,
        amount,
        currency,
        status: transaction.status,
        createdAt: transaction.createdAt,
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get customer's own transactions
router.get("/my", transactionLimiter, async (req, res) => {
  try {
    const uid = (req.session as any).uid as string | undefined;
    if (!uid) return res.status(401).json({ error: "Unauthorized" });

    const transactions = await Transaction.find({ customerId: uid })
      .select(
        "amount currency provider payeeAccountInfo swiftCode status createdAt updatedAt declineReason declinedAt verifiedAt submittedAt"
      )
      .sort({ createdAt: -1 })
      .lean();

    res.json({ transactions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Employee endpoints (verify transactions, submit to SWIFT)
router.get("/pending", transactionLimiter, async (req, res) => {
  try {
    const uid = (req.session as any).uid as string | undefined;
    const role = (req.session as any).role as string | undefined;
    if (!uid) return res.status(401).json({ error: "Unauthorized" });

    // Check if user is an employee
    if (role !== "employee") {
      return res.status(403).json({ error: "Access denied. Employee role required." });
    }

    // Get both pending and verified transactions for employee review
    const transactions = await Transaction.find({ 
      status: { $in: ["pending", "verified"] } 
    })
      .populate("customerId", "username fullName accountNumber")
      .select("_id amount currency payeeAccountInfo swiftCode status createdAt")
      .sort({ createdAt: -1 })
      .lean();

    res.json({ transactions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/verify", transactionLimiter, async (req, res) => {
  try {
    const uid = (req.session as any).uid as string | undefined;
    const role = (req.session as any).role as string | undefined;
    if (!uid) return res.status(401).json({ error: "Unauthorized" });

    // Check if user is an employee
    if (role !== "employee") {
      return res.status(403).json({ error: "Access denied. Employee role required." });
    }

    const parsed = verifyTransactionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    }

    const { transactionId } = parsed.data;

    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    if (transaction.status !== "pending") {
      return res.status(400).json({ error: "Transaction is not pending verification" });
    }

    // Update transaction status
    transaction.status = "verified";
    transaction.verifiedBy = uid as any;
    transaction.verifiedAt = new Date();
    await transaction.save();

    res.json({ message: "Transaction verified successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/decline", transactionLimiter, async (req, res) => {
  try {
    const uid = (req.session as any).uid as string | undefined;
    const role = (req.session as any).role as string | undefined;
    if (!uid) return res.status(401).json({ error: "Unauthorized" });

    if (role !== "employee") {
      return res.status(403).json({ error: "Access denied. Employee role required." });
    }

    const parsed = declineTransactionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    }

    const { transactionId, reason } = parsed.data;

    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    if (transaction.status !== "pending") {
      return res.status(400).json({ error: "Only pending transactions can be declined" });
    }

    transaction.status = "failed";
    transaction.declinedBy = uid as any;
    transaction.declinedAt = new Date();
    transaction.declineReason = reason;
    await transaction.save();

    res.json({ message: "Transaction declined successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/submit-to-swift", transactionLimiter, async (req, res) => {
  try {
    const uid = (req.session as any).uid as string | undefined;
    const role = (req.session as any).role as string | undefined;
    if (!uid) return res.status(401).json({ error: "Unauthorized" });

    // Check if user is an employee
    if (role !== "employee") {
      return res.status(403).json({ error: "Access denied. Employee role required." });
    }

    const parsed = submitToSwiftSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    }

    const { transactionIds } = parsed.data;

    // Update all transactions to submitted status
    const result = await Transaction.updateMany(
      { 
        _id: { $in: transactionIds },
        status: "verified" // Only submit verified transactions
      },
      { 
        status: "submitted",
        submittedAt: new Date()
      }
    );

    if (result.matchedCount === 0) {
      return res.status(400).json({ error: "No verified transactions found to submit" });
    }

    res.json({ 
      message: `${result.modifiedCount} transactions submitted to SWIFT successfully`,
      submittedCount: result.modifiedCount
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
