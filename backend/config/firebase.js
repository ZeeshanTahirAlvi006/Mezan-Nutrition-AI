import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let serviceAccount;

// Option 1: Load from a full JSON environment variable
if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  } catch (error) {
    console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:', error.message);
  }
} 
// Option 2: Load from individual environment variables
else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
  serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    // Replace literal '\n' characters in the key with actual newlines
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  };
} 
// Option 3: Fallback to reading the local serviceAccountKey.json file
else {
  try {
    const serviceAccountPath = join(__dirname, 'serviceAccountKey.json');
    serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
  } catch (error) {
    console.warn('Warning: serviceAccountKey.json not found and no Firebase environment variables set. Firebase Admin SDK might fail to initialize.', error.message);
  }
}

if (serviceAccount) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} else {
  // Try initializing with Application Default Credentials (ADC) as a fallback
  try {
    admin.initializeApp();
    console.log('Firebase initialized using Application Default Credentials (ADC).');
  } catch (error) {
    console.error('Firebase Admin could not be initialized: No credentials provided.', error.message);
  }
}

const db = admin.firestore();
const auth = admin.auth();

export { admin, db, auth };
