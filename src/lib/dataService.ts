
import { db, storage } from './firebase';
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, setDoc, writeBatch, query, where, onSnapshot, arrayUnion, arrayRemove, orderBy, limit, Unsubscribe, serverTimestamp } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import type { Book, Task, CalendarEvent, ShoppingList, ShoppingItem, Test, PracticeExam, MealPlan, Recipe, User, FamilyMember, UserLibrary, UserLibraryBook, BookReadingStatus, Mistake, StudyPlan, StudyAssignment, Goal, GoalSection, ReadingSession, AmbientSound, MemorizationItem, MemorizationProgress, Notebook, Note, PrayerProgress, Video, CalorieLog, DailyTracking, BankQuestion, TrackedBook, TrackedBookTest, BudgetCategory, PomodoroProject, PomodoroSession, Summary, PerformanceGoal } from './data';
import { isPast, parseISO, isSameDay, subDays, format, startOfWeek, endOfWeek, subWeeks, isWithinInterval, differenceInDays, startOfMonth, endOfMonth, isFuture, subMonths, addMonths } from 'date-fns';
import { tr } from 'date-fns/locale';

// --- UTILS ---
const getCurrentFamilyId = async (): Promise<string | null> => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return null;
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    return userDoc.data()?.familyId || null;
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
    const libRef = doc(db, 'userLibraries', mid);
    const newBook: UserLibraryBook = { bookId: bid, status: 'to-read', addedAt: new Date().toISOString(), progress: 0 };
    await setDoc(libRef, { familyId: fid, memberId: mid, books: arrayUnion(newBook) }, { merge: true });
};
export const removeBookFromMemberLibrary = async (fid: string, mid: string, bid: string) => {
    const libRef = doc(db, 'userLibraries', mid);
    const snap = await getDoc(libRef);
    if (!snap.exists()) return;
    const books = (snap.data().books || []).filter((b: any) => b.bookId !== bid);
    await updateDoc(libRef, { books });
};
export const updateUserBookStatus = async (fid: string, mid: string, bid: string, status: string, progress?: number) => {
    const libRef = doc(db, 'userLibraries', mid);
    const snap = await getDoc(libRef);
    if (!snap.exists()) return;
    const books = snap.data().books;
    const idx = books.findIndex((b: any) => b.bookId === bid);
    if (idx !== -1) {
        books[idx] = { ...books[idx], status, progress: progress ?? books[idx].progress };
        if (status === 'finished') books[idx].finishedAt = new Date().toISOString();
        await updateDoc(libRef, { books });
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
export const onCalendarEventsUpdate = (callback: (events: CalendarEvent[]) => void) => onFamilyDataUpdate<CalendarEvent>('calendarEvents', callback);
export const addCalendarEvent = async (data: Omit<CalendarEvent, 'id' | 'familyId'>) => {
    const familyId = await getCurrentFamilyId();
    if (!familyId) throw new Error("User not in a family");
    return addDoc(collection(db, 'calendarEvents'), { ...data, familyId });
};
export const updateCalendarEvent = (id: string, data: Partial<Omit<CalendarEvent, 'id' | 'familyId'>>) => updateDoc(doc(db, 'calendarEvents', id), removeUndefined(data));
export const deleteCalendarEvent = (id: string) => deleteDoc(doc(db, "calendarEvents", id));
export const deletePastCalendarEvents = async () => {
    const familyId = await getCurrentFamilyId();
    if (!familyId) return;
    const today = format(new Date(), 'yyyy-MM-dd');
    const q = query(collection(db, 'calendarEvents'), where("familyId", "==", familyId), where("endDate", "<", today), where("recurrence", "==", "one-time"));
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
};

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
            batch.set(qRef, { questionId: 'id' in q ? q.id : ('questionId' in q ? q.questionId : ''), questionNumber: idx + 1, imageUrl: q.imageUrl });
        });
        await batch.commit();
    }
};
export const updateTest = async (id: string, data: Partial<Omit<Test, 'id' | 'familyId'>>) => updateDoc(doc(db, 'tests', id), removeUndefined(data));
export const deleteTest = (id: string) => deleteDoc(doc(db, "tests", id));

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
export const addTrackedBook = async (data: Pick<TrackedBook, 'title' | 'publisher' | 'bookType'>) => {
    const familyId = await getCurrentFamilyId();
    if (!familyId) throw new Error("Unauthorized");
    return addDoc(collection(db, 'trackedBooks'), { ...data, familyId, subjects: [], createdAt: new Date().toISOString() });
};
export const updateTrackedBook = (id: string, data: Partial<Omit<TrackedBook, 'id' | 'familyId'>>) => setDoc(doc(db, 'trackedBooks', id), removeUndefined(data), { merge: true });
export const deleteTrackedBook = (id: string) => deleteDoc(doc(db, "trackedBooks", id));

