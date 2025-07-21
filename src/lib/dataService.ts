import { db } from './firebase';
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, setDoc, writeBatch, query, where, onSnapshot, arrayUnion, arrayRemove } from "firebase/firestore";
import type { Book, Task, CalendarEvent, ShoppingList, ShoppingItem, Test, QuestionBank, PracticeExam, MealPlan, Recipe, ShoppingNoteList, ShoppingNoteItem, User, FamilyMember } from './data';

// Generic CRUD operations

const getCollection = async <T>(collectionName: string, familyId: string): Promise<T[]> => {
    const q = query(collection(db, collectionName), where("familyId", "==", familyId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
};

const getDocument = async <T>(collectionName: string, id: string): Promise<T | null> => {
    const docRef = doc(db, collectionName, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as T;
    }
    return null;
};

const addDocument = async <T>(collectionName: string, data: Omit<T, 'id'>, familyId: string) => {
    const docRef = await addDoc(collection(db, collectionName), { ...data, familyId });
    return docRef.id;
};

const updateDocument = async <T>(collectionName: string, id: string, data: Partial<Omit<T, 'id'>>) => {
    const docRef = doc(db, collectionName, id);
    await updateDoc(docRef, data);
};

const deleteDocument = async (collectionName: string, id: string) => {
    await deleteDoc(doc(db, collectionName, id));
};

// Books (mediaItems)
export const onBooksUpdate = (familyId: string, callback: (books: Book[]) => void) => {
    const q = query(collection(db, "mediaItems"), where("familyId", "==", familyId));
    return onSnapshot(q, (snapshot) => {
        const books = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Book));
        callback(books);
    });
};
export const addBook = (data: Omit<Book, 'id' | 'familyId'>, familyId: string) => addDocument<Book>('mediaItems', data, familyId);
export const updateBook = (id: string, data: Partial<Omit<Book, 'id'>>) => updateDocument<Book>('mediaItems', id, data);
export const deleteBook = (id: string) => deleteDocument('mediaItems', id);

// Tags (Library Shelves are now per-family)
export const onTagsUpdate = (familyId: string, callback: (tags: string[]) => void) => {
    if (!familyId) return () => {};
    const docRef = doc(db, "libraryManagement", familyId);
    return onSnapshot(docRef, (doc) => {
        callback(doc.exists() ? doc.data().allTags || [] : []);
    });
};
export const updateTags = async (familyId: string, tags: string[]) => {
    const docRef = doc(db, 'libraryManagement', familyId);
    await setDoc(docRef, { allTags: tags }, { merge: true });
}

// Tasks
export const onTasksUpdate = (familyId: string, callback: (tasks: Task[]) => void) => {
    const q = query(collection(db, "tasks"), where("familyId", "==", familyId));
    return onSnapshot(q, (snapshot) => {
        const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as Task));
        callback(tasks);
    });
};
export const addTask = (data: Omit<Task, 'id' | 'familyId'>, familyId: string) => addDocument<Task>('tasks', data, familyId);
export const updateTask = (id: string, data: Partial<Task>) => updateDocument<Task>('tasks', id, data);

// Calendar Events
export const onCalendarEventsUpdate = (familyId: string, callback: (events: CalendarEvent[]) => void) => {
    const q = query(collection(db, "calendarEvents"), where("familyId", "==", familyId));
    return onSnapshot(q, (snapshot) => {
        const events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as CalendarEvent));
        callback(events);
    });
};
export const addCalendarEvent = (data: Omit<CalendarEvent, 'id' | 'familyId'>, familyId: string) => addDocument<CalendarEvent>('calendarEvents', data, familyId);


// Meal Plan
export const onMealPlanUpdate = (familyId: string, callback: (plan: MealPlan) => void) => {
    const q = query(collection(db, "mealPlan"), where("familyId", "==", familyId));
    return onSnapshot(q, (snapshot) => {
        const plan: MealPlan = {};
        snapshot.forEach(doc => {
            plan[doc.id] = doc.data() as { [meal: string]: Recipe | null };
        });
        callback(plan);
    });
};
export const updateMealPlan = async (dayKey: string, dayPlan: { [meal: string]: Recipe | null }, familyId: string) => {
    const docRef = doc(db, "mealPlan", `${familyId}_${dayKey}`); // Make doc ID unique per family
    await setDoc(docRef, { ...dayPlan, familyId }, { merge: true });
}


// Shopping Lists
export const onShoppingListsUpdate = (familyId: string, callback: (lists: ShoppingList[]) => void) => {
    const q = query(collection(db, "shoppingLists"), where("familyId", "==", familyId));
    return onSnapshot(q, (snapshot) => {
        const lists = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ShoppingList));
        callback(lists);
    });
};
export const addShoppingList = (title: string, icon: string, familyId: string) => addDocument<ShoppingList>('shoppingLists', { name: title, icon: icon, items: [] }, familyId);
export const updateShoppingList = (id: string, data: Partial<Omit<ShoppingList, 'id' | 'familyId'>>) => updateDocument<ShoppingList>('shoppingLists', id, data);
export const deleteShoppingList = (id: string) => deleteDocument('shoppingLists', id);

