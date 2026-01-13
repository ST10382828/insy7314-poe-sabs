import { Router, Request, Response } from "express";
import { User } from "../models/User";
import bcrypt from "bcrypt";
import { ENV } from "../config/env";

const router = Router();

const SEED_SECRET = process.env.SEED_SECRET || "change_this_seed_secret_in_production";

router.post("/seed-employees", async (req: Request, res: Response): Promise<void> => {
  try {
    const { secret } = req.body;

    // Basic protection - require secret to prevent unauthorized seeding
    if (secret !== SEED_SECRET) {
      res.status(403).json({ error: "Unauthorized" });
      return;
    }

    // Check if employees already exist
    const existingCount = await User.countDocuments({ role: "employee" });
    if (existingCount > 0) {
      res.status(400).json({ 
        error: "Employees already seeded", 
        count: existingCount 
      });
      return;
    }

    // Seed employees
    const employees = [
      { username: "emp001", password: "SecurePass123!", fullName: "Employee One", idNumber: "EMP001", accountNumber: "EMP001001", email: "emp001@securbank.local" },
      { username: "emp002", password: "SecurePass456!", fullName: "Employee Two", idNumber: "EMP002", accountNumber: "EMP001002", email: "emp002@securbank.local" },
      { username: "emp003", password: "SecurePass789!", fullName: "Employee Three", idNumber: "EMP003", accountNumber: "EMP001003", email: "emp003@securbank.local" },
    ];

    const pepper = ENV.PASSWORD_PEPPER || "";
    const hashedEmployees = await Promise.all(
      employees.map(async (emp) => {
        const pepperedPassword = emp.password + pepper;
        const hashedPassword = await bcrypt.hash(pepperedPassword, 12);
        return {
          username: emp.username,
          fullName: emp.fullName,
          idNumber: emp.idNumber,
          accountNumber: emp.accountNumber,
          email: emp.email,
          passwordHash: hashedPassword,
          passwordHistory: [],
          lockoutInfo: { failedAttempts: 0, lockoutUntil: null, lastAttempt: new Date() },
          lastPasswordChange: new Date(),
        };
      })
    );

    await User.insertMany(hashedEmployees);

    res.json({ 
      success: true, 
      message: "Employees seeded successfully",
      count: hashedEmployees.length,
      employees: employees.map(e => ({ username: e.username, password: e.password }))
    });
  } catch (error) {
    console.error("Seed employees error:", error);
    res.status(500).json({ error: "Failed to seed employees" });
  }
});

export default router;
