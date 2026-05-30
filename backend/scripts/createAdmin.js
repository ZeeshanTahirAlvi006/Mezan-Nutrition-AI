import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import connectDB from '../config/db.js';
import User from '../models/User.js';

const run = async () => {
  const email = process.env.ADMIN_EMAIL || "admin@admin.com";
  const password = process.env.ADMIN_PASSWORD || "Admin#123";

  if (!email || !password) {
    console.error('CRITICAL: ADMIN_EMAIL and ADMIN_PASSWORD must be set in environment variables.');
    process.exit(1);
  }

  try {
    await connectDB();
    console.log('Connected to database...');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: email.toLowerCase() });

    if (existingAdmin) {
      // Update existing admin
      existingAdmin.role = 'admin';
      existingAdmin.isDisabled = false;
      existingAdmin.password = password; // Will be hashed by pre-save hook
      existingAdmin.name = 'System Admin';
      existingAdmin.age = 30;
      existingAdmin.weight = 75;
      existingAdmin.height = 175;
      await existingAdmin.save();
      console.log(`Admin account updated: ${email} (ID: ${existingAdmin._id})`);
    } else {
      // Create new admin
      const admin = await User.create({
        email: email.toLowerCase(),
        password,
        name: 'System Admin',
        role: 'admin',
        isDisabled: false,
        age: 30,
        weight: 75,
        height: 175,
        healthGoals: 'Maintenance',
        location: 'UAE'
      });
      console.log(`New admin user created: ${email} (ID: ${admin._id})`);
    }

    console.log('Process completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Failed to create admin:', error.message || error);
    process.exit(1);
  }
};


run();
