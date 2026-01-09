// Test setup file - DO NOT RENAME TO .test.ts or .spec.ts
// Set NODE_ENV to test if not already set
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test';
}

import mongoose from 'mongoose';

// Increase timeout for database operations
(jest as any).setTimeout(30000);

// Setup test database connection
beforeAll(async () => {
  try {
    // Use test database - handle connection gracefully
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/test';
    
    // Only connect if MongoDB URI is available and valid
    if (mongoUri && mongoUri.startsWith('mongodb')) {
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 10000, // 10 second timeout
        socketTimeoutMS: 45000,
      });
      console.log('✅ Connected to MongoDB for testing');
    } else {
      console.warn('⚠️ MONGODB_URI not configured, some tests may be skipped');
    }
  } catch (error) {
    console.warn('⚠️ Failed to connect to MongoDB:', error instanceof Error ? error.message : error);
    // Don't fail the test suite if MongoDB isn't available
    // Tests that require MongoDB should check connection state
  }
}, 30000); // 30 second timeout

// Clean up after all tests
afterAll(async () => {
  try {
    // Close all mongoose connections
    if (mongoose.connection.readyState !== 0) {
      // Drop database if connected
      if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
        try {
          await mongoose.connection.db.dropDatabase();
        } catch (e) {
          // Ignore drop errors
        }
      }
      
      // Disconnect mongoose
      await mongoose.disconnect();
      console.log('✅ Disconnected from MongoDB');
    }
  } catch (error) {
    console.warn('⚠️ Failed to clean up MongoDB connection:', error instanceof Error ? error.message : error);
    // Try to force disconnect
    try {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
    } catch (e) {
      // Ignore disconnect errors
    }
  }
}, 15000);

// Clean up after each test
afterEach(async () => {
  try {
    // Only clear collections if connected
    if (mongoose.connection.readyState === 1) {
      const collections = mongoose.connection.collections;
      for (const key in collections) {
        const collection = collections[key];
        await collection.deleteMany({});
      }
    }
  } catch (error) {
    // Ignore cleanup errors
  }
});
