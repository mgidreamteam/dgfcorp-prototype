import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { auth, db } from '../services/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export interface UserProfile {
  name: string;
  address: string;
  phone: string;
  username: string;
  email: string;
  role: 'admin' | 'user' | 'serviceProvider';
  status: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  username: string | null; 
  profile: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_EMAILS = ['vishnu@dreamgiga.ai', 'alan@dreamgiga.ai'];

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const docRef = doc(db, 'users', firebaseUser.uid);
          const roleRef = doc(db, 'authUidToRole', firebaseUser.uid);
          
          const [docSnap, roleSnap] = await Promise.all([
            getDoc(docRef),
            getDoc(roleRef)
          ]);
          
          let activeRole: 'admin' | 'user' | 'serviceProvider' = 'user';
          if (roleSnap.exists()) {
              const rolesArray = roleSnap.data().roles || [];
              if (rolesArray.includes('admin')) activeRole = 'admin';
              else if (rolesArray.includes('serviceProvider')) activeRole = 'serviceProvider';
          }
          
          // Enforce admin role for specific system emails overriding the DB
          if (firebaseUser.email && ADMIN_EMAILS.includes(firebaseUser.email.toLowerCase()) && activeRole !== 'admin') {
              activeRole = 'admin';
              setDoc(roleRef, { roles: ['admin'] }, { merge: true }).catch(() => {});
          } else if (!roleSnap.exists()) {
              // If the user's role array is missing entirely, cleanly spawn it
              setDoc(roleRef, { roles: ['user'] }, { merge: true }).catch(() => {});
          }

          if (docSnap.exists()) {
             const data = docSnap.data() as UserProfile;
             data.role = activeRole;
             data.status = data.status || 'approved'; // Inherit or default
             setProfile(data);
          } else {
             const fallbackProfile: UserProfile = {
               name: firebaseUser.displayName || 'Unknown User',
               address: '',
               phone: '',
               username: firebaseUser.email?.split('@')[0] || 'user',
               email: firebaseUser.email || '',
               role: activeRole,
               status: 'approved' // Hardcoded emails get an instant bypass
             };
             setProfile(fallbackProfile);
             setDoc(docRef, fallbackProfile, { merge: true }).catch(() => {});
          }
        } catch (error) {
          console.error("Error fetching profile from Firestore", error);
          const fallbackRole = (firebaseUser.email && ADMIN_EMAILS.includes(firebaseUser.email.toLowerCase())) ? 'admin' : 'user';
          // If Firestore is still uninitialized, simulate access locally!
          setProfile({
            name: firebaseUser.displayName || 'Unknown User',
            address: '',
            phone: '',
            username: firebaseUser.email?.split('@')[0] || 'user',
            email: firebaseUser.email || '',
            role: fallbackRole,
            status: 'approved'
          });
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Let onAuthStateChanged handle profile loading
      return true;
    } catch (error) {
      console.error("Login error", error);
      return false;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error", error);
    }
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      username: profile?.username || null,
      profile,
      loading,
      login,
      logout
    }}>
      {!loading ? children : <div className="min-h-screen flex items-center justify-center bg-black text-white">Loading...</div>}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};