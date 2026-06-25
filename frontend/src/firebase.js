import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBiGO62yfMUEDKz8uZS4lh0xBZ7ntpdMf8",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "captain-tailors-shop.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "captain-tailors-shop",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "captain-tailors-shop.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "398984029397",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:398984029397:web:538bf6a35841dd7a592e5c"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export { signInWithPopup, GoogleAuthProvider };
