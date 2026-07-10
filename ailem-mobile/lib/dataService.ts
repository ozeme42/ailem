import { db, storage } from './firebase';
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, setDoc, writeBatch, query, where, onSnapshot, arrayUnion, arrayRemove, orderBy, limit, Unsubscribe, serverTimestamp } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import type { Book, Task, CalendarEvent, ShoppingList, ShoppingItem, Test, PracticeExam, MealPlan, Recipe, User, FamilyMember, UserLibrary, UserLibraryBook, BookReadingStatus, Mistake, StudyPlan, StudyAssignment, Goal, GoalSection, ReadingSession, AmbientSound, MemorizationItem, MemorizationProgress, Notebook, Note, PrayerProgress, Video, CalorieLog, DailyTracking, BankQuestion, TrackedBook, TrackedBookTest, BudgetCategory, PomodoroProject, PomodoroSession, Summary, PerformanceGoal, Bill, TransactionTemplate, Transaction, Account, QuickTestQuestion, Deck, Flashcard } from './data';
import { syncLocalNotifications } from './notificationService';
import { isPast, parseISO, isSameDay, subDays, format, startOfWeek, endOfWeek, subWeeks, isWithinInterval, differenceInDays, startOfMonth, endOfMonth, isFuture, subMonths, addMonths, parse } from 'date-fns';
import { tr } from 'date-fns/locale';

// --- UTILS ---
const getCurrentFamilyId = async (): Promise<string | null> => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return null;
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    return userDoc.data()?.familyId || null;
}

export function safeParseDate(dateStr: any): Date {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) return dateStr;
  if (typeof dateStr !== 'string') return new Date(dateStr) || new Date();
  
  // Try ISO parse
  try {
    const parsedDate = parseISO(dateStr);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate;
    }
  } catch (e) {}

  // Try parsing direct Date
  try {
    const parsedDate = new Date(dateStr);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate;
    }
  } catch (e) {}

  // Try custom Turkish format e.g. "15 Ağustos 2024" or "01 Ağustos 2024"
  try {
    const parsedDate = parse(dateStr, 'dd MMMM yyyy', new Date(), { locale: tr });
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate;
    }
  } catch (e) {}

  try {
    const parsedDate = parse(dateStr, 'd MMMM yyyy', new Date(), { locale: tr });
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate;
    }
  } catch (e) {}

  try {
    const parsedDate = parse(dateStr, 'yyyy-MM-dd', new Date());
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate;
    }
  } catch (e) {}

  return new Date();
}

function removeUndefined(obj: any): any {
  if (obj === null || obj === undefined) return undefined;
  if (Array.isArray(obj)) return obj.map(removeUndefined);
  if (typeof obj === 'object') {
    const newObj: { [key: string]: any } = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key];
        if (value !== undefined) {
          const cleanedValue = removeUndefined(value);
          if (cleanedValue !== undefined) newObj[key] = cleanedValue;
        }
      }
    }
    return newObj;
  }
  return obj;
}

const onFamilyDataUpdate = <T>(
    collectionName: string,
    callback: (data: T[]) => void,
    runOnce = false,
    orderByField?: string,
    orderByDirection?: 'desc' | 'asc'
): (() => void) => {
    const auth = getAuth();
    let unsubscribe: Unsubscribe | null = null;
    
    const authUnsubscribe = onAuthStateChanged(auth, async (user) => {
        if (unsubscribe) { unsubscribe(); unsubscribe = null; }
        if (user) {
            try {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                const familyId = userDoc.exists() ? userDoc.data().familyId : null;
                if (familyId) {
                    let q = query(collection(db, collectionName), where("familyId", "==", familyId));
                    if (orderByField) q = query(q, orderBy(orderByField, orderByDirection || 'asc'));
                    if (runOnce) {
                        const snapshot = await getDocs(q);
                        callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T)));
                    } else {
                        unsubscribe = onSnapshot(q, (snapshot) => {
                            callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T)));
                        });
                    }
                } else callback([]);
            } catch (error) { callback([]); }
        } else callback([]);
    });
    return () => { authUnsubscribe(); if (unsubscribe) unsubscribe(); };
};

// --- FAMILY MEMBERS ---
export const updateFamilyMemberInFamily = async (familyId: string, memberId: string, memberData: Partial<FamilyMember>) => {
  const familyRef = doc(db, 'families', familyId);
  const familySnap = await getDoc(familyRef);
  if (familySnap.exists()) {
    const members = familySnap.data().members || [];
    const memberIndex = members.findIndex((m: any) => m.id === memberId);
    if (memberIndex > -1) {
      members[memberIndex] = { ...members[memberIndex], ...memberData };
      await updateDoc(familyRef, { members });
    }
  }
};

// --- PERFORMANCE GOALS ---
export const onPerformanceGoalsUpdate = (memberId: string, callback: (goals: PerformanceGoal[]) => void) => {
    const q = query(collection(db, 'performanceGoals'), where('memberId', '==', memberId));
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PerformanceGoal)));
    });
};
export const addPerformanceGoal = async (data: Omit<PerformanceGoal, 'id' | 'familyId' | 'createdAt'>) => {
    const familyId = await getCurrentFamilyId();
    if (!familyId) throw new Error("User not in a family");
    return addDoc(collection(db, 'performanceGoals'), { ...removeUndefined(data), familyId, createdAt: new Date().toISOString() });
};
export const updatePerformanceGoal = (id: string, data: Partial<PerformanceGoal>) => updateDoc(doc(db, 'performanceGoals', id), removeUndefined(data));
export const deletePerformanceGoal = (id: string) => deleteDoc(doc(db, "performanceGoals", id));

// --- BILLS ---
export const onBillsUpdate = (callback: (bills: Bill[]) => void, runOnce = false) => onFamilyDataUpdate<Bill>('bills', callback, runOnce);
export const addBill = async (data: Omit<Bill, 'id' | 'familyId'>) => {
    const familyId = await getCurrentFamilyId();
    if (!familyId) throw new Error("User not in a family");
    return addDoc(collection(db, 'bills'), { ...removeUndefined(data), familyId });
};
export const updateBill = (id: string, data: Partial<Bill>) => updateDoc(doc(db, 'bills', id), removeUndefined(data));
export const deleteBill = (id: string) => deleteDoc(doc(db, "bills", id));