export const addShoppingListItemToList = async (listId: string, itemName: string) => {
    const newItem: ShoppingItem = { id: Date.now().toString(), name: itemName, isBought: false };
    await updateDoc(doc(db, "shoppingLists", listId), {
        items: arrayUnion(newItem)
    });
};
export const toggleShoppingListItemStatusInList = async (listId: string, itemId: string) => {
    const listRef = doc(db, "shoppingLists", listId);
    const listSnap = await getDoc(listRef);
    if (listSnap.exists()) {
        const list = listSnap.data() as ShoppingList;
        const newItems = list.items.map(item => item.id === itemId ? { ...item, isBought: !item.isBought } : item);
        await updateDoc(listRef, { items: newItems });
    }
};
export const deleteShoppingListItemFromList = async (listId: string, itemId: string) => {
    const listRef = doc(db, "shoppingLists", listId);
    const listSnap = await getDoc(listRef);
    if (listSnap.exists()) {
        const list = listSnap.data() as ShoppingList;
        const itemToRemove = list.items.find(item => item.id === itemId);
        if (itemToRemove) {
            await updateDoc(listRef, { items: arrayRemove(itemToRemove) });
        }
    }
};
export const clearBoughtItemsFromList = async (listId: string) => {
    const listRef = doc(db, "shoppingLists", listId);
    const listSnap = await getDoc(listRef);
    if (listSnap.exists()) {
        const list = listSnap.data() as ShoppingList;
        const newItems = list.items.filter(item => !item.isBought);
        await updateDoc(listRef, { items: newItems });
    }
};


// Shopping Note Lists
export const onShoppingNoteListsUpdate = (familyId: string, callback: (lists: ShoppingNoteList[]) => void) => {
    const q = query(collection(db, "shoppingNoteLists"), where("familyId", "==", familyId));
    return onSnapshot(q, (snapshot) => {
        const lists = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ShoppingNoteList));
        callback(lists);
    });
};
export const addShoppingNoteList = (name: string, icon: string, familyId: string) => addDocument<ShoppingNoteList>('shoppingNoteLists', { name: name, icon: icon, items: [] }, familyId);
export const deleteShoppingNoteList = (id: string) => deleteDocument('shoppingNoteLists', id);

export const addNoteItemToList = async (listId: string, text: string) => {
    const newItem: ShoppingNoteItem = { id: Date.now().toString(), text: text };
    await updateDoc(doc(db, "shoppingNoteLists", listId), {
        items: arrayUnion(newItem)
    });
};
export const deleteNoteItemFromList = async (listId: string, itemId: string) => {
    const listRef = doc(db, "shoppingNoteLists", listId);
    const listSnap = await getDoc(listRef);
    if (listSnap.exists()) {
        const list = listSnap.data() as ShoppingNoteList;
        const itemToRemove = list.items.find(item => item.id === itemId);
        if (itemToRemove) {
            await updateDoc(listRef, { items: arrayRemove(itemToRemove) });
        }
    }
};
export const updateNoteItemInList = async (listId: string, itemId: string, newText: string) => {
    const listRef = doc(db, "shoppingNoteLists", listId);
    const listSnap = await getDoc(listRef);
    if (listSnap.exists()) {
        const list = listSnap.data() as ShoppingNoteList;
        const newItems = list.items.map(item => item.id === itemId ? { ...item, text: newText } : item);
        await updateDoc(listRef, { items: newItems });
    }
};


// Education
export const onTestsUpdate = (familyId: string, callback: (tests: Test[]) => void) => {
    const q = query(collection(db, "tests"), where("familyId", "==", familyId));
    return onSnapshot(q, (snapshot) => {
        const tests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as Test));
        callback(tests);
    });
};
export const addTest = (data: Omit<Test, 'id' | 'familyId'>, familyId: string) => addDocument<Test>('tests', data, familyId);
export const updateTest = (id: string, data: Partial<Omit<Test, 'id'>>) => updateDocument<Test>('tests', id, data);


export const onQuestionBanksUpdate = (familyId: string, callback: (banks: QuestionBank[]) => void) => {
    const q = query(collection(db, "questionBanks"), where("familyId", "==", familyId));
    return onSnapshot(q, (snapshot) => {
        const banks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as QuestionBank));
        callback(banks);
    });
};
export const addQuestionBank = (data: Omit<QuestionBank, 'id' | 'familyId'>, familyId: string) => addDocument<QuestionBank>('questionBanks', data, familyId);
export const updateQuestionBank = (id: string, data: Partial<Omit<QuestionBank, 'id'>>) => updateDocument<QuestionBank>('questionBanks', id, data);
export const deleteQuestionBank = (id: string) => deleteDocument('questionBanks', id);


export const onPracticeExamsUpdate = (familyId: string, callback: (exams: PracticeExam[]) => void) => {
    const q = query(collection(db, "practiceExams"), where("familyId", "==", familyId));
    return onSnapshot(q, (snapshot) => {
        const exams = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as PracticeExam));
        callback(exams);
    });
};
export const addPracticeExam = (data: Omit<PracticeExam, 'id'| 'familyId'>, familyId: string) => addDocument<PracticeExam>('practiceExams', data, familyId);
export const updatePracticeExam = (id: string, data: Partial<Omit<PracticeExam, 'id'>>) => updateDocument<PracticeExam>('practiceExams', id, data);
export const deletePracticeExam = (id: string) => deleteDocument('practiceExams', id);
