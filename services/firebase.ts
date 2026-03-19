import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: (import.meta as any).env.VITE_FIREBASE_API_KEY,
  authDomain: "mgi-dream.firebaseapp.com",
  projectId: "mgi-dream",
  storageBucket: "mgi-dream.firebasestorage.app",
  messagingSenderId: "16824413345",
  appId: "1:16824413345:web:fc084fbe8053abac1114e0",
  measurementId: "G-Z0R161WQJ0"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