// --- TRANSACTION TEMPLATES ---
export const onTransactionTemplatesUpdate = (callback: (templates: TransactionTemplate[]) => void, runOnce = false) => onFamilyDataUpdate<TransactionTemplate>('transactionTemplates', callback, runOnce);
export const addTransactionTemplate = async (data: Omit<TransactionTemplate, 'id' | 'familyId'>) => {
    const familyId = await getCurrentFamilyId();
    if (!familyId) throw new Error("User not in a family");
    return addDoc(collection(db, 'transactionTemplates'), { ...removeUndefined(data), familyId });
};
export const updateTransactionTemplate = (id: string, data: Partial<TransactionTemplate>) => updateDoc(doc(db, "transactionTemplates", id), removeUndefined(data));
export const deleteTransactionTemplate = (id: string) => deleteDoc(doc(db, "transactionTemplates", id));


// --- BOOKS & LIBRARY ---
export const onBooksUpdate = (callback: (books: Book[]) => void, runOnce = false) => onFamilyDataUpdate<Book>('mediaItems', callback, runOnce);
export const addBook = async (data: Omit<Book, 'id' | 'familyId' | 'createdAt'>) => {
    const familyId = await getCurrentFamilyId();
    if (!familyId) throw new Error("User not in a family");
    return addDoc(collection(db, 'mediaItems'), { ...data, familyId, createdAt: new Date().toISOString() });
};
export const updateBook = async (id: string, data: Partial<Omit<Book, 'id' | 'familyId' | 'createdAt'>>) => updateDoc(doc(db, 'mediaItems', id), removeUndefined(data));
export const deleteBook = (id: string) => deleteDoc(doc(db, "mediaItems", id));

export const onUserLibrariesUpdate = (familyId: string, callback: (libs: UserLibrary[]) => void) => {
    const q = query(collection(db, 'userLibraries'), where("familyId", "==", familyId));
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserLibrary)));
    });
};
export const onSingleUserLibraryUpdate = (uid: string, cb: (lib: UserLibrary | null) => void) => onSnapshot(doc(db, 'userLibraries', uid), d => cb(d.exists() ? d.data() as UserLibrary : null));
export const addBookToMemberLibrary = async (fid: string, mid: string, bid: string) => {
    // 1. Üyeye ait var olan kütüphane belgesini bul (ID'si mid olmayabilir!)
    const q = query(collection(db, 'userLibraries'), where("memberId", "==", mid));
    const querySnapshot = await getDocs(q);
    
    let libRef;
    let books: any[] = [];
    
    if (!querySnapshot.empty) {
        const existingDoc = querySnapshot.docs[0];
        libRef = doc(db, 'userLibraries', existingDoc.id);
        books = existingDoc.data().books || [];
    } else {
        libRef = doc(db, 'userLibraries', mid);
    }
    
    // Kitap daha önce eklenmiş mi kontrol et
    const existingBook = books.find((b: any) => b.bookId === bid);
    
    let result = "added";
    if (existingBook) {
        result = "exists_" + existingBook.status; // exists_to-read, exists_reading, exists_finished
    } else {
        const newBook: UserLibraryBook = { bookId: bid, status: 'to-read', addedAt: new Date().toISOString(), progress: 0 };
        books.push(newBook);
        await setDoc(libRef, { familyId: fid, memberId: mid, books }, { merge: true });
    }

    // mediaItems koleksiyonundaki readers dizisini de güncelle
    const bookRef = doc(db, 'mediaItems', bid);
    const bookSnap = await getDoc(bookRef);
    if (bookSnap.exists()) {
        await updateDoc(bookRef, { readers: arrayUnion(mid) });
    }
    
    return result;
};

export const removeBookFromMemberLibrary = async (fid: string, mid: string, bid: string) => {
    const q = query(collection(db, 'userLibraries'), where("memberId", "==", mid));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return;

    for (const libDoc of querySnapshot.docs) {
        const books = libDoc.data().books || [];
        const filteredBooks = books.filter((b: any) => b.bookId !== bid);
        if (books.length !== filteredBooks.length) {
            const libRef = doc(db, 'userLibraries', libDoc.id);
            await updateDoc(libRef, { books: filteredBooks });
        }
    }

    // mediaItems koleksiyonundaki readers dizisinden çıkar
    const bookRef = doc(db, 'mediaItems', bid);
    const bookSnap = await getDoc(bookRef);
    if (bookSnap.exists()) {
        await updateDoc(bookRef, { readers: arrayRemove(mid) });
    }
};

export const updateUserBookStatus = async (fid: string, mid: string, bid: string, status: string, progress?: number, summaryImages?: string | string[]) => {
    const q = query(collection(db, 'userLibraries'), where("memberId", "==", mid));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return;

    for (const libDoc of querySnapshot.docs) {
        const books = libDoc.data().books || [];
        const idx = books.findIndex((b: any) => b.bookId === bid);
        
        if (idx !== -1) {
            books[idx] = { ...books[idx], status, progress: progress ?? books[idx].progress };
            
            if (summaryImages !== undefined) {
                if (Array.isArray(summaryImages)) {
                    books[idx].summaryImageUrls = summaryImages;
                    // Legacy support
                    if (summaryImages.length > 0) {
                        books[idx].summaryImageUrl = summaryImages[0];
                    } else {
                        delete books[idx].summaryImageUrl;
                        delete books[idx].summaryImageUrls;
                    }
                } else {
                    books[idx].summaryImageUrl = summaryImages;
                    books[idx].summaryImageUrls = [summaryImages];
                }
            }
            
            // Okunuyor durumuna geçtiyse ve başlama tarihi yoksa ekle
            if (status === 'reading' && !books[idx].startedAt) {
                books[idx].startedAt = new Date().toISOString();
            }
            
            // Bitti durumuna geçtiyse bitiş tarihini ve %100 ilerlemeyi kaydet
            if (status === 'finished') {
                books[idx].finishedAt = new Date().toISOString();
            }
            
            const libRef = doc(db, 'userLibraries', libDoc.id);
            await updateDoc(libRef, { books });
            return; // Bulduk ve güncelledik, diğer fragmanlara bakmaya gerek yok
        }
    }
};