// --- STUDY PLANS & ASSIGNMENTS ---
export const onStudyPlansUpdate = (callback: (plans: StudyPlan[]) => void) => onFamilyDataUpdate<StudyPlan>('studyPlans', callback);
export const onStudyAssignmentsUpdate = (callback: (assignments: StudyAssignment[]) => void) => onFamilyDataUpdate<StudyAssignment>('studyAssignments', callback);
export const addStudyAssignment = async (data: Omit<StudyAssignment, 'id' | 'familyId' | 'status'>) => {
    const familyId = await getCurrentFamilyId();
    if (!familyId) throw new Error("Unauthorized");
    return addDoc(collection(db, 'studyAssignments'), { ...data, status: 'assigned', familyId });
};
export const updateStudyAssignment = (id: string, data: Partial<Omit<StudyAssignment, 'id' | 'familyId'>>) => updateDoc(doc(db, 'studyAssignments', id), removeUndefined(data));
export const addStudyPlan = async (data: Omit<StudyPlan, 'id' | 'familyId'>) => {
    const familyId = await getCurrentFamilyId();
    if (!familyId) throw new Error("Unauthorized");
    return addDoc(collection(db, 'studyPlans'), { ...data, familyId });
};
export const updateStudyPlan = (id: string, data: any) => updateDoc(doc(db, 'studyPlans', id), removeUndefined(data));
export const deleteStudyPlan = (id: string) => deleteDoc(doc(db, 'studyPlans', id));
export const onStudyPlanUpdate = (id: string, cb: (p: StudyPlan | null) => void) => onSnapshot(doc(db, 'studyPlans', id), d => cb(d.exists() ? {id:d.id, ...d.data()} as any : null));

// --- PRAYER & MEMORIZATION ---
export const onPrayerProgressUpdate = (callback: (progress: PrayerProgress[]) => void) => onFamilyDataUpdate<PrayerProgress>('prayerProgress', callback);
export const updatePrayerProgress = (uid: string, c: any) => setDoc(doc(db, 'prayerProgress', uid), { completions: c }, { merge: true });
export const onSinglePrayerProgressUpdate = (mid: string, cb: (p: PrayerProgress | null) => void) => onSnapshot(doc(db, 'prayerProgress', mid), d => cb(d.exists() ? {id:d.id, ...d.data()} as any : null));

export const onMemorizationItemsUpdate = (cb: (i: MemorizationItem[]) => void) => onFamilyDataUpdate<MemorizationItem>('memorizationItems', cb);
export const onMemorizationProgressUpdate = (callback: (progress: MemorizationProgress[]) => void) => onFamilyDataUpdate<MemorizationProgress>('memorizationProgress', callback);
export const addMemorizationItem = async (data: Omit<MemorizationItem, 'id' | 'familyId'>) => {
    const familyId = await getCurrentFamilyId();
    if (!familyId) throw new Error("Unauthorized");
    return addDoc(collection(db, 'memorizationItems'), { ...data, familyId });
};
export const updateMemorizationItem = (id: string, data: any) => updateDoc(doc(db, 'memorizationItems', id), removeUndefined(data));
export const deleteMemorizationItem = (id: string) => deleteDoc(doc(db, 'memorizationItems', id));
export const updateMemorizationProgress = (itemId: string, memberId: string, completed: boolean) => setDoc(doc(db, 'memorizationProgress', `${itemId}_${memberId}`), { completed, itemId, memberId, completedAt: completed ? new Date().toISOString() : null }, { merge: true });
export const removeMemorizationProgress = (itemId: string, memberId: string) => deleteDoc(doc(db, 'memorizationProgress', `${itemId}_${memberId}`));
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
    const snap = await getDocs(query(collection(db, 'memorizationItems'), where('familyId', '==', familyId)));
    const batch = writeBatch(db);
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
};

