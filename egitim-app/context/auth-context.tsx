import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, onSnapshot, Unsubscribe, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

export interface UserProfile {
    id: string;
    email: string;
    name: string;
    role: 'student' | 'teacher';
    teacherCode?: string;
    teacherIds?: string[];
    studentIds?: string[];
}

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  signup: (email: string, pass: string, name: string, role: 'student' | 'teacher') => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    let profileUnsubscribe: Unsubscribe | null = null;

    const authUnsubscribe = onAuthStateChanged(auth, (user) => {
      if (profileUnsubscribe) profileUnsubscribe();

      if (user) {
        setFirebaseUser(user);
        const userDocRef = doc(db, 'users', user.uid);
        profileUnsubscribe = onSnapshot(userDocRef, (userDoc) => {
          if (userDoc.exists()) {
            setProfile(userDoc.data() as UserProfile);
          } else {
             setProfile(null);
          }
          setLoading(false);
        });
      } else {
        setFirebaseUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      authUnsubscribe();
      if (profileUnsubscribe) profileUnsubscribe();
    };
  }, []);

  const login = (email: string, pass: string) => signInWithEmailAndPassword(auth, email, pass).then(() => {});
  
  const signup = async (email: string, pass: string, name: string, role: 'student' | 'teacher') => {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
            let teacherCode = undefined;
        if (role === 'teacher') {
            teacherCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        }
        await setDoc(doc(db, 'users', cred.user.uid), {
            id: cred.user.uid,
            email,
            name,
            role,
            ...(teacherCode ? { teacherCode, studentIds: [] } : { teacherIds: [] })
        });
  };

  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ firebaseUser, profile, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};