export const getUserBookProgress = async (memberId: string, bookId: string): Promise<number> => {
    try {
        const q = query(collection(db, 'userLibraries'), where("memberId", "==", memberId));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
            const libDoc = snapshot.docs[0];
            const books = libDoc.data().books || [];
            const book = books.find((b: any) => b.bookId === bookId);
            if (book && book.progress) {
                return book.progress;
            }
        }
    } catch (err) {
        console.error("Error fetching user book progress:", err);
    }
    return 0;
};

import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

export const uploadImageToStorage = async (file: File, path: string): Promise<string> => {
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
};

export const uploadFileToStorage = async (file: File, path: string): Promise<string> => {
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
};

export const deleteFileFromStorage = async (fileUrl: string): Promise<void> => {
    try {
        if (!fileUrl.includes('firebasestorage.googleapis.com')) return;
        const storageRef = ref(storage, fileUrl);
        await deleteObject(storageRef);
    } catch (error) {
        console.error("Storage'dan dosya silinirken hata:", error);
    }
};

// --- VIDEOS ---
export const onVideosUpdate = (callback: (videos: Video[]) => void, runOnce = false) => onFamilyDataUpdate<Video>('videos', callback, runOnce);
export const addVideo = async (data: Omit<Video, 'id' | 'familyId' | 'createdAt'>) => {
    const familyId = await getCurrentFamilyId();
    if (!familyId) throw new Error("User not in a family");
    return addDoc(collection(db, 'videos'), { ...data, familyId, createdAt: new Date().toISOString() });
};
export const updateVideo = (id: string, data: Partial<Omit<Video, 'id' | 'familyId'>>) => updateDoc(doc(db, 'videos', id), removeUndefined(data));
export const deleteVideo = (id: string) => deleteDoc(doc(db, "videos", id));

// --- TASKS ---
export const onTasksUpdate = (callback: (tasks: Task[]) => void) => onFamilyDataUpdate<Task>('tasks', callback);
export const addTask = async (data: Omit<Task, 'id' | 'familyId' | 'createdAt'>) => {
    const familyId = await getCurrentFamilyId();
    if (!familyId) throw new Error("User not in a family");
    return addDoc(collection(db, 'tasks'), { ...data, familyId, createdAt: new Date().toISOString() });
};
export const updateTask = async (id: string, data: Partial<Task>) => updateDoc(doc(db, 'tasks', id), removeUndefined(data));
export const deleteTask = (id: string) => deleteDoc(doc(db, "tasks", id));

// --- CALENDAR ---
export const onCalendarEventsUpdate = (callback: (events: CalendarEvent[]) => void) => {
  return onFamilyDataUpdate<CalendarEvent>('calendarEvents', (events) => {
    syncLocalNotifications(events).catch(e => console.error("Notification sync error:", e));
    callback(events);
  });
};
export const addCalendarEvent = async (data: Omit<CalendarEvent, 'id' | 'familyId'>) => {
    const familyId = await getCurrentFamilyId();
    if (!familyId) throw new Error("User not in a family");
    return addDoc(collection(db, 'calendarEvents'), removeUndefined({ ...data, familyId }));
};
export const updateCalendarEvent = (id: string, data: Partial<Omit<CalendarEvent, 'id' | 'familyId'>>) => updateDoc(doc(db, 'calendarEvents', id), removeUndefined(data));
export const deleteCalendarEvent = (id: string) => deleteDoc(doc(db, "calendarEvents", id));

// --- TESTS ---
export const onTestsUpdate = (callback: (tests: Test[]) => void, runOnce = false, orderByField = 'assignedDate', orderByDirection: 'asc' | 'desc' = 'desc') => 
    onFamilyDataUpdate<Test>('tests', callback, runOnce, orderByField, orderByDirection);

export const addTest = async (data: Omit<Test, 'id' | 'familyId' | 'questions'>, questionsForSubcollection?: (BankQuestion | QuickTestQuestion)[]) => {
    const familyId = await getCurrentFamilyId();
    if (!familyId) throw new Error("User not in a family");
    const testDocRef = doc(collection(db, 'tests'));
    let openEnded = data.openEnded || questionsForSubcollection?.some(q => 'type' in q && q.type === 'open_ended') || false;
    const mainTestData = { ...data, familyId, openEnded, gradingType: openEnded ? 'manual' : 'auto' };
    await setDoc(testDocRef, removeUndefined(mainTestData));
    if (questionsForSubcollection?.length) {
        const batch = writeBatch(db);
        questionsForSubcollection.forEach((q, idx) => {
            const qRef = doc(collection(testDocRef, 'questions'));
            batch.set(qRef, { 
                questionId: 'id' in q ? q.id : ('questionId' in q ? q.questionId : ''), 
                questionNumber: idx + 1, 
                imageUrl: q.imageUrl || '',
                correctAnswer: q.correctAnswer || '',
                options: q.options || {},
                type: q.type || 'mcq'
            });
        });
        await batch.commit();
    }
};
export const updateTest = async (id: string, data: Partial<Omit<Test, 'id' | 'familyId' | 'questions'>>) => updateDoc(doc(db, 'tests', id), removeUndefined(data));
export const onTestQuestionsUpdate = (testId: string, callback: (questions: any[]) => void) => {
    return onSnapshot(
        query(collection(db, 'tests', testId, 'questions'), orderBy('questionNumber', 'asc')),
        s => callback(s.docs.map(d => ({ id: d.id, ...d.data() } as any)))
    );
};
export const deleteTest = async (id: string, fileUrl?: string) => {
    if (fileUrl) {
        await deleteFileFromStorage(fileUrl);
    }
    return deleteDoc(doc(db, "tests", id));
};

