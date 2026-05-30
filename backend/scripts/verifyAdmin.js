import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const verify = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const user = await User.findOne({ email: 'admin@admin.com' });
    if (!user) {
      console.log('User not found');
    } else {
      const pEnv = process.env.ADMIN_PASSWORD;
      const p1 = 'Zeeshan-tahir#279';
      const p2 = 'Admin#123';
      
      console.log(`Checking against env password: '${pEnv}'`);
      const isMatchEnv = await bcrypt.compare(pEnv, user.password);
      const isMatch1 = await bcrypt.compare(p1, user.password);
      const isMatch2 = await bcrypt.compare(p2, user.password);
      
      console.log(`Password Match for env '${pEnv}':`, isMatchEnv);
      console.log(`Password Match for '${p1}':`, isMatch1);
      console.log(`Password Match for '${p2}':`, isMatch2);
      console.log('Current Hash in DB:', user.password);
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

verify();
