import mongoose from "mongoose";
import { User } from "./models/User";
import { passwordSecurity } from "./utils/passwordSecurity";
import { ENV } from "./config/env";

// Employee data to seed
const employees = [
  {
    employeeNumber: "EMP001",
    fullName: "John Smith",
    email: "john.smith@securbank.internal",
    username: "jsmith",
    idNumber: "EMP001",
    accountNumber: "10000001",
    password: "Emp001!Xy7$QaL2",
  },
  {
    employeeNumber: "EMP002",
    fullName: "Sarah Johnson",
    email: "sarah.johnson@securbank.internal",
    username: "sjohnson",
    idNumber: "EMP002",
    accountNumber: "10000002",
    password: "Emp002@Zr9%TuB4",
  },
  {
    employeeNumber: "EMP003",
    fullName: "Michael Chen",
    email: "michael.chen@securbank.internal",
    username: "mchen",
    idNumber: "EMP003",
    accountNumber: "10000003",
    password: "Emp003#Vw6&GpN8",
  },
];

async function seedEmployees() {
  try {
    // Connect to MongoDB
    if (!ENV.MONGODB_URI || !ENV.MONGODB_URI.startsWith("mongodb")) {
      console.error("❌ MONGODB_URI is not set or invalid");
      process.exit(1);
    }

    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(ENV.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
    console.log("✅ Connected to MongoDB");

    // Clear existing employee users (optional - comment out if you want to keep existing)
    // await User.deleteMany({ idNumber: { $regex: /^EMP/ } });
    // console.log("🧹 Cleared existing employee users");

    console.log("\n📝 Seeding employee accounts...");
    console.log("🔒 Security measures:");
    console.log("   • bcrypt hashing with 12 salt rounds (unique salt per password)");
    console.log("   • Pepper (additional secret) added before hashing");
    console.log("   • Password strength validation");
    console.log("   • Breach database checking");
    console.log("   • Password history tracking\n");

    for (const emp of employees) {
      // Check if employee already exists
      const existing = await User.findOne({
        $or: [
          { username: emp.username },
          { email: emp.email },
          { idNumber: emp.idNumber },
          { accountNumber: emp.accountNumber },
        ],
      });

      if (existing) {
        console.log(`⚠️  Employee ${emp.employeeNumber} (${emp.fullName}) already exists - skipping`);
        continue;
      }

      // Validate password strength before hashing
      const strengthResult = passwordSecurity.checkPasswordStrength(emp.password);
      if (!strengthResult.isStrong) {
        console.error(`❌ Password for ${emp.employeeNumber} does not meet security requirements:`);
        console.error(`   ${strengthResult.feedback.join(", ")}`);
        continue;
      }

      // Check if password is in breach database
      const isBreached = await passwordSecurity.isPasswordBreached(emp.password);
      if (isBreached) {
        console.error(`❌ Password for ${emp.employeeNumber} has been found in data breaches`);
        continue;
      }

      // Hash password with bcrypt (12 salt rounds) + pepper
      // bcrypt automatically generates a unique salt for each hash
      console.log(`   🔐 Hashing password with bcrypt (12 salt rounds) + pepper...`);
      const passwordHash = await passwordSecurity.hashPassword(emp.password);
      
      // Verify the hash works correctly
      const hashVerified = await passwordSecurity.verifyPassword(emp.password, passwordHash);
      if (!hashVerified) {
        console.error(`❌ Password hash verification failed for ${emp.employeeNumber}`);
        continue;
      }
      console.log(`   ✅ Password hash verified (bcrypt + salt + pepper)`);

      // Add to password history
      const passwordHistory = await passwordSecurity.addToPasswordHistory(emp.password);

      // Create user
      const user = await User.create({
        username: emp.username,
        fullName: emp.fullName,
        idNumber: emp.idNumber,
        accountNumber: emp.accountNumber,
        email: emp.email,
        passwordHash,
        passwordHistory,
        lastPasswordChange: new Date(),
        lockoutInfo: {
          failedAttempts: 0,
          lockoutUntil: undefined,
          lastAttempt: new Date(),
        },
      });

      console.log(`✅ Created employee: ${emp.employeeNumber} - ${emp.fullName}`);
      console.log(`   Username: ${emp.username}`);
      console.log(`   Employee Number: ${emp.idNumber}`);
      console.log(`   Password: ${emp.password} (hashed with bcrypt + salt + pepper)`);
      console.log(`   Hash preview: ${passwordHash.substring(0, 20)}...`);
      console.log(`   Email: ${emp.email}\n`);
    }

    console.log("\n✨ Employee seeding completed!");
    console.log("\n📋 Login Credentials Summary:");
    console.log("=" .repeat(60));
    employees.forEach((emp) => {
      console.log(`\nEmployee Number: ${emp.employeeNumber}`);
      console.log(`  Name: ${emp.fullName}`);
      console.log(`  Username: ${emp.username}`);
      console.log(`  Password: ${emp.password}`);
    });
    console.log("\n" + "=".repeat(60));

    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding employees:", error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the seed function
seedEmployees();