// --- GOALS ---
export const onGoalsUpdate = (callback: (goals: Goal[]) => void) => onFamilyDataUpdate<Goal>('goals', callback);
export const getGoal = async (goalId: string): Promise<Goal | null> => {
    const snap = await getDoc(doc(db, 'goals', goalId));
    return snap.exists() ? { id: snap.id, ...snap.data() } as Goal : null;
};
export const addGoal = async (data: Omit<Goal, 'id' | 'familyId' | 'createdAt' | 'status'>) => {
    const familyId = await getCurrentFamilyId();
    const user = getAuth().currentUser;
    if (!familyId || !user) throw new Error("Unauthorized");
    return addDoc(collection(db, 'goals'), { ...data, familyId, creatorId: user.uid, createdAt: new Date().toISOString(), status: 'in-progress', sections: data.sections.map((s, i) => ({ ...s, id: Date.now().toString() + i, status: 'unlocked', completedUnits: 0 })) });
};
export const updateGoal = async (id: string, data: Partial<Omit<Goal, 'id' | 'familyId' | 'creatorId' | 'createdAt'>>) => updateDoc(doc(db, 'goals', id), removeUndefined(data));
export const deleteGoal = (id: string) => deleteDoc(doc(db, "goals", id));

// --- TRACKED BOOKS ---
export const onTrackedBooksUpdate = (callback: (books: TrackedBook[]) => void, runOnce = false) => onFamilyDataUpdate<TrackedBook>('trackedBooks', callback, runOnce);
export const onTrackedBookUpdate = (id: string, cb: (b: TrackedBook | null) => void) => onSnapshot(doc(db, 'trackedBooks', id), d => cb(d.exists() ? {id:d.id, ...d.data()} as any : null));
export const addTrackedBook = async (data: Pick<TrackedBook, 'title' | 'publisher' | 'bookType'>) => {
    const familyId = await getCurrentFamilyId();
    if (!familyId) throw new Error("Unauthorized");
    return addDoc(collection(db, 'trackedBooks'), { ...data, familyId, subjects: [], createdAt: new Date().toISOString() });
};
export const updateTrackedBook = (id: string, data: Partial<Omit<TrackedBook, 'id' | 'familyId'>>) => setDoc(doc(db, 'trackedBooks', id), removeUndefined(data), { merge: true });
export const deleteTrackedBook = (id: string) => deleteDoc(doc(db, "trackedBooks", id));

export const onAllTrackedBookTestsUpdate = (callback: (tests: TrackedBookTest[]) => void) => onFamilyDataUpdate<TrackedBookTest>('trackedBookTests', callback);
export const onTrackedBookTestsUpdate = (id: string, cb: (t: TrackedBookTest[]) => void) => onSnapshot(query(collection(db, 'trackedBookTests'), where('bookId', '==', id)), s => cb(s.docs.map(d => ({id:d.id, ...d.data()} as any))));
export const addTrackedBookTest = async (id: string, data: any) => { const familyId = await getCurrentFamilyId(); return addDoc(collection(db, 'trackedBookTests'), { ...data, familyId, bookId: id }); };
export const updateTrackedBookTest = (id: string, data: any) => updateDoc(doc(db, 'trackedBookTests', id), data);
export const deleteTrackedBookTest = (id: string) => deleteDoc(doc(db, 'trackedBookTests', id));

export const addBulkTrackedBookTests = async (bid: string, sid: string, tid: string, count: number, qCount: number, prefix: string) => {
    const familyId = await getCurrentFamilyId();
    if (!familyId) return;
    const batch = writeBatch(db);
    for (let i = 1; i <= count; i++) {
        const ref = doc(collection(db, 'trackedBookTests'));
        batch.set(ref, { bookId: bid, subjectId: sid, topicId: tid, familyId, name: `${prefix} ${i}`, questionCount: qCount });
    }
    await batch.commit();
};

export const deleteTrackedBookTopic = async (bid: string, sid: string, tid: string) => {
    const bookRef = doc(db, 'trackedBooks', bid);
    const snap = await getDoc(bookRef);
    if (!snap.exists()) return;
    const subjects = snap.data().subjects || [];
    const sIdx = subjects.findIndex((s: any) => s.id === sid);
    if (sIdx !== -1) {
        subjects[sIdx].topics = (subjects[sIdx].topics || []).filter((t: any) => t.id !== tid);
        await updateDoc(bookRef, { subjects });
    }
};
export const deleteTrackedBookSubject = async (bid: string, sid: string) => {
    const bookRef = doc(db, 'trackedBooks', bid);
    const snap = await getDoc(bookRef);
    if (!snap.exists()) return;
    const subjects = (snap.data().subjects || []).filter((s: any) => s.id !== sid);
    await updateDoc(bookRef, { subjects });
};

// --- STUDY PLANS & ASSIGNMENTS ---
export const onStudyPlansUpdate = (callback: (plans: StudyPlan[]) => void) => onFamilyDataUpdate<StudyPlan>('studyPlans', callback);
export const onStudyAssignmentsUpdate = (callback: (assignments: StudyAssignment[]) => void) => onFamilyDataUpdate<StudyAssignment>('studyAssignments', callback);
export const addStudyAssignment = async (data: Omit<StudyAssignment, 'id' | 'familyId' | 'status'>) => {
    const familyId = await getCurrentFamilyId();
    if (!familyId) throw new Error("Unauthorized");
    return addDoc(collection(db, 'studyAssignments'), { ...data, status: 'assigned', familyId });
};
export const deleteStudyAssignment = (id: string) => deleteDoc(doc(db, 'studyAssignments', id));
export const updateStudyAssignment = (id: string, data: Partial<Omit<StudyAssignment, 'id' | 'familyId'>>) => updateDoc(doc(db, 'studyAssignments', id), removeUndefined(data));
export const addStudyPlan = async (data: Omit<StudyPlan, 'id' | 'familyId'>) => {
    const familyId = await getCurrentFamilyId();
    if (!familyId) throw new Error("Unauthorized");
    return addDoc(collection(db, 'studyPlans'), { ...data, familyId, createdAt: new Date().toISOString() });
};
export const updateStudyPlan = (id: string, data: any) => updateDoc(doc(db, 'studyPlans', id), removeUndefined(data));
export const deleteStudyPlan = (id: string) => deleteDoc(doc(db, "studyPlans", id));
export const onStudyPlanUpdate = (id: string, cb: (p: StudyPlan | null) => void) => onSnapshot(doc(db, 'studyPlans', id), d => cb(d.exists() ? {id:d.id, ...d.data()} as any : null));

