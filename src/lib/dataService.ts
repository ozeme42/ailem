import { db } from './firebase';
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, setDoc, writeBatch, query, where, onSnapshot, arrayUnion, arrayRemove } from "firebase/firestore";
import type { Book, Task, CalendarEvent, ShoppingList, ShoppingItem, Test, QuestionBank, PracticeExam, MealPlan, Recipe, ShoppingNoteList, ShoppingNoteItem } from './data';

// Generic CRUD operations

const getCollection = async <T>(collectionName: string): Promise<T[]> => {
    const querySnapshot = await getDocs(collection(db, collectionName));
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

const addDocument = async <T>(collectionName: string, data: Omit<T, 'id'>) => {
    const docRef = await addDoc(collection(db, collectionName), data);
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
export const getBooks = () => getCollection<Book>('mediaItems');
export const getBook = (id: string) => getDocument<Book>('mediaItems', id);
export const addBook = (data: Omit<Book, 'id'>) => addDocument<Book>('mediaItems', data);
export const updateBook = (id: string, data: Partial<Omit<Book, 'id'>>) => updateDocument<Book>('mediaItems', id, data);
export const deleteBook = (id: string) => deleteDocument('mediaItems', id);
export const onBooksUpdate = (callback: (books: Book[]) => void) => {
    return onSnapshot(collection(db, "mediaItems"), (snapshot) => {
        const books = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Book));
        callback(books);
    });
};

// Tags (Library Shelves)
export const getTags = async (): Promise<string[]> => {
    const docRef = doc(db, 'libraryManagement', 'tags');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return docSnap.data().allTags || [];
    }
    return [];
}
export const updateTags = async (tags: string[]) => {
    const docRef = doc(db, 'libraryManagement', 'tags');
    await setDoc(docRef, { allTags: tags });
}
export const onTagsUpdate = (callback: (tags: string[]) => void) => {
    return onSnapshot(doc(db, "libraryManagement", "tags"), (doc) => {
        callback(doc.exists() ? doc.data().allTags || [] : []);
    });
};

// Tasks
export const getTasks = () => getCollection<Task>('tasks');
export const onTasksUpdate = (callback: (tasks: Task[]) => void) => {
    return onSnapshot(collection(db, "tasks"), (snapshot) => {
        const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as Task));
        callback(tasks);
    });
};
export const addTask = (data: Omit<Task, 'id'>) => addDocument<Task>('tasks', data);
export const updateTask = (id: string, data: Partial<Task>) => updateDocument<Task>('tasks', id, data);

// Calendar Events
export const onCalendarEventsUpdate = (callback: (events: CalendarEvent[]) => void) => {
    return onSnapshot(collection(db, "calendarEvents"), (snapshot) => {
        const events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as CalendarEvent));
        callback(events);
    });
};
export const addCalendarEvent = (data: Omit<CalendarEvent, 'id'>) => addDocument<CalendarEvent>('calendarEvents', data);


// Meal Plan
export const onMealPlanUpdate = (callback: (plan: MealPlan) => void) => {
    return onSnapshot(collection(db, "mealPlan"), (snapshot) => {
        const plan: MealPlan = {};
        snapshot.forEach(doc => {
            plan[doc.id] = doc.data() as { [meal: string]: Recipe | null };
        });
        callback(plan);
    });
};
export const updateMealPlan = async (dayKey: string, dayPlan: { [meal: string]: Recipe | null }) => {
    const docRef = doc(db, "mealPlan", dayKey);
    await setDoc(docRef, dayPlan, { merge: true });
}


// Shopping Lists
export const onShoppingListsUpdate = (callback: (lists: ShoppingList[]) => void) => {
    return onSnapshot(collection(db, "shoppingLists"), (snapshot) => {
        const lists = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ShoppingList));
        callback(lists);
    });
};
export const addShoppingList = (title: string, icon: string) => addDocument<ShoppingList>('shoppingLists', { name: title, icon: icon, items: [] });
export const updateShoppingList = (id: string, data: Partial<Omit<ShoppingList, 'id'>>) => updateDocument<ShoppingList>('shoppingLists', id, data);
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
export const onShoppingNoteListsUpdate = (callback: (lists: ShoppingNoteList[]) => void) => {
    return onSnapshot(collection(db, "shoppingNoteLists"), (snapshot) => {
        const lists = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ShoppingNoteList));
        callback(lists);
    });
};
export const addShoppingNoteList = (name: string, icon: string) => addDocument<ShoppingNoteList>('shoppingNoteLists', { name: name, icon: icon, items: [] });
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
export const onTestsUpdate = (callback: (tests: Test[]) => void) => {
    return onSnapshot(collection(db, "tests"), (snapshot) => {
        const tests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as Test));
        callback(tests);
    });
};
export const addTest = (data: Omit<Test, 'id'>) => addDocument<Test>('tests', data);
export const updateTest = (id: string, data: Partial<Omit<Test, 'id'>>) => updateDocument<Test>('tests', id, data);


export const onQuestionBanksUpdate = (callback: (banks: QuestionBank[]) => void) => {
    return onSnapshot(collection(db, "questionBanks"), (snapshot) => {
        const banks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as QuestionBank));
        callback(banks);
    });
};
export const addQuestionBank = (data: Omit<QuestionBank, 'id'>) => addDocument<QuestionBank>('questionBanks', data);
export const updateQuestionBank = (id: string, data: Partial<Omit<QuestionBank, 'id'>>) => updateDocument<QuestionBank>('questionBanks', id, data);
export const deleteQuestionBank = (id: string) => deleteDocument('questionBanks', id);


export const onPracticeExamsUpdate = (callback: (exams: PracticeExam[]) => void) => {
    return onSnapshot(collection(db, "practiceExams"), (snapshot) => {
        const exams = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as PracticeExam));
        callback(exams);
    });
};
export const addPracticeExam = (data: Omit<PracticeExam, 'id'>) => addDocument<PracticeExam>('practiceExams', data);
export const updatePracticeExam = (id: string, data: Partial<Omit<PracticeExam, 'id'>>) => updateDocument<PracticeExam>('practiceExams', id, data);
export const deletePracticeExam = (id: string) => deleteDocument('practiceExams', id);
