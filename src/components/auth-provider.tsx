
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, User as FirebaseUser } from 'firebase/auth';
import { doc, setDoc, getDoc, onSnapshot, collection, addDoc, Unsubscribe, query, where, writeBatch, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { FamilyMember, User } from '@/lib/data';
import { useRouter } from 'next/navigation';
import { initializeDefaultData } from '@/lib/dataService';

interface AuthContextType {
  user: User | null;
  familyId: string | null;
  familyMembers: FamilyMember[];
  loading: boolean;
  signup: (email: string, pass: string, name: string, role: 'Anne' | 'Baba') => Promise<void>;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  addFamilyMember: (memberData: Omit<FamilyMember, 'id'>) => Promise<void>;
  createFamilyAndAddMember: (memberName: string, memberRole: 'Anne' | 'Baba') => Promise<void>;
  joinFamilyWithId: (familyId: string, memberName: string, memberRole: 'Anne' | 'Baba' | 'Kız Çocuk' | 'Erkek Çocuk' | 'Bebek') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const auth = getAuth();

  useEffect(() => {
    let familyUnsubscribe: Unsubscribe | null = null;

    const authUnsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (familyUnsubscribe) {
        familyUnsubscribe();
        familyUnsubscribe = null;
      }
      
      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userUnsubscribe = onSnapshot(userDocRef, (userDoc) => {
            if (userDoc.exists()) {
                const userData = userDoc.data() as User;
                setUser(userData);
                setFamilyId(userData.familyId || null);

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
                // Document doesn't exist, log out the user.
                setUser(null); 
                setFamilyId(null);
                setLoading(false);
            }
        }, (error) => {
             console.error("Error fetching user data:", error);
             setUser(null);
             setFamilyId(null);
             setFamilyMembers([]);
             setLoading(false);
        });
        return () => userUnsubscribe();
      } else {
        setUser(null);
        setFamilyId(null);
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
    if (!user || !familyId) throw new Error("Kullanıcı veya aile bilgisi bulunamadı.");
    
    const familyDocRef = doc(db, 'families', familyId);
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

    if (!firebaseUser || !firebaseUser.uid) {
        throw new Error("Firebase kullanıcısı oluşturulamadı.");
    }
    
    const newUser: User = {
        uid: firebaseUser.uid,
        email: firebaseUser.email!,
        name,
        familyId: null, // familyId is null initially
    };
    
    const userDocRef = doc(db, 'users', firebaseUser.uid);
    await setDoc(userDocRef, newUser);
  };

  const createFamilyAndAddMember = async (memberName: string, memberRole: 'Anne' | 'Baba') => {
    if (!user) throw new Error("Giriş yapmış bir kullanıcı yok.");

    const newMember: FamilyMember = {
        id: user.uid,
        name: memberName,
        role: memberRole,
        avatar: memberRole === 'Baba' ? '/avatars/dad.png' : '/avatars/mom.png',
        color: memberRole === 'Baba' ? '#3B82F6' : '#EC4899',
        completedTasks: 0,
        level: 1,
        xp: 0,
        streak: 0,
        badges: [],
        mood: 'happy',
        status: 'online',
    };

    const familyDocRef = await addDoc(collection(db, 'families'), {
        members: [newMember],
        defaultDataInitialized: false,
    });
    
    if (!familyDocRef.id) {
        throw new Error("Aile belgesi oluşturulamadı.");
    }
    
    const userDocRef = doc(db, 'users', user.uid);
    await updateDoc(userDocRef, { familyId: familyDocRef.id });

    await initializeDefaultData(familyDocRef.id, user.uid);
  };
  
  const joinFamilyWithId = async (familyIdToJoin: string, memberName: string, memberRole: 'Anne' | 'Baba' | 'Kız Çocuk' | 'Erkek Çocuk' | 'Bebek') => {
    if (!user) throw new Error("Giriş yapmış bir kullanıcı yok.");

    const familyDocRef = doc(db, 'families', familyIdToJoin);
    const familyDocSnap = await getDoc(familyDocRef);

    if (!familyDocSnap.exists()) {
        throw new Error("Geçersiz Aile ID'si. Lütfen kontrol edin.");
    }

    const newMember: FamilyMember = {
        id: user.uid,
        name: memberName,
        role: memberRole,
        avatar: roleBasedAvatars[memberRole] || 'https://placehold.co/64x64.png',
        color: roleBasedColors[memberRole] || '#6b7280',
        completedTasks: 0,
        level: 1,
        xp: 0,
        streak: 0,
        badges: [],
        mood: 'happy',
        status: 'online',
    };

    await updateDoc(familyDocRef, {
        members: arrayUnion(newMember)
    });
    
    const userDocRef = doc(db, 'users', user.uid);
    await updateDoc(userDocRef, { familyId: familyIdToJoin });
  };
  
  const roleBasedAvatars: Record<string, string> = {
    Baba: '/avatars/dad.png',
    Anne: '/avatars/mom.png',
    'Erkek Çocuk': '/avatars/boy.png',
    'Kız Çocuk': '/avatars/girl.png',
    Bebek: '/avatars/baby.png',
  };

  const roleBasedColors: Record<string, string> = {
      Baba: '#3B82F6',
      Anne: '#EC4899',
      'Kız Çocuk': '#8B5CF6',
      'Erkek Çocuk': '#14B8A6',
      Bebek: '#F59E0B',
  };

  const logout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  const value = { user, familyId, familyMembers, loading, signup, login, logout, addFamilyMember, createFamilyAndAddMember, joinFamilyWithId };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