// --- SUMMARIES ---
export const onSummariesUpdate = (cb: (s: Summary[]) => void) => onFamilyDataUpdate<Summary>('summaries', cb);
export const addSummary = async (data: any) => { const familyId = await getCurrentFamilyId(); return addDoc(collection(db, 'summaries'), { ...data, familyId, createdAt: new Date().toISOString() }); };
export const updateSummary = (id: string, data: any) => updateDoc(doc(db, 'summaries', id), removeUndefined(data));
export const deleteSummary = (id: string) => deleteDoc(doc(db, 'summaries', id));

// --- NOTEBOOKS ---
export const onNotebookDetailsUpdate = (id: string, cb: (d: any) => void) => onSnapshot(doc(db, 'notebooks', id), async (d) => {
    if (!d.exists()) return cb(null);
    const notebook = { id: d.id, ...d.data() } as any;
    const q = query(collection(db, 'notes'), where('notebookId', '==', id));
    const snap = await getDocs(q);
    cb({ notebook, notes: snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) });
});

// --- BANK QUESTIONS ---
export const onBankQuestionsUpdate = (callback: (questions: BankQuestion[]) => void) => onFamilyDataUpdate<BankQuestion>('bankQuestions', callback);
export const addBankQuestion = async (data: any) => { const familyId = await getCurrentFamilyId(); return addDoc(collection(db, 'bankQuestions'), { ...data, familyId, createdAt: new Date().toISOString() }); };
export const updateBankQuestion = (id: string, data: any) => updateDoc(doc(db, 'bankQuestions', id), removeUndefined(data));
export const deleteBankQuestion = (id: string) => deleteDoc(doc(db, 'bankQuestions', id));
export const addBulkBankQuestions = async (questions: any[]) => {
    const familyId = await getCurrentFamilyId();
    if (!familyId) return;
    const batch = writeBatch(db);
    questions.forEach(q => {
        const ref = doc(collection(db, 'bankQuestions'));
        batch.set(ref, { ...q, familyId, createdAt: new Date().toISOString() });
    });
    await batch.commit();
};
export const deleteBulkBankQuestions = async (ids: string[]) => {
    const batch = writeBatch(db);
    ids.forEach(id => batch.delete(doc(db, 'bankQuestions', id)));
    await batch.commit();
};

// --- MISTAKES ---
export const onMistakesUpdate = (cb: (m: Mistake[]) => void) => onFamilyDataUpdate<Mistake>('mistakes', cb);
export const addMistake = async (data: any) => { const familyId = await getCurrentFamilyId(); return addDoc(collection(db, 'mistakes'), { ...data, familyId, status: 'active', createdAt: new Date().toISOString() }); };
export const deleteMistake = (id: string) => deleteDoc(doc(db, 'mistakes', id));

// --- PRACTICE EXAMS ---
export const onPracticeExamsUpdate = (cb: (e: PracticeExam[]) => void) => onFamilyDataUpdate<PracticeExam>('practiceExams', cb);
export const onSinglePracticeExamUpdate = (id: string, cb: (e: PracticeExam | null) => void) => onSnapshot(doc(db, 'practiceExams', id), d => cb(d.exists() ? {id:d.id, ...d.data()} as any : null));
export const addPracticeExam = async (data: any) => { const familyId = await getCurrentFamilyId(); return addDoc(collection(db, 'practiceExams'), { ...data, familyId }); };
export const updatePracticeExam = (id: string, data: any) => updateDoc(doc(db, 'practiceExams', id), removeUndefined(data));
export const deletePracticeExam = (id: string) => deleteDoc(doc(db, "practiceExams", id));

// --- BUDGET ---
export const onBudgetCategoriesUpdate = (cb: (c: BudgetCategory[]) => void) => onFamilyDataUpdate<BudgetCategory>('budgetCategories', cb);
export const addBudgetCategory = async (data: any) => { const familyId = await getCurrentFamilyId(); return addDoc(collection(db, 'budgetCategories'), { ...data, familyId }); };
export const updateBudgetCategory = (id: string, data: any) => updateDoc(doc(db, 'budgetCategories', id), data);
export const deleteBudgetCategory = (id: string) => deleteDoc(doc(db, 'budgetCategories', id));

export const onTransactionsUpdate = (cb: (t: Transaction[]) => void, s: Date, e: Date) => onFamilyDataUpdate<Transaction>('transactions', cb);
export const onTransactionStatsUpdate = (cb: (s: any) => void) => onFamilyDataUpdate<any>('transactions', (docs) => {
    const stats: any = {};
    docs.forEach(t => {
        const month = t.date.substring(0, 7);
        if (!stats[month]) stats[month] = { income: 0, expense: 0 };
        if (t.type === 'income') stats[month].income += t.amount;
        else stats[month].expense += t.amount;
    });
    cb(stats);
});
export const onAccountsUpdate = (cb: (a: Account[]) => void) => onFamilyDataUpdate<Account>('accounts', cb);
export const addAccount = async (data: any) => { const familyId = await getCurrentFamilyId(); return addDoc(collection(db, 'accounts'), { ...data, familyId }); };
export const updateAccount = (id: string, data: any) => updateDoc(doc(db, 'accounts', id), removeUndefined(data));
export const deleteAccount = (id: string) => deleteDoc(doc(db, 'accounts', id));

export const addTransaction = async (data: any) => { 
    const familyId = await getCurrentFamilyId(); 
    const auth = getAuth();
    const user = auth.currentUser;
    return addDoc(collection(db, 'transactions'), { ...data, familyId, ownerId: user?.uid }); 
};
export const updateTransaction = (id: string, data: any) => updateDoc(doc(db, 'transactions', id), removeUndefined(data));
export const deleteTransaction = (id: string) => deleteDoc(doc(db, 'transactions', id));

