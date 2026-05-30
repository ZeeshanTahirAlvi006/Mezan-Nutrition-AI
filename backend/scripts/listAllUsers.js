import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import connectDB from '../config/db.js';
import User from '../models/User.js';

const run = async () => {
  try {
    await connectDB();
    const users = await User.find({});
    console.log("ALL USERS IN DATABASE:");
    users.forEach(u => {
      console.log(`- ID: ${u._id}, Email: ${u.email}, Role: ${u.role}, Disabled: ${u.isDisabled}, Name: ${u.name}`);
    });
    process.exit(0);
  } catch (err) {
    console.error("Failed to list users:", err);
    process.exit(1);
  }
};

run();