// --- AMBIENT SOUNDS ---
export const onAmbientSoundsUpdate = (callback: (sounds: AmbientSound[]) => void) => onFamilyDataUpdate<AmbientSound>('ambientSounds', callback);

// --- MISC SERVICES ---
export const onReadingSessionsUpdate = (cb: (s: ReadingSession[]) => void) => onFamilyDataUpdate<ReadingSession>('readingSessions', cb);
export const addReadingSession = async (data: any) => { const familyId = await getCurrentFamilyId(); return addDoc(collection(db, 'readingSessions'), { ...data, familyId }); };

export const onRecipesUpdate = (cb: (r: Recipe[]) => void) => onFamilyDataUpdate<Recipe>('recipes', cb);
export const addRecipe = async (data: any) => { const familyId = await getCurrentFamilyId(); return addDoc(collection(db, 'recipes'), { ...data, familyId }); };
export const updateRecipe = (id: string, data: any) => updateDoc(doc(db, 'recipes', id), data);
export const deleteRecipe = (id: string) => deleteDoc(doc(db, 'recipes', id));

export const onMealPlanUpdate = (callback: (plan: MealPlan) => void) => onFamilyDataUpdate<any>('mealPlan', (docs) => {
    const plan: MealPlan = {};
    docs.forEach((d: any) => { const dayKey = d.id; plan[dayKey] = d; });
    callback(plan);
});
export const updateMealPlan = (key: string, data: any) => setDoc(doc(db, 'mealPlan', key), data, { merge: true });

export const onShoppingListsUpdate = (callback: (lists: ShoppingList[]) => void) => onFamilyDataUpdate<ShoppingList>('shoppingLists', callback);
export const addShoppingList = async (name: string, icon: string, colorId?: string) => {
    const familyId = await getCurrentFamilyId();
    if (!familyId) throw new Error("Unauthorized");
    return addDoc(collection(db, 'shoppingLists'), { name, icon, colorId, familyId, createdAt: new Date().toISOString(), items: [], boughtItems: [] });
};
export const updateShoppingList = (id: string, data: any) => updateDoc(doc(db, 'shoppingLists', id), removeUndefined(data));
export const deleteShoppingList = (id: string) => deleteDoc(doc(db, 'shoppingLists', id));
export const addShoppingListItemToList = async (listId: string, item: any) => {
    const listRef = doc(db, 'shoppingLists', listId);
    const newItem = { ...item, id: generateSafeId(), isBought: false, createdAt: new Date().toISOString() };
    await updateDoc(listRef, { items: arrayUnion(newItem) });
};
export const deleteShoppingListItemFromList = async (listId: string, itemId: string, fromBought: boolean) => {
    const listRef = doc(db, 'shoppingLists', listId);
    const snap = await getDoc(listRef);
    if (!snap.exists()) return;
    const field = fromBought ? 'boughtItems' : 'items';
    const items = (snap.data()[field] || []).filter((i: any) => i.id !== itemId);
    await updateDoc(listRef, { [field]: items });
};
export const toggleShoppingListItemStatusInList = async (listId: string, itemId: string, status: boolean) => {
    const listRef = doc(db, 'shoppingLists', listId);
    const snap = await getDoc(listRef);
    if (!snap.exists()) return;
    const items = snap.data().items || [];
    const idx = items.findIndex((i: any) => i.id === itemId);
    if (idx !== -1) {
        items[idx].isBought = status;
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
            items: arrayUnion({ ...item, isBought: false })
        });
    }
};

export const onCalorieLogsUpdate = (callback: (logs: CalorieLog[]) => void) => onFamilyDataUpdate<CalorieLog>('calorieLogs', callback);
export const upsertCalorieLog = (data: any) => setDoc(doc(db, 'calorieLogs', data.id), removeUndefined(data), { merge: true });

