
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, User as FirebaseUser } from 'firebase/auth';
import { doc, setDoc, getDoc, onSnapshot, collection, addDoc, Unsubscribe } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { FamilyMember, User } from '@/lib/data';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  familyMembers: FamilyMember[];
  loading: boolean;
  signup: (email: string, pass: string, name: string, role: 'Anne' | 'Baba') => Promise<void>;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  addFamilyMember: (memberData: Omit<FamilyMember, 'id'>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const auth = getAuth();

  useEffect(() => {
    let familyUnsubscribe: Unsubscribe | null = null;

    const authUnsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (familyUnsubscribe) {
        familyUnsubscribe();
        familyUnsubscribe = null;
      }
      
      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        try {
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const userData = userDocSnap.data() as User;
            setUser(userData);

            if (userData.familyId) {
              const familyDocRef = doc(db, 'families', userData.familyId);
              familyUnsubscribe = onSnapshot(familyDocRef, (doc) => {
                if (doc.exists()) {
                  setFamilyMembers(doc.data().members || []);
                } else {
                  setFamilyMembers([]);
                }
                 setLoading(false);
              });
            } else {
              setFamilyMembers([]);
              setLoading(false);
            }
          } else {
            await signOut(auth);
            setUser(null);
            setFamilyMembers([]);
            setLoading(false);
          }
        } catch (error) {
           console.error("Error fetching user data:", error);
           await signOut(auth);
           setUser(null);
           setFamilyMembers([]);
           setLoading(false);
        }
      } else {
        setUser(null);
        setFamilyMembers([]);
        setLoading(false);
      }
    });

    return () => {
      authUnsubscribe();
      if (familyUnsubscribe) {
        familyUnsubscribe();
      }
    };
  }, [auth]);

  const login = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };
  
  const addFamilyMember = async (memberData: Omit<FamilyMember, 'id'>) => {
    if (!user || !user.familyId) throw new Error("Kullanıcı veya aile bilgisi bulunamadı.");
    
    const familyDocRef = doc(db, 'families', user.familyId);
    const familyDocSnap = await getDoc(familyDocRef);

    if (familyDocSnap.exists()) {
      const familyData = familyDocSnap.data();
      const newMember = { ...memberData, id: Date.now().toString() };
      const updatedMembers = [...(familyData.members || []), newMember];
      await setDoc(familyDocRef, { members: updatedMembers }, { merge: true });
    }
  };


  const signup = async (email: string, pass: string, name: string, role: 'Anne' | 'Baba') => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    const firebaseUser = userCredential.user;

    const newMember: FamilyMember = {
        id: firebaseUser.uid, // Use UID for parent's member ID as well for consistency
        name,
        role,
        avatar: role === 'Baba' ? '/avatars/dad.png' : '/avatars/mom.png',
        completedTasks: 0,
        color: role === 'Baba' ? '#3B82F6' : '#EC4899',
        level: 1,
        xp: 0,
        streak: 0,
        badges: [],
        mood: 'happy',
        status: 'online',
    };

    // Create a new family document with the first member in a single operation
    const familyDocRef = await addDoc(collection(db, 'families'), {
        members: [newMember]
    });

    // Create user document
    const userDocRef = doc(db, 'users', firebaseUser.uid);
    const newUser: User = {
        uid: firebaseUser.uid,
        email: firebaseUser.email!,
        name,
        familyId: familyDocRef.id,
    };
    
    await setDoc(userDocRef, newUser);
  };

  const logout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  const value = { user, familyMembers, loading, signup, login, logout, addFamilyMember };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
