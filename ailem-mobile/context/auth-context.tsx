import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { useRouter, useSegments } from 'expo-router';
import { auth, db } from '../lib/firebase';
import type { FamilyMember } from '../lib/data';

interface AuthContextType {
  user: FirebaseUser | null;
  familyId: string | null;
  familyName: string | null;
  familyMembers: FamilyMember[];
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  signup: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [familyName, setFamilyName] = useState<string | null>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    let familyUnsubscribe: Unsubscribe | null = null;
    let userUnsubscribe: Unsubscribe | null = null;

    const authUnsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (userUnsubscribe) userUnsubscribe();
      if (familyUnsubscribe) familyUnsubscribe();

      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        userUnsubscribe = onSnapshot(userDocRef, (userDoc) => {
          if (familyUnsubscribe) familyUnsubscribe();

          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUser(firebaseUser);
            setFamilyId(userData.familyId || null);

            if (userData.familyId) {
              const familyDocRef = doc(db, 'families', userData.familyId);
              familyUnsubscribe = onSnapshot(familyDocRef, (docSnap) => {
                if (docSnap.exists()) {
                  setFamilyMembers(docSnap.data().members || []);
                  setFamilyName(docSnap.data().name || '');
                } else {
                  setFamilyMembers([]);
                  setFamilyName(null);
                }
                setLoading(false);
              }, () => setLoading(false));
            } else {
              setFamilyMembers([]);
              setFamilyName(null);
              setLoading(false);
            }
          } else {
            setUser(firebaseUser);
            setFamilyId(null);
            setFamilyName(null);
            setLoading(false);
          }
        }, () => {
             setUser(null);
             setFamilyId(null);
             setFamilyName(null);
             setFamilyMembers([]);
             setLoading(false);
        });
      } else {
        setUser(null);
        setFamilyId(null);
        setFamilyName(null);
        setFamilyMembers([]);
        setLoading(false);
      }
    });

    return () => {
      authUnsubscribe();
      if (userUnsubscribe) userUnsubscribe();
      if (familyUnsubscribe) familyUnsubscribe();
    };
  }, []);

  const login = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const signup = async (email: string, pass: string) => {
    await createUserWithEmailAndPassword(auth, email, pass);
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, familyId, familyName, familyMembers, loading, login, signup, logout }}>
      <AuthGuard>{children}</AuthGuard>
    </AuthContext.Provider>
  );
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === 'login' || segments[0] === 'signup';

    if (!user && !inAuthGroup) {
      router.replace('/login');
    } else if (user && inAuthGroup) {
      router.replace('/');
    }
  }, [user, loading, segments]);

  return <>{children}</>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