// --- POMODORO ---
export const onPomodoroProjectsUpdate = (uid: string, cb: (p: PomodoroProject[]) => void) => onSnapshot(query(collection(db, 'pomodoroProjects'), where('memberId', '==', uid)), s => cb(s.docs.map(d => ({id:d.id, ...d.data()} as any))));
export const onPomodoroSessionsForUserUpdate = (uid: string, cb: (s: PomodoroSession[]) => void) => onSnapshot(query(collection(db, 'pomodoroSessions'), where('memberId', '==', uid)), s => cb(s.docs.map(d => ({id:d.id, ...d.data()} as any))));
export const addPomodoroProject = async (data: any) => { const familyId = await getCurrentFamilyId(); return addDoc(collection(db, 'pomodoroProjects'), { ...data, familyId, createdAt: new Date().toISOString() }); };
export const deletePomodoroProject = (id: string) => deleteDoc(doc(db, 'pomodoroProjects', id));
export const addPomodoroSession = async (data: any) => { const familyId = await getCurrentFamilyId(); return addDoc(collection(db, 'pomodoroSessions'), { ...data, familyId }); };

// --- DAILY TRACKING ---
export const onDailyTrackingsUpdate = (fid: string, mid: string, cb: (t: DailyTracking[]) => void) => onSnapshot(query(collection(db, 'dailyTrackings'), where('familyId', '==', fid), where('memberId', '==', mid)), s => cb(s.docs.map(d => ({id:d.id, ...d.data()} as any))));
export const setDailyTrackingStatus = async (mid: string, item: any, d: Date, checked: boolean) => {
    const familyId = await getCurrentFamilyId();
    if (!familyId) return;
    const dateKey = format(d, 'yyyy-MM-dd');
    const trackingId = `${mid}_${item.id}_${dateKey}`;
    if (checked) {
        await setDoc(doc(db, 'dailyTrackings', trackingId), { familyId, memberId: mid, itemId: item.id, itemType: item.type, date: dateKey });
    } else {
        await deleteDoc(doc(db, 'dailyTrackings', trackingId));
    }
};

