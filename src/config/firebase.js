import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAsWJty_KllZ7-pifWvxRQtpy68skSnVbU",
  authDomain: "mezannutritionai.firebaseapp.com",
  projectId: "mezannutritionai",
  storageBucket: "mezannutritionai.firebasestorage.app",
  messagingSenderId: "588064125160",
  appId: "1:588064125160:web:fe33274963c3e22434995d",
  measurementId: "G-FMGM92L38C"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
