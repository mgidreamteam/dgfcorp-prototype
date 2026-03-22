import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load Vite local environment implicitly for the Node script execution context
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

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
const db = getFirestore(app);

const materialsDict = [
    { id: 'mat_al6061', name: 'Aluminum 6061-T6', color: '#B0C4DE', type: 'Metal', roughness: 0.4, metalness: 0.8 },
    { id: 'mat_ti5', name: 'Titanium Grade 5', color: '#8C92AC', type: 'Metal', roughness: 0.5, metalness: 0.7 },
    { id: 'mat_acetal', name: 'Acetal (Delrin)', color: '#F5F5DC', type: 'Polymer', roughness: 0.6, metalness: 0.1 },
    { id: 'mat_stl', name: 'Stainless Steel 304', color: '#D3D3D3', type: 'Metal', roughness: 0.3, metalness: 0.9 },
    { id: 'mat_ny', name: 'Nylon 6/6', color: '#FFFDD0', type: 'Polymer', roughness: 0.7, metalness: 0.05 },
    { id: 'mat_pc', name: 'Polycarbonate', color: '#E0FFFF', type: 'Polymer', roughness: 0.1, metalness: 0.05, opacity: 0.8, transparent: true },
    { id: 'mat_fr4', name: 'FR4 Fiber/Epoxy', color: '#27ae60', type: 'Composite', roughness: 0.8, metalness: 0.1 }
];

async function seedLibrary() {
    console.log("Connecting to MGI-Dream Firestore to inject standard Material Library...");
    for (const mat of materialsDict) {
        await setDoc(doc(db, "materialLibrary", mat.id), mat);
        console.log(`+ Injected: ${mat.name}`);
    }
    console.log("Material Library Synchronization Sequence Complete.");
    process.exit(0);
}

seedLibrary().catch(console.error);
