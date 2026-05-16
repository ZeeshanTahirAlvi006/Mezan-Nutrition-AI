import 'dotenv/config';
import bcrypt from 'bcryptjs';
import connectDB from '../config/db.js';
import User from '../models/User.js';
import { validatePassword } from '../utils/validatePassword.js';

const run = async () => {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error('CRITICAL: ADMIN_EMAIL and ADMIN_PASSWORD must be set in environment variables.');
    process.exit(1);
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    console.error(passwordError);
    process.exit(1);
  }

  try {
    await connectDB();

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    const existing = await User.findOne({ email });
    if (existing) {
      existing.password = hashedPassword;
      existing.role = 'admin';
      existing.isDisabled = false;
      await existing.save();
      console.log(`Admin updated: ${email}`);
    } else {
      await User.create({
        email,
        password: hashedPassword,
        role: 'admin',
        isDisabled: false,
      });
      console.log(`Admin created: ${email}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Failed to create admin:', error.message);
    process.exit(1);
  }
};

run();