export const updateFamilyMemberInFamily = async (fid: string, mid: string, data: any) => {
    const familyRef = doc(db, "families", fid);
    const snap = await getDoc(familyRef);
    if (!snap.exists()) return;
    const members = snap.data().members;
    const idx = members.findIndex((m: any) => m.id === mid);
    if (idx !== -1) {
        members[idx] = { ...members[idx], ...data };
        await updateDoc(familyRef, { members });
    }
};

export const checkAndAwardBadges = async (memberId: string, familyId: string, event: TriggerEvent) => {
    const familyRef = doc(db, "families", familyId);
    const snap = await getDoc(familyRef);
    if (!snap.exists()) return;
    const members = snap.data().members;
    const memberIdx = members.findIndex((m: any) => m.id === memberId);
    if (memberIdx === -1) return;
    const member = members[memberIdx];
    const badges = new Set(member.badges || []);
    let xp = member.xp || 0;
    if (event.points) xp += event.points;
    const completedTasks = (member.completedTasks || 0) + (event.type === 'task_completed' ? 1 : 0);
    if (event.type === 'task_completed') { if (completedTasks >= 10) badges.add('🔥'); if (completedTasks >= 50) badges.add('🚀'); }
    await updateFamilyMemberInFamily(familyId, memberId, { xp, completedTasks, level: Math.floor(xp / 1000) + 1, badges: Array.from(badges) });
};

export type TriggerEvent = { type: 'task_completed', task: Task, points?: number } | { type: 'test_completed', test: Test, points?: number } | { type: 'book_finished', book: Book, points?: number } | { type: 'goal_section_completed', points: number } | { type: 'goal_completed' } | { type: 'habit_streak_update', streak: number } | { type: 'prayer_completed', prayerCount: number } | { type: 'memorization_completed' };

export const onSubjectsUpdate = (callback: (subjects: string[]) => void) => {
    const auth = getAuth();
    return onAuthStateChanged(auth, (user) => {
        if (!user) return callback([]);
        return onSnapshot(doc(db, 'users', user.uid), async (userDoc) => {
            const familyId = userDoc.data()?.familyId;
            if (familyId) onSnapshot(doc(db, 'familyManagement', familyId), (doc) => callback(doc.exists() ? doc.data().educationSubjects || [] : []));
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
            if (familyId) onSnapshot(doc(db, 'familyManagement', familyId), (doc) => callback(doc.exists() ? doc.data().educationTopics || [] : []));
            else callback([]);
        });
    });
};
export const updateTopics = async (topics: string[]) => {
    const familyId = await getCurrentFamilyId();
    if (familyId) await setDoc(doc(db, 'familyManagement', familyId), { educationTopics: topics }, { merge: true });
};

export const onTrackedBookUpdate = (id: string, cb: (b: TrackedBook | null) => void) => onSnapshot(doc(db, 'trackedBooks', id), d => cb(d.exists() ? {id:d.id, ...d.data()} as any : null));
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

export const onSummariesUpdate = (cb: (s: Summary[]) => void) => onFamilyDataUpdate<Summary>('summaries', cb);
export const addSummary = async (data: any) => { const familyId = await getCurrentFamilyId(); return addDoc(collection(db, 'summaries'), { ...data, familyId, createdAt: new Date().toISOString() }); };
export const updateSummary = (id: string, data: any) => updateDoc(doc(db, 'summaries', id), removeUndefined(data));
export const deleteSummary = (id: string) => deleteDoc(doc(db, 'summaries', id));
export const onNotebookDetailsUpdate = (id: string, cb: (d: any) => void) => onSnapshot(doc(db, 'notebooks', id), async (d) => {
    if (!d.exists()) return cb(null);
    const notebook = { id: d.id, ...d.data() } as any;
    const q = query(collection(db, 'notes'), where('notebookId', '==', id));
    const snap = await getDocs(q);
    cb({ notebook, notes: snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) });
});

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

export const onMistakesUpdate = (cb: (m: Mistake[]) => void) => onFamilyDataUpdate<Mistake>('mistakes', cb);
export const addMistake = async (data: any) => { const familyId = await getCurrentFamilyId(); return addDoc(collection(db, 'mistakes'), { ...data, familyId, status: 'active', createdAt: new Date().toISOString() }); };
export const deleteMistake = (id: string) => deleteDoc(doc(db, 'mistakes', id));

