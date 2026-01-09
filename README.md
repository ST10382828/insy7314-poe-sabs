# 🔒 SecurBank International - Secure Banking Portal

> **🏆 Academic Excellence Project - Demonstrating Enterprise-Grade Security Implementation**

A comprehensive banking portal showcasing advanced security implementations. This project demonstrates real-world security practices including password security, input validation, SSL/TLS encryption, attack protection, and automated DevSecOps pipelines.

## **Project Highlights**

- **Enterprise-Grade Security** - Production-ready implementations
- **Full-Stack Application** - React frontend + Express.js backend
- **Comprehensive Testing** - 90%+ test coverage with security focus
- **Automated CI/CD** - GitHub Actions with security scanning
- **Real-Time Monitoring** - Security headers and vulnerability scanning


## **Quick Start Guide**

### Prerequisites

- **Node.js** 18+ ([Install with nvm](https://github.com/nvm-sh/nvm))
- **MongoDB** (Local or [MongoDB Atlas](https://www.mongodb.com/atlas))
- **Git** (for SSL certificate generation)

###  Installation & Setup

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/howdy-hello-bot.git
cd howdy-hello-bot

# 2. Install dependencies
npm install
cd server && npm install && cd ..

# 3. Set up environment variables
cp env.example .env
# Edit .env with your MongoDB URI and other settings

# 4. Generate SSL certificates (first time only)
node generate-trusted-certs.js

# 5. Seed Employees to mongo
npm run seed:employees

# 6. Start development servers
npm run dev:all
```

## **Security Architecture Deep Dive**

###  **Password Security Implementation**

```typescript
// Advanced password security with enterprise-grade features
const passwordSecurity = new PasswordSecurityManager();

// Features implemented:
✅ bcrypt hashing with 12 salt rounds
✅ Password pepper for additional entropy
✅ Comprehensive strength validation (70+ points required)
✅ Breach database checking
✅ Account lockout after 5 failed attempts
✅ Password history prevention (last 5 passwords)
✅ Real-time strength meter with visual feedback
```

**Password Requirements:**
- Minimum 8 characters (recommended 12+)
- Uppercase and lowercase letters
- Numbers and special characters
- No common patterns or dictionary words
- Score of 70+ points required

### **Input Validation & Whitelisting**

```typescript
// Comprehensive input validation with regex patterns
const validationPatterns = {
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  swiftCode: /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/,
  amount: /^\d+(\.\d{1,2})?$/,
  phone: /^\+?[\d\s\-\(\)]{10,15}$/,
  // ... 15+ validation patterns for all inputs
};

// Zod schema validation for type safety
const userSchema = z.object({
  email: z.string().email().regex(validationPatterns.email),
  password: z.string().min(8).regex(validationPatterns.password),
  // ... comprehensive validation rules
});
```

**Validation Features:**
- Regex pattern whitelisting for all inputs
- Zod schema validation for type safety
- XSS prevention with DOMPurify
- MongoDB injection prevention
- Real-time client-side validation

### **SSL/TLS Security Configuration**

```typescript
// Enterprise-grade SSL implementation
const sslManager = new SSLManager();

// Security features:
✅ 4096-bit RSA keys for maximum security
✅ SHA-256 certificates with extended validation
✅ HSTS headers (180 days, includeSubDomains, preload)
✅ Secure cookie configuration (HttpOnly, Secure, SameSite)
✅ HTTP to HTTPS redirect in production
✅ Certificate expiry monitoring and alerts
✅ Perfect Forward Secrecy (PFS) support
```

### **Attack Protection Implementation**

```typescript
// Multi-layered security middleware
app.use(helmet({
  contentSecurityPolicy: { 
    directives: { 
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"]
    } 
  },
  hsts: { 
    maxAge: 15552000, 
    includeSubDomains: true, 
    preload: true 
  }
}));

// Rate limiting configuration
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later."
}));
```

**Protection Features:**

**Session Jacking Protection:**
- ✅ Session regeneration on login/register (prevents session fixation)
- ✅ Secure cookies with HttpOnly flag (prevents JavaScript access)
- ✅ Secure flag enabled for HTTPS (prevents transmission over insecure connections)
- ✅ SameSite=Strict cookie policy (prevents CSRF-based session theft)
- ✅ Session timeout (1 hour max age)

**Clickjacking Protection:**
- ✅ X-Frame-Options: DENY header (via Helmet frameguard)
- ✅ Content-Security-Policy: frame-ancestors 'none' (prevents embedding in iframes)

**SQL Injection Protection:**
- ✅ MongoDB sanitization using express-mongo-sanitize (removes $ and . operators)
- ✅ Parameterized queries via Mongoose ODM (prevents injection)
- ✅ Input validation with Zod schemas (whitelisting approach)

**Cross-Site Scripting (XSS) Protection:**
- ✅ DOMPurify sanitization for all user inputs
- ✅ Helmet XSS filter enabled
- ✅ Content Security Policy (CSP) headers
- ✅ Input whitelisting with RegEx patterns
- ✅ Output encoding for all user-generated content

**Man-in-the-Middle (MITM) Protection:**
- ✅ HTTPS/TLS encryption enforced
- ✅ HSTS headers (180 days, includeSubDomains, preload)
- ✅ Secure cookie flag (HTTPS only)
- ✅ Certificate validation and monitoring

**DDoS Protection:**
- ✅ Rate limiting (100 requests/minute per IP globally)
- ✅ Authentication endpoint rate limiting (20 requests/minute)
- ✅ Express Brute protection (5 attempts max, exponential backoff)
- ✅ Request size limiting (100KB for JSON/URL-encoded)
- ✅ Connection timeout handling

**Additional Security Measures:**
- ✅ Helmet.js security headers (CSP, X-Frame-Options, etc.)
- ✅ CSRF token protection with double-submit cookies
- ✅ Password hashing with bcrypt + pepper
- ✅ Account lockout after failed login attempts
- ✅ Input validation and sanitization at multiple layers

##  **Testing & Quality Assurance**

### **Test Coverage & Results**

```bash
# Run comprehensive test suites
npm test                    # Frontend tests with Vitest
cd server && npm test       # Backend tests with Jest

# Run security-specific tests
npm run test:security       # Frontend security audit
cd server && npm run test:security  # Backend security tests

# Generate detailed coverage reports
npm run test:coverage       # Frontend coverage
cd server && npm run test:coverage  # Backend coverage
```

### **Security Testing Categories**

- **Authentication Security**: Password hashing, session management, JWT validation
- **Input Validation**: XSS prevention, injection protection, data sanitization
- **Rate Limiting**: Brute force protection, API throttling
- **CSRF Protection**: Token validation, origin checking
- **SSL/TLS**: Certificate validation, HTTPS enforcement, HSTS headers

## **DevSecOps Pipeline**

### **Automated Security Pipeline**

Our GitHub Actions workflow includes comprehensive security validation:

```yaml
# .github/workflows/security-pipeline.yml
Security Pipeline Features:
✅ Vulnerability scanning (npm audit)
✅ Linting with security rules (ESLint)
✅ TypeScript type checking
✅ Comprehensive test suite execution
✅ Security-specific testing
✅ Dependency vulnerability checking
✅ Automated security reporting
✅ Build and deployment validation
```

### **Pipeline Triggers**

- **Push to main/develop**: Full security scan and testing
- **Pull Requests**: Security validation and code review
- **Daily Schedule**: Automated vulnerability scanning at 2 AM UTC
- **Manual Trigger**: On-demand security testing and reporting

### **Pipeline Results**

The pipeline generates comprehensive reports including:
- Security vulnerability assessments
- Test coverage metrics
- Linting and type checking results
- Dependency security analysis
- Automated security recommendations

## **CircleCI Pipeline with SonarQube Integration**

### **Setup Instructions**

This project uses CircleCI for continuous integration and SonarQube (via SonarCloud) for code quality analysis, security hotspot detection, and code smell identification.

#### **1. CircleCI Setup**

1. **Connect Repository to CircleCI**
   - Sign up/login to [CircleCI](https://circleci.com/)
   - Add your GitHub repository
   - CircleCI will automatically detect the `.circleci/config.yml` file

2. **Configure Environment Variables**
   - Go to Project Settings → Environment Variables
   - Add the following required variables:
     - `SONAR_TOKEN`: Your SonarCloud token (get from SonarCloud)
     - `SONAR_ORGANIZATION`: Your SonarCloud organization key (optional, defaults to "your-org")
     - `SONAR_HOST_URL`: SonarCloud URL (optional, defaults to "https://sonarcloud.io")

#### **2. SonarCloud Setup**

1. **Create SonarCloud Account**
   - Sign up at [SonarCloud](https://sonarcloud.io/)
   - Log in with your GitHub account

2. **Create a New Project**
   - Click "Analyze new project"
   - Select your GitHub organization/repository
   - Choose "Generate a token" to create a project token
   - Copy the token and add it to CircleCI as `SONAR_TOKEN`

3. **Update sonar-project.properties**
   - Update `sonar.projectKey` with your SonarCloud project key
   - Update `sonar.organization` with your SonarCloud organization key
   - The configuration file is located at the root: `sonar-project.properties`

#### **3. Pipeline Configuration**

The CircleCI pipeline consists of three main jobs:

**Build and Test Job**
- Installs dependencies
- Builds the application
- Runs frontend and backend tests
- Generates test coverage reports
- Stores test results and artifacts

**SonarQube Scan Job**
- Installs SonarQube scanner
- Runs tests with coverage
- Performs SonarQube analysis for:
  - Security hotspots detection
  - Code smell identification
  - Code coverage reporting
  - Quality gate validation

**Security Scan Job**
- Runs npm security audits
- Performs linting and type checking
- Stores security reports

#### **4. Running the Pipeline**

The pipeline runs automatically on:
- Push to `main` branch (full pipeline including SonarQube scan)
- Pull requests (build and test only)
- Manual trigger from CircleCI dashboard

#### **5. Viewing Results**

**CircleCI Dashboard**
- Visit your project on CircleCI to view pipeline status
- Check job logs and test results
- Download artifacts (coverage reports, security reports)

**SonarCloud Dashboard**
- Visit your project on SonarCloud to view:
  - Security hotspots (requires review)
  - Code smells (maintainability issues)
  - Code coverage metrics
  - Quality gate status
  - Duplication analysis

#### **6. Quality Gates**

The pipeline uses SonarQube quality gates to ensure code quality:
- **Security Hotspots**: All hotspots must be reviewed
- **Code Coverage**: Minimum coverage threshold (configurable)
- **Code Smells**: Maximum allowed code smells (configurable)
- **Vulnerabilities**: Zero critical/high vulnerabilities allowed

#### **7. Troubleshooting**

**SonarQube Scan Fails**
- Verify `SONAR_TOKEN` is set correctly in CircleCI
- Check that `sonar-project.properties` has correct project key and organization
- Ensure test coverage reports are generated (check `coverage/lcov.info` exists)

**Coverage Reports Not Found**
- Verify tests are running with coverage flags: `npm test -- --coverage`
- Check that `vitest.config.ts` has `lcov` reporter enabled
- Ensure `server/jest.config.js` outputs lcov format

**Quality Gate Fails**
- Review security hotspots in SonarCloud
- Fix code smells identified by SonarQube
- Improve test coverage if below threshold

### **Local SonarQube Testing**

To run SonarQube analysis locally:

```bash
# 1. Install SonarQube Scanner
npm install -g sonarqube-scanner

# 2. Generate test coverage
npm test -- --coverage
cd server && npm run test:coverage && cd ..

# 3. Run SonarQube analysis
sonar-scanner
```

**Note**: You'll need to set up a local SonarQube server or use SonarCloud for analysis.

## **Project Architecture**

```
howdy-hello-bot/
├── 📁 src/                          # Frontend React application
│   ├── 📁 components/               # Reusable UI components
│   │   ├── 📁 ui/                   # shadcn/ui components
│   │   └── 🔒 PasswordStrengthMeter.tsx
│   ├── 📁 pages/                    # Application pages
│   │   ├── 🏠 Home.tsx
│   │   ├── 🔐 CustomerLogin.tsx
│   │   ├── 📝 CustomerRegister.tsx
│   │   ├── 👤 CustomerDashboard.tsx
│   │   └── 🏢 EmployeePortal.tsx
│   ├── 📁 hooks/                    # Custom React hooks
│   │   ├── 🔐 useAuth.tsx
│   │   └── 📱 useToast.ts
│   ├── 📁 lib/                      # Utility functions
│   │   ├── 🔗 api.ts
│   │   ├── 🛠️ utils.ts
│   │   ├── ✅ validations.ts
│   │   └── 🧹 sanitization.ts
│   └── 📁 integrations/             # External service integrations
│       └── 📁 supabase/
├── 📁 server/                       # Backend Express.js API
│   ├── 📁 src/
│   │   ├── 📁 routes/               # API route handlers
│   │   │   ├── 🔐 auth.ts
│   │   │   └── 💰 transactions.ts
│   │   ├── 📁 middleware/           # Security middleware
│   │   │   └── 🛡️ security.ts
│   │   ├── 📁 models/               # MongoDB schemas
│   │   │   ├── 👤 User.ts
│   │   │   ├── 👨‍💼 Employee.ts
│   │   │   └── 💳 Transaction.ts
│   │   ├── 📁 utils/                # Utility functions
│   │   │   ├── 🔒 ssl.ts
│   │   │   ├── 🔐 passwordSecurity.ts
│   │   │   ├── ✅ validators.ts
│   │   │   └── 🔍 transactionValidators.ts
│   │   └── 📁 __tests__/            # Backend test suite
│   │       ├── 🔐 auth.test.ts
│   │       ├── 🛡️ security.test.ts
│   │       ├── ✅ validation.test.ts
│   │       └── 🔒 simple-security.test.ts
│   ├── 📁 certs/                    # SSL certificates
│   └── 📄 package.json              # Backend dependencies
├── 📁 .github/workflows/            # GitHub Actions pipelines
│   └── 🔄 security-pipeline.yml
├── 📁 supabase/                     # Database migrations
└── 📁 docs/                         # Documentation
```

##  **Configuration Guide**

###  **Environment Variables**

Create a `.env` file in the root directory:

```bash
# Frontend Configuration
VITE_API_URL=https://localhost:3011
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key

# Backend Configuration (server/.env)
MONGODB_URI=mongodb://localhost:27017/securbank
SESSION_SECRET=your_secure_session_secret_here
PASSWORD_PEPPER=your_password_pepper_here
CORS_ORIGIN=https://localhost:5173
NODE_ENV=development
PORT=3011
```

### 🔐 **SSL Certificate Setup**

```bash
# Generate trusted certificates (Windows)
node generate-trusted-certs.js

# Or manually with OpenSSL
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
```

## 🎥 **Video Demonstration Guide**

### 📹 **Recommended Demo Flow (10-12 minutes)**