// --- NOTES ---
export const onNotesUpdate = (cb: (n: Note[]) => void) => onFamilyDataUpdate<Note>('notes', cb);
export const onNotebooksUpdate = (cb: (n: Notebook[]) => void) => onFamilyDataUpdate<Notebook>('notebooks', cb);
export const addNotebook = async (data: any) => { const familyId = await getCurrentFamilyId(); const user = getAuth().currentUser; return addDoc(collection(db, 'notebooks'), { ...data, familyId, ownerId: user?.uid, createdAt: new Date().toISOString() }); };
export const updateNotebook = (id: string, data: any) => updateDoc(doc(db, 'notebooks', id), data);
export const deleteNotebook = (id: string) => deleteDoc(doc(db, 'notebooks', id));
export const addNoteToSection = async (fid: string, nbid: string, sid: string, data: any) => addDoc(collection(db, 'notes'), { ...data, familyId: fid, notebookId: nbid, sectionId: sid, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
export const updateNoteInSection = (nbid: string, nid: string, data: any) => updateDoc(doc(db, 'notes', nid), { ...data, updatedAt: new Date().toISOString() });
export const deleteNoteFromSection = (nid: string) => deleteDoc(doc(db, 'notes', nid));

// --- HABITS & RECURRENCE ---
export const updateHabitCompletion = async (taskId: string, day: Date, isCompleted: boolean) => {
    const taskRef = doc(db, 'tasks', taskId);
    const snap = await getDoc(taskRef);
    if (!snap.exists()) return;
    const taskData = snap.data() as Task;
    const dayKey = format(day, 'yyyy-MM-dd');
    const allDates = new Set(taskData.completedDates || []);
    if (isCompleted) allDates.add(dayKey); else allDates.delete(dayKey);
    const completedDates = Array.from(allDates).sort();
    let streak = 0;
    if (isCompleted && taskData.recurrenceType === 'daily') {
        let checkDate = new Date(day);
        while (allDates.has(format(checkDate, 'yyyy-MM-dd'))) { streak++; checkDate = subDays(checkDate, 1); }
    }
    await updateDoc(taskRef, { completedDates, streak, bestStreak: Math.max(taskData.bestStreak || 0, streak) });
};

// --- SUBJECTS & TOPICS ---
export const onSubjectsUpdate = (callback: (subjects: string[]) => void) => {
    const auth = getAuth();
    return onAuthStateChanged(auth, (user) => {
        if (!user) return callback([]);
        return onSnapshot(doc(db, 'users', user.uid), async (userDoc) => {
            const familyId = userDoc.data()?.familyId;
            if (familyId) return onSnapshot(doc(db, 'familyManagement', familyId), (doc) => callback(doc.exists() ? doc.data().educationSubjects || [] : []));
            else callback([]);
        });
    });
};
export const updateSubjects = async (subjects: string[]) => {
    const familyId = await getCurrentFamilyId();
    if (familyId) await setDoc(doc(db, 'familyManagement', familyId), { educationSubjects: subjects }, { merge: true });
};
export const onTopicsUpdate = (callback: (topics: string[]) => void) => {
    const auth = getAuth();
    return onAuthStateChanged(auth, (user) => {
        if (!user) return callback([]);
        return onSnapshot(doc(db, 'users', user.uid), async (userDoc) => {
            const familyId = userDoc.data()?.familyId;
            if (familyId) return onSnapshot(doc(db, 'familyManagement', familyId), (doc) => callback(doc.exists() ? doc.data().educationTopics || [] : []));
            else callback([]);
        });
    });
};
export const updateTopics = async (topics: string[]) => {
    const familyId = await getCurrentFamilyId();
    if (familyId) await setDoc(doc(db, 'familyManagement', familyId), { educationTopics: topics }, { merge: true });
};

export const onCurriculumMapUpdate = (callback: (map: Record<string, string[]>) => void) => {
    const auth = getAuth();
    return onAuthStateChanged(auth, (user) => {
        if (!user) return callback({});
        return onSnapshot(doc(db, 'users', user.uid), async (userDoc) => {
            const familyId = userDoc.data()?.familyId;
            if (familyId) return onSnapshot(doc(db, 'familyManagement', familyId), (doc) => callback(doc.exists() ? doc.data().educationCurriculumMap || {} : {}));
            else callback({});
        });
    });
};

export const updateCurriculumMap = async (map: Record<string, string[]>) => {
    const familyId = await getCurrentFamilyId();
    if (familyId) await setDoc(doc(db, 'familyManagement', familyId), { educationCurriculumMap: map }, { merge: true });
};

// --- MEMORIZATION ---
export const onMemorizationItemsUpdate = (cb: (s: MemorizationItem[]) => void) => onFamilyDataUpdate<MemorizationItem>('memorizationItems', cb);
export const onMemorizationProgressUpdate = (cb: (s: MemorizationProgress[]) => void) => onFamilyDataUpdate<MemorizationProgress>('memorizationProgress', cb);
export const addMemorizationItem = async (data: any) => { const familyId = await getCurrentFamilyId(); return addDoc(collection(db, 'memorizationItems'), { ...data, familyId }); };
export const updateMemorizationItem = (id: string, data: any) => updateDoc(doc(db, 'memorizationItems', id), data);
export const deleteMemorizationItem = (id: string) => deleteDoc(doc(db, 'memorizationItems', id));
export const updateMemorizationProgress = async (itemId: string, memberId: string, completed: boolean) => {
    const familyId = await getCurrentFamilyId();
    const id = `${memberId}_${itemId}`;
    await setDoc(doc(db, 'memorizationProgress', id), { familyId, memberId, itemId, completed, completedAt: completed ? new Date().toISOString() : null }, { merge: true });
};
export const removeMemorizationProgress = async (itemId: string, memberId: string) => {
    const familyId = await getCurrentFamilyId();
    const snap = await getDocs(query(collection(db, 'memorizationProgress'), where('familyId', '==', familyId), where('memberId', '==', memberId), where('itemId', '==', itemId)));
    const batch = writeBatch(db);
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
};
export const resetAllMemorizationProgress = async () => {
    const familyId = await getCurrentFamilyId();
    if (!familyId) return;
    const snap = await getDocs(query(collection(db, 'memorizationProgress'), where('familyId', '==', familyId)));
    const batch = writeBatch(db);
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
};
export const deleteAllMemorizationItems = async () => {
    const familyId = await getCurrentFamilyId();
    if (!familyId) return;
    const batch = writeBatch(db);
    const snapItems = await getDocs(query(collection(db, 'memorizationItems'), where('familyId', '==', familyId)));
    snapItems.docs.forEach(d => batch.delete(d.ref));
    const snapProgress = await getDocs(query(collection(db, 'memorizationProgress'), where('familyId', '==', familyId)));
    snapProgress.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
};

// --- PRAYER ---
export const onSinglePrayerProgressUpdate = (mid: string, cb: (p: PrayerProgress | null) => void) => onSnapshot(doc(db, 'prayerProgress', mid), d => cb(d.exists() ? {id:d.id, ...d.data()} as any : null));
export const onPrayerProgressUpdate = (cb: (p: PrayerProgress[]) => void) => onFamilyDataUpdate<PrayerProgress>('prayerProgress', cb);
export const updatePrayerProgress = async (memberId: string, completions: any) => {
    const familyId = await getCurrentFamilyId();
    await setDoc(doc(db, 'prayerProgress', memberId), { familyId, memberId, completions }, { merge: true });
};

// --- MEAL PLAN & RECIPES ---
export const onMealPlanUpdate = (cb: (m: MealPlan) => void) => onFamilyDataUpdate<any>('mealPlans', (docs) => {
    const plan: MealPlan = {};
    docs.forEach(d => { plan[d.id] = d; });
    cb(plan);
});
export const updateMealPlan = async (date: string, plan: any) => {
    const familyId = await getCurrentFamilyId();
    await setDoc(doc(db, 'mealPlans', date), { ...plan, familyId });
};
export const onRecipesUpdate = (cb: (r: Recipe[]) => void) => onFamilyDataUpdate<Recipe>('recipes', cb);
export const addRecipe = async (data: any) => { 
    const familyId = await getCurrentFamilyId(); 
    const ref = await addDoc(collection(db, 'recipes'), { ...data, familyId });
    return ref.id;
};
export const updateRecipe = (id: string, data: any) => updateDoc(doc(db, 'recipes', id), data);
export const deleteRecipe = (id: string) => deleteDoc(doc(db, 'recipes', id));

// --- CALORIE LOGS ---
export const onCalorieLogsUpdate = (cb: (l: CalorieLog[]) => void) => onFamilyDataUpdate<CalorieLog>('calorieLogs', cb);
export const upsertCalorieLog = async (data: any) => {
    const familyId = await getCurrentFamilyId();
    await setDoc(doc(db, 'calorieLogs', data.id), { ...data, familyId }, { merge: true });
};

// --- SHOPPING LISTS ---
export const onShoppingListsUpdate = (cb: (l: ShoppingList[]) => void) => onFamilyDataUpdate<ShoppingList>('shoppingLists', cb);
export const addShoppingList = async (name: string, icon: string, colorId?: string) => {
    const familyId = await getCurrentFamilyId();
    return addDoc(collection(db, 'shoppingLists'), { name, icon, colorId: colorId || 'ocean', items: [], boughtItems: [], familyId, createdAt: new Date().toISOString() });
};
export const updateShoppingList = (id: string, data: any) => updateDoc(doc(db, 'shoppingLists', id), data);
export const deleteShoppingList = (id: string) => deleteDoc(doc(db, 'shoppingLists', id));
export const addShoppingListItemToList = async (listId: string, item: any) => {
    const listRef = doc(db, 'shoppingLists', listId);
    await updateDoc(listRef, { items: arrayUnion({ ...item, id: Date.now().toString(), isBought: false, createdAt: new Date().toISOString() }) });
};
export const toggleShoppingListItemStatusInList = async (listId: string, itemId: string, isBought: boolean) => {
    const listRef = doc(db, 'shoppingLists', listId);
    const snap = await getDoc(listRef);
    if (!snap.exists()) return;
    const items = snap.data().items || [];
    const idx = items.findIndex((i: any) => i.id === itemId);
    if (idx !== -1) {
        items[idx].isBought = isBought;
        await updateDoc(listRef, { items });
    }
};
export const moveItemToBought = async (listId: string, itemId: string) => {
    const listRef = doc(db, 'shoppingLists', listId);
    const snap = await getDoc(listRef);
    if (!snap.exists()) return;
    const items = snap.data().items || [];
    const item = items.find((i: any) => i.id === itemId);
    if (item) {
        await updateDoc(listRef, { 
            items: arrayRemove(item),
            boughtItems: arrayUnion({ ...item, isBought: true, boughtAt: new Date().toISOString() })
        });
    }
};
export const moveItemToPending = async (listId: string, itemId: string) => {
    const listRef = doc(db, 'shoppingLists', listId);
    const snap = await getDoc(listRef);
    if (!snap.exists()) return;
    const boughtItems = snap.data().boughtItems || [];
    const item = boughtItems.find((i: any) => i.id === itemId);
    if (item) {
        await updateDoc(listRef, { 
            boughtItems: arrayRemove(item),
            items: arrayUnion({ ...item, isBought: false, createdAt: new Date().toISOString() })
        });
    }
};
export const deleteShoppingListItemFromList = async (listId: string, itemId: string, fromBought: boolean) => {
    const listRef = doc(db, 'shoppingLists', listId);
    const snap = await getDoc(listRef);
    if (!snap.exists()) return;
    const field = fromBought ? 'boughtItems' : 'items';
    const items = snap.data()[field] || [];
    const item = items.find((i: any) => i.id === itemId);
    if (item) await updateDoc(listRef, { [field]: arrayRemove(item) });
};

// --- TAGS ---
export const onTagsUpdate = (collectionName: string, callback: (tags: string[]) => void) => {
    const auth = getAuth();
    return onAuthStateChanged(auth, (user) => {
        if (!user) return callback([]);
        return onSnapshot(doc(db, 'users', user.uid), async (userDoc) => {
            const familyId = userDoc.data()?.familyId;
            if (familyId) return onSnapshot(doc(db, 'familyManagement', familyId), (doc) => callback(doc.exists() ? doc.data()[collectionName] || [] : []));
            else callback([]);
        });
    });
};
export const updateTags = async (collectionName: string, tags: string[]) => {
    const familyId = await getCurrentFamilyId();
    if (familyId) await setDoc(doc(db, 'familyManagement', familyId), { [collectionName]: tags }, { merge: true });
};
export const deleteTag = async (collectionName: string, tag: string, type: string) => {
    const familyId = await getCurrentFamilyId();
    if (!familyId) return;
    const docRef = doc(db, 'familyManagement', familyId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
        const currentTags = snap.data()[collectionName] || [];
        await updateDoc(docRef, { [collectionName]: currentTags.filter((t: string) => t !== tag) });
    }
};

// --- BADGES & SYSTEM ---
export const checkAndAwardBadges = async (mid: string, fid: string, context: any) => {
    // Badge logic placeholder
};

export const initializeDefaultData = async (familyId: string, userId: string) => { 
    const batch = writeBatch(db);
    const familyRef = doc(db, 'families', familyId);
    batch.update(familyRef, { defaultDataInitialized: true });
    await batch.commit();
};

export const migrateOrphanBooks = async (fid: string) => {
    const q = query(collection(db, 'mediaItems'), where('familyId', '==', null));
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.docs.forEach(d => batch.update(d.ref, { familyId: fid }));
    await batch.commit();
};

export const getReadingSessions = async (familyId: string) => { if (!familyId) return []; const q = query(collection(db, 'readingSessions'), where('familyId', '==', familyId)); const snapshot = await getDocs(q); return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ReadingSession)); };
export const onReadingSessionsUpdate = (familyId: string, cb: (s: ReadingSession[]) => void) => { if (!familyId) return () => {}; return onSnapshot(query(collection(db, 'readingSessions'), where('familyId', '==', familyId)), snapshot => { cb(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ReadingSession))); }); };
export const addReadingSession = async (data: any) => {
    const familyId = await getCurrentFamilyId();
    if (familyId) return addDoc(collection(db, 'readingSessions'), { ...data, familyId });
};

