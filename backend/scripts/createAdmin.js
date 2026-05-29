import 'dotenv/config';
import { auth, db } from '../config/firebase.js';
import { validatePassword } from '../utils/validatePassword.js';

const run = async () => {
  const email = "admin@admin.com";
  const password = "Admin#123";

  if (!email || !password) {
    console.error('CRITICAL: ADMIN_EMAIL and ADMIN_PASSWORD must be set in environment variables.');
    process.exit(1);
  }

  // const passwordError = validatePassword(password);
  // if (passwordError) {
  //   console.error(passwordError);
  //   process.exit(1);
  // }

  try {
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(email);
      userRecord = await auth.updateUser(userRecord.uid, { password });
      console.log(`Admin Firebase Auth password updated: ${email}`);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        userRecord = await auth.createUser({
          email,
          password,
          emailVerified: true,
        });
        console.log(`Admin Firebase Auth user created: ${email}`);
      } else {
        throw error;
      }
    }

    const userRef = db.collection('users').doc(userRecord.uid);
    const profileData = {
      email,
      role: 'admin',
      isDisabled: false,
      updatedAt: new Date(),
    };

    const existingProfile = await userRef.get();
    if (!existingProfile.exists) {
      profileData.createdAt = new Date();
    }

    await userRef.set(profileData, { merge: true });
    console.log(`Admin profile created/updated in Firestore: ${userRecord.uid}`);

    process.exit(0);
  } catch (error) {
    console.error('Failed to create admin:', error.message || error);
    process.exit(1);
  }
};

run();