export const onPracticeExamsUpdate = (cb: (e: PracticeExam[]) => void) => onFamilyDataUpdate<PracticeExam>('practiceExams', cb);
export const onSinglePracticeExamUpdate = (id: string, cb: (e: PracticeExam | null) => void) => onSnapshot(doc(db, 'practiceExams', id), d => cb(d.exists() ? {id:d.id, ...d.data()} as any : null));
export const addPracticeExam = async (data: any) => { const familyId = await getCurrentFamilyId(); return addDoc(collection(db, 'practiceExams'), { ...data, familyId }); };
export const updatePracticeExam = (id: string, data: any) => updateDoc(doc(db, 'practiceExams', id), removeUndefined(data));
export const deletePracticeExam = (id: string) => deleteDoc(doc(db, 'practiceExams', id));

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

export const addTransaction = async (data: any) => { const familyId = await getCurrentFamilyId(); return addDoc(collection(db, 'transactions'), { ...data, familyId }); };
export const updateTransaction = (id: string, data: any) => updateDoc(doc(db, 'transactions', id), removeUndefined(data));
export const deleteTransaction = (id: string) => deleteDoc(doc(db, 'transactions', id));

export const onPomodoroProjectsUpdate = (uid: string, cb: (p: PomodoroProject[]) => void) => onSnapshot(query(collection(db, 'pomodoroProjects'), where('memberId', '==', uid)), s => cb(s.docs.map(d => ({id:d.id, ...d.data()} as any))));
export const onPomodoroSessionsForUserUpdate = (uid: string, cb: (s: PomodoroSession[]) => void) => onSnapshot(query(collection(db, 'pomodoroSessions'), where('memberId', '==', uid)), s => cb(s.docs.map(d => ({id:d.id, ...d.data()} as any))));
export const addPomodoroProject = async (data: any) => { const familyId = await getCurrentFamilyId(); return addDoc(collection(db, 'pomodoroProjects'), { ...data, familyId, createdAt: new Date().toISOString() }); };
export const deletePomodoroProject = (id: string) => deleteDoc(doc(db, 'pomodoroProjects', id));
export const addPomodoroSession = async (data: any) => { const familyId = await getCurrentFamilyId(); return addDoc(collection(db, 'pomodoroSessions'), { ...data, familyId }); };

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

export const onNotesUpdate = (cb: (n: Note[]) => void) => onFamilyDataUpdate<Note>('notes', cb);
export const onNotebooksUpdate = (cb: (n: Notebook[]) => void) => onFamilyDataUpdate<Notebook>('notebooks', cb);
export const addNotebook = async (data: any) => { const familyId = await getCurrentFamilyId(); const user = getAuth().currentUser; return addDoc(collection(db, 'notebooks'), { ...data, familyId, ownerId: user?.uid, createdAt: new Date().toISOString() }); };
export const updateNotebook = (id: string, data: any) => updateDoc(doc(db, 'notebooks', id), data);
export const deleteNotebook = (id: string) => deleteDoc(doc(db, 'notebooks', id));
export const addNoteToSection = async (fid: string, nbid: string, sid: string, data: any) => addDoc(collection(db, 'notes'), { ...data, familyId: fid, notebookId: nbid, sectionId: sid, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
export const updateNoteInSection = (nbid: string, nid: string, data: any) => updateDoc(doc(db, 'notes', nid), { ...data, updatedAt: new Date().toISOString() });
export const deleteNoteFromSection = (nid: string) => deleteDoc(doc(db, 'notes', nid));

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

export const onTagsUpdate = (collectionName: string, callback: (tags: string[]) => void) => {
    const auth = getAuth();
    return onAuthStateChanged(auth, (user) => {
        if (!user) return callback([]);
        return onSnapshot(doc(db, 'users', user.uid), async (userDoc) => {
            const familyId = userDoc.data()?.familyId;
            if (familyId) onSnapshot(doc(db, 'familyManagement', familyId), (doc) => callback(doc.exists() ? doc.data()[collectionName] || [] : []));
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

const generateSafeId = () => Math.random().toString(36).substr(2, 9) + '-' + Date.now().toString(36);