export const deleteReadingSession = async (sessionId: string) => {
    await deleteDoc(doc(db, 'readingSessions', sessionId));
};

export const onAmbientSoundsUpdate = (cb: (s: AmbientSound[]) => void) => onFamilyDataUpdate<AmbientSound>('ambientSounds', cb);

// --- EZBERLER / FLASHCARDS ---
export const onDecksUpdate = (cb: (data: Deck[]) => void) => onFamilyDataUpdate<Deck>('decks', cb);
export const addDeck = async (data: any) => {
    const familyId = await getCurrentFamilyId();
    if (familyId) return addDoc(collection(db, 'decks'), { ...data, familyId, createdAt: new Date().getTime() });
};
export const updateDeck = (id: string, data: any) => updateDoc(doc(db, 'decks', id), removeUndefined(data));
export const deleteDeck = (id: string) => deleteDoc(doc(db, 'decks', id));

export const onFlashcardsUpdate = (deckId: string, cb: (data: Flashcard[]) => void) => {
    if (!deckId) return () => {};
    return onSnapshot(query(collection(db, 'flashcards'), where('deckId', '==', deckId)), snapshot => {
        cb(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Flashcard)));
    });
};
export const addFlashcard = async (data: any) => {
    return addDoc(collection(db, 'flashcards'), { ...data, createdAt: new Date().getTime() });
};
export const updateFlashcard = (id: string, data: any) => updateDoc(doc(db, 'flashcards', id), removeUndefined(data));
export const deleteFlashcard = (id: string) => deleteDoc(doc(db, 'flashcards', id));
