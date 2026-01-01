import mongoose from 'mongoose';
import { Admin } from '../models/Admin';
import { logger } from '../config/logger';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/architecture-journey';

async function seedAdmin() {
  try {
    await mongoose.connect(MONGODB_URI);
    logger.info('[Seed] Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: 'damolaadegbite0@gmail.com' });
    
    if (existingAdmin) {
      logger.info('[Seed] Admin user already exists');
      process.exit(0);
    }

    // Create admin user
    const admin = new Admin({
      username: 'damola',
      password: 'admin123', // Will be hashed by the pre-save hook
      email: 'damolaadegbite0@gmail.com',
    });

    await admin.save();
    
    logger.info('[Seed] ✅ Admin user created successfully');
    logger.info('[Seed] Email: damolaadegbite0@gmail.com');
    logger.info('[Seed] Username: damola');
    logger.info('[Seed] Password: admin123');
    logger.warn('[Seed] ⚠️  CHANGE THIS PASSWORD IN PRODUCTION!');
    
    process.exit(0);
  } catch (error) {
    logger.error('[Seed] Failed to seed admin:', error);
    process.exit(1);
  }
}

seedAdmin();
