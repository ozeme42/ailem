
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, User as FirebaseUser } from 'firebase/auth';
import { doc, setDoc, getDoc, onSnapshot, collection, addDoc, Unsubscribe, query, where, writeBatch, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { FamilyMember, User } from '@/lib/data';
import { usePathname, useRouter } from 'next/navigation';
import { initializeDefaultData, updateFamilyMemberInFamily, migrateOrphanBooks } from '@/lib/dataService';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { MobileNavbar } from '@/components/mobile-navbar';
import { Skeleton } from './ui/skeleton';

interface AuthContextType {
  user: User | null;
  familyId: string | null;
  familyMembers: FamilyMember[];
  loading: boolean;
  signup: (email: string, pass: string, name: string, role: 'Anne' | 'Baba') => Promise<void>;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  addFamilyMember: (memberData: Omit<FamilyMember, 'id'>) => Promise<void>;
  updateFamilyMember: (memberId: string, memberData: Partial<FamilyMember>) => Promise<void>;
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
  const pathname = usePathname();

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
                    // Trigger one-time migration for orphan books
                    migrateOrphanBooks(userData.familyId);

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
  
  const updateFamilyMember = async (memberId: string, memberData: Partial<FamilyMember>) => {
      if (!familyId) throw new Error("Aile bilgisi bulunamadı.");
      await updateFamilyMemberInFamily(familyId, memberId, memberData);
  }


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

  const roleBasedColors: Record<string, string> = {
      Baba: '#3B82F6',
      Anne: '#EC4899',
      'Kız Çocuk': '#8B5CF6',
      'Erkek Çocuk': '#14B8A6',
      Bebek: '#F59E0B',
  };

  const createFamilyAndAddMember = async (memberName: string, memberRole: 'Anne' | 'Baba') => {
    if (!user) throw new Error("Giriş yapmış bir kullanıcı yok.");

    const newMember: FamilyMember = {
        id: user.uid,
        name: memberName,
        role: memberRole,
        avatar: memberName.charAt(0).toUpperCase(),
        color: roleBasedColors[memberRole] || '#6b7280',
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
        avatar: memberName.charAt(0).toUpperCase(),
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
  

  const logout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  const authContextValue = { user, familyId, familyMembers, loading, signup, login, logout, addFamilyMember, createFamilyAndAddMember, joinFamilyWithId, updateFamilyMember };

  // App Layout Logic
  const authRoutes = ['/login', '/signup'];
  const isAuthRoute = authRoutes.includes(pathname);
  const isJoinFamilyRoute = pathname === '/join-family';
  
  useEffect(() => {
    if (loading) return;

    if (!user && !isAuthRoute) {
      router.push('/login');
    } else if (user && isAuthRoute) {
      router.push('/');
    } else if (user && !familyId && !isJoinFamilyRoute) {
      router.push('/join-family');
    } else if (user && familyId && isJoinFamilyRoute) {
       router.push('/');
    }
  }, [user, familyId, loading, isAuthRoute, isJoinFamilyRoute, router, pathname]);

  if (loading || (!user && !isAuthRoute) || (user && !familyId && !isJoinFamilyRoute)) {
     return (
      <div className="flex h-screen w-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <p className="text-2xl font-bold text-primary">Ailem</p>
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
     )
  }

  if (isAuthRoute || isJoinFamilyRoute) {
    return <AuthContext.Provider value={authContextValue}>{children}</AuthContext.Provider>;
  }


  return (
    <AuthContext.Provider value={authContextValue}>
        <SidebarProvider defaultOpen={true}>
            <AppSidebar />
            <SidebarInset>
                <main className="p-4 sm:p-6 lg:p-8 pb-24 md:pb-8 h-full">
                {children}
                </main>
            </SidebarInset>
            <MobileNavbar />
        </SidebarProvider>
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
