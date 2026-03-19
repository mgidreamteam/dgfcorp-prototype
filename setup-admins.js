import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: "mgi-dream.firebaseapp.com",
  projectId: "mgi-dream",
  storageBucket: "mgi-dream.firebasestorage.app",
  messagingSenderId: "16824413345",
  appId: "1:16824413345:web:fc084fbe8053abac1114e0",
  measurementId: "G-Z0R161WQJ0"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const admins = [
  { email: 'vishnu@dreamgiga.ai', password: 'Password123!', name: 'Vishnu', username: 'vishnu' },
  { email: 'alan@dreamgiga.ai', password: 'Password123!', name: 'Alan', username: 'alan' }
];

async function setupAdmins() {
  for (const admin of admins) {
    let user;
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, admin.email, admin.password);
      user = userCredential.user;
      console.log(`Created Auth user: ${admin.email}`);
    } catch (e) {
      if (e.code === 'auth/email-already-in-use') {
        try {
          const userCredential = await signInWithEmailAndPassword(auth, admin.email, admin.password);
          user = userCredential.user;
          console.log(`Logged into existing Auth user: ${admin.email}`);
        } catch (signInErr) {
            console.error(`Failed to sign into existing user ${admin.email}. Please use the password they registered with, or delete them from the console. Error:`, signInErr.message);
            continue;
        }
      } else {
        console.error(`Failed to auth ${admin.email}:`, e.message);
        continue;
      }
    }

    if (!user) continue;

    try {
      await setDoc(doc(db, 'users', user.uid), {
        name: admin.name,
        address: 'HQ',
        phone: '555-0199',
        username: admin.username,
        email: admin.email,
        role: 'admin',
        status: 'approved',
        updatedAt: new Date().toISOString()
      }, { merge: true });
      console.log(`Successfully created/updated Firestore profile for ${admin.email}.`);
    } catch (e) {
      console.error(`Failed to create Firestore profile for ${admin.email}:`, e.message);
    }
  }
  process.exit(0);
}

setupAdmins();
